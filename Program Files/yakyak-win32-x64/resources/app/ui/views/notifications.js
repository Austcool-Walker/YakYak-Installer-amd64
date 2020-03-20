(function() {
  var audioEl, audioFile, callNeedAnswer, fixlink, getProxiedName, i18n, nameof, notificationCenterSupportsSound, notifier, notifierSupportsSound, openHangout, path, remote, shell, textMessage;

  notifier = require('node-notifier');

  shell = require('electron').shell;

  path = require('path');

  remote = require('electron').remote;

  i18n = require('i18n');

  ({nameof, getProxiedName, fixlink, notificationCenterSupportsSound} = require('../util'));

  // conv_id markers for call notifications
  callNeedAnswer = {};

  notifierSupportsSound = notificationCenterSupportsSound();

  // Custom sound for new message notifications
  audioFile = path.join(YAKYAK_ROOT_DIR, '..', 'media', 'new_message.ogg');

  audioEl = new Audio(audioFile);

  audioEl.volume = .4;

  module.exports = function(models) {
    var conv, entity, mainWindow, notify, quietIf, tonot, viewstate;
    ({conv, notify, entity, viewstate} = models);
    tonot = notify.popToNotify();
    // And we hope we don't get another 'currentWindow' ;)
    mainWindow = remote.getCurrentWindow();
    quietIf = function(c, chat_id) {
      return (mainWindow.isVisible() && mainWindow.isFocused()) || conv.isQuiet(c) || entity.isSelf(chat_id);
    };
    return tonot.forEach(function(msg) {
      var c, chat_id, cid, contentImage, conv_id, icon, isNotificationCenter, proxied, ref, ref1, ref2, ref3, ref4, ref5, ref6, sender, text;
      conv_id = msg != null ? (ref = msg.conversation_id) != null ? ref.id : void 0 : void 0;
      c = conv[conv_id];
      chat_id = msg != null ? (ref1 = msg.sender_id) != null ? ref1.chat_id : void 0 : void 0;
      proxied = getProxiedName(msg);
      cid = proxied ? proxied : msg != null ? (ref2 = msg.sender_id) != null ? ref2.chat_id : void 0 : void 0;
      sender = nameof(entity[cid]);
      text = null;
      if (msg.chat_message != null) {
        if (((ref3 = msg.chat_message) != null ? ref3.message_content : void 0) == null) {
          return;
        }
        text = textMessage(msg.chat_message.message_content, proxied, viewstate.showMessageInNotification);
      } else if (((ref4 = msg.hangout_event) != null ? ref4.event_type : void 0) === 'START_HANGOUT') {
        text = i18n.__("call.incoming:Incoming call");
        callNeedAnswer[conv_id] = true;
        notr({
          html: `${i18n.__('call.incoming_from:Incoming call from %s', sender)}. ` + `<a href=\"#\" class=\"accept\">${i18n.__('call.accept:Accept')}</a> / ` + `<a href=\"#\" class=\"reject\">${i18n.__('call.reject:Reject')}</a>`,
          stay: 0,
          id: `hang${conv_id}`,
          onclick: function(e) {
            var ref5;
            delete callNeedAnswer[conv_id];
            if ((e != null ? (ref5 = e.target) != null ? ref5.className : void 0 : void 0) === 'accept') {
              notr({
                html: i18n.__('calls.accepted:Accepted'),
                stay: 1000,
                id: `hang${conv_id}`
              });
              return openHangout(conv_id);
            } else {
              return notr({
                html: i18n.__('calls.rejected:Rejected'),
                stay: 1000,
                id: `hang${conv_id}`
              });
            }
          }
        });
      } else if (((ref5 = msg.hangout_event) != null ? ref5.event_type : void 0) === 'END_HANGOUT') {
        if (callNeedAnswer[conv_id]) {
          delete callNeedAnswer[conv_id];
          notr({
            html: `${i18n.__('calls.missed:Missed call from %s', sender)}. ` + `<a href=\"#\">${i18n.__('actions.ok: Ok')}</a>`,
            id: `hang${conv_id}`,
            stay: 0
          });
        }
      } else {
        return;
      }
      if (!text || quietIf(c, chat_id)) {
        return;
      }
      if (viewstate.showPopUpNotifications && !(mainWindow.isVisible() && mainWindow.isFocused())) {
        isNotificationCenter = notifier.constructor.name === 'NotificationCenter';
        
        icon = path.join(__dirname, '..', '..', 'icons', 'icon@8.png');
        // Only for NotificationCenter (darwin)
        if (isNotificationCenter && viewstate.showIconNotification) {
          contentImage = fixlink((ref6 = entity[cid]) != null ? ref6.photo_url : void 0);
        } else {
          contentImage = void 0;
        }
        
        notifier.notify({
          title: viewstate.showUsernameInNotification ? !isNotificationCenter && !viewstate.showIconNotification ? `${sender} (YakYak)` : sender : 'YakYak',
          message: text,
          wait: true,
          hint: "int:transient:1",
          category: 'im.received',
          sender: 'com.github.yakyak',
          sound: !viewstate.muteSoundNotification && (notifierSupportsSound && !viewstate.forceCustomSound),
          icon: !isNotificationCenter && viewstate.showIconNotification ? icon : void 0,
          contentImage: contentImage
        }, function(err, res) {
          if (res != null ? res.trim().match(/Activate/i) : void 0) {
            action('appfocus');
            return action('selectConv', c);
          }
        });
        if ((!notifierSupportsSound || viewstate.forceCustomSound) && !viewstate.muteSoundNotification && audioEl.paused) {
          return audioEl.play();
        }
      }
    });
  };

  //if not mainWindow.isVisible()
  //    mainWindow.showInactive()
  //    mainWindow.minimize()
  // mainWindow.flashFrame(true)
  textMessage = function(cont, proxied, showMessage = true) {
    var i, seg, segs;
    if ((cont != null ? cont.segment : void 0) != null) {
      if (!showMessage) {
        return i18n.__('conversation.new_message:New message received');
      } else {
        segs = (function() {
          var j, len, ref, ref1, results;
          ref1 = (ref = cont != null ? cont.segment : void 0) != null ? ref : [];
          results = [];
          for (i = j = 0, len = ref1.length; j < len; i = ++j) {
            seg = ref1[i];
            if (proxied && i < 2) {
              continue;
            }
            if (!seg.text) {
              continue;
            }
            results.push(seg.text);
          }
          return results;
        })();
        return segs.join('');
      }
    } else if ((cont != null ? cont.attachment : void 0) != null) {
      return i18n.__('conversation.new_attachment:New message received (image or video)');
    }
  };

  openHangout = function(conv_id) {
    return shell.openExternal(`https://plus.google.com/hangouts/_/CONVERSATION/${conv_id}`);
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3Mvbm90aWZpY2F0aW9ucy5qcyIsInNvdXJjZXMiOlsidWkvdmlld3Mvbm90aWZpY2F0aW9ucy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLE9BQUEsRUFBQSxTQUFBLEVBQUEsY0FBQSxFQUFBLE9BQUEsRUFBQSxjQUFBLEVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSwrQkFBQSxFQUFBLFFBQUEsRUFBQSxxQkFBQSxFQUFBLFdBQUEsRUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLEtBQUEsRUFBQTs7RUFBQSxRQUFBLEdBQVcsT0FBQSxDQUFRLGVBQVI7O0VBQ1gsS0FBQSxHQUFXLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBQy9CLElBQUEsR0FBVyxPQUFBLENBQVEsTUFBUjs7RUFDWCxNQUFBLEdBQVcsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFDL0IsSUFBQSxHQUFXLE9BQUEsQ0FBUSxNQUFSOztFQUVYLENBQUEsQ0FBQyxNQUFELEVBQVMsY0FBVCxFQUF5QixPQUF6QixFQUFrQywrQkFBbEMsQ0FBQSxHQUFxRSxPQUFBLENBQVEsU0FBUixDQUFyRSxFQU5BOzs7RUFTQSxjQUFBLEdBQWlCLENBQUE7O0VBRWpCLHFCQUFBLEdBQXdCLCtCQUFBLENBQUEsRUFYeEI7OztFQWNBLFNBQUEsR0FBWSxJQUFJLENBQUMsSUFBTCxDQUFVLGVBQVYsRUFBMkIsSUFBM0IsRUFBaUMsT0FBakMsRUFDWixpQkFEWTs7RUFFWixPQUFBLEdBQVUsSUFBSSxLQUFKLENBQVUsU0FBVjs7RUFDVixPQUFPLENBQUMsTUFBUixHQUFpQjs7RUFHakIsTUFBTSxDQUFDLE9BQVAsR0FBaUIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUNqQixRQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBO0lBQUksQ0FBQSxDQUFDLElBQUQsRUFBTyxNQUFQLEVBQWUsTUFB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QUEsdUJBQUE7O1lBQ0EsS0FBZ0IsR0FBRyxDQUFDLElBQXBCO0FBQUEsdUJBQUE7O3lCQUNBLEdBQUcsQ0FBQztVQUhELENBQUE7OztlQUlQLElBQUksQ0FBQyxJQUFMLENBQVUsRUFBVixFQVBKO09BREY7S0FBQSxNQVNLLElBQUcsaURBQUg7YUFDSCxJQUFJLENBQUMsRUFBTCxDQUFRLG1FQUFSLEVBREc7O0VBVks7O0VBYWQsV0FBQSxHQUFjLFFBQUEsQ0FBQyxPQUFELENBQUE7V0FDVixLQUFLLENBQUMsWUFBTixDQUFtQixDQUFBLGdEQUFBLENBQUEsQ0FBbUQsT0FBbkQsQ0FBQSxDQUFuQjtFQURVO0FBOUhkIiwic291cmNlc0NvbnRlbnQiOlsibm90aWZpZXIgPSByZXF1aXJlICdub2RlLW5vdGlmaWVyJ1xuc2hlbGwgICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLnNoZWxsXG5wYXRoICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5yZW1vdGUgICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykucmVtb3RlXG5pMThuICAgICA9IHJlcXVpcmUgJ2kxOG4nXG5cbntuYW1lb2YsIGdldFByb3hpZWROYW1lLCBmaXhsaW5rLCBub3RpZmljYXRpb25DZW50ZXJTdXBwb3J0c1NvdW5kfSA9IHJlcXVpcmUgJy4uL3V0aWwnXG5cbiMgY29udl9pZCBtYXJrZXJzIGZvciBjYWxsIG5vdGlmaWNhdGlvbnNcbmNhbGxOZWVkQW5zd2VyID0ge31cblxubm90aWZpZXJTdXBwb3J0c1NvdW5kID0gbm90aWZpY2F0aW9uQ2VudGVyU3VwcG9ydHNTb3VuZCgpXG5cbiMgQ3VzdG9tIHNvdW5kIGZvciBuZXcgbWVzc2FnZSBub3RpZmljYXRpb25zXG5hdWRpb0ZpbGUgPSBwYXRoLmpvaW4gWUFLWUFLX1JPT1RfRElSLCAnLi4nLCAnbWVkaWEnLFxuJ25ld19tZXNzYWdlLm9nZydcbmF1ZGlvRWwgPSBuZXcgQXVkaW8oYXVkaW9GaWxlKVxuYXVkaW9FbC52b2x1bWUgPSAuNFxuXG5cbm1vZHVsZS5leHBvcnRzID0gKG1vZGVscykgLT5cbiAgICB7Y29udiwgbm90aWZ5LCBlbnRpdHksIHZpZXdzdGF0ZX0gPSBtb2RlbHNcbiAgICB0b25vdCA9IG5vdGlmeS5wb3BUb05vdGlmeSgpXG5cbiAgICAjIEFuZCB3ZSBob3BlIHdlIGRvbid0IGdldCBhbm90aGVyICdjdXJyZW50V2luZG93JyA7KVxuICAgIG1haW5XaW5kb3cgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG5cbiAgICBxdWlldElmID0gKGMsIGNoYXRfaWQpIC0+IChtYWluV2luZG93LmlzVmlzaWJsZSgpIGFuZCBtYWluV2luZG93LmlzRm9jdXNlZCgpKSBvciBjb252LmlzUXVpZXQoYykgb3IgZW50aXR5LmlzU2VsZihjaGF0X2lkKVxuXG4gICAgdG9ub3QuZm9yRWFjaCAobXNnKSAtPlxuICAgICAgICBjb252X2lkID0gbXNnPy5jb252ZXJzYXRpb25faWQ/LmlkXG4gICAgICAgIGMgPSBjb252W2NvbnZfaWRdXG4gICAgICAgIGNoYXRfaWQgPSBtc2c/LnNlbmRlcl9pZD8uY2hhdF9pZFxuXG4gICAgICAgIHByb3hpZWQgPSBnZXRQcm94aWVkTmFtZShtc2cpXG4gICAgICAgIGNpZCA9IGlmIHByb3hpZWQgdGhlbiBwcm94aWVkIGVsc2UgbXNnPy5zZW5kZXJfaWQ/LmNoYXRfaWRcbiAgICAgICAgc2VuZGVyID0gbmFtZW9mIGVudGl0eVtjaWRdXG4gICAgICAgIHRleHQgPSBudWxsXG5cbiAgICAgICAgaWYgbXNnLmNoYXRfbWVzc2FnZT9cbiAgICAgICAgICAgIHJldHVybiB1bmxlc3MgbXNnLmNoYXRfbWVzc2FnZT8ubWVzc2FnZV9jb250ZW50P1xuICAgICAgICAgICAgdGV4dCA9IHRleHRNZXNzYWdlIG1zZy5jaGF0X21lc3NhZ2UubWVzc2FnZV9jb250ZW50LCBwcm94aWVkLCB2aWV3c3RhdGUuc2hvd01lc3NhZ2VJbk5vdGlmaWNhdGlvblxuICAgICAgICBlbHNlIGlmIG1zZy5oYW5nb3V0X2V2ZW50Py5ldmVudF90eXBlID09ICdTVEFSVF9IQU5HT1VUJ1xuICAgICAgICAgICAgdGV4dCA9IGkxOG4uX18gXCJjYWxsLmluY29taW5nOkluY29taW5nIGNhbGxcIlxuICAgICAgICAgICAgY2FsbE5lZWRBbnN3ZXJbY29udl9pZF0gPSB0cnVlXG4gICAgICAgICAgICBub3RyXG4gICAgICAgICAgICAgICAgaHRtbDogXCIje2kxOG4uX18oJ2NhbGwuaW5jb21pbmdfZnJvbTpJbmNvbWluZyBjYWxsIGZyb20gJXMnLCBzZW5kZXIpfS4gXCIgK1xuICAgICAgICAgICAgICAgIFwiPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcImFjY2VwdFxcXCI+I3tpMThuLl9fICdjYWxsLmFjY2VwdDpBY2NlcHQnfTwvYT4gLyBcIiArXG4gICAgICAgICAgICAgICAgXCI8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwicmVqZWN0XFxcIj4je2kxOG4uX18gJ2NhbGwucmVqZWN0OlJlamVjdCd9PC9hPlwiXG4gICAgICAgICAgICAgICAgc3RheTogMFxuICAgICAgICAgICAgICAgIGlkOiBcImhhbmcje2NvbnZfaWR9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrOiAoZSkgLT5cbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGNhbGxOZWVkQW5zd2VyW2NvbnZfaWRdXG4gICAgICAgICAgICAgICAgICAgIGlmIGU/LnRhcmdldD8uY2xhc3NOYW1lID09ICdhY2NlcHQnXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RyKHtodG1sOmkxOG4uX18oJ2NhbGxzLmFjY2VwdGVkOkFjY2VwdGVkJyksIHN0YXk6MTAwMCwgaWQ6XCJoYW5nI3tjb252X2lkfVwifSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5IYW5nb3V0IGNvbnZfaWRcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbm90cih7aHRtbDogaTE4bi5fXygnY2FsbHMucmVqZWN0ZWQ6UmVqZWN0ZWQnKSwgc3RheToxMDAwLCBpZDpcImhhbmcje2NvbnZfaWR9XCJ9KVxuICAgICAgICBlbHNlIGlmIG1zZy5oYW5nb3V0X2V2ZW50Py5ldmVudF90eXBlID09ICdFTkRfSEFOR09VVCdcbiAgICAgICAgICAgIGlmIGNhbGxOZWVkQW5zd2VyW2NvbnZfaWRdXG4gICAgICAgICAgICAgICAgZGVsZXRlIGNhbGxOZWVkQW5zd2VyW2NvbnZfaWRdXG4gICAgICAgICAgICAgICAgbm90clxuICAgICAgICAgICAgICAgICAgICBodG1sOiBcIiN7aTE4bi5fXygnY2FsbHMubWlzc2VkOk1pc3NlZCBjYWxsIGZyb20gJXMnLCBzZW5kZXIpfS4gXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgXCI8YSBocmVmPVxcXCIjXFxcIj4je2kxOG4uX18oJ2FjdGlvbnMub2s6IE9rJyl9PC9hPlwiXG4gICAgICAgICAgICAgICAgICAgIGlkOiBcImhhbmcje2NvbnZfaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgc3RheTogMFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICAjIG1heWJlIHRyaWdnZXIgT1Mgbm90aWZpY2F0aW9uXG4gICAgICAgIHJldHVybiBpZiAhdGV4dCBvciBxdWlldElmKGMsIGNoYXRfaWQpXG5cbiAgICAgICAgaWYgdmlld3N0YXRlLnNob3dQb3BVcE5vdGlmaWNhdGlvbnMgYW5kIG5vdCAobWFpbldpbmRvdy5pc1Zpc2libGUoKSBhbmQgbWFpbldpbmRvdy5pc0ZvY3VzZWQoKSlcbiAgICAgICAgICAgIGlzTm90aWZpY2F0aW9uQ2VudGVyID0gbm90aWZpZXIuY29uc3RydWN0b3IubmFtZSA9PSAnTm90aWZpY2F0aW9uQ2VudGVyJ1xuICAgICAgICAgICAgI1xuICAgICAgICAgICAgaWNvbiA9IHBhdGguam9pbiBfX2Rpcm5hbWUsICcuLicsICcuLicsICdpY29ucycsICdpY29uQDgucG5nJ1xuICAgICAgICAgICAgIyBPbmx5IGZvciBOb3RpZmljYXRpb25DZW50ZXIgKGRhcndpbilcbiAgICAgICAgICAgIGlmIGlzTm90aWZpY2F0aW9uQ2VudGVyICYmIHZpZXdzdGF0ZS5zaG93SWNvbk5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgIGNvbnRlbnRJbWFnZSA9IGZpeGxpbmsgZW50aXR5W2NpZF0/LnBob3RvX3VybFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGNvbnRlbnRJbWFnZSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgI1xuICAgICAgICAgICAgbm90aWZpZXIubm90aWZ5XG4gICAgICAgICAgICAgICAgdGl0bGU6IGlmIHZpZXdzdGF0ZS5zaG93VXNlcm5hbWVJbk5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgIWlzTm90aWZpY2F0aW9uQ2VudGVyICYmICF2aWV3c3RhdGUuc2hvd0ljb25Ob3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiN7c2VuZGVyfSAoWWFrWWFrKVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZGVyXG4gICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICdZYWtZYWsnXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogdGV4dFxuICAgICAgICAgICAgICAgIHdhaXQ6IHRydWVcbiAgICAgICAgICAgICAgICBoaW50OiBcImludDp0cmFuc2llbnQ6MVwiXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdpbS5yZWNlaXZlZCdcbiAgICAgICAgICAgICAgICBzZW5kZXI6ICdjb20uZ2l0aHViLnlha3lhaydcbiAgICAgICAgICAgICAgICBzb3VuZDogIXZpZXdzdGF0ZS5tdXRlU291bmROb3RpZmljYXRpb24gJiYgKG5vdGlmaWVyU3VwcG9ydHNTb3VuZCAmJiAhdmlld3N0YXRlLmZvcmNlQ3VzdG9tU291bmQpXG4gICAgICAgICAgICAgICAgaWNvbjogaWNvbiBpZiAhaXNOb3RpZmljYXRpb25DZW50ZXIgJiYgdmlld3N0YXRlLnNob3dJY29uTm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgY29udGVudEltYWdlOiBjb250ZW50SW1hZ2VcbiAgICAgICAgICAgICwgKGVyciwgcmVzKSAtPlxuICAgICAgICAgICAgICBpZiByZXM/LnRyaW0oKS5tYXRjaCgvQWN0aXZhdGUvaSlcbiAgICAgICAgICAgICAgICBhY3Rpb24gJ2FwcGZvY3VzJ1xuICAgICAgICAgICAgICAgIGFjdGlvbiAnc2VsZWN0Q29udicsIGNcblxuICAgICAgICAgICAgIyBvbmx5IHBsYXkgaWYgaXQgaXMgbm90IHBsYXlpbmcgYWxyZWFkeVxuICAgICAgICAgICAgIyAgYW5kIG5vdGlmaWVyIGRvZXMgbm90IHN1cHBvcnQgc291bmQgb3IgZm9yY2UgY3VzdG9tIHNvdW5kIGlzIHNldFxuICAgICAgICAgICAgIyAgYW5kIG11dGUgb3B0aW9uIGlzIG5vdCBzZXRcbiAgICAgICAgICAgIGlmICghbm90aWZpZXJTdXBwb3J0c1NvdW5kIHx8IHZpZXdzdGF0ZS5mb3JjZUN1c3RvbVNvdW5kKSAmJiAhdmlld3N0YXRlLm11dGVTb3VuZE5vdGlmaWNhdGlvbiAmJiBhdWRpb0VsLnBhdXNlZFxuICAgICAgICAgICAgICAgIGF1ZGlvRWwucGxheSgpXG4gICAgICAgICNpZiBub3QgbWFpbldpbmRvdy5pc1Zpc2libGUoKVxuICAgICAgICAjICAgIG1haW5XaW5kb3cuc2hvd0luYWN0aXZlKClcbiAgICAgICAgIyAgICBtYWluV2luZG93Lm1pbmltaXplKClcbiAgICAgICAgIyBtYWluV2luZG93LmZsYXNoRnJhbWUodHJ1ZSlcblxudGV4dE1lc3NhZ2UgPSAoY29udCwgcHJveGllZCwgc2hvd01lc3NhZ2UgPSB0cnVlKSAtPlxuICAgIGlmIGNvbnQ/LnNlZ21lbnQ/XG4gICAgICB1bmxlc3Mgc2hvd01lc3NhZ2VcbiAgICAgICAgICBpMThuLl9fKCdjb252ZXJzYXRpb24ubmV3X21lc3NhZ2U6TmV3IG1lc3NhZ2UgcmVjZWl2ZWQnKVxuICAgICAgZWxzZVxuICAgICAgICAgIHNlZ3MgPSBmb3Igc2VnLCBpIGluIGNvbnQ/LnNlZ21lbnQgPyBbXVxuICAgICAgICAgICAgICBjb250aW51ZSBpZiBwcm94aWVkIGFuZCBpIDwgMlxuICAgICAgICAgICAgICBjb250aW51ZSB1bmxlc3Mgc2VnLnRleHRcbiAgICAgICAgICAgICAgc2VnLnRleHRcbiAgICAgICAgICBzZWdzLmpvaW4oJycpXG4gICAgZWxzZSBpZiBjb250Py5hdHRhY2htZW50P1xuICAgICAgaTE4bi5fXygnY29udmVyc2F0aW9uLm5ld19hdHRhY2htZW50Ok5ldyBtZXNzYWdlIHJlY2VpdmVkIChpbWFnZSBvciB2aWRlbyknKVxuXG5vcGVuSGFuZ291dCA9IChjb252X2lkKSAtPlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tL2hhbmdvdXRzL18vQ09OVkVSU0FUSU9OLyN7Y29udl9pZH1cIlxuIl19
