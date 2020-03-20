(function() {
  var BrowserWindow, Client, Q, app, client, debug, drive, fs, gotTheLock, ipc, loadAppWindow, log, login, logout, mainWindow, path, path_parts, paths, plug, quit, seqreq, session, tmp, userData, wait;

  Client = require('hangupsjs');

  Q = require('q');

  login = require('./login');

  ipc = require('electron').ipcMain;

  fs = require('fs');

  path = require('path');

  tmp = require('tmp');

  session = require('electron').session;

  log = require('bog');

  [drive, ...path_parts] = path.normalize(__dirname).split(path.sep);

  global.YAKYAK_ROOT_DIR = [drive, ...path_parts.map(encodeURIComponent)].join('/');

  // test if flag debug is preset (other flags can be used via package args
  //  but requres node v6)
  debug = process.argv.includes('--debug');

  tmp.setGracefulCleanup();

  app = require('electron').app;

  app.disableHardwareAcceleration(); // was using a lot of resources needlessly

  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

  BrowserWindow = require('electron').BrowserWindow;

  // Path for configuration
  userData = path.normalize(app.getPath('userData'));

  if (!fs.existsSync(userData)) {
    // makedir if it doesn't exist
    fs.mkdirSync(userData);
  }

  // some default paths to store tokens needed for hangupsjs to reconnect
  paths = {
    rtokenpath: path.join(userData, 'refreshtoken.txt'),
    cookiespath: path.join(userData, 'cookies.json'),
    chromecookie: path.join(userData, 'Cookies'),
    configpath: path.join(userData, 'config.json')
  };

  client = new Client({
    rtokenpath: paths.rtokenpath,
    cookiespath: paths.cookiespath
  });

  plug = function(rs, rj) {
    return function(err, val) {
      if (err) {
        return rj(err);
      } else {
        return rs(val);
      }
    };
  };

  logout = function() {
    var promise;
    log.info('Logging out...');
    promise = client.logout();
    promise.then(function(res) {
      var argv, ref, ref1, spawn;
      argv = process.argv;
      spawn = require('child_process').spawn;
      // remove electron cookies
      if (typeof mainWindow !== "undefined" && mainWindow !== null) {
        if ((ref = mainWindow.webContents) != null) {
          if ((ref1 = ref.session) != null) {
            ref1.clearStorageData([], function(data) {
              return console.log(data);
            });
          }
        }
      }
      spawn(argv.shift(), argv, {
        cwd: process.cwd,
        env: process.env,
        detached: true,
        stdio: 'inherit'
      });
      return quit();
    });
    return promise; // like it matters
  };

  seqreq = require('./seqreq');

  mainWindow = null;

  // Only allow a single active instance
  gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  // If someone tries to run a second instance, we should focus our window.
  app.on('second-instance', function(event, commandLine, workingDirectory) {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      return mainWindow.focus();
    }
  });

  global.i18nOpts = {
    opts: null,
    locale: null
  };

  // No more minimizing to tray, just close it
  global.forceClose = false;

  quit = function() {
    global.forceClose = true;
    if (mainWindow != null) {
      // force all windows to close
      mainWindow.destroy();
    }
    app.quit();
  };

  app.on('before-quit', function() {
    global.forceClose = true;
    global.i18nOpts = null;
  });

  // For OSX show window main window if we've hidden it.
  // https://github.com/electron/electron/blob/master/docs/api/app.md#event-activate-os-x
  app.on('activate', function() {
    return mainWindow.show();
  });

  // Load the default html for the window
  //  if user sees this html then it's an error and it tells how to report it
  loadAppWindow = function() {
    mainWindow.loadURL('file://' + YAKYAK_ROOT_DIR + '/ui/index.html');
    // Only show window when it has some content
    return mainWindow.once('ready-to-show', function() {
      return mainWindow.webContents.send('ready-to-show');
    });
  };

  // helper wait promise
  wait = function(t) {
    return Q.Promise(function(rs) {
      return setTimeout(rs, t);
    });
  };

  //    ______ _           _
  //   |  ____| |         | |                       /\
  //   | |__  | | ___  ___| |_ _ __ ___  _ __      /  \   _ __  _ __
  //   |  __| | |/ _ \/ __| __| '__/ _ \| '_ \    / /\ \ | '_ \| '_ \
  //   | |____| |  __/ (__| |_| | | (_) | | | |  / ____ \| |_) | |_) |
  //   |______|_|\___|\___|\__|_|  \___/|_| |_| /_/    \_\ .__/| .__/
  //                                                     | |   | |
  //                                                     |_|   |_|
  app.on('ready', function() {
    var creds, icon_name, ipcsend, messageQueue, proxycheck, reconnect, reconnectCount, sendInit, syncrecent, updateConversation;
    proxycheck = function() {
      var todo;
      todo = [
        {
          url: 'http://plus.google.com',
          env: 'HTTP_PROXY'
        },
        {
          url: 'https://plus.google.com',
          env: 'HTTPS_PROXY'
        }
      ];
      return Q.all(todo.map(function(t) {
        return Q.Promise(function(rs) {
          console.log(`resolving proxy ${t.url}`);
          return session.defaultSession.resolveProxy(t.url).then(function(proxyURL) {
            var _, base, name1, purl;
            console.log(`resolved proxy ${proxyURL}`);
            // Format of proxyURL is either "DIRECT" or "PROXY 127.0.0.1:8888"
            [_, purl] = proxyURL.split(' ');
            if ((base = process.env)[name1 = t.env] == null) {
              base[name1] = purl ? `http://${purl}` : "";
            }
            return rs();
          });
        });
      }));
    };
    icon_name = process.platform === 'win32' ? 'icon@2.png' : 'icon@32.png';
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 730,
      height: 590,
      "min-width": 620,
      "min-height": 420,
      icon: path.join(__dirname, 'icons', icon_name),
      show: false,
      autohideMenuBar: true,
      webPreferences: {
        nodeIntegration: true
      },
      // preload: path.join(app.getAppPath(), 'ui', 'app.js')
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : void 0,
      frame: process.platform === 'win32' ? false : void 0
    });
    // Launch fullscreen with DevTools open, usage: npm run debug
    // autoHideMenuBar : true unless process.platform is 'darwin'
    if (debug) {
      mainWindow.webContents.openDevTools();
      mainWindow.maximize();
      mainWindow.show();
      // this will also show more debugging from hangupsjs client
      log.level('debug');
      try {
        require('devtron').install();
      } catch (error1) {

      }
    }
    // do nothing

    // and load the index.html of the app. this may however be yanked
    // away if we must do auth.
    loadAppWindow();
    
    // Handle uncaught exceptions from the main process
    process.on('uncaughtException', function(msg) {
      ipcsend('expcetioninmain', msg);
      
      return console.log(`Error on main process:\n${msg}\n` + "--- End of error message. More details:\n", msg);
    });
    
    // Handle crashes on the main window and show in console
    mainWindow.webContents.on('crashed', function(msg) {
      console.log('Crash event on main window!', msg);
      return ipc.send('expcetioninmain', {
        msg: 'Detected a crash event on the main window.',
        event: msg
      });
    });
    // short hand
    ipcsend = function(...as) {
      return mainWindow.webContents.send(...as);
    };
    // callback for credentials
    creds = function() {
      var loginWindow, prom;
      console.log("asking for login credentials");
      loginWindow = new BrowserWindow({
        width: 730,
        height: 590,
        "min-width": 620,
        "min-height": 420,
        icon: path.join(__dirname, 'icons', 'icon.png'),
        show: true,
        webPreferences: {
          nodeIntegration: false
        }
      });
      if (debug) {
        loginWindow.webContents.openDevTools();
      }
      loginWindow.on('closed', quit);
      global.windowHideWhileCred = true;
      mainWindow.hide();
      loginWindow.focus();
      // reinstate app window when login finishes
      prom = login(loginWindow).then(function(rs) {
        global.forceClose = true;
        loginWindow.removeAllListeners('closed');
        loginWindow.close();
        mainWindow.show();
        return rs;
      });
      return {
        auth: function() {
          return prom;
        }
      };
    };
    // sends the init structures to the client
    sendInit = function() {
      var ref;
      if (!(client != null ? (ref = client.init) != null ? ref.self_entity : void 0 : void 0)) {
        // we have no init data before the client has connected first
        // time.
        return false;
      }
      ipcsend('init', {
        init: client.init
      });
      return true;
    };
    // keeps trying to connec the hangupsjs and communicates those
    // attempts to the client.
    reconnect = function() {
      console.log('reconnecting', reconnectCount);
      return proxycheck().then(function() {
        return client.connect(creds).then(function() {
          console.log('connected', reconnectCount);
          // on first connect, send init, after that only resync
          if (reconnectCount === 0) {
            log.debug('Sending init...');
            sendInit();
          } else {
            log.debug('SyncRecent...');
            syncrecent();
          }
          return reconnectCount++;
        }).catch(function(e) {
          return console.log('error connecting', e);
        });
      });
    };
    // counter for reconnects
    reconnectCount = 0;
    // whether to connect is dictated by the client.
    ipc.on('hangupsConnect', function() {
      console.log('hangupsjs:: connecting');
      return reconnect();
    });
    ipc.on('hangupsDisconnect', function() {
      console.log('hangupsjs:: disconnect');
      reconnectCount = 0;
      return client.disconnect();
    });
    // client deals with window sizing
    mainWindow.on('resize', function(ev) {
      return ipcsend('resize', mainWindow.getSize());
    });
    mainWindow.on('move', function(ev) {
      return ipcsend('move', mainWindow.getPosition());
    });
    // whenever it fails, we try again
    client.on('connect_failed', function(e) {
      console.log('connect_failed', e);
      return wait(3000).then(function() {
        return reconnect();
      });
    });
    //    _      _     _                     _____ _____   _____
    //   | |    (_)   | |                   |_   _|  __ \ / ____|
    //   | |     _ ___| |_ ___ _ __           | | | |__) | |
    //   | |    | / __| __/ _ \ '_ \          | | |  ___/| |
    //   | |____| \__ \ ||  __/ | | |_ _ _   _| |_| |    | |____
    //   |______|_|___/\__\___|_| |_(_|_|_) |_____|_|     \_____|

    // Listen on events from main window

    // when client requests (re-)init since the first init
    // object is sent as soon as possible on startup
    ipc.on('reqinit', function() {
      if (sendInit()) {
        return syncrecent();
      }
    });
    ipc.on('togglefullscreen', function() {
      return mainWindow.setFullScreen(!mainWindow.isFullScreen());
    });
    // bye bye
    ipc.on('logout', logout);
    ipc.on('quit', quit);
    ipc.on('errorInWindow', function(ev, error, winName = 'YakYak') {
      if (!global.isReadyToShow) {
        mainWindow.show();
      }
      ipcsend('expcetioninmain', error);
      return console.log(`Error on ${winName} window:\n`, error, `\n--- End of error message in ${winName} window.`);
    });
    // sendchatmessage, executed sequentially and
    // retried if not sent successfully
    messageQueue = Q();
    ipc.on('sendchatmessage', function(ev, msg) {
      var client_generated_id, conv_id, delivery_medium, image_id, message_action_type, otr, segs, sendForSure;
      ({conv_id, segs, client_generated_id, image_id, otr, message_action_type, delivery_medium} = msg);
      sendForSure = function() {
        return Q.promise(function(resolve, reject, notify) {
          var attempt;
          attempt = function() {
            // console.log 'sendchatmessage', client_generated_id
            if (delivery_medium == null) {
              delivery_medium = null;
            }
            return client.sendchatmessage(conv_id, segs, image_id, otr, client_generated_id, delivery_medium, message_action_type).then(function(r) {
              // console.log 'sendchatmessage:result', r?.created_event?.self_event_state?.client_generated_id
              ipcsend('sendchatmessage:result', r);
              return resolve();
            });
          };
          return attempt();
        });
      };
      return messageQueue = messageQueue.then(function() {
        return sendForSure();
      });
    });
    // get locale for translations
    ipc.on('seti18n', function(ev, opts, language) {
      if (opts != null) {
        global.i18nOpts.opts = opts;
      }
      if (language != null) {
        return global.i18nOpts.locale = language;
      }
    });
    ipc.on('appfocus', function() {
      app.focus();
      if (mainWindow.isVisible()) {
        return mainWindow.focus();
      } else {
        return mainWindow.show();
      }
    });
    
    // Methods below use seqreq that returns a promise and allows for retry

    // sendchatmessage, executed sequentially and
    // retried if not sent successfully
    ipc.on('querypresence', seqreq(function(ev, id) {
      return client.querypresence(id).then(function(r) {
        return ipcsend('querypresence:result', r.presence_result[0]);
      }, false, function() {
        return 1;
      });
    }));
    ipc.on('initpresence', function(ev, l) {
      var i, j, len, p, results;
      results = [];
      for (i = j = 0, len = l.length; j < len; i = ++j) {
        p = l[i];
        if (p !== null) {
          results.push(client.querypresence(p.id).then(function(r) {
            return ipcsend('querypresence:result', r.presence_result[0]);
          }, false, function() {
            return 1;
          }));
        }
      }
      return results;
    });
    // no retry, only one outstanding call
    ipc.on('setpresence', seqreq(function(ev, status = true) {
      return client.setpresence(status);
    }, false, function() {
      return 1;
    }));
    // no retry, only one outstanding call
    ipc.on('setactiveclient', seqreq(function(ev, active, secs) {
      return client.setactiveclient(active, secs);
    }, false, function() {
      return 1;
    }));
    // watermarking is only interesting for the last of each conv_id
    // retry send and dedupe for each conv_id
    ipc.on('updatewatermark', seqreq(function(ev, conv_id, time) {
      return client.updatewatermark(conv_id, time);
    }, true, function(ev, conv_id, time) {
      return conv_id;
    }));
    // getentity is not super important, the client will try again when encountering
    // entities without photo_url. so no retry, but do execute all such reqs
    // ipc.on 'getentity', seqreq (ev, ids) ->
    //     client.getentitybyid(ids).then (r) -> ipcsend 'getentity:result', r
    // , false

    // we want to upload. in the order specified, with retry
    ipc.on('uploadimage', seqreq(function(ev, spec) {
      var client_generated_id, conv_id;
      ({path, conv_id, client_generated_id} = spec);
      ipcsend('uploadingimage', {conv_id, client_generated_id, path});
      return client.uploadimage(path).then(function(image_id) {
        var delivery_medium;
        delivery_medium = null;
        return client.sendchatmessage(conv_id, null, image_id, null, client_generated_id, delivery_medium);
      });
    }, true));
    // we want to upload. in the order specified, with retry
    ipc.on('uploadclipboardimage', seqreq(function(ev, spec) {
      var client_generated_id, conv_id, file, pngData;
      ({pngData, conv_id, client_generated_id} = spec);
      file = tmp.fileSync({
        postfix: ".png"
      });
      ipcsend('uploadingimage', {
        conv_id,
        client_generated_id,
        path: file.name
      });
      return Q.Promise(function(rs, rj) {
        return fs.writeFile(file.name, pngData, plug(rs, rj));
      }).then(function() {
        return client.uploadimage(file.name);
      }).then(function(image_id) {
        var delivery_medium;
        delivery_medium = null;
        return client.sendchatmessage(conv_id, null, image_id, null, client_generated_id, delivery_medium);
      }).then(function() {
        return file.removeCallback();
      });
    }, true));
    // retry only last per conv_id
    ipc.on('setconversationnotificationlevel', seqreq(function(ev, conv_id, level) {
      return client.setconversationnotificationlevel(conv_id, level);
    }, true, function(ev, conv_id, level) {
      return conv_id;
    }));
    // retry
    ipc.on('deleteconversation', seqreq(function(ev, conv_id) {
      if (debug) {
        console.log('deletingconversation', conv_id);
      }
      return client.deleteconversation(conv_id).then(function(r) {
        if (debug) {
          console.log('DEBUG: deleteconvsersation response: ', r);
        }
        if (r.response_header.status !== 'OK') {
          return ipcsend('message', i18n.__('conversation.delete_error:Error occured when deleting conversation'));
        }
      });
    }, true));
    ipc.on('removeuser', seqreq(function(ev, conv_id) {
      return client.removeuser(conv_id);
    }, true));
    // no retries, dedupe on conv_id
    ipc.on('setfocus', seqreq(function(ev, conv_id) {
      client.setfocus(conv_id);
      return updateConversation(conv_id);
    }, false, function(ev, conv_id) {
      return conv_id;
    }));
    // update conversation with metadata (for unread messages)
    updateConversation = function(conv_id) {
      return client.getconversation(conv_id, new Date(), 1, true).then(function(r) {
        return ipcsend('getconversationmetadata:response', r);
      });
    };
    ipc.on('updateConversation', seqreq(function(ev, conv_id) {
      return updateConversation(conv_id);
    }, false, function(ev, conv_id) {
      return conv_id;
    }));
    // no retries, dedupe on conv_id
    ipc.on('settyping', seqreq(function(ev, conv_id, v) {
      return client.settyping(conv_id, v);
    }, false, function(ev, conv_id) {
      return conv_id;
    }));
    ipc.on('updatebadge', function(ev, value) {
      if (app.dock) {
        return app.dock.setBadge(value);
      }
    });
    ipc.on('searchentities', function(ev, query, max_results) {
      var promise;
      promise = client.searchentities(query, max_results);
      return promise.then(function(res) {
        return ipcsend('searchentities:result', res);
      });
    });
    ipc.on('createconversation', function(ev, ids, name, forcegroup = false) {
      var conv, promise;
      promise = client.createconversation(ids, forcegroup);
      conv = null;
      promise.then(function(res) {
        var conv_id;
        conv = res.conversation;
        conv_id = conv.id.id;
        if (name) {
          return client.renameconversation(conv_id, name);
        }
      });
      return promise = promise.then(function(res) {
        return ipcsend('createconversation:result', conv, name);
      });
    });
    ipc.on('adduser', function(ev, conv_id, toadd) {
      return client.adduser(conv_id, toadd); // will automatically trigger membership_change
    });
    ipc.on('renameconversation', function(ev, conv_id, newname) {
      return client.renameconversation(conv_id, newname); // will trigger conversation_rename
    });
    
    // no retries, just dedupe on the ids
    ipc.on('getentity', seqreq(function(ev, ids, data) {
      return client.getentitybyid(ids).then(function(r) {
        return ipcsend('getentity:result', r, data);
      });
    }, false, function(ev, ids) {
      return ids.sort().join(',');
    }));
    // no retry, just one single request
    ipc.on('syncallnewevents', seqreq(function(ev, time) {
      console.log('syncallnewevents: Asking hangouts to sync new events');
      return client.syncallnewevents(time).then(function(r) {
        return ipcsend('syncallnewevents:response', r);
      });
    }, false, function(ev, time) {
      return 1;
    }));
    // no retry, just one single request
    ipc.on('syncrecentconversations', syncrecent = seqreq(function(ev) {
      console.log('syncrecentconversations: Asking hangouts to sync recent conversations');
      return client.syncrecentconversations().then(function(r) {
        ipcsend('syncrecentconversations:response', r);
        // this is because we use syncrecent on reqinit (dev-mode
        // refresh). if we succeeded getting a response, we call it
        // connected.
        return ipcsend('connected');
      });
    }, false, function(ev, time) {
      return 1;
    }));
    // retry, one single per conv_id
    ipc.on('getconversation', seqreq(function(ev, conv_id, timestamp, max) {
      return client.getconversation(conv_id, timestamp, max, true).then(function(r) {
        return ipcsend('getconversation:response', r);
      });
    }, false, function(ev, conv_id, timestamp, max) {
      return conv_id;
    }));
    //    _      _     _                     _                                   _
    //   | |    (_)   | |                   | |                                 | |
    //   | |     _ ___| |_ ___ _ __         | |__   __ _ _ __   __ _  ___  _   _| |_ ___
    //   | |    | / __| __/ _ \ '_ \        | '_ \ / _` | '_ \ / _` |/ _ \| | | | __/ __|
    //   | |____| \__ \ ||  __/ | | |_ _ _  | | | | (_| | | | | (_| | (_) | |_| | |_\__ \
    //   |______|_|___/\__\___|_| |_(_|_|_) |_| |_|\__,_|_| |_|\__, |\___/ \__,_|\__|___/
    //                                                          __/ |
    //                                                         |___/
    // Listen on events from hangupsjs client.

    // propagate Hangout client events to the renderer
    return require('./ui/events').forEach(function(n) {
      return client.on(n, function(e) {
        log.debug('DEBUG: Received event', n);
        if (n === 'client_conversation') {
          // client_conversation comes without metadata by default.
          //  We need it for unread count
          updateConversation(e.conversation_id.id);
        }
        return ipcsend(n, e);
      });
    });
  });

  // Emitted when the window is about to close.
