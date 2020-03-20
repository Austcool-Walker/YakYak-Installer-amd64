(function() {
  var HISTORY_AMOUNT, MAX_UNREAD, add, addChatMessage, addChatMessagePlaceholder, addTyping, addWatermark, domerge, entity, findByEventId, findClientGenerated, findLastReadEventsByUser, funcs, getProxiedName, isEventType, isPureHangout, isQuiet, isStarred, lastChanged, later, lookup, merge, nameof, nameofconv, pruneTyping, rename, sortby, starredconvs, toggleStar, tryparse, uniqfn, unread, unreadTotal, viewstate,
    indexOf = [].indexOf;

  entity = require('./entity'); 

  viewstate = require('./viewstate');

  ({nameof, nameofconv, getProxiedName, later, uniqfn, tryparse} = require('../util'));

  merge = function(t, ...os) {
    var j, k, len1, o, v;
    for (j = 0, len1 = os.length; j < len1; j++) {
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

  lookup = {};

  domerge = function(id, props) {
    var ref;
    return lookup[id] = merge((ref = lookup[id]) != null ? ref : {}, props);
  };

  add = function(conv) {
    var conversation, e, event, id, j, len1, p, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
    // rejig the structure since it's insane
    if (conv != null ? (ref = conv.conversation) != null ? (ref1 = ref.conversation_id) != null ? ref1.id : void 0 : void 0 : void 0) {
      ({conversation, event} = conv);
      conv = conversation;
      // remove observed events
      conv.event = (function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = event.length; j < len1; j++) {
          e = event[j];
          if (!e.event_id.match(/observed_/)) {
            results.push(e);
          }
        }
        return results;
      })();
    }
    ({id} = conv.conversation_id || conv.id);
    if (lookup[id] && (conv != null ? (ref2 = conv.self_conversation_state) != null ? (ref3 = ref2.self_read_state) != null ? ref3.latest_read_timestamp : void 0 : void 0 : void 0) === 0) {
      // don't change latest_read_timestamp if it's 0
      if (conv != null) {
        if ((ref4 = conv.self_conversation_state) != null) {
          if ((ref5 = ref4.self_read_state) != null) {
            ref5.latest_read_timestamp = (ref6 = lookup[id].self_conversation_state) != null ? (ref7 = ref6.self_read_state) != null ? ref7.latest_read_timestamp : void 0 : void 0;
          }
        }
      }
    }
    domerge(id, conv);
    if (conv.event < 20) {
      // we mark conversations with few events to know that they definitely
      // got no more history.
      conv.nomorehistory = true;
    }
    ref9 = (ref8 = conv != null ? conv.participant_data : void 0) != null ? ref8 : [];
    for (j = 0, len1 = ref9.length; j < len1; j++) {
      p = ref9[j];
      // participant_data contains entity information
      // we want in the entity lookup
      entity.add(p);
    }
    return lookup[id];
  };

  rename = function(conv, newname) {
    var id;
    ({id} = conv.conversation_id);
    lookup[id].name = newname;
    return updated('conv');
  };

  addChatMessage = function(msg) {
    var conv, cpos, id, ref, ref1, ref2, ref3, ref4;
    ({id} = (ref = msg.conversation_id) != null ? ref : {});
    if (!id) {
      return;
    }
    // ignore observed events
    if ((ref1 = msg.event_id) != null ? ref1.match(/observed_/) : void 0) {
      return;
    }
    conv = lookup[id];
    if (!conv) {
      // a chat message that belongs to no conversation. curious.
      // make something skeletal just to hold the new message
      conv = lookup[id] = {
        conversation_id: {id},
        event: [],
        self_conversation_state: {
          sort_timestamp: 0
        }
      };
    }
    if (!conv.event) {
      conv.event = [];
    }
    // we can add message placeholder that needs replacing when
    // the real event drops in. if we find the same event id.
    cpos = findClientGenerated(conv, msg != null ? (ref2 = msg.self_event_state) != null ? ref2.client_generated_id : void 0 : void 0);
    if (!cpos) {
      cpos = findByEventId(conv, msg.event_id);
    }
    if (cpos) {
      // replace event by position
      conv.event[cpos] = msg;
    } else {
      // add last
      conv.event.push(msg);
    }
    // update the sort timestamp to list conv first
    if (conv != null) {
      if ((ref3 = conv.self_conversation_state) != null) {
        ref3.sort_timestamp = (ref4 = msg.timestamp) != null ? ref4 : Date.now() * 1000;
      }
    }
    unreadTotal();
    updated('conv');
    return conv;
  };

  findClientGenerated = function(conv, client_generated_id) {
    var e, i, j, len1, ref, ref1, ref2;
    if (!client_generated_id) {
      return;
    }
    ref1 = (ref = conv.event) != null ? ref : [];
    for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
      e = ref1[i];
      if (((ref2 = e.self_event_state) != null ? ref2.client_generated_id : void 0) === client_generated_id) {
        return i;
      }
    }
  };

  findByEventId = function(conv, event_id) {
    var e, i, j, len1, ref, ref1;
    if (!event_id) {
      return;
    }
    ref1 = (ref = conv.event) != null ? ref : [];
    for (i = j = 0, len1 = ref1.length; j < len1; i = ++j) {
      e = ref1[i];
      if (e.event_id === event_id) {
        return i;
      }
    }
  };

  findLastReadEventsByUser = function(conv) {
    var chat_id, contact, e, j, l, last_read, last_seen_events_by_user, len1, len2, ref, ref1, ref2, ref3;
    last_seen_events_by_user = {};
    ref = conv.read_state;
    for (j = 0, len1 = ref.length; j < len1; j++) {
      contact = ref[j];
      chat_id = contact.participant_id.chat_id;
      last_read = (ref1 = contact.last_read_timestamp) != null ? ref1 : contact.latest_read_timestamp;
      ref3 = (ref2 = conv.event) != null ? ref2 : [];
      for (l = 0, len2 = ref3.length; l < len2; l++) {
        e = ref3[l];
        if (e.timestamp <= last_read) {
          last_seen_events_by_user[chat_id] = e;
        }
      }
    }
    return last_seen_events_by_user;
  };

  // this is used when sending new messages, we add a placeholder with
  // the correct client_generated_id. this entry will be replaced in
  // addChatMessage when the real message arrives from the server.
  addChatMessagePlaceholder = function(chat_id, {conv_id, client_generated_id, segsj, ts, uploadimage, message_action_type}) {
    var ev, islater, ref, ref1, sr;
    ts = ts * 1000; // goog form
    ev = {
      chat_message: {
        annotation: message_action_type,
        message_content: {
          segment: segsj
        }
      },
      conversation_id: {
        id: conv_id
      },
      self_event_state: {
        client_generated_id: client_generated_id
      },
      sender_id: {
        chat_id: chat_id,
        gaia_id: chat_id
      },
      timestamp: ts,
      placeholder: true,
      uploadimage: uploadimage
    };
    // lets say this is also read to avoid any badges
    sr = (ref = lookup[conv_id]) != null ? (ref1 = ref.self_conversation_state) != null ? ref1.self_read_state : void 0 : void 0;
    islater = ts > (sr != null ? sr.latest_read_timestamp : void 0);
    if (sr && islater) {
      sr.latest_read_timestamp = ts;
    }
    // this triggers the model update
    return addChatMessage(ev);
  };

  addWatermark = function(ev) {
    var conv, conv_id, islater, latest_read_timestamp, participant_id, ref, ref1, rev, sr, uniq;
    conv_id = ev != null ? (ref = ev.conversation_id) != null ? ref.id : void 0 : void 0;
    if (!(conv_id && (conv = lookup[conv_id]))) {
      return;
    }
    if (!conv.read_state) {
      conv.read_state = [];
    }
    ({participant_id, latest_read_timestamp} = ev);
    conv.read_state.push({participant_id, latest_read_timestamp});
    // pack the read_state by keeping the last of each participant_id
    if (conv.read_state.length > 200) {
      rev = conv.read_state.reverse();
      uniq = uniqfn(rev, function(e) {
        return e.participant_id.chat_id;
      });
      conv.read_state = uniq.reverse();
    }
    sr = conv != null ? (ref1 = conv.self_conversation_state) != null ? ref1.self_read_state : void 0 : void 0;
    islater = latest_read_timestamp > (sr != null ? sr.latest_read_timestamp : void 0);
    if (entity.isSelf(participant_id.chat_id) && sr && islater) {
      sr.latest_read_timestamp = latest_read_timestamp;
    }
    unreadTotal();
    return updated('conv');
  };

  uniqfn = function(as, fn) {
    var bs;
    bs = as.map(fn);
    return as.filter(function(e, i) {
      return bs.indexOf(bs[i]) === i;
    });
  };

  sortby = function(conv) {
    var ref, ref1;
    return (ref = conv != null ? (ref1 = conv.self_conversation_state) != null ? ref1.sort_timestamp : void 0 : void 0) != null ? ref : 0;
  };

  // this number correlates to number of max events we get from
  // hangouts on client startup.
  MAX_UNREAD = 20;

  unread = function(conv) {
    var c, e, j, len1, ref, ref1, ref2, ref3, t;
    t = conv != null ? (ref = conv.self_conversation_state) != null ? (ref1 = ref.self_read_state) != null ? ref1.latest_read_timestamp : void 0 : void 0 : void 0;
    if (typeof t !== 'number') {
      return 0;
    }
    c = 0;
    ref3 = (ref2 = conv != null ? conv.event : void 0) != null ? ref2 : [];
    for (j = 0, len1 = ref3.length; j < len1; j++) {
      e = ref3[j];
      if (e.chat_message && e.timestamp > t && !entity.isSelf(e.sender_id.chat_id)) {
        c++;
      }
      if (c >= MAX_UNREAD) {
        return MAX_UNREAD;
      }
    }
    return c;
  };

  unreadTotal = (function() {
    var current, orMore;
    current = 0;
    orMore = false;
    return function() {
      var countunread, newTotal, sum;
      sum = function(a, b) {
        return a + b;
      };
      orMore = false;
      countunread = function(c) {
        var count;
        if (isQuiet(c)) {
          return 0;
        }
        count = funcs.unread(c);
        if (count === MAX_UNREAD) {
          orMore = true;
        }
        return count;
      };
      newTotal = funcs.list(false).map(countunread).reduce(sum, 0);
      if (current !== newTotal) {
        current = newTotal;
        later(function() {
          return action('unreadtotal', newTotal, orMore);
        });
      }
      return newTotal;
    };
  })();

  isQuiet = function(c) {
    var ref;
    return (c != null ? (ref = c.self_conversation_state) != null ? ref.notification_level : void 0 : void 0) === 'QUIET';
  };

  starredconvs = tryparse(localStorage.starredconvs) || [];

  isStarred = function(c) {
    var ref, ref1;
    return ref = c != null ? (ref1 = c.conversation_id) != null ? ref1.id : void 0 : void 0, indexOf.call(starredconvs, ref) >= 0;
  };

  toggleStar = function(c) {
    var i, id;
    ({id} = c != null ? c.conversation_id : void 0);
    if (indexOf.call(starredconvs, id) < 0) {
      starredconvs.push(id);
    } else {
      starredconvs = (function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = starredconvs.length; j < len1; j++) {
          i = starredconvs[j];
          if (i !== id) {
            results.push(i);
          }
        }
        return results;
      })();
    }
    localStorage.starredconvs = JSON.stringify(starredconvs);
    return updated('conv');
  };

  isEventType = function(type) {
    return function(ev) {
      return !!ev[type];
    };
  };

  // a "hangout" is in google terms strictly an audio/video event
  // many conversations in the conversation list are just such an
  // event with no further chat messages or activity. this function
  // tells whether a hangout only contains video/audio.
  isPureHangout = (function() {
    var isNotHangout, nots;
    nots = ['chat_message', 'conversation_rename'].map(isEventType);
    isNotHangout = function(e) {
      return nots.some(function(f) {
        return f(e);
      });
    };
    return function(c) {
      var ref;
      return !((ref = c != null ? c.event : void 0) != null ? ref : []).some(isNotHangout);
    };
  })();

  // the time of the last added event
  lastChanged = function(c) {
    var ref, ref1, ref2, ref3, ref4;
    return ((ref = c != null ? (ref1 = c.event) != null ? (ref2 = ref1[((ref3 = c != null ? (ref4 = c.event) != null ? ref4.length : void 0 : void 0) != null ? ref3 : 0) - 1]) != null ? ref2.timestamp : void 0 : void 0 : void 0) != null ? ref : 0) / 1000;
  };

  // the number of history events to request
  HISTORY_AMOUNT = 20;

  // add a typing entry
  addTyping = function(typing) {
    var c, conv_id, len, ref;
    conv_id = typing != null ? (ref = typing.conversation_id) != null ? ref.id : void 0 : void 0;
    // no typing entries for self
    if (entity.isSelf(typing.user_id.chat_id)) {
      return;
    }
    // and no entries in non-existing convs
    if (!(c = lookup[conv_id])) {
      return;
    }
    if (!c.typing) {
      c.typing = [];
    }
    // length at start
    len = c.typing.length;
    // add new state to start of array
    c.typing.unshift(typing);
    // ensure there's only one entry in array per user
    c.typing = uniqfn(c.typing, function(t) {
      return t.user_id.chat_id;
    });
    // and sort it in a stable way
    c.typing.sort(function(t1, t2) {
      return t1.user_id.chat_id - t2.user_id.chat_id;
    });
    // schedule a pruning
    later(function() {
      return action('pruneTyping', conv_id);
    });
    // and mark as updated
    updated('conv');
    if (len === 0) {
      // indiciate we just started having typing entries
      return updated('startTyping');
    }
  };

  // prune old typing entries
  pruneTyping = (function() {
    var KEEP_OTHERS, KEEP_STOPPED, findNext, keepFor, prune;
    findNext = function(arr) {
      var expiry, i, j, len1, next, t;
      expiry = arr.map(function(t) {
        return t.timestamp + keepFor(t);
      });
      for (i = j = 0, len1 = expiry.length; j < len1; i = ++j) {
        t = expiry[i];
        if (!next || expiry[i] < expiry[next]) {
          next = i;
        }
      }
      return next;
    };
    KEEP_STOPPED = 1500; // time to keep STOPPED typing entries
    KEEP_OTHERS = 10000; // time to keep other typing entries before pruning
    keepFor = function(t) {
      if ((t != null ? t.status : void 0) === 'STOPPED') {
        return KEEP_STOPPED;
      } else {
        return KEEP_OTHERS;
      }
    };
    prune = function(t) {
      return (Date.now() - (t != null ? t.timestamp : void 0) / 1000) < keepFor(t);
    };
    return function(conv_id) {
      var c, lengthBefore, next, nextidx, waitUntil;
      if (!(c = lookup[conv_id])) {
        return;
      }
      if (c.typingtimer) {
        // stop existing timer
        c.typingtimer = clearTimeout(c.typingtimer);
      }
      // the length before prune
      lengthBefore = c.typing.length;
      // filter out old stuff
      c.typing = c.typing.filter(prune);
      if (c.typing.length !== lengthBefore) {
        // maybe we changed something?
        updated('conv');
      }
      // when is next expiring?
      if (!((nextidx = findNext(c.typing)) >= 0)) {
        return;
      }
      // the next entry to expire
      next = c.typing[nextidx];
      // how long we wait until doing another prune
      waitUntil = (keepFor(next) + next.timestamp / 1000) - Date.now();
      if (waitUntil < 0) {
        return console.error('typing prune error', waitUntil);
      }
      // schedule next prune
      return c.typingtimer = setTimeout((function() {
        return action('pruneTyping', conv_id);
      }), waitUntil);
    };
  })();

  funcs = {
    count: function() {
      var c, k, v;
      c = 0;
      (function() {
        var results;
        results = [];
        for (k in lookup) {
          v = lookup[k];
          if (typeof v === 'object') {
            results.push(c++);
          }
        }
        return results;
      })();
      return c;
    },
    _reset: function() {
      var k, v;
      for (k in lookup) {
        v = lookup[k];
        if (typeof v === 'object') {
          delete lookup[k];
        }
      }
      updated('conv');
      return null;
    },
    _initFromConvStates: function(convs) {
      var c, conv, countIf, j, len1;
      c = 0;
      countIf = function(a) {
        if (a) {
          return c++;
        }
      };
      for (j = 0, len1 = convs.length; j < len1; j++) {
        conv = convs[j];
        countIf(add(conv));
      }
      updated('conv');
      return c;
    },
    add: add,
    rename: rename,
    addChatMessage: addChatMessage,
    addChatMessagePlaceholder: addChatMessagePlaceholder,
    addWatermark: addWatermark,
    MAX_UNREAD: MAX_UNREAD,
    unread: unread,
    isQuiet: isQuiet,
    isStarred: isStarred,
    toggleStar: toggleStar,
    isPureHangout: isPureHangout,
    lastChanged: lastChanged,
    addTyping: addTyping,
    pruneTyping: pruneTyping,
    unreadTotal: unreadTotal,
    findLastReadEventsByUser: findLastReadEventsByUser,
    setNotificationLevel: function(conv_id, level) {
      var c, ref;
      if (!(c = lookup[conv_id])) {
        return;
      }
      if ((ref = c.self_conversation_state) != null) {
        ref.notification_level = level;
      }
      return updated('conv');
    },
    deleteConv: function(conv_id) {
      var c;
      if (!(c = lookup[conv_id])) {
        return;
      }
      delete lookup[conv_id];
      viewstate.setSelectedConv(null);
      return updated('conv');
    },
    removeParticipants: function(conv_id, ids) {
      var c, getId, p;
      if (!(c = lookup[conv_id])) {
        return;
      }
      getId = function(p) {
        return p.id.chat_id || p.id.gaia_id;
      };
      return c.participant_data = (function() {
        var j, len1, ref, ref1, results;
        ref = c.participant_data;
        results = [];
        for (j = 0, len1 = ref.length; j < len1; j++) {
          p = ref[j];
          if (ref1 = getId(p), indexOf.call(ids, ref1) < 0) {
            results.push(p);
          }
        }
        return results;
      })();
    },
    addParticipant: function(conv_id, participant) {
      var c;
      if (!(c = lookup[conv_id])) {
        return;
      }
      return c.participant_data.push(participant);
    },
    replaceFromStates: function(states) {
      var j, len1, st;
      for (j = 0, len1 = states.length; j < len1; j++) {
        st = states[j];
        add(st);
      }
      return updated('conv');
    },
    updateAtTop: function(attop) {
      var c, conv_id, ref, ref1, ref2, timestamp;
      if (viewstate.state !== viewstate.STATE_NORMAL) {
        return;
      }
      conv_id = viewstate != null ? viewstate.selectedConv : void 0;
      if (attop && (c = lookup[conv_id]) && !(c != null ? c.nomorehistory : void 0) && !(c != null ? c.requestinghistory : void 0)) {
        timestamp = ((ref = (ref1 = c.event) != null ? (ref2 = ref1[0]) != null ? ref2.timestamp : void 0 : void 0) != null ? ref : 0) / 1000;
        if (!timestamp) {
          return;
        }
        c.requestinghistory = true;
        later(function() {
          return action('history', conv_id, timestamp, HISTORY_AMOUNT);
        });
        return updated('conv');
      }
    },
    updateMetadata: function(state, redraw = true) {
      var c, conv_id, ref, ref1, ref2;
      conv_id = state != null ? (ref = state.conversation_id) != null ? ref.id : void 0 : void 0;
      if (!(c = lookup[conv_id])) {
        return;
      }
      c.read_state = (ref1 = (ref2 = state.conversation) != null ? ref2.read_state : void 0) != null ? ref1 : c.read_state;
      if (redraw) {
        return this.redraw_conversation();
      }
    },
    redraw_conversation: function() {
      // first signal is to give views a change to record the
      // current view position before injecting new DOM
      updated('beforeHistory');
      // redraw
      updated('conv');
      // last signal is to move view to be at same place
      // as when we injected DOM.
      return updated('afterHistory');
    },
    updateHistory: function(state) {
      var c, conv_id, event, ref, ref1;
      conv_id = state != null ? (ref = state.conversation_id) != null ? ref.id : void 0 : void 0;
      if (!(c = lookup[conv_id])) {
        return;
      }
      c.requestinghistory = false;
      event = state != null ? state.event : void 0;
      this.updateMetadata(state, false);
      c.event = (event != null ? event : []).concat((ref1 = c.event) != null ? ref1 : []);
      if ((event != null ? event.length : void 0) === 0) {
        c.nomorehistory = true;
      }
      return this.redraw_conversation();
    },
    updatePlaceholderImage: function({conv_id, client_generated_id, path}) {
      var c, cpos, ev, seg;
      if (!(c = lookup[conv_id])) {
        return;
      }
      cpos = findClientGenerated(c, client_generated_id);
      ev = c.event[cpos];
      seg = ev.chat_message.message_content.segment[0];
      seg.link_data = {
        link_target: path
      };
      return updated('conv');
    },
    list: function(sort = true) {
      var c, convs, k, starred, v;
      convs = (function() {
        var results;
        results = [];
        for (k in lookup) {
          v = lookup[k];
          if (typeof v === 'object') {
            results.push(v);
          }
        }
        return results;
      })();
      if (sort) {
        starred = (function() {
          var j, len1, results;
          results = [];
          for (j = 0, len1 = convs.length; j < len1; j++) {
            c = convs[j];
            if (isStarred(c)) {
              results.push(c);
            }
          }
          return results;
        })();
        convs = (function() {
          var j, len1, results;
          results = [];
          for (j = 0, len1 = convs.length; j < len1; j++) {
            c = convs[j];
            if (!isStarred(c)) {
              results.push(c);
            }
          }
          return results;
        })();
        starred.sort(function(e1, e2) {
          return nameofconv(e1).localeCompare(nameofconv(e2));
        });
        convs.sort(function(e1, e2) {
          return sortby(e2) - sortby(e1);
        });
        return starred.concat(convs);
      }
      return convs;
    }
  };

  module.exports = merge(lookup, funcs);

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvbW9kZWxzL2NvbnYuanMiLCJzb3VyY2VzIjpbInVpL21vZGVscy9jb252LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsY0FBQSxFQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUEsY0FBQSxFQUFBLHlCQUFBLEVBQUEsU0FBQSxFQUFBLFlBQUEsRUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQSxtQkFBQSxFQUFBLHdCQUFBLEVBQUEsS0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsYUFBQSxFQUFBLE9BQUEsRUFBQSxTQUFBLEVBQUEsV0FBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsWUFBQSxFQUFBLFVBQUEsRUFBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsU0FBQTtJQUFBOztFQUFBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFDVCxTQUFBLEdBQVksT0FBQSxDQUFRLGFBQVI7O0VBQ1osQ0FBQSxDQUFDLE1BQUQsRUFBUyxVQUFULEVBQXFCLGNBQXJCLEVBQXFDLEtBQXJDLEVBQTRDLE1BQTVDLEVBQW9ELFFBQXBELENBQUEsR0FBaUUsT0FBQSxDQUFRLFNBQVIsQ0FBakU7O0VBRUEsS0FBQSxHQUFVLFFBQUEsQ0FBQyxDQUFELEVBQUEsR0FBSSxFQUFKLENBQUE7QUFBYSxRQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsSUFBQSxFQUFBLENBQUEsRUFBQTtJQUFDLEtBQUEsc0NBQUE7O01BQUEsS0FBQSxNQUFBOztZQUEyQixNQUFVLFFBQVYsTUFBZ0I7VUFBM0MsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPOztNQUFQO0lBQUE7V0FBbUU7RUFBakY7O0VBRVYsTUFBQSxHQUFTLENBQUE7O0VBRVQsT0FBQSxHQUFVLFFBQUEsQ0FBQyxFQUFELEVBQUssS0FB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Q0FBNkIsVUFBQSxDQUFXLEVBQVgsQ0FBN0I7UUFBWixDQUFiO1FBQ0EsS0FBSyxDQUFDLElBQU4sQ0FBVyxRQUFBLENBQUMsRUFBRCxFQUFLLEVBQUwsQ0FBQTtpQkFBWSxNQUFBLENBQU8sRUFBUCxDQUFBLEdBQWEsTUFBQSxDQUFPLEVBQVA7UUFBekIsQ0FBWDtBQUNBLGVBQU8sT0FBTyxDQUFDLE1BQVIsQ0FBZSxLQUFmLEVBTFg7O2FBTUE7SUFSRTtFQXpHTjs7RUFxSEosTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBQSxDQUFNLE1BQU4sRUFBYyxLQUFkO0FBeFhqQiIsInNvdXJjZXNDb250ZW50IjpbImVudGl0eSA9IHJlcXVpcmUgJy4vZW50aXR5JyAgICAgI1xudmlld3N0YXRlID0gcmVxdWlyZSAnLi92aWV3c3RhdGUnXG57bmFtZW9mLCBuYW1lb2Zjb252LCBnZXRQcm94aWVkTmFtZSwgbGF0ZXIsIHVuaXFmbiwgdHJ5cGFyc2V9ICA9IHJlcXVpcmUgJy4uL3V0aWwnXG5cbm1lcmdlICAgPSAodCwgb3MuLi4pIC0+IHRba10gPSB2IGZvciBrLHYgb2YgbyB3aGVuIHYgbm90IGluIFtudWxsLCB1bmRlZmluZWRdIGZvciBvIGluIG9zOyB0XG5cbmxvb2t1cCA9IHt9XG5cbmRvbWVyZ2UgPSAoaWQsIHByb3BzKSAtPiBsb29rdXBbaWRdID0gbWVyZ2UgKGxvb2t1cFtpZF0gPyB7fSksIHByb3BzXG5cbmFkZCA9IChjb252KSAtPlxuICAgICMgcmVqaWcgdGhlIHN0cnVjdHVyZSBzaW5jZSBpdCdzIGluc2FuZVxuICAgIGlmIGNvbnY/LmNvbnZlcnNhdGlvbj8uY29udmVyc2F0aW9uX2lkPy5pZFxuICAgICAgICB7Y29udmVyc2F0aW9uLCBldmVudH0gPSBjb252XG4gICAgICAgIGNvbnYgPSBjb252ZXJzYXRpb25cbiAgICAgICAgIyByZW1vdmUgb2JzZXJ2ZWQgZXZlbnRzXG4gICAgICAgIGNvbnYuZXZlbnQgPSAoZSBmb3IgZSBpbiBldmVudCB3aGVuICFlLmV2ZW50X2lkLm1hdGNoKC9vYnNlcnZlZF8vKSlcblxuICAgIHtpZH0gPSBjb252LmNvbnZlcnNhdGlvbl9pZCBvciBjb252LmlkXG4gICAgaWYgbG9va3VwW2lkXSBhbmQgY29udj8uc2VsZl9jb252ZXJzYXRpb25fc3RhdGU/LnNlbGZfcmVhZF9zdGF0ZT8ubGF0ZXN0X3JlYWRfdGltZXN0YW1wID09IDBcbiAgICAgICAgIyBkb24ndCBjaGFuZ2UgbGF0ZXN0X3JlYWRfdGltZXN0YW1wIGlmIGl0J3MgMFxuICAgICAgICBjb252Py5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZT8uc2VsZl9yZWFkX3N0YXRlPy5sYXRlc3RfcmVhZF90aW1lc3RhbXAgPSBsb29rdXBbaWRdLnNlbGZfY29udmVyc2F0aW9uX3N0YXRlPy5zZWxmX3JlYWRfc3RhdGU/LmxhdGVzdF9yZWFkX3RpbWVzdGFtcFxuICAgIGRvbWVyZ2UgaWQsIGNvbnZcbiAgICAjIHdlIG1hcmsgY29udmVyc2F0aW9ucyB3aXRoIGZldyBldmVudHMgdG8ga25vdyB0aGF0IHRoZXkgZGVmaW5pdGVseVxuICAgICMgZ290IG5vIG1vcmUgaGlzdG9yeS5cbiAgICBjb252Lm5vbW9yZWhpc3RvcnkgPSB0cnVlIGlmIGNvbnYuZXZlbnQgPCAyMFxuICAgICMgcGFydGljaXBhbnRfZGF0YSBjb250YWlucyBlbnRpdHkgaW5mb3JtYXRpb25cbiAgICAjIHdlIHdhbnQgaW4gdGhlIGVudGl0eSBsb29rdXBcbiAgICBlbnRpdHkuYWRkIHAgZm9yIHAgaW4gY29udj8ucGFydGljaXBhbnRfZGF0YSA/IFtdXG4gICAgbG9va3VwW2lkXVxuXG5yZW5hbWUgPSAoY29udiwgbmV3bmFtZSkgLT5cbiAgICB7aWR9ID0gY29udi5jb252ZXJzYXRpb25faWRcbiAgICBsb29rdXBbaWRdLm5hbWUgPSBuZXduYW1lXG4gICAgdXBkYXRlZCAnY29udidcblxuYWRkQ2hhdE1lc3NhZ2UgPSAobXNnKSAtPlxuICAgIHtpZH0gPSBtc2cuY29udmVyc2F0aW9uX2lkID8ge31cbiAgICByZXR1cm4gdW5sZXNzIGlkXG4gICAgIyBpZ25vcmUgb2JzZXJ2ZWQgZXZlbnRzXG4gICAgcmV0dXJuIGlmIG1zZy5ldmVudF9pZD8ubWF0Y2goL29ic2VydmVkXy8pXG4gICAgY29udiA9IGxvb2t1cFtpZF1cbiAgICB1bmxlc3MgY29udlxuICAgICAgICAjIGEgY2hhdCBtZXNzYWdlIHRoYXQgYmVsb25ncyB0byBubyBjb252ZXJzYXRpb24uIGN1cmlvdXMuXG4gICAgICAgICMgbWFrZSBzb21ldGhpbmcgc2tlbGV0YWwganVzdCB0byBob2xkIHRoZSBuZXcgbWVzc2FnZVxuICAgICAgICBjb252ID0gbG9va3VwW2lkXSA9IHtcbiAgICAgICAgICAgIGNvbnZlcnNhdGlvbl9pZDoge2lkfVxuICAgICAgICAgICAgZXZlbnQ6IFtdXG4gICAgICAgICAgICBzZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZTpzb3J0X3RpbWVzdGFtcDowXG4gICAgICAgIH1cbiAgICBjb252LmV2ZW50ID0gW10gdW5sZXNzIGNvbnYuZXZlbnRcbiAgICAjIHdlIGNhbiBhZGQgbWVzc2FnZSBwbGFjZWhvbGRlciB0aGF0IG5lZWRzIHJlcGxhY2luZyB3aGVuXG4gICAgIyB0aGUgcmVhbCBldmVudCBkcm9wcyBpbi4gaWYgd2UgZmluZCB0aGUgc2FtZSBldmVudCBpZC5cbiAgICBjcG9zID0gZmluZENsaWVudEdlbmVyYXRlZCBjb252LCBtc2c/LnNlbGZfZXZlbnRfc3RhdGU/LmNsaWVudF9nZW5lcmF0ZWRfaWRcbiAgICB1bmxlc3MgY3Bvc1xuICAgICAgICBjcG9zID0gZmluZEJ5RXZlbnRJZCBjb252LCBtc2cuZXZlbnRfaWRcbiAgICBpZiBjcG9zXG4gICAgICAgICMgcmVwbGFjZSBldmVudCBieSBwb3NpdGlvblxuICAgICAgICBjb252LmV2ZW50W2Nwb3NdID0gbXNnXG4gICAgZWxzZVxuICAgICAgICAjIGFkZCBsYXN0XG4gICAgICAgIGNvbnYuZXZlbnQucHVzaCBtc2dcbiAgICAjIHVwZGF0ZSB0aGUgc29ydCB0aW1lc3RhbXAgdG8gbGlzdCBjb252IGZpcnN0XG4gICAgY29udj8uc2VsZl9jb252ZXJzYXRpb25fc3RhdGU/LnNvcnRfdGltZXN0YW1wID0gbXNnLnRpbWVzdGFtcCA/IChEYXRlLm5vdygpICogMTAwMClcbiAgICB1bnJlYWRUb3RhbCgpXG4gICAgdXBkYXRlZCAnY29udidcbiAgICBjb252XG5cbmZpbmRDbGllbnRHZW5lcmF0ZWQgPSAoY29udiwgY2xpZW50X2dlbmVyYXRlZF9pZCkgLT5cbiAgICByZXR1cm4gdW5sZXNzIGNsaWVudF9nZW5lcmF0ZWRfaWRcbiAgICBmb3IgZSwgaSBpbiBjb252LmV2ZW50ID8gW11cbiAgICAgICAgcmV0dXJuIGkgaWYgZS5zZWxmX2V2ZW50X3N0YXRlPy5jbGllbnRfZ2VuZXJhdGVkX2lkID09IGNsaWVudF9nZW5lcmF0ZWRfaWRcblxuZmluZEJ5RXZlbnRJZCA9IChjb252LCBldmVudF9pZCkgLT5cbiAgICByZXR1cm4gdW5sZXNzIGV2ZW50X2lkXG4gICAgZm9yIGUsIGkgaW4gY29udi5ldmVudCA/IFtdXG4gICAgICAgIHJldHVybiBpIGlmIGUuZXZlbnRfaWQgPT0gZXZlbnRfaWRcblxuZmluZExhc3RSZWFkRXZlbnRzQnlVc2VyID0gKGNvbnYpIC0+XG4gICAgbGFzdF9zZWVuX2V2ZW50c19ieV91c2VyID0ge31cbiAgICBmb3IgY29udGFjdCBpbiBjb252LnJlYWRfc3RhdGVcbiAgICAgICAgY2hhdF9pZCA9IGNvbnRhY3QucGFydGljaXBhbnRfaWQuY2hhdF9pZFxuICAgICAgICBsYXN0X3JlYWQgPSBjb250YWN0Lmxhc3RfcmVhZF90aW1lc3RhbXAgPyBjb250YWN0LmxhdGVzdF9yZWFkX3RpbWVzdGFtcFxuICAgICAgICBmb3IgZSBpbiBjb252LmV2ZW50ID8gW10gd2hlbiBlLnRpbWVzdGFtcCA8PSBsYXN0X3JlYWRcbiAgICAgICAgICAgIGxhc3Rfc2Vlbl9ldmVudHNfYnlfdXNlcltjaGF0X2lkXSA9IGVcbiAgICBsYXN0X3NlZW5fZXZlbnRzX2J5X3VzZXJcblxuXG4jIHRoaXMgaXMgdXNlZCB3aGVuIHNlbmRpbmcgbmV3IG1lc3NhZ2VzLCB3ZSBhZGQgYSBwbGFjZWhvbGRlciB3aXRoXG4jIHRoZSBjb3JyZWN0IGNsaWVudF9nZW5lcmF0ZWRfaWQuIHRoaXMgZW50cnkgd2lsbCBiZSByZXBsYWNlZCBpblxuIyBhZGRDaGF0TWVzc2FnZSB3aGVuIHRoZSByZWFsIG1lc3NhZ2UgYXJyaXZlcyBmcm9tIHRoZSBzZXJ2ZXIuXG5hZGRDaGF0TWVzc2FnZVBsYWNlaG9sZGVyID0gKGNoYXRfaWQsIHtjb252X2lkLCBjbGllbnRfZ2VuZXJhdGVkX2lkLCBzZWdzaiwgdHMsIHVwbG9hZGltYWdlLCBtZXNzYWdlX2FjdGlvbl90eXBlfSkgLT5cbiAgICB0cyA9IHRzICogMTAwMCAjIGdvb2cgZm9ybVxuICAgIGV2ID1cbiAgICAgICAgY2hhdF9tZXNzYWdlOlxuICAgICAgICAgICAgYW5ub3RhdGlvbjptZXNzYWdlX2FjdGlvbl90eXBlXG4gICAgICAgICAgICBtZXNzYWdlX2NvbnRlbnQ6c2VnbWVudDpzZWdzalxuICAgICAgICBjb252ZXJzYXRpb25faWQ6aWQ6Y29udl9pZFxuICAgICAgICBzZWxmX2V2ZW50X3N0YXRlOmNsaWVudF9nZW5lcmF0ZWRfaWQ6Y2xpZW50X2dlbmVyYXRlZF9pZFxuICAgICAgICBzZW5kZXJfaWQ6XG4gICAgICAgICAgICBjaGF0X2lkOmNoYXRfaWRcbiAgICAgICAgICAgIGdhaWFfaWQ6Y2hhdF9pZFxuICAgICAgICB0aW1lc3RhbXA6dHNcbiAgICAgICAgcGxhY2Vob2xkZXI6dHJ1ZVxuICAgICAgICB1cGxvYWRpbWFnZTp1cGxvYWRpbWFnZVxuICAgICMgbGV0cyBzYXkgdGhpcyBpcyBhbHNvIHJlYWQgdG8gYXZvaWQgYW55IGJhZGdlc1xuICAgIHNyID0gbG9va3VwW2NvbnZfaWRdPy5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZT8uc2VsZl9yZWFkX3N0YXRlXG4gICAgaXNsYXRlciA9IHRzID4gc3I/LmxhdGVzdF9yZWFkX3RpbWVzdGFtcFxuICAgIHNyLmxhdGVzdF9yZWFkX3RpbWVzdGFtcCA9IHRzIGlmIHNyIGFuZCBpc2xhdGVyXG4gICAgIyB0aGlzIHRyaWdnZXJzIHRoZSBtb2RlbCB1cGRhdGVcbiAgICBhZGRDaGF0TWVzc2FnZSBldlxuXG5hZGRXYXRlcm1hcmsgPSAoZXYpIC0+XG4gICAgY29udl9pZCA9IGV2Py5jb252ZXJzYXRpb25faWQ/LmlkXG4gICAgcmV0dXJuIHVubGVzcyBjb252X2lkIGFuZCBjb252ID0gbG9va3VwW2NvbnZfaWRdXG4gICAgY29udi5yZWFkX3N0YXRlID0gW10gdW5sZXNzIGNvbnYucmVhZF9zdGF0ZVxuICAgIHtwYXJ0aWNpcGFudF9pZCwgbGF0ZXN0X3JlYWRfdGltZXN0YW1wfSA9IGV2XG4gICAgY29udi5yZWFkX3N0YXRlLnB1c2gge1xuICAgICAgICBwYXJ0aWNpcGFudF9pZFxuICAgICAgICBsYXRlc3RfcmVhZF90aW1lc3RhbXBcbiAgICB9XG4gICAgIyBwYWNrIHRoZSByZWFkX3N0YXRlIGJ5IGtlZXBpbmcgdGhlIGxhc3Qgb2YgZWFjaCBwYXJ0aWNpcGFudF9pZFxuICAgIGlmIGNvbnYucmVhZF9zdGF0ZS5sZW5ndGggPiAyMDBcbiAgICAgICAgcmV2ID0gY29udi5yZWFkX3N0YXRlLnJldmVyc2UoKVxuICAgICAgICB1bmlxID0gdW5pcWZuIHJldiwgKGUpIC0+IGUucGFydGljaXBhbnRfaWQuY2hhdF9pZFxuICAgICAgICBjb252LnJlYWRfc3RhdGUgPSB1bmlxLnJldmVyc2UoKVxuICAgIHNyID0gY29udj8uc2VsZl9jb252ZXJzYXRpb25fc3RhdGU/LnNlbGZfcmVhZF9zdGF0ZVxuICAgIGlzbGF0ZXIgPSBsYXRlc3RfcmVhZF90aW1lc3RhbXAgPiBzcj8ubGF0ZXN0X3JlYWRfdGltZXN0YW1wXG4gICAgaWYgZW50aXR5LmlzU2VsZihwYXJ0aWNpcGFudF9pZC5jaGF0X2lkKSBhbmQgc3IgYW5kIGlzbGF0ZXJcbiAgICAgICAgc3IubGF0ZXN0X3JlYWRfdGltZXN0YW1wID0gbGF0ZXN0X3JlYWRfdGltZXN0YW1wXG4gICAgdW5yZWFkVG90YWwoKVxuICAgIHVwZGF0ZWQgJ2NvbnYnXG5cbnVuaXFmbiA9IChhcywgZm4pIC0+IGJzID0gYXMubWFwIGZuOyBhcy5maWx0ZXIgKGUsIGkpIC0+IGJzLmluZGV4T2YoYnNbaV0pID09IGlcblxuc29ydGJ5ID0gKGNvbnYpIC0+IGNvbnY/LnNlbGZfY29udmVyc2F0aW9uX3N0YXRlPy5zb3J0X3RpbWVzdGFtcCA/IDBcblxuIyB0aGlzIG51bWJlciBjb3JyZWxhdGVzIHRvIG51bWJlciBvZiBtYXggZXZlbnRzIHdlIGdldCBmcm9tXG4jIGhhbmdvdXRzIG9uIGNsaWVudCBzdGFydHVwLlxuTUFYX1VOUkVBRCA9IDIwXG5cbnVucmVhZCA9IChjb252KSAtPlxuICAgIHQgPSBjb252Py5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZT8uc2VsZl9yZWFkX3N0YXRlPy5sYXRlc3RfcmVhZF90aW1lc3RhbXBcbiAgICByZXR1cm4gMCB1bmxlc3MgdHlwZW9mIHQgPT0gJ251bWJlcidcbiAgICBjID0gMFxuICAgIGZvciBlIGluIGNvbnY/LmV2ZW50ID8gW11cbiAgICAgICAgYysrIGlmIGUuY2hhdF9tZXNzYWdlIGFuZCBlLnRpbWVzdGFtcCA+IHQgYW5kIG5vdCBlbnRpdHkuaXNTZWxmIGUuc2VuZGVyX2lkLmNoYXRfaWRcbiAgICAgICAgcmV0dXJuIE1BWF9VTlJFQUQgaWYgYyA+PSBNQVhfVU5SRUFEXG4gICAgY1xuXG51bnJlYWRUb3RhbCA9IGRvIC0+XG4gICAgY3VycmVudCA9IDBcbiAgICBvck1vcmUgPSBmYWxzZVxuICAgIC0+XG4gICAgICAgIHN1bSA9IChhLCBiKSAtPiByZXR1cm4gYSArIGJcbiAgICAgICAgb3JNb3JlID0gZmFsc2VcbiAgICAgICAgY291bnR1bnJlYWQgPSAoYykgLT5cbiAgICAgICAgICAgIGlmIGlzUXVpZXQoYykgdGhlbiByZXR1cm4gMFxuICAgICAgICAgICAgY291bnQgPSBmdW5jcy51bnJlYWQgY1xuICAgICAgICAgICAgaWYgY291bnQgPT0gTUFYX1VOUkVBRCB0aGVuIG9yTW9yZSA9IHRydWVcbiAgICAgICAgICAgIHJldHVybiBjb3VudFxuICAgICAgICBuZXdUb3RhbCA9IGZ1bmNzLmxpc3QoZmFsc2UpLm1hcChjb3VudHVucmVhZCkucmVkdWNlKHN1bSwgMClcbiAgICAgICAgaWYgY3VycmVudCAhPSBuZXdUb3RhbFxuICAgICAgICAgICAgY3VycmVudCA9IG5ld1RvdGFsXG4gICAgICAgICAgICBsYXRlciAtPiBhY3Rpb24gJ3VucmVhZHRvdGFsJywgbmV3VG90YWwsIG9yTW9yZVxuICAgICAgICByZXR1cm4gbmV3VG90YWxcblxuaXNRdWlldCA9IChjKSAtPiBjPy5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZT8ubm90aWZpY2F0aW9uX2xldmVsID09ICdRVUlFVCdcblxuc3RhcnJlZGNvbnZzID0gdHJ5cGFyc2UobG9jYWxTdG9yYWdlLnN0YXJyZWRjb252cykgfHwgW11cblxuaXNTdGFycmVkID0gKGMpIC0+IHJldHVybiBjPy5jb252ZXJzYXRpb25faWQ/LmlkIGluIHN0YXJyZWRjb252c1xuXG50b2dnbGVTdGFyID0gKGMpIC0+XG4gICAge2lkfSA9IGM/LmNvbnZlcnNhdGlvbl9pZFxuICAgIGlmIGlkIG5vdCBpbiBzdGFycmVkY29udnNcbiAgICAgICAgc3RhcnJlZGNvbnZzLnB1c2goaWQpXG4gICAgZWxzZVxuICAgICAgICBzdGFycmVkY29udnMgPSAoaSBmb3IgaSBpbiBzdGFycmVkY29udnMgd2hlbiBpICE9IGlkKVxuICAgIGxvY2FsU3RvcmFnZS5zdGFycmVkY29udnMgPSBKU09OLnN0cmluZ2lmeShzdGFycmVkY29udnMpO1xuICAgIHVwZGF0ZWQgJ2NvbnYnXG5cbmlzRXZlbnRUeXBlID0gKHR5cGUpIC0+IChldikgLT4gISFldlt0eXBlXVxuXG4jIGEgXCJoYW5nb3V0XCIgaXMgaW4gZ29vZ2xlIHRlcm1zIHN0cmljdGx5IGFuIGF1ZGlvL3ZpZGVvIGV2ZW50XG4jIG1hbnkgY29udmVyc2F0aW9ucyBpbiB0aGUgY29udmVyc2F0aW9uIGxpc3QgYXJlIGp1c3Qgc3VjaCBhblxuIyBldmVudCB3aXRoIG5vIGZ1cnRoZXIgY2hhdCBtZXNzYWdlcyBvciBhY3Rpdml0eS4gdGhpcyBmdW5jdGlvblxuIyB0ZWxscyB3aGV0aGVyIGEgaGFuZ291dCBvbmx5IGNvbnRhaW5zIHZpZGVvL2F1ZGlvLlxuaXNQdXJlSGFuZ291dCA9IGRvIC0+XG4gICAgbm90cyA9IFsnY2hhdF9tZXNzYWdlJywgJ2NvbnZlcnNhdGlvbl9yZW5hbWUnXS5tYXAoaXNFdmVudFR5cGUpXG4gICAgaXNOb3RIYW5nb3V0ID0gKGUpIC0+IG5vdHMuc29tZSAoZikgLT4gZihlKVxuICAgIChjKSAtPlxuICAgICAgICBub3QgKGM/LmV2ZW50ID8gW10pLnNvbWUgaXNOb3RIYW5nb3V0XG5cbiMgdGhlIHRpbWUgb2YgdGhlIGxhc3QgYWRkZWQgZXZlbnRcbmxhc3RDaGFuZ2VkID0gKGMpIC0+IChjPy5ldmVudD9bKGM/LmV2ZW50Py5sZW5ndGggPyAwKSAtIDFdPy50aW1lc3RhbXAgPyAwKSAvIDEwMDBcblxuIyB0aGUgbnVtYmVyIG9mIGhpc3RvcnkgZXZlbnRzIHRvIHJlcXVlc3RcbkhJU1RPUllfQU1PVU5UID0gMjBcblxuIyBhZGQgYSB0eXBpbmcgZW50cnlcbmFkZFR5cGluZyA9ICh0eXBpbmcpIC0+XG4gICAgY29udl9pZCA9IHR5cGluZz8uY29udmVyc2F0aW9uX2lkPy5pZFxuICAgICMgbm8gdHlwaW5nIGVudHJpZXMgZm9yIHNlbGZcbiAgICByZXR1cm4gaWYgZW50aXR5LmlzU2VsZiB0eXBpbmcudXNlcl9pZC5jaGF0X2lkXG4gICAgIyBhbmQgbm8gZW50cmllcyBpbiBub24tZXhpc3RpbmcgY29udnNcbiAgICByZXR1cm4gdW5sZXNzIGMgPSBsb29rdXBbY29udl9pZF1cbiAgICBjLnR5cGluZyA9IFtdIHVubGVzcyBjLnR5cGluZ1xuICAgICMgbGVuZ3RoIGF0IHN0YXJ0XG4gICAgbGVuID0gYy50eXBpbmcubGVuZ3RoXG4gICAgIyBhZGQgbmV3IHN0YXRlIHRvIHN0YXJ0IG9mIGFycmF5XG4gICAgYy50eXBpbmcudW5zaGlmdCB0eXBpbmdcbiAgICAjIGVuc3VyZSB0aGVyZSdzIG9ubHkgb25lIGVudHJ5IGluIGFycmF5IHBlciB1c2VyXG4gICAgYy50eXBpbmcgPSB1bmlxZm4gYy50eXBpbmcsICh0KSAtPiB0LnVzZXJfaWQuY2hhdF9pZFxuICAgICMgYW5kIHNvcnQgaXQgaW4gYSBzdGFibGUgd2F5XG4gICAgYy50eXBpbmcuc29ydCAodDEsIHQyKSAtPiB0MS51c2VyX2lkLmNoYXRfaWQgLSB0Mi51c2VyX2lkLmNoYXRfaWRcbiAgICAjIHNjaGVkdWxlIGEgcHJ1bmluZ1xuICAgIGxhdGVyIC0+IGFjdGlvbiAncHJ1bmVUeXBpbmcnLCBjb252X2lkXG4gICAgIyBhbmQgbWFyayBhcyB1cGRhdGVkXG4gICAgdXBkYXRlZCAnY29udidcbiAgICAjIGluZGljaWF0ZSB3ZSBqdXN0IHN0YXJ0ZWQgaGF2aW5nIHR5cGluZyBlbnRyaWVzXG4gICAgdXBkYXRlZCAnc3RhcnRUeXBpbmcnIGlmIGxlbiA9PSAwXG5cbiMgcHJ1bmUgb2xkIHR5cGluZyBlbnRyaWVzXG5wcnVuZVR5cGluZyA9IGRvIC0+XG5cbiAgICBmaW5kTmV4dCA9IChhcnIpIC0+XG4gICAgICAgIGV4cGlyeSA9IGFyci5tYXAgKHQpIC0+IHQudGltZXN0YW1wICsga2VlcEZvcih0KVxuICAgICAgICBuZXh0ID0gaSBmb3IgdCwgaSBpbiBleHBpcnkgd2hlbiAhbmV4dCBvciBleHBpcnlbaV0gPCBleHBpcnlbbmV4dF1cbiAgICAgICAgbmV4dFxuXG4gICAgS0VFUF9TVE9QUEVEID0gMTUwMCAgIyB0aW1lIHRvIGtlZXAgU1RPUFBFRCB0eXBpbmcgZW50cmllc1xuICAgIEtFRVBfT1RIRVJTICA9IDEwMDAwICMgdGltZSB0byBrZWVwIG90aGVyIHR5cGluZyBlbnRyaWVzIGJlZm9yZSBwcnVuaW5nXG5cbiAgICBrZWVwRm9yID0gKHQpIC0+IGlmIHQ/LnN0YXR1cyA9PSAnU1RPUFBFRCcgdGhlbiBLRUVQX1NUT1BQRUQgZWxzZSBLRUVQX09USEVSU1xuXG4gICAgcHJ1bmUgPSAodCkgLT4gKERhdGUubm93KCkgLSB0Py50aW1lc3RhbXAgLyAxMDAwKSA8IGtlZXBGb3IodClcblxuICAgIChjb252X2lkKSAtPlxuICAgICAgICByZXR1cm4gdW5sZXNzIGMgPSBsb29rdXBbY29udl9pZF1cbiAgICAgICAgIyBzdG9wIGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGMudHlwaW5ndGltZXIgPSBjbGVhclRpbWVvdXQgYy50eXBpbmd0aW1lciBpZiBjLnR5cGluZ3RpbWVyXG4gICAgICAgICMgdGhlIGxlbmd0aCBiZWZvcmUgcHJ1bmVcbiAgICAgICAgbGVuZ3RoQmVmb3JlID0gYy50eXBpbmcubGVuZ3RoXG4gICAgICAgICMgZmlsdGVyIG91dCBvbGQgc3R1ZmZcbiAgICAgICAgYy50eXBpbmcgPSBjLnR5cGluZy5maWx0ZXIocHJ1bmUpXG4gICAgICAgICMgbWF5YmUgd2UgY2hhbmdlZCBzb21ldGhpbmc/XG4gICAgICAgIHVwZGF0ZWQgJ2NvbnYnIGlmIGMudHlwaW5nLmxlbmd0aCAhPSBsZW5ndGhCZWZvcmVcbiAgICAgICAgIyB3aGVuIGlzIG5leHQgZXhwaXJpbmc/XG4gICAgICAgIHJldHVybiB1bmxlc3MgKG5leHRpZHggPSBmaW5kTmV4dCBjLnR5cGluZykgPj0gMFxuICAgICAgICAjIHRoZSBuZXh0IGVudHJ5IHRvIGV4cGlyZVxuICAgICAgICBuZXh0ID0gYy50eXBpbmdbbmV4dGlkeF1cbiAgICAgICAgIyBob3cgbG9uZyB3ZSB3YWl0IHVudGlsIGRvaW5nIGFub3RoZXIgcHJ1bmVcbiAgICAgICAgd2FpdFVudGlsID0gKGtlZXBGb3IobmV4dCkgKyBuZXh0LnRpbWVzdGFtcCAvIDEwMDApIC0gRGF0ZS5ub3coKVxuICAgICAgICByZXR1cm4gY29uc29sZS5lcnJvciAndHlwaW5nIHBydW5lIGVycm9yJywgd2FpdFVudGlsIGlmIHdhaXRVbnRpbCA8IDBcbiAgICAgICAgIyBzY2hlZHVsZSBuZXh0IHBydW5lXG4gICAgICAgIGMudHlwaW5ndGltZXIgPSBzZXRUaW1lb3V0ICgtPiBhY3Rpb24gJ3BydW5lVHlwaW5nJywgY29udl9pZCksIHdhaXRVbnRpbFxuXG5mdW5jcyA9XG4gICAgY291bnQ6IC0+XG4gICAgICAgIGMgPSAwOyAoYysrIGZvciBrLCB2IG9mIGxvb2t1cCB3aGVuIHR5cGVvZiB2ID09ICdvYmplY3QnKTsgY1xuXG4gICAgX3Jlc2V0OiAtPlxuICAgICAgICBkZWxldGUgbG9va3VwW2tdIGZvciBrLCB2IG9mIGxvb2t1cCB3aGVuIHR5cGVvZiB2ID09ICdvYmplY3QnXG4gICAgICAgIHVwZGF0ZWQgJ2NvbnYnXG4gICAgICAgIG51bGxcblxuICAgIF9pbml0RnJvbUNvbnZTdGF0ZXM6IChjb252cykgLT5cbiAgICAgICAgYyA9IDBcbiAgICAgICAgY291bnRJZiA9IChhKSAtPiBjKysgaWYgYVxuICAgICAgICBjb3VudElmIGFkZCBjb252IGZvciBjb252IGluIGNvbnZzXG4gICAgICAgIHVwZGF0ZWQgJ2NvbnYnXG4gICAgICAgIGNcblxuICAgIGFkZDphZGRcbiAgICByZW5hbWU6IHJlbmFtZVxuICAgIGFkZENoYXRNZXNzYWdlOiBhZGRDaGF0TWVzc2FnZVxuICAgIGFkZENoYXRNZXNzYWdlUGxhY2Vob2xkZXI6IGFkZENoYXRNZXNzYWdlUGxhY2Vob2xkZXJcbiAgICBhZGRXYXRlcm1hcms6IGFkZFdhdGVybWFya1xuICAgIE1BWF9VTlJFQUQ6IE1BWF9VTlJFQURcbiAgICB1bnJlYWQ6IHVucmVhZFxuICAgIGlzUXVpZXQ6IGlzUXVpZXRcbiAgICBpc1N0YXJyZWQ6IGlzU3RhcnJlZFxuICAgIHRvZ2dsZVN0YXI6IHRvZ2dsZVN0YXJcbiAgICBpc1B1cmVIYW5nb3V0OiBpc1B1cmVIYW5nb3V0XG4gICAgbGFzdENoYW5nZWQ6IGxhc3RDaGFuZ2VkXG4gICAgYWRkVHlwaW5nOiBhZGRUeXBpbmdcbiAgICBwcnVuZVR5cGluZzogcHJ1bmVUeXBpbmdcbiAgICB1bnJlYWRUb3RhbDogdW5yZWFkVG90YWxcbiAgICBmaW5kTGFzdFJlYWRFdmVudHNCeVVzZXI6IGZpbmRMYXN0UmVhZEV2ZW50c0J5VXNlclxuXG4gICAgc2V0Tm90aWZpY2F0aW9uTGV2ZWw6IChjb252X2lkLCBsZXZlbCkgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBjID0gbG9va3VwW2NvbnZfaWRdXG4gICAgICAgIGMuc2VsZl9jb252ZXJzYXRpb25fc3RhdGU/Lm5vdGlmaWNhdGlvbl9sZXZlbCA9IGxldmVsXG4gICAgICAgIHVwZGF0ZWQgJ2NvbnYnXG5cbiAgICBkZWxldGVDb252OiAoY29udl9pZCkgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBjID0gbG9va3VwW2NvbnZfaWRdXG4gICAgICAgIGRlbGV0ZSBsb29rdXBbY29udl9pZF1cbiAgICAgICAgdmlld3N0YXRlLnNldFNlbGVjdGVkQ29udiBudWxsXG4gICAgICAgIHVwZGF0ZWQgJ2NvbnYnXG5cbiAgICByZW1vdmVQYXJ0aWNpcGFudHM6IChjb252X2lkLCBpZHMpIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgYyA9IGxvb2t1cFtjb252X2lkXVxuICAgICAgICBnZXRJZCA9IChwKSAtPiByZXR1cm4gcC5pZC5jaGF0X2lkIG9yIHAuaWQuZ2FpYV9pZFxuICAgICAgICBjLnBhcnRpY2lwYW50X2RhdGEgPSAocCBmb3IgcCBpbiBjLnBhcnRpY2lwYW50X2RhdGEgd2hlbiBnZXRJZChwKSBub3QgaW4gaWRzKVxuXG4gICAgYWRkUGFydGljaXBhbnQ6IChjb252X2lkLCBwYXJ0aWNpcGFudCkgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBjID0gbG9va3VwW2NvbnZfaWRdXG4gICAgICAgIGMucGFydGljaXBhbnRfZGF0YS5wdXNoIHBhcnRpY2lwYW50XG5cbiAgICByZXBsYWNlRnJvbVN0YXRlczogKHN0YXRlcykgLT5cbiAgICAgICAgYWRkIHN0IGZvciBzdCBpbiBzdGF0ZXNcbiAgICAgICAgdXBkYXRlZCAnY29udidcblxuICAgIHVwZGF0ZUF0VG9wOiAoYXR0b3ApIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3Mgdmlld3N0YXRlLnN0YXRlID09IHZpZXdzdGF0ZS5TVEFURV9OT1JNQUxcbiAgICAgICAgY29udl9pZCA9IHZpZXdzdGF0ZT8uc2VsZWN0ZWRDb252XG4gICAgICAgIGlmIGF0dG9wIGFuZCAoYyA9IGxvb2t1cFtjb252X2lkXSkgYW5kICFjPy5ub21vcmVoaXN0b3J5IGFuZCAhYz8ucmVxdWVzdGluZ2hpc3RvcnlcbiAgICAgICAgICAgIHRpbWVzdGFtcCA9IChjLmV2ZW50P1swXT8udGltZXN0YW1wID8gMCkgLyAxMDAwXG4gICAgICAgICAgICByZXR1cm4gdW5sZXNzIHRpbWVzdGFtcFxuICAgICAgICAgICAgYy5yZXF1ZXN0aW5naGlzdG9yeSA9IHRydWVcbiAgICAgICAgICAgIGxhdGVyIC0+IGFjdGlvbiAnaGlzdG9yeScsIGNvbnZfaWQsIHRpbWVzdGFtcCwgSElTVE9SWV9BTU9VTlRcbiAgICAgICAgICAgIHVwZGF0ZWQgJ2NvbnYnXG5cbiAgICB1cGRhdGVNZXRhZGF0YTogKHN0YXRlLCByZWRyYXcgPSB0cnVlKSAtPlxuICAgICAgICBjb252X2lkID0gc3RhdGU/LmNvbnZlcnNhdGlvbl9pZD8uaWRcbiAgICAgICAgcmV0dXJuIHVubGVzcyBjID0gbG9va3VwW2NvbnZfaWRdXG5cbiAgICAgICAgYy5yZWFkX3N0YXRlID0gc3RhdGUuY29udmVyc2F0aW9uPy5yZWFkX3N0YXRlID8gYy5yZWFkX3N0YXRlXG5cbiAgICAgICAgQHJlZHJhd19jb252ZXJzYXRpb24oKSBpZiByZWRyYXdcblxuICAgIHJlZHJhd19jb252ZXJzYXRpb246ICgpIC0+XG4gICAgICAgICMgZmlyc3Qgc2lnbmFsIGlzIHRvIGdpdmUgdmlld3MgYSBjaGFuZ2UgdG8gcmVjb3JkIHRoZVxuICAgICAgICAjIGN1cnJlbnQgdmlldyBwb3NpdGlvbiBiZWZvcmUgaW5qZWN0aW5nIG5ldyBET01cbiAgICAgICAgdXBkYXRlZCAnYmVmb3JlSGlzdG9yeSdcbiAgICAgICAgIyByZWRyYXdcbiAgICAgICAgdXBkYXRlZCAnY29udidcbiAgICAgICAgIyBsYXN0IHNpZ25hbCBpcyB0byBtb3ZlIHZpZXcgdG8gYmUgYXQgc2FtZSBwbGFjZVxuICAgICAgICAjIGFzIHdoZW4gd2UgaW5qZWN0ZWQgRE9NLlxuICAgICAgICB1cGRhdGVkICdhZnRlckhpc3RvcnknXG5cbiAgICB1cGRhdGVIaXN0b3J5OiAoc3RhdGUpIC0+XG4gICAgICAgIGNvbnZfaWQgPSBzdGF0ZT8uY29udmVyc2F0aW9uX2lkPy5pZFxuICAgICAgICByZXR1cm4gdW5sZXNzIGMgPSBsb29rdXBbY29udl9pZF1cbiAgICAgICAgYy5yZXF1ZXN0aW5naGlzdG9yeSA9IGZhbHNlXG4gICAgICAgIGV2ZW50ID0gc3RhdGU/LmV2ZW50XG5cbiAgICAgICAgQHVwZGF0ZU1ldGFkYXRhKHN0YXRlLCBmYWxzZSlcblxuICAgICAgICBjLmV2ZW50ID0gKGV2ZW50ID8gW10pLmNvbmNhdCAoYy5ldmVudCA/IFtdKVxuICAgICAgICBjLm5vbW9yZWhpc3RvcnkgPSB0cnVlIGlmIGV2ZW50Py5sZW5ndGggPT0gMFxuXG4gICAgICAgIEByZWRyYXdfY29udmVyc2F0aW9uKClcblxuICAgIHVwZGF0ZVBsYWNlaG9sZGVySW1hZ2U6ICh7Y29udl9pZCwgY2xpZW50X2dlbmVyYXRlZF9pZCwgcGF0aH0pIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgYyA9IGxvb2t1cFtjb252X2lkXVxuICAgICAgICBjcG9zID0gZmluZENsaWVudEdlbmVyYXRlZCBjLCBjbGllbnRfZ2VuZXJhdGVkX2lkXG4gICAgICAgIGV2ID0gYy5ldmVudFtjcG9zXVxuICAgICAgICBzZWcgPSBldi5jaGF0X21lc3NhZ2UubWVzc2FnZV9jb250ZW50LnNlZ21lbnRbMF1cbiAgICAgICAgc2VnLmxpbmtfZGF0YSA9IGxpbmtfdGFyZ2V0OnBhdGhcbiAgICAgICAgdXBkYXRlZCAnY29udidcblxuICAgIGxpc3Q6IChzb3J0ID0gdHJ1ZSkgLT5cbiAgICAgICAgY29udnMgPSAodiBmb3IgaywgdiBvZiBsb29rdXAgd2hlbiB0eXBlb2YgdiA9PSAnb2JqZWN0JylcbiAgICAgICAgaWYgc29ydFxuICAgICAgICAgICAgc3RhcnJlZCA9IChjIGZvciBjIGluIGNvbnZzIHdoZW4gaXNTdGFycmVkKGMpKVxuICAgICAgICAgICAgY29udnMgPSAoYyBmb3IgYyBpbiBjb252cyB3aGVuIG5vdCBpc1N0YXJyZWQoYykpXG4gICAgICAgICAgICBzdGFycmVkLnNvcnQgKGUxLCBlMikgLT4gbmFtZW9mY29udihlMSkubG9jYWxlQ29tcGFyZShuYW1lb2Zjb252KGUyKSlcbiAgICAgICAgICAgIGNvbnZzLnNvcnQgKGUxLCBlMikgLT4gc29ydGJ5KGUyKSAtIHNvcnRieShlMSlcbiAgICAgICAgICAgIHJldHVybiBzdGFycmVkLmNvbmNhdCBjb252c1xuICAgICAgICBjb252c1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZSBsb29rdXAsIGZ1bmNzXG4iXX0=
