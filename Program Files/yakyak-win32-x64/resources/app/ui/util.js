(function() {
  var AutoLaunch, URL, autoLaunchPath, autoLauncher, clipboard, convertEmoji, drawAvatar, escapeRegExp, fixlink, getImageUrl, getProxiedName, initialsof, insertTextAtCursor, isAboutLink, isContentPasteable, isImg, later, linkto, nameof, nameofconv, notificationCenterSupportsSound, notifier, throttle, toggleVisibility, topof, tryparse, uniqfn, versions;

  URL = require('url');

  notifier = require('node-notifier');

  AutoLaunch = require('auto-launch');

  clipboard = require('electron').clipboard;

  
  // Checks if the clipboard has pasteable content.

  // Currently only text and images are supported

  isContentPasteable = function() {
    var content, formats, j, len, pasteableContent;
    formats = clipboard.availableFormats();
    // as more content is supported in clipboard it should be placed here
    pasteableContent = ['text/plain', 'image/png'];
    isContentPasteable = 0;
    for (j = 0, len = formats.length; j < len; j++) {
      content = formats[j];
      isContentPasteable += pasteableContent.includes(content);
    }
    return isContentPasteable > 0;
  };

  notificationCenterSupportsSound = function() {
    var notifierSupportsSound, playSoundIn;
    // check if sound should be played via notification
    //  documentation says that only WindowsToaster and
    //  NotificationCenter supports sound
    playSoundIn = ['WindowsToaster', 'NotificationCenter'];
    // check if currect notifier supports sound
    return notifierSupportsSound = playSoundIn.find(function(str) {
      return str === notifier.constructor.name;
    }) != null;
  };

  nameof = function(e) {
    var ref, ref1, ref2;
    return (ref = (ref1 = (ref2 = e != null ? e.display_name : void 0) != null ? ref2 : e != null ? e.fallback_name : void 0) != null ? ref1 : e != null ? e.first_name : void 0) != null ? ref : 'Unknown';
  };

  initialsof = function(e) {
    var firstname, lastname, name, name_splitted, name_to_split, ref;
    if (e != null ? e.first_name : void 0) {
      name = nameof(e);
      firstname = e != null ? e.first_name : void 0;
      return firstname.charAt(0) + name.replace(firstname, "").charAt(1);
    } else if ((e != null ? e.display_name : void 0) || (e != null ? e.fallback_name : void 0)) {
      name_to_split = (ref = e != null ? e.display_name : void 0) != null ? ref : e != null ? e.fallback_name : void 0;
      name_splitted = name_to_split.split(' ');
      firstname = name_splitted[0].charAt(0);
      if (name_splitted.length === 1) {
        return firstname.charAt(0);
      // just in case something strange
      } else if ((name_splitted != null ? name_splitted.length : void 0) === 0) {
        return '?';
      } else {
        lastname = name_splitted[name_splitted.length - 1];
        return firstname.charAt(0) + lastname.charAt(0);
      }
    } else {
      return '?';
    }
  };

  drawAvatar = function(user_id, viewstate, entity, image = null, email = null, initials = null) {
    var initialsCode, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7;
    if (entity[user_id] == null) {
      
      entity.needEntity(user_id);
    }
    if (entity[user_id] != null) {
      
      // overwrites if entity is cached
      initials = initialsof(entity[user_id]).toUpperCase();
    }
    if (((ref = entity[user_id]) != null ? (ref1 = ref.emails) != null ? ref1[0] : void 0 : void 0) == null) {
      email = (ref2 = entity[user_id]) != null ? (ref3 = ref2.emails) != null ? ref3[0] : void 0 : void 0;
    }
    if (((ref4 = entity[user_id]) != null ? ref4.photo_url : void 0) != null) {
      image = (ref5 = entity[user_id]) != null ? ref5.photo_url : void 0;
    }
    
    // Reproducible color code for initials
    //  see global.less for the color mapping [-1-25]
    //     -1: ? initials
    //   0-25: should be a uniform distribution of colors per users
    initialsCode = (ref6 = (ref7 = viewstate.cachedInitialsCode) != null ? ref7[user_id] : void 0) != null ? ref6 : (isNaN(user_id) ? initialsCode = -1 : initialsCode = user_id % 26);
    
    return div({
      class: 'avatar',
      'data-id': user_id
    }, function() {
      if (image != null) {
        if (!(viewstate != null ? viewstate.showAnimatedThumbs : void 0)) {
          image += "?sz=50";
        }
        
        img({
          src: fixlink(image),
          "data-initials": initials,
          class: 'fallback-on',
          onerror: function(ev) {
            // in case the image is not available, it
            //  fallbacks to initials
            return ev.target.parentElement.classList.add("fallback-on");
          },
          onload: function(ev) {
            // when loading successfuly, update again all other imgs
            return ev.target.parentElement.classList.remove("fallback-on");
          }
        });
      }
      return div({
        class: `initials ${image ? 'fallback' : ''}`,
        'data-first-letter': initialsCode
      }, initials);
    });
  };

  nameofconv = function(c) {
    var entity, ents, name, names, one_to_one, p, part, ref, ref1;
    ({entity} = require('./models'));
    part = (ref = c != null ? c.current_participant : void 0) != null ? ref : [];
    ents = (function() {
      var j, len, results;
      results = [];
      for (j = 0, len = part.length; j < len; j++) {
        p = part[j];
        if (!entity.isSelf(p.chat_id)) {
          results.push(entity[p.chat_id]);
        }
      }
      return results;
    })();
    name = "";
    one_to_one = (c != null ? (ref1 = c.type) != null ? ref1.indexOf('ONE_TO_ONE') : void 0 : void 0) >= 0;
    if (((c != null ? c.name : void 0) != null) && !one_to_one) {
      name = c.name;
    } else {
      // all entities in conversation that is not self
      // the names of those entities
      names = ents.map(nameof);
      // joined together in a compelling manner
      name = names.join(', ');
    }
    return name;
  };

  linkto = function(c) {
    return `https://plus.google.com/u/0/${c}/about`;
  };

  later = function(f) {
    return setTimeout(f, 1);
  };

  throttle = function(ms, f) {
    var g, last, tim;
    last = 0;
    tim = null;
    return g = function(...as) {
      var d, ret;
      if (tim) {
        clearTimeout(tim);
      }
      if ((d = Date.now() - last) > ms) {
        ret = f(...as);
        last = Date.now();
        return ret;
      } else {
        // ensure that last event is always fired
        tim = setTimeout((function() {
          return g(...as);
        }), d);
        return void 0;
      }
    };
  };

  isAboutLink = function(s) {
    var ref;
    return ((ref = /https:\/\/plus.google.com\/u\/0\/([0-9]+)\/about/.exec(s)) != null ? ref : [])[1];
  };

  getProxiedName = function(e) {
    var ref, ref1, ref2, ref3, ref4, s;
    s = e != null ? (ref = e.chat_message) != null ? (ref1 = ref.message_content) != null ? (ref2 = ref1.segment) != null ? ref2[0] : void 0 : void 0 : void 0 : void 0;
    if (!s) {
      return;
    }
    return (s != null ? (ref3 = s.formatting) != null ? ref3.bold : void 0 : void 0) && isAboutLink(s != null ? (ref4 = s.link_data) != null ? ref4.link_target : void 0 : void 0);
  };

  tryparse = function(s) {
    var err;
    try {
      return JSON.parse(s);
    } catch (error) {
      err = error;
      return void 0;
    }
  };

  fixlink = function(l) {
    if ((l != null ? l[0] : void 0) === '/') {
      return `https:${l}`;
    } else {
      return l;
    }
  };

  topof = function(el) {
    return (el != null ? el.offsetTop : void 0) + ((el != null ? el.offsetParent : void 0) ? topof(el.offsetParent) : 0);
  };

  uniqfn = function(as, fn) {
    var fned;
    fned = as.map(fn);
    return as.filter(function(v, i) {
      return fned.indexOf(fned[i]) === i;
    });
  };

  isImg = function(url) {
    return url != null ? url.match(/\.(png|jpe?g|gif|svg)$/i) : void 0;
  };

  getImageUrl = function(url = "") {
    var parsed;
    if ((url == null) | url === "") {
      return false;
    }
    if (isImg(url)) {
      return url;
    }
    parsed = URL.parse(url, true);
    url = parsed.query.q;
    if (isImg(url)) {
      return url;
    }
    return false;
  };

  toggleVisibility = function(element) {
    if (element.style.display === 'block') {
      return element.style.display = 'none';
    } else {
      return element.style.display = 'block';
    }
  };

  escapeRegExp = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  };

  convertEmoji = function(text) {
    var el, emojiCodeRegex, inferedPattern, patterns, unicodeMap;
    unicodeMap = require('./emojishortcode');
    inferedPattern = "(^|[ ])" + "(:\\(:\\)|:\\(\\|\\)|:X\\)|:3|\\(=\\^\\.\\.\\^=\\)|\\(=\\^\\.\\^=\\)|=\\^_\\^=|" + ((function() {
      var j, len, ref, results;
      ref = Object.keys(unicodeMap);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        el = ref[j];
        results.push(escapeRegExp(el));
      }
      return results;
    })()).join('|') + ")([ ]|$)";
    patterns = [inferedPattern];
    emojiCodeRegex = new RegExp(patterns.join('|'), 'g');
    text = text.replace(emojiCodeRegex, function(emoji) {
      var prefix, suffix, unicode;
      suffix = emoji.slice(emoji.trimRight().length);
      prefix = emoji.slice(0, emoji.length - emoji.trimLeft().length);
      unicode = unicodeMap[emoji.trim()];
      if (unicode != null) {
        return prefix + unicode + suffix;
      } else {
        return emoji;
      }
    });
    return text;
  };

  insertTextAtCursor = function(el, text) {
    var doc, endIndex, range, value;
    value = el.value;
    doc = el.ownerDocument;
    if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
      endIndex = el.selectionEnd;
      el.value = value.slice(0, endIndex) + text + value.slice(endIndex);
      el.selectionStart = el.selectionEnd = endIndex + text.length;
      return el.focus();
    } else if (doc.selection !== "undefined" && doc.selection.createRange) {
      el.focus();
      range = doc.selection.createRange();
      range.collapse(false);
      range.text = text;
      return range.select();
    }
  };

  // AutoLaunch requires a path unless you are running in electron/nw
  versions = typeof process !== "undefined" && process !== null ? process.versions : void 0;

  if ((versions != null) && ((versions.nw != null) || (versions['node-webkit'] != null) || (versions.electron != null))) {
    autoLaunchPath = void 0;
  } else {
    autoLaunchPath = process.execPath;
  }

  autoLauncher = new AutoLaunch({
    name: 'YakYak',
    path: autoLaunchPath,
    mac: {
      useLaunchAgent: true
    }
  });

  module.exports = {nameof, initialsof, nameofconv, linkto, later, throttle, uniqfn, isAboutLink, getProxiedName, tryparse, fixlink, topof, isImg, getImageUrl, toggleVisibility, convertEmoji, drawAvatar, notificationCenterSupportsSound, insertTextAtCursor, isContentPasteable, autoLauncher};

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdXRpbC5qcyIsInNvdXJjZXMiOlsidWkvdXRpbC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUEsY0FBQSxFQUFBLFlBQUEsRUFBQSxTQUFBLEVBQUEsWUFBQSxFQUFBLFVBQUEsRUFBQSxZQUFBLEVBQUEsT0FBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsVUFBQSxFQUFBLGtCQUFBLEVBQUEsV0FBQSxFQUFBLGtCQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSwrQkFBQSxFQUFBLFFBQUEsRUFBQSxRQUFBLEVBQUEsZ0JBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLE1BQUEsRUFBQTs7RUFBQSxHQUFBLEdBQVksT0FBQSxDQUFRLEtBQVI7O0VBQ1osUUFBQSxHQUFZLE9BQUEsQ0FBUSxlQUFSOztFQUNaLFVBQUEsR0FBYSxPQUFBLENBQVEsYUFBUjs7RUFDYixTQUFBLEdBQVksT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQyxVQUhoQzs7Ozs7OztFQVdBLGtCQUFBLEdBQXFCLFFBQUEsQ0FBQSxDQUFBO0FBQ3JCLFFBQUEsT0FBQSxFQUFBLE9BQUEsRUFBQSxDQUFBLEVBQUEsR0FBQSxFQUFBO0lBQUksT0FBQSxHQUFVLFNBQVMsQ0FBQyxnQkFBVixDQUFBLEVBQWQ7O0lBRUksZ0JBQUEsR0FBbUIsQ0FBQyxZQUFELEVBQWUsV0FBZjtJQUNuQixrQkFBQSxHQUFxQjtJQUNyQixLQUFBLHlDQUFBOztNQUNJLGtCQUFBLElBQXNCLGdCQUFnQixDQUFDLFFBQWpCLENBQTBCLE9BQTFCO0lBRDFCO1dBRUEsa0JBQUEsR0FBcUI7RUFQSjs7RUFTckIsK0JBQUEsR0FBa0MsUUFBQSxDQUFBLENBQUE7QUFDbEMsUUFBQSxxQkFBQSxFQUFBLFdBQUE7Ozs7SUFHSSxXQUFBLEdBQWMsQ0FBQyxnQkFBRCxFQUFtQixvQkFBbkIsRUFI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S0FBSyxDQUFDLElBQU4sR0FBYTthQUNiLEtBQUssQ0FBQyxNQUFOLENBQUEsRUFMQzs7RUFSWSxFQXhMckI7OztFQXdNQSxRQUFBLHdEQUFXLE9BQU8sQ0FBRTs7RUFDcEIsSUFBRyxrQkFBQSxJQUFjLENBQUMscUJBQUEsSUFBZ0IsaUNBQWhCLElBQTRDLDJCQUE3QyxDQUFqQjtJQUNJLGNBQUEsR0FBaUIsT0FEckI7R0FBQSxNQUFBO0lBR0ksY0FBQSxHQUFpQixPQUFPLENBQUMsU0FIN0I7OztFQUlBLFlBQUEsR0FBZSxJQUFJLFVBQUosQ0FBZTtJQUMxQixJQUFBLEVBQU0sUUFEb0I7SUFFMUIsSUFBQSxFQUFNLGNBRm9CO0lBRzFCLEdBQUEsRUFBSztNQUNELGNBQUEsRUFBZ0I7SUFEZjtFQUhxQixDQUFmOztFQVFmLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLENBQUMsTUFBRCxFQUFTLFVBQVQsRUFBcUIsVUFBckIsRUFBaUMsTUFBakMsRUFBeUMsS0FBekMsRUFDQyxRQURELEVBQ1csTUFEWCxFQUNtQixXQURuQixFQUNnQyxjQURoQyxFQUNnRCxRQURoRCxFQUVDLE9BRkQsRUFFVSxLQUZWLEVBRWlCLEtBRmpCLEVBRXdCLFdBRnhCLEVBRXFDLGdCQUZyQyxFQUdDLFlBSEQsRUFHZSxVQUhmLEVBRzJCLCtCQUgzQixFQUlDLGtCQUpELEVBSXFCLGtCQUpyQixFQUl5QyxZQUp6QztBQXJOakIiLCJzb3VyY2VzQ29udGVudCI6WyJVUkwgICAgICAgPSByZXF1aXJlICd1cmwnXG5ub3RpZmllciAgPSByZXF1aXJlICdub2RlLW5vdGlmaWVyJ1xuQXV0b0xhdW5jaCA9IHJlcXVpcmUgJ2F1dG8tbGF1bmNoJ1xuY2xpcGJvYXJkID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5jbGlwYm9hcmRcblxuI1xuI1xuIyBDaGVja3MgaWYgdGhlIGNsaXBib2FyZCBoYXMgcGFzdGVhYmxlIGNvbnRlbnQuXG4jXG4jIEN1cnJlbnRseSBvbmx5IHRleHQgYW5kIGltYWdlcyBhcmUgc3VwcG9ydGVkXG4jXG5pc0NvbnRlbnRQYXN0ZWFibGUgPSAoKSAtPlxuICAgIGZvcm1hdHMgPSBjbGlwYm9hcmQuYXZhaWxhYmxlRm9ybWF0cygpXG4gICAgIyBhcyBtb3JlIGNvbnRlbnQgaXMgc3VwcG9ydGVkIGluIGNsaXBib2FyZCBpdCBzaG91bGQgYmUgcGxhY2VkIGhlcmVcbiAgICBwYXN0ZWFibGVDb250ZW50ID0gWyd0ZXh0L3BsYWluJywgJ2ltYWdlL3BuZyddXG4gICAgaXNDb250ZW50UGFzdGVhYmxlID0gMFxuICAgIGZvciBjb250ZW50IGluIGZvcm1hdHNcbiAgICAgICAgaXNDb250ZW50UGFzdGVhYmxlICs9IHBhc3RlYWJsZUNvbnRlbnQuaW5jbHVkZXMoY29udGVudClcbiAgICBpc0NvbnRlbnRQYXN0ZWFibGUgPiAwXG5cbm5vdGlmaWNhdGlvbkNlbnRlclN1cHBvcnRzU291bmQgPSAoKSAtPlxuICAgICMgY2hlY2sgaWYgc291bmQgc2hvdWxkIGJlIHBsYXllZCB2aWEgbm90aWZpY2F0aW9uXG4gICAgIyAgZG9jdW1lbnRhdGlvbiBzYXlzIHRoYXQgb25seSBXaW5kb3dzVG9hc3RlciBhbmRcbiAgICAjICBOb3RpZmljYXRpb25DZW50ZXIgc3VwcG9ydHMgc291bmRcbiAgICBwbGF5U291bmRJbiA9IFsnV2luZG93c1RvYXN0ZXInLCAnTm90aWZpY2F0aW9uQ2VudGVyJ11cbiAgICAjIGNoZWNrIGlmIGN1cnJlY3Qgbm90aWZpZXIgc3VwcG9ydHMgc291bmRcbiAgICBub3RpZmllclN1cHBvcnRzU291bmQgPSBwbGF5U291bmRJbi5maW5kKCAoc3RyKSAtPlxuICAgICAgICBzdHIgPT0gbm90aWZpZXIuY29uc3RydWN0b3IubmFtZVxuICAgICk/XG5cbm5hbWVvZiA9IChlKSAtPiBlPy5kaXNwbGF5X25hbWUgPyBlPy5mYWxsYmFja19uYW1lID8gZT8uZmlyc3RfbmFtZSA/ICdVbmtub3duJ1xuXG5pbml0aWFsc29mID0gKGUpIC0+XG4gICAgaWYgZT8uZmlyc3RfbmFtZVxuICAgICAgICBuYW1lID0gbmFtZW9mIGVcbiAgICAgICAgZmlyc3RuYW1lID0gZT8uZmlyc3RfbmFtZVxuICAgICAgICByZXR1cm4gIGZpcnN0bmFtZS5jaGFyQXQoMCkgKyBuYW1lLnJlcGxhY2UoZmlyc3RuYW1lLCBcIlwiKS5jaGFyQXQoMSlcbiAgICBlbHNlIGlmIGU/LmRpc3BsYXlfbmFtZSB8fCBlPy5mYWxsYmFja19uYW1lXG4gICAgICAgIG5hbWVfdG9fc3BsaXQgPSBlPy5kaXNwbGF5X25hbWUgPyBlPy5mYWxsYmFja19uYW1lXG4gICAgICAgIG5hbWVfc3BsaXR0ZWQgPSBuYW1lX3RvX3NwbGl0LnNwbGl0KCcgJylcbiAgICAgICAgZmlyc3RuYW1lID0gbmFtZV9zcGxpdHRlZFswXS5jaGFyQXQoMClcbiAgICAgICAgaWYgbmFtZV9zcGxpdHRlZC5sZW5ndGggPT0gMVxuICAgICAgICAgICAgcmV0dXJuIGZpcnN0bmFtZS5jaGFyQXQoMClcbiAgICAgICAgIyBqdXN0IGluIGNhc2Ugc29tZXRoaW5nIHN0cmFuZ2VcbiAgICAgICAgZWxzZSBpZiBuYW1lX3NwbGl0dGVkPy5sZW5ndGggPT0gMFxuICAgICAgICAgICAgcmV0dXJuICc/J1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsYXN0bmFtZSA9IG5hbWVfc3BsaXR0ZWRbbmFtZV9zcGxpdHRlZC5sZW5ndGggLSAxXVxuICAgICAgICAgICAgcmV0dXJuIGZpcnN0bmFtZS5jaGFyQXQoMCkgKyBsYXN0bmFtZS5jaGFyQXQoMClcbiAgICBlbHNlXG4gICAgICAgIHJldHVybiAnPydcblxuZHJhd0F2YXRhciA9ICh1c2VyX2lkLCB2aWV3c3RhdGUsIGVudGl0eSwgaW1hZ2UgPSBudWxsLCBlbWFpbCA9IG51bGwsIGluaXRpYWxzID0gbnVsbCkgLT5cbiAgICAjXG4gICAgZW50aXR5Lm5lZWRFbnRpdHkodXNlcl9pZCkgdW5sZXNzIGVudGl0eVt1c2VyX2lkXT9cbiAgICAjXG4gICAgIyBvdmVyd3JpdGVzIGlmIGVudGl0eSBpcyBjYWNoZWRcbiAgICBpbml0aWFscyA9IGluaXRpYWxzb2YoZW50aXR5W3VzZXJfaWRdKS50b1VwcGVyQ2FzZSgpIGlmIGVudGl0eVt1c2VyX2lkXT9cbiAgICBlbWFpbCAgICA9IGVudGl0eVt1c2VyX2lkXT8uZW1haWxzP1swXSB1bmxlc3MgZW50aXR5W3VzZXJfaWRdPy5lbWFpbHM/WzBdP1xuICAgIGltYWdlICAgID0gZW50aXR5W3VzZXJfaWRdPy5waG90b191cmwgaWYgZW50aXR5W3VzZXJfaWRdPy5waG90b191cmw/XG4gICAgI1xuICAgICMgUmVwcm9kdWNpYmxlIGNvbG9yIGNvZGUgZm9yIGluaXRpYWxzXG4gICAgIyAgc2VlIGdsb2JhbC5sZXNzIGZvciB0aGUgY29sb3IgbWFwcGluZyBbLTEtMjVdXG4gICAgIyAgICAgLTE6ID8gaW5pdGlhbHNcbiAgICAjICAgMC0yNTogc2hvdWxkIGJlIGEgdW5pZm9ybSBkaXN0cmlidXRpb24gb2YgY29sb3JzIHBlciB1c2Vyc1xuICAgIGluaXRpYWxzQ29kZSA9IHZpZXdzdGF0ZS5jYWNoZWRJbml0aWFsc0NvZGU/W3VzZXJfaWRdID8gKGlmIGlzTmFOKHVzZXJfaWQpXG4gICAgICAgIGluaXRpYWxzQ29kZSA9IC0xXG4gICAgZWxzZVxuICAgICAgICBpbml0aWFsc0NvZGUgPSB1c2VyX2lkICUgMjZcbiAgICApXG4gICAgI1xuICAgIGRpdiBjbGFzczogJ2F2YXRhcicsICdkYXRhLWlkJzogdXNlcl9pZCwgLT5cbiAgICAgICAgaWYgaW1hZ2U/XG4gICAgICAgICAgICBpZiAhdmlld3N0YXRlPy5zaG93QW5pbWF0ZWRUaHVtYnNcbiAgICAgICAgICAgICAgICBpbWFnZSArPSBcIj9zej01MFwiXG4gICAgICAgICAgICAjXG4gICAgICAgICAgICBpbWcgc3JjOmZpeGxpbmsoaW1hZ2UpXG4gICAgICAgICAgICAsIFwiZGF0YS1pbml0aWFsc1wiOiBpbml0aWFsc1xuICAgICAgICAgICAgLCBjbGFzczogJ2ZhbGxiYWNrLW9uJ1xuICAgICAgICAgICAgLCAgb25lcnJvcjogKGV2KSAtPlxuICAgICAgICAgICAgICAgICMgaW4gY2FzZSB0aGUgaW1hZ2UgaXMgbm90IGF2YWlsYWJsZSwgaXRcbiAgICAgICAgICAgICAgICAjICBmYWxsYmFja3MgdG8gaW5pdGlhbHNcbiAgICAgICAgICAgICAgICBldi50YXJnZXQucGFyZW50RWxlbWVudC5jbGFzc0xpc3QuYWRkIFwiZmFsbGJhY2stb25cIlxuICAgICAgICAgICAgLCBvbmxvYWQ6IChldikgLT5cbiAgICAgICAgICAgICAgICAjIHdoZW4gbG9hZGluZyBzdWNjZXNzZnVseSwgdXBkYXRlIGFnYWluIGFsbCBvdGhlciBpbWdzXG4gICAgICAgICAgICAgICAgZXYudGFyZ2V0LnBhcmVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSBcImZhbGxiYWNrLW9uXCJcbiAgICAgICAgZGl2IGNsYXNzOiBcImluaXRpYWxzICN7aWYgaW1hZ2UgdGhlbiAnZmFsbGJhY2snIGVsc2UgJyd9XCJcbiAgICAgICAgLCAnZGF0YS1maXJzdC1sZXR0ZXInOiBpbml0aWFsc0NvZGVcbiAgICAgICAgLCBpbml0aWFsc1xuXG5uYW1lb2Zjb252ID0gKGMpIC0+XG4gICAge2VudGl0eX0gPSByZXF1aXJlICcuL21vZGVscydcbiAgICBwYXJ0ID0gYz8uY3VycmVudF9wYXJ0aWNpcGFudCA/IFtdXG4gICAgZW50cyA9IGZvciBwIGluIHBhcnQgd2hlbiBub3QgZW50aXR5LmlzU2VsZiBwLmNoYXRfaWRcbiAgICAgICAgZW50aXR5W3AuY2hhdF9pZF1cbiAgICBuYW1lID0gXCJcIlxuICAgIG9uZV90b19vbmUgPSBjPy50eXBlPy5pbmRleE9mKCdPTkVfVE9fT05FJykgPj0gMFxuICAgIGlmIGM/Lm5hbWU/IGFuZCBub3Qgb25lX3RvX29uZVxuICAgICAgICBuYW1lID0gYy5uYW1lXG4gICAgZWxzZVxuICAgICAgICAjIGFsbCBlbnRpdGllcyBpbiBjb252ZXJzYXRpb24gdGhhdCBpcyBub3Qgc2VsZlxuICAgICAgICAjIHRoZSBuYW1lcyBvZiB0aG9zZSBlbnRpdGllc1xuICAgICAgICBuYW1lcyA9IGVudHMubWFwIG5hbWVvZlxuICAgICAgICAjIGpvaW5lZCB0b2dldGhlciBpbiBhIGNvbXBlbGxpbmcgbWFubmVyXG4gICAgICAgIG5hbWUgPSBuYW1lcy5qb2luICcsICdcbiAgICByZXR1cm4gbmFtZVxuXG5cbmxpbmt0byA9IChjKSAtPiBcImh0dHBzOi8vcGx1cy5nb29nbGUuY29tL3UvMC8je2N9L2Fib3V0XCJcblxubGF0ZXIgPSAoZikgLT4gc2V0VGltZW91dCBmLCAxXG5cbnRocm90dGxlID0gKG1zLCBmKSAtPlxuICAgIGxhc3QgPSAwXG4gICAgdGltID0gbnVsbFxuICAgIGcgPSAoYXMuLi4pIC0+XG4gICAgICAgIGNsZWFyVGltZW91dCB0aW0gaWYgdGltXG4gICAgICAgIGlmIChkID0gKERhdGUubm93KCkgLSBsYXN0KSkgPiBtc1xuICAgICAgICAgICAgcmV0ID0gZiBhcy4uLlxuICAgICAgICAgICAgbGFzdCA9IERhdGUubm93KClcbiAgICAgICAgICAgIHJldFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIGVuc3VyZSB0aGF0IGxhc3QgZXZlbnQgaXMgYWx3YXlzIGZpcmVkXG4gICAgICAgICAgICB0aW0gPSBzZXRUaW1lb3V0ICgtPmcgYXMuLi4pLCBkXG4gICAgICAgICAgICB1bmRlZmluZWRcblxuaXNBYm91dExpbmsgPSAocykgLT4gKC9odHRwczpcXC9cXC9wbHVzLmdvb2dsZS5jb21cXC91XFwvMFxcLyhbMC05XSspXFwvYWJvdXQvLmV4ZWMocykgPyBbXSlbMV1cblxuZ2V0UHJveGllZE5hbWUgPSAoZSkgLT5cbiAgICBzID0gZT8uY2hhdF9tZXNzYWdlPy5tZXNzYWdlX2NvbnRlbnQ/LnNlZ21lbnQ/WzBdXG4gICAgcmV0dXJuIHVubGVzcyBzXG4gICAgcmV0dXJuIHM/LmZvcm1hdHRpbmc/LmJvbGQgYW5kIGlzQWJvdXRMaW5rKHM/LmxpbmtfZGF0YT8ubGlua190YXJnZXQpXG5cbnRyeXBhcnNlID0gKHMpIC0+IHRyeSBKU09OLnBhcnNlKHMpIGNhdGNoIGVyciB0aGVuIHVuZGVmaW5lZFxuXG5maXhsaW5rID0gKGwpIC0+IGlmIGw/WzBdID09ICcvJyB0aGVuIFwiaHR0cHM6I3tsfVwiIGVsc2UgbFxuXG50b3BvZiA9IChlbCkgLT4gZWw/Lm9mZnNldFRvcCArIGlmIGVsPy5vZmZzZXRQYXJlbnQgdGhlbiB0b3BvZihlbC5vZmZzZXRQYXJlbnQpIGVsc2UgMFxuXG51bmlxZm4gPSAoYXMsIGZuKSAtPlxuICAgIGZuZWQgPSBhcy5tYXAgZm5cbiAgICBhcy5maWx0ZXIgKHYsIGkpIC0+IGZuZWQuaW5kZXhPZihmbmVkW2ldKSA9PSBpXG5cbmlzSW1nID0gKHVybCkgLT4gdXJsPy5tYXRjaCAvXFwuKHBuZ3xqcGU/Z3xnaWZ8c3ZnKSQvaVxuXG5nZXRJbWFnZVVybCA9ICh1cmw9XCJcIikgLT5cbiAgICByZXR1cm4gZmFsc2UgaWYgIXVybD8gfCB1cmwgPT0gXCJcIlxuICAgIHJldHVybiB1cmwgaWYgaXNJbWcgdXJsXG4gICAgcGFyc2VkID0gVVJMLnBhcnNlIHVybCwgdHJ1ZVxuICAgIHVybCA9IHBhcnNlZC5xdWVyeS5xXG4gICAgcmV0dXJuIHVybCBpZiBpc0ltZyB1cmxcbiAgICBmYWxzZVxuXG50b2dnbGVWaXNpYmlsaXR5ID0gKGVsZW1lbnQpIC0+XG4gICAgaWYgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID09ICdibG9jaydcbiAgICAgICAgZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnXG4gICAgZWxzZVxuICAgICAgICBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXG5cbmVzY2FwZVJlZ0V4cCA9ICh0ZXh0KSAtPlxuICB0ZXh0LnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCAnXFxcXCQmJylcblxuY29udmVydEVtb2ppID0gKHRleHQpIC0+XG4gICAgdW5pY29kZU1hcCA9IHJlcXVpcmUgJy4vZW1vamlzaG9ydGNvZGUnXG4gICAgaW5mZXJlZFBhdHRlcm4gPSBcIihefFsgXSlcIiArXG4gICAgXCIoOlxcXFwoOlxcXFwpfDpcXFxcKFxcXFx8XFxcXCl8OlhcXFxcKXw6M3xcXFxcKD1cXFxcXlxcXFwuXFxcXC5cXFxcXj1cXFxcKXxcXFxcKD1cXFxcXlxcXFwuXFxcXF49XFxcXCl8PVxcXFxeX1xcXFxePXxcIiArXG4gICAgKGVzY2FwZVJlZ0V4cChlbCkgZm9yIGVsIGluIE9iamVjdC5rZXlzKHVuaWNvZGVNYXApKS5qb2luKCd8JykgK1xuICAgIFwiKShbIF18JClcIlxuXG4gICAgcGF0dGVybnMgPSBbaW5mZXJlZFBhdHRlcm5dXG5cbiAgICBlbW9qaUNvZGVSZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybnMuam9pbignfCcpLCdnJylcblxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoZW1vamlDb2RlUmVnZXgsIChlbW9qaSkgLT5cbiAgICAgICAgc3VmZml4ID0gZW1vamkuc2xpY2UoZW1vamkudHJpbVJpZ2h0KCkubGVuZ3RoKVxuICAgICAgICBwcmVmaXggPSBlbW9qaS5zbGljZSgwLCBlbW9qaS5sZW5ndGggLSBlbW9qaS50cmltTGVmdCgpLmxlbmd0aClcbiAgICAgICAgdW5pY29kZSA9IHVuaWNvZGVNYXBbZW1vamkudHJpbSgpXVxuICAgICAgICBpZiB1bmljb2RlP1xuICAgICAgICAgICAgcHJlZml4ICsgdW5pY29kZSArIHN1ZmZpeFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbW9qaVxuICAgIClcbiAgICByZXR1cm4gdGV4dFxuXG5pbnNlcnRUZXh0QXRDdXJzb3IgPSAoZWwsIHRleHQpIC0+XG4gICAgdmFsdWUgPSBlbC52YWx1ZVxuICAgIGRvYyA9IGVsLm93bmVyRG9jdW1lbnRcbiAgICBpZiB0eXBlb2YgZWwuc2VsZWN0aW9uU3RhcnQgPT0gXCJudW1iZXJcIiBhbmQgdHlwZW9mIGVsLnNlbGVjdGlvbkVuZCA9PSBcIm51bWJlclwiXG4gICAgICAgIGVuZEluZGV4ID0gZWwuc2VsZWN0aW9uRW5kXG4gICAgICAgIGVsLnZhbHVlID0gdmFsdWUuc2xpY2UoMCwgZW5kSW5kZXgpICsgdGV4dCArIHZhbHVlLnNsaWNlKGVuZEluZGV4KVxuICAgICAgICBlbC5zZWxlY3Rpb25TdGFydCA9IGVsLnNlbGVjdGlvbkVuZCA9IGVuZEluZGV4ICsgdGV4dC5sZW5ndGhcbiAgICAgICAgZWwuZm9jdXMoKVxuICAgIGVsc2UgaWYgZG9jLnNlbGVjdGlvbiAhPSBcInVuZGVmaW5lZFwiIGFuZCBkb2Muc2VsZWN0aW9uLmNyZWF0ZVJhbmdlXG4gICAgICAgIGVsLmZvY3VzKClcbiAgICAgICAgcmFuZ2UgPSBkb2Muc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKClcbiAgICAgICAgcmFuZ2UuY29sbGFwc2UoZmFsc2UpXG4gICAgICAgIHJhbmdlLnRleHQgPSB0ZXh0XG4gICAgICAgIHJhbmdlLnNlbGVjdCgpXG5cbiMgQXV0b0xhdW5jaCByZXF1aXJlcyBhIHBhdGggdW5sZXNzIHlvdSBhcmUgcnVubmluZyBpbiBlbGVjdHJvbi9ud1xudmVyc2lvbnMgPSBwcm9jZXNzPy52ZXJzaW9uc1xuaWYgdmVyc2lvbnM/IGFuZCAodmVyc2lvbnMubnc/IG9yIHZlcnNpb25zWydub2RlLXdlYmtpdCddPyBvciB2ZXJzaW9ucy5lbGVjdHJvbj8pXG4gICAgYXV0b0xhdW5jaFBhdGggPSB1bmRlZmluZWRcbmVsc2VcbiAgICBhdXRvTGF1bmNoUGF0aCA9IHByb2Nlc3MuZXhlY1BhdGhcbmF1dG9MYXVuY2hlciA9IG5ldyBBdXRvTGF1bmNoKHtcbiAgICBuYW1lOiAnWWFrWWFrJyxcbiAgICBwYXRoOiBhdXRvTGF1bmNoUGF0aCxcbiAgICBtYWM6IHtcbiAgICAgICAgdXNlTGF1bmNoQWdlbnQ6IHRydWVcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7bmFtZW9mLCBpbml0aWFsc29mLCBuYW1lb2Zjb252LCBsaW5rdG8sIGxhdGVyLFxuICAgICAgICAgICAgICAgICAgdGhyb3R0bGUsIHVuaXFmbiwgaXNBYm91dExpbmssIGdldFByb3hpZWROYW1lLCB0cnlwYXJzZSxcbiAgICAgICAgICAgICAgICAgIGZpeGxpbmssIHRvcG9mLCBpc0ltZywgZ2V0SW1hZ2VVcmwsIHRvZ2dsZVZpc2liaWxpdHksXG4gICAgICAgICAgICAgICAgICBjb252ZXJ0RW1vamksIGRyYXdBdmF0YXIsIG5vdGlmaWNhdGlvbkNlbnRlclN1cHBvcnRzU291bmQsXG4gICAgICAgICAgICAgICAgICBpbnNlcnRUZXh0QXRDdXJzb3IsIGlzQ29udGVudFBhc3RlYWJsZSwgYXV0b0xhdW5jaGVyfVxuIl19