// Hides the window if we're not force closing.
//  IMPORTANT: moved to app.coffee

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibWFpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxFQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxhQUFBLEVBQUEsR0FBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsUUFBQSxFQUFBOztFQUFBLE1BQUEsR0FBWSxPQUFBLENBQVEsV0FBUjs7RUFDWixDQUFBLEdBQVksT0FBQSxDQUFRLEdBQVI7O0VBQ1osS0FBQSxHQUFZLE9BQUEsQ0FBUSxTQUFSOztFQUNaLEdBQUEsR0FBWSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztFQUNoQyxFQUFBLEdBQVksT0FBQSxDQUFRLElBQVI7O0VBQ1osSUFBQSxHQUFZLE9BQUEsQ0FBUSxNQUFSOztFQUNaLEdBQUEsR0FBWSxPQUFBLENBQVEsS0FBUjs7RUFDWixPQUFBLEdBQVksT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFDaEMsR0FBQSxHQUFZLE9BQUEsQ0FBUSxLQUFSOztFQUVaLENBQUMsS0FBRCxFQUFRLEdBQUEsVUFBUixDQUFBLEdBQXlCLElBQUksQ0FBQyxTQUFMLENBQWUsU0FBZixDQUF5QixDQUFDLEtBQTFCLENBQWdDLElBQUksQ0FBQyxHQUFyQzs7RUFDekIsTUFBTSxDQUFDLGVBQVAsR0FBeUIsQ0FBQyxLQUFELEVBQVEsR0FBQSxVQUFVLENBQUMsR0FBWCxDQUFlLGtCQUFmLENBQVIsQ0FBOEMsQ0FBQyxJQUEvQyxDQUFvRCxHQUFwRCxFQVh6Qjs7OztFQWVBLEtBQUEsR0FBUSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQWIs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QyxFQVF0QyxRQUFBLENBQUMsRUFBRCxFQUFLLElBQUwsQ0FBQTthQUFjO0lBQWQsQ0FSc0MsQ0FBL0MsRUFoV0o7O0lBMldJLEdBQUcsQ0FBQyxFQUFKLENBQU8saUJBQVAsRUFBMEIsTUFBQSxDQUFPLFFBQUEsQ0FBQyxFQUFELEVBQUssT0FBTCxFQUFjLFNBQWQsRUFBeUIsR0FBekIsQ0FBQTthQUM3QixNQUFNLENBQUMsZUFBUCxDQUF1QixPQUF2QixFQUFnQyxTQUFoQyxFQUEyQyxHQUEzQyxFQUFnRCxJQUFoRCxDQUFxRCxDQUFDLElBQXRELENBQTJELFFBQUEsQ0FBQyxDQUFELENBQUE7ZUFDdkQsT0FBQSxDQUFRLDBCQUFSLEVBQW9DLENBQXBDO01BRHVELENBQTNEO0lBRDZCLENBQVAsRUFHeEIsS0FId0IsRUFHakIsUUFBQSxDQUFDLEVBQUQsRUFBSyxPQUFMLEVBQWMsU0FBZCxFQUF5QixHQUF6QixDQUFBO2FBQWlDO0lBQWpDLENBSGlCLENBQTFCLEVBM1dKOzs7Ozs7Ozs7Ozs7V0EyWEksT0FBQSxDQUFRLGFBQVIsQ0FBc0IsQ0FBQyxPQUF2QixDQUErQixRQUFBLENBQUMsQ0FBRCxDQUFBO2FBQzNCLE1BQU0sQ0FBQyxFQUFQLENBQVUsQ0FBVixFQUFhLFFBQUEsQ0FBQyxDQUFELENBQUE7UUFDVCxHQUFHLENBQUMsS0FBSixDQUFVLHVCQUFWLEVBQW1DLENBQW5DO1FBR0EsSUFBNEMsQ0FBQSxLQUFLLHFCQUFqRDs7O1VBQUEsa0JBQUEsQ0FBbUIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUFyQyxFQUFBOztlQUNBLE9BQUEsQ0FBUSxDQUFSLEVBQVcsQ0FBWDtNQUxTLENBQWI7SUFEMkIsQ0FBL0I7RUE1WFksQ0FBaEI7O0VBdEhBOzs7QUFBQSIsInNvdXJjZXNDb250ZW50IjpbIkNsaWVudCAgICA9IHJlcXVpcmUgJ2hhbmd1cHNqcydcblEgICAgICAgICA9IHJlcXVpcmUgJ3EnXG5sb2dpbiAgICAgPSByZXF1aXJlICcuL2xvZ2luJ1xuaXBjICAgICAgID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNNYWluXG5mcyAgICAgICAgPSByZXF1aXJlICdmcydcbnBhdGggICAgICA9IHJlcXVpcmUgJ3BhdGgnXG50bXAgICAgICAgPSByZXF1aXJlICd0bXAnXG5zZXNzaW9uICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLnNlc3Npb25cbmxvZyAgICAgICA9IHJlcXVpcmUoJ2JvZycpO1xuXG5bZHJpdmUsIHBhdGhfcGFydHMuLi5dID0gcGF0aC5ub3JtYWxpemUoX19kaXJuYW1lKS5zcGxpdChwYXRoLnNlcClcbmdsb2JhbC5ZQUtZQUtfUk9PVF9ESVIgPSBbZHJpdmUsIHBhdGhfcGFydHMubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuLi5dLmpvaW4oJy8nKVxuXG4jIHRlc3QgaWYgZmxhZyBkZWJ1ZyBpcyBwcmVzZXQgKG90aGVyIGZsYWdzIGNhbiBiZSB1c2VkIHZpYSBwYWNrYWdlIGFyZ3NcbiMgIGJ1dCByZXF1cmVzIG5vZGUgdjYpXG5kZWJ1ZyA9IHByb2Nlc3MuYXJndi5pbmNsdWRlcyAnLS1kZWJ1ZydcblxudG1wLnNldEdyYWNlZnVsQ2xlYW51cCgpXG5cbmFwcCA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuYXBwXG5hcHAuZGlzYWJsZUhhcmR3YXJlQWNjZWxlcmF0aW9uKCkgIyB3YXMgdXNpbmcgYSBsb3Qgb2YgcmVzb3VyY2VzIG5lZWRsZXNzbHlcbmFwcC5jb21tYW5kTGluZS5hcHBlbmRTd2l0Y2goJ2F1dG9wbGF5LXBvbGljeScsICduby11c2VyLWdlc3R1cmUtcmVxdWlyZWQnKVxuXG5Ccm93c2VyV2luZG93ID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5Ccm93c2VyV2luZG93XG5cbiMgUGF0aCBmb3IgY29uZmlndXJhdGlvblxudXNlckRhdGEgPSBwYXRoLm5vcm1hbGl6ZShhcHAuZ2V0UGF0aCgndXNlckRhdGEnKSlcblxuIyBtYWtlZGlyIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbmZzLm1rZGlyU3luYyh1c2VyRGF0YSkgaWYgbm90IGZzLmV4aXN0c1N5bmMgdXNlckRhdGFcblxuIyBzb21lIGRlZmF1bHQgcGF0aHMgdG8gc3RvcmUgdG9rZW5zIG5lZWRlZCBmb3IgaGFuZ3Vwc2pzIHRvIHJlY29ubmVjdFxucGF0aHMgPVxuICAgIHJ0b2tlbnBhdGg6IHBhdGguam9pbih1c2VyRGF0YSwgJ3JlZnJlc2h0b2tlbi50eHQnKVxuICAgIGNvb2tpZXNwYXRoOiBwYXRoLmpvaW4odXNlckRhdGEsICdjb29raWVzLmpzb24nKVxuICAgIGNocm9tZWNvb2tpZTogcGF0aC5qb2luKHVzZXJEYXRhLCAnQ29va2llcycpXG4gICAgY29uZmlncGF0aDogcGF0aC5qb2luKHVzZXJEYXRhLCAnY29uZmlnLmpzb24nKVxuXG5jbGllbnQgPSBuZXcgQ2xpZW50KFxuICAgIHJ0b2tlbnBhdGg6IHBhdGhzLnJ0b2tlbnBhdGhcbiAgICBjb29raWVzcGF0aDogcGF0aHMuY29va2llc3BhdGhcbilcblxucGx1ZyA9IChycywgcmopIC0+IChlcnIsIHZhbCkgLT4gaWYgZXJyIHRoZW4gcmooZXJyKSBlbHNlIHJzKHZhbClcblxubG9nb3V0ID0gLT5cbiAgICBsb2cuaW5mbyAnTG9nZ2luZyBvdXQuLi4nXG4gICAgcHJvbWlzZSA9IGNsaWVudC5sb2dvdXQoKVxuICAgIHByb21pc2UudGhlbiAocmVzKSAtPlxuICAgICAgICBhcmd2ID0gcHJvY2Vzcy5hcmd2XG4gICAgICAgIHNwYXduID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLnNwYXduXG4gICAgICAgICMgcmVtb3ZlIGVsZWN0cm9uIGNvb2tpZXNcbiAgICAgICAgbWFpbldpbmRvdz8ud2ViQ29udGVudHM/LnNlc3Npb24/LmNsZWFyU3RvcmFnZURhdGEoW10sIChkYXRhKSAtPiBjb25zb2xlLmxvZyhkYXRhKSlcbiAgICAgICAgc3Bhd24gYXJndi5zaGlmdCgpLCBhcmd2LFxuICAgICAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZFxuICAgICAgICAgICAgZW52OiBwcm9jZXNzLmVudlxuICAgICAgICAgICAgZGV0YWNoZWQ6IHRydWVcbiAgICAgICAgICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgICAgICAgcXVpdCgpXG4gICAgcmV0dXJuIHByb21pc2UgIyBsaWtlIGl0IG1hdHRlcnNcblxuc2VxcmVxID0gcmVxdWlyZSAnLi9zZXFyZXEnXG5cbm1haW5XaW5kb3cgPSBudWxsXG5cbiMgT25seSBhbGxvdyBhIHNpbmdsZSBhY3RpdmUgaW5zdGFuY2VcbmdvdFRoZUxvY2sgPSBhcHAucmVxdWVzdFNpbmdsZUluc3RhbmNlTG9jaygpXG5cbmlmICFnb3RUaGVMb2NrXG4gICAgYXBwLnF1aXQoKVxuICAgIHJldHVyblxuXG4jIElmIHNvbWVvbmUgdHJpZXMgdG8gcnVuIGEgc2Vjb25kIGluc3RhbmNlLCB3ZSBzaG91bGQgZm9jdXMgb3VyIHdpbmRvdy5cbmFwcC5vbiAnc2Vjb25kLWluc3RhbmNlJywgKGV2ZW50LCBjb21tYW5kTGluZSwgd29ya2luZ0RpcmVjdG9yeSkgLT5cbiAgICBpZiBtYWluV2luZG93XG4gICAgICAgIG1haW5XaW5kb3cucmVzdG9yZSgpIGlmIG1haW5XaW5kb3cuaXNNaW5pbWl6ZWQoKVxuICAgICAgICBtYWluV2luZG93LmZvY3VzKClcblxuZ2xvYmFsLmkxOG5PcHRzID0geyBvcHRzOiBudWxsLCBsb2NhbGU6IG51bGwgfVxuXG4jIE5vIG1vcmUgbWluaW1pemluZyB0byB0cmF5LCBqdXN0IGNsb3NlIGl0XG5nbG9iYWwuZm9yY2VDbG9zZSA9IGZhbHNlXG5xdWl0ID0gLT5cbiAgICBnbG9iYWwuZm9yY2VDbG9zZSA9IHRydWVcbiAgICAjIGZvcmNlIGFsbCB3aW5kb3dzIHRvIGNsb3NlXG4gICAgbWFpbldpbmRvdy5kZXN0cm95KCkgaWYgbWFpbldpbmRvdz9cbiAgICBhcHAucXVpdCgpXG4gICAgcmV0dXJuXG5cbmFwcC5vbiAnYmVmb3JlLXF1aXQnLCAtPlxuICAgIGdsb2JhbC5mb3JjZUNsb3NlID0gdHJ1ZVxuICAgIGdsb2JhbC5pMThuT3B0cyA9IG51bGxcbiAgICByZXR1cm5cblxuIyBGb3IgT1NYIHNob3cgd2luZG93IG1haW4gd2luZG93IGlmIHdlJ3ZlIGhpZGRlbiBpdC5cbiMgaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2Jsb2IvbWFzdGVyL2RvY3MvYXBpL2FwcC5tZCNldmVudC1hY3RpdmF0ZS1vcy14XG5hcHAub24gJ2FjdGl2YXRlJywgLT5cbiAgICBtYWluV2luZG93LnNob3coKVxuXG4jIExvYWQgdGhlIGRlZmF1bHQgaHRtbCBmb3IgdGhlIHdpbmRvd1xuIyAgaWYgdXNlciBzZWVzIHRoaXMgaHRtbCB0aGVuIGl0J3MgYW4gZXJyb3IgYW5kIGl0IHRlbGxzIGhvdyB0byByZXBvcnQgaXRcbmxvYWRBcHBXaW5kb3cgPSAtPlxuICAgIG1haW5XaW5kb3cubG9hZFVSTCAnZmlsZTovLycgKyBZQUtZQUtfUk9PVF9ESVIgKyAnL3VpL2luZGV4Lmh0bWwnXG4gICAgIyBPbmx5IHNob3cgd2luZG93IHdoZW4gaXQgaGFzIHNvbWUgY29udGVudFxuICAgIG1haW5XaW5kb3cub25jZSAncmVhZHktdG8tc2hvdycsICgpIC0+XG4gICAgICAgIG1haW5XaW5kb3cud2ViQ29udGVudHMuc2VuZCAncmVhZHktdG8tc2hvdydcblxuIyBoZWxwZXIgd2FpdCBwcm9taXNlXG53YWl0ID0gKHQpIC0+IFEuUHJvbWlzZSAocnMpIC0+IHNldFRpbWVvdXQgcnMsIHRcblxuIyAgICBfX19fX18gXyAgICAgICAgICAgX1xuIyAgIHwgIF9fX198IHwgICAgICAgICB8IHwgICAgICAgICAgICAgICAgICAgICAgIC9cXFxuIyAgIHwgfF9fICB8IHwgX19fICBfX198IHxfIF8gX18gX19fICBfIF9fICAgICAgLyAgXFwgICBfIF9fICBfIF9fXG4jICAgfCAgX198IHwgfC8gXyBcXC8gX198IF9ffCAnX18vIF8gXFx8ICdfIFxcICAgIC8gL1xcIFxcIHwgJ18gXFx8ICdfIFxcXG4jICAgfCB8X19fX3wgfCAgX18vIChfX3wgfF98IHwgfCAoXykgfCB8IHwgfCAgLyBfX19fIFxcfCB8XykgfCB8XykgfFxuIyAgIHxfX19fX198X3xcXF9fX3xcXF9fX3xcXF9ffF98ICBcXF9fXy98X3wgfF98IC9fLyAgICBcXF9cXCAuX18vfCAuX18vXG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IHwgICB8IHxcbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxffCAgIHxffFxuYXBwLm9uICdyZWFkeScsIC0+XG4gICAgcHJveHljaGVjayA9IC0+XG4gICAgICAgIHRvZG8gPSBbXG4gICAgICAgICAgIHt1cmw6J2h0dHA6Ly9wbHVzLmdvb2dsZS5jb20nLCAgZW52OidIVFRQX1BST1hZJ31cbiAgICAgICAgICAge3VybDonaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20nLCBlbnY6J0hUVFBTX1BST1hZJ31cbiAgICAgICAgXVxuICAgICAgICBRLmFsbCB0b2RvLm1hcCAodCkgLT4gUS5Qcm9taXNlIChycykgLT5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nIFwicmVzb2x2aW5nIHByb3h5ICN7dC51cmx9XCJcbiAgICAgICAgICAgIHNlc3Npb24uZGVmYXVsdFNlc3Npb24ucmVzb2x2ZVByb3h5KHQudXJsKS50aGVuIChwcm94eVVSTCkgLT5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyBcInJlc29sdmVkIHByb3h5ICN7cHJveHlVUkx9XCJcbiAgICAgICAgICAgICAgICAjIEZvcm1hdCBvZiBwcm94eVVSTCBpcyBlaXRoZXIgXCJESVJFQ1RcIiBvciBcIlBST1hZIDEyNy4wLjAuMTo4ODg4XCJcbiAgICAgICAgICAgICAgICBbXywgcHVybF0gPSBwcm94eVVSTC5zcGxpdCAnICdcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmVudlt0LmVudl0gPz0gaWYgcHVybCB0aGVuIFwiaHR0cDovLyN7cHVybH1cIiBlbHNlIFwiXCJcbiAgICAgICAgICAgICAgICBycygpXG5cbiAgICBpY29uX25hbWUgPSBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMicgdGhlbiAnaWNvbkAyLnBuZycgZWxzZSAnaWNvbkAzMi5wbmcnXG5cbiAgICAjIENyZWF0ZSB0aGUgYnJvd3NlciB3aW5kb3cuXG4gICAgbWFpbldpbmRvdyA9IG5ldyBCcm93c2VyV2luZG93IHtcbiAgICAgICAgd2lkdGg6IDczMFxuICAgICAgICBoZWlnaHQ6IDU5MFxuICAgICAgICBcIm1pbi13aWR0aFwiOiA2MjBcbiAgICAgICAgXCJtaW4taGVpZ2h0XCI6IDQyMFxuICAgICAgICBpY29uOiBwYXRoLmpvaW4gX19kaXJuYW1lLCAnaWNvbnMnLCBpY29uX25hbWVcbiAgICAgICAgc2hvdzogZmFsc2VcbiAgICAgICAgYXV0b2hpZGVNZW51QmFyOiB0cnVlXG4gICAgICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICBub2RlSW50ZWdyYXRpb246IHRydWVcbiAgICAgICAgICAgICMgcHJlbG9hZDogcGF0aC5qb2luKGFwcC5nZXRBcHBQYXRoKCksICd1aScsICdhcHAuanMnKVxuICAgICAgICB9XG4gICAgICAgIHRpdGxlQmFyU3R5bGU6ICdoaWRkZW5JbnNldCcgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgICAgICBmcmFtZTogZmFsc2UgaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInXG4gICAgICAgICMgYXV0b0hpZGVNZW51QmFyIDogdHJ1ZSB1bmxlc3MgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnZGFyd2luJ1xuICAgIH1cblxuICAgICMgTGF1bmNoIGZ1bGxzY3JlZW4gd2l0aCBEZXZUb29scyBvcGVuLCB1c2FnZTogbnBtIHJ1biBkZWJ1Z1xuICAgIGlmIGRlYnVnXG4gICAgICAgIG1haW5XaW5kb3cud2ViQ29udGVudHMub3BlbkRldlRvb2xzKClcbiAgICAgICAgbWFpbldpbmRvdy5tYXhpbWl6ZSgpXG4gICAgICAgIG1haW5XaW5kb3cuc2hvdygpXG4gICAgICAgICMgdGhpcyB3aWxsIGFsc28gc2hvdyBtb3JlIGRlYnVnZ2luZyBmcm9tIGhhbmd1cHNqcyBjbGllbnRcbiAgICAgICAgbG9nLmxldmVsKCdkZWJ1ZycpO1xuICAgICAgICB0cnlcbiAgICAgICAgICAgIHJlcXVpcmUoJ2RldnRyb24nKS5pbnN0YWxsKClcbiAgICAgICAgY2F0Y2hcbiAgICAgICAgICAgICMgZG8gbm90aGluZ1xuXG4gICAgIyBhbmQgbG9hZCB0aGUgaW5kZXguaHRtbCBvZiB0aGUgYXBwLiB0aGlzIG1heSBob3dldmVyIGJlIHlhbmtlZFxuICAgICMgYXdheSBpZiB3ZSBtdXN0IGRvIGF1dGguXG4gICAgbG9hZEFwcFdpbmRvdygpXG5cbiAgICAjXG4gICAgI1xuICAgICMgSGFuZGxlIHVuY2F1Z2h0IGV4Y2VwdGlvbnMgZnJvbSB0aGUgbWFpbiBwcm9jZXNzXG4gICAgcHJvY2Vzcy5vbiAndW5jYXVnaHRFeGNlcHRpb24nLCAobXNnKSAtPlxuICAgICAgICBpcGNzZW5kICdleHBjZXRpb25pbm1haW4nLCBtc2dcbiAgICAgICAgI1xuICAgICAgICBjb25zb2xlLmxvZyBcIkVycm9yIG9uIG1haW4gcHJvY2VzczpcXG4je21zZ31cXG5cIiArXG4gICAgICAgICAgICBcIi0tLSBFbmQgb2YgZXJyb3IgbWVzc2FnZS4gTW9yZSBkZXRhaWxzOlxcblwiLCBtc2dcblxuICAgICNcbiAgICAjXG4gICAgIyBIYW5kbGUgY3Jhc2hlcyBvbiB0aGUgbWFpbiB3aW5kb3cgYW5kIHNob3cgaW4gY29uc29sZVxuICAgIG1haW5XaW5kb3cud2ViQ29udGVudHMub24gJ2NyYXNoZWQnLCAobXNnKSAtPlxuICAgICAgICBjb25zb2xlLmxvZyAnQ3Jhc2ggZXZlbnQgb24gbWFpbiB3aW5kb3chJywgbXNnXG4gICAgICAgIGlwYy5zZW5kICdleHBjZXRpb25pbm1haW4nLCB7XG4gICAgICAgICAgICBtc2c6ICdEZXRlY3RlZCBhIGNyYXNoIGV2ZW50IG9uIHRoZSBtYWluIHdpbmRvdy4nXG4gICAgICAgICAgICBldmVudDogbXNnXG4gICAgICAgIH1cblxuICAgICMgc2hvcnQgaGFuZFxuICAgIGlwY3NlbmQgPSAoYXMuLi4pIC0+ICBtYWluV2luZG93LndlYkNvbnRlbnRzLnNlbmQgYXMuLi5cblxuICAgICMgY2FsbGJhY2sgZm9yIGNyZWRlbnRpYWxzXG4gICAgY3JlZHMgPSAtPlxuICAgICAgICBjb25zb2xlLmxvZyBcImFza2luZyBmb3IgbG9naW4gY3JlZGVudGlhbHNcIlxuICAgICAgICBsb2dpbldpbmRvdyA9IG5ldyBCcm93c2VyV2luZG93IHtcbiAgICAgICAgICAgIHdpZHRoOiA3MzBcbiAgICAgICAgICAgIGhlaWdodDogNTkwXG4gICAgICAgICAgICBcIm1pbi13aWR0aFwiOiA2MjBcbiAgICAgICAgICAgIFwibWluLWhlaWdodFwiOiA0MjBcbiAgICAgICAgICAgIGljb246IHBhdGguam9pbiBfX2Rpcm5hbWUsICdpY29ucycsICdpY29uLnBuZydcbiAgICAgICAgICAgIHNob3c6IHRydWVcbiAgICAgICAgICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICAgICAgICAgICAgbm9kZUludGVncmF0aW9uOiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxvZ2luV2luZG93LndlYkNvbnRlbnRzLm9wZW5EZXZUb29scygpIGlmIGRlYnVnXG4gICAgICAgIGxvZ2luV2luZG93Lm9uICdjbG9zZWQnLCBxdWl0XG5cbiAgICAgICAgZ2xvYmFsLndpbmRvd0hpZGVXaGlsZUNyZWQgPSB0cnVlXG4gICAgICAgIG1haW5XaW5kb3cuaGlkZSgpXG4gICAgICAgIGxvZ2luV2luZG93LmZvY3VzKClcbiAgICAgICAgIyByZWluc3RhdGUgYXBwIHdpbmRvdyB3aGVuIGxvZ2luIGZpbmlzaGVzXG4gICAgICAgIHByb20gPSBsb2dpbihsb2dpbldpbmRvdylcbiAgICAgICAgLnRoZW4gKHJzKSAtPlxuICAgICAgICAgICAgZ2xvYmFsLmZvcmNlQ2xvc2UgPSB0cnVlXG4gICAgICAgICAgICBsb2dpbldpbmRvdy5yZW1vdmVBbGxMaXN0ZW5lcnMgJ2Nsb3NlZCdcbiAgICAgICAgICAgIGxvZ2luV2luZG93LmNsb3NlKClcbiAgICAgICAgICAgIG1haW5XaW5kb3cuc2hvdygpXG4gICAgICAgICAgICByc1xuICAgICAgICBhdXRoOiAtPiBwcm9tXG5cbiAgICAjIHNlbmRzIHRoZSBpbml0IHN0cnVjdHVyZXMgdG8gdGhlIGNsaWVudFxuICAgIHNlbmRJbml0ID0gLT5cbiAgICAgICAgIyB3ZSBoYXZlIG5vIGluaXQgZGF0YSBiZWZvcmUgdGhlIGNsaWVudCBoYXMgY29ubmVjdGVkIGZpcnN0XG4gICAgICAgICMgdGltZS5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBjbGllbnQ/LmluaXQ/LnNlbGZfZW50aXR5XG4gICAgICAgIGlwY3NlbmQgJ2luaXQnLCBpbml0OiBjbGllbnQuaW5pdFxuICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgIyBrZWVwcyB0cnlpbmcgdG8gY29ubmVjIHRoZSBoYW5ndXBzanMgYW5kIGNvbW11bmljYXRlcyB0aG9zZVxuICAgICMgYXR0ZW1wdHMgdG8gdGhlIGNsaWVudC5cbiAgICByZWNvbm5lY3QgPSAtPlxuICAgICAgICBjb25zb2xlLmxvZyAncmVjb25uZWN0aW5nJywgcmVjb25uZWN0Q291bnRcbiAgICAgICAgcHJveHljaGVjaygpLnRoZW4gLT5cbiAgICAgICAgICAgIGNsaWVudC5jb25uZWN0KGNyZWRzKVxuICAgICAgICAgICAgLnRoZW4gLT5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyAnY29ubmVjdGVkJywgcmVjb25uZWN0Q291bnRcbiAgICAgICAgICAgICAgICAjIG9uIGZpcnN0IGNvbm5lY3QsIHNlbmQgaW5pdCwgYWZ0ZXIgdGhhdCBvbmx5IHJlc3luY1xuICAgICAgICAgICAgICAgIGlmIHJlY29ubmVjdENvdW50ID09IDBcbiAgICAgICAgICAgICAgICAgICAgbG9nLmRlYnVnICdTZW5kaW5nIGluaXQuLi4nXG4gICAgICAgICAgICAgICAgICAgIHNlbmRJbml0KClcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGxvZy5kZWJ1ZyAnU3luY1JlY2VudC4uLidcbiAgICAgICAgICAgICAgICAgICAgc3luY3JlY2VudCgpXG4gICAgICAgICAgICAgICAgcmVjb25uZWN0Q291bnQrK1xuICAgICAgICAgICAgLmNhdGNoIChlKSAtPiBjb25zb2xlLmxvZyAnZXJyb3IgY29ubmVjdGluZycsIGVcblxuICAgICMgY291bnRlciBmb3IgcmVjb25uZWN0c1xuICAgIHJlY29ubmVjdENvdW50ID0gMFxuXG4gICAgIyB3aGV0aGVyIHRvIGNvbm5lY3QgaXMgZGljdGF0ZWQgYnkgdGhlIGNsaWVudC5cbiAgICBpcGMub24gJ2hhbmd1cHNDb25uZWN0JywgLT5cbiAgICAgICAgY29uc29sZS5sb2cgJ2hhbmd1cHNqczo6IGNvbm5lY3RpbmcnXG4gICAgICAgIHJlY29ubmVjdCgpXG5cbiAgICBpcGMub24gJ2hhbmd1cHNEaXNjb25uZWN0JywgLT5cbiAgICAgICAgY29uc29sZS5sb2cgJ2hhbmd1cHNqczo6IGRpc2Nvbm5lY3QnXG4gICAgICAgIHJlY29ubmVjdENvdW50ID0gMFxuICAgICAgICBjbGllbnQuZGlzY29ubmVjdCgpXG5cbiAgICAjIGNsaWVudCBkZWFscyB3aXRoIHdpbmRvdyBzaXppbmdcbiAgICBtYWluV2luZG93Lm9uICdyZXNpemUnLCAoZXYpIC0+IGlwY3NlbmQgJ3Jlc2l6ZScsIG1haW5XaW5kb3cuZ2V0U2l6ZSgpXG4gICAgbWFpbldpbmRvdy5vbiAnbW92ZScsICAoZXYpIC0+IGlwY3NlbmQgJ21vdmUnLCBtYWluV2luZG93LmdldFBvc2l0aW9uKClcblxuICAgICMgd2hlbmV2ZXIgaXQgZmFpbHMsIHdlIHRyeSBhZ2FpblxuICAgIGNsaWVudC5vbiAnY29ubmVjdF9mYWlsZWQnLCAoZSkgLT5cbiAgICAgICAgY29uc29sZS5sb2cgJ2Nvbm5lY3RfZmFpbGVkJywgZVxuICAgICAgICB3YWl0KDMwMDApLnRoZW4gLT4gcmVjb25uZWN0KClcblxuICAgICMgICAgXyAgICAgIF8gICAgIF8gICAgICAgICAgICAgICAgICAgICBfX19fXyBfX19fXyAgIF9fX19fXG4gICAgIyAgIHwgfCAgICAoXykgICB8IHwgICAgICAgICAgICAgICAgICAgfF8gICBffCAgX18gXFwgLyBfX19ffFxuICAgICMgICB8IHwgICAgIF8gX19ffCB8XyBfX18gXyBfXyAgICAgICAgICAgfCB8IHwgfF9fKSB8IHxcbiAgICAjICAgfCB8ICAgIHwgLyBfX3wgX18vIF8gXFwgJ18gXFwgICAgICAgICAgfCB8IHwgIF9fXy98IHxcbiAgICAjICAgfCB8X19fX3wgXFxfXyBcXCB8fCAgX18vIHwgfCB8XyBfIF8gICBffCB8X3wgfCAgICB8IHxfX19fXG4gICAgIyAgIHxfX19fX198X3xfX18vXFxfX1xcX19ffF98IHxfKF98X3xfKSB8X19fX198X3wgICAgIFxcX19fX198XG4gICAgI1xuICAgICNcbiAgICAjIExpc3RlbiBvbiBldmVudHMgZnJvbSBtYWluIHdpbmRvd1xuXG4gICAgIyB3aGVuIGNsaWVudCByZXF1ZXN0cyAocmUtKWluaXQgc2luY2UgdGhlIGZpcnN0IGluaXRcbiAgICAjIG9iamVjdCBpcyBzZW50IGFzIHNvb24gYXMgcG9zc2libGUgb24gc3RhcnR1cFxuICAgIGlwYy5vbiAncmVxaW5pdCcsIC0+IHN5bmNyZWNlbnQoKSBpZiBzZW5kSW5pdCgpXG5cbiAgICBpcGMub24gJ3RvZ2dsZWZ1bGxzY3JlZW4nLCAtPlxuICAgICAgICBtYWluV2luZG93LnNldEZ1bGxTY3JlZW4gbm90IG1haW5XaW5kb3cuaXNGdWxsU2NyZWVuKClcblxuICAgICMgYnllIGJ5ZVxuICAgIGlwYy5vbiAnbG9nb3V0JywgbG9nb3V0XG5cbiAgICBpcGMub24gJ3F1aXQnLCBxdWl0XG5cbiAgICBpcGMub24gJ2Vycm9ySW5XaW5kb3cnLCAoZXYsIGVycm9yLCB3aW5OYW1lID0gJ1lha1lhaycpIC0+XG4gICAgICAgIG1haW5XaW5kb3cuc2hvdygpIHVubGVzcyBnbG9iYWwuaXNSZWFkeVRvU2hvd1xuICAgICAgICBpcGNzZW5kICdleHBjZXRpb25pbm1haW4nLCBlcnJvclxuICAgICAgICBjb25zb2xlLmxvZyBcIkVycm9yIG9uICN7d2luTmFtZX0gd2luZG93OlxcblwiLCBlcnJvciwgXCJcXG4tLS0gRW5kIG9mIGVycm9yIG1lc3NhZ2UgaW4gI3t3aW5OYW1lfSB3aW5kb3cuXCJcblxuXG4gICAgIyBzZW5kY2hhdG1lc3NhZ2UsIGV4ZWN1dGVkIHNlcXVlbnRpYWxseSBhbmRcbiAgICAjIHJldHJpZWQgaWYgbm90IHNlbnQgc3VjY2Vzc2Z1bGx5XG4gICAgbWVzc2FnZVF1ZXVlID0gUSgpXG4gICAgaXBjLm9uICdzZW5kY2hhdG1lc3NhZ2UnLCAoZXYsIG1zZykgLT5cbiAgICAgICAge2NvbnZfaWQsIHNlZ3MsIGNsaWVudF9nZW5lcmF0ZWRfaWQsIGltYWdlX2lkLCBvdHIsIG1lc3NhZ2VfYWN0aW9uX3R5cGUsIGRlbGl2ZXJ5X21lZGl1bX0gPSBtc2dcbiAgICAgICAgc2VuZEZvclN1cmUgPSAtPiBRLnByb21pc2UgKHJlc29sdmUsIHJlamVjdCwgbm90aWZ5KSAtPlxuICAgICAgICAgICAgYXR0ZW1wdCA9IC0+XG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmxvZyAnc2VuZGNoYXRtZXNzYWdlJywgY2xpZW50X2dlbmVyYXRlZF9pZFxuICAgICAgICAgICAgICAgIGlmIG5vdCBkZWxpdmVyeV9tZWRpdW0/XG4gICAgICAgICAgICAgICAgICAgIGRlbGl2ZXJ5X21lZGl1bSA9IG51bGxcbiAgICAgICAgICAgICAgICBjbGllbnQuc2VuZGNoYXRtZXNzYWdlKGNvbnZfaWQsIHNlZ3MsIGltYWdlX2lkLCBvdHIsIGNsaWVudF9nZW5lcmF0ZWRfaWQsIGRlbGl2ZXJ5X21lZGl1bSwgbWVzc2FnZV9hY3Rpb25fdHlwZSkudGhlbiAocikgLT5cbiAgICAgICAgICAgICAgICAgICAgICAjIGNvbnNvbGUubG9nICdzZW5kY2hhdG1lc3NhZ2U6cmVzdWx0Jywgcj8uY3JlYXRlZF9ldmVudD8uc2VsZl9ldmVudF9zdGF0ZT8uY2xpZW50X2dlbmVyYXRlZF9pZFxuICAgICAgICAgICAgICAgICAgICBpcGNzZW5kICdzZW5kY2hhdG1lc3NhZ2U6cmVzdWx0JywgclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgICAgIGF0dGVtcHQoKVxuICAgICAgICBtZXNzYWdlUXVldWUgPSBtZXNzYWdlUXVldWUudGhlbiAtPlxuICAgICAgICAgICAgc2VuZEZvclN1cmUoKVxuXG4gICAgIyBnZXQgbG9jYWxlIGZvciB0cmFuc2xhdGlvbnNcbiAgICBpcGMub24gJ3NldGkxOG4nLCAoZXYsIG9wdHMsIGxhbmd1YWdlKS0+XG4gICAgICAgIGlmIG9wdHM/XG4gICAgICAgICAgICBnbG9iYWwuaTE4bk9wdHMub3B0cyA9IG9wdHNcbiAgICAgICAgaWYgbGFuZ3VhZ2U/XG4gICAgICAgICAgICBnbG9iYWwuaTE4bk9wdHMubG9jYWxlID0gbGFuZ3VhZ2VcblxuICAgIGlwYy5vbiAnYXBwZm9jdXMnLCAtPlxuICAgICAgICBhcHAuZm9jdXMoKVxuICAgICAgICBpZiBtYWluV2luZG93LmlzVmlzaWJsZSgpXG4gICAgICAgICAgICBtYWluV2luZG93LmZvY3VzKClcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbWFpbldpbmRvdy5zaG93KClcblxuICAgICNcbiAgICAjXG4gICAgIyBNZXRob2RzIGJlbG93IHVzZSBzZXFyZXEgdGhhdCByZXR1cm5zIGEgcHJvbWlzZSBhbmQgYWxsb3dzIGZvciByZXRyeVxuICAgICNcblxuICAgICMgc2VuZGNoYXRtZXNzYWdlLCBleGVjdXRlZCBzZXF1ZW50aWFsbHkgYW5kXG4gICAgIyByZXRyaWVkIGlmIG5vdCBzZW50IHN1Y2Nlc3NmdWxseVxuICAgIGlwYy5vbiAncXVlcnlwcmVzZW5jZScsIHNlcXJlcSAoZXYsIGlkKSAtPlxuICAgICAgICBjbGllbnQucXVlcnlwcmVzZW5jZShpZCkudGhlbiAocikgLT5cbiAgICAgICAgICAgIGlwY3NlbmQgJ3F1ZXJ5cHJlc2VuY2U6cmVzdWx0Jywgci5wcmVzZW5jZV9yZXN1bHRbMF1cbiAgICAgICAgLCBmYWxzZSwgLT4gMVxuXG4gICAgaXBjLm9uICdpbml0cHJlc2VuY2UnLCAoZXYsIGwpIC0+XG4gICAgICAgIGZvciBwLCBpIGluIGwgd2hlbiBwICE9IG51bGxcbiAgICAgICAgICAgIGNsaWVudC5xdWVyeXByZXNlbmNlKHAuaWQpLnRoZW4gKHIpIC0+XG4gICAgICAgICAgICAgICAgaXBjc2VuZCAncXVlcnlwcmVzZW5jZTpyZXN1bHQnLCByLnByZXNlbmNlX3Jlc3VsdFswXVxuICAgICAgICAgICAgLCBmYWxzZSwgLT4gMVxuXG4gICAgIyBubyByZXRyeSwgb25seSBvbmUgb3V0c3RhbmRpbmcgY2FsbFxuICAgIGlwYy5vbiAnc2V0cHJlc2VuY2UnLCBzZXFyZXEgKGV2LCBzdGF0dXM9dHJ1ZSkgLT5cbiAgICAgICAgY2xpZW50LnNldHByZXNlbmNlKHN0YXR1cylcbiAgICAsIGZhbHNlLCAtPiAxXG5cbiAgICAjIG5vIHJldHJ5LCBvbmx5IG9uZSBvdXRzdGFuZGluZyBjYWxsXG4gICAgaXBjLm9uICdzZXRhY3RpdmVjbGllbnQnLCBzZXFyZXEgKGV2LCBhY3RpdmUsIHNlY3MpIC0+XG4gICAgICAgIGNsaWVudC5zZXRhY3RpdmVjbGllbnQgYWN0aXZlLCBzZWNzXG4gICAgLCBmYWxzZSwgLT4gMVxuXG4gICAgIyB3YXRlcm1hcmtpbmcgaXMgb25seSBpbnRlcmVzdGluZyBmb3IgdGhlIGxhc3Qgb2YgZWFjaCBjb252X2lkXG4gICAgIyByZXRyeSBzZW5kIGFuZCBkZWR1cGUgZm9yIGVhY2ggY29udl9pZFxuICAgIGlwYy5vbiAndXBkYXRld2F0ZXJtYXJrJywgc2VxcmVxIChldiwgY29udl9pZCwgdGltZSkgLT5cbiAgICAgICAgY2xpZW50LnVwZGF0ZXdhdGVybWFyayBjb252X2lkLCB0aW1lXG4gICAgLCB0cnVlLCAoZXYsIGNvbnZfaWQsIHRpbWUpIC0+IGNvbnZfaWRcblxuICAgICMgZ2V0ZW50aXR5IGlzIG5vdCBzdXBlciBpbXBvcnRhbnQsIHRoZSBjbGllbnQgd2lsbCB0cnkgYWdhaW4gd2hlbiBlbmNvdW50ZXJpbmdcbiAgICAjIGVudGl0aWVzIHdpdGhvdXQgcGhvdG9fdXJsLiBzbyBubyByZXRyeSwgYnV0IGRvIGV4ZWN1dGUgYWxsIHN1Y2ggcmVxc1xuICAgICMgaXBjLm9uICdnZXRlbnRpdHknLCBzZXFyZXEgKGV2LCBpZHMpIC0+XG4gICAgIyAgICAgY2xpZW50LmdldGVudGl0eWJ5aWQoaWRzKS50aGVuIChyKSAtPiBpcGNzZW5kICdnZXRlbnRpdHk6cmVzdWx0JywgclxuICAgICMgLCBmYWxzZVxuXG4gICAgIyB3ZSB3YW50IHRvIHVwbG9hZC4gaW4gdGhlIG9yZGVyIHNwZWNpZmllZCwgd2l0aCByZXRyeVxuICAgIGlwYy5vbiAndXBsb2FkaW1hZ2UnLCBzZXFyZXEgKGV2LCBzcGVjKSAtPlxuICAgICAgICB7cGF0aCwgY29udl9pZCwgY2xpZW50X2dlbmVyYXRlZF9pZH0gPSBzcGVjXG4gICAgICAgIGlwY3NlbmQgJ3VwbG9hZGluZ2ltYWdlJywge2NvbnZfaWQsIGNsaWVudF9nZW5lcmF0ZWRfaWQsIHBhdGh9XG4gICAgICAgIGNsaWVudC51cGxvYWRpbWFnZShwYXRoKS50aGVuIChpbWFnZV9pZCkgLT5cblxuICAgICAgICAgICAgZGVsaXZlcnlfbWVkaXVtID0gbnVsbFxuXG4gICAgICAgICAgICBjbGllbnQuc2VuZGNoYXRtZXNzYWdlIGNvbnZfaWQsIG51bGwsIGltYWdlX2lkLCBudWxsLCBjbGllbnRfZ2VuZXJhdGVkX2lkLCBkZWxpdmVyeV9tZWRpdW1cbiAgICAsIHRydWVcblxuICAgICMgd2Ugd2FudCB0byB1cGxvYWQuIGluIHRoZSBvcmRlciBzcGVjaWZpZWQsIHdpdGggcmV0cnlcbiAgICBpcGMub24gJ3VwbG9hZGNsaXBib2FyZGltYWdlJywgc2VxcmVxIChldiwgc3BlYykgLT5cbiAgICAgICAge3BuZ0RhdGEsIGNvbnZfaWQsIGNsaWVudF9nZW5lcmF0ZWRfaWR9ID0gc3BlY1xuICAgICAgICBmaWxlID0gdG1wLmZpbGVTeW5jIHBvc3RmaXg6IFwiLnBuZ1wiXG4gICAgICAgIGlwY3NlbmQgJ3VwbG9hZGluZ2ltYWdlJywge2NvbnZfaWQsIGNsaWVudF9nZW5lcmF0ZWRfaWQsIHBhdGg6ZmlsZS5uYW1lfVxuICAgICAgICBRLlByb21pc2UgKHJzLCByaikgLT5cbiAgICAgICAgICAgIGZzLndyaXRlRmlsZSBmaWxlLm5hbWUsIHBuZ0RhdGEsIHBsdWcocnMsIHJqKVxuICAgICAgICAudGhlbiAtPlxuICAgICAgICAgICAgY2xpZW50LnVwbG9hZGltYWdlKGZpbGUubmFtZSlcbiAgICAgICAgLnRoZW4gKGltYWdlX2lkKSAtPlxuICAgICAgICAgICAgZGVsaXZlcnlfbWVkaXVtID0gbnVsbFxuICAgICAgICAgICAgY2xpZW50LnNlbmRjaGF0bWVzc2FnZSBjb252X2lkLCBudWxsLCBpbWFnZV9pZCwgbnVsbCwgY2xpZW50X2dlbmVyYXRlZF9pZCwgZGVsaXZlcnlfbWVkaXVtXG4gICAgICAgIC50aGVuIC0+XG4gICAgICAgICAgICBmaWxlLnJlbW92ZUNhbGxiYWNrKClcbiAgICAsIHRydWVcblxuICAgICMgcmV0cnkgb25seSBsYXN0IHBlciBjb252X2lkXG4gICAgaXBjLm9uICdzZXRjb252ZXJzYXRpb25ub3RpZmljYXRpb25sZXZlbCcsIHNlcXJlcSAoZXYsIGNvbnZfaWQsIGxldmVsKSAtPlxuICAgICAgICBjbGllbnQuc2V0Y29udmVyc2F0aW9ubm90aWZpY2F0aW9ubGV2ZWwgY29udl9pZCwgbGV2ZWxcbiAgICAsIHRydWUsIChldiwgY29udl9pZCwgbGV2ZWwpIC0+IGNvbnZfaWRcblxuICAgICMgcmV0cnlcbiAgICBpcGMub24gJ2RlbGV0ZWNvbnZlcnNhdGlvbicsIHNlcXJlcSAoZXYsIGNvbnZfaWQpIC0+XG4gICAgICAgIGNvbnNvbGUubG9nICdkZWxldGluZ2NvbnZlcnNhdGlvbicsIGNvbnZfaWQgaWYgZGVidWdcbiAgICAgICAgY2xpZW50LmRlbGV0ZWNvbnZlcnNhdGlvbiBjb252X2lkXG4gICAgICAgIC50aGVuIChyKSAtPlxuICAgICAgICAgICAgY29uc29sZS5sb2cgJ0RFQlVHOiBkZWxldGVjb252c2Vyc2F0aW9uIHJlc3BvbnNlOiAnLCByIGlmIGRlYnVnXG4gICAgICAgICAgICBpZiByLnJlc3BvbnNlX2hlYWRlci5zdGF0dXMgIT0gJ09LJ1xuICAgICAgICAgICAgICAgIGlwY3NlbmQgJ21lc3NhZ2UnLCBpMThuLl9fKCdjb252ZXJzYXRpb24uZGVsZXRlX2Vycm9yOkVycm9yIG9jY3VyZWQgd2hlbiBkZWxldGluZyBjb252ZXJzYXRpb24nKVxuICAgICwgdHJ1ZVxuXG4gICAgaXBjLm9uICdyZW1vdmV1c2VyJywgc2VxcmVxIChldiwgY29udl9pZCkgLT5cbiAgICAgICAgY2xpZW50LnJlbW92ZXVzZXIgY29udl9pZFxuICAgICwgdHJ1ZVxuXG4gICAgIyBubyByZXRyaWVzLCBkZWR1cGUgb24gY29udl9pZFxuICAgIGlwYy5vbiAnc2V0Zm9jdXMnLCBzZXFyZXEgKGV2LCBjb252X2lkKSAtPlxuICAgICAgICBjbGllbnQuc2V0Zm9jdXMgY29udl9pZFxuICAgICAgICB1cGRhdGVDb252ZXJzYXRpb24oY29udl9pZClcbiAgICAsIGZhbHNlLCAoZXYsIGNvbnZfaWQpIC0+IGNvbnZfaWRcblxuICAgICMgdXBkYXRlIGNvbnZlcnNhdGlvbiB3aXRoIG1ldGFkYXRhIChmb3IgdW5yZWFkIG1lc3NhZ2VzKVxuICAgIHVwZGF0ZUNvbnZlcnNhdGlvbiA9IChjb252X2lkKSAtPlxuICAgICAgICBjbGllbnQuZ2V0Y29udmVyc2F0aW9uIGNvbnZfaWQsIG5ldyBEYXRlKCksIDEsIHRydWVcbiAgICAgICAgLnRoZW4gKHIpIC0+XG4gICAgICAgICAgICBpcGNzZW5kICdnZXRjb252ZXJzYXRpb25tZXRhZGF0YTpyZXNwb25zZScsIHJcblxuICAgIGlwYy5vbiAndXBkYXRlQ29udmVyc2F0aW9uJywgc2VxcmVxIChldiwgY29udl9pZCkgLT5cbiAgICAgICAgdXBkYXRlQ29udmVyc2F0aW9uIGNvbnZfaWRcbiAgICAsIGZhbHNlLCAoZXYsIGNvbnZfaWQpIC0+IGNvbnZfaWRcblxuICAgICMgbm8gcmV0cmllcywgZGVkdXBlIG9uIGNvbnZfaWRcbiAgICBpcGMub24gJ3NldHR5cGluZycsIHNlcXJlcSAoZXYsIGNvbnZfaWQsIHYpIC0+XG4gICAgICAgIGNsaWVudC5zZXR0eXBpbmcgY29udl9pZCwgdlxuICAgICwgZmFsc2UsIChldiwgY29udl9pZCkgLT4gY29udl9pZFxuXG4gICAgaXBjLm9uICd1cGRhdGViYWRnZScsIChldiwgdmFsdWUpIC0+XG4gICAgICAgIGFwcC5kb2NrLnNldEJhZGdlKHZhbHVlKSBpZiBhcHAuZG9ja1xuXG4gICAgaXBjLm9uICdzZWFyY2hlbnRpdGllcycsIChldiwgcXVlcnksIG1heF9yZXN1bHRzKSAtPlxuICAgICAgICBwcm9taXNlID0gY2xpZW50LnNlYXJjaGVudGl0aWVzIHF1ZXJ5LCBtYXhfcmVzdWx0c1xuICAgICAgICBwcm9taXNlLnRoZW4gKHJlcykgLT5cbiAgICAgICAgICAgIGlwY3NlbmQgJ3NlYXJjaGVudGl0aWVzOnJlc3VsdCcsIHJlc1xuICAgIGlwYy5vbiAnY3JlYXRlY29udmVyc2F0aW9uJywgKGV2LCBpZHMsIG5hbWUsIGZvcmNlZ3JvdXA9ZmFsc2UpIC0+XG4gICAgICAgIHByb21pc2UgPSBjbGllbnQuY3JlYXRlY29udmVyc2F0aW9uIGlkcywgZm9yY2Vncm91cFxuICAgICAgICBjb252ID0gbnVsbFxuICAgICAgICBwcm9taXNlLnRoZW4gKHJlcykgLT5cbiAgICAgICAgICAgIGNvbnYgPSByZXMuY29udmVyc2F0aW9uXG4gICAgICAgICAgICBjb252X2lkID0gY29udi5pZC5pZFxuICAgICAgICAgICAgY2xpZW50LnJlbmFtZWNvbnZlcnNhdGlvbiBjb252X2lkLCBuYW1lIGlmIG5hbWVcbiAgICAgICAgcHJvbWlzZSA9IHByb21pc2UudGhlbiAocmVzKSAtPlxuICAgICAgICAgICAgaXBjc2VuZCAnY3JlYXRlY29udmVyc2F0aW9uOnJlc3VsdCcsIGNvbnYsIG5hbWVcbiAgICBpcGMub24gJ2FkZHVzZXInLCAoZXYsIGNvbnZfaWQsIHRvYWRkKSAtPlxuICAgICAgICBjbGllbnQuYWRkdXNlciBjb252X2lkLCB0b2FkZCAjwqB3aWxsIGF1dG9tYXRpY2FsbHkgdHJpZ2dlciBtZW1iZXJzaGlwX2NoYW5nZVxuICAgIGlwYy5vbiAncmVuYW1lY29udmVyc2F0aW9uJywgKGV2LCBjb252X2lkLCBuZXduYW1lKSAtPlxuICAgICAgICBjbGllbnQucmVuYW1lY29udmVyc2F0aW9uIGNvbnZfaWQsIG5ld25hbWUgIyB3aWxsIHRyaWdnZXIgY29udmVyc2F0aW9uX3JlbmFtZVxuXG4gICAgIyBubyByZXRyaWVzLCBqdXN0IGRlZHVwZSBvbiB0aGUgaWRzXG4gICAgaXBjLm9uICdnZXRlbnRpdHknLCBzZXFyZXEgKGV2LCBpZHMsIGRhdGEpIC0+XG4gICAgICAgIGNsaWVudC5nZXRlbnRpdHlieWlkKGlkcykudGhlbiAocikgLT5cbiAgICAgICAgICAgIGlwY3NlbmQgJ2dldGVudGl0eTpyZXN1bHQnLCByLCBkYXRhXG4gICAgLCBmYWxzZSwgKGV2LCBpZHMpIC0+IGlkcy5zb3J0KCkuam9pbignLCcpXG5cbiAgICAjIG5vIHJldHJ5LCBqdXN0IG9uZSBzaW5nbGUgcmVxdWVzdFxuICAgIGlwYy5vbiAnc3luY2FsbG5ld2V2ZW50cycsIHNlcXJlcSAoZXYsIHRpbWUpIC0+XG4gICAgICAgIGNvbnNvbGUubG9nICdzeW5jYWxsbmV3ZXZlbnRzOiBBc2tpbmcgaGFuZ291dHMgdG8gc3luYyBuZXcgZXZlbnRzJ1xuICAgICAgICBjbGllbnQuc3luY2FsbG5ld2V2ZW50cyh0aW1lKS50aGVuIChyKSAtPlxuICAgICAgICAgICAgaXBjc2VuZCAnc3luY2FsbG5ld2V2ZW50czpyZXNwb25zZScsIHJcbiAgICAsIGZhbHNlLCAoZXYsIHRpbWUpIC0+IDFcblxuICAgICMgbm8gcmV0cnksIGp1c3Qgb25lIHNpbmdsZSByZXF1ZXN0XG4gICAgaXBjLm9uICdzeW5jcmVjZW50Y29udmVyc2F0aW9ucycsIHN5bmNyZWNlbnQgPSBzZXFyZXEgKGV2KSAtPlxuICAgICAgICBjb25zb2xlLmxvZyAnc3luY3JlY2VudGNvbnZlcnNhdGlvbnM6IEFza2luZyBoYW5nb3V0cyB0byBzeW5jIHJlY2VudCBjb252ZXJzYXRpb25zJ1xuICAgICAgICBjbGllbnQuc3luY3JlY2VudGNvbnZlcnNhdGlvbnMoKS50aGVuIChyKSAtPlxuICAgICAgICAgICAgaXBjc2VuZCAnc3luY3JlY2VudGNvbnZlcnNhdGlvbnM6cmVzcG9uc2UnLCByXG4gICAgICAgICAgICAjIHRoaXMgaXMgYmVjYXVzZSB3ZSB1c2Ugc3luY3JlY2VudCBvbiByZXFpbml0IChkZXYtbW9kZVxuICAgICAgICAgICAgIyByZWZyZXNoKS4gaWYgd2Ugc3VjY2VlZGVkIGdldHRpbmcgYSByZXNwb25zZSwgd2UgY2FsbCBpdFxuICAgICAgICAgICAgIyBjb25uZWN0ZWQuXG4gICAgICAgICAgICBpcGNzZW5kICdjb25uZWN0ZWQnXG4gICAgLCBmYWxzZSwgKGV2LCB0aW1lKSAtPiAxXG5cbiAgICAjIHJldHJ5LCBvbmUgc2luZ2xlIHBlciBjb252X2lkXG4gICAgaXBjLm9uICdnZXRjb252ZXJzYXRpb24nLCBzZXFyZXEgKGV2LCBjb252X2lkLCB0aW1lc3RhbXAsIG1heCkgLT5cbiAgICAgICAgY2xpZW50LmdldGNvbnZlcnNhdGlvbihjb252X2lkLCB0aW1lc3RhbXAsIG1heCwgdHJ1ZSkudGhlbiAocikgLT5cbiAgICAgICAgICAgIGlwY3NlbmQgJ2dldGNvbnZlcnNhdGlvbjpyZXNwb25zZScsIHJcbiAgICAsIGZhbHNlLCAoZXYsIGNvbnZfaWQsIHRpbWVzdGFtcCwgbWF4KSAtPiBjb252X2lkXG5cbiAgICAjICAgIF8gICAgICBfICAgICBfICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX1xuICAgICMgICB8IHwgICAgKF8pICAgfCB8ICAgICAgICAgICAgICAgICAgIHwgfCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgfFxuICAgICMgICB8IHwgICAgIF8gX19ffCB8XyBfX18gXyBfXyAgICAgICAgIHwgfF9fICAgX18gXyBfIF9fICAgX18gXyAgX19fICBfICAgX3wgfF8gX19fXG4gICAgIyAgIHwgfCAgICB8IC8gX198IF9fLyBfIFxcICdfIFxcICAgICAgICB8ICdfIFxcIC8gX2AgfCAnXyBcXCAvIF9gIHwvIF8gXFx8IHwgfCB8IF9fLyBfX3xcbiAgICAjICAgfCB8X19fX3wgXFxfXyBcXCB8fCAgX18vIHwgfCB8XyBfIF8gIHwgfCB8IHwgKF98IHwgfCB8IHwgKF98IHwgKF8pIHwgfF98IHwgfF9cXF9fIFxcXG4gICAgIyAgIHxfX19fX198X3xfX18vXFxfX1xcX19ffF98IHxfKF98X3xfKSB8X3wgfF98XFxfXyxffF98IHxffFxcX18sIHxcXF9fXy8gXFxfXyxffFxcX198X19fL1xuICAgICMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX18vIHxcbiAgICAjICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfF9fXy9cbiAgICAjIExpc3RlbiBvbiBldmVudHMgZnJvbSBoYW5ndXBzanMgY2xpZW50LlxuXG4gICAgIyBwcm9wYWdhdGUgSGFuZ291dCBjbGllbnQgZXZlbnRzIHRvIHRoZSByZW5kZXJlclxuICAgIHJlcXVpcmUoJy4vdWkvZXZlbnRzJykuZm9yRWFjaCAobikgLT5cbiAgICAgICAgY2xpZW50Lm9uIG4sIChlKSAtPlxuICAgICAgICAgICAgbG9nLmRlYnVnICdERUJVRzogUmVjZWl2ZWQgZXZlbnQnLCBuXG4gICAgICAgICAgICAjIGNsaWVudF9jb252ZXJzYXRpb24gY29tZXMgd2l0aG91dCBtZXRhZGF0YSBieSBkZWZhdWx0LlxuICAgICAgICAgICAgIyAgV2UgbmVlZCBpdCBmb3IgdW5yZWFkIGNvdW50XG4gICAgICAgICAgICB1cGRhdGVDb252ZXJzYXRpb24gZS5jb252ZXJzYXRpb25faWQuaWQgaWYgKG4gPT0gJ2NsaWVudF9jb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgaXBjc2VuZCBuLCBlXG5cbiAgICAjIEVtaXR0ZWQgd2hlbiB0aGUgd2luZG93IGlzIGFib3V0IHRvIGNsb3NlLlxuICAgICMgSGlkZXMgdGhlIHdpbmRvdyBpZiB3ZSdyZSBub3QgZm9yY2UgY2xvc2luZy5cbiAgICAjICBJTVBPUlRBTlQ6IG1vdmVkIHRvIGFwcC5jb2ZmZWVcbiJdfQ==
