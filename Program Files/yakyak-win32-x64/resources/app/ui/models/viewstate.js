(function() {
  var Client, STATES, autoLauncher, exp, later, merge, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref15, ref16, ref17, ref18, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, throttle, tryparse;

  Client = require('hangupsjs');

  merge = function(t, ...os) {
    var j, k, len, o, v;
    for (j = 0, len = os.length; j < len; j++) {
      o = os[j];
      for (k in o) {
        v = o[k];
        if (v !== null && v !== (void 0)) {
          t[k] = v;
        }
      }
    }
    return t;
  };

  ({throttle, later, tryparse, autoLauncher} = require('../util'));

  STATES = {
    STATE_STARTUP: 'startup',
    STATE_NORMAL: 'normal',
    STATE_ADD_CONVERSATION: 'add_conversation',
    STATE_ABOUT: 'about'
  };

  module.exports = exp = {
    state: null,
    attop: false, // tells whether message list is scrolled to top
    atbottom: true, // tells whether message list is scrolled to bottom
    selectedConv: localStorage.selectedConv,
    lastActivity: null,
    leftSize: (ref = tryparse(localStorage.leftSize)) != null ? ref : 240,
    size: tryparse((ref1 = localStorage.size) != null ? ref1 : "[940, 600]"),
    pos: tryparse((ref2 = localStorage.pos) != null ? ref2 : "[100, 100]"),
    showConvMin: (ref3 = tryparse(localStorage.showConvMin)) != null ? ref3 : false,
    showConvThumbs: (ref4 = tryparse(localStorage.showConvThumbs)) != null ? ref4 : true,
    showAnimatedThumbs: (ref5 = tryparse(localStorage.showAnimatedThumbs)) != null ? ref5 : true,
    showConvTime: (ref6 = tryparse(localStorage.showConvTime)) != null ? ref6 : true,
    showConvLast: (ref7 = tryparse(localStorage.showConvLast)) != null ? ref7 : true,
    showPopUpNotifications: (ref8 = tryparse(localStorage.showPopUpNotifications)) != null ? ref8 : true,
    showMessageInNotification: (ref9 = tryparse(localStorage.showMessageInNotification)) != null ? ref9 : true,
    showUsernameInNotification: (ref10 = tryparse(localStorage.showUsernameInNotification)) != null ? ref10 : true,
    convertEmoji: (ref11 = tryparse(localStorage.convertEmoji)) != null ? ref11 : true,
    suggestEmoji: (ref12 = tryparse(localStorage.suggestEmoji)) != null ? ref12 : true,
    showImagePreview: (ref13 = tryparse(localStorage.showImagePreview)) != null ? ref13 : true,
    colorScheme: localStorage.colorScheme || 'default',
    fontSize: localStorage.fontSize || 'medium',
    zoom: tryparse((ref14 = localStorage.zoom) != null ? ref14 : "1.0"),
    loggedin: false,
    escapeClearsInput: tryparse(localStorage.escapeClearsInput) || false,
    showtray: tryparse(localStorage.showtray) || false,
    hidedockicon: tryparse(localStorage.hidedockicon) || false,
    startminimizedtotray: tryparse(localStorage.startminimizedtotray) || false,
    closetotray: tryparse(localStorage.closetotray) || false,
    showDockOnce: true,
    showIconNotification: (ref15 = tryparse(localStorage.showIconNotification)) != null ? ref15 : true,
    muteSoundNotification: (ref16 = tryparse(localStorage.muteSoundNotification)) != null ? ref16 : false,
    forceCustomSound: (ref17 = tryparse(localStorage.forceCustomSound)) != null ? ref17 : false,
    language: (ref18 = localStorage.language) != null ? ref18 : 'en',
    useSystemDateFormat: localStorage.useSystemDateFormat === "true",
    // non persistent!
    messageMemory: {}, // stores input when swithching conversations
    cachedInitialsCode: {}, // code used for colored initials, if no avatar
    // contacts are loaded
    loadedContacts: false,
    openOnSystemStartup: false,
    setUseSystemDateFormat: function(val) {
      this.useSystemDateFormat = val;
      localStorage.useSystemDateFormat = val;
      return updated('language');
    },
    setContacts: function(state) {
      if (state === this.loadedContacts) {
        return;
      }
      this.loadedContacts = state;
      return updated('viewstate');
    },
    setState: function(state) {
      if (this.state === state) {
        return;
      }
      this.state = state;
      if (state === STATES.STATE_STARTUP) {
        // set a first active timestamp to avoid requesting
        // syncallnewevents on startup
        require('./connection').setLastActive(Date.now(), true);
      }
      return updated('viewstate');
    },
    setLanguage: function(language) {
      if (this.language === language) {
        return;
      }
      i18n.locale = language;
      i18n.setLocale(language);
      this.language = localStorage.language = language;
      return updated('language');
    },
    switchInput: function(next_conversation_id) {
      var el;
      // if conversation is changing, save input
      el = document.getElementById('message-input');
      if (el == null) {
        console.log('Warning: could not retrieve message input to store.');
        return;
      }
      // save current input
      this.messageMemory[this.selectedConv] = el.value;
      // either reset or fetch previous input of the new conv
      if (this.messageMemory[next_conversation_id] != null) {
        el.value = this.messageMemory[next_conversation_id];
        // once old conversation is retrieved memory is wiped
        return this.messageMemory[next_conversation_id] = "";
      } else {
        return el.value = '';
      }
    },
    
    setSelectedConv: function(c) {
      var conv, conv_id, ref19, ref20, ref21, ref22, ref23, ref24;
      conv = require('./conv'); // circular
      conv_id = (ref19 = (ref20 = c != null ? (ref21 = c.conversation_id) != null ? ref21.id : void 0 : void 0) != null ? ref20 : c != null ? c.id : void 0) != null ? ref19 : c;
      if (!conv_id) {
        conv_id = (ref22 = conv.list()) != null ? (ref23 = ref22[0]) != null ? (ref24 = ref23.conversation_id) != null ? ref24.id : void 0 : void 0 : void 0;
      }
      if (this.selectedConv === conv_id) {
        return;
      }
      this.switchInput(conv_id);
      this.selectedConv = localStorage.selectedConv = conv_id;
      this.setLastKeyDown(0);
      updated('viewstate');
      return updated('switchConv');
    },
    selectNextConv: function(offset = 1) {
      var c, candidate, conv, i, id, index, j, len, list, results;
      conv = require('./conv');
      id = this.selectedConv;
      c = conv[id];
      list = (function() {
        var j, len, ref19, results;
        ref19 = conv.list();
        results = [];
        for (j = 0, len = ref19.length; j < len; j++) {
          i = ref19[j];
          if (!conv.isPureHangout(i)) {
            results.push(i);
          }
        }
        return results;
      })();
      results = [];
      for (index = j = 0, len = list.length; j < len; index = ++j) {
        c = list[index];
        if (id === c.conversation_id.id) {
          candidate = index + offset;
          if (list[candidate]) {
            results.push(this.setSelectedConv(list[candidate]));
          } else {
            results.push(void 0);
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    },
    selectConvIndex: function(index = 0) {
      var conv, i, list;
      conv = require('./conv');
      list = (function() {
        var j, len, ref19, results;
        ref19 = conv.list();
        results = [];
        for (j = 0, len = ref19.length; j < len; j++) {
          i = ref19[j];
          if (!conv.isPureHangout(i)) {
            results.push(i);
          }
        }
        return results;
      })();
      return this.setSelectedConv(list[index]);
    },
    updateAtTop: function(attop) {
      if (this.attop === attop) {
        return;
      }
      this.attop = attop;
      return updated('viewstate');
    },
    updateAtBottom: function(atbottom) {
      if (this.atbottom === atbottom) {
        return;
      }
      this.atbottom = atbottom;
      return this.updateActivity(Date.now());
    },
    updateActivity: function(time) {
      var c, conv, ur;
      conv = require('./conv'); // circular
      this.lastActivity = time;
      later(function() {
        return action('lastActivity');
      });
      if (!(document.hasFocus() && this.atbottom && this.state === STATES.STATE_NORMAL)) {
        return;
      }
      c = conv[this.selectedConv];
      if (!c) {
        return;
      }
      ur = conv.unread(c);
      if (ur > 0) {
        return later(function() {
          return action('updatewatermark');
        });
      }
    },
    setSize: function(size) {
      localStorage.size = JSON.stringify(size);
      return this.size = size;
    },
    // updated 'viewstate'
    setPosition: function(pos) {
      localStorage.pos = JSON.stringify(pos);
      return this.pos = pos;
    },
    // updated 'viewstate'
    setLeftSize: function(size) {
      if (this.leftSize === size || size < 180) {
        return;
      }
      this.leftSize = localStorage.leftSize = size;
      return updated('viewstate');
    },
    setZoom: function(zoom) {
      this.zoom = localStorage.zoom = document.body.style.zoom = zoom;
      return document.body.style.setProperty('--zoom', zoom);
    },
    setLoggedin: function(val) {
      this.loggedin = val;
      return updated('viewstate');
    },
    setShowSeenStatus: function(val) {
      this.showseenstatus = localStorage.showseenstatus = !!val;
      return updated('viewstate');
    },
    setLastKeyDown: (function() {
      var PAUSED, STOPPED, TYPING, lastEmitted, timeout, update;
      ({TYPING, PAUSED, STOPPED} = Client.TypingStatus);
      lastEmitted = 0;
      timeout = 0;
      return update = throttle(500, function(time) {
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = null;
        if (!time) {
          return lastEmitted = 0;
        } else {
          if (time - lastEmitted > 5000) {
            later(function() {
              return action('settyping', TYPING);
            });
            lastEmitted = time;
          }
          return timeout = setTimeout(function() {
            // after 6 secods of no keyboard, we consider the
            // user took a break.
            lastEmitted = 0;
            action('settyping', PAUSED);
            return timeout = setTimeout(function() {
              // and after another 6 seconds (12 total), we
              // consider the typing stopped altogether.
              return action('settyping', STOPPED);
            }, 6000);
          }, 6000);
        }
      });
    })(),
    setShowConvMin: function(doshow) {
      if (this.showConvMin === doshow) {
        return;
      }
      this.showConvMin = localStorage.showConvMin = doshow;
      if (doshow) {
        this.setShowConvThumbs(true);
      }
      return updated('viewstate');
    },
    setShowConvThumbs: function(doshow) {
      if (this.showConvThumbs === doshow) {
        return;
      }
      this.showConvThumbs = localStorage.showConvThumbs = doshow;
      if (!doshow) {
        this.setShowConvMin(false);
      }
      return updated('viewstate');
    },
    setShowAnimatedThumbs: function(doshow) {
      if (this.showAnimatedThumbs === doshow) {
        return;
      }
      this.showAnimatedThumbs = localStorage.showAnimatedThumbs = doshow;
      return updated('viewstate');
    },
    setShowConvTime: function(doshow) {
      if (this.showConvTime === doshow) {
        return;
      }
      this.showConvTime = localStorage.showConvTime = doshow;
      return updated('viewstate');
    },
    setShowConvLast: function(doshow) {
      if (this.showConvLast === doshow) {
        return;
      }
      this.showConvLast = localStorage.showConvLast = doshow;
      return updated('viewstate');
    },
    setShowPopUpNotifications: function(doshow) {
      if (this.showPopUpNotifications === doshow) {
        return;
      }
      this.showPopUpNotifications = localStorage.showPopUpNotifications = doshow;
      return updated('viewstate');
    },
    setShowMessageInNotification: function(doshow) {
      if (this.showMessageInNotification === doshow) {
        return;
      }
      this.showMessageInNotification = localStorage.showMessageInNotification = doshow;
      return updated('viewstate');
    },
    setShowUsernameInNotification: function(doshow) {
      if (this.showUsernameInNotification === doshow) {
        return;
      }
      this.showUsernameInNotification = localStorage.showUsernameInNotification = doshow;
      return updated('viewstate');
    },
    setForceCustomSound: function(doshow) {
      if (localStorage.forceCustomSound === doshow) {
        return;
      }
      this.forceCustomSound = localStorage.forceCustomSound = doshow;
      return updated('viewstate');
    },
    setShowIconNotification: function(doshow) {
      if (localStorage.showIconNotification === doshow) {
        return;
      }
      this.showIconNotification = localStorage.showIconNotification = doshow;
      return updated('viewstate');
    },
    setMuteSoundNotification: function(doshow) {
      if (localStorage.muteSoundNotification === doshow) {
        return;
      }
      this.muteSoundNotification = localStorage.muteSoundNotification = doshow;
      return updated('viewstate');
    },
    setConvertEmoji: function(doshow) {
      if (this.convertEmoji === doshow) {
        return;
      }
      this.convertEmoji = localStorage.convertEmoji = doshow;
      return updated('viewstate');
    },
    setSuggestEmoji: function(doshow) {
      if (this.suggestEmoji === doshow) {
        return;
      }
      this.suggestEmoji = localStorage.suggestEmoji = doshow;
      return updated('viewstate');
    },
    setshowImagePreview: function(doshow) {
      if (this.showImagePreview === doshow) {
        return;
      }
      this.showImagePreview = localStorage.showImagePreview = doshow;
      return updated('viewstate');
    },
    setColorScheme: function(colorscheme) {
      this.colorScheme = localStorage.colorScheme = colorscheme;
      while (document.querySelector('html').classList.length > 0) {
        document.querySelector('html').classList.remove(document.querySelector('html').classList.item(0));
      }
      return document.querySelector('html').classList.add(colorscheme);
    },
    setFontSize: function(fontsize) {
      this.fontSize = localStorage.fontSize = fontsize;
      while (document.querySelector('html').classList.length > 0) {
        document.querySelector('html').classList.remove(document.querySelector('html').classList.item(0));
      }
      document.querySelector('html').classList.add(localStorage.colorScheme);
      return document.querySelector('html').classList.add(fontsize);
    },
    setEscapeClearsInput: function(value) {
      this.escapeClearsInput = localStorage.escapeClearsInput = value;
      return updated('viewstate');
    },
    setShowTray: function(value) {
      this.showtray = localStorage.showtray = value;
      if (!this.showtray) {
        this.setCloseToTray(false);
        return this.setStartMinimizedToTray(false);
      } else {
        return updated('viewstate');
      }
    },
    setHideDockIcon: function(value) {
      this.hidedockicon = localStorage.hidedockicon = value;
      return updated('viewstate');
    },
    setStartMinimizedToTray: function(value) {
      this.startminimizedtotray = localStorage.startminimizedtotray = value;
      return updated('viewstate');
    },
    setShowDockIconOnce: function(value) {
      return this.showDockIconOnce = value;
    },
    setCloseToTray: function(value) {
      this.closetotray = localStorage.closetotray = !!value;
      return updated('viewstate');
    },
    setOpenOnSystemStartup: function(open) {
      if (this.openOnSystemStartup === open) {
        return;
      }
      if (open) {
        autoLauncher.enable();
      } else {
        autoLauncher.disable();
      }
      this.openOnSystemStartup = open;
      return updated('viewstate');
    },
    initOpenOnSystemStartup: function(isEnabled) {
      this.openOnSystemStartup = isEnabled;
      return updated('viewstate');
    }
  };

  merge(exp, STATES);

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvbW9kZWxzL3ZpZXdzdGF0ZS5qcyIsInNvdXJjZXMiOlsidWkvbW9kZWxzL3ZpZXdzdGF0ZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxRQUFBLEVBQUE7O0VBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxXQUFSOztFQUVULEtBQUEsR0FBVSxRQUFBLENBQUMsQ0FBRCxFQUFBLEdBQUksRUFBSixDQUFBO0FBQWEsUUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQSxDQUFBLEVBQUE7SUFBQyxLQUFBLG9DQUFBOztNQUFBLEtBQUEsTUFBQTs7WUFBMkIsTUFBVSxRQUFWLE1BQWdCO1VBQTNDLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTzs7TUFBUDtJQUFBO1dBQW1FO0VBQWpGOztFQUVWLENBQUEsQ0FBQyxRQUFELEVBQVcsS0FBWCxFQUFrQixRQUFsQixFQUE0QixZQUE1QixDQUFBLEdBQTRDLE9BQUEsQ0FBUSxTQUFSLENBQTVDOztFQUVBLE1BQUEsR0FDSTtJQUFBLGFBQUEsRUFBZSxTQUFmO0lBQ0EsWUFBQSxFQUFjLFFBRGQ7SUFFQSxzQkFBQSxFQUF3QixrQkFGeEI7SUFHQSxXQUFBLEVBQWE7RUFIYjs7RUFLSixNQUFNLENBQUMsT0FBUCxHQUFpQixHQUFBLEdBQU07SUFDbkIsS0FBQSxFQUFPLElBRFk7SUFFbkIsS0FBQSxFQUFPLEtBRlk7SUFHbkIsUUFB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LE9BQUEsQ0FBUSxXQUFSO0lBRnFCLENBalNOO0lBcVNuQixtQkFBQSxFQUFxQixRQUFBLENBQUMsS0FBRCxDQUFBO2FBQ2pCLElBQUMsQ0FBQSxnQkFBRCxHQUFvQjtJQURILENBclNGO0lBd1NuQixjQUFBLEVBQWdCLFFBQUEsQ0FBQyxLQUFELENBQUE7TUFDWixJQUFDLENBQUEsV0FBRCxHQUFlLFlBQVksQ0FBQyxXQUFiLEdBQTJCLENBQUMsQ0FBQzthQUM1QyxPQUFBLENBQVEsV0FBUjtJQUZZLENBeFNHO0lBNFNuQixzQkFBQSxFQUF3QixRQUFBLENBQUMsSUFBRCxDQUFBO01BQ3BCLElBQVUsSUFBQyxDQUFBLG1CQUFELEtBQXdCLElBQWxDO0FBQUEsZUFBQTs7TUFFQSxJQUFHLElBQUg7UUFDSSxZQUFZLENBQUMsTUFBYixDQUFBLEVBREo7T0FBQSxNQUFBO1FBR0ksWUFBWSxDQUFDLE9BQWIsQ0FBQSxFQUhKOztNQUtBLElBQUMsQ0FBQSxtQkFBRCxHQUF1QjthQUV2QixPQUFBLENBQVEsV0FBUjtJQVZvQixDQTVTTDtJQXdUbkIsdUJBQUEsRUFBeUIsUUFBQSxDQUFDLFNBQUQsQ0FBQTtNQUNyQixJQUFDLENBQUEsbUJBQUQsR0FBdUI7YUFFdkIsT0FBQSxDQUFRLFdBQVI7SUFIcUI7RUF4VE47O0VBOFR2QixLQUFBLENBQU0sR0FBTixFQUFXLE1BQVg7QUExVUEiLCJzb3VyY2VzQ29udGVudCI6WyJDbGllbnQgPSByZXF1aXJlICdoYW5ndXBzanMnXG5cbm1lcmdlICAgPSAodCwgb3MuLi4pIC0+IHRba10gPSB2IGZvciBrLHYgb2YgbyB3aGVuIHYgbm90IGluIFtudWxsLCB1bmRlZmluZWRdIGZvciBvIGluIG9zOyB0XG5cbnt0aHJvdHRsZSwgbGF0ZXIsIHRyeXBhcnNlLCBhdXRvTGF1bmNoZXJ9ID0gcmVxdWlyZSAnLi4vdXRpbCdcblxuU1RBVEVTID1cbiAgICBTVEFURV9TVEFSVFVQOiAnc3RhcnR1cCdcbiAgICBTVEFURV9OT1JNQUw6ICdub3JtYWwnXG4gICAgU1RBVEVfQUREX0NPTlZFUlNBVElPTjogJ2FkZF9jb252ZXJzYXRpb24nXG4gICAgU1RBVEVfQUJPVVQ6ICdhYm91dCdcblxubW9kdWxlLmV4cG9ydHMgPSBleHAgPSB7XG4gICAgc3RhdGU6IG51bGxcbiAgICBhdHRvcDogZmFsc2UgICAjIHRlbGxzIHdoZXRoZXIgbWVzc2FnZSBsaXN0IGlzIHNjcm9sbGVkIHRvIHRvcFxuICAgIGF0Ym90dG9tOiB0cnVlICMgdGVsbHMgd2hldGhlciBtZXNzYWdlIGxpc3QgaXMgc2Nyb2xsZWQgdG8gYm90dG9tXG4gICAgc2VsZWN0ZWRDb252OiBsb2NhbFN0b3JhZ2Uuc2VsZWN0ZWRDb252XG4gICAgbGFzdEFjdGl2aXR5OiBudWxsXG4gICAgbGVmdFNpemU6IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5sZWZ0U2l6ZSkgPyAyNDBcbiAgICBzaXplOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2l6ZSA/IFwiWzk0MCwgNjAwXVwiKVxuICAgIHBvczogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnBvcyA/IFwiWzEwMCwgMTAwXVwiKVxuICAgIHNob3dDb252TWluOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd0NvbnZNaW4pID8gZmFsc2VcbiAgICBzaG93Q29udlRodW1iczogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnNob3dDb252VGh1bWJzKSA/IHRydWVcbiAgICBzaG93QW5pbWF0ZWRUaHVtYnM6IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5zaG93QW5pbWF0ZWRUaHVtYnMpID8gdHJ1ZVxuICAgIHNob3dDb252VGltZTogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnNob3dDb252VGltZSkgPyB0cnVlXG4gICAgc2hvd0NvbnZMYXN0OiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd0NvbnZMYXN0KSA/IHRydWVcbiAgICBzaG93UG9wVXBOb3RpZmljYXRpb25zOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd1BvcFVwTm90aWZpY2F0aW9ucykgPyB0cnVlXG4gICAgc2hvd01lc3NhZ2VJbk5vdGlmaWNhdGlvbjogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnNob3dNZXNzYWdlSW5Ob3RpZmljYXRpb24pID8gdHJ1ZVxuICAgIHNob3dVc2VybmFtZUluTm90aWZpY2F0aW9uOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd1VzZXJuYW1lSW5Ob3RpZmljYXRpb24pID8gdHJ1ZVxuICAgIGNvbnZlcnRFbW9qaTogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLmNvbnZlcnRFbW9qaSkgPyB0cnVlXG4gICAgc3VnZ2VzdEVtb2ppOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc3VnZ2VzdEVtb2ppKSA/IHRydWVcbiAgICBzaG93SW1hZ2VQcmV2aWV3OiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd0ltYWdlUHJldmlldykgPyB0cnVlXG4gICAgY29sb3JTY2hlbWU6IGxvY2FsU3RvcmFnZS5jb2xvclNjaGVtZSBvciAnZGVmYXVsdCdcbiAgICBmb250U2l6ZTogbG9jYWxTdG9yYWdlLmZvbnRTaXplIG9yICdtZWRpdW0nXG4gICAgem9vbTogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnpvb20gPyBcIjEuMFwiKVxuICAgIGxvZ2dlZGluOiBmYWxzZVxuICAgIGVzY2FwZUNsZWFyc0lucHV0OiB0cnlwYXJzZShsb2NhbFN0b3JhZ2UuZXNjYXBlQ2xlYXJzSW5wdXQpIG9yIGZhbHNlXG4gICAgc2hvd3RyYXk6IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5zaG93dHJheSkgb3IgZmFsc2VcbiAgICBoaWRlZG9ja2ljb246IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5oaWRlZG9ja2ljb24pIG9yIGZhbHNlXG4gICAgc3RhcnRtaW5pbWl6ZWR0b3RyYXk6IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5zdGFydG1pbmltaXplZHRvdHJheSkgb3IgZmFsc2VcbiAgICBjbG9zZXRvdHJheTogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLmNsb3NldG90cmF5KSBvciBmYWxzZVxuICAgIHNob3dEb2NrT25jZTogdHJ1ZVxuICAgIHNob3dJY29uTm90aWZpY2F0aW9uOiB0cnlwYXJzZShsb2NhbFN0b3JhZ2Uuc2hvd0ljb25Ob3RpZmljYXRpb24pID8gdHJ1ZVxuICAgIG11dGVTb3VuZE5vdGlmaWNhdGlvbjogdHJ5cGFyc2UobG9jYWxTdG9yYWdlLm11dGVTb3VuZE5vdGlmaWNhdGlvbikgPyBmYWxzZVxuICAgIGZvcmNlQ3VzdG9tU291bmQ6IHRyeXBhcnNlKGxvY2FsU3RvcmFnZS5mb3JjZUN1c3RvbVNvdW5kKSA/IGZhbHNlXG4gICAgbGFuZ3VhZ2U6IGxvY2FsU3RvcmFnZS5sYW5ndWFnZSA/ICdlbidcbiAgICB1c2VTeXN0ZW1EYXRlRm9ybWF0OiBsb2NhbFN0b3JhZ2UudXNlU3lzdGVtRGF0ZUZvcm1hdCBpcyBcInRydWVcIlxuICAgICMgbm9uIHBlcnNpc3RlbnQhXG4gICAgbWVzc2FnZU1lbW9yeToge30gICAgICAjIHN0b3JlcyBpbnB1dCB3aGVuIHN3aXRoY2hpbmcgY29udmVyc2F0aW9uc1xuICAgIGNhY2hlZEluaXRpYWxzQ29kZToge30gIyBjb2RlIHVzZWQgZm9yIGNvbG9yZWQgaW5pdGlhbHMsIGlmIG5vIGF2YXRhclxuICAgICMgY29udGFjdHMgYXJlIGxvYWRlZFxuICAgIGxvYWRlZENvbnRhY3RzOiBmYWxzZVxuICAgIG9wZW5PblN5c3RlbVN0YXJ0dXA6IGZhbHNlXG5cbiAgICBzZXRVc2VTeXN0ZW1EYXRlRm9ybWF0OiAodmFsKSAtPlxuICAgICAgICBAdXNlU3lzdGVtRGF0ZUZvcm1hdCA9IHZhbFxuICAgICAgICBsb2NhbFN0b3JhZ2UudXNlU3lzdGVtRGF0ZUZvcm1hdCA9IHZhbFxuICAgICAgICB1cGRhdGVkICdsYW5ndWFnZSdcblxuICAgIHNldENvbnRhY3RzOiAoc3RhdGUpIC0+XG4gICAgICAgIHJldHVybiBpZiBzdGF0ZSA9PSBAbG9hZGVkQ29udGFjdHNcbiAgICAgICAgQGxvYWRlZENvbnRhY3RzID0gc3RhdGVcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U3RhdGU6IChzdGF0ZSkgLT5cbiAgICAgICAgcmV0dXJuIGlmIEBzdGF0ZSA9PSBzdGF0ZVxuICAgICAgICBAc3RhdGUgPSBzdGF0ZVxuICAgICAgICBpZiBzdGF0ZSA9PSBTVEFURVMuU1RBVEVfU1RBUlRVUFxuICAgICAgICAgICAgIyBzZXQgYSBmaXJzdCBhY3RpdmUgdGltZXN0YW1wIHRvIGF2b2lkIHJlcXVlc3RpbmdcbiAgICAgICAgICAgICMgc3luY2FsbG5ld2V2ZW50cyBvbiBzdGFydHVwXG4gICAgICAgICAgICByZXF1aXJlKCcuL2Nvbm5lY3Rpb24nKS5zZXRMYXN0QWN0aXZlKERhdGUubm93KCksIHRydWUpXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldExhbmd1YWdlOiAobGFuZ3VhZ2UpIC0+XG4gICAgICAgIHJldHVybiBpZiBAbGFuZ3VhZ2UgPT0gbGFuZ3VhZ2VcbiAgICAgICAgaTE4bi5sb2NhbGUgPSBsYW5ndWFnZVxuICAgICAgICBpMThuLnNldExvY2FsZShsYW5ndWFnZSlcbiAgICAgICAgQGxhbmd1YWdlID0gbG9jYWxTdG9yYWdlLmxhbmd1YWdlID0gbGFuZ3VhZ2VcbiAgICAgICAgdXBkYXRlZCAnbGFuZ3VhZ2UnXG5cbiAgICBzd2l0Y2hJbnB1dDogKG5leHRfY29udmVyc2F0aW9uX2lkKSAtPlxuICAgICAgICAjIGlmIGNvbnZlcnNhdGlvbiBpcyBjaGFuZ2luZywgc2F2ZSBpbnB1dFxuICAgICAgICBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZXNzYWdlLWlucHV0JylcbiAgICAgICAgaWYgIWVsP1xuICAgICAgICAgICAgY29uc29sZS5sb2cgJ1dhcm5pbmc6IGNvdWxkIG5vdCByZXRyaWV2ZSBtZXNzYWdlIGlucHV0IHRvIHN0b3JlLidcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAjIHNhdmUgY3VycmVudCBpbnB1dFxuICAgICAgICBAbWVzc2FnZU1lbW9yeVtAc2VsZWN0ZWRDb252XSA9IGVsLnZhbHVlXG4gICAgICAgICMgZWl0aGVyIHJlc2V0IG9yIGZldGNoIHByZXZpb3VzIGlucHV0IG9mIHRoZSBuZXcgY29udlxuICAgICAgICBpZiBAbWVzc2FnZU1lbW9yeVtuZXh0X2NvbnZlcnNhdGlvbl9pZF0/XG4gICAgICAgICAgICBlbC52YWx1ZSA9IEBtZXNzYWdlTWVtb3J5W25leHRfY29udmVyc2F0aW9uX2lkXVxuICAgICAgICAgICAgIyBvbmNlIG9sZCBjb252ZXJzYXRpb24gaXMgcmV0cmlldmVkIG1lbW9yeSBpcyB3aXBlZFxuICAgICAgICAgICAgQG1lc3NhZ2VNZW1vcnlbbmV4dF9jb252ZXJzYXRpb25faWRdID0gXCJcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbC52YWx1ZSA9ICcnXG4gICAgICAgICNcblxuICAgIHNldFNlbGVjdGVkQ29udjogKGMpIC0+XG4gICAgICAgIGNvbnYgPSByZXF1aXJlICcuL2NvbnYnICMgY2lyY3VsYXJcbiAgICAgICAgY29udl9pZCA9IGM/LmNvbnZlcnNhdGlvbl9pZD8uaWQgPyBjPy5pZCA/IGNcbiAgICAgICAgdW5sZXNzIGNvbnZfaWRcbiAgICAgICAgICAgIGNvbnZfaWQgPSBjb252Lmxpc3QoKT9bMF0/LmNvbnZlcnNhdGlvbl9pZD8uaWRcbiAgICAgICAgcmV0dXJuIGlmIEBzZWxlY3RlZENvbnYgPT0gY29udl9pZFxuICAgICAgICBAc3dpdGNoSW5wdXQoY29udl9pZClcbiAgICAgICAgQHNlbGVjdGVkQ29udiA9IGxvY2FsU3RvcmFnZS5zZWxlY3RlZENvbnYgPSBjb252X2lkXG4gICAgICAgIEBzZXRMYXN0S2V5RG93biAwXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcbiAgICAgICAgdXBkYXRlZCAnc3dpdGNoQ29udidcblxuICAgIHNlbGVjdE5leHRDb252OiAob2Zmc2V0ID0gMSkgLT5cbiAgICAgICAgY29udiA9IHJlcXVpcmUgJy4vY29udidcbiAgICAgICAgaWQgPSBAc2VsZWN0ZWRDb252XG4gICAgICAgIGMgPSBjb252W2lkXVxuICAgICAgICBsaXN0ID0gKGkgZm9yIGkgaW4gY29udi5saXN0KCkgd2hlbiBub3QgY29udi5pc1B1cmVIYW5nb3V0KGkpKVxuICAgICAgICBmb3IgYywgaW5kZXggaW4gbGlzdFxuICAgICAgICAgICAgaWYgaWQgPT0gYy5jb252ZXJzYXRpb25faWQuaWRcbiAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBpbmRleCArIG9mZnNldFxuICAgICAgICAgICAgICAgIEBzZXRTZWxlY3RlZENvbnYgbGlzdFtjYW5kaWRhdGVdIGlmIGxpc3RbY2FuZGlkYXRlXVxuXG4gICAgc2VsZWN0Q29udkluZGV4OiAoaW5kZXggPSAwKSAtPlxuICAgICAgICBjb252ID0gcmVxdWlyZSAnLi9jb252J1xuICAgICAgICBsaXN0ID0gKGkgZm9yIGkgaW4gY29udi5saXN0KCkgd2hlbiBub3QgY29udi5pc1B1cmVIYW5nb3V0KGkpKVxuICAgICAgICBAc2V0U2VsZWN0ZWRDb252IGxpc3RbaW5kZXhdXG5cbiAgICB1cGRhdGVBdFRvcDogKGF0dG9wKSAtPlxuICAgICAgICByZXR1cm4gaWYgQGF0dG9wID09IGF0dG9wXG4gICAgICAgIEBhdHRvcCA9IGF0dG9wXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHVwZGF0ZUF0Qm90dG9tOiAoYXRib3R0b20pIC0+XG4gICAgICAgIHJldHVybiBpZiBAYXRib3R0b20gPT0gYXRib3R0b21cbiAgICAgICAgQGF0Ym90dG9tID0gYXRib3R0b21cbiAgICAgICAgQHVwZGF0ZUFjdGl2aXR5IERhdGUubm93KClcblxuICAgIHVwZGF0ZUFjdGl2aXR5OiAodGltZSkgLT5cbiAgICAgICAgY29udiA9IHJlcXVpcmUgJy4vY29udicgIyBjaXJjdWxhclxuICAgICAgICBAbGFzdEFjdGl2aXR5ID0gdGltZVxuICAgICAgICBsYXRlciAtPiBhY3Rpb24gJ2xhc3RBY3Rpdml0eSdcbiAgICAgICAgcmV0dXJuIHVubGVzcyBkb2N1bWVudC5oYXNGb2N1cygpIGFuZCBAYXRib3R0b20gYW5kIEBzdGF0ZSA9PSBTVEFURVMuU1RBVEVfTk9STUFMXG4gICAgICAgIGMgPSBjb252W0BzZWxlY3RlZENvbnZdXG4gICAgICAgIHJldHVybiB1bmxlc3MgY1xuICAgICAgICB1ciA9IGNvbnYudW5yZWFkIGNcbiAgICAgICAgaWYgdXIgPiAwXG4gICAgICAgICAgICBsYXRlciAtPiBhY3Rpb24gJ3VwZGF0ZXdhdGVybWFyaydcblxuICAgIHNldFNpemU6IChzaXplKSAtPlxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2l6ZSA9IEpTT04uc3RyaW5naWZ5KHNpemUpXG4gICAgICAgIEBzaXplID0gc2l6ZVxuICAgICAgICAjIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldFBvc2l0aW9uOiAocG9zKSAtPlxuICAgICAgICBsb2NhbFN0b3JhZ2UucG9zID0gSlNPTi5zdHJpbmdpZnkocG9zKVxuICAgICAgICBAcG9zID0gcG9zXG4gICAgICAgICMgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0TGVmdFNpemU6IChzaXplKSAtPlxuICAgICAgICByZXR1cm4gaWYgQGxlZnRTaXplID09IHNpemUgb3Igc2l6ZSA8IDE4MFxuICAgICAgICBAbGVmdFNpemUgPSBsb2NhbFN0b3JhZ2UubGVmdFNpemUgPSBzaXplXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldFpvb206ICh6b29tKSAtPlxuICAgICAgICBAem9vbSA9IGxvY2FsU3RvcmFnZS56b29tID0gZG9jdW1lbnQuYm9keS5zdHlsZS56b29tID0gem9vbVxuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnNldFByb3BlcnR5KCctLXpvb20nLCB6b29tKVxuXG4gICAgc2V0TG9nZ2VkaW46ICh2YWwpIC0+XG4gICAgICAgIEBsb2dnZWRpbiA9IHZhbFxuICAgICAgICB1cGRhdGVkICd2aWV3c3RhdGUnXG5cbiAgICBzZXRTaG93U2VlblN0YXR1czogKHZhbCkgLT5cbiAgICAgICAgQHNob3dzZWVuc3RhdHVzID0gbG9jYWxTdG9yYWdlLnNob3dzZWVuc3RhdHVzID0gISF2YWxcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0TGFzdEtleURvd246IGRvIC0+XG4gICAgICAgIHtUWVBJTkcsIFBBVVNFRCwgU1RPUFBFRH0gPSBDbGllbnQuVHlwaW5nU3RhdHVzXG4gICAgICAgIGxhc3RFbWl0dGVkID0gMFxuICAgICAgICB0aW1lb3V0ID0gMFxuICAgICAgICB1cGRhdGUgPSB0aHJvdHRsZSA1MDAsICh0aW1lKSAtPlxuICAgICAgICAgICAgY2xlYXJUaW1lb3V0IHRpbWVvdXQgaWYgdGltZW91dFxuICAgICAgICAgICAgdGltZW91dCA9IG51bGxcbiAgICAgICAgICAgIHVubGVzcyB0aW1lXG4gICAgICAgICAgICAgICAgbGFzdEVtaXR0ZWQgPSAwXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgaWYgdGltZSAtIGxhc3RFbWl0dGVkID4gNTAwMFxuICAgICAgICAgICAgICAgICAgICBsYXRlciAtPiBhY3Rpb24gJ3NldHR5cGluZycsIFRZUElOR1xuICAgICAgICAgICAgICAgICAgICBsYXN0RW1pdHRlZCA9IHRpbWVcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAtPlxuICAgICAgICAgICAgICAgICAgICAjIGFmdGVyIDYgc2Vjb2RzIG9mIG5vIGtleWJvYXJkLCB3ZSBjb25zaWRlciB0aGVcbiAgICAgICAgICAgICAgICAgICAgIyB1c2VyIHRvb2sgYSBicmVhay5cbiAgICAgICAgICAgICAgICAgICAgbGFzdEVtaXR0ZWQgPSAwXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiAnc2V0dHlwaW5nJywgUEFVU0VEXG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0IC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAjIGFuZCBhZnRlciBhbm90aGVyIDYgc2Vjb25kcyAoMTIgdG90YWwpLCB3ZVxuICAgICAgICAgICAgICAgICAgICAgICAgIyBjb25zaWRlciB0aGUgdHlwaW5nIHN0b3BwZWQgYWx0b2dldGhlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbiAnc2V0dHlwaW5nJywgU1RPUFBFRFxuICAgICAgICAgICAgICAgICAgICAsIDYwMDBcbiAgICAgICAgICAgICAgICAsIDYwMDBcblxuICAgIHNldFNob3dDb252TWluOiAoZG9zaG93KSAtPlxuICAgICAgICByZXR1cm4gaWYgQHNob3dDb252TWluID09IGRvc2hvd1xuICAgICAgICBAc2hvd0NvbnZNaW4gPSBsb2NhbFN0b3JhZ2Uuc2hvd0NvbnZNaW4gPSBkb3Nob3dcbiAgICAgICAgaWYgZG9zaG93XG4gICAgICAgICAgICB0aGlzLnNldFNob3dDb252VGh1bWJzKHRydWUpXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldFNob3dDb252VGh1bWJzOiAoZG9zaG93KSAtPlxuICAgICAgICByZXR1cm4gaWYgQHNob3dDb252VGh1bWJzID09IGRvc2hvd1xuICAgICAgICBAc2hvd0NvbnZUaHVtYnMgPSBsb2NhbFN0b3JhZ2Uuc2hvd0NvbnZUaHVtYnMgPSBkb3Nob3dcbiAgICAgICAgdW5sZXNzIGRvc2hvd1xuICAgICAgICAgICAgdGhpcy5zZXRTaG93Q29udk1pbihmYWxzZSlcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U2hvd0FuaW1hdGVkVGh1bWJzOiAoZG9zaG93KSAtPlxuICAgICAgICByZXR1cm4gaWYgQHNob3dBbmltYXRlZFRodW1icyA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dBbmltYXRlZFRodW1icyA9IGxvY2FsU3RvcmFnZS5zaG93QW5pbWF0ZWRUaHVtYnMgPSBkb3Nob3dcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U2hvd0NvbnZUaW1lOiAoZG9zaG93KSAtPlxuICAgICAgICByZXR1cm4gaWYgQHNob3dDb252VGltZSA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dDb252VGltZSA9IGxvY2FsU3RvcmFnZS5zaG93Q29udlRpbWUgPSBkb3Nob3dcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U2hvd0NvbnZMYXN0OiAoZG9zaG93KSAtPlxuICAgICAgICByZXR1cm4gaWYgQHNob3dDb252TGFzdCA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dDb252TGFzdCA9IGxvY2FsU3RvcmFnZS5zaG93Q29udkxhc3QgPSBkb3Nob3dcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U2hvd1BvcFVwTm90aWZpY2F0aW9uczogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIEBzaG93UG9wVXBOb3RpZmljYXRpb25zID09IGRvc2hvd1xuICAgICAgICBAc2hvd1BvcFVwTm90aWZpY2F0aW9ucyA9IGxvY2FsU3RvcmFnZS5zaG93UG9wVXBOb3RpZmljYXRpb25zID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldFNob3dNZXNzYWdlSW5Ob3RpZmljYXRpb246IChkb3Nob3cpIC0+XG4gICAgICAgIHJldHVybiBpZiBAc2hvd01lc3NhZ2VJbk5vdGlmaWNhdGlvbiA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dNZXNzYWdlSW5Ob3RpZmljYXRpb24gPSBsb2NhbFN0b3JhZ2Uuc2hvd01lc3NhZ2VJbk5vdGlmaWNhdGlvbiA9IGRvc2hvd1xuICAgICAgICB1cGRhdGVkICd2aWV3c3RhdGUnXG5cbiAgICBzZXRTaG93VXNlcm5hbWVJbk5vdGlmaWNhdGlvbjogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIEBzaG93VXNlcm5hbWVJbk5vdGlmaWNhdGlvbiA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dVc2VybmFtZUluTm90aWZpY2F0aW9uID0gbG9jYWxTdG9yYWdlLnNob3dVc2VybmFtZUluTm90aWZpY2F0aW9uID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldEZvcmNlQ3VzdG9tU291bmQ6IChkb3Nob3cpIC0+XG4gICAgICAgIHJldHVybiBpZiBsb2NhbFN0b3JhZ2UuZm9yY2VDdXN0b21Tb3VuZCA9PSBkb3Nob3dcbiAgICAgICAgQGZvcmNlQ3VzdG9tU291bmQgPSBsb2NhbFN0b3JhZ2UuZm9yY2VDdXN0b21Tb3VuZCA9IGRvc2hvd1xuICAgICAgICB1cGRhdGVkICd2aWV3c3RhdGUnXG5cbiAgICBzZXRTaG93SWNvbk5vdGlmaWNhdGlvbjogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIGxvY2FsU3RvcmFnZS5zaG93SWNvbk5vdGlmaWNhdGlvbiA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dJY29uTm90aWZpY2F0aW9uID0gbG9jYWxTdG9yYWdlLnNob3dJY29uTm90aWZpY2F0aW9uID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldE11dGVTb3VuZE5vdGlmaWNhdGlvbjogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIGxvY2FsU3RvcmFnZS5tdXRlU291bmROb3RpZmljYXRpb24gPT0gZG9zaG93XG4gICAgICAgIEBtdXRlU291bmROb3RpZmljYXRpb24gPSBsb2NhbFN0b3JhZ2UubXV0ZVNvdW5kTm90aWZpY2F0aW9uID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldENvbnZlcnRFbW9qaTogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIEBjb252ZXJ0RW1vamkgPT0gZG9zaG93XG4gICAgICAgIEBjb252ZXJ0RW1vamkgPSBsb2NhbFN0b3JhZ2UuY29udmVydEVtb2ppID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldFN1Z2dlc3RFbW9qaTogKGRvc2hvdykgLT5cbiAgICAgICAgcmV0dXJuIGlmIEBzdWdnZXN0RW1vamkgPT0gZG9zaG93XG4gICAgICAgIEBzdWdnZXN0RW1vamkgPSBsb2NhbFN0b3JhZ2Uuc3VnZ2VzdEVtb2ppID0gZG9zaG93XG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldHNob3dJbWFnZVByZXZpZXc6IChkb3Nob3cpIC0+XG4gICAgICAgIHJldHVybiBpZiBAc2hvd0ltYWdlUHJldmlldyA9PSBkb3Nob3dcbiAgICAgICAgQHNob3dJbWFnZVByZXZpZXcgPSBsb2NhbFN0b3JhZ2Uuc2hvd0ltYWdlUHJldmlldyA9IGRvc2hvd1xuICAgICAgICB1cGRhdGVkICd2aWV3c3RhdGUnXG5cbiAgICBzZXRDb2xvclNjaGVtZTogKGNvbG9yc2NoZW1lKSAtPlxuICAgICAgICBAY29sb3JTY2hlbWUgPSBsb2NhbFN0b3JhZ2UuY29sb3JTY2hlbWUgPSBjb2xvcnNjaGVtZVxuICAgICAgICB3aGlsZSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdodG1sJykuY2xhc3NMaXN0Lmxlbmd0aCA+IDBcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5jbGFzc0xpc3QucmVtb3ZlIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5jbGFzc0xpc3QuaXRlbSgwKVxuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdodG1sJykuY2xhc3NMaXN0LmFkZChjb2xvcnNjaGVtZSlcblxuICAgIHNldEZvbnRTaXplOiAoZm9udHNpemUpIC0+XG4gICAgICAgIEBmb250U2l6ZSA9IGxvY2FsU3RvcmFnZS5mb250U2l6ZSA9IGZvbnRzaXplXG4gICAgICAgIHdoaWxlIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5jbGFzc0xpc3QubGVuZ3RoID4gMFxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpLmNsYXNzTGlzdC5yZW1vdmUgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpLmNsYXNzTGlzdC5pdGVtKDApXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2h0bWwnKS5jbGFzc0xpc3QuYWRkKGxvY2FsU3RvcmFnZS5jb2xvclNjaGVtZSlcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaHRtbCcpLmNsYXNzTGlzdC5hZGQoZm9udHNpemUpXG5cbiAgICBzZXRFc2NhcGVDbGVhcnNJbnB1dDogKHZhbHVlKSAtPlxuICAgICAgICBAZXNjYXBlQ2xlYXJzSW5wdXQgPSBsb2NhbFN0b3JhZ2UuZXNjYXBlQ2xlYXJzSW5wdXQgPSB2YWx1ZVxuICAgICAgICB1cGRhdGVkICd2aWV3c3RhdGUnXG5cbiAgICBzZXRTaG93VHJheTogKHZhbHVlKSAtPlxuICAgICAgICBAc2hvd3RyYXkgPSBsb2NhbFN0b3JhZ2Uuc2hvd3RyYXkgPSB2YWx1ZVxuXG4gICAgICAgIGlmIG5vdCBAc2hvd3RyYXlcbiAgICAgICAgICAgIEBzZXRDbG9zZVRvVHJheShmYWxzZSlcbiAgICAgICAgICAgIEBzZXRTdGFydE1pbmltaXplZFRvVHJheShmYWxzZSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0SGlkZURvY2tJY29uOiAodmFsdWUpIC0+XG4gICAgICAgIEBoaWRlZG9ja2ljb24gPSBsb2NhbFN0b3JhZ2UuaGlkZWRvY2tpY29uID0gdmFsdWVcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U3RhcnRNaW5pbWl6ZWRUb1RyYXk6ICh2YWx1ZSkgLT5cbiAgICAgICAgQHN0YXJ0bWluaW1pemVkdG90cmF5ID0gbG9jYWxTdG9yYWdlLnN0YXJ0bWluaW1pemVkdG90cmF5ID0gdmFsdWVcbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgc2V0U2hvd0RvY2tJY29uT25jZTogKHZhbHVlKSAtPlxuICAgICAgICBAc2hvd0RvY2tJY29uT25jZSA9IHZhbHVlXG5cbiAgICBzZXRDbG9zZVRvVHJheTogKHZhbHVlKSAtPlxuICAgICAgICBAY2xvc2V0b3RyYXkgPSBsb2NhbFN0b3JhZ2UuY2xvc2V0b3RyYXkgPSAhIXZhbHVlXG4gICAgICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuICAgIHNldE9wZW5PblN5c3RlbVN0YXJ0dXA6IChvcGVuKSAtPlxuICAgICAgICByZXR1cm4gaWYgQG9wZW5PblN5c3RlbVN0YXJ0dXAgPT0gb3BlblxuXG4gICAgICAgIGlmIG9wZW5cbiAgICAgICAgICAgIGF1dG9MYXVuY2hlci5lbmFibGUoKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBhdXRvTGF1bmNoZXIuZGlzYWJsZSgpXG5cbiAgICAgICAgQG9wZW5PblN5c3RlbVN0YXJ0dXAgPSBvcGVuXG5cbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xuXG4gICAgaW5pdE9wZW5PblN5c3RlbVN0YXJ0dXA6IChpc0VuYWJsZWQpIC0+XG4gICAgICAgIEBvcGVuT25TeXN0ZW1TdGFydHVwID0gaXNFbmFibGVkXG5cbiAgICAgICAgdXBkYXRlZCAndmlld3N0YXRlJ1xufVxuXG5tZXJnZSBleHAsIFNUQVRFU1xuIl19
