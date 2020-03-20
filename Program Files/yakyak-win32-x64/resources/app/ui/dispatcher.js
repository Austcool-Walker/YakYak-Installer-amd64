(function() {
  var Client, clipboard, connection, conv, convsettings, entity, fs, insertTextAtCursor, ipc, isImg, later, mime, nameof, notify, remote, resendfocus, sendsetpresence, throttle, userinput, viewstate,
    indexOf = [].indexOf;

  Client = require('hangupsjs');

  remote = require('electron').remote;

  ipc = require('electron').ipcRenderer;

  fs = require('fs');

  mime = require('mime-types');

  clipboard = require('electron').clipboard;

  ({entity, conv, viewstate, userinput, connection, convsettings, notify} = require('./models'));

  ({insertTextAtCursor, throttle, later, isImg, nameof} = require('./util'));

  'connecting connected connect_failed'.split(' ').forEach(function(n) {
    return handle(n, function() {
      return connection.setState(n);
    });
  });

  handle('alive', function(time) {
    return connection.setLastActive(time);
  });

  handle('reqinit', function() {
    ipc.send('reqinit');
    connection.setState(connection.CONNECTING);
    return viewstate.setState(viewstate.STATE_STARTUP);
  });

  module.exports = {
    init: function({init}) {
      return action('init', init);
    }
  };

  handle('init', function(init) {
    var ref, ref1;
    // set the initial view state
    viewstate.setLoggedin(true);
    viewstate.setColorScheme(viewstate.colorScheme);
    viewstate.setFontSize(viewstate.fontSize);
    // update model from init object
    entity._initFromSelfEntity(init.self_entity);
    if (init.entities) {
      entity._initFromEntities(init.entities);
    }
    conv._initFromConvStates(init.conv_states);
    // ensure there's a selected conv
    if (!conv[viewstate.selectedConv]) {
      viewstate.setSelectedConv((ref = conv.list()) != null ? (ref1 = ref[0]) != null ? ref1.conversation_id : void 0 : void 0);
    }
    // explicit retrieval of conversation metadata
    //  this is required since #1109
    conv.list().forEach(function(el) {
      var ref2, ref3;
      if ((((ref2 = el.self_conversation_state) != null ? (ref3 = ref2.self_read_state) != null ? ref3.latest_read_timestamp : void 0 : void 0) != null) === 0) {
        return ipc.send('updateConversation', el.conversation_id.id);
      }
    });
    ipc.send('initpresence', entity.list());
    require('./version').check();
    // small delay for better experience
    return later(function() {
      return action('set_viewstate_normal');
    });
  });

  handle('set_viewstate_normal', function() {
    viewstate.setContacts(true);
    return viewstate.setState(viewstate.STATE_NORMAL);
  });

  handle('chat_message', function(ev) {
    if (entity[ev.sender_id.chat_id] == null) {
      // TODO entity is not fetched in usable time for first notification
      // if does not have user on cache
      entity.needEntity(ev.sender_id.chat_id);
    }
    // add chat to conversation
    conv.addChatMessage(ev);
    // these messages are to go through notifications
    return notify.addToNotify(ev);
  });

  handle('watermark', function(ev) {
    return conv.addWatermark(ev);
  });

  handle('presence', function(ev) {
    return entity.setPresence(ev[0][0][0][0], ev[0][0][1][1] === 1 ? true : false);
  });

  // handle 'self_presence', (ev) ->
  //     console.log 'self_presence', ev
  handle('querypresence', function(id) {
    return ipc.send('querypresence', id);
  });

  handle('setpresence', function(r) {
    var ref, ref1, ref2;
    if ((r != null ? (ref = r.presence) != null ? ref.available : void 0 : void 0) == null) {
      return console.log(`setpresence: User '${nameof(entity[r != null ? (ref1 = r.user_id) != null ? ref1.chat_id : void 0 : void 0])}' does not show his/hers/it status`, r);
    } else {
      return entity.setPresence(r.user_id.chat_id, r != null ? (ref2 = r.presence) != null ? ref2.available : void 0 : void 0);
    }
  });

  handle('update:unreadcount', function() {
    return console.log('update');
  });

  handle('addconversation', function() {
    viewstate.setState(viewstate.STATE_ADD_CONVERSATION);
    return convsettings.reset();
  });

  handle('convsettings', function() {
    var id;
    id = viewstate.selectedConv;
    if (!conv[id]) {
      return;
    }
    convsettings.reset();
    convsettings.loadConversation(conv[id]);
    return viewstate.setState(viewstate.STATE_ADD_CONVERSATION);
  });

  handle('activity', function(time) {
    return viewstate.updateActivity(time);
  });

  handle('atbottom', function(atbottom) {
    return viewstate.updateAtBottom(atbottom);
  });

  handle('attop', function(attop) {
    viewstate.updateAtTop(attop);
    return conv.updateAtTop(attop);
  });

  handle('history', function(conv_id, timestamp) {
    return ipc.send('getconversation', conv_id, timestamp, 20);
  });

  handle('handleconversationmetadata', function(r) {
    if (!r.conversation_state) {
      return;
    }
    // removing events so they don't get merged
    r.conversation_state.event = null;
    return conv.updateMetadata(r.conversation_state);
  });

  handle('handlehistory', function(r) {
    if (!r.conversation_state) {
      return;
    }
    return conv.updateHistory(r.conversation_state);
  });

  handle('selectConv', function(conv) {
    viewstate.setState(viewstate.STATE_NORMAL);
    viewstate.setSelectedConv(conv);
    return ipc.send('setfocus', viewstate.selectedConv);
  });

  handle('selectNextConv', function(offset = 1) {
    if (viewstate.state !== viewstate.STATE_NORMAL) {
      return;
    }
    viewstate.selectNextConv(offset);
    return ipc.send('setfocus', viewstate.selectedConv);
  });

  handle('selectConvIndex', function(index = 0) {
    if (viewstate.state !== viewstate.STATE_NORMAL) {
      return;
    }
    viewstate.selectConvIndex(index);
    return ipc.send('setfocus', viewstate.selectedConv);
  });

  handle('sendmessage', function(txt = '') {
    var msg;
    if (!txt.trim()) {
      return;
    }
    msg = userinput.buildChatMessage(entity.self, txt);
    ipc.send('sendchatmessage', msg);
    return conv.addChatMessagePlaceholder(entity.self.id, msg);
  });

  handle('toggleshowtray', function() {
    return viewstate.setShowTray(!viewstate.showtray);
  });

  handle('forcecustomsound', function(value) {
    return viewstate.setForceCustomSound(value);
  });

  handle('showiconnotification', function(value) {
    return viewstate.setShowIconNotification(value);
  });

  handle('mutesoundnotification', function() {
    return viewstate.setMuteSoundNotification(!viewstate.muteSoundNotification);
  });

  handle('togglemenu', function() {
    // Deprecated in electron >= 7.0.0
    return remote.Menu.getApplicationMenu().popup({});
  });

  handle('setescapeclearsinput', function(value) {
    return viewstate.setEscapeClearsInput(value);
  });

  handle('togglehidedockicon', function() {
    return viewstate.setHideDockIcon(!viewstate.hidedockicon);
  });

  handle('show-about', function() {
    viewstate.setState(viewstate.STATE_ABOUT);
    return updated('viewstate');
  });

  handle('hideWindow', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow(); // And we hope we don't get another ;)
    return mainWindow.hide();
  });

  handle('togglewindow', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow(); // And we hope we don't get another ;)
    if (mainWindow.isVisible()) {
      return mainWindow.hide();
    } else {
      return mainWindow.show();
    }
  });

  handle('togglestartminimizedtotray', function() {
    return viewstate.setStartMinimizedToTray(!viewstate.startminimizedtotray);
  });

  handle('toggleclosetotray', function() {
    return viewstate.setCloseToTray(!viewstate.closetotray);
  });

  handle('showwindow', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow(); // And we hope we don't get another ;)
    return mainWindow.show();
  });

  sendsetpresence = throttle(10000, function() {
    ipc.send('setpresence');
    return ipc.send('setactiveclient', true, 15);
  });

  resendfocus = throttle(15000, function() {
    return ipc.send('setfocus', viewstate.selectedConv);
  });

  // on every keep alive signal from hangouts
  //  we inform the server that the user is still
  //  available
  handle('noop', function() {
    return sendsetpresence();
  });

  handle('lastActivity', function() {
    sendsetpresence();
    if (document.hasFocus()) {
      return resendfocus();
    }
  });

  handle('appfocus', function() {
    return ipc.send('appfocus');
  });

  handle('updatewatermark', (function() {
    var throttleWaterByConv;
    throttleWaterByConv = {};
    return function() {
      var c, conv_id, sendWater;
      conv_id = viewstate.selectedConv;
      c = conv[conv_id];
      if (!c) {
        return;
      }
      sendWater = throttleWaterByConv[conv_id];
      if (!sendWater) {
        (function(conv_id) {
          sendWater = throttle(1000, function() {
            return ipc.send('updatewatermark', conv_id, Date.now());
          });
          return throttleWaterByConv[conv_id] = sendWater;
        })(conv_id);
      }
      return sendWater();
    };
  })());

  handle('getentity', function(ids) {
    var fn;
    return (fn = function() {
      ipc.send('getentity', ids.slice(0, 5));
      ids = ids.slice(5);
      if (ids.length > 0) {
        return setTimeout(fn, 500);
      }
    })();
  });

  handle('addentities', function(es, conv_id) {
    var e, i, len, ref;
    ref = es != null ? es : [];
    for (i = 0, len = ref.length; i < len; i++) {
      e = ref[i];
      entity.add(e);
    }
    if (conv_id) { // auto-add these ppl to a conv
      (es != null ? es : []).forEach(function(p) {
        return conv.addParticipant(conv_id, p);
      });
      viewstate.setState(viewstate.STATE_NORMAL);
    }
    // flag to show that contacts are loaded
    return viewstate.setContacts(true);
  });

  handle('uploadimage', function(files) {
    var _, client_generated_id, conv_id, element, ext, file, i, len, msg, ref, ref1;
    // this may change during upload
    conv_id = viewstate.selectedConv;
    // sense check that client is in good state
    if (!(viewstate.state === viewstate.STATE_NORMAL && conv[conv_id])) {
      // clear value for upload image input
      document.getElementById('attachFile').value = '';
      return;
    }
    // if only one file is selected, then it shows as preview before sending
    //  otherwise, it will upload all of them immediatly
    if (files.length === 1) {
      file = files[0];
      element = document.getElementById('preview-img');
      // show error message and return if is not an image
      if (isImg(file.path)) {
        // store image in preview-container and open it
        //  I think it is better to embed than reference path as user should
        //   see exactly what he is sending. (using the path would require
        //   polling)
        fs.readFile(file.path, function(err, original_data) {
          var base64Image, binaryImage, mimeType;
          binaryImage = Buffer.from(original_data, 'binary');
          base64Image = binaryImage.toString('base64');
          mimeType = mime.lookup(file.path);
          element.src = 'data:' + mimeType + ';base64,' + base64Image;
          return document.querySelector('#preview-container').classList.add('open');
        });
      } else {
        [_, ext] = (ref = file.path.match(/.*(\.\w+)$/)) != null ? ref : [];
        notr(`Ignoring file of type ${ext}`);
      }
    } else {
      for (i = 0, len = files.length; i < len; i++) {
        file = files[i];
        // only images please
        if (!isImg(file.path)) {
          [_, ext] = (ref1 = file.path.match(/.*(\.\w+)$/)) != null ? ref1 : [];
          notr(`Ignoring file of type ${ext}`);
          continue;
        }
        // message for a placeholder
        msg = userinput.buildChatMessage(entity.self, 'uploading image…');
        msg.uploadimage = true;
        ({client_generated_id} = msg);
        // add a placeholder for the image
        conv.addChatMessagePlaceholder(entity.self.id, msg);
        // and begin upload
        ipc.send('uploadimage', {
          path: file.path,
          conv_id,
          client_generated_id
        });
      }
    }
    // clear value for upload image input
    return document.getElementById('attachFile').value = '';
  });

  handle('onpasteimage', function() {
    var element;
    element = document.getElementById('preview-img');
    element.src = clipboard.readImage().toDataURL();
    element.src = element.src.replace(/image\/png/, 'image/gif');
    return document.querySelector('#preview-container').classList.add('open');
  });

  handle('uploadpreviewimage', function() {
    var client_generated_id, conv_id, element, msg, pngData;
    conv_id = viewstate.selectedConv;
    if (!conv_id) {
      return;
    }
    msg = userinput.buildChatMessage(entity.self, 'uploading image…');
    msg.uploadimage = true;
    ({client_generated_id} = msg);
    conv.addChatMessagePlaceholder(entity.self.id, msg);
    // find preview element
    element = document.getElementById('preview-img');
    // build image from what is on preview
    pngData = element.src.replace(/data:image\/(png|jpe?g|gif|svg);base64,/, '');
    pngData = Buffer.from(pngData, 'base64');
    document.querySelector('#preview-container').classList.remove('open');
    document.querySelector('#emoji-container').classList.remove('open');
    element.src = '';
    
    return ipc.send('uploadclipboardimage', {pngData, conv_id, client_generated_id});
  });

  handle('uploadingimage', function(spec) {});

  // XXX this doesn't look very good because the image
  // shows, then flickers away before the real is loaded
  // from the upload.
  //conv.updatePlaceholderImage spec
  handle('leftresize', function(size) {
    return viewstate.setLeftSize(size);
  });

  handle('resize', function(dim) {
    return viewstate.setSize(dim);
  });

  handle('move', function(pos) {
    return viewstate.setPosition(pos);
  });

  handle('conversationname', function(name) {
    return convsettings.setName(name);
  });

  handle('conversationquery', function(query) {
    return convsettings.setSearchQuery(query);
  });

  handle('searchentities', function(query, max_results) {
    return ipc.send('searchentities', query, max_results);
  });

  handle('setsearchedentities', function(r) {
    return convsettings.setSearchedEntities(r);
  });

  handle('selectentity', function(e) {
    return convsettings.addSelectedEntity(e);
  });

  handle('deselectentity', function(e) {
    return convsettings.removeSelectedEntity(e);
  });

  handle('togglegroup', function(e) {
    return convsettings.setGroup(!convsettings.group);
  });

  handle('saveconversation', function() {
    var c, conv_id, current, e, id, name, needsRename, one_to_one, p, recreate, ref, selected, toadd;
    viewstate.setState(viewstate.STATE_NORMAL);
    conv_id = convsettings.id;
    c = conv[conv_id];
    one_to_one = (c != null ? (ref = c.type) != null ? ref.indexOf('ONE_TO_ONE') : void 0 : void 0) >= 0;
    selected = (function() {
      var i, len, ref1, results;
      ref1 = convsettings.selectedEntities;
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        e = ref1[i];
        results.push(e.id.chat_id);
      }
      return results;
    })();
    recreate = conv_id && one_to_one && convsettings.group;
    needsRename = convsettings.group && convsettings.name && convsettings.name !== (c != null ? c.name : void 0);
    // remember: we don't rename one_to_ones, google web client does not do it
    if (!conv_id || recreate) {
      name = (convsettings.group ? convsettings.name : void 0) || "";
      ipc.send('createconversation', selected, name, convsettings.group);
      return;
    }
    p = c.participant_data;
    current = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = p.length; i < len; i++) {
        c = p[i];
        if (!entity.isSelf(c.id.chat_id)) {
          results.push(c.id.chat_id);
        }
      }
      return results;
    })();
    toadd = (function() {
      var i, len, results;
      results = [];
      for (i = 0, len = selected.length; i < len; i++) {
        id = selected[i];
        if (indexOf.call(current, id) < 0) {
          results.push(id);
        }
      }
      return results;
    })();
    if (toadd.length) {
      ipc.send('adduser', conv_id, toadd);
    }
    if (needsRename) {
      return ipc.send('renameconversation', conv_id, convsettings.name);
    }
  });

  handle('conversation_rename', function(c) {
    conv.rename(c, c.conversation_rename.new_name);
    return conv.addChatMessage(c);
  });

  handle('membership_change', function(e) {
    var conv_id, id, ids, ref;
    conv_id = e.conversation_id.id;
    ids = (function() {
      var i, len, ref, results;
      ref = e.membership_change.participant_ids;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        id = ref[i];
        results.push(id.chat_id || id.gaia_id);
      }
      return results;
    })();
    if (e.membership_change.type === 'LEAVE') {
      if (ref = entity.self.id, indexOf.call(ids, ref) >= 0) {
        return conv.deleteConv(conv_id);
      }
      return conv.removeParticipants(conv_id, ids);
    }
    conv.addChatMessage(e);
    return ipc.send('getentity', ids, {
      add_to_conv: conv_id
    });
  });

  handle('createconversationdone', function(c) {
    convsettings.reset();
    conv.add(c);
    return viewstate.setSelectedConv(c.id.id);
  });

  handle('notification_level', function(n) {
    var conv_id, level, ref;
    conv_id = n != null ? (ref = n[0]) != null ? ref[0] : void 0 : void 0;
    level = (n != null ? n[1] : void 0) === 10 ? 'QUIET' : 'RING';
    if (conv_id && level) {
      return conv.setNotificationLevel(conv_id, level);
    }
  });

  handle('togglenotif', function() {
    var QUIET, RING, c, conv_id, q;
    ({QUIET, RING} = Client.NotificationLevel);
    conv_id = viewstate.selectedConv;
    if (!(c = conv[conv_id])) {
      return;
    }
    q = conv.isQuiet(c);
    ipc.send('setconversationnotificationlevel', conv_id, (q ? RING : QUIET));
    return conv.setNotificationLevel(conv_id, (q ? 'RING' : 'QUIET'));
  });

  handle('togglestar', function() {
    var c, conv_id;
    conv_id = viewstate.selectedConv;
    if (!(c = conv[conv_id])) {
      return;
    }
    return conv.toggleStar(c);
  });

  handle('delete', function(a) {
    var c, conv_id, ref;
    conv_id = a != null ? (ref = a[0]) != null ? ref[0] : void 0 : void 0;
    if (!(c = conv[conv_id])) {
      return;
    }
    return conv.deleteConv(conv_id);
  });

  
  // Change language in YakYak

  handle('changelanguage', function(language) {
    if (i18n.getLocales().includes(viewstate.language)) {
      ipc.send('seti18n', null, language);
      return viewstate.setLanguage(language);
    }
  });

  handle('deleteconv', function(confirmed) {
    var conv_id;
    conv_id = viewstate.selectedConv;
    if (!confirmed) {
      return later(function() {
        if (confirm(i18n.__('conversation.delete_confirm:Really delete conversation?'))) {
          return action('deleteconv', true);
        }
      });
    } else {
      ipc.send('deleteconversation', conv_id);
      viewstate.selectConvIndex(0);
      return viewstate.setState(viewstate.STATE_NORMAL);
    }
  });

  handle('leaveconv', function(confirmed) {
    var conv_id;
    conv_id = viewstate.selectedConv;
    if (!confirmed) {
      return later(function() {
        if (confirm(i18n.__('conversation.leave_confirm:Really leave conversation?'))) {
          return action('leaveconv', true);
        }
      });
    } else {
      ipc.send('removeuser', conv_id);
      viewstate.selectConvIndex(0);
      return viewstate.setState(viewstate.STATE_NORMAL);
    }
  });

  handle('lastkeydown', function(time) {
    return viewstate.setLastKeyDown(time);
  });

  handle('settyping', function(v) {
    var conv_id;
    conv_id = viewstate.selectedConv;
    if (!(conv_id && viewstate.state === viewstate.STATE_NORMAL)) {
      return;
    }
    ipc.send('settyping', conv_id, v);
    return viewstate.setState(viewstate.STATE_NORMAL);
  });

  handle('typing', function(t) {
    return conv.addTyping(t);
  });

  handle('pruneTyping', function(conv_id) {
    return conv.pruneTyping(conv_id);
  });

  handle('syncallnewevents', throttle(10000, function(time) {
    if (!time) {
      return;
    }
    return ipc.send('syncallnewevents', time);
  }));

  handle('handlesyncedevents', function(r) {
    var e, i, j, len, len1, ref, ref1, st, states;
    states = r != null ? r.conversation_state : void 0;
    if (!(states != null ? states.length : void 0)) {
      return;
    }
    for (i = 0, len = states.length; i < len; i++) {
      st = states[i];
      ref1 = (ref = st != null ? st.event : void 0) != null ? ref : [];
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        e = ref1[j];
        conv.addChatMessage(e);
      }
    }
    return connection.setEventState(connection.IN_SYNC);
  });

  handle('syncrecentconversations', throttle(10000, function() {
    return ipc.send('syncrecentconversations');
  }));

  handle('handlerecentconversations', function(r) {
    var st;
    if (!(st = r.conversation_state)) {
      return;
    }
    conv.replaceFromStates(st);
    return connection.setEventState(connection.IN_SYNC);
  });

  handle('client_conversation', function(c) {
    // Conversation must be added, even if already exists
    //  why? because when a new chat message for a new conversation appears
    //  a skeleton is made of a conversation
    return conv.add(c); // unless conv[c?.conversation_id?.id]?.participant_data?
  });

  // commented unless condition, as it was preventing yakyak reacting to client_conversations events
  //  from server
  handle('hangout_event', function(e) {
    var ref, ref1;
    if ((ref = e != null ? (ref1 = e.hangout_event) != null ? ref1.event_type : void 0 : void 0) !== 'START_HANGOUT' && ref !== 'END_HANGOUT') {
      return;
    }
    // trigger notifications for this
    return notify.addToNotify(e);
  });

  'reply_to_invite settings conversation_notification invitation_watermark'.split(' ').forEach(function(n) {
    return handle(n, function(...as) {
      return console.log(n, ...as);
    });
  });

  handle('unreadtotal', function(total, orMore) {
    var value;
    value = "";
    if (total > 0) {
      value = total + (orMore ? "+" : "");
    }
    updated('conv_count');
    return ipc.send('updatebadge', value);
  });

  handle('showconvmin', function(doshow) {
    return viewstate.setShowConvMin(doshow);
  });

  handle('setusesystemdateformat', function(val) {
    return viewstate.setUseSystemDateFormat(val);
  });

  handle('showconvthumbs', function(doshow) {
    return viewstate.setShowConvThumbs(doshow);
  });

  handle('showanimatedthumbs', function(doshow) {
    return viewstate.setShowAnimatedThumbs(doshow);
  });

  handle('showconvtime', function(doshow) {
    return viewstate.setShowConvTime(doshow);
  });

  handle('showconvlast', function(doshow) {
    return viewstate.setShowConvLast(doshow);
  });

  handle('showpopupnotifications', function(doshow) {
    return viewstate.setShowPopUpNotifications(doshow);
  });

  handle('showmessageinnotification', function(doshow) {
    return viewstate.setShowMessageInNotification(doshow);
  });

  handle('showusernameinnotification', function(doshow) {
    return viewstate.setShowUsernameInNotification(doshow);
  });

  handle('convertemoji', function(doshow) {
    return viewstate.setConvertEmoji(doshow);
  });

  handle('suggestemoji', function(doshow) {
    return viewstate.setSuggestEmoji(doshow);
  });

  handle('showimagepreview', function(doshow) {
    return viewstate.setshowImagePreview(doshow);
  });

  handle('changetheme', function(colorscheme) {
    return viewstate.setColorScheme(colorscheme);
  });

  handle('changefontsize', function(fontsize) {
    return viewstate.setFontSize(fontsize);
  });

  handle('devtools', function() {
    return remote.getCurrentWindow().openDevTools({
      detach: true
    });
  });

  handle('quit', function() {
    return ipc.send('quit');
  });

  handle('togglefullscreen', function() {
    return ipc.send('togglefullscreen');
  });

  handle('zoom', function(step) {
    if (step != null) {
      return viewstate.setZoom((parseFloat(document.body.style.zoom.replace(',', '.')) || 1.0) + step);
    }
    return viewstate.setZoom(1);
  });

  handle('logout', function() {
    return ipc.send('logout');
  });

  handle('wonline', function(wonline) {
    connection.setWindowOnline(wonline);
    if (wonline) {
      return ipc.send('hangupsConnect');
    } else {
      return ipc.send('hangupsDisconnect');
    }
  });

  handle('openonsystemstartup', function(open) {
    return viewstate.setOpenOnSystemStartup(open);
  });

  handle('initopenonsystemstartup', function(isEnabled) {
    return viewstate.initOpenOnSystemStartup(isEnabled);
  });

  handle('minimize', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow();
    return mainWindow.minimize();
  });

  handle('resizewindow', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow();
    if (mainWindow.isMaximized()) {
      return mainWindow.unmaximize();
    } else {
      return mainWindow.maximize();
    }
  });

  handle('close', function() {
    var mainWindow;
    mainWindow = remote.getCurrentWindow();
    return mainWindow.close();
  });

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvZGlzcGF0Y2hlci5qcyIsInNvdXJjZXMiOlsidWkvZGlzcGF0Y2hlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLE1BQUEsRUFBQSxTQUFBLEVBQUEsVUFBQSxFQUFBLElBQUEsRUFBQSxZQUFBLEVBQUEsTUFBQSxFQUFBLEVBQUEsRUFBQSxrQkFBQSxFQUFBLEdBQUEsRUFBQSxLQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsZUFBQSxFQUFBLFFBQUEsRUFBQSxTQUFBLEVBQUEsU0FBQTtJQUFBOztFQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsV0FBUjs7RUFDVCxNQUFBLEdBQVMsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFDN0IsR0FBQSxHQUFTLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBRzdCLEVBQUEsR0FBSyxPQUFBLENBQVEsSUFBUjs7RUFDTCxJQUFBLEdBQU8sT0FBQSxDQUFRLFlBQVI7O0VBRVAsU0FBQSxHQUFZLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBRWhDLENBQUEsQ0FBQyxNQUFELEVBQVMsSUFBVCxFQUFlLFNBQWYsRUFBMEIsU0FBMUIsRUFBcUMsVUFBckMsRUFBaUQsWUFBakQsRUFBK0QsTUFBL0QsQ0FBQSxHQUF5RSxPQUFBLENBQVEsVUFBUixDQUF6RTs7RUFDQSxDQUFBLENBQUMsa0JBQUQsRUFBcUIsUUFBckIsRUFBK0IsS0FBL0IsRUFBc0MsS0FBdEMsRUFBNkMsTUFBN0MsQ0FBQSxHQUF1RCxPQUFBLENBQVEsUUFBUixDQUF2RDs7RUFFQSxxQ0FBcUMsQ0FBQyxLQUF0QyxDQUE0QyxHQUE1QyxDQUFnRCxDQUFDLE9BQWpELENBQXlELFFBQUEsQ0FBQyxDQUFELENBQUE7V0FDckQsTUFBQSxDQUFPLENBQVAsRUFBVSxRQUFBLENBQUEsQ0FBQTthQUFHLFVBQVUsQ0FBQyxRQUFYLENB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QSxDQUFDLElBQUQsQ0FBQTtXQUMxQixTQUFTLENBQUMsc0JBQVYsQ0FBaUMsSUFBakM7RUFEMEIsQ0FBOUI7O0VBR0EsTUFBQSxDQUFPLHlCQUFQLEVBQWtDLFFBQUEsQ0FBQyxTQUFELENBQUE7V0FDOUIsU0FBUyxDQUFDLHVCQUFWLENBQWtDLFNBQWxDO0VBRDhCLENBQWxDOztFQUdBLE1BQUEsQ0FBTyxVQUFQLEVBQW1CLFFBQUEsQ0FBQSxDQUFBO0FBQ25CLFFBQUE7SUFBSSxVQUFBLEdBQWEsTUFBTSxDQUFDLGdCQUFQLENBQUE7V0FDYixVQUFVLENBQUMsUUFBWCxDQUFBO0VBRmUsQ0FBbkI7O0VBSUEsTUFBQSxDQUFPLGNBQVAsRUFBdUIsUUFBQSxDQUFBLENBQUE7QUFDdkIsUUFBQTtJQUFJLFVBQUEsR0FBYSxNQUFNLENBQUMsZ0JBQVAsQ0FBQTtJQUNiLElBQUcsVUFBVSxDQUFDLFdBQVgsQ0FBQSxDQUFIO2FBQWlDLFVBQVUsQ0FBQyxVQUFYLENBQUEsRUFBakM7S0FBQSxNQUFBO2FBQThELFVBQVUsQ0FBQyxRQUFYLENBQUEsRUFBOUQ7O0VBRm1CLENBQXZCOztFQUlBLE1BQUEsQ0FBTyxPQUFQLEVBQWdCLFFBQUEsQ0FBQSxDQUFBO0FBQ2hCLFFBQUE7SUFBSSxVQUFBLEdBQWEsTUFBTSxDQUFDLGdCQUFQLENBQUE7V0FDYixVQUFVLENBQUMsS0FBWCxDQUFBO0VBRlksQ0FBaEI7QUF0aUJBIiwic291cmNlc0NvbnRlbnQiOlsiQ2xpZW50ID0gcmVxdWlyZSAnaGFuZ3Vwc2pzJ1xucmVtb3RlID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5yZW1vdGVcbmlwYyAgICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcblxuXG5mcyA9IHJlcXVpcmUoJ2ZzJylcbm1pbWUgPSByZXF1aXJlKCdtaW1lLXR5cGVzJylcblxuY2xpcGJvYXJkID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5jbGlwYm9hcmRcblxue2VudGl0eSwgY29udiwgdmlld3N0YXRlLCB1c2VyaW5wdXQsIGNvbm5lY3Rpb24sIGNvbnZzZXR0aW5ncywgbm90aWZ5fSA9IHJlcXVpcmUgJy4vbW9kZWxzJ1xue2luc2VydFRleHRBdEN1cnNvciwgdGhyb3R0bGUsIGxhdGVyLCBpc0ltZywgbmFtZW9mfSA9IHJlcXVpcmUgJy4vdXRpbCdcblxuJ2Nvbm5lY3RpbmcgY29ubmVjdGVkIGNvbm5lY3RfZmFpbGVkJy5zcGxpdCgnICcpLmZvckVhY2ggKG4pIC0+XG4gICAgaGFuZGxlIG4sIC0+IGNvbm5lY3Rpb24uc2V0U3RhdGUgblxuXG5oYW5kbGUgJ2FsaXZlJywgKHRpbWUpIC0+IGNvbm5lY3Rpb24uc2V0TGFzdEFjdGl2ZSB0aW1lXG5cbmhhbmRsZSAncmVxaW5pdCcsIC0+XG4gICAgaXBjLnNlbmQgJ3JlcWluaXQnXG4gICAgY29ubmVjdGlvbi5zZXRTdGF0ZSBjb25uZWN0aW9uLkNPTk5FQ1RJTkdcbiAgICB2aWV3c3RhdGUuc2V0U3RhdGUgdmlld3N0YXRlLlNUQVRFX1NUQVJUVVBcblxubW9kdWxlLmV4cG9ydHMgPVxuICAgIGluaXQ6ICh7aW5pdH0pIC0+IGFjdGlvbiAnaW5pdCcsIGluaXRcblxuaGFuZGxlICdpbml0JywgKGluaXQpIC0+XG4gICAgIyBzZXQgdGhlIGluaXRpYWwgdmlldyBzdGF0ZVxuICAgIHZpZXdzdGF0ZS5zZXRMb2dnZWRpbiB0cnVlXG5cbiAgICB2aWV3c3RhdGUuc2V0Q29sb3JTY2hlbWUgdmlld3N0YXRlLmNvbG9yU2NoZW1lXG4gICAgdmlld3N0YXRlLnNldEZvbnRTaXplIHZpZXdzdGF0ZS5mb250U2l6ZVxuXG4gICAgIyB1cGRhdGUgbW9kZWwgZnJvbSBpbml0IG9iamVjdFxuICAgIGVudGl0eS5faW5pdEZyb21TZWxmRW50aXR5IGluaXQuc2VsZl9lbnRpdHlcbiAgICBlbnRpdHkuX2luaXRGcm9tRW50aXRpZXMgaW5pdC5lbnRpdGllcyBpZiBpbml0LmVudGl0aWVzXG4gICAgY29udi5faW5pdEZyb21Db252U3RhdGVzIGluaXQuY29udl9zdGF0ZXNcbiAgICAjIGVuc3VyZSB0aGVyZSdzIGEgc2VsZWN0ZWQgY29udlxuICAgIHVubGVzcyBjb252W3ZpZXdzdGF0ZS5zZWxlY3RlZENvbnZdXG4gICAgICAgIHZpZXdzdGF0ZS5zZXRTZWxlY3RlZENvbnYgY29udi5saXN0KCk/WzBdPy5jb252ZXJzYXRpb25faWRcblxuICAgICMgZXhwbGljaXQgcmV0cmlldmFsIG9mIGNvbnZlcnNhdGlvbiBtZXRhZGF0YVxuICAgICMgIHRoaXMgaXMgcmVxdWlyZWQgc2luY2UgIzExMDlcbiAgICBjb252Lmxpc3QoKS5mb3JFYWNoIChlbCkgLT5cbiAgICAgICAgaWYgZWwuc2VsZl9jb252ZXJzYXRpb25fc3RhdGU/LnNlbGZfcmVhZF9zdGF0ZT8ubGF0ZXN0X3JlYWRfdGltZXN0YW1wPyA9PSAwXG4gICAgICAgICAgICAgIGlwYy5zZW5kICd1cGRhdGVDb252ZXJzYXRpb24nLCBlbC5jb252ZXJzYXRpb25faWQuaWRcblxuICAgIGlwYy5zZW5kICdpbml0cHJlc2VuY2UnLCBlbnRpdHkubGlzdCgpXG5cbiAgICByZXF1aXJlKCcuL3ZlcnNpb24nKS5jaGVjaygpXG5cbiAgICAjIHNtYWxsIGRlbGF5IGZvciBiZXR0ZXIgZXhwZXJpZW5jZVxuICAgIGxhdGVyIC0+IGFjdGlvbiAnc2V0X3ZpZXdzdGF0ZV9ub3JtYWwnXG5cbmhhbmRsZSAnc2V0X3ZpZXdzdGF0ZV9ub3JtYWwnLCAtPlxuICAgIHZpZXdzdGF0ZS5zZXRDb250YWN0cyB0cnVlXG4gICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9OT1JNQUxcblxuaGFuZGxlICdjaGF0X21lc3NhZ2UnLCAoZXYpIC0+XG4gICAgIyBUT0RPIGVudGl0eSBpcyBub3QgZmV0Y2hlZCBpbiB1c2FibGUgdGltZSBmb3IgZmlyc3Qgbm90aWZpY2F0aW9uXG4gICAgIyBpZiBkb2VzIG5vdCBoYXZlIHVzZXIgb24gY2FjaGVcbiAgICBlbnRpdHkubmVlZEVudGl0eSBldi5zZW5kZXJfaWQuY2hhdF9pZCB1bmxlc3MgZW50aXR5W2V2LnNlbmRlcl9pZC5jaGF0X2lkXT9cbiAgICAjIGFkZCBjaGF0IHRvIGNvbnZlcnNhdGlvblxuICAgIGNvbnYuYWRkQ2hhdE1lc3NhZ2UgZXZcbiAgICAjIHRoZXNlIG1lc3NhZ2VzIGFyZSB0byBnbyB0aHJvdWdoIG5vdGlmaWNhdGlvbnNcbiAgICBub3RpZnkuYWRkVG9Ob3RpZnkgZXZcblxuaGFuZGxlICd3YXRlcm1hcmsnLCAoZXYpIC0+XG4gICAgY29udi5hZGRXYXRlcm1hcmsgZXZcblxuaGFuZGxlICdwcmVzZW5jZScsIChldikgLT5cbiAgICBlbnRpdHkuc2V0UHJlc2VuY2UgZXZbMF1bMF1bMF1bMF0sIGlmIGV2WzBdWzBdWzFdWzFdID09IDEgdGhlbiB0cnVlIGVsc2UgZmFsc2VcblxuIyBoYW5kbGUgJ3NlbGZfcHJlc2VuY2UnLCAoZXYpIC0+XG4jICAgICBjb25zb2xlLmxvZyAnc2VsZl9wcmVzZW5jZScsIGV2XG5cbmhhbmRsZSAncXVlcnlwcmVzZW5jZScsIChpZCkgLT5cbiAgICBpcGMuc2VuZCAncXVlcnlwcmVzZW5jZScsIGlkXG5cbmhhbmRsZSAnc2V0cHJlc2VuY2UnLCAocikgLT5cbiAgICBpZiBub3Qgcj8ucHJlc2VuY2U/LmF2YWlsYWJsZT9cbiAgICAgICAgY29uc29sZS5sb2cgXCJzZXRwcmVzZW5jZTogVXNlciAnI3tuYW1lb2YgZW50aXR5W3I/LnVzZXJfaWQ/LmNoYXRfaWRdfScgZG9lcyBub3Qgc2hvdyBoaXMvaGVycy9pdCBzdGF0dXNcIiwgclxuICAgIGVsc2VcbiAgICAgICAgZW50aXR5LnNldFByZXNlbmNlIHIudXNlcl9pZC5jaGF0X2lkLCByPy5wcmVzZW5jZT8uYXZhaWxhYmxlXG5cbmhhbmRsZSAndXBkYXRlOnVucmVhZGNvdW50JywgLT5cbiAgICBjb25zb2xlLmxvZyAndXBkYXRlJ1xuXG5oYW5kbGUgJ2FkZGNvbnZlcnNhdGlvbicsIC0+XG4gICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9BRERfQ09OVkVSU0FUSU9OXG4gICAgY29udnNldHRpbmdzLnJlc2V0KClcblxuaGFuZGxlICdjb252c2V0dGluZ3MnLCAtPlxuICAgIGlkID0gdmlld3N0YXRlLnNlbGVjdGVkQ29udlxuICAgIHJldHVybiB1bmxlc3MgY29udltpZF1cbiAgICBjb252c2V0dGluZ3MucmVzZXQoKVxuICAgIGNvbnZzZXR0aW5ncy5sb2FkQ29udmVyc2F0aW9uIGNvbnZbaWRdXG4gICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9BRERfQ09OVkVSU0FUSU9OXG5cbmhhbmRsZSAnYWN0aXZpdHknLCAodGltZSkgLT5cbiAgICB2aWV3c3RhdGUudXBkYXRlQWN0aXZpdHkgdGltZVxuXG5oYW5kbGUgJ2F0Ym90dG9tJywgKGF0Ym90dG9tKSAtPlxuICAgIHZpZXdzdGF0ZS51cGRhdGVBdEJvdHRvbSBhdGJvdHRvbVxuXG5oYW5kbGUgJ2F0dG9wJywgKGF0dG9wKSAtPlxuICAgIHZpZXdzdGF0ZS51cGRhdGVBdFRvcCBhdHRvcFxuICAgIGNvbnYudXBkYXRlQXRUb3AgYXR0b3BcblxuaGFuZGxlICdoaXN0b3J5JywgKGNvbnZfaWQsIHRpbWVzdGFtcCkgLT5cbiAgICBpcGMuc2VuZCAnZ2V0Y29udmVyc2F0aW9uJywgY29udl9pZCwgdGltZXN0YW1wLCAyMFxuXG5oYW5kbGUgJ2hhbmRsZWNvbnZlcnNhdGlvbm1ldGFkYXRhJywgKHIpIC0+XG4gICAgcmV0dXJuIHVubGVzcyByLmNvbnZlcnNhdGlvbl9zdGF0ZVxuICAgICMgcmVtb3ZpbmcgZXZlbnRzIHNvIHRoZXkgZG9uJ3QgZ2V0IG1lcmdlZFxuICAgIHIuY29udmVyc2F0aW9uX3N0YXRlLmV2ZW50ID0gbnVsbFxuICAgIGNvbnYudXBkYXRlTWV0YWRhdGEgci5jb252ZXJzYXRpb25fc3RhdGVcblxuaGFuZGxlICdoYW5kbGVoaXN0b3J5JywgKHIpIC0+XG4gICAgcmV0dXJuIHVubGVzcyByLmNvbnZlcnNhdGlvbl9zdGF0ZVxuICAgIGNvbnYudXBkYXRlSGlzdG9yeSByLmNvbnZlcnNhdGlvbl9zdGF0ZVxuXG5oYW5kbGUgJ3NlbGVjdENvbnYnLCAoY29udikgLT5cbiAgICB2aWV3c3RhdGUuc2V0U3RhdGUgdmlld3N0YXRlLlNUQVRFX05PUk1BTFxuICAgIHZpZXdzdGF0ZS5zZXRTZWxlY3RlZENvbnYgY29udlxuICAgIGlwYy5zZW5kICdzZXRmb2N1cycsIHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcblxuaGFuZGxlICdzZWxlY3ROZXh0Q29udicsIChvZmZzZXQgPSAxKSAtPlxuICAgIGlmIHZpZXdzdGF0ZS5zdGF0ZSAhPSB2aWV3c3RhdGUuU1RBVEVfTk9STUFMIHRoZW4gcmV0dXJuXG4gICAgdmlld3N0YXRlLnNlbGVjdE5leHRDb252IG9mZnNldFxuICAgIGlwYy5zZW5kICdzZXRmb2N1cycsIHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcblxuaGFuZGxlICdzZWxlY3RDb252SW5kZXgnLCAoaW5kZXggPSAwKSAtPlxuICAgIGlmIHZpZXdzdGF0ZS5zdGF0ZSAhPSB2aWV3c3RhdGUuU1RBVEVfTk9STUFMIHRoZW4gcmV0dXJuXG4gICAgdmlld3N0YXRlLnNlbGVjdENvbnZJbmRleCBpbmRleFxuICAgIGlwYy5zZW5kICdzZXRmb2N1cycsIHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcblxuaGFuZGxlICdzZW5kbWVzc2FnZScsICh0eHQgPSAnJykgLT5cbiAgICBpZiAhdHh0LnRyaW0oKSB0aGVuIHJldHVyblxuICAgIG1zZyA9IHVzZXJpbnB1dC5idWlsZENoYXRNZXNzYWdlIGVudGl0eS5zZWxmLCB0eHRcbiAgICBpcGMuc2VuZCAnc2VuZGNoYXRtZXNzYWdlJywgbXNnXG4gICAgY29udi5hZGRDaGF0TWVzc2FnZVBsYWNlaG9sZGVyIGVudGl0eS5zZWxmLmlkLCBtc2dcblxuaGFuZGxlICd0b2dnbGVzaG93dHJheScsIC0+XG4gICAgdmlld3N0YXRlLnNldFNob3dUcmF5KG5vdCB2aWV3c3RhdGUuc2hvd3RyYXkpXG5cbmhhbmRsZSAnZm9yY2VjdXN0b21zb3VuZCcsICh2YWx1ZSkgLT5cbiAgICB2aWV3c3RhdGUuc2V0Rm9yY2VDdXN0b21Tb3VuZCh2YWx1ZSlcblxuaGFuZGxlICdzaG93aWNvbm5vdGlmaWNhdGlvbicsICh2YWx1ZSkgLT5cbiAgICB2aWV3c3RhdGUuc2V0U2hvd0ljb25Ob3RpZmljYXRpb24odmFsdWUpXG5cbmhhbmRsZSAnbXV0ZXNvdW5kbm90aWZpY2F0aW9uJywgLT5cbiAgICB2aWV3c3RhdGUuc2V0TXV0ZVNvdW5kTm90aWZpY2F0aW9uKG5vdCB2aWV3c3RhdGUubXV0ZVNvdW5kTm90aWZpY2F0aW9uKVxuXG5oYW5kbGUgJ3RvZ2dsZW1lbnUnLCAtPlxuICAgICMgRGVwcmVjYXRlZCBpbiBlbGVjdHJvbiA+PSA3LjAuMFxuICAgIHJlbW90ZS5NZW51LmdldEFwcGxpY2F0aW9uTWVudSgpLnBvcHVwKHt9KVxuXG5oYW5kbGUgJ3NldGVzY2FwZWNsZWFyc2lucHV0JywgKHZhbHVlKSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRFc2NhcGVDbGVhcnNJbnB1dCh2YWx1ZSlcblxuaGFuZGxlICd0b2dnbGVoaWRlZG9ja2ljb24nLCAtPlxuICAgIHZpZXdzdGF0ZS5zZXRIaWRlRG9ja0ljb24obm90IHZpZXdzdGF0ZS5oaWRlZG9ja2ljb24pXG5cbmhhbmRsZSAnc2hvdy1hYm91dCcsIC0+XG4gICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9BQk9VVFxuICAgIHVwZGF0ZWQgJ3ZpZXdzdGF0ZSdcblxuaGFuZGxlICdoaWRlV2luZG93JywgLT5cbiAgICBtYWluV2luZG93ID0gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKSAjIEFuZCB3ZSBob3BlIHdlIGRvbid0IGdldCBhbm90aGVyIDspXG4gICAgbWFpbldpbmRvdy5oaWRlKClcblxuaGFuZGxlICd0b2dnbGV3aW5kb3cnLCAtPlxuICAgIG1haW5XaW5kb3cgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpICMgQW5kIHdlIGhvcGUgd2UgZG9uJ3QgZ2V0IGFub3RoZXIgOylcbiAgICBpZiBtYWluV2luZG93LmlzVmlzaWJsZSgpIHRoZW4gbWFpbldpbmRvdy5oaWRlKCkgZWxzZSBtYWluV2luZG93LnNob3coKVxuXG5oYW5kbGUgJ3RvZ2dsZXN0YXJ0bWluaW1pemVkdG90cmF5JywgLT5cbiAgICB2aWV3c3RhdGUuc2V0U3RhcnRNaW5pbWl6ZWRUb1RyYXkobm90IHZpZXdzdGF0ZS5zdGFydG1pbmltaXplZHRvdHJheSlcblxuaGFuZGxlICd0b2dnbGVjbG9zZXRvdHJheScsIC0+XG4gICAgdmlld3N0YXRlLnNldENsb3NlVG9UcmF5KG5vdCB2aWV3c3RhdGUuY2xvc2V0b3RyYXkpXG5cbmhhbmRsZSAnc2hvd3dpbmRvdycsIC0+XG4gICAgbWFpbldpbmRvdyA9IHJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkgIyBBbmQgd2UgaG9wZSB3ZSBkb24ndCBnZXQgYW5vdGhlciA7KVxuICAgIG1haW5XaW5kb3cuc2hvdygpXG5cbnNlbmRzZXRwcmVzZW5jZSA9IHRocm90dGxlIDEwMDAwLCAtPlxuICAgIGlwYy5zZW5kICdzZXRwcmVzZW5jZSdcbiAgICBpcGMuc2VuZCAnc2V0YWN0aXZlY2xpZW50JywgdHJ1ZSwgMTVcbnJlc2VuZGZvY3VzID0gdGhyb3R0bGUgMTUwMDAsIC0+IGlwYy5zZW5kICdzZXRmb2N1cycsIHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcblxuIyBvbiBldmVyeSBrZWVwIGFsaXZlIHNpZ25hbCBmcm9tIGhhbmdvdXRzXG4jICB3ZSBpbmZvcm0gdGhlIHNlcnZlciB0aGF0IHRoZSB1c2VyIGlzIHN0aWxsXG4jICBhdmFpbGFibGVcbmhhbmRsZSAnbm9vcCcsIC0+XG4gICAgc2VuZHNldHByZXNlbmNlKClcblxuaGFuZGxlICdsYXN0QWN0aXZpdHknLCAtPlxuICAgIHNlbmRzZXRwcmVzZW5jZSgpXG4gICAgcmVzZW5kZm9jdXMoKSBpZiBkb2N1bWVudC5oYXNGb2N1cygpXG5cbmhhbmRsZSAnYXBwZm9jdXMnLCAtPlxuICAgIGlwYy5zZW5kICdhcHBmb2N1cydcblxuaGFuZGxlICd1cGRhdGV3YXRlcm1hcmsnLCBkbyAtPlxuICAgIHRocm90dGxlV2F0ZXJCeUNvbnYgPSB7fVxuICAgIC0+XG4gICAgICAgIGNvbnZfaWQgPSB2aWV3c3RhdGUuc2VsZWN0ZWRDb252XG4gICAgICAgIGMgPSBjb252W2NvbnZfaWRdXG4gICAgICAgIHJldHVybiB1bmxlc3MgY1xuICAgICAgICBzZW5kV2F0ZXIgPSB0aHJvdHRsZVdhdGVyQnlDb252W2NvbnZfaWRdXG4gICAgICAgIHVubGVzcyBzZW5kV2F0ZXJcbiAgICAgICAgICAgIGRvIChjb252X2lkKSAtPlxuICAgICAgICAgICAgICAgIHNlbmRXYXRlciA9IHRocm90dGxlIDEwMDAsIC0+IGlwYy5zZW5kICd1cGRhdGV3YXRlcm1hcmsnLCBjb252X2lkLCBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVXYXRlckJ5Q29udltjb252X2lkXSA9IHNlbmRXYXRlclxuICAgICAgICBzZW5kV2F0ZXIoKVxuXG5oYW5kbGUgJ2dldGVudGl0eScsIChpZHMpIC0+XG4gICAgZG8gZm4gPSAtPlxuICAgICAgICBpcGMuc2VuZCAnZ2V0ZW50aXR5JywgaWRzWy4uNF1cbiAgICAgICAgaWRzID0gaWRzWzUuLl1cbiAgICAgICAgc2V0VGltZW91dChmbiwgNTAwKSBpZiBpZHMubGVuZ3RoID4gMFxuXG5oYW5kbGUgJ2FkZGVudGl0aWVzJywgKGVzLCBjb252X2lkKSAtPlxuICAgIGVudGl0eS5hZGQgZSBmb3IgZSBpbiBlcyA/IFtdXG4gICAgaWYgY29udl9pZCAjwqBhdXRvLWFkZCB0aGVzZSBwcGwgdG8gYSBjb252XG4gICAgICAgIChlcyA/IFtdKS5mb3JFYWNoIChwKSAtPiBjb252LmFkZFBhcnRpY2lwYW50IGNvbnZfaWQsIHBcbiAgICAgICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9OT1JNQUxcblxuICAgICMgZmxhZyB0byBzaG93IHRoYXQgY29udGFjdHMgYXJlIGxvYWRlZFxuICAgIHZpZXdzdGF0ZS5zZXRDb250YWN0cyB0cnVlXG5cbmhhbmRsZSAndXBsb2FkaW1hZ2UnLCAoZmlsZXMpIC0+XG4gICAgIyB0aGlzIG1heSBjaGFuZ2UgZHVyaW5nIHVwbG9hZFxuICAgIGNvbnZfaWQgPSB2aWV3c3RhdGUuc2VsZWN0ZWRDb252XG4gICAgIyBzZW5zZSBjaGVjayB0aGF0IGNsaWVudCBpcyBpbiBnb29kIHN0YXRlXG4gICAgdW5sZXNzIHZpZXdzdGF0ZS5zdGF0ZSA9PSB2aWV3c3RhdGUuU1RBVEVfTk9STUFMIGFuZCBjb252W2NvbnZfaWRdXG4gICAgICAgICMgY2xlYXIgdmFsdWUgZm9yIHVwbG9hZCBpbWFnZSBpbnB1dFxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXR0YWNoRmlsZScpLnZhbHVlID0gJydcbiAgICAgICAgcmV0dXJuXG4gICAgIyBpZiBvbmx5IG9uZSBmaWxlIGlzIHNlbGVjdGVkLCB0aGVuIGl0IHNob3dzIGFzIHByZXZpZXcgYmVmb3JlIHNlbmRpbmdcbiAgICAjICBvdGhlcndpc2UsIGl0IHdpbGwgdXBsb2FkIGFsbCBvZiB0aGVtIGltbWVkaWF0bHlcbiAgICBpZiBmaWxlcy5sZW5ndGggPT0gMVxuICAgICAgICBmaWxlID0gZmlsZXNbMF0gIyBnZXQgZmlyc3QgYW5kIG9ubHkgZmlsZVxuICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQgJ3ByZXZpZXctaW1nJ1xuICAgICAgICAjIHNob3cgZXJyb3IgbWVzc2FnZSBhbmQgcmV0dXJuIGlmIGlzIG5vdCBhbiBpbWFnZVxuICAgICAgICBpZiBpc0ltZyBmaWxlLnBhdGhcbiAgICAgICAgICAgICMgc3RvcmUgaW1hZ2UgaW4gcHJldmlldy1jb250YWluZXIgYW5kIG9wZW4gaXRcbiAgICAgICAgICAgICMgIEkgdGhpbmsgaXQgaXMgYmV0dGVyIHRvIGVtYmVkIHRoYW4gcmVmZXJlbmNlIHBhdGggYXMgdXNlciBzaG91bGRcbiAgICAgICAgICAgICMgICBzZWUgZXhhY3RseSB3aGF0IGhlIGlzIHNlbmRpbmcuICh1c2luZyB0aGUgcGF0aCB3b3VsZCByZXF1aXJlXG4gICAgICAgICAgICAjICAgcG9sbGluZylcbiAgICAgICAgICAgIGZzLnJlYWRGaWxlIGZpbGUucGF0aCwgKGVyciwgb3JpZ2luYWxfZGF0YSkgLT5cbiAgICAgICAgICAgICAgICBiaW5hcnlJbWFnZSA9IEJ1ZmZlci5mcm9tKG9yaWdpbmFsX2RhdGEsICdiaW5hcnknKVxuICAgICAgICAgICAgICAgIGJhc2U2NEltYWdlID0gYmluYXJ5SW1hZ2UudG9TdHJpbmcoJ2Jhc2U2NCcpXG4gICAgICAgICAgICAgICAgbWltZVR5cGUgPSBtaW1lLmxvb2t1cCBmaWxlLnBhdGhcbiAgICAgICAgICAgICAgICBlbGVtZW50LnNyYyA9ICdkYXRhOicgKyBtaW1lVHlwZSArICc7YmFzZTY0LCcgKyBiYXNlNjRJbWFnZVxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3LWNvbnRhaW5lcicpLmNsYXNzTGlzdC5hZGQoJ29wZW4nKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBbXywgZXh0XSA9IGZpbGUucGF0aC5tYXRjaCgvLiooXFwuXFx3KykkLykgPyBbXVxuICAgICAgICAgICAgbm90ciBcIklnbm9yaW5nIGZpbGUgb2YgdHlwZSAje2V4dH1cIlxuICAgIGVsc2VcbiAgICAgICAgZm9yIGZpbGUgaW4gZmlsZXNcbiAgICAgICAgICAgICMgb25seSBpbWFnZXMgcGxlYXNlXG4gICAgICAgICAgICB1bmxlc3MgaXNJbWcgZmlsZS5wYXRoXG4gICAgICAgICAgICAgICAgW18sIGV4dF0gPSBmaWxlLnBhdGgubWF0Y2goLy4qKFxcLlxcdyspJC8pID8gW11cbiAgICAgICAgICAgICAgICBub3RyIFwiSWdub3JpbmcgZmlsZSBvZiB0eXBlICN7ZXh0fVwiXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgICMgbWVzc2FnZSBmb3IgYSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgbXNnID0gdXNlcmlucHV0LmJ1aWxkQ2hhdE1lc3NhZ2UgZW50aXR5LnNlbGYsICd1cGxvYWRpbmcgaW1hZ2XigKYnXG4gICAgICAgICAgICBtc2cudXBsb2FkaW1hZ2UgPSB0cnVlXG4gICAgICAgICAgICB7Y2xpZW50X2dlbmVyYXRlZF9pZH0gPSBtc2dcbiAgICAgICAgICAgICMgYWRkIGEgcGxhY2Vob2xkZXIgZm9yIHRoZSBpbWFnZVxuICAgICAgICAgICAgY29udi5hZGRDaGF0TWVzc2FnZVBsYWNlaG9sZGVyIGVudGl0eS5zZWxmLmlkLCBtc2dcbiAgICAgICAgICAgICMgYW5kIGJlZ2luIHVwbG9hZFxuICAgICAgICAgICAgaXBjLnNlbmQgJ3VwbG9hZGltYWdlJywge3BhdGg6ZmlsZS5wYXRoLCBjb252X2lkLCBjbGllbnRfZ2VuZXJhdGVkX2lkfVxuICAgICMgY2xlYXIgdmFsdWUgZm9yIHVwbG9hZCBpbWFnZSBpbnB1dFxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdhdHRhY2hGaWxlJykudmFsdWUgPSAnJ1xuXG5oYW5kbGUgJ29ucGFzdGVpbWFnZScsIC0+XG4gICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICdwcmV2aWV3LWltZydcbiAgICBlbGVtZW50LnNyYyA9IGNsaXBib2FyZC5yZWFkSW1hZ2UoKS50b0RhdGFVUkwoKVxuICAgIGVsZW1lbnQuc3JjID0gZWxlbWVudC5zcmMucmVwbGFjZSAvaW1hZ2VcXC9wbmcvLCAnaW1hZ2UvZ2lmJ1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3LWNvbnRhaW5lcicpLmNsYXNzTGlzdC5hZGQoJ29wZW4nKVxuXG5oYW5kbGUgJ3VwbG9hZHByZXZpZXdpbWFnZScsIC0+XG4gICAgY29udl9pZCA9IHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcbiAgICByZXR1cm4gdW5sZXNzIGNvbnZfaWRcbiAgICBtc2cgPSB1c2VyaW5wdXQuYnVpbGRDaGF0TWVzc2FnZSBlbnRpdHkuc2VsZiwgJ3VwbG9hZGluZyBpbWFnZeKApidcbiAgICBtc2cudXBsb2FkaW1hZ2UgPSB0cnVlXG4gICAge2NsaWVudF9nZW5lcmF0ZWRfaWR9ID0gbXNnXG4gICAgY29udi5hZGRDaGF0TWVzc2FnZVBsYWNlaG9sZGVyIGVudGl0eS5zZWxmLmlkLCBtc2dcbiAgICAjIGZpbmQgcHJldmlldyBlbGVtZW50XG4gICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICdwcmV2aWV3LWltZydcbiAgICAjIGJ1aWxkIGltYWdlIGZyb20gd2hhdCBpcyBvbiBwcmV2aWV3XG4gICAgcG5nRGF0YSA9IGVsZW1lbnQuc3JjLnJlcGxhY2UgL2RhdGE6aW1hZ2VcXC8ocG5nfGpwZT9nfGdpZnxzdmcpO2Jhc2U2NCwvLCAnJ1xuICAgIHBuZ0RhdGEgPSBCdWZmZXIuZnJvbShwbmdEYXRhLCAnYmFzZTY0JylcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJldmlldy1jb250YWluZXInKS5jbGFzc0xpc3QucmVtb3ZlKCdvcGVuJylcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZW1vamktY29udGFpbmVyJykuY2xhc3NMaXN0LnJlbW92ZSgnb3BlbicpXG4gICAgZWxlbWVudC5zcmMgPSAnJ1xuICAgICNcbiAgICBpcGMuc2VuZCAndXBsb2FkY2xpcGJvYXJkaW1hZ2UnLCB7cG5nRGF0YSwgY29udl9pZCwgY2xpZW50X2dlbmVyYXRlZF9pZH1cblxuaGFuZGxlICd1cGxvYWRpbmdpbWFnZScsIChzcGVjKSAtPlxuICAgICMgWFhYIHRoaXMgZG9lc24ndCBsb29rIHZlcnkgZ29vZCBiZWNhdXNlIHRoZSBpbWFnZVxuICAgICMgc2hvd3MsIHRoZW4gZmxpY2tlcnMgYXdheSBiZWZvcmUgdGhlIHJlYWwgaXMgbG9hZGVkXG4gICAgIyBmcm9tIHRoZSB1cGxvYWQuXG4gICAgI2NvbnYudXBkYXRlUGxhY2Vob2xkZXJJbWFnZSBzcGVjXG5cbmhhbmRsZSAnbGVmdHJlc2l6ZScsIChzaXplKSAtPiB2aWV3c3RhdGUuc2V0TGVmdFNpemUgc2l6ZVxuaGFuZGxlICdyZXNpemUnLCAoZGltKSAtPiB2aWV3c3RhdGUuc2V0U2l6ZSBkaW1cbmhhbmRsZSAnbW92ZScsIChwb3MpIC0+IHZpZXdzdGF0ZS5zZXRQb3NpdGlvbiBwb3NcblxuaGFuZGxlICdjb252ZXJzYXRpb25uYW1lJywgKG5hbWUpIC0+XG4gICAgY29udnNldHRpbmdzLnNldE5hbWUgbmFtZVxuaGFuZGxlICdjb252ZXJzYXRpb25xdWVyeScsIChxdWVyeSkgLT5cbiAgICBjb252c2V0dGluZ3Muc2V0U2VhcmNoUXVlcnkgcXVlcnlcbmhhbmRsZSAnc2VhcmNoZW50aXRpZXMnLCAocXVlcnksIG1heF9yZXN1bHRzKSAtPlxuICAgIGlwYy5zZW5kICdzZWFyY2hlbnRpdGllcycsIHF1ZXJ5LCBtYXhfcmVzdWx0c1xuaGFuZGxlICdzZXRzZWFyY2hlZGVudGl0aWVzJywgKHIpIC0+XG4gICAgY29udnNldHRpbmdzLnNldFNlYXJjaGVkRW50aXRpZXMgclxuaGFuZGxlICdzZWxlY3RlbnRpdHknLCAoZSkgLT4gY29udnNldHRpbmdzLmFkZFNlbGVjdGVkRW50aXR5IGVcbmhhbmRsZSAnZGVzZWxlY3RlbnRpdHknLCAoZSkgLT4gY29udnNldHRpbmdzLnJlbW92ZVNlbGVjdGVkRW50aXR5IGVcbmhhbmRsZSAndG9nZ2xlZ3JvdXAnLCAoZSkgLT4gY29udnNldHRpbmdzLnNldEdyb3VwKCFjb252c2V0dGluZ3MuZ3JvdXApXG5cbmhhbmRsZSAnc2F2ZWNvbnZlcnNhdGlvbicsIC0+XG4gICAgdmlld3N0YXRlLnNldFN0YXRlIHZpZXdzdGF0ZS5TVEFURV9OT1JNQUxcbiAgICBjb252X2lkID0gY29udnNldHRpbmdzLmlkXG4gICAgYyA9IGNvbnZbY29udl9pZF1cbiAgICBvbmVfdG9fb25lID0gYz8udHlwZT8uaW5kZXhPZignT05FX1RPX09ORScpID49IDBcbiAgICBzZWxlY3RlZCA9IChlLmlkLmNoYXRfaWQgZm9yIGUgaW4gY29udnNldHRpbmdzLnNlbGVjdGVkRW50aXRpZXMpXG4gICAgcmVjcmVhdGUgPSBjb252X2lkIGFuZCBvbmVfdG9fb25lIGFuZCBjb252c2V0dGluZ3MuZ3JvdXBcbiAgICBuZWVkc1JlbmFtZSA9IGNvbnZzZXR0aW5ncy5ncm91cCBhbmQgY29udnNldHRpbmdzLm5hbWUgYW5kIGNvbnZzZXR0aW5ncy5uYW1lICE9IGM/Lm5hbWVcbiAgICAjIHJlbWVtYmVyOiB3ZSBkb24ndCByZW5hbWUgb25lX3RvX29uZXMsIGdvb2dsZSB3ZWIgY2xpZW50IGRvZXMgbm90IGRvIGl0XG4gICAgaWYgbm90IGNvbnZfaWQgb3IgcmVjcmVhdGVcbiAgICAgICAgbmFtZSA9IChjb252c2V0dGluZ3MubmFtZSBpZiBjb252c2V0dGluZ3MuZ3JvdXApIG9yIFwiXCJcbiAgICAgICAgaXBjLnNlbmQgJ2NyZWF0ZWNvbnZlcnNhdGlvbicsIHNlbGVjdGVkLCBuYW1lLCBjb252c2V0dGluZ3MuZ3JvdXBcbiAgICAgICAgcmV0dXJuXG4gICAgcCA9IGMucGFydGljaXBhbnRfZGF0YVxuICAgIGN1cnJlbnQgPSAoYy5pZC5jaGF0X2lkIGZvciBjIGluIHAgd2hlbiBub3QgZW50aXR5LmlzU2VsZiBjLmlkLmNoYXRfaWQpXG4gICAgdG9hZGQgPSAoaWQgZm9yIGlkIGluIHNlbGVjdGVkIHdoZW4gaWQgbm90IGluIGN1cnJlbnQpXG4gICAgaXBjLnNlbmQgJ2FkZHVzZXInLCBjb252X2lkLCB0b2FkZCBpZiB0b2FkZC5sZW5ndGhcbiAgICBpcGMuc2VuZCAncmVuYW1lY29udmVyc2F0aW9uJywgY29udl9pZCwgY29udnNldHRpbmdzLm5hbWUgaWYgbmVlZHNSZW5hbWVcblxuaGFuZGxlICdjb252ZXJzYXRpb25fcmVuYW1lJywgKGMpIC0+XG4gICAgY29udi5yZW5hbWUgYywgYy5jb252ZXJzYXRpb25fcmVuYW1lLm5ld19uYW1lXG4gICAgY29udi5hZGRDaGF0TWVzc2FnZSBjXG5cbmhhbmRsZSAnbWVtYmVyc2hpcF9jaGFuZ2UnLCAoZSkgLT5cbiAgICBjb252X2lkID0gZS5jb252ZXJzYXRpb25faWQuaWRcbiAgICBpZHMgPSAoaWQuY2hhdF9pZCBvciBpZC5nYWlhX2lkIGZvciBpZCBpbiBlLm1lbWJlcnNoaXBfY2hhbmdlLnBhcnRpY2lwYW50X2lkcylcbiAgICBpZiBlLm1lbWJlcnNoaXBfY2hhbmdlLnR5cGUgPT0gJ0xFQVZFJ1xuICAgICAgICBpZiBlbnRpdHkuc2VsZi5pZCBpbiBpZHNcbiAgICAgICAgICAgIHJldHVybiBjb252LmRlbGV0ZUNvbnYgY29udl9pZFxuICAgICAgICByZXR1cm4gY29udi5yZW1vdmVQYXJ0aWNpcGFudHMgY29udl9pZCwgaWRzXG4gICAgY29udi5hZGRDaGF0TWVzc2FnZSBlXG4gICAgaXBjLnNlbmQgJ2dldGVudGl0eScsIGlkcywge2FkZF90b19jb252OiBjb252X2lkfVxuXG5oYW5kbGUgJ2NyZWF0ZWNvbnZlcnNhdGlvbmRvbmUnLCAoYykgLT5cbiAgICBjb252c2V0dGluZ3MucmVzZXQoKVxuICAgIGNvbnYuYWRkIGNcbiAgICB2aWV3c3RhdGUuc2V0U2VsZWN0ZWRDb252IGMuaWQuaWRcblxuaGFuZGxlICdub3RpZmljYXRpb25fbGV2ZWwnLCAobikgLT5cbiAgICBjb252X2lkID0gbj9bMF0/WzBdXG4gICAgbGV2ZWwgPSBpZiBuP1sxXSA9PSAxMCB0aGVuICdRVUlFVCcgZWxzZSAnUklORydcbiAgICBjb252LnNldE5vdGlmaWNhdGlvbkxldmVsIGNvbnZfaWQsIGxldmVsIGlmIGNvbnZfaWQgYW5kIGxldmVsXG5cbmhhbmRsZSAndG9nZ2xlbm90aWYnLCAtPlxuICAgIHtRVUlFVCwgUklOR30gPSBDbGllbnQuTm90aWZpY2F0aW9uTGV2ZWxcbiAgICBjb252X2lkID0gdmlld3N0YXRlLnNlbGVjdGVkQ29udlxuICAgIHJldHVybiB1bmxlc3MgYyA9IGNvbnZbY29udl9pZF1cbiAgICBxID0gY29udi5pc1F1aWV0KGMpXG4gICAgaXBjLnNlbmQgJ3NldGNvbnZlcnNhdGlvbm5vdGlmaWNhdGlvbmxldmVsJywgY29udl9pZCwgKGlmIHEgdGhlbiBSSU5HIGVsc2UgUVVJRVQpXG4gICAgY29udi5zZXROb3RpZmljYXRpb25MZXZlbCBjb252X2lkLCAoaWYgcSB0aGVuICdSSU5HJyBlbHNlICdRVUlFVCcpXG5cbmhhbmRsZSAndG9nZ2xlc3RhcicsIC0+XG4gICAgY29udl9pZCA9IHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcbiAgICByZXR1cm4gdW5sZXNzIGMgPSBjb252W2NvbnZfaWRdXG4gICAgY29udi50b2dnbGVTdGFyKGMpXG5cbmhhbmRsZSAnZGVsZXRlJywgKGEpIC0+XG4gICAgY29udl9pZCA9IGE/WzBdP1swXVxuICAgIHJldHVybiB1bmxlc3MgYyA9IGNvbnZbY29udl9pZF1cbiAgICBjb252LmRlbGV0ZUNvbnYgY29udl9pZFxuXG4jXG4jXG4jIENoYW5nZSBsYW5ndWFnZSBpbiBZYWtZYWtcbiNcbmhhbmRsZSAnY2hhbmdlbGFuZ3VhZ2UnLCAobGFuZ3VhZ2UpIC0+XG4gICAgaWYgaTE4bi5nZXRMb2NhbGVzKCkuaW5jbHVkZXMgdmlld3N0YXRlLmxhbmd1YWdlXG4gICAgICAgIGlwYy5zZW5kICdzZXRpMThuJywgbnVsbCwgbGFuZ3VhZ2VcbiAgICAgICAgdmlld3N0YXRlLnNldExhbmd1YWdlKGxhbmd1YWdlKVxuXG5oYW5kbGUgJ2RlbGV0ZWNvbnYnLCAoY29uZmlybWVkKSAtPlxuICAgIGNvbnZfaWQgPSB2aWV3c3RhdGUuc2VsZWN0ZWRDb252XG4gICAgdW5sZXNzIGNvbmZpcm1lZFxuICAgICAgICBsYXRlciAtPiBpZiBjb25maXJtIGkxOG4uX18oJ2NvbnZlcnNhdGlvbi5kZWxldGVfY29uZmlybTpSZWFsbHkgZGVsZXRlIGNvbnZlcnNhdGlvbj8nKVxuICAgICAgICAgICAgYWN0aW9uICdkZWxldGVjb252JywgdHJ1ZVxuICAgIGVsc2VcbiAgICAgICAgaXBjLnNlbmQgJ2RlbGV0ZWNvbnZlcnNhdGlvbicsIGNvbnZfaWRcbiAgICAgICAgdmlld3N0YXRlLnNlbGVjdENvbnZJbmRleCgwKVxuICAgICAgICB2aWV3c3RhdGUuc2V0U3RhdGUodmlld3N0YXRlLlNUQVRFX05PUk1BTClcblxuaGFuZGxlICdsZWF2ZWNvbnYnLCAoY29uZmlybWVkKSAtPlxuICAgIGNvbnZfaWQgPSB2aWV3c3RhdGUuc2VsZWN0ZWRDb252XG4gICAgdW5sZXNzIGNvbmZpcm1lZFxuICAgICAgICBsYXRlciAtPiBpZiBjb25maXJtIGkxOG4uX18oJ2NvbnZlcnNhdGlvbi5sZWF2ZV9jb25maXJtOlJlYWxseSBsZWF2ZSBjb252ZXJzYXRpb24/JylcbiAgICAgICAgICAgIGFjdGlvbiAnbGVhdmVjb252JywgdHJ1ZVxuICAgIGVsc2VcbiAgICAgICAgaXBjLnNlbmQgJ3JlbW92ZXVzZXInLCBjb252X2lkXG4gICAgICAgIHZpZXdzdGF0ZS5zZWxlY3RDb252SW5kZXgoMClcbiAgICAgICAgdmlld3N0YXRlLnNldFN0YXRlKHZpZXdzdGF0ZS5TVEFURV9OT1JNQUwpXG5cbmhhbmRsZSAnbGFzdGtleWRvd24nLCAodGltZSkgLT4gdmlld3N0YXRlLnNldExhc3RLZXlEb3duIHRpbWVcbmhhbmRsZSAnc2V0dHlwaW5nJywgKHYpIC0+XG4gICAgY29udl9pZCA9IHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcbiAgICByZXR1cm4gdW5sZXNzIGNvbnZfaWQgYW5kIHZpZXdzdGF0ZS5zdGF0ZSA9PSB2aWV3c3RhdGUuU1RBVEVfTk9STUFMXG4gICAgaXBjLnNlbmQgJ3NldHR5cGluZycsIGNvbnZfaWQsIHZcbiAgICB2aWV3c3RhdGUuc2V0U3RhdGUodmlld3N0YXRlLlNUQVRFX05PUk1BTClcblxuaGFuZGxlICd0eXBpbmcnLCAodCkgLT5cbiAgICBjb252LmFkZFR5cGluZyB0XG5oYW5kbGUgJ3BydW5lVHlwaW5nJywgKGNvbnZfaWQpIC0+XG4gICAgY29udi5wcnVuZVR5cGluZyBjb252X2lkXG5cbmhhbmRsZSAnc3luY2FsbG5ld2V2ZW50cycsIHRocm90dGxlIDEwMDAwLCAodGltZSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIHRpbWVcbiAgICBpcGMuc2VuZCAnc3luY2FsbG5ld2V2ZW50cycsIHRpbWVcblxuaGFuZGxlICdoYW5kbGVzeW5jZWRldmVudHMnLCAocikgLT5cbiAgICBzdGF0ZXMgPSByPy5jb252ZXJzYXRpb25fc3RhdGVcbiAgICByZXR1cm4gdW5sZXNzIHN0YXRlcz8ubGVuZ3RoXG4gICAgZm9yIHN0IGluIHN0YXRlc1xuICAgICAgICBmb3IgZSBpbiAoc3Q/LmV2ZW50ID8gW10pXG4gICAgICAgICAgICBjb252LmFkZENoYXRNZXNzYWdlIGVcbiAgICBjb25uZWN0aW9uLnNldEV2ZW50U3RhdGUgY29ubmVjdGlvbi5JTl9TWU5DXG5cbmhhbmRsZSAnc3luY3JlY2VudGNvbnZlcnNhdGlvbnMnLCB0aHJvdHRsZSAxMDAwMCwgLT5cbiAgICBpcGMuc2VuZCAnc3luY3JlY2VudGNvbnZlcnNhdGlvbnMnXG5cbmhhbmRsZSAnaGFuZGxlcmVjZW50Y29udmVyc2F0aW9ucycsIChyKSAtPlxuICAgIHJldHVybiB1bmxlc3Mgc3QgPSByLmNvbnZlcnNhdGlvbl9zdGF0ZVxuICAgIGNvbnYucmVwbGFjZUZyb21TdGF0ZXMgc3RcbiAgICBjb25uZWN0aW9uLnNldEV2ZW50U3RhdGUgY29ubmVjdGlvbi5JTl9TWU5DXG5cbmhhbmRsZSAnY2xpZW50X2NvbnZlcnNhdGlvbicsIChjKSAtPlxuICAgICMgQ29udmVyc2F0aW9uIG11c3QgYmUgYWRkZWQsIGV2ZW4gaWYgYWxyZWFkeSBleGlzdHNcbiAgICAjICB3aHk/IGJlY2F1c2Ugd2hlbiBhIG5ldyBjaGF0IG1lc3NhZ2UgZm9yIGEgbmV3IGNvbnZlcnNhdGlvbiBhcHBlYXJzXG4gICAgIyAgYSBza2VsZXRvbiBpcyBtYWRlIG9mIGEgY29udmVyc2F0aW9uXG4gICAgY29udi5hZGQgYyAjIHVubGVzcyBjb252W2M/LmNvbnZlcnNhdGlvbl9pZD8uaWRdPy5wYXJ0aWNpcGFudF9kYXRhP1xuICAgICMgY29tbWVudGVkIHVubGVzcyBjb25kaXRpb24sIGFzIGl0IHdhcyBwcmV2ZW50aW5nIHlha3lhayByZWFjdGluZyB0byBjbGllbnRfY29udmVyc2F0aW9ucyBldmVudHNcbiAgICAjICBmcm9tIHNlcnZlclxuXG5oYW5kbGUgJ2hhbmdvdXRfZXZlbnQnLCAoZSkgLT5cbiAgICByZXR1cm4gdW5sZXNzIGU/LmhhbmdvdXRfZXZlbnQ/LmV2ZW50X3R5cGUgaW4gWydTVEFSVF9IQU5HT1VUJywgJ0VORF9IQU5HT1VUJ11cbiAgICAjIHRyaWdnZXIgbm90aWZpY2F0aW9ucyBmb3IgdGhpc1xuICAgIG5vdGlmeS5hZGRUb05vdGlmeSBlXG5cbidyZXBseV90b19pbnZpdGUgc2V0dGluZ3MgY29udmVyc2F0aW9uX25vdGlmaWNhdGlvbiBpbnZpdGF0aW9uX3dhdGVybWFyaycuc3BsaXQoJyAnKS5mb3JFYWNoIChuKSAtPlxuICAgIGhhbmRsZSBuLCAoYXMuLi4pIC0+IGNvbnNvbGUubG9nIG4sIGFzLi4uXG5cbmhhbmRsZSAndW5yZWFkdG90YWwnLCAodG90YWwsIG9yTW9yZSkgLT5cbiAgICB2YWx1ZSA9IFwiXCJcbiAgICBpZiB0b3RhbCA+IDAgdGhlbiB2YWx1ZSA9IHRvdGFsICsgKGlmIG9yTW9yZSB0aGVuIFwiK1wiIGVsc2UgXCJcIilcbiAgICB1cGRhdGVkICdjb252X2NvdW50J1xuICAgIGlwYy5zZW5kICd1cGRhdGViYWRnZScsIHZhbHVlXG5cbmhhbmRsZSAnc2hvd2NvbnZtaW4nLCAoZG9zaG93KSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRTaG93Q29udk1pbiBkb3Nob3dcblxuaGFuZGxlICdzZXR1c2VzeXN0ZW1kYXRlZm9ybWF0JywgKHZhbCkgLT5cblxuICAgIHZpZXdzdGF0ZS5zZXRVc2VTeXN0ZW1EYXRlRm9ybWF0KHZhbClcblxuaGFuZGxlICdzaG93Y29udnRodW1icycsIChkb3Nob3cpIC0+XG4gICAgdmlld3N0YXRlLnNldFNob3dDb252VGh1bWJzIGRvc2hvd1xuXG5oYW5kbGUgJ3Nob3dhbmltYXRlZHRodW1icycsIChkb3Nob3cpIC0+XG4gICAgdmlld3N0YXRlLnNldFNob3dBbmltYXRlZFRodW1icyBkb3Nob3dcblxuaGFuZGxlICdzaG93Y29udnRpbWUnLCAoZG9zaG93KSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRTaG93Q29udlRpbWUgZG9zaG93XG5cbmhhbmRsZSAnc2hvd2NvbnZsYXN0JywgKGRvc2hvdykgLT5cbiAgICB2aWV3c3RhdGUuc2V0U2hvd0NvbnZMYXN0IGRvc2hvd1xuXG5oYW5kbGUgJ3Nob3dwb3B1cG5vdGlmaWNhdGlvbnMnLCAoZG9zaG93KSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRTaG93UG9wVXBOb3RpZmljYXRpb25zIGRvc2hvd1xuXG5oYW5kbGUgJ3Nob3dtZXNzYWdlaW5ub3RpZmljYXRpb24nLCAoZG9zaG93KSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRTaG93TWVzc2FnZUluTm90aWZpY2F0aW9uIGRvc2hvd1xuXG5oYW5kbGUgJ3Nob3d1c2VybmFtZWlubm90aWZpY2F0aW9uJywgKGRvc2hvdykgLT5cbiAgICB2aWV3c3RhdGUuc2V0U2hvd1VzZXJuYW1lSW5Ob3RpZmljYXRpb24gZG9zaG93XG5cbmhhbmRsZSAnY29udmVydGVtb2ppJywgKGRvc2hvdykgLT5cbiAgICB2aWV3c3RhdGUuc2V0Q29udmVydEVtb2ppIGRvc2hvd1xuXG5oYW5kbGUgJ3N1Z2dlc3RlbW9qaScsIChkb3Nob3cpIC0+XG4gICAgdmlld3N0YXRlLnNldFN1Z2dlc3RFbW9qaSBkb3Nob3dcblxuaGFuZGxlICdzaG93aW1hZ2VwcmV2aWV3JywgKGRvc2hvdykgLT5cbiAgICB2aWV3c3RhdGUuc2V0c2hvd0ltYWdlUHJldmlldyBkb3Nob3dcblxuaGFuZGxlICdjaGFuZ2V0aGVtZScsIChjb2xvcnNjaGVtZSkgLT5cbiAgICB2aWV3c3RhdGUuc2V0Q29sb3JTY2hlbWUgY29sb3JzY2hlbWVcblxuaGFuZGxlICdjaGFuZ2Vmb250c2l6ZScsIChmb250c2l6ZSkgLT5cbiAgICB2aWV3c3RhdGUuc2V0Rm9udFNpemUgZm9udHNpemVcblxuaGFuZGxlICdkZXZ0b29scycsIC0+XG4gICAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS5vcGVuRGV2VG9vbHMgZGV0YWNoOnRydWVcblxuaGFuZGxlICdxdWl0JywgLT5cbiAgICBpcGMuc2VuZCAncXVpdCdcblxuaGFuZGxlICd0b2dnbGVmdWxsc2NyZWVuJywgLT5cbiAgICBpcGMuc2VuZCAndG9nZ2xlZnVsbHNjcmVlbidcblxuaGFuZGxlICd6b29tJywgKHN0ZXApIC0+XG4gICAgaWYgc3RlcD9cbiAgICAgICAgcmV0dXJuIHZpZXdzdGF0ZS5zZXRab29tIChwYXJzZUZsb2F0KGRvY3VtZW50LmJvZHkuc3R5bGUuem9vbS5yZXBsYWNlKCcsJywgJy4nKSkgb3IgMS4wKSArIHN0ZXBcbiAgICB2aWV3c3RhdGUuc2V0Wm9vbSAxXG5cbmhhbmRsZSAnbG9nb3V0JywgLT5cbiAgICBpcGMuc2VuZCAnbG9nb3V0J1xuXG5oYW5kbGUgJ3dvbmxpbmUnLCAod29ubGluZSkgLT5cbiAgICBjb25uZWN0aW9uLnNldFdpbmRvd09ubGluZSB3b25saW5lXG4gICAgaWYgd29ubGluZVxuICAgICAgICBpcGMuc2VuZCAnaGFuZ3Vwc0Nvbm5lY3QnXG4gICAgZWxzZVxuICAgICAgICBpcGMuc2VuZCAnaGFuZ3Vwc0Rpc2Nvbm5lY3QnXG5cbmhhbmRsZSAnb3Blbm9uc3lzdGVtc3RhcnR1cCcsIChvcGVuKSAtPlxuICAgIHZpZXdzdGF0ZS5zZXRPcGVuT25TeXN0ZW1TdGFydHVwIG9wZW5cblxuaGFuZGxlICdpbml0b3Blbm9uc3lzdGVtc3RhcnR1cCcsIChpc0VuYWJsZWQpIC0+XG4gICAgdmlld3N0YXRlLmluaXRPcGVuT25TeXN0ZW1TdGFydHVwIGlzRW5hYmxlZFxuXG5oYW5kbGUgJ21pbmltaXplJywgLT5cbiAgICBtYWluV2luZG93ID0gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKVxuICAgIG1haW5XaW5kb3cubWluaW1pemUoKVxuXG5oYW5kbGUgJ3Jlc2l6ZXdpbmRvdycsIC0+XG4gICAgbWFpbldpbmRvdyA9IHJlbW90ZS5nZXRDdXJyZW50V2luZG93KClcbiAgICBpZiBtYWluV2luZG93LmlzTWF4aW1pemVkKCkgdGhlbiBtYWluV2luZG93LnVubWF4aW1pemUoKSBlbHNlIG1haW5XaW5kb3cubWF4aW1pemUoKVxuXG5oYW5kbGUgJ2Nsb3NlJywgLT5cbiAgICBtYWluV2luZG93ID0gcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKVxuICAgIG1haW5XaW5kb3cuY2xvc2UoKVxuIl19
