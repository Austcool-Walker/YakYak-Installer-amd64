(function() {
  var about, applayout, connection, conninfo, controls, convadd, convhead, convlist, dockicon, input, later, listhead, menu, messages, models, notifications, redraw, remote, startup, throttle, trayicon, typinginfo, viewstate;

  remote = require('electron').remote;

  ({applayout, convlist, listhead, messages, convhead, input, conninfo, convadd, controls, notifications, typinginfo, menu, trayicon, dockicon, startup, about} = require('./index'));

  models = require('../models');

  ({viewstate, connection} = models);

  ({later} = require('../util'));

  //                                    _   _
  //                                   | | (_)
  //     ___ ___  _ __  _ __   ___  ___| |_ _  ___  _ __
  //    / __/ _ \| '_ \| '_ \ / _ \/ __| __| |/ _ \| '_ \
  //   | (_| (_) | | | | | | |  __/ (__| |_| | (_) | | | |
  //    \___\___/|_| |_|_| |_|\___|\___|\__|_|\___/|_| |_|

  handle('update:connection', (function() {
    var el;
    el = null;
    return function() {
      // draw view
      conninfo(connection);
      // place in layout
      if (connection.state === connection.CONNECTED) {
        later(function() {
          return action('lastActivity');
        });
        if (el != null) {
          if (typeof el.hide === "function") {
            el.hide();
          }
        }
        return el = null;
      } else if (viewstate.state !== viewstate.STATE_STARTUP) {
        return el = notr({
          html: conninfo.el.innerHTML,
          stay: 0,
          id: 'conn'
        });
      } else {
        // update startup with connection information
        return redraw();
      }
    };
  })());

  //          _                   _        _
  //         (_)                 | |      | |
  //   __   ___  _____      _____| |_ __ _| |_ ___
  //   \ \ / / |/ _ \ \ /\ / / __| __/ _` | __/ _ \
  //    \ V /| |  __/\ V  V /\__ \ || (_| | ||  __/
  //     \_/ |_|\___| \_/\_/ |___/\__\__,_|\__\___|

  handle('update:viewstate', function() {
    var height, i, len, maxH, maxW, maxX, maxY, ref, reposition, screen, setConvMin, setLeftSize, width, winSize, x, xWindowPos, y, yWindowPos;
    setLeftSize = function(left) {
      document.querySelector('.left').style.width = left + 'px';
      return document.querySelector('.leftresize').style.left = (left - 2) + 'px';
    };
    setConvMin = function(convmin) {
      if (convmin) {
        document.querySelector('.left').classList.add("minimal");
        return document.querySelector('.leftresize').classList.add("minimal");
      } else {
        document.querySelector('.left').classList.remove("minimal");
        return document.querySelector('.leftresize').classList.remove("minimal");
      }
    };
    setLeftSize(viewstate.leftSize);
    setConvMin(viewstate.showConvMin);
    // check what in what state is the app

    // STATE_STARTUP : still connecting
    // STATE_NORMAL  : conversation list on left with selected chat showing in main window
    // STATE_ABOUT   : conversation list on the left with about showing in main window
    // STATE_ADD_CONVERSATION : conversation list on the left and new / modify conversation on the main window
    if (viewstate.state === viewstate.STATE_STARTUP) {
      if (Array.isArray(viewstate.size)) {
        later(function() {
          return remote.getCurrentWindow().setSize(...viewstate.size);
        });
      }
      
      // It will not allow the window to be placed offscreen (fully or partial)

      // For that it needs to iterate on all screens and see if position is valid.
      //  If it is not valid, then it will approximate the best position possible
      if (Array.isArray(viewstate.pos)) {
        // uses max X and Y as a fallback method in case it can't be placed on any
        //  current display, by approximating a new position
        maxX = maxY = maxW = maxH = 0;
        reposition = false;
        // helper variable to determine valid coordinates to be used, initialized with
        //  desired coordinates
        xWindowPos = viewstate.pos[0];
        yWindowPos = viewstate.pos[1];
        // window size to be used in rounding the position, i.e. avoiding partial offscreen
        winSize = remote.getCurrentWindow().getSize();
        ref = remote.screen.getAllDisplays();
        // iterate on all displays to see if the desired position is valid
        for (i = 0, len = ref.length; i < len; i++) {
          screen = ref[i];
          // get bounds of each display
          ({width, height} = screen.workAreaSize);
          ({x, y} = screen.workArea);
          // see if this improves on maxY and maxX
          if (x + width > maxW) {
            maxX = x;
            maxW = x + width;
          }
          if (y + height > maxH) {
            maxY = y;
            maxH = y + height;
          }
          // check if window will be placed in this display
          if (xWindowPos >= x && xWindowPos < x + width && yWindowPos >= y && yWindowPos < y + height) {
            // if window will be partially placed outside of this display, then it will
            //  move it all inside the display

            // for X
            if (winSize[0] > width) {
              xWindowPos = x;
            } else if (xWindowPos > x + width - winSize[0] / 2) {
              xWindowPos = x + width - winSize[0] / 2;
            }
            // for Y
            if (winSize[1] > height) {
              yWindowPos = y;
            } else if (yWindowPos > y + width - winSize[1] / 2) {
              yWindowPos = y + width - winSize[1] / 2;
            }
            // making sure no negative positions on displays
            xWindowPos = Math.max(xWindowPos, x);
            yWindowPos = Math.max(yWindowPos, y);
            
            reposition = true; // coordinates have been calculated
            break; // break the loop
          }
        }
        if (!reposition) {
          if (xWindowPos > maxW) {
            xWindowPos = maxW - winSize[0];
          }
          if (yWindowPos > maxH) {
            yWindowPos = maxY;
          }
          xWindowPos = Math.max(xWindowPos, maxX);
          yWindowPos = Math.max(yWindowPos, maxY);
        }
        later(function() {
          return remote.getCurrentWindow().setPosition(xWindowPos, yWindowPos);
        });
      }
      // only render startup
      startup(models);
      applayout.left(null);
      applayout.convhead(null);
      applayout.main(null);
      applayout.maininfo(null);
      applayout.foot(null);
      applayout.last(startup);
      document.body.style.zoom = viewstate.zoom;
      return document.body.style.setProperty('--zoom', viewstate.zoom);
    } else if (viewstate.state === viewstate.STATE_NORMAL) {
      redraw();
      applayout.lfoot(controls);
      applayout.listhead(listhead);
      applayout.left(convlist);
      applayout.convhead(convhead);
      applayout.main(messages);
      applayout.maininfo(typinginfo);
      applayout.foot(input);
      applayout.last(null);
      menu(viewstate);
      dockicon(viewstate);
      return trayicon(models);
    } else if (viewstate.state === viewstate.STATE_ABOUT) {
      redraw();
      about(models);
      applayout.left(convlist);
      applayout.main(about);
      applayout.convhead(null);
      applayout.maininfo(null);
      return applayout.foot(null);
    } else if (viewstate.state === viewstate.STATE_ADD_CONVERSATION) {
      redraw();
      applayout.left(convlist);
      applayout.main(convadd);
      applayout.maininfo(null);
      applayout.foot(null);
      return later(function() {
        var search;
        search = document.querySelector('.search-input');
        return search.focus();
      });
    } else {
      return console.log('unknown viewstate.state', viewstate.state);
    }
  });

  //                 _
  //                | |
  //    _ __ ___  __| |_ __ __ ___      __
  //   | '__/ _ \/ _` | '__/ _` \ \ /\ / /
  //   | | |  __/ (_| | | | (_| |\ V  V /
  //   |_|  \___|\__,_|_|  \__,_| \_/\_/

  // simple redrawing all of yakyak UI
  redraw = function() {
    notifications(models);
    convhead(models);
    controls(models);
    convlist(models);
    listhead(models);
    messages(models);
    typinginfo(models);
    input(models);
    convadd(models);
    return startup(models);
  };

  throttle = function(fn, time = 10) {
    var throttled, timeout;
    timeout = false;
    // return a throttled version of fn
    // which executes on the trailing end of `time`
    return throttled = function() {
      if (timeout) {
        return;
      }
      return timeout = setTimeout(function() {
        fn();
        return timeout = false;
      }, time);
    };
  };

  redraw = throttle(redraw, 20);

  //               _   _ _
  //              | | (_) |
  //     ___ _ __ | |_ _| |_ _   _
  //    / _ \ '_ \| __| | __| | | |
  //   |  __/ | | | |_| | |_| |_| |
  //    \___|_| |_|\__|_|\__|\__, |
  //                          __/ |
  //                         |___/
  handle('update:entity', function() {
    return redraw();
  });

  
  //     ___ ___  _ ____   __
  //    / __/ _ \| '_ \ \ / /
  //   | (_| (_) | | | \ V /
  //    \___\___/|_| |_|\_/

  handle('update:conv', function() {
    return redraw();
  });

  //                                                 _
  //                                                | |
  //     ___ ___  _ ____   __   ___ ___  _   _ _ __ | |_
  //    / __/ _ \| '_ \ \ / /  / __/ _ \| | | | '_ \| __|
  //   | (_| (_) | | | \ V /  | (_| (_) | |_| | | | | |_
  //    \___\___/|_| |_|\_/    \___\___/ \__,_|_| |_|\__|

  handle('update:conv_count', function() {
    dockicon(viewstate);
    return trayicon(models);
  });

  //                            _              _              _   _ _   _
  //                           | |            | |            | | (_) | (_)
  //    ___  ___  __ _ _ __ ___| |__   ___  __| |   ___ _ __ | |_ _| |_ _  ___  ___
  //   / __|/ _ \/ _` | '__/ __| '_ \ / _ \/ _` |  / _ \ '_ \| __| | __| |/ _ \/ __|
  //   \__ \  __/ (_| | | | (__| | | |  __/ (_| | |  __/ | | | |_| | |_| |  __/\__ \
  //   |___/\___|\__,_|_|  \___|_| |_|\___|\__,_|  \___|_| |_|\__|_|\__|_|\___||___/

  handle('update:searchedentities', function() {
    return redraw();
  });

  //             _           _           _              _   _ _   _
  //            | |         | |         | |            | | (_) | (_)
  //    ___  ___| | ___  ___| |_ ___  __| |   ___ _ __ | |_ _| |_ _  ___  ___
  //   / __|/ _ \ |/ _ \/ __| __/ _ \/ _` |  / _ \ '_ \| __| | __| |/ _ \/ __|
  //   \__ \  __/ |  __/ (__| ||  __/ (_| | |  __/ | | | |_| | |_| |  __/\__ \
  //   |___/\___|_|\___|\___|\__\___|\__,_|  \___|_| |_|\__|_|\__|_|\___||___/

  handle('update:selectedEntities', function() {
    return redraw();
  });

  //                                    _   _   _
  //                                   | | | | (_)
  //     ___ ___  _ ____   __  ___  ___| |_| |_ _ _ __   __ _ ___
  //    / __/ _ \| '_ \ \ / / / __|/ _ \ __| __| | '_ \ / _` / __|
  //   | (_| (_) | | | \ V /  \__ \  __/ |_| |_| | | | | (_| \__ \
  //    \___\___/|_| |_|\_/   |___/\___|\__|\__|_|_| |_|\__, |___/
  //                                                     __/ |
  //                                                    |___/
  handle('update:convsettings', function() {
    return redraw();
  });

  //    _
  //   | |
  //   | | __ _ _ __   __ _ _   _  __ _  __ _  ___
  //   | |/ _` | '_ \ / _` | | | |/ _` |/ _` |/ _ \
  //   | | (_| | | | | (_| | |_| | (_| | (_| |  __/
  //   |_|\__,_|_| |_|\__, |\__,_|\__,_|\__, |\___|
  //                   __/ |             __/ |
  //                  |___/             |___/
  handle('update:language', function() {
    menu(viewstate);
    return redraw();
  });

  //                 _ _       _
  //                (_) |     | |
  //    _____      ___| |_ ___| |__     ___ ___  _ ____   __
  //   / __\ \ /\ / / | __/ __| '_ \   / __/ _ \| '_ \ \ / /
  //   \__ \\ V  V /| | || (__| | | | | (_| (_) | | | \ V /
  //   |___/ \_/\_/ |_|\__\___|_| |_|  \___\___/|_| |_|\_/

  handle('update:switchConv', function() {
    return messages.scrollToBottom();
  });

  //    _           __                 _     _     _
  //   | |         / _|               | |   (_)   | |
  //   | |__   ___| |_ ___  _ __ ___  | |__  _ ___| |_ ___  _ __ _   _
  //   | '_ \ / _ \  _/ _ \| '__/ _ \ | '_ \| / __| __/ _ \| '__| | | |
  //   | |_) |  __/ || (_) | | |  __/ | | | | \__ \ || (_) | |  | |_| |
  //   |_.__/ \___|_| \___/|_|  \___| |_| |_|_|___/\__\___/|_|   \__, |
  //                                                              __/ |
  //                                                             |___/
  handle('update:beforeHistory', function() {
    return applayout.recordMainPos();
  });

  //           __ _              _     _     _
  //          / _| |            | |   (_)   | |
  //     __ _| |_| |_ ___ _ __  | |__  _ ___| |_ ___  _ __ _   _
  //    / _` |  _| __/ _ \ '__| | '_ \| / __| __/ _ \| '__| | | |
  //   | (_| | | | ||  __/ |    | | | | \__ \ || (_) | |  | |_| |
  //    \__,_|_|  \__\___|_|    |_| |_|_|___/\__\___/|_|   \__, |
  //                                                        __/ |
  //                                                       |___/
  handle('update:afterHistory', function() {
    return applayout.adjustMainPos();
  });

  //    _           __                 _
  //   | |         / _|               (_)
  //   | |__   ___| |_ ___  _ __ ___   _ _ __ ___   __ _
  //   | '_ \ / _ \  _/ _ \| '__/ _ \ | | '_ ` _ \ / _` |
  //   | |_) |  __/ || (_) | | |  __/ | | | | | | | (_| |
  //   |_.__/ \___|_| \___/|_|  \___| |_|_| |_| |_|\__, |
  //                                                __/ |
  //                                               |___/
  handle('update:beforeImg', function() {
    return applayout.recordMainPos();
  });

  //           __ _              _
  //          / _| |            (_)
  //     __ _| |_| |_ ___ _ __   _ _ __ ___   __ _
  //    / _` |  _| __/ _ \ '__| | | '_ ` _ \ / _` |
  //   | (_| | | | ||  __/ |    | | | | | | | (_| |
  //    \__,_|_|  \__\___|_|    |_|_| |_| |_|\__, |
  //                                          __/ |
  //                                         |___/
  handle('update:afterImg', function() {
    if (viewstate.atbottom) {
      return messages.scrollToBottom();
    } else {
      return applayout.adjustMainPos();
    }
  });

  //        _             _     _               _
  //       | |           | |   | |             (_)
  //    ___| |_ __ _ _ __| |_  | |_ _   _ _ __  _ _ __   __ _
  //   / __| __/ _` | '__| __| | __| | | | '_ \| | '_ \ / _` |
  //   \__ \ || (_| | |  | |_  | |_| |_| | |_) | | | | | (_| |
  //   |___/\__\__,_|_|   \__|  \__|\__, | .__/|_|_| |_|\__, |
  //                                 __/ | |             __/ |
  //                                |___/|_|            |___/
  handle('update:startTyping', function() {
    if (viewstate.atbottom) {
      return messages.scrollToBottom();
    }
  });

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29udHJvbGxlci5qcyIsInNvdXJjZXMiOlsidWkvdmlld3MvY29udHJvbGxlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLEtBQUEsRUFBQSxTQUFBLEVBQUEsVUFBQSxFQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLElBQUEsRUFBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxRQUFBLEVBQUEsUUFBQSxFQUFBLFVBQUEsRUFBQTs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFFN0IsQ0FBQSxDQUNFLFNBREYsRUFDYSxRQURiLEVBQ3VCLFFBRHZCLEVBQ2lDLFFBRGpDLEVBQzJDLFFBRDNDLEVBQ3FELEtBRHJELEVBQzRELFFBRDVELEVBRUUsT0FGRixFQUVXLFFBRlgsRUFFcUIsYUFGckIsRUFFb0MsVUFGcEMsRUFFZ0QsSUFGaEQsRUFFc0QsUUFGdEQsRUFFZ0UsUUFGaEUsRUFHRSxPQUhGLEVBR1csS0FIWCxDQUFBLEdBSUksT0FBQSxDQUFRLFNBQVIsQ0FKSjs7RUFNQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFdBQVI7O0VBRVQsQ0FBQSxDQUFFLFNBQUYsRUFBYSxVQUFiLENBQUEsR0FBNEIsTUFBNUI7O0VBRUEsQ0FBQSxDQUFFLEtBQUYsQ0FBQSxHQUFZLE9BQUEsQ0FBUSxTQUFSLENBQVosRUFaQTs7Ozs7Ozs7O0VBc0JBLE1BQUEsQ0FBTyxtQkFBUCxFQUErQixDQUFBLFFBQUEsQ0FBQSxDQUFBO0FBQy9CLFFBQUE7SUFBSSxFQUFBLEdBQUs7V0FDTCxRQUFBLENBQUEsQ0FBQSxFQUFBOztNQUVJLFFBQUEsQ0FBUyxVQUFULEVBRFI7O01BSVEsSUFBRyxVQUFVLENBQUMsS0FBWCxLQUFvQixVQUFVLENBQUMsU0FBbEM7UUFDSSxLQUFBLENBQU0sUUFBQSxDQUFBLENBQUE7aUJBQUcsTUFBQSxDQUFPLGNBQVA7UUFBSCxDQUFOOzs7WUFDQSxFQUFFLENBQUU7OztlQUNKLEVBQUEsR0FBSyxLQUhUO09BQUEsTUFJSyxJQUFHLFNBQVMsQ0FBQyxLQUFWLEtBQW1CLFNBQVMsQ0FBQyxhQUFoQztlQUNELEVBQUEsR0FBSyxJQUFBLENBQUs7VUFBQyxJQUFBLEVBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFsQjtVQUE2QixJQUFBLEVBQUssQ0FBbEM7VUFBcUMsRUFBQSxFQUFHO1FBQXhDLENBQUwsRUFESjtPQUFBLE1BQUE7O2VBSUQsTUFBQSxDQUFBLEVBSkM7O0lBVFQ7RUFGMkIsQ0FBQSxHQUEvQixFQXRCQTs7Ozs7Ozs7O0VBK0NBLE1BQUEsQ0FBTyxrQkFBUCxFQUEyQixRQUFBLENBQUEsQ0FBQTtBQUUzQixRQUFBLE1BQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsQ0FBQSxFQUFBLFVBQUEsRUFBQSxDQUFBLEVBQUE7SUFBSSxXQUFBLEdBQWMsUUFBQSxDQUFDLElBQUQsQ0FBQTtNQUNWLFFBQVEsQ0FBQyxhQUFULENBQXVCLE9BQXZCLENBQStCLENBQUMsS0FBSyxDQUFDLEtBQXRDLEdBQThDLElBQUEsR0FBTzthQUNyRCxRQUFRLENBQUMsYUFBVCxDQUF1QixhQUF2QixDQUFxQyxDQUFDLEtBQUssQ0FBQyxJQUE1QyxHQUFtRCxDQUFDLElBQUEsR0FBTyxDQUFSLENBQUEsR0FBYTtJQUZ0RDtJQUlkLFVBQUEsR0FBYSxRQUFBLENBQUMsT0FBRCxDQUFBO01BQ1QsSUFBRyxPQUFIO1FBQ0ksUUFBUSxDQUFDLGFBQVQsQ0FBdUIsT0FBdkIsQ0FBK0IsQ0FBQyxTQUFTLENBQUMsR0FBMUMsQ0FBOEMsU0FBOUM7ZUFDQSxRQUFRLENBQUMsYUFBVCxDQUF1QixhQUF2QixDQUFxQyxDQUFDLFNBQVMsQ0FBQyxHQUFoRCxDQUFvRCxTQUFwRCxFQUZKO09BQUEsTUFBQTtRQUlJLFFBQVEsQ0FBQyxhQUFULENBQXVCLE9BQXZCLENBQStCLENBQUMsU0FBUyxDQUFDLE1BQTFDLENBQWlELFNBQWpEO2VBQ0EsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsYUFBdkIsQ0FBcUMsQ0FBQyxTQUFTLENBQUMsTUFBaEQsQ0FBdUQsU0FBdkQsRUFMSjs7SUFEUztJQVFiLFdBQUEsQ0FBWSxTQUFTLENBQUMsUUFBdEI7SUFDQSxVQUFBLENBQVcsU0FBUyxDQUFDLFdBQXJCLEVBYko7Ozs7Ozs7SUFxQkksSUFBRyxTQUFTLENBQUMsS0FBVixLQUFtQixTQUFTLENBQUMsYUFBaEM7TUFDSSxJQUFHLEtBQUssQ0FBQyxPQUFOLENBQWMsU0FBUyxDQUFDLElBQXhCLENBQUg7UUFDSSxLQUFBLENBQU0sUUFBQSxDQUFBLENBQUE7aUJBQUcsTUFBTSxDQUFDLGdCQUFQLENBQUEsQ0FBeUIsQ0FBQyxPQUExQixDQUFrQyxHQUFBLFNBQVMsQ0FBQyxJQUE1QztRQUFILENBQU4sRUFESjtPQUFSOzs7Ozs7TUFRUSxJQUFHLEtBQUssQ0FBQyxPQUFOLENBQWMsU0FBUyxDQUFDLEdBQXhCLENBQUg7OztRQUdJLElBQUEsR0FBTyxJQUFBLEdBQU8sSUFBQSxHQUFPLElBQUEsR0FBTztRQUM1QixVQUFBLEdBQWEsTUFIekI7OztRQU1ZLFVBQUEsR0FBYSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUQ7UUFDMUIsVUFBQSxHQUFhLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBRCxFQVB0Qzs7UUFTWSxPQUFBLEdBQVUsTUFBTSxDQUFDLGdCQUFQLENBQUEsQ0FBeUIsQ0FBQyxPQUExQixDQUFBO0FBRVY7O1FBQUEsS0FBQSxxQ0FBQTswQkFBQTs7VUFFSSxDQUFBLENBQUMsS0FBRCxFQUFRLE1BQVIsQ0FBQSxHQUFrQixNQUFNLENBQUMsWUFBekI7VUFDQSxDQUFBLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBQSxHQUFTLE1BQU0sQ0FBQyxRQUFoQixFQUZoQjs7VUFLZ0IsSUFBRyxDQUFBLEdBQUksS0FBSixHQUFZLElBQWY7WUFDSSxJQUFBLEdBQU87WUFDUCxJQUFBLEdBQU8sQ0FBQSxHQUFJLE1BRmY7O1VBR0EsSUFBRyxDQUFBLEdBQUksTUFBSixHQUFhLElBQWhCO1lBQ0ksSUFBQSxHQUFPO1lBQ1AsSUFBQSxHQUFPLENBQUEsR0FBSSxPQUZmO1dBUmhCOztVQWNnQixJQUFHLFVBQUEsSUFBYyxDQUFkLElBQW9CLFVBQUEsR0FBYSxDQUFBLEdBQUksS0FBckMsSUFBK0MsVUFBQSxJQUFjLENBQTdELElBQW1FLFVBQUEsR0FBYSxDQUFBLEdBQUksTUFBdkY7Ozs7O1lBS0ksSUFBRyxPQUFPLENBQUMsQ0FBRCxDQUFQLEdBQWEsS0FBaEI7Y0FDSSxVQUFBLEdBQWEsRUFEakI7YUFBQSxNQUVLLElBQUcsVUFBQSxHQUFhLENBQUEsR0FBSSxLQUFKLEdBQVksT0FBTyxDQUFDLENBQUQsQ0FBUCxHQUFhLENBQXpDO2NBQ0QsVUFBQSxHQUFhLENBQUEsR0FBSSxLQUFKLEdBQVksT0FBTyxDQUFDLENBQUQsQ0FBUCxHQUFhLEVBRHJDO2FBTnpCOztZQVVvQixJQUFHLE9BQU8sQ0FBQyxDQUFELENBQVAsR0FBYSxNQUFoQjtjQUNJLFVBQUEsR0FBYSxFQURqQjthQUFBLE1BRUssSUFBRyxVQUFBLEdBQWEsQ0FBQSxHQUFJLEtBQUosR0FBWSxPQUFPLENBQUMsQ0FBRCxDQUFQLEdBQWEsQ0FBekM7Y0FDRCxVQUFBLEdBQWEsQ0FBQSxHQUFJLEtBQUosR0FBWSxPQUFPLENBQUMsQ0FBRCxDQUFQLEdBQWEsRUFEckM7YUFaekI7O1lBZW9CLFVBQUEsR0FBYSxJQUFJLENBQUMsR0FBTCxDQUFTLFVBQVQsRUFBcUIsQ0FBckI7WUFDYixVQUFBLEdBQWEsSUFBSSxDQUFDLEdBQUwsQ0FBUyxVQUFULEVBQXFCLENBQXJCOztZQUViLFVBQUEsR0FBYSxLQWxCakM7QUFtQm9CLGtCQXBCSjs7UUFmSjtRQW9DQSxJQUFHLENBQUksVUFBUDtVQUNJLElBQWtDLFVBQUEsR0FBYSxJQUEvQztZQUFBLFVBQUEsR0FBYSxJQUFBLEdBQU8sT0FBTyxDQUFDLENBQUQsRUFBM0I7O1VBQ0EsSUFBcUIsVUFBQSxHQUFhLElBQWxDO1lBQUEsVUFBQSxHQUFhLEtBQWI7O1VBQ0EsVUFBQSxHQUFhLElBQUksQ0FBQyxHQUFMLENBQVMsVUFBVCxFQUFxQixJQUFyQjtVQUNiLFVBQUEsR0FBYSxJQUFJLENBQUMsR0FBTCxDQUFTLFVBQVQsRUFBcUIsSUFBckIsRUFKakI7O1FBS0EsS0FBQSxDQUFNLFFBQUEsQ0FBQSxDQUFBO2lCQUFHLE1BQU0sQ0FBQyxnQkFBUCxDQUFBLENBQXlCLENBQUMsV0FBMUIsQ0FBc0MsVUFBdEMsRUFBa0QsVUFBbEQ7UUFBSCxDQUFOLEVBckRKO09BUlI7O01BK0RRLE9BQUEsQ0FBUSxNQUFSO01BRUEsU0FBUyxDQUFDLElBQVYsQ0FBZSxJQUFmO01BQ0EsU0FBUyxDQUFDLFFBQVYsQ0FBbUIsSUFBbkI7TUFDQSxTQUFTLENBQUMsSUFBVixDQUFlLElBQWY7TUFDQSxTQUFTLENBQUMsUUFBVixDQUFtQixJQUFuQjtNQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsSUFBZjtNQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsT0FBZjtNQUVBLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQXBCLEdBQTJCLFNBQVMsQ0FBQzthQUNyQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFwQixDQUFnQyxRQUFoQyxFQUEwQyxTQUFTLENBQUMsSUFBcEQsRUExRUo7S0FBQSxNQTJFSyxJQUFHLFNBQVMsQ0FBQyxLQUFWLEtBQW1CLFNBQVMsQ0FBQyxZQUFoQztNQUNELE1BQUEsQ0FBQTtNQUNBLFNBQVMsQ0FBQyxLQUFWLENBQWdCLFFBQWhCO01BQ0EsU0FBUyxDQUFDLFFBQVYsQ0FBbUIsUUFBbkI7TUFDQSxTQUFTLENBQUMsSUFBVixDQUFlLFFBQWY7TUFDQSxTQUFTLENBQUMsUUFBVixDQUFtQixRQUFuQjtNQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsUUFBZjtNQUNBLFNBQVMsQ0FBQyxRQUFWLENBQW1CLFVBQW5CO01BQ0EsU0FBUyxDQUFDLElBQVYsQ0FBZSxLQUFmO01BRUEsU0FBUyxDQUFDLElBQVYsQ0FBZSxJQUFmO01BRUEsSUFBQSxDQUFLLFNBQUw7TUFDQSxRQUFBLENBQVMsU0FBVDthQUNBLFFBQUEsQ0FBUyxNQUFULEVBZEM7S0FBQSxNQWdCQSxJQUFHLFNBQVMsQ0FBQyxLQUFWLEtBQW1CLFNBQVMsQ0FBQyxXQUFoQztNQUNELE1BQUEsQ0FBQTtNQUNBLEtBQUEsQ0FBTSxNQUFOO01BQ0EsU0FBUyxDQUFDLElBQVYsQ0FBZSxRQUFmO01BQ0EsU0FBUyxDQUFDLElBQVYsQ0FBZSxLQUFmO01BQ0EsU0FBUyxDQUFDLFFBQVYsQ0FBbUIsSUFBbkI7TUFDQSxTQUFTLENBQUMsUUFBVixDQUFtQixJQUFuQjthQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsSUFBZixFQVBDO0tBQUEsTUFRQSxJQUFHLFNBQVMsQ0FBQyxLQUFWLEtBQW1CLFNBQVMsQ0FBQyxzQkFBaEM7TUFDRCxNQUFBLENBQUE7TUFDQSxTQUFTLENBQUMsSUFBVixDQUFlLFFBQWY7TUFDQSxTQUFTLENBQUMsSUFBVixDQUFlLE9BQWY7TUFDQSxTQUFTLENBQUMsUUFBVixDQUFtQixJQUFuQjtNQUNBLFNBQVMsQ0FBQyxJQUFWLENBQWUsSUFBZjthQUNBLEtBQUEsQ0FBTSxRQUFBLENBQUEsQ0FBQTtBQUNkLFlBQUE7UUFBWSxNQUFBLEdBQVMsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsZUFBdkI7ZUFDVCxNQUFNLENBQUMsS0FBUCxDQUFBO01BRkUsQ0FBTixFQU5DO0tBQUEsTUFBQTthQVVELE9BQU8sQ0FBQyxHQUFSLENBQVkseUJBQVosRUFBdUMsU0FBUyxDQUFDLEtBQWpELEVBVkM7O0VBMUhrQixDQUEzQixFQS9DQTs7Ozs7Ozs7OztFQTZMQSxNQUFBLEdBQVMsUUFBQSxDQUFBLENBQUE7SUFDTCxhQUFBLENBQWMsTUFBZDtJQUNBLFFBQUEsQ0FBUyxNQUFUO0lBQ0EsUUFBQSxDQUFTLE1BQVQ7SUFDQSxRQUFBLENBQVMsTUFBVDtJQUNBLFFBQUEsQ0FBUyxNQUFUO0lBQ0EsUUFBQSxDQUFTLE1BQVQ7SUFDQSxVQUFBLENBQVcsTUFBWDtJQUNBLEtBQUEsQ0FBTSxNQUFOO0lBQ0EsT0FBQSxDQUFRLE1BQVI7V0FDQSxPQUFBLENBQVEsTUFBUjtFQVZLOztFQVlULFFBQUEsR0FBVyxRQUFBLENBQUMsRUFBRCxFQUFLLE9BQUssRUFBVixDQUFBO0FBQ1gsUUFBQSxTQUFBLEVBQUE7SUFBSSxPQUFBLEdBQVUsTUFBZDs7O1dBR0ksU0FBQSxHQUFZLFFBQUEsQ0FBQSxDQUFBO01BQ1IsSUFBVSxPQUFWO0FBQUEsZUFBQTs7YUFDQSxPQUFBLEdBQVUsVUFBQSxDQUFXLFFBQUEsQ0FBQSxDQUFBO1FBQ2pCLEVBQUEsQ0FBQTtlQUNBLE9BQUEsR0FBVTtNQUZPLENBQVgsRUFJTixJQUpNO0lBRkY7RUFKTDs7RUFZWCxNQUFBLEdBQVMsUUFBQSxDQUFTLE1BQVQsRUFBaUIsRUFBakIsRUFyTlQ7Ozs7Ozs7Ozs7RUErTkEsTUFBQSxDQUFPLGVBQVAsRUFBd0IsUUFBQSxDQUFBLENBQUE7V0FBRyxNQUFBLENBQUE7RUFBSCxDQUF4QixFQS9OQTs7Ozs7Ozs7RUF5T0EsTUFBQSxDQUFPLGFBQVAsRUFBc0IsUUFBQSxDQUFBLENBQUE7V0FBRyxNQUFBLENBQUE7RUFBSCxDQUF0QixFQXpPQTs7Ozs7Ozs7O0VBbVBBLE1BQUEsQ0FBTyxtQkFBUCxFQUE0QixRQUFBLENBQUEsQ0FBQTtJQUN4QixRQUFBLENBQVMsU0FBVDtXQUNBLFFBQUEsQ0FBUyxNQUFUO0VBRndCLENBQTVCLEVBblBBOzs7Ozs7Ozs7RUErUEEsTUFBQSxDQUFPLHlCQUFQLEVBQWtDLFFBQUEsQ0FBQSxDQUFBO1dBQUcsTUFBQSxDQUFBO0VBQUgsQ0FBbEMsRUEvUEE7Ozs7Ozs7OztFQXlRQSxNQUFBLENBQU8seUJBQVAsRUFBa0MsUUFBQSxDQUFBLENBQUE7V0FBRyxNQUFBLENBQUE7RUFBSCxDQUFsQyxFQXpRQTs7Ozs7Ozs7OztFQW1SQSxNQUFBLENBQU8scUJBQVAsRUFBOEIsUUFBQSxDQUFBLENBQUE7V0FBRyxNQUFBLENBQUE7RUFBSCxDQUE5QixFQW5SQTs7Ozs7Ozs7OztFQTZSQSxNQUFBLENBQU8saUJBQVAsRUFBMEIsUUFBQSxDQUFBLENBQUE7SUFDdEIsSUFBQSxDQUFLLFNBQUw7V0FDQSxNQUFBLENBQUE7RUFGc0IsQ0FBMUIsRUE3UkE7Ozs7Ozs7OztFQXlTQSxNQUFBLENBQU8sbUJBQVAsRUFBNEIsUUFBQSxDQUFBLENBQUE7V0FBRyxRQUFRLENBQUMsY0FBVCxDQUFBO0VBQUgsQ0FBNUIsRUF6U0E7Ozs7Ozs7Ozs7RUFtVEEsTUFBQSxDQUFPLHNCQUFQLEVBQStCLFFBQUEsQ0FBQSxDQUFBO1dBQUcsU0FBUyxDQUFDLGFBQVYsQ0FBQTtFQUFILENBQS9CLEVBblRBOzs7Ozs7Ozs7O0VBNlRBLE1BQUEsQ0FBTyxxQkFBUCxFQUE4QixRQUFBLENBQUEsQ0FBQTtXQUFHLFNBQVMsQ0FBQyxhQUFWLENBQUE7RUFBSCxDQUE5QixFQTdUQTs7Ozs7Ozs7OztFQXVVQSxNQUFBLENBQU8sa0JBQVAsRUFBMkIsUUFBQSxDQUFBLENBQUE7V0FBRyxTQUFTLENBQUMsYUFBVixDQUFBO0VBQUgsQ0FBM0IsRUF2VUE7Ozs7Ozs7Ozs7RUFpVkEsTUFBQSxDQUFPLGlCQUFQLEVBQTBCLFFBQUEsQ0FBQSxDQUFBO0lBQ3RCLElBQUcsU0FBUyxDQUFDLFFBQWI7YUFDSSxRQUFRLENBQUMsY0FBVCxDQUFBLEVBREo7S0FBQSxNQUFBO2FBR0ksU0FBUyxDQUFDLGFBQVYsQ0FBQSxFQUhKOztFQURzQixDQUExQixFQWpWQTs7Ozs7Ozs7OztFQStWQSxNQUFBLENBQU8sb0JBQVAsRUFBNkIsUUFBQSxDQUFBLENBQUE7SUFDekIsSUFBRyxTQUFTLENBQUMsUUFBYjthQUNJLFFBQVEsQ0FBQyxjQUFULENBQUEsRUFESjs7RUFEeUIsQ0FBN0I7QUEvVkEiLCJzb3VyY2VzQ29udGVudCI6WyJyZW1vdGUgPSByZXF1aXJlKCdlbGVjdHJvbicpLnJlbW90ZVxuXG57XG4gIGFwcGxheW91dCwgY29udmxpc3QsIGxpc3RoZWFkLCBtZXNzYWdlcywgY29udmhlYWQsIGlucHV0LCBjb25uaW5mbyxcbiAgY29udmFkZCwgY29udHJvbHMsIG5vdGlmaWNhdGlvbnMsIHR5cGluZ2luZm8sIG1lbnUsIHRyYXlpY29uLCBkb2NraWNvbixcbiAgc3RhcnR1cCwgYWJvdXRcbn0gPSByZXF1aXJlICcuL2luZGV4J1xuXG5tb2RlbHMgPSByZXF1aXJlICcuLi9tb2RlbHMnXG5cbnsgdmlld3N0YXRlLCBjb25uZWN0aW9uIH0gPSBtb2RlbHNcblxueyBsYXRlciB9ID0gcmVxdWlyZSAnLi4vdXRpbCdcblxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8gICBfXG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8IHwgKF8pXG4jICAgICBfX18gX19fICBfIF9fICBfIF9fICAgX19fICBfX198IHxfIF8gIF9fXyAgXyBfX1xuIyAgICAvIF9fLyBfIFxcfCAnXyBcXHwgJ18gXFwgLyBfIFxcLyBfX3wgX198IHwvIF8gXFx8ICdfIFxcXG4jICAgfCAoX3wgKF8pIHwgfCB8IHwgfCB8IHwgIF9fLyAoX198IHxffCB8IChfKSB8IHwgfCB8XG4jICAgIFxcX19fXFxfX18vfF98IHxffF98IHxffFxcX19ffFxcX19ffFxcX198X3xcXF9fXy98X3wgfF98XG4jXG4jXG5oYW5kbGUgJ3VwZGF0ZTpjb25uZWN0aW9uJywgZG8gLT5cbiAgICBlbCA9IG51bGxcbiAgICAtPlxuICAgICAgICAjIGRyYXcgdmlld1xuICAgICAgICBjb25uaW5mbyBjb25uZWN0aW9uXG5cbiAgICAgICAgIyBwbGFjZSBpbiBsYXlvdXRcbiAgICAgICAgaWYgY29ubmVjdGlvbi5zdGF0ZSA9PSBjb25uZWN0aW9uLkNPTk5FQ1RFRFxuICAgICAgICAgICAgbGF0ZXIgLT4gYWN0aW9uICdsYXN0QWN0aXZpdHknXG4gICAgICAgICAgICBlbD8uaGlkZT8oKVxuICAgICAgICAgICAgZWwgPSBudWxsXG4gICAgICAgIGVsc2UgaWYgdmlld3N0YXRlLnN0YXRlICE9IHZpZXdzdGF0ZS5TVEFURV9TVEFSVFVQXG4gICAgICAgICAgICBlbCA9IG5vdHIge2h0bWw6Y29ubmluZm8uZWwuaW5uZXJIVE1MLCBzdGF5OjAsIGlkOidjb25uJ31cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgIyB1cGRhdGUgc3RhcnR1cCB3aXRoIGNvbm5lY3Rpb24gaW5mb3JtYXRpb25cbiAgICAgICAgICAgIHJlZHJhdygpXG5cbiMgICAgICAgICAgXyAgICAgICAgICAgICAgICAgICBfICAgICAgICBfXG4jICAgICAgICAgKF8pICAgICAgICAgICAgICAgICB8IHwgICAgICB8IHxcbiMgICBfXyAgIF9fXyAgX19fX18gICAgICBfX19fX3wgfF8gX18gX3wgfF8gX19fXG4jICAgXFwgXFwgLyAvIHwvIF8gXFwgXFwgL1xcIC8gLyBfX3wgX18vIF9gIHwgX18vIF8gXFxcbiMgICAgXFwgViAvfCB8ICBfXy9cXCBWICBWIC9cXF9fIFxcIHx8IChffCB8IHx8ICBfXy9cbiMgICAgIFxcXy8gfF98XFxfX198IFxcXy9cXF8vIHxfX18vXFxfX1xcX18sX3xcXF9fXFxfX198XG4jXG4jXG5oYW5kbGUgJ3VwZGF0ZTp2aWV3c3RhdGUnLCAtPlxuXG4gICAgc2V0TGVmdFNpemUgPSAobGVmdCkgLT5cbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxlZnQnKS5zdHlsZS53aWR0aCA9IGxlZnQgKyAncHgnXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5sZWZ0cmVzaXplJykuc3R5bGUubGVmdCA9IChsZWZ0IC0gMikgKyAncHgnXG5cbiAgICBzZXRDb252TWluID0gKGNvbnZtaW4pIC0+XG4gICAgICAgIGlmIGNvbnZtaW5cbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5sZWZ0JykuY2xhc3NMaXN0LmFkZChcIm1pbmltYWxcIilcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5sZWZ0cmVzaXplJykuY2xhc3NMaXN0LmFkZChcIm1pbmltYWxcIilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxlZnQnKS5jbGFzc0xpc3QucmVtb3ZlKFwibWluaW1hbFwiKVxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmxlZnRyZXNpemUnKS5jbGFzc0xpc3QucmVtb3ZlKFwibWluaW1hbFwiKVxuXG4gICAgc2V0TGVmdFNpemUgdmlld3N0YXRlLmxlZnRTaXplXG4gICAgc2V0Q29udk1pbiB2aWV3c3RhdGUuc2hvd0NvbnZNaW5cblxuICAgICMgY2hlY2sgd2hhdCBpbiB3aGF0IHN0YXRlIGlzIHRoZSBhcHBcbiAgICAjXG4gICAgIyBTVEFURV9TVEFSVFVQIDogc3RpbGwgY29ubmVjdGluZ1xuICAgICMgU1RBVEVfTk9STUFMICA6IGNvbnZlcnNhdGlvbiBsaXN0IG9uIGxlZnQgd2l0aCBzZWxlY3RlZCBjaGF0IHNob3dpbmcgaW4gbWFpbiB3aW5kb3dcbiAgICAjIFNUQVRFX0FCT1VUICAgOiBjb252ZXJzYXRpb24gbGlzdCBvbiB0aGUgbGVmdCB3aXRoIGFib3V0IHNob3dpbmcgaW4gbWFpbiB3aW5kb3dcbiAgICAjIFNUQVRFX0FERF9DT05WRVJTQVRJT04gOiBjb252ZXJzYXRpb24gbGlzdCBvbiB0aGUgbGVmdCBhbmQgbmV3IC8gbW9kaWZ5IGNvbnZlcnNhdGlvbiBvbiB0aGUgbWFpbiB3aW5kb3dcbiAgICBpZiB2aWV3c3RhdGUuc3RhdGUgPT0gdmlld3N0YXRlLlNUQVRFX1NUQVJUVVBcbiAgICAgICAgaWYgQXJyYXkuaXNBcnJheSB2aWV3c3RhdGUuc2l6ZVxuICAgICAgICAgICAgbGF0ZXIgLT4gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5zZXRTaXplIHZpZXdzdGF0ZS5zaXplLi4uXG4gICAgICAgICNcbiAgICAgICAgI1xuICAgICAgICAjIEl0IHdpbGwgbm90IGFsbG93IHRoZSB3aW5kb3cgdG8gYmUgcGxhY2VkIG9mZnNjcmVlbiAoZnVsbHkgb3IgcGFydGlhbClcbiAgICAgICAgI1xuICAgICAgICAjIEZvciB0aGF0IGl0IG5lZWRzIHRvIGl0ZXJhdGUgb24gYWxsIHNjcmVlbnMgYW5kIHNlZSBpZiBwb3NpdGlvbiBpcyB2YWxpZC5cbiAgICAgICAgIyAgSWYgaXQgaXMgbm90IHZhbGlkLCB0aGVuIGl0IHdpbGwgYXBwcm94aW1hdGUgdGhlIGJlc3QgcG9zaXRpb24gcG9zc2libGVcbiAgICAgICAgaWYgQXJyYXkuaXNBcnJheSB2aWV3c3RhdGUucG9zXG4gICAgICAgICAgICAjIHVzZXMgbWF4IFggYW5kIFkgYXMgYSBmYWxsYmFjayBtZXRob2QgaW4gY2FzZSBpdCBjYW4ndCBiZSBwbGFjZWQgb24gYW55XG4gICAgICAgICAgICAjICBjdXJyZW50IGRpc3BsYXksIGJ5IGFwcHJveGltYXRpbmcgYSBuZXcgcG9zaXRpb25cbiAgICAgICAgICAgIG1heFggPSBtYXhZID0gbWF4VyA9IG1heEggPSAwXG4gICAgICAgICAgICByZXBvc2l0aW9uID0gZmFsc2VcbiAgICAgICAgICAgICMgaGVscGVyIHZhcmlhYmxlIHRvIGRldGVybWluZSB2YWxpZCBjb29yZGluYXRlcyB0byBiZSB1c2VkLCBpbml0aWFsaXplZCB3aXRoXG4gICAgICAgICAgICAjICBkZXNpcmVkIGNvb3JkaW5hdGVzXG4gICAgICAgICAgICB4V2luZG93UG9zID0gdmlld3N0YXRlLnBvc1swXVxuICAgICAgICAgICAgeVdpbmRvd1BvcyA9IHZpZXdzdGF0ZS5wb3NbMV1cbiAgICAgICAgICAgICMgd2luZG93IHNpemUgdG8gYmUgdXNlZCBpbiByb3VuZGluZyB0aGUgcG9zaXRpb24sIGkuZS4gYXZvaWRpbmcgcGFydGlhbCBvZmZzY3JlZW5cbiAgICAgICAgICAgIHdpblNpemUgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLmdldFNpemUoKVxuICAgICAgICAgICAgIyBpdGVyYXRlIG9uIGFsbCBkaXNwbGF5cyB0byBzZWUgaWYgdGhlIGRlc2lyZWQgcG9zaXRpb24gaXMgdmFsaWRcbiAgICAgICAgICAgIGZvciBzY3JlZW4gaW4gcmVtb3RlLnNjcmVlbi5nZXRBbGxEaXNwbGF5cygpXG4gICAgICAgICAgICAgICAgIyBnZXQgYm91bmRzIG9mIGVhY2ggZGlzcGxheVxuICAgICAgICAgICAgICAgIHt3aWR0aCwgaGVpZ2h0fSA9IHNjcmVlbi53b3JrQXJlYVNpemVcbiAgICAgICAgICAgICAgICB7eCwgeX0gPSBzY3JlZW4ud29ya0FyZWFcblxuICAgICAgICAgICAgICAgICMgc2VlIGlmIHRoaXMgaW1wcm92ZXMgb24gbWF4WSBhbmQgbWF4WFxuICAgICAgICAgICAgICAgIGlmIHggKyB3aWR0aCA+IG1heFdcbiAgICAgICAgICAgICAgICAgICAgbWF4WCA9IHhcbiAgICAgICAgICAgICAgICAgICAgbWF4VyA9IHggKyB3aWR0aFxuICAgICAgICAgICAgICAgIGlmIHkgKyBoZWlnaHQgPiBtYXhIXG4gICAgICAgICAgICAgICAgICAgIG1heFkgPSB5XG4gICAgICAgICAgICAgICAgICAgIG1heEggPSB5ICsgaGVpZ2h0XG5cblxuICAgICAgICAgICAgICAgICMgY2hlY2sgaWYgd2luZG93IHdpbGwgYmUgcGxhY2VkIGluIHRoaXMgZGlzcGxheVxuICAgICAgICAgICAgICAgIGlmIHhXaW5kb3dQb3MgPj0geCBhbmQgeFdpbmRvd1BvcyA8IHggKyB3aWR0aCBhbmQgeVdpbmRvd1BvcyA+PSB5IGFuZCB5V2luZG93UG9zIDwgeSArIGhlaWdodFxuICAgICAgICAgICAgICAgICAgICAjIGlmIHdpbmRvdyB3aWxsIGJlIHBhcnRpYWxseSBwbGFjZWQgb3V0c2lkZSBvZiB0aGlzIGRpc3BsYXksIHRoZW4gaXQgd2lsbFxuICAgICAgICAgICAgICAgICAgICAjICBtb3ZlIGl0IGFsbCBpbnNpZGUgdGhlIGRpc3BsYXlcblxuICAgICAgICAgICAgICAgICAgICAjIGZvciBYXG4gICAgICAgICAgICAgICAgICAgIGlmIHdpblNpemVbMF0gPiB3aWR0aFxuICAgICAgICAgICAgICAgICAgICAgICAgeFdpbmRvd1BvcyA9IHhcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiB4V2luZG93UG9zID4geCArIHdpZHRoIC0gd2luU2l6ZVswXSAvIDJcbiAgICAgICAgICAgICAgICAgICAgICAgIHhXaW5kb3dQb3MgPSB4ICsgd2lkdGggLSB3aW5TaXplWzBdIC8gMlxuXG4gICAgICAgICAgICAgICAgICAgICMgZm9yIFlcbiAgICAgICAgICAgICAgICAgICAgaWYgd2luU2l6ZVsxXSA+IGhlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgeVdpbmRvd1BvcyA9IHlcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiB5V2luZG93UG9zID4geSArIHdpZHRoIC0gd2luU2l6ZVsxXSAvIDJcbiAgICAgICAgICAgICAgICAgICAgICAgIHlXaW5kb3dQb3MgPSB5ICsgd2lkdGggLSB3aW5TaXplWzFdIC8gMlxuICAgICAgICAgICAgICAgICAgICAjIG1ha2luZyBzdXJlIG5vIG5lZ2F0aXZlIHBvc2l0aW9ucyBvbiBkaXNwbGF5c1xuICAgICAgICAgICAgICAgICAgICB4V2luZG93UG9zID0gTWF0aC5tYXgoeFdpbmRvd1BvcywgeClcbiAgICAgICAgICAgICAgICAgICAgeVdpbmRvd1BvcyA9IE1hdGgubWF4KHlXaW5kb3dQb3MsIHkpXG4gICAgICAgICAgICAgICAgICAgICNcbiAgICAgICAgICAgICAgICAgICAgcmVwb3NpdGlvbiA9IHRydWUgIyBjb29yZGluYXRlcyBoYXZlIGJlZW4gY2FsY3VsYXRlZFxuICAgICAgICAgICAgICAgICAgICBicmVhayAjIGJyZWFrIHRoZSBsb29wXG4gICAgICAgICAgICBpZiBub3QgcmVwb3NpdGlvblxuICAgICAgICAgICAgICAgIHhXaW5kb3dQb3MgPSBtYXhXIC0gd2luU2l6ZVswXSBpZiB4V2luZG93UG9zID4gbWF4V1xuICAgICAgICAgICAgICAgIHlXaW5kb3dQb3MgPSBtYXhZIGlmIHlXaW5kb3dQb3MgPiBtYXhIXG4gICAgICAgICAgICAgICAgeFdpbmRvd1BvcyA9IE1hdGgubWF4KHhXaW5kb3dQb3MsIG1heFgpXG4gICAgICAgICAgICAgICAgeVdpbmRvd1BvcyA9IE1hdGgubWF4KHlXaW5kb3dQb3MsIG1heFkpXG4gICAgICAgICAgICBsYXRlciAtPiByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpLnNldFBvc2l0aW9uKHhXaW5kb3dQb3MsIHlXaW5kb3dQb3MpXG4gICAgICAgICMgb25seSByZW5kZXIgc3RhcnR1cFxuICAgICAgICBzdGFydHVwKG1vZGVscylcblxuICAgICAgICBhcHBsYXlvdXQubGVmdCBudWxsXG4gICAgICAgIGFwcGxheW91dC5jb252aGVhZCBudWxsXG4gICAgICAgIGFwcGxheW91dC5tYWluIG51bGxcbiAgICAgICAgYXBwbGF5b3V0Lm1haW5pbmZvIG51bGxcbiAgICAgICAgYXBwbGF5b3V0LmZvb3QgbnVsbFxuICAgICAgICBhcHBsYXlvdXQubGFzdCBzdGFydHVwXG5cbiAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS56b29tID0gdmlld3N0YXRlLnpvb21cbiAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5zZXRQcm9wZXJ0eSgnLS16b29tJywgdmlld3N0YXRlLnpvb20pXG4gICAgZWxzZSBpZiB2aWV3c3RhdGUuc3RhdGUgPT0gdmlld3N0YXRlLlNUQVRFX05PUk1BTFxuICAgICAgICByZWRyYXcoKVxuICAgICAgICBhcHBsYXlvdXQubGZvb3QgY29udHJvbHNcbiAgICAgICAgYXBwbGF5b3V0Lmxpc3RoZWFkIGxpc3RoZWFkXG4gICAgICAgIGFwcGxheW91dC5sZWZ0IGNvbnZsaXN0XG4gICAgICAgIGFwcGxheW91dC5jb252aGVhZCBjb252aGVhZFxuICAgICAgICBhcHBsYXlvdXQubWFpbiBtZXNzYWdlc1xuICAgICAgICBhcHBsYXlvdXQubWFpbmluZm8gdHlwaW5naW5mb1xuICAgICAgICBhcHBsYXlvdXQuZm9vdCBpbnB1dFxuXG4gICAgICAgIGFwcGxheW91dC5sYXN0IG51bGxcblxuICAgICAgICBtZW51IHZpZXdzdGF0ZVxuICAgICAgICBkb2NraWNvbiB2aWV3c3RhdGVcbiAgICAgICAgdHJheWljb24gbW9kZWxzXG5cbiAgICBlbHNlIGlmIHZpZXdzdGF0ZS5zdGF0ZSA9PSB2aWV3c3RhdGUuU1RBVEVfQUJPVVRcbiAgICAgICAgcmVkcmF3KClcbiAgICAgICAgYWJvdXQgbW9kZWxzXG4gICAgICAgIGFwcGxheW91dC5sZWZ0IGNvbnZsaXN0XG4gICAgICAgIGFwcGxheW91dC5tYWluIGFib3V0XG4gICAgICAgIGFwcGxheW91dC5jb252aGVhZCBudWxsXG4gICAgICAgIGFwcGxheW91dC5tYWluaW5mbyBudWxsXG4gICAgICAgIGFwcGxheW91dC5mb290IG51bGxcbiAgICBlbHNlIGlmIHZpZXdzdGF0ZS5zdGF0ZSA9PSB2aWV3c3RhdGUuU1RBVEVfQUREX0NPTlZFUlNBVElPTlxuICAgICAgICByZWRyYXcoKVxuICAgICAgICBhcHBsYXlvdXQubGVmdCBjb252bGlzdFxuICAgICAgICBhcHBsYXlvdXQubWFpbiBjb252YWRkXG4gICAgICAgIGFwcGxheW91dC5tYWluaW5mbyBudWxsXG4gICAgICAgIGFwcGxheW91dC5mb290IG51bGxcbiAgICAgICAgbGF0ZXIgLT5cbiAgICAgICAgICAgIHNlYXJjaCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgJy5zZWFyY2gtaW5wdXQnXG4gICAgICAgICAgICBzZWFyY2guZm9jdXMoKVxuICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5sb2cgJ3Vua25vd24gdmlld3N0YXRlLnN0YXRlJywgdmlld3N0YXRlLnN0YXRlXG5cbiMgICAgICAgICAgICAgICAgIF9cbiMgICAgICAgICAgICAgICAgfCB8XG4jICAgIF8gX18gX19fICBfX3wgfF8gX18gX18gX19fICAgICAgX19cbiMgICB8ICdfXy8gXyBcXC8gX2AgfCAnX18vIF9gIFxcIFxcIC9cXCAvIC9cbiMgICB8IHwgfCAgX18vIChffCB8IHwgfCAoX3wgfFxcIFYgIFYgL1xuIyAgIHxffCAgXFxfX198XFxfXyxffF98ICBcXF9fLF98IFxcXy9cXF8vXG4jXG4jIHNpbXBsZSByZWRyYXdpbmcgYWxsIG9mIHlha3lhayBVSVxucmVkcmF3ID0gLT5cbiAgICBub3RpZmljYXRpb25zIG1vZGVsc1xuICAgIGNvbnZoZWFkIG1vZGVsc1xuICAgIGNvbnRyb2xzIG1vZGVsc1xuICAgIGNvbnZsaXN0IG1vZGVsc1xuICAgIGxpc3RoZWFkIG1vZGVsc1xuICAgIG1lc3NhZ2VzIG1vZGVsc1xuICAgIHR5cGluZ2luZm8gbW9kZWxzXG4gICAgaW5wdXQgbW9kZWxzXG4gICAgY29udmFkZCBtb2RlbHNcbiAgICBzdGFydHVwIG1vZGVsc1xuXG50aHJvdHRsZSA9IChmbiwgdGltZT0xMCkgLT5cbiAgICB0aW1lb3V0ID0gZmFsc2VcbiAgICAjIHJldHVybiBhIHRocm90dGxlZCB2ZXJzaW9uIG9mIGZuXG4gICAgIyB3aGljaCBleGVjdXRlcyBvbiB0aGUgdHJhaWxpbmcgZW5kIG9mIGB0aW1lYFxuICAgIHRocm90dGxlZCA9IC0+XG4gICAgICAgIHJldHVybiBpZiB0aW1lb3V0XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0IC0+XG4gICAgICAgICAgICBmbigpXG4gICAgICAgICAgICB0aW1lb3V0ID0gZmFsc2VcbiAgICAgICAgLFxuICAgICAgICAgICAgdGltZVxuXG5yZWRyYXcgPSB0aHJvdHRsZShyZWRyYXcsIDIwKVxuXG4jICAgICAgICAgICAgICAgXyAgIF8gX1xuIyAgICAgICAgICAgICAgfCB8IChfKSB8XG4jICAgICBfX18gXyBfXyB8IHxfIF98IHxfIF8gICBfXG4jICAgIC8gXyBcXCAnXyBcXHwgX198IHwgX198IHwgfCB8XG4jICAgfCAgX18vIHwgfCB8IHxffCB8IHxffCB8X3wgfFxuIyAgICBcXF9fX3xffCB8X3xcXF9ffF98XFxfX3xcXF9fLCB8XG4jICAgICAgICAgICAgICAgICAgICAgICAgICBfXy8gfFxuIyAgICAgICAgICAgICAgICAgICAgICAgICB8X19fL1xuaGFuZGxlICd1cGRhdGU6ZW50aXR5JywgLT4gcmVkcmF3KClcblxuI1xuI1xuIyAgICAgX19fIF9fXyAgXyBfX19fICAgX19cbiMgICAgLyBfXy8gXyBcXHwgJ18gXFwgXFwgLyAvXG4jICAgfCAoX3wgKF8pIHwgfCB8IFxcIFYgL1xuIyAgICBcXF9fX1xcX19fL3xffCB8X3xcXF8vXG4jXG4jXG5oYW5kbGUgJ3VwZGF0ZTpjb252JywgLT4gcmVkcmF3KClcblxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfXG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfCB8XG4jICAgICBfX18gX19fICBfIF9fX18gICBfXyAgIF9fXyBfX18gIF8gICBfIF8gX18gfCB8X1xuIyAgICAvIF9fLyBfIFxcfCAnXyBcXCBcXCAvIC8gIC8gX18vIF8gXFx8IHwgfCB8ICdfIFxcfCBfX3xcbiMgICB8IChffCAoXykgfCB8IHwgXFwgViAvICB8IChffCAoXykgfCB8X3wgfCB8IHwgfCB8X1xuIyAgICBcXF9fX1xcX19fL3xffCB8X3xcXF8vICAgIFxcX19fXFxfX18vIFxcX18sX3xffCB8X3xcXF9ffFxuI1xuI1xuaGFuZGxlICd1cGRhdGU6Y29udl9jb3VudCcsIC0+XG4gICAgZG9ja2ljb24gdmlld3N0YXRlXG4gICAgdHJheWljb24gbW9kZWxzXG5cbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgXyAgICAgICAgICAgICAgXyAgIF8gXyAgIF9cbiMgICAgICAgICAgICAgICAgICAgICAgICAgICB8IHwgICAgICAgICAgICB8IHwgICAgICAgICAgICB8IHwgKF8pIHwgKF8pXG4jICAgIF9fXyAgX19fICBfXyBfIF8gX18gX19ffCB8X18gICBfX18gIF9ffCB8ICAgX19fIF8gX18gfCB8XyBffCB8XyBfICBfX18gIF9fX1xuIyAgIC8gX198LyBfIFxcLyBfYCB8ICdfXy8gX198ICdfIFxcIC8gXyBcXC8gX2AgfCAgLyBfIFxcICdfIFxcfCBfX3wgfCBfX3wgfC8gXyBcXC8gX198XG4jICAgXFxfXyBcXCAgX18vIChffCB8IHwgfCAoX198IHwgfCB8ICBfXy8gKF98IHwgfCAgX18vIHwgfCB8IHxffCB8IHxffCB8ICBfXy9cXF9fIFxcXG4jICAgfF9fXy9cXF9fX3xcXF9fLF98X3wgIFxcX19ffF98IHxffFxcX19ffFxcX18sX3wgIFxcX19ffF98IHxffFxcX198X3xcXF9ffF98XFxfX198fF9fXy9cbiNcbiNcbmhhbmRsZSAndXBkYXRlOnNlYXJjaGVkZW50aXRpZXMnLCAtPiByZWRyYXcoKVxuXG4jICAgICAgICAgICAgIF8gICAgICAgICAgIF8gICAgICAgICAgIF8gICAgICAgICAgICAgIF8gICBfIF8gICBfXG4jICAgICAgICAgICAgfCB8ICAgICAgICAgfCB8ICAgICAgICAgfCB8ICAgICAgICAgICAgfCB8IChfKSB8IChfKVxuIyAgICBfX18gIF9fX3wgfCBfX18gIF9fX3wgfF8gX19fICBfX3wgfCAgIF9fXyBfIF9fIHwgfF8gX3wgfF8gXyAgX19fICBfX19cbiMgICAvIF9ffC8gXyBcXCB8LyBfIFxcLyBfX3wgX18vIF8gXFwvIF9gIHwgIC8gXyBcXCAnXyBcXHwgX198IHwgX198IHwvIF8gXFwvIF9ffFxuIyAgIFxcX18gXFwgIF9fLyB8ICBfXy8gKF9ffCB8fCAgX18vIChffCB8IHwgIF9fLyB8IHwgfCB8X3wgfCB8X3wgfCAgX18vXFxfXyBcXFxuIyAgIHxfX18vXFxfX198X3xcXF9fX3xcXF9fX3xcXF9fXFxfX198XFxfXyxffCAgXFxfX198X3wgfF98XFxfX3xffFxcX198X3xcXF9fX3x8X19fL1xuI1xuI1xuaGFuZGxlICd1cGRhdGU6c2VsZWN0ZWRFbnRpdGllcycsIC0+IHJlZHJhdygpXG5cbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfICAgXyAgIF9cbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHwgfCB8IHwgKF8pXG4jICAgICBfX18gX19fICBfIF9fX18gICBfXyAgX19fICBfX198IHxffCB8XyBfIF8gX18gICBfXyBfIF9fX1xuIyAgICAvIF9fLyBfIFxcfCAnXyBcXCBcXCAvIC8gLyBfX3wvIF8gXFwgX198IF9ffCB8ICdfIFxcIC8gX2AgLyBfX3xcbiMgICB8IChffCAoXykgfCB8IHwgXFwgViAvICBcXF9fIFxcICBfXy8gfF98IHxffCB8IHwgfCB8IChffCBcXF9fIFxcXG4jICAgIFxcX19fXFxfX18vfF98IHxffFxcXy8gICB8X19fL1xcX19ffFxcX198XFxfX3xffF98IHxffFxcX18sIHxfX18vXG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfXy8gfFxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8X19fL1xuaGFuZGxlICd1cGRhdGU6Y29udnNldHRpbmdzJywgLT4gcmVkcmF3KClcblxuIyAgICBfXG4jICAgfCB8XG4jICAgfCB8IF9fIF8gXyBfXyAgIF9fIF8gXyAgIF8gIF9fIF8gIF9fIF8gIF9fX1xuIyAgIHwgfC8gX2AgfCAnXyBcXCAvIF9gIHwgfCB8IHwvIF9gIHwvIF9gIHwvIF8gXFxcbiMgICB8IHwgKF98IHwgfCB8IHwgKF98IHwgfF98IHwgKF98IHwgKF98IHwgIF9fL1xuIyAgIHxffFxcX18sX3xffCB8X3xcXF9fLCB8XFxfXyxffFxcX18sX3xcXF9fLCB8XFxfX198XG4jICAgICAgICAgICAgICAgICAgIF9fLyB8ICAgICAgICAgICAgIF9fLyB8XG4jICAgICAgICAgICAgICAgICAgfF9fXy8gICAgICAgICAgICAgfF9fXy9cbmhhbmRsZSAndXBkYXRlOmxhbmd1YWdlJywgLT5cbiAgICBtZW51IHZpZXdzdGF0ZVxuICAgIHJlZHJhdygpXG5cbiMgICAgICAgICAgICAgICAgIF8gXyAgICAgICBfXG4jICAgICAgICAgICAgICAgIChfKSB8ICAgICB8IHxcbiMgICAgX19fX18gICAgICBfX198IHxfIF9fX3wgfF9fICAgICBfX18gX19fICBfIF9fX18gICBfX1xuIyAgIC8gX19cXCBcXCAvXFwgLyAvIHwgX18vIF9ffCAnXyBcXCAgIC8gX18vIF8gXFx8ICdfIFxcIFxcIC8gL1xuIyAgIFxcX18gXFxcXCBWICBWIC98IHwgfHwgKF9ffCB8IHwgfCB8IChffCAoXykgfCB8IHwgXFwgViAvXG4jICAgfF9fXy8gXFxfL1xcXy8gfF98XFxfX1xcX19ffF98IHxffCAgXFxfX19cXF9fXy98X3wgfF98XFxfL1xuI1xuI1xuaGFuZGxlICd1cGRhdGU6c3dpdGNoQ29udicsIC0+IG1lc3NhZ2VzLnNjcm9sbFRvQm90dG9tKClcblxuIyAgICBfICAgICAgICAgICBfXyAgICAgICAgICAgICAgICAgXyAgICAgXyAgICAgX1xuIyAgIHwgfCAgICAgICAgIC8gX3wgICAgICAgICAgICAgICB8IHwgICAoXykgICB8IHxcbiMgICB8IHxfXyAgIF9fX3wgfF8gX19fICBfIF9fIF9fXyAgfCB8X18gIF8gX19ffCB8XyBfX18gIF8gX18gXyAgIF9cbiMgICB8ICdfIFxcIC8gXyBcXCAgXy8gXyBcXHwgJ19fLyBfIFxcIHwgJ18gXFx8IC8gX198IF9fLyBfIFxcfCAnX198IHwgfCB8XG4jICAgfCB8XykgfCAgX18vIHx8IChfKSB8IHwgfCAgX18vIHwgfCB8IHwgXFxfXyBcXCB8fCAoXykgfCB8ICB8IHxffCB8XG4jICAgfF8uX18vIFxcX19ffF98IFxcX19fL3xffCAgXFxfX198IHxffCB8X3xffF9fXy9cXF9fXFxfX18vfF98ICAgXFxfXywgfFxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX18vIHxcbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfF9fXy9cbmhhbmRsZSAndXBkYXRlOmJlZm9yZUhpc3RvcnknLCAtPiBhcHBsYXlvdXQucmVjb3JkTWFpblBvcygpXG5cbiMgICAgICAgICAgIF9fIF8gICAgICAgICAgICAgIF8gICAgIF8gICAgIF9cbiMgICAgICAgICAgLyBffCB8ICAgICAgICAgICAgfCB8ICAgKF8pICAgfCB8XG4jICAgICBfXyBffCB8X3wgfF8gX19fIF8gX18gIHwgfF9fICBfIF9fX3wgfF8gX19fICBfIF9fIF8gICBfXG4jICAgIC8gX2AgfCAgX3wgX18vIF8gXFwgJ19ffCB8ICdfIFxcfCAvIF9ffCBfXy8gXyBcXHwgJ19ffCB8IHwgfFxuIyAgIHwgKF98IHwgfCB8IHx8ICBfXy8gfCAgICB8IHwgfCB8IFxcX18gXFwgfHwgKF8pIHwgfCAgfCB8X3wgfFxuIyAgICBcXF9fLF98X3wgIFxcX19cXF9fX3xffCAgICB8X3wgfF98X3xfX18vXFxfX1xcX19fL3xffCAgIFxcX18sIHxcbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9fLyB8XG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHxfX18vXG5oYW5kbGUgJ3VwZGF0ZTphZnRlckhpc3RvcnknLCAtPiBhcHBsYXlvdXQuYWRqdXN0TWFpblBvcygpXG5cbiMgICAgXyAgICAgICAgICAgX18gICAgICAgICAgICAgICAgIF9cbiMgICB8IHwgICAgICAgICAvIF98ICAgICAgICAgICAgICAgKF8pXG4jICAgfCB8X18gICBfX198IHxfIF9fXyAgXyBfXyBfX18gICBfIF8gX18gX19fICAgX18gX1xuIyAgIHwgJ18gXFwgLyBfIFxcICBfLyBfIFxcfCAnX18vIF8gXFwgfCB8ICdfIGAgXyBcXCAvIF9gIHxcbiMgICB8IHxfKSB8ICBfXy8gfHwgKF8pIHwgfCB8ICBfXy8gfCB8IHwgfCB8IHwgfCAoX3wgfFxuIyAgIHxfLl9fLyBcXF9fX3xffCBcXF9fXy98X3wgIFxcX19ffCB8X3xffCB8X3wgfF98XFxfXywgfFxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9fLyB8XG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8X19fL1xuaGFuZGxlICd1cGRhdGU6YmVmb3JlSW1nJywgLT4gYXBwbGF5b3V0LnJlY29yZE1haW5Qb3MoKVxuXG4jICAgICAgICAgICBfXyBfICAgICAgICAgICAgICBfXG4jICAgICAgICAgIC8gX3wgfCAgICAgICAgICAgIChfKVxuIyAgICAgX18gX3wgfF98IHxfIF9fXyBfIF9fICAgXyBfIF9fIF9fXyAgIF9fIF9cbiMgICAgLyBfYCB8ICBffCBfXy8gXyBcXCAnX198IHwgfCAnXyBgIF8gXFwgLyBfYCB8XG4jICAgfCAoX3wgfCB8IHwgfHwgIF9fLyB8ICAgIHwgfCB8IHwgfCB8IHwgKF98IHxcbiMgICAgXFxfXyxffF98ICBcXF9fXFxfX198X3wgICAgfF98X3wgfF98IHxffFxcX18sIHxcbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfXy8gfFxuIyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfF9fXy9cbmhhbmRsZSAndXBkYXRlOmFmdGVySW1nJywgLT5cbiAgICBpZiB2aWV3c3RhdGUuYXRib3R0b21cbiAgICAgICAgbWVzc2FnZXMuc2Nyb2xsVG9Cb3R0b20oKVxuICAgIGVsc2VcbiAgICAgICAgYXBwbGF5b3V0LmFkanVzdE1haW5Qb3MoKVxuXG4jICAgICAgICBfICAgICAgICAgICAgIF8gICAgIF8gICAgICAgICAgICAgICBfXG4jICAgICAgIHwgfCAgICAgICAgICAgfCB8ICAgfCB8ICAgICAgICAgICAgIChfKVxuIyAgICBfX198IHxfIF9fIF8gXyBfX3wgfF8gIHwgfF8gXyAgIF8gXyBfXyAgXyBfIF9fICAgX18gX1xuIyAgIC8gX198IF9fLyBfYCB8ICdfX3wgX198IHwgX198IHwgfCB8ICdfIFxcfCB8ICdfIFxcIC8gX2AgfFxuIyAgIFxcX18gXFwgfHwgKF98IHwgfCAgfCB8XyAgfCB8X3wgfF98IHwgfF8pIHwgfCB8IHwgfCAoX3wgfFxuIyAgIHxfX18vXFxfX1xcX18sX3xffCAgIFxcX198ICBcXF9ffFxcX18sIHwgLl9fL3xffF98IHxffFxcX18sIHxcbiMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfXy8gfCB8ICAgICAgICAgICAgIF9fLyB8XG4jICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8X19fL3xffCAgICAgICAgICAgIHxfX18vXG5oYW5kbGUgJ3VwZGF0ZTpzdGFydFR5cGluZycsIC0+XG4gICAgaWYgdmlld3N0YXRlLmF0Ym90dG9tXG4gICAgICAgIG1lc3NhZ2VzLnNjcm9sbFRvQm90dG9tKClcbiJdfQ==
