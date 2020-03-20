(function() {
  var applayout, autoLauncher, clipboard, contextmenu, conv, currentWindow, dispatcher, drive, i, i18nOpts, ipc, j, k, len, len1, path, path_parts, ref, ref1, remote, rule, stylesheet, trayicon, trifl, viewstate;

  ipc = require('electron').ipcRenderer;

  clipboard = require('electron').clipboard;

  path = require('path');

  autoLauncher = require('./util').autoLauncher;

  [drive, ...path_parts] = path.normalize(__dirname).split(path.sep);

  global.YAKYAK_ROOT_DIR = [drive, ...path_parts.map(encodeURIComponent)].join('/');

  // expose trifl in global scope
  trifl = require('trifl');

  trifl.expose(window);

  // in app notification system
  window.notr = require('notr');

  notr.defineStack('def', 'body', {
    top: '3px',
    right: '15px'
  });

  // init trifl dispatcher
  dispatcher = require('./dispatcher');

  remote = require('electron').remote;

  window.onerror = function(msg, url, lineNo, columnNo, error) {
    var hash;
    hash = {msg, url, lineNo, columnNo, error};
    return ipc.send('errorInWindow', hash);
  };

  // expose some selected tagg functions
  trifl.tagg.expose(window, ...('ul li div span a i b u s button p label input table thead tbody tr td th textarea br pass img h1 h2 h3 h4 hr em'.split(' ')));

  
  // Translation support
  window.i18n = require('i18n');

  // This had to be antecipated, as i18n requires viewstate
  //  and applayout requires i18n
  ({viewstate} = require('./models'));

  // see if auto launching is enabled at a system level
  autoLauncher.isEnabled().then(function(isEnabled) {
    return action('initopenonsystemstartup', isEnabled);
  });

  
  // Configuring supporting languages here
  i18nOpts = {
    directory: path.join(__dirname, '..', 'locales'),
    defaultLocale: 'en', // fallback
    objectNotation: true
  };

  
  i18n.configure(i18nOpts);

  
  // force initialize
  if (i18n.getLocales().includes(viewstate.language)) {
    i18n.setLocale(viewstate.language);
  }

  
  ipc.send('seti18n', i18nOpts, viewstate.language);

  // Set locale if exists, otherwise, keep 'en'
  action('changelanguage', viewstate.language);

  // does not update viewstate -- why? because locale can be recovered later
  //   not the best reasoning :)
  ({applayout} = require('./views'));

  ({conv} = require('./models'));

  // show tray icon as soon as browser window appers
  ({trayicon} = require('./views/index'));

  contextmenu = require('./views/contextmenu');

  require('./views/menu')(viewstate);

  // tie layout to DOM
  currentWindow = remote.getCurrentWindow();

  document.body.appendChild(applayout.el);

  (function() {    // intercept every event we listen to
    // to make an 'alive' action to know
    // the server is alive
    var ipcon;
    ipcon = ipc.on.bind(ipc);
    return ipc.on = function(n, fn) {
      return ipcon(n, function(...as) {
        action('alive', Date.now());
        return fn(...as);
      });
    };
  })();

  // called when window is ready to show
  //  note: could not use event here, as it must be defined
  //  before
  ipc.on('ready-to-show', function() {
    var elToRemove, mainWindow;
    
    // remove initial error from DOM
    elToRemove = window.document.getElementById("error-b4-app");
    elToRemove.parentNode.removeChild(elToRemove);
    // get window object
    mainWindow = remote.getCurrentWindow();
    
    // when yakyak becomes active, focus is automatically given
    //  to textarea
    mainWindow.on('focus', function() {
      var el;
      if (viewstate.state === viewstate.STATE_NORMAL) {
        // focus on webContents
        mainWindow.webContents.focus();
        el = window.document.getElementById('message-input');
        // focus on specific element
        return el != null ? el.focus() : void 0;
      }
    });
    // hide menu bar in all platforms but darwin
    if (process.platform !== 'darwin') {
      // # Deprecated to BrowserWindow attribute
      // mainWindow.setAutoHideMenuBar(true)
      mainWindow.setMenuBarVisibility(false);
    }
    // handle the visibility of the window
    if (viewstate.startminimizedtotray) {
      mainWindow.hide();
    } else if ((remote.getGlobal('windowHideWhileCred') == null) || remote.getGlobal('windowHideWhileCred') !== true) {
      mainWindow.show();
    }
    
    return window.addEventListener('unload', function(ev) {
      var window;
      if (process.platform === 'darwin' && (typeof window !== "undefined" && window !== null)) {
        if (window.isFullScreen()) {
          window.setFullScreen(false);
        }
        if (!remote.getGlobal('forceClose')) {
          ev.preventDefault();
          if (typeof window !== "undefined" && window !== null) {
            window.hide();
          }
          return;
        }
      }
      window = null;
      return action('quit');
    });
  });

  
  // This can be removed once windows10 supports NotoColorEmoji
  //  (or the font supports Windows10)

  if (process.platform === 'win32') {
    ref = window.document.styleSheets;
    for (j = 0, len = ref.length; j < len; j++) {
      stylesheet = ref[j];
      if (stylesheet.href.match('app\.css') != null) {
        ref1 = stylesheet.cssRules;
        for (i = k = 0, len1 = ref1.length; k < len1; i = ++k) {
          rule = ref1[i];
          if (rule.type === 5 && (rule.cssText.match('font-family: NotoColorEmoji;') != null)) {
            stylesheet.deleteRule(i);
            break;
          }
        }
        break;
      }
    }
  }

  
  // Get information on exceptions in main process
  //  - Exceptions that were caught
  //  - Window crashes
  ipc.on('expcetioninmain', function(error) {
    var msg;
    console.log((msg = "Possible fatal error on main process" + ", YakYak could stop working as expected."), error);
    return notr(msg, {
      stay: 0
    });
  });

  ipc.on('message', function(msg) {
    console.log('Message from main process:', msg);
    return notr(msg);
  });

  // wire up stuff from server
  ipc.on('init', function(ev, data) {
    return dispatcher.init(data);
  });

  // events from hangupsjs
  require('./events').forEach(function(n) {
    return ipc.on(n, function(ev, data) {
      return action(n, data);
    });
  });

  // response from getentity
  ipc.on('getentity:result', function(ev, r, data) {
    return action('addentities', r.entities, data != null ? data.add_to_conv : void 0);
  });

  ipc.on('resize', function(ev, dim) {
    return action('resize', dim);
  });

  ipc.on('move', function(ev, pos) {
    return action('move', pos);
  });

  ipc.on('searchentities:result', function(ev, r) {
    return action('setsearchedentities', r.entity);
  });

  ipc.on('createconversation:result', function(ev, c, name) {
    c.conversation_id = c.id; // fix conversation payload
    if (name) {
      c.name = name;
    }
    action('createconversationdone', c);
    return action('setstate', viewstate.STATE_NORMAL);
  });

  ipc.on('syncallnewevents:response', function(ev, r) {
    return action('handlesyncedevents', r);
  });

  ipc.on('syncrecentconversations:response', function(ev, r) {
    return action('handlerecentconversations', r);
  });

  ipc.on('getconversation:response', function(ev, r) {
    return action('handlehistory', r);
  });

  
  // gets metadata from conversation after setting focus
  ipc.on('getconversationmetadata:response', function(ev, r) {
    return action('handleconversationmetadata', r);
  });

  ipc.on('uploadingimage', function(ev, spec) {
    return action('uploadingimage', spec);
  });

  ipc.on('querypresence:result', function(ev, r) {
    return action('setpresence', r);
  });

  // init dispatcher/controller
  require('./dispatcher');

  require('./views/controller');

  // request init this is not happening when
  // the server is just connecting, but for
  // dev mode when we reload the page
  action('reqinit');

  
  // Listen to paste event and paste to message textarea

  //  The only time when this event is not triggered, is when
  //   the event is triggered from the message-area itself

  document.addEventListener('paste', function(e) {
    var el, mainWindow;
    if (!clipboard.readImage().isEmpty() && !clipboard.readText()) {
      action('onpasteimage');
      e.preventDefault();
    }
    // focus on web contents
    mainWindow = remote.getCurrentWindow();
    mainWindow.webContents.focus();
    // focus on textarea
    el = window.document.getElementById('message-input');
    return el != null ? el.focus() : void 0;
  });

  // register event listeners for on/offline
  window.addEventListener('online', function() {
    return action('wonline', true);
  });

  window.addEventListener('offline', function() {
    return action('wonline', false);
  });

  
  // Catch unresponsive events
  remote.getCurrentWindow().on('unresponsive', function(error) {
    var msg;
    notr(msg = "Warning: YakYak is becoming unresponsive.", {
      id: 'unresponsive'
    });
    console.log('Unresponsive event', msg);
    return ipc.send('errorInWindow', 'Unresponsive window');
  });

  
  // Show a message
  remote.getCurrentWindow().on('responsive', function() {
    return notr("Back to normal again!", {
      id: 'unresponsive'
    });
  });

  // Listen to close and quit events
  window.addEventListener('beforeunload', function(e) {
    var hide;
    if (remote.getGlobal('forceClose')) {
      return;
    }
    // Mac os and the dock have a special relationship
    // Handle the close to tray action
    hide = (process.platform === 'darwin' && !viewstate.hidedockicon) || viewstate.closetotray;
    if (hide) {
      e.returnValue = false;
      remote.getCurrentWindow().hide();
    }
  });

  currentWindow.webContents.on('context-menu', function(e, params) {
    var canShow;
    e.preventDefault();
    canShow = [viewstate.STATE_NORMAL, viewstate.STATE_ADD_CONVERSATION].includes(viewstate.state);
    if (canShow) {
      return contextmenu(params, viewstate).popup(remote.getCurrentWindow());
    }
  });

  // tell the startup state
  action('wonline', window.navigator.onLine);

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvYXBwLmpzIiwic291cmNlcyI6WyJ1aS9hcHAuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxTQUFBLEVBQUEsWUFBQSxFQUFBLFNBQUEsRUFBQSxXQUFBLEVBQUEsSUFBQSxFQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUEsS0FBQSxFQUFBLENBQUEsRUFBQSxRQUFBLEVBQUEsR0FBQSxFQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLElBQUEsRUFBQSxVQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQTs7RUFBQSxHQUFBLEdBQWUsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFDbkMsU0FBQSxHQUFlLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBQ25DLElBQUEsR0FBZSxPQUFBLENBQVEsTUFBUjs7RUFDZixZQUFBLEdBQWUsT0FBQSxDQUFRLFFBQVIsQ0FBaUIsQ0FBQzs7RUFFakMsQ0FBQyxLQUFELEVBQVEsR0FBQSxVQUFSLENBQUEsR0FBeUIsSUFBSSxDQUFDLFNBQUwsQ0FBZSxTQUFmLENBQXlCLENBQUMsS0FBMUIsQ0FBZ0MsSUFBSSxDQUFDLEdBQXJDOztFQUN6QixNQUFNLENBQUMsZUFBUCxHQUF5QixDQUFDLEtBQUQsRUFBUSxHQUFBLFVBQVUsQ0FBQyxHQUFYLENBQWUsa0JBQWYsQ0FBUixDQUE4QyxDQUFDLElBQS9DLENBQW9ELEdBQXBELEVBTnpCOzs7RUFTQSxLQUFBLEdBQVEsT0FBQSxDQUFRLE9BQVI7O0VBQ1IsS0FBSyxDQUFDLE1BQU4sQ0FBYSxNQUFiLEVBVkE7OztFQWFBLE1BQU0sQ0FBQyxJQUFQLEdBQWMsT0FBQSxDQUFRLE1BQVI7O0VBQ2QsSUFBSSxDQUFDLFdBQUwsQ0FBaUIsS0FBakIsRUFBd0IsTUFBeEIsRUFBZ0M7SUFBQyxHQUFBLEVBQUksS0FBTDtJ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d0IsY0FBeEIsRUFBd0MsUUFBQSxDQUFDLENBQUQsQ0FBQTtBQUN4QyxRQUFBO0lBQUksSUFBRyxNQUFNLENBQUMsU0FBUCxDQUFpQixZQUFqQixDQUFIO0FBQ0ksYUFESjtLQUFKOzs7SUFHSSxJQUFBLEdBRUksQ0FBQyxPQUFPLENBQUMsUUFBUixLQUFvQixRQUFwQixJQUFnQyxDQUFDLFNBQVMsQ0FBQyxZQUE1QyxDQUFBLElBRUEsU0FBUyxDQUFDO0lBR2QsSUFBRyxJQUFIO01BQ0ksQ0FBQyxDQUFDLFdBQUYsR0FBZ0I7TUFDaEIsTUFBTSxDQUFDLGdCQUFQLENBQUEsQ0FBeUIsQ0FBQyxJQUExQixDQUFBLEVBRko7O0VBWG9DLENBQXhDOztFQWdCQSxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQTFCLENBQTZCLGNBQTdCLEVBQTZDLFFBQUEsQ0FBQyxDQUFELEVBQUksTUFBSixDQUFBO0FBQzdDLFFBQUE7SUFBSSxDQUFDLENBQUMsY0FBRixDQUFBO0lBQ0EsT0FBQSxHQUFVLENBQUMsU0FBUyxDQUFDLFlBQVgsRUFDQyxTQUFTLENBQUMsc0JBRFgsQ0FDa0MsQ0FBQyxRQURuQyxDQUM0QyxTQUFTLENBQUMsS0FEdEQ7SUFFVixJQUFHLE9BQUg7YUFDSSxXQUFBLENBQVksTUFBWixFQUFvQixTQUFwQixDQUE4QixDQUFDLEtBQS9CLENBQXFDLE1BQU0sQ0FBQyxnQkFBUCxDQUFBLENBQXJDLEVBREo7O0VBSnlDLENBQTdDLEVBNVBBOzs7RUFvUUEsTUFBQSxDQUFPLFNBQVAsRUFBa0IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFuQztBQXBRQSIsInNvdXJjZXNDb250ZW50IjpbImlwYyAgICAgICAgICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbmNsaXBib2FyZCAgICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuY2xpcGJvYXJkXG5wYXRoICAgICAgICAgPSByZXF1aXJlKCdwYXRoJylcbmF1dG9MYXVuY2hlciA9IHJlcXVpcmUoJy4vdXRpbCcpLmF1dG9MYXVuY2hlclxuXG5bZHJpdmUsIHBhdGhfcGFydHMuLi5dID0gcGF0aC5ub3JtYWxpemUoX19kaXJuYW1lKS5zcGxpdChwYXRoLnNlcClcbmdsb2JhbC5ZQUtZQUtfUk9PVF9ESVIgPSBbZHJpdmUsIHBhdGhfcGFydHMubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuLi5dLmpvaW4oJy8nKVxuXG4jIGV4cG9zZSB0cmlmbCBpbiBnbG9iYWwgc2NvcGVcbnRyaWZsID0gcmVxdWlyZSAndHJpZmwnXG50cmlmbC5leHBvc2Ugd2luZG93XG5cbiMgaW4gYXBwIG5vdGlmaWNhdGlvbiBzeXN0ZW1cbndpbmRvdy5ub3RyID0gcmVxdWlyZSAnbm90cidcbm5vdHIuZGVmaW5lU3RhY2sgJ2RlZicsICdib2R5Jywge3RvcDonM3B4JywgcmlnaHQ6JzE1cHgnfVxuXG4jIGluaXQgdHJpZmwgZGlzcGF0Y2hlclxuZGlzcGF0Y2hlciA9IHJlcXVpcmUgJy4vZGlzcGF0Y2hlcidcblxucmVtb3RlID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5yZW1vdGVcblxud2luZG93Lm9uZXJyb3IgPSAobXNnLCB1cmwsIGxpbmVObywgY29sdW1uTm8sIGVycm9yKSAtPlxuICAgIGhhc2ggPSB7bXNnLCB1cmwsIGxpbmVObywgY29sdW1uTm8sIGVycm9yfVxuICAgIGlwYy5zZW5kICdlcnJvckluV2luZG93JywgaGFzaFxuXG4jIGV4cG9zZSBzb21lIHNlbGVjdGVkIHRhZ2cgZnVuY3Rpb25zXG50cmlmbC50YWdnLmV4cG9zZSB3aW5kb3csICgndWwgbGkgZGl2IHNwYW4gYSBpIGIgdSBzIGJ1dHRvbiBwIGxhYmVsXG5pbnB1dCB0YWJsZSB0aGVhZCB0Ym9keSB0ciB0ZCB0aCB0ZXh0YXJlYSBiciBwYXNzIGltZyBoMSBoMiBoMyBoNFxuaHIgZW0nLnNwbGl0KCcgJykpLi4uXG5cbiNcbiMgVHJhbnNsYXRpb24gc3VwcG9ydFxud2luZG93LmkxOG4gPSByZXF1aXJlKCdpMThuJylcbiMgVGhpcyBoYWQgdG8gYmUgYW50ZWNpcGF0ZWQsIGFzIGkxOG4gcmVxdWlyZXMgdmlld3N0YXRlXG4jICBhbmQgYXBwbGF5b3V0IHJlcXVpcmVzIGkxOG5cbnt2aWV3c3RhdGV9ID0gcmVxdWlyZSAnLi9tb2RlbHMnXG5cbiMgc2VlIGlmIGF1dG8gbGF1bmNoaW5nIGlzIGVuYWJsZWQgYXQgYSBzeXN0ZW0gbGV2ZWxcbmF1dG9MYXVuY2hlci5pc0VuYWJsZWQoKS50aGVuKChpc0VuYWJsZWQpIC0+XG4gICAgYWN0aW9uICdpbml0b3Blbm9uc3lzdGVtc3RhcnR1cCcsIGlzRW5hYmxlZFxuKVxuXG4jXG4jIENvbmZpZ3VyaW5nIHN1cHBvcnRpbmcgbGFuZ3VhZ2VzIGhlcmVcbmkxOG5PcHRzID0ge1xuICAgIGRpcmVjdG9yeTogcGF0aC5qb2luIF9fZGlybmFtZSwgJy4uJywgJ2xvY2FsZXMnXG4gICAgZGVmYXVsdExvY2FsZTogJ2VuJyAjIGZhbGxiYWNrXG4gICAgb2JqZWN0Tm90YXRpb246IHRydWVcbn1cbiNcbmkxOG4uY29uZmlndXJlIGkxOG5PcHRzXG4jXG4jIGZvcmNlIGluaXRpYWxpemVcbmlmIGkxOG4uZ2V0TG9jYWxlcygpLmluY2x1ZGVzIHZpZXdzdGF0ZS5sYW5ndWFnZVxuICAgIGkxOG4uc2V0TG9jYWxlKHZpZXdzdGF0ZS5sYW5ndWFnZSlcbiNcbmlwYy5zZW5kICdzZXRpMThuJywgaTE4bk9wdHMsIHZpZXdzdGF0ZS5sYW5ndWFnZVxuXG4jIFNldCBsb2NhbGUgaWYgZXhpc3RzLCBvdGhlcndpc2UsIGtlZXAgJ2VuJ1xuYWN0aW9uICdjaGFuZ2VsYW5ndWFnZScsIHZpZXdzdGF0ZS5sYW5ndWFnZVxuIyBkb2VzIG5vdCB1cGRhdGUgdmlld3N0YXRlIC0tIHdoeT8gYmVjYXVzZSBsb2NhbGUgY2FuIGJlIHJlY292ZXJlZCBsYXRlclxuIyAgIG5vdCB0aGUgYmVzdCByZWFzb25pbmcgOilcblxue2FwcGxheW91dH0gICAgICAgPSByZXF1aXJlICcuL3ZpZXdzJ1xuXG57Y29udn0gPSByZXF1aXJlICcuL21vZGVscydcblxuIyBzaG93IHRyYXkgaWNvbiBhcyBzb29uIGFzIGJyb3dzZXIgd2luZG93IGFwcGVyc1xueyB0cmF5aWNvbiB9ID0gcmVxdWlyZSAnLi92aWV3cy9pbmRleCdcblxuY29udGV4dG1lbnUgPSByZXF1aXJlKCcuL3ZpZXdzL2NvbnRleHRtZW51JylcbnJlcXVpcmUoJy4vdmlld3MvbWVudScpKHZpZXdzdGF0ZSlcblxuIyB0aWUgbGF5b3V0IHRvIERPTVxuY3VycmVudFdpbmRvdyA9IHJlbW90ZS5nZXRDdXJyZW50V2luZG93KClcblxuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCBhcHBsYXlvdXQuZWxcblxuIyBpbnRlcmNlcHQgZXZlcnkgZXZlbnQgd2UgbGlzdGVuIHRvXG4jIHRvIG1ha2UgYW4gJ2FsaXZlJyBhY3Rpb24gdG8ga25vd1xuIyB0aGUgc2VydmVyIGlzIGFsaXZlXG5kbyAtPlxuICAgIGlwY29uID0gaXBjLm9uLmJpbmQoaXBjKVxuICAgIGlwYy5vbiA9IChuLCBmbikgLT5cbiAgICAgICAgaXBjb24gbiwgKGFzLi4uKSAtPlxuICAgICAgICAgICAgYWN0aW9uICdhbGl2ZScsIERhdGUubm93KClcbiAgICAgICAgICAgIGZuIGFzLi4uXG5cbiMgY2FsbGVkIHdoZW4gd2luZG93IGlzIHJlYWR5IHRvIHNob3dcbiMgIG5vdGU6IGNvdWxkIG5vdCB1c2UgZXZlbnQgaGVyZSwgYXMgaXQgbXVzdCBiZSBkZWZpbmVkXG4jICBiZWZvcmVcbmlwYy5vbiAncmVhZHktdG8tc2hvdycsICgpIC0+XG4gICAgI1xuICAgICMgcmVtb3ZlIGluaXRpYWwgZXJyb3IgZnJvbSBET01cbiAgICBlbFRvUmVtb3ZlID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZXJyb3ItYjQtYXBwXCIpXG4gICAgZWxUb1JlbW92ZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsVG9SZW1vdmUpXG4gICAgIyBnZXQgd2luZG93IG9iamVjdFxuICAgIG1haW5XaW5kb3cgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG4gICAgI1xuICAgICMgd2hlbiB5YWt5YWsgYmVjb21lcyBhY3RpdmUsIGZvY3VzIGlzIGF1dG9tYXRpY2FsbHkgZ2l2ZW5cbiAgICAjICB0byB0ZXh0YXJlYVxuICAgIG1haW5XaW5kb3cub24gJ2ZvY3VzJywgKCkgLT5cbiAgICAgICAgaWYgdmlld3N0YXRlLnN0YXRlID09IHZpZXdzdGF0ZS5TVEFURV9OT1JNQUxcbiAgICAgICAgICAgICMgZm9jdXMgb24gd2ViQ29udGVudHNcbiAgICAgICAgICAgIG1haW5XaW5kb3cud2ViQ29udGVudHMuZm9jdXMoKVxuICAgICAgICAgICAgZWwgPSB3aW5kb3cuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2UtaW5wdXQnKVxuICAgICAgICAgICAgIyBmb2N1cyBvbiBzcGVjaWZpYyBlbGVtZW50XG4gICAgICAgICAgICBlbD8uZm9jdXMoKVxuXG4gICAgIyBoaWRlIG1lbnUgYmFyIGluIGFsbCBwbGF0Zm9ybXMgYnV0IGRhcndpblxuICAgIHVubGVzcyBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG4gICAgICAgICMgIyBEZXByZWNhdGVkIHRvIEJyb3dzZXJXaW5kb3cgYXR0cmlidXRlXG4gICAgICAgICMgbWFpbldpbmRvdy5zZXRBdXRvSGlkZU1lbnVCYXIodHJ1ZSlcbiAgICAgICAgbWFpbldpbmRvdy5zZXRNZW51QmFyVmlzaWJpbGl0eShmYWxzZSlcbiAgICAjIGhhbmRsZSB0aGUgdmlzaWJpbGl0eSBvZiB0aGUgd2luZG93XG4gICAgaWYgdmlld3N0YXRlLnN0YXJ0bWluaW1pemVkdG90cmF5XG4gICAgICAgIG1haW5XaW5kb3cuaGlkZSgpXG4gICAgZWxzZSBpZiAhcmVtb3RlLmdldEdsb2JhbCgnd2luZG93SGlkZVdoaWxlQ3JlZCcpPyB8fFxuICAgICAgICAgICAgIHJlbW90ZS5nZXRHbG9iYWwoJ3dpbmRvd0hpZGVXaGlsZUNyZWQnKSAhPSB0cnVlXG4gICAgICAgIG1haW5XaW5kb3cuc2hvdygpXG5cbiAgICAjXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ3VubG9hZCcsIChldikgLT5cbiAgICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJyAmJiB3aW5kb3c/XG4gICAgICAgICAgICBpZiB3aW5kb3cuaXNGdWxsU2NyZWVuKClcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2V0RnVsbFNjcmVlbiBmYWxzZVxuICAgICAgICAgICAgaWYgbm90IHJlbW90ZS5nZXRHbG9iYWwoJ2ZvcmNlQ2xvc2UnKVxuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgICB3aW5kb3c/LmhpZGUoKVxuICAgICAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHdpbmRvdyA9IG51bGxcbiAgICAgICAgYWN0aW9uICdxdWl0J1xuXG4jXG4jXG4jIFRoaXMgY2FuIGJlIHJlbW92ZWQgb25jZSB3aW5kb3dzMTAgc3VwcG9ydHMgTm90b0NvbG9yRW1vamlcbiMgIChvciB0aGUgZm9udCBzdXBwb3J0cyBXaW5kb3dzMTApXG4jXG5pZiBwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMidcbiAgICBmb3Igc3R5bGVzaGVldCBpbiB3aW5kb3cuZG9jdW1lbnQuc3R5bGVTaGVldHNcbiAgICAgICAgaWYgc3R5bGVzaGVldC5ocmVmLm1hdGNoKCdhcHBcXC5jc3MnKT9cbiAgICAgICAgICAgIGZvciBydWxlLCBpIGluIHN0eWxlc2hlZXQuY3NzUnVsZXNcbiAgICAgICAgICAgICAgICBpZiBydWxlLnR5cGUgPT0gNSAmJiBydWxlLmNzc1RleHQubWF0Y2goJ2ZvbnQtZmFtaWx5OiBOb3RvQ29sb3JFbW9qaTsnKT9cbiAgICAgICAgICAgICAgICAgICAgc3R5bGVzaGVldC5kZWxldGVSdWxlKGkpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICBicmVha1xuI1xuI1xuIyBHZXQgaW5mb3JtYXRpb24gb24gZXhjZXB0aW9ucyBpbiBtYWluIHByb2Nlc3NcbiMgIC0gRXhjZXB0aW9ucyB0aGF0IHdlcmUgY2F1Z2h0XG4jICAtIFdpbmRvdyBjcmFzaGVzXG5pcGMub24gJ2V4cGNldGlvbmlubWFpbicsIChlcnJvcikgLT5cbiAgICBjb25zb2xlLmxvZyAobXNnID0gXCJQb3NzaWJsZSBmYXRhbCBlcnJvciBvbiBtYWluIHByb2Nlc3NcIiArXG4gICAgICAgIFwiLCBZYWtZYWsgY291bGQgc3RvcCB3b3JraW5nIGFzIGV4cGVjdGVkLlwiKSwgZXJyb3JcbiAgICBub3RyIG1zZywge3N0YXk6IDB9XG5cbmlwYy5vbiAnbWVzc2FnZScsIChtc2cpIC0+XG4gICAgY29uc29sZS5sb2cgJ01lc3NhZ2UgZnJvbSBtYWluIHByb2Nlc3M6JywgbXNnXG4gICAgbm90ciBtc2dcblxuIyB3aXJlIHVwIHN0dWZmIGZyb20gc2VydmVyXG5pcGMub24gJ2luaXQnLCAoZXYsIGRhdGEpIC0+IGRpc3BhdGNoZXIuaW5pdCBkYXRhXG4jIGV2ZW50cyBmcm9tIGhhbmd1cHNqc1xucmVxdWlyZSgnLi9ldmVudHMnKS5mb3JFYWNoIChuKSAtPiBpcGMub24gbiwgKGV2LCBkYXRhKSAtPiBhY3Rpb24gbiwgZGF0YVxuIyByZXNwb25zZSBmcm9tIGdldGVudGl0eVxuaXBjLm9uICdnZXRlbnRpdHk6cmVzdWx0JywgKGV2LCByLCBkYXRhKSAtPlxuICAgIGFjdGlvbiAnYWRkZW50aXRpZXMnLCByLmVudGl0aWVzLCBkYXRhPy5hZGRfdG9fY29udlxuXG5pcGMub24gJ3Jlc2l6ZScsIChldiwgZGltKSAtPiBhY3Rpb24gJ3Jlc2l6ZScsIGRpbVxuXG5pcGMub24gJ21vdmUnLCAoZXYsIHBvcykgIC0+IGFjdGlvbiAnbW92ZScsIHBvc1xuaXBjLm9uICdzZWFyY2hlbnRpdGllczpyZXN1bHQnLCAoZXYsIHIpIC0+XG4gICAgYWN0aW9uICdzZXRzZWFyY2hlZGVudGl0aWVzJywgci5lbnRpdHlcbmlwYy5vbiAnY3JlYXRlY29udmVyc2F0aW9uOnJlc3VsdCcsIChldiwgYywgbmFtZSkgLT5cbiAgICBjLmNvbnZlcnNhdGlvbl9pZCA9IGMuaWQgI8KgZml4IGNvbnZlcnNhdGlvbiBwYXlsb2FkXG4gICAgYy5uYW1lID0gbmFtZSBpZiBuYW1lXG4gICAgYWN0aW9uICdjcmVhdGVjb252ZXJzYXRpb25kb25lJywgY1xuICAgIGFjdGlvbiAnc2V0c3RhdGUnLCB2aWV3c3RhdGUuU1RBVEVfTk9STUFMXG5pcGMub24gJ3N5bmNhbGxuZXdldmVudHM6cmVzcG9uc2UnLCAoZXYsIHIpIC0+IGFjdGlvbiAnaGFuZGxlc3luY2VkZXZlbnRzJywgclxuaXBjLm9uICdzeW5jcmVjZW50Y29udmVyc2F0aW9uczpyZXNwb25zZScsIChldiwgcikgLT4gYWN0aW9uICdoYW5kbGVyZWNlbnRjb252ZXJzYXRpb25zJywgclxuaXBjLm9uICdnZXRjb252ZXJzYXRpb246cmVzcG9uc2UnLCAoZXYsIHIpIC0+IGFjdGlvbiAnaGFuZGxlaGlzdG9yeScsIHJcbiNcbiMgZ2V0cyBtZXRhZGF0YSBmcm9tIGNvbnZlcnNhdGlvbiBhZnRlciBzZXR0aW5nIGZvY3VzXG5pcGMub24gJ2dldGNvbnZlcnNhdGlvbm1ldGFkYXRhOnJlc3BvbnNlJywgKGV2LCByKSAtPlxuICAgIGFjdGlvbiAnaGFuZGxlY29udmVyc2F0aW9ubWV0YWRhdGEnLCByXG5pcGMub24gJ3VwbG9hZGluZ2ltYWdlJywgKGV2LCBzcGVjKSAtPiBhY3Rpb24gJ3VwbG9hZGluZ2ltYWdlJywgc3BlY1xuaXBjLm9uICdxdWVyeXByZXNlbmNlOnJlc3VsdCcsIChldiwgcikgLT4gYWN0aW9uICdzZXRwcmVzZW5jZScsIHJcblxuIyBpbml0IGRpc3BhdGNoZXIvY29udHJvbGxlclxucmVxdWlyZSAnLi9kaXNwYXRjaGVyJ1xucmVxdWlyZSAnLi92aWV3cy9jb250cm9sbGVyJ1xuXG4jIHJlcXVlc3QgaW5pdCB0aGlzIGlzIG5vdCBoYXBwZW5pbmcgd2hlblxuIyB0aGUgc2VydmVyIGlzIGp1c3QgY29ubmVjdGluZywgYnV0IGZvclxuIyBkZXYgbW9kZSB3aGVuIHdlIHJlbG9hZCB0aGUgcGFnZVxuYWN0aW9uICdyZXFpbml0J1xuXG4jXG4jXG4jIExpc3RlbiB0byBwYXN0ZSBldmVudCBhbmQgcGFzdGUgdG8gbWVzc2FnZSB0ZXh0YXJlYVxuI1xuIyAgVGhlIG9ubHkgdGltZSB3aGVuIHRoaXMgZXZlbnQgaXMgbm90IHRyaWdnZXJlZCwgaXMgd2hlblxuIyAgIHRoZSBldmVudCBpcyB0cmlnZ2VyZWQgZnJvbSB0aGUgbWVzc2FnZS1hcmVhIGl0c2VsZlxuI1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAncGFzdGUnLCAoZSkgLT5cbiAgICBpZiBub3QgY2xpcGJvYXJkLnJlYWRJbWFnZSgpLmlzRW1wdHkoKSBhbmQgbm90IGNsaXBib2FyZC5yZWFkVGV4dCgpXG4gICAgICAgIGFjdGlvbiAnb25wYXN0ZWltYWdlJ1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAjIGZvY3VzIG9uIHdlYiBjb250ZW50c1xuICAgIG1haW5XaW5kb3cgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG4gICAgbWFpbldpbmRvdy53ZWJDb250ZW50cy5mb2N1cygpXG4gICAgIyBmb2N1cyBvbiB0ZXh0YXJlYVxuICAgIGVsID0gd2luZG93LmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZXNzYWdlLWlucHV0JylcbiAgICBlbD8uZm9jdXMoKVxuXG4jIHJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVycyBmb3Igb24vb2ZmbGluZVxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ29ubGluZScsICAtPiBhY3Rpb24gJ3dvbmxpbmUnLCB0cnVlXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnb2ZmbGluZScsIC0+IGFjdGlvbiAnd29ubGluZScsIGZhbHNlXG5cbiNcbiNcbiMgQ2F0Y2ggdW5yZXNwb25zaXZlIGV2ZW50c1xucmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5vbiAndW5yZXNwb25zaXZlJywgKGVycm9yKSAtPlxuICAgIG5vdHIgbXNnID0gXCJXYXJuaW5nOiBZYWtZYWsgaXMgYmVjb21pbmcgdW5yZXNwb25zaXZlLlwiLFxuICAgICAgICB7IGlkOiAndW5yZXNwb25zaXZlJ31cbiAgICBjb25zb2xlLmxvZyAnVW5yZXNwb25zaXZlIGV2ZW50JywgbXNnXG4gICAgaXBjLnNlbmQgJ2Vycm9ySW5XaW5kb3cnLCAnVW5yZXNwb25zaXZlIHdpbmRvdydcblxuI1xuI1xuIyBTaG93IGEgbWVzc2FnZVxucmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5vbiAncmVzcG9uc2l2ZScsICgpIC0+XG4gICAgbm90ciBcIkJhY2sgdG8gbm9ybWFsIGFnYWluIVwiLCB7IGlkOiAndW5yZXNwb25zaXZlJ31cblxuIyBMaXN0ZW4gdG8gY2xvc2UgYW5kIHF1aXQgZXZlbnRzXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnYmVmb3JldW5sb2FkJywgKGUpIC0+XG4gICAgaWYgcmVtb3RlLmdldEdsb2JhbCgnZm9yY2VDbG9zZScpXG4gICAgICAgIHJldHVyblxuXG4gICAgaGlkZSA9IChcbiAgICAgICAgIyBNYWMgb3MgYW5kIHRoZSBkb2NrIGhhdmUgYSBzcGVjaWFsIHJlbGF0aW9uc2hpcFxuICAgICAgICAocHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJyAmJiAhdmlld3N0YXRlLmhpZGVkb2NraWNvbikgfHxcbiAgICAgICAgIyBIYW5kbGUgdGhlIGNsb3NlIHRvIHRyYXkgYWN0aW9uXG4gICAgICAgIHZpZXdzdGF0ZS5jbG9zZXRvdHJheVxuICAgIClcblxuICAgIGlmIGhpZGVcbiAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlXG4gICAgICAgIHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkuaGlkZSgpXG4gICAgcmV0dXJuXG5cbmN1cnJlbnRXaW5kb3cud2ViQ29udGVudHMub24gJ2NvbnRleHQtbWVudScsIChlLCBwYXJhbXMpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY2FuU2hvdyA9IFt2aWV3c3RhdGUuU1RBVEVfTk9STUFMLFxuICAgICAgICAgICAgICAgdmlld3N0YXRlLlNUQVRFX0FERF9DT05WRVJTQVRJT05dLmluY2x1ZGVzKHZpZXdzdGF0ZS5zdGF0ZSlcbiAgICBpZiBjYW5TaG93XG4gICAgICAgIGNvbnRleHRtZW51KHBhcmFtcywgdmlld3N0YXRlKS5wb3B1cCByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG5cbiMgdGVsbCB0aGUgc3RhcnR1cCBzdGF0ZVxuYWN0aW9uICd3b25saW5lJywgd2luZG93Lm5hdmlnYXRvci5vbkxpbmVcbiJdfQ==
