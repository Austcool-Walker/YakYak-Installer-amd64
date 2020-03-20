(function() {
  var CUTOFF, HANGOUT_ANNOTATION_TYPE, MESSAGE_CLASSES, OBSERVE_OPTS, atTopIfSmall, drawAvatar, drawMeMessage, drawMessage, drawMessageAvatar, drawSeenAvatar, extractObjectStyle, extractProtobufStyle, firstRender, fixProxied, fixlink, forceredraw, format, formatAttachment, formatters, getImageUrl, getProxiedName, groupEvents, groupEventsByMessageType, ifpass, initialsof, isImg, isMeMessage, lastConv, later, linkto, moment, nameof, nameofconv, onMutate, onclick, preload, preloadInstagramPhoto, preloadTweet, preload_cache, scrollToBottom, shell, stripProxiedColon, throttle, url, urlRegexp;

  moment = require('moment');

  shell = require('electron').shell;

  urlRegexp = require('uber-url-regex');

  url = require('url');

  ({nameof, initialsof, nameofconv, linkto, later, forceredraw, throttle, getProxiedName, fixlink, isImg, getImageUrl, drawAvatar} = require('../util'));

  CUTOFF = 5 * 60 * 1000 * 1000; // 5 mins

  
  // chat_message:
  //   {
  //     annotation: [
  //       [4, ""]
  //     ]
  //     message_content: {
  //       attachement: []
  //       segment: [{ ... }]
  //     }
  //   }
  HANGOUT_ANNOTATION_TYPE = {
    me_message: 4
  };

  // this helps fixing houts proxied with things like hangupsbot
  // the format of proxied messages are
  // and here we put entities in the entity db for
  // users found only in proxied messages.
  fixProxied = function(e, proxied, entity) {
    var name, ref, ref1, ref2, ref3;
    if ((e != null ? (ref = e.chat_message) != null ? ref.message_content : void 0 : void 0) == null) {
      return;
    }
    e.chat_message.message_content.proxied = true;
    name = e != null ? (ref1 = e.chat_message) != null ? (ref2 = ref1.message_content) != null ? (ref3 = ref2.segment[0]) != null ? ref3.text : void 0 : void 0 : void 0 : void 0;
    // update fallback_name for entity database
    if (name !== '>>') {
      // synthetic add of fallback_name
      return entity.add({
        id: {
          gaia_id: proxied,
          chat_id: proxied
        },
        fallback_name: name
      }, {
        silent: true
      });
    }
  };

  onclick = function(e) {
    var address, finalUrl, patt, xhr;
    e.preventDefault();
    address = e.currentTarget.getAttribute('href');
    patt = new RegExp("^(https?[:][/][/]www[.]google[.](com|[a-z][a-z])[/]url[?]q[=])([^&]+)(&.+)*");
    if (patt.test(address)) {
      address = address.replace(patt, '$3');
      address = unescape(address);
      // this is a link outside google and can be opened directly
      //  as there is no need for authentication
      shell.openExternal(fixlink(address));
      return;
    }
    if (urlRegexp({
      exact: true
    }).test(address)) {
      if (url.parse(address).host == null) {
        address = `http://${address}`;
      }
    }
    finalUrl = fixlink(address);
    // Google apis give us an url that is only valid for the current logged user.
    // We can't open this url in the external browser because it may not be authenticated
    // or may be authenticated differently (another user or multiple users).
    // In this case we try to open the url ourselves until we get redirected to the final url
    // of the image/video.
    // The finalURL will be cdn-hosted, static and does not require authentication
    // so we can finally open it in the external browser :(
    xhr = new XMLHttpRequest();
    // Showing message with 3 second delay showing the user that something is happening
    notr({
      html: i18n.__('conversation.open_link:Opening the link in the browser...'),
      stay: 3000
    });
    xhr.onreadystatechange = function(e) {
      var redirected;
      if (e.target.status === 0) {
        return;
      }
      if (xhr.readyState !== 4) {
        return;
      }
      redirected = finalUrl.indexOf(xhr.responseURL) !== 0;
      if (redirected) {
        finalUrl = xhr.responseURL;
      }
      shell.openExternal(finalUrl);
      return xhr.abort();
    };
    xhr.open("get", finalUrl);
    return xhr.send();
  };

  // helper method to group events in time/user bunches
  groupEvents = function(es, entity) {
    var cid, e, group, groups, j, len, proxied, ref, ref1, user;
    groups = [];
    group = null;
    user = null;
    for (j = 0, len = es.length; j < len; j++) {
      e = es[j];
      if (e.timestamp - ((ref = group != null ? group.end : void 0) != null ? ref : 0) > CUTOFF) {
        group = {
          byuser: [],
          start: e.timestamp,
          end: e.timestamp
        };
        user = null;
        groups.push(group);
      }
      proxied = getProxiedName(e);
      if (proxied) {
        fixProxied(e, proxied, entity);
      }
      cid = proxied ? proxied : e != null ? (ref1 = e.sender_id) != null ? ref1.chat_id : void 0 : void 0;
      if (cid !== (user != null ? user.cid : void 0)) {
        group.byuser.push(user = {
          cid: cid,
          event: []
        });
      }
      user.event.push(e);
      group.end = e.timestamp;
    }
    return groups;
  };

  // possible classes of messages
  MESSAGE_CLASSES = ['placeholder', 'chat_message', 'conversation_rename', 'membership_change'];

  OBSERVE_OPTS = {
    childList: true,
    attributes: true,
    attributeOldValue: true,
    subtree: true
  };

  firstRender = true;

  lastConv = null; // to detect conv switching

  module.exports = view(function(models) {
    var all_seen, c, conv, conv_id, entity, j, l, len, len1, participant, ref, ref1, viewstate;
    ({viewstate, conv, entity} = models);
    if (firstRender) {
      // mutation events kicks in after first render
      later(onMutate(viewstate));
    }
    firstRender = false;
    conv_id = viewstate != null ? viewstate.selectedConv : void 0;
    c = conv[conv_id];
    if ((c != null ? c.current_participant : void 0) != null) {
      ref = c.current_participant;
      for (j = 0, len = ref.length; j < len; j++) {
        participant = ref[j];
        entity.needEntity(participant.chat_id);
      }
    }
    div({
      class: 'messages',
      observe: onMutate(viewstate)
    }, function() {
      var clz, events, g, grouped, l, last_seen, last_seen_chat_ids_with_event, len1, results, sender, u;
      if (!(c != null ? c.event : void 0)) {
        return;
      }
      grouped = groupEvents(c.event, entity);
      div({
        class: 'historyinfo'
      }, function() {
        if (c.requestinghistory) {
          return pass('Requesting history…', function() {
            return span({
              class: 'material-icons spin'
            }, 'donut_large');
          });
        }
      });
      if (!viewstate.useSystemDateFormat) {
        moment.locale(i18n.getLocale());
      } else {
        moment.locale(window.navigator.language);
      }
      last_seen = conv.findLastReadEventsByUser(c);
      last_seen_chat_ids_with_event = function(last_seen, event) {
        var chat_id, e, results;
        results = [];
        for (chat_id in last_seen) {
          e = last_seen[chat_id];
          if (event === e) {
            results.push(chat_id);
          }
        }
        return results;
      };
      results = [];
      for (l = 0, len1 = grouped.length; l < len1; l++) {
        g = grouped[l];
        div({
          class: 'timestamp'
        }, moment(g.start / 1000).calendar());
        results.push((function() {
          var len2, m, ref1, results1;
          ref1 = g.byuser;
          results1 = [];
          for (m = 0, len2 = ref1.length; m < len2; m++) {
            u = ref1[m];
            sender = nameof(entity[u.cid]);
            results1.push((function() {
              var len3, n, ref2, results2;
              ref2 = groupEventsByMessageType(u.event);
              results2 = [];
              for (n = 0, len3 = ref2.length; n < len3; n++) {
                events = ref2[n];
                if (isMeMessage(events[0])) {
                  // all items are /me messages if the first one is due to grouping above
                  results2.push(div({
                    class: 'ugroup me'
                  }, function() {
                    var e, len4, o, results3;
                    drawMessageAvatar(u, sender, viewstate, entity);
                    results3 = [];
                    for (o = 0, len4 = events.length; o < len4; o++) {
                      e = events[o];
                      results3.push(drawMeMessage(e));
                    }
                    return results3;
                  }));
                } else {
                  clz = ['ugroup'];
                  if (entity.isSelf(u.cid)) {
                    clz.push('self');
                  }
                  results2.push(div({
                    class: clz.join(' ')
                  }, function() {
                    drawMessageAvatar(u, sender, viewstate, entity);
                    div({
                      class: 'umessages'
                    }, function() {
                      var e, len4, o, results3;
                      results3 = [];
                      for (o = 0, len4 = events.length; o < len4; o++) {
                        e = events[o];
                        results3.push(drawMessage(e, entity));
                      }
                      return results3;
                    });
                    // at the end of the events group we draw who has read any of its events
                    return div({
                      class: 'seen-list'
                    }, function() {
                      var chat_id, e, len4, o, results3, skip;
                      results3 = [];
                      for (o = 0, len4 = events.length; o < len4; o++) {
                        e = events[o];
                        results3.push((function() {
                          var len5, q, ref3, results4;
                          ref3 = last_seen_chat_ids_with_event(last_seen, e);
                          results4 = [];
                          for (q = 0, len5 = ref3.length; q < len5; q++) {
                            chat_id = ref3[q];
                            skip = entity.isSelf(chat_id) || (chat_id === u.cid);
                            if (!skip) {
                              results4.push(drawSeenAvatar(entity[chat_id], e.event_id, viewstate, entity));
                            } else {
                              results4.push(void 0);
                            }
                          }
                          return results4;
                        })());
                      }
                      return results3;
                    });
                  }));
                }
              }
              return results2;
            })());
          }
          return results1;
        })());
      }
      return results;
    });
    // Go through all the participants and only show his last seen status
    if ((c != null ? c.current_participant : void 0) != null) {
      ref1 = c.current_participant;
      for (l = 0, len1 = ref1.length; l < len1; l++) {
        participant = ref1[l];
        // get all avatars
        all_seen = document.querySelectorAll(`.seen[data-id='${participant.chat_id}']`);
      }
    }
    // select last one
    //  NOT WORKING
    //if all_seen.length > 0
    //    all_seen.forEach (el) ->
    //        el.classList.remove 'show'
    //    all_seen[all_seen.length - 1].classList.add 'show'
    if (lastConv !== conv_id) {
      lastConv = conv_id;
      return later(atTopIfSmall);
    }
  });

  drawMessageAvatar = function(u, sender, viewstate, entity) {
    return div({
      class: 'sender-wrapper'
    }, function() {
      a({
        href: linkto(u.cid),
        title: sender
      }, {onclick}, {
        class: 'sender'
      }, function() {
        return drawAvatar(u.cid, viewstate, entity);
      });
      return span(sender);
    });
  };

  groupEventsByMessageType = function(event) {
    var e, index, j, len, prevWasMe, res;
    res = [];
    index = 0;
    prevWasMe = true;
    for (j = 0, len = event.length; j < len; j++) {
      e = event[j];
      if (isMeMessage(e)) {
        index = res.push([e]);
        prevWasMe = true;
      } else {
        if (prevWasMe) {
          index = res.push([e]);
        } else {
          res[index - 1].push(e);
        }
        prevWasMe = false;
      }
    }
    return res;
  };

  isMeMessage = function(e) {
    var ref, ref1, ref2;
    return (e != null ? (ref = e.chat_message) != null ? (ref1 = ref.annotation) != null ? (ref2 = ref1[0]) != null ? ref2[0] : void 0 : void 0 : void 0 : void 0) === HANGOUT_ANNOTATION_TYPE.me_message;
  };

  drawSeenAvatar = function(u, event_id, viewstate, entity) {
    var initials;
    initials = initialsof(u);
    return div({
      class: "seen",
      "data-id": u.id,
      "data-event-id": event_id,
      title: u.display_name
    }, function() {
      return drawAvatar(u.id, viewstate, entity);
    });
  };

  drawMeMessage = function(e) {
    return div({
      class: 'message'
    }, function() {
      var ref;
      return (ref = e.chat_message) != null ? ref.message_content.segment[0].text : void 0;
    });
  };

  drawMessage = function(e, entity) {
    var c, j, len, mclz, title;
    // console.log 'message', e.chat_message
    mclz = ['message'];
    for (j = 0, len = MESSAGE_CLASSES.length; j < len; j++) {
      c = MESSAGE_CLASSES[j];
      if (e[c] != null) {
        mclz.push(c);
      }
    }
    title = e.timestamp ? moment(e.timestamp / 1000).calendar() : null;
    return div({
      id: e.event_id,
      key: e.event_id,
      class: mclz.join(' '),
      title: title
    }, function() {
      var content, ents, hangout_event, names, ref, style, t;
      if (e.chat_message) {
        content = (ref = e.chat_message) != null ? ref.message_content : void 0;
        format(content);
        // loadInlineImages content
        if (e.placeholder && e.uploadimage) {
          return span({
            class: 'material-icons spin'
          }, 'donut_large');
        }
      } else if (e.conversation_rename) {
        return pass(`renamed conversation to ${e.conversation_rename.new_name}`);
      // {new_name: "labbot" old_name: ""}
      } else if (e.membership_change) {
        t = e.membership_change.type;
        ents = e.membership_change.participant_ids.map(function(p) {
          return entity[p.chat_id];
        });
        names = ents.map(nameof).join(', ');
        if (t === 'JOIN') {
          return pass(`invited ${names}`);
        } else if (t === 'LEAVE') {
          return pass(`${names} left the conversation`);
        }
      } else if (e.hangout_event) {
        hangout_event = e.hangout_event;
        style = {
          'vertical-align': 'middle'
        };
        if (hangout_event.event_type === 'START_HANGOUT') {
          span({
            class: 'material-icons',
            style
          }, 'call_made_small');
          return pass(' Call started');
        } else if (hangout_event.event_type === 'END_HANGOUT') {
          span({
            class: 'material-icons small',
            style
          }, 'call_end');
          return pass(' Call ended');
        }
      } else {
        return console.log('unhandled event type', e, entity);
      }
    });
  };

  atTopIfSmall = function() {
    var msgel, screl;
    screl = document.querySelector('.main');
    msgel = document.querySelector('.messages');
    return action('attop', (msgel != null ? msgel.offsetHeight : void 0) < (screl != null ? screl.offsetHeight : void 0));
  };

  // when there's mutation, we scroll to bottom in case we already are at bottom
  onMutate = function(viewstate) {
    return throttle(10, function() {
      if (viewstate.atbottom) {
        // jump to bottom to follow conv
        return scrollToBottom();
      }
    });
  };

  scrollToBottom = module.exports.scrollToBottom = function() {
    var el;
    // ensure we're scrolled to bottom
    el = document.querySelector('.main');
    // to bottom
    return el.scrollTop = Number.MAX_SAFE_INTEGER;
  };

  ifpass = function(t, f) {
    if (t) {
      return f;
    } else {
      return pass;
    }
  };

  format = function(cont) {
    var e, i, j, len, ref, ref1, seg;
    if ((cont != null ? cont.attachment : void 0) != null) {
      try {
        formatAttachment(cont.attachment);
      } catch (error) {
        e = error;
        console.error(e);
      }
    }
    ref1 = (ref = cont != null ? cont.segment : void 0) != null ? ref : [];
    for (i = j = 0, len = ref1.length; j < len; i = ++j) {
      seg = ref1[i];
      if (cont.proxied && i < 1) {
        continue;
      }
      formatters.forEach(function(fn) {
        return fn(seg, cont);
      });
    }
    return null;
  };

  formatters = [
    // text formatter
    function(seg,
    cont) {
      var f,
    href,
    ref,
    ref1;
      f = (ref = seg.formatting) != null ? ref : {};
      href = seg != null ? (ref1 = seg.link_data) != null ? ref1.link_target : void 0 : void 0;
      return ifpass(href,
    (function(f) {
        return a({href,
    onclick},
    f);
      }))(function() {
        return ifpass(f.bold,
    b)(function() {
          return ifpass(f.italic,
    i)(function() {
            return ifpass(f.underline,
    u)(function() {
              return ifpass(f.strikethrough,
    s)(function() {
                return pass(cont.proxied ? stripProxiedColon(seg.text) : seg.type === 'LINE_BREAK' ? '\n' : seg.text);
              });
            });
          });
        });
      });
    },
    // image formatter
    function(seg) {
      var href,
    imageUrl,
    ref;
      href = seg != null ? (ref = seg.link_data) != null ? ref.link_target : void 0 : void 0;
      imageUrl = getImageUrl(href); // false if can't find one
      if (imageUrl && preload(imageUrl)) {
        return div(function() {
          if (models.viewstate.showImagePreview) {
            return img({
              src: imageUrl
            });
          } else {
            return a({imageUrl,
    onclick});
          }
        });
      }
    },
    // twitter preview
    function(seg) {
      var data,
    href,
    matches;
      href = seg != null ? seg.text : void 0;
      if (!href) {
        return;
      }
      matches = href.match(/^(https?:\/\/)(.+\.)?(twitter.com\/.+\/status\/.+)/);
      if (!matches) {
        return;
      }
      data = preloadTweet(matches[1] + matches[3]);
      if (!data) {
        return;
      }
      return div({
        class: 'tweet'
      },
    function() {
        if (data.text) {
          p(function() {
            return data.text;
          });
        }
        if (data.imageUrl && (preload(data.imageUrl)) && models.viewstate.showImagePreview) {
          return img({
            src: data.imageUrl
          });
        }
      });
    },
    // instagram preview
    function(seg) {
      var data,
    href,
    matches;
      href = seg != null ? seg.text : void 0;
      if (!href) {
        return;
      }
      matches = href.match(/^(https?:\/\/)(.+\.)?(instagram.com\/p\/.+)/);
      if (!matches) {
        return;
      }
      data = preloadInstagramPhoto('https://api.instagram.com/oembed/?url=' + href);
      if (!data) {
        return;
      }
      return div({
        class: 'instagram'
      },
    function() {
        if (data.text) {
          p(function() {
            return data.text;
          });
        }
        if (data.imageUrl && (preload(data.imageUrl)) && models.viewstate.showImagePreview) {
          return img({
            src: data.imageUrl
          });
        }
      });
    }
  ];

  stripProxiedColon = function(txt) {
    if ((txt != null ? txt.indexOf(": ") : void 0) === 0) {
      return txt.substring(2);
    } else {
      return txt;
    }
  };

  preload_cache = {};

  preload = function(href) {
    var cache, el;
    cache = preload_cache[href];
    if (!cache) {
      el = document.createElement('img');
      el.onload = function() {
        if (typeof el.naturalWidth !== 'number') {
          return;
        }
        el.loaded = true;
        return later(function() {
          return action('loadedimg');
        });
      };
      el.onerror = function() {
        return console.log('error loading image', href);
      };
      el.src = href;
      preload_cache[href] = el;
    }
    return cache != null ? cache.loaded : void 0;
  };

  preloadTweet = function(href) {
    var cache;
    cache = preload_cache[href];
    if (!cache) {
      preload_cache[href] = {};
      fetch(href).then(function(response) {
        return response.text();
      }).then(function(html) {
        var container, frag, image, textNode;
        frag = document.createElement('div');
        frag.innerHTML = html;
        container = frag.querySelector('[data-associated-tweet-id]');
        textNode = container.querySelector('.tweet-text');
        image = container.querySelector('[data-image-url]');
        preload_cache[href].text = textNode.textContent;
        preload_cache[href].imageUrl = image != null ? image.dataset.imageUrl : void 0;
        return later(function() {
          return action('loadedtweet');
        });
      });
    }
    return cache;
  };

  preloadInstagramPhoto = function(href) {
    var cache;
    cache = preload_cache[href];
    if (!cache) {
      preload_cache[href] = {};
      fetch(href).then(function(response) {
        return response.json();
      }).then(function(json) {
        preload_cache[href].text = json.title;
        preload_cache[href].imageUrl = json.thumbnail_url;
        return later(function() {
          return action('loadedinstagramphoto');
        });
      });
    }
    return cache;
  };

  formatAttachment = function(att) {
    var data, href, original_content_url, ref, ref1, ref2, ref3, thumb;
    // console.log 'attachment', att if att.length > 0
    if (att != null ? (ref = att[0]) != null ? (ref1 = ref.embed_item) != null ? ref1.type_ : void 0 : void 0 : void 0) {
      data = extractProtobufStyle(att);
      if (!data) {
        return;
      }
      ({href, thumb, original_content_url} = data);
    } else if (att != null ? (ref2 = att[0]) != null ? (ref3 = ref2.embed_item) != null ? ref3.type : void 0 : void 0 : void 0) {
      console.log('THIS SHOULD NOT HAPPEN WTF !!');
      data = extractProtobufStyle(att);
      if (!data) {
        return;
      }
      ({href, thumb, original_content_url} = data);
    } else {
      if ((att != null ? att.length : void 0) !== 0) {
        console.warn('ignoring attachment', att);
      }
      return;
    }
    if (!href) {
      // stickers do not have an href so we link to the original content instead
      href = original_content_url;
    }
    // here we assume attachments are only images
    if (preload(thumb)) {
      return div({
        class: 'attach'
      }, function() {
        return a({href, onclick}, function() {
          if (models.viewstate.showImagePreview) {
            return img({
              src: thumb
            });
          } else {
            return i18n.__('conversation.no_preview_image_click_to_open:Image preview is disabled: click to open it in the browser');
          }
        });
      });
    }
  };

  handle('loadedimg', function() {
    // allow controller to record current position
    updated('beforeImg');
    // will do the redraw inserting the image
    updated('conv');
    // fix the position after redraw
    return updated('afterImg');
  });

  handle('loadedtweet', function() {
    return updated('conv');
  });

  handle('loadedinstagramphoto', function() {
    return updated('conv');
  });

  extractProtobufStyle = function(att) {
    var data, embed_item, href, isVideo, k, original_content_url, plus_photo, ref, ref1, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, t, thumb, type_;
    href = null;
    thumb = null;
    embed_item = att != null ? (ref = att[0]) != null ? ref.embed_item : void 0 : void 0;
    ({plus_photo, data, type_} = embed_item != null ? embed_item : {});
    if (plus_photo != null) {
      href = (ref1 = plus_photo.data) != null ? ref1.url : void 0;
      thumb = (ref2 = plus_photo.data) != null ? (ref3 = ref2.thumbnail) != null ? ref3.image_url : void 0 : void 0;
      href = (ref4 = plus_photo.data) != null ? (ref5 = ref4.thumbnail) != null ? ref5.url : void 0 : void 0;
      original_content_url = (ref6 = plus_photo.data) != null ? ref6.original_content_url : void 0;
      isVideo = ((ref7 = plus_photo.data) != null ? ref7.media_type : void 0) !== 'MEDIA_TYPE_PHOTO';
      return {href, thumb, original_content_url};
    }
    t = type_ != null ? type_[0] : void 0;
    if (t !== 249) {
      return console.warn('ignoring (old) attachment type', att);
    }
    k = (ref8 = Object.keys(data)) != null ? ref8[0] : void 0;
    if (!k) {
      return;
    }
    href = data != null ? (ref9 = data[k]) != null ? ref9[5] : void 0 : void 0;
    thumb = data != null ? (ref10 = data[k]) != null ? ref10[9] : void 0 : void 0;
    if (!thumb) {
      href = data != null ? (ref11 = data[k]) != null ? ref11[4] : void 0 : void 0;
      thumb = data != null ? (ref12 = data[k]) != null ? ref12[5] : void 0 : void 0;
    }
    return {href, thumb, original_content_url};
  };

  extractObjectStyle = function(att) {
    var eitem, href, it, ref, ref1, thumb, type;
    eitem = att != null ? (ref = att[0]) != null ? ref.embed_item : void 0 : void 0;
    ({type} = eitem != null ? eitem : {});
    if ((type != null ? type[0] : void 0) === "PLUS_PHOTO") {
      it = eitem["embeds.PlusPhoto.plus_photo"];
      href = it != null ? it.url : void 0;
      thumb = it != null ? (ref1 = it.thumbnail) != null ? ref1.url : void 0 : void 0;
      return {href, thumb};
    } else {
      return console.warn('ignoring (new) type', type);
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvbWVzc2FnZXMuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL21lc3NhZ2VzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsTUFBQSxFQUFBLHVCQUFBLEVBQUEsZUFBQSxFQUFBLFlBQUEsRUFBQSxZQUFBLEVBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsaUJBQUEsRUFBQSxjQUFBLEVBQUEsa0JBQUEsRUFBQSxvQkFBQSxFQUFBLFdBQUEsRUFBQSxVQUFBLEVBQUEsT0FBQSxFQUFBLFdBQUEsRUFBQSxNQUFBLEVBQUEsZ0JBQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsd0JBQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLEtBQUEsRUFBQSxXQUFBLEVBQUEsUUFBQSxFQUFBLEtBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsUUFBQSxFQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUEscUJBQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLGNBQUEsRUFBQSxLQUFBLEVBQUEsaUJBQUEsRUFBQSxRQUFBLEVBQUEsR0FBQSxFQUFBOztFQUFBLE1BQUEsR0FBWSxPQUFBLENBQVEsUUFBUjs7RUFDWixLQUFBLEdBQVksT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7RUFDaEMsU0FBQSxHQUFZLE9BQUEsQ0FBUSxnQkFBUjs7RUFDWixHQUFBLEdBQVksT0FBQSxDQUFRLEtBQVI7O0VBRVosQ0FBQSxDQUFDLE1BQUQsRUFBUyxVQUFULEVBQXFCLFVBQXJCLEVBQWlDLE1BQWpDLEVBQXlDLEtBQXpDLEVBQWdELFdBQWhELEVBQTZELFFBQTdELEVBQ0EsY0FEQSxFQUNnQixPQURoQixFQUN5QixLQUR6QixFQUNnQyxXQURoQyxFQUM2QyxVQUQ3QyxDQUFBLEdBQzRELE9BQUEsQ0FBUSxTQUFSLENBRDVEOztFQUdBLE1BQUEsR0FB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Q0FBQyxJQUFELEVBQU8sS0FBUCxFQUFjLG9CQUFkO0VBeEJtQjs7RUEwQnZCLGtCQUFBLEdBQXFCLFFBQUEsQ0FBQyxHQUFELENBQUE7QUFDckIsUUFBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLEtBQUEsRUFBQTtJQUFJLEtBQUEsNkNBQWUsQ0FBRTtJQUNqQixDQUFBLENBQUMsSUFBRCxDQUFBLG1CQUFTLFFBQVEsQ0FBQSxDQUFqQjtJQUNBLG9CQUFHLElBQUksQ0FBRSxDQUFGLFdBQUosS0FBWSxZQUFmO01BQ0ksRUFBQSxHQUFLLEtBQUssQ0FBQyw2QkFBRDtNQUNWLElBQUEsZ0JBQU8sRUFBRSxDQUFFO01BQ1gsS0FBQSxvREFBcUIsQ0FBRTtBQUN2QixhQUFPLENBQUMsSUFBRCxFQUFPLEtBQVAsRUFKWDtLQUFBLE1BQUE7YUFNSSxPQUFPLENBQUMsSUFBUixDQUFhLHFCQUFiLEVBQW9DLElBQXBDLEVBTko7O0VBSGlCO0FBOWVyQiIsInNvdXJjZXNDb250ZW50IjpbIm1vbWVudCAgICA9IHJlcXVpcmUgJ21vbWVudCdcbnNoZWxsICAgICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuc2hlbGxcbnVybFJlZ2V4cCA9IHJlcXVpcmUgJ3ViZXItdXJsLXJlZ2V4J1xudXJsICAgICAgID0gcmVxdWlyZSAndXJsJ1xuXG57bmFtZW9mLCBpbml0aWFsc29mLCBuYW1lb2Zjb252LCBsaW5rdG8sIGxhdGVyLCBmb3JjZXJlZHJhdywgdGhyb3R0bGUsXG5nZXRQcm94aWVkTmFtZSwgZml4bGluaywgaXNJbWcsIGdldEltYWdlVXJsLCBkcmF3QXZhdGFyfSAgPSByZXF1aXJlICcuLi91dGlsJ1xuXG5DVVRPRkYgPSA1ICogNjAgKiAxMDAwICogMTAwMCAjIDUgbWluc1xuXG4jIGNoYXRfbWVzc2FnZTpcbiMgICB7XG4jICAgICBhbm5vdGF0aW9uOiBbXG4jICAgICAgIFs0LCBcIlwiXVxuIyAgICAgXVxuIyAgICAgbWVzc2FnZV9jb250ZW50OiB7XG4jICAgICAgIGF0dGFjaGVtZW50OiBbXVxuIyAgICAgICBzZWdtZW50OiBbeyAuLi4gfV1cbiMgICAgIH1cbiMgICB9XG5IQU5HT1VUX0FOTk9UQVRJT05fVFlQRSA9IHtcbiAgICBtZV9tZXNzYWdlOiA0XG59XG5cbiMgdGhpcyBoZWxwcyBmaXhpbmcgaG91dHMgcHJveGllZCB3aXRoIHRoaW5ncyBsaWtlIGhhbmd1cHNib3RcbiMgdGhlIGZvcm1hdCBvZiBwcm94aWVkIG1lc3NhZ2VzIGFyZVxuIyBhbmQgaGVyZSB3ZSBwdXQgZW50aXRpZXMgaW4gdGhlIGVudGl0eSBkYiBmb3JcbiMgdXNlcnMgZm91bmQgb25seSBpbiBwcm94aWVkIG1lc3NhZ2VzLlxuZml4UHJveGllZCA9IChlLCBwcm94aWVkLCBlbnRpdHkpIC0+XG4gICAgcmV0dXJuIHVubGVzcyBlPy5jaGF0X21lc3NhZ2U/Lm1lc3NhZ2VfY29udGVudD9cbiAgICBlLmNoYXRfbWVzc2FnZS5tZXNzYWdlX2NvbnRlbnQucHJveGllZCA9IHRydWVcbiAgICBuYW1lID0gZT8uY2hhdF9tZXNzYWdlPy5tZXNzYWdlX2NvbnRlbnQ/LnNlZ21lbnRbMF0/LnRleHRcbiAgICAjIHVwZGF0ZSBmYWxsYmFja19uYW1lIGZvciBlbnRpdHkgZGF0YWJhc2VcbiAgICBpZiBuYW1lICE9ICc+PidcbiAgICAgICAgIyBzeW50aGV0aWMgYWRkIG9mIGZhbGxiYWNrX25hbWVcbiAgICAgICAgZW50aXR5LmFkZCB7XG4gICAgICAgICAgICBpZDoge1xuICAgICAgICAgICAgICAgIGdhaWFfaWQ6IHByb3hpZWRcbiAgICAgICAgICAgICAgICBjaGF0X2lkOiBwcm94aWVkXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmYWxsYmFja19uYW1lOiBuYW1lXG4gICAgICAgIH0sIHNpbGVudDp0cnVlXG5cbm9uY2xpY2sgPSAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBhZGRyZXNzID0gZS5jdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSAnaHJlZidcblxuICAgIHBhdHQgPSBuZXcgUmVnRXhwKFwiXihodHRwcz9bOl1bL11bL113d3dbLl1nb29nbGVbLl0oY29tfFthLXpdW2Etel0pWy9ddXJsWz9dcVs9XSkoW14mXSspKCYuKykqXCIpXG4gICAgaWYgcGF0dC50ZXN0KGFkZHJlc3MpXG4gICAgICAgIGFkZHJlc3MgPSBhZGRyZXNzLnJlcGxhY2UocGF0dCwgJyQzJylcbiAgICAgICAgYWRkcmVzcyA9IHVuZXNjYXBlKGFkZHJlc3MpXG4gICAgICAgICMgdGhpcyBpcyBhIGxpbmsgb3V0c2lkZSBnb29nbGUgYW5kIGNhbiBiZSBvcGVuZWQgZGlyZWN0bHlcbiAgICAgICAgIyAgYXMgdGhlcmUgaXMgbm8gbmVlZCBmb3IgYXV0aGVudGljYXRpb25cbiAgICAgICAgc2hlbGwub3BlbkV4dGVybmFsKGZpeGxpbmsoYWRkcmVzcykpXG4gICAgICAgIHJldHVyblxuXG4gICAgaWYgdXJsUmVnZXhwKHtleGFjdDogdHJ1ZX0pLnRlc3QoYWRkcmVzcylcbiAgICAgICAgdW5sZXNzIHVybC5wYXJzZShhZGRyZXNzKS5ob3N0P1xuICAgICAgICAgICAgYWRkcmVzcyA9IFwiaHR0cDovLyN7YWRkcmVzc31cIlxuXG4gICAgZmluYWxVcmwgPSBmaXhsaW5rKGFkZHJlc3MpXG5cbiAgICAjIEdvb2dsZSBhcGlzIGdpdmUgdXMgYW4gdXJsIHRoYXQgaXMgb25seSB2YWxpZCBmb3IgdGhlIGN1cnJlbnQgbG9nZ2VkIHVzZXIuXG4gICAgIyBXZSBjYW4ndCBvcGVuIHRoaXMgdXJsIGluIHRoZSBleHRlcm5hbCBicm93c2VyIGJlY2F1c2UgaXQgbWF5IG5vdCBiZSBhdXRoZW50aWNhdGVkXG4gICAgIyBvciBtYXkgYmUgYXV0aGVudGljYXRlZCBkaWZmZXJlbnRseSAoYW5vdGhlciB1c2VyIG9yIG11bHRpcGxlIHVzZXJzKS5cbiAgICAjIEluIHRoaXMgY2FzZSB3ZSB0cnkgdG8gb3BlbiB0aGUgdXJsIG91cnNlbHZlcyB1bnRpbCB3ZSBnZXQgcmVkaXJlY3RlZCB0byB0aGUgZmluYWwgdXJsXG4gICAgIyBvZiB0aGUgaW1hZ2UvdmlkZW8uXG4gICAgIyBUaGUgZmluYWxVUkwgd2lsbCBiZSBjZG4taG9zdGVkLCBzdGF0aWMgYW5kIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAjIHNvIHdlIGNhbiBmaW5hbGx5IG9wZW4gaXQgaW4gdGhlIGV4dGVybmFsIGJyb3dzZXIgOihcblxuICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdFxuXG4gICAgIyBTaG93aW5nIG1lc3NhZ2Ugd2l0aCAzIHNlY29uZCBkZWxheSBzaG93aW5nIHRoZSB1c2VyIHRoYXQgc29tZXRoaW5nIGlzIGhhcHBlbmluZ1xuICAgIG5vdHIge1xuICAgICAgICBodG1sOiBpMThuLl9fICdjb252ZXJzYXRpb24ub3Blbl9saW5rOk9wZW5pbmcgdGhlIGxpbmsgaW4gdGhlIGJyb3dzZXIuLi4nXG4gICAgICAgIHN0YXk6IDMwMDBcbiAgICB9XG5cbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gKGUpIC0+XG4gICAgICAgIHJldHVybiBpZiBlLnRhcmdldC5zdGF0dXMgaXMgMFxuICAgICAgICByZXR1cm4gaWYgeGhyLnJlYWR5U3RhdGUgaXNudCA0XG4gICAgICAgIHJlZGlyZWN0ZWQgPSBmaW5hbFVybC5pbmRleE9mKHhoci5yZXNwb25zZVVSTCkgIT0gMFxuICAgICAgICBpZiByZWRpcmVjdGVkXG4gICAgICAgICAgICBmaW5hbFVybCA9IHhoci5yZXNwb25zZVVSTFxuICAgICAgICBzaGVsbC5vcGVuRXh0ZXJuYWwoZmluYWxVcmwpXG4gICAgICAgIHhoci5hYm9ydCgpXG5cbiAgICB4aHIub3BlbihcImdldFwiLCBmaW5hbFVybClcbiAgICB4aHIuc2VuZCgpXG5cbiMgaGVscGVyIG1ldGhvZCB0byBncm91cCBldmVudHMgaW4gdGltZS91c2VyIGJ1bmNoZXNcbmdyb3VwRXZlbnRzID0gKGVzLCBlbnRpdHkpIC0+XG4gICAgZ3JvdXBzID0gW11cbiAgICBncm91cCA9IG51bGxcbiAgICB1c2VyID0gbnVsbFxuICAgIGZvciBlIGluIGVzXG4gICAgICAgIGlmIGUudGltZXN0YW1wIC0gKGdyb3VwPy5lbmQgPyAwKSA+IENVVE9GRlxuICAgICAgICAgICAgZ3JvdXAgPSB7XG4gICAgICAgICAgICAgICAgYnl1c2VyOiBbXVxuICAgICAgICAgICAgICAgIHN0YXJ0OiBlLnRpbWVzdGFtcFxuICAgICAgICAgICAgICAgIGVuZDogZS50aW1lc3RhbXBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVzZXIgPSBudWxsXG4gICAgICAgICAgICBncm91cHMucHVzaCBncm91cFxuICAgICAgICBwcm94aWVkID0gZ2V0UHJveGllZE5hbWUoZSlcbiAgICAgICAgaWYgcHJveGllZFxuICAgICAgICAgICAgZml4UHJveGllZCBlLCBwcm94aWVkLCBlbnRpdHlcbiAgICAgICAgY2lkID0gaWYgcHJveGllZCB0aGVuIHByb3hpZWQgZWxzZSBlPy5zZW5kZXJfaWQ/LmNoYXRfaWRcbiAgICAgICAgaWYgY2lkICE9IHVzZXI/LmNpZFxuICAgICAgICAgICAgZ3JvdXAuYnl1c2VyLnB1c2ggdXNlciA9IHtcbiAgICAgICAgICAgICAgICBjaWQ6IGNpZFxuICAgICAgICAgICAgICAgIGV2ZW50OiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICB1c2VyLmV2ZW50LnB1c2ggZVxuICAgICAgICBncm91cC5lbmQgPSBlLnRpbWVzdGFtcFxuICAgIGdyb3Vwc1xuXG4jIHBvc3NpYmxlIGNsYXNzZXMgb2YgbWVzc2FnZXNcbk1FU1NBR0VfQ0xBU1NFUyA9IFsncGxhY2Vob2xkZXInLCAnY2hhdF9tZXNzYWdlJyxcbidjb252ZXJzYXRpb25fcmVuYW1lJywgJ21lbWJlcnNoaXBfY2hhbmdlJ11cblxuT0JTRVJWRV9PUFRTID1cbiAgICBjaGlsZExpc3Q6dHJ1ZVxuICAgIGF0dHJpYnV0ZXM6dHJ1ZVxuICAgIGF0dHJpYnV0ZU9sZFZhbHVlOnRydWVcbiAgICBzdWJ0cmVlOnRydWVcblxuZmlyc3RSZW5kZXIgICAgICAgPSB0cnVlXG5sYXN0Q29udiAgICAgICAgICA9IG51bGwgIyB0byBkZXRlY3QgY29udiBzd2l0Y2hpbmdcblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3IChtb2RlbHMpIC0+XG4gICAge3ZpZXdzdGF0ZSwgY29udiwgZW50aXR5fSA9IG1vZGVsc1xuXG4gICAgIyBtdXRhdGlvbiBldmVudHMga2lja3MgaW4gYWZ0ZXIgZmlyc3QgcmVuZGVyXG4gICAgbGF0ZXIgb25NdXRhdGUodmlld3N0YXRlKSBpZiBmaXJzdFJlbmRlclxuICAgIGZpcnN0UmVuZGVyID0gZmFsc2VcblxuICAgIGNvbnZfaWQgPSB2aWV3c3RhdGU/LnNlbGVjdGVkQ29udlxuICAgIGMgPSBjb252W2NvbnZfaWRdXG4gICAgaWYgYz8uY3VycmVudF9wYXJ0aWNpcGFudD9cbiAgICAgICAgZm9yIHBhcnRpY2lwYW50IGluIGMuY3VycmVudF9wYXJ0aWNpcGFudFxuICAgICAgICAgICAgZW50aXR5Lm5lZWRFbnRpdHkgcGFydGljaXBhbnQuY2hhdF9pZFxuICAgIGRpdiBjbGFzczonbWVzc2FnZXMnLCBvYnNlcnZlOm9uTXV0YXRlKHZpZXdzdGF0ZSksIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgYz8uZXZlbnRcblxuICAgICAgICBncm91cGVkID0gZ3JvdXBFdmVudHMgYy5ldmVudCwgZW50aXR5XG4gICAgICAgIGRpdiBjbGFzczonaGlzdG9yeWluZm8nLCAtPlxuICAgICAgICAgICAgaWYgYy5yZXF1ZXN0aW5naGlzdG9yeVxuICAgICAgICAgICAgICAgIHBhc3MgJ1JlcXVlc3RpbmcgaGlzdG9yeeKApicsIC0+IHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zIHNwaW4nLCAnZG9udXRfbGFyZ2UnXG5cbiAgICAgICAgaWYgIXZpZXdzdGF0ZS51c2VTeXN0ZW1EYXRlRm9ybWF0XG4gICAgICAgICAgICBtb21lbnQubG9jYWxlKGkxOG4uZ2V0TG9jYWxlKCkpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG1vbWVudC5sb2NhbGUod2luZG93Lm5hdmlnYXRvci5sYW5ndWFnZSlcblxuICAgICAgICBsYXN0X3NlZW4gPSBjb252LmZpbmRMYXN0UmVhZEV2ZW50c0J5VXNlcihjKVxuICAgICAgICBsYXN0X3NlZW5fY2hhdF9pZHNfd2l0aF9ldmVudCA9IChsYXN0X3NlZW4sIGV2ZW50KSAtPlxuICAgICAgICAgICAgKGNoYXRfaWQgZm9yIGNoYXRfaWQsIGUgb2YgbGFzdF9zZWVuIHdoZW4gZXZlbnQgaXMgZSlcblxuICAgICAgICBmb3IgZyBpbiBncm91cGVkXG4gICAgICAgICAgICBkaXYgY2xhc3M6J3RpbWVzdGFtcCcsIG1vbWVudChnLnN0YXJ0IC8gMTAwMCkuY2FsZW5kYXIoKVxuICAgICAgICAgICAgZm9yIHUgaW4gZy5ieXVzZXJcbiAgICAgICAgICAgICAgICBzZW5kZXIgPSBuYW1lb2YgZW50aXR5W3UuY2lkXVxuICAgICAgICAgICAgICAgIGZvciBldmVudHMgaW4gZ3JvdXBFdmVudHNCeU1lc3NhZ2VUeXBlIHUuZXZlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgaXNNZU1lc3NhZ2UgZXZlbnRzWzBdXG4gICAgICAgICAgICAgICAgICAgICAgICAjIGFsbCBpdGVtcyBhcmUgL21lIG1lc3NhZ2VzIGlmIHRoZSBmaXJzdCBvbmUgaXMgZHVlIHRvIGdyb3VwaW5nIGFib3ZlXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6J3Vncm91cCBtZScsIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHJhd01lc3NhZ2VBdmF0YXIgdSwgc2VuZGVyLCB2aWV3c3RhdGUsIGVudGl0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRyYXdNZU1lc3NhZ2UgZSBmb3IgZSBpbiBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgY2x6ID0gWyd1Z3JvdXAnXVxuICAgICAgICAgICAgICAgICAgICAgICAgY2x6LnB1c2ggJ3NlbGYnIGlmIGVudGl0eS5pc1NlbGYodS5jaWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6Y2x6LmpvaW4oJyAnKSwgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3TWVzc2FnZUF2YXRhciB1LCBzZW5kZXIsIHZpZXdzdGF0ZSwgZW50aXR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGl2IGNsYXNzOid1bWVzc2FnZXMnLCAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3TWVzc2FnZShlLCBlbnRpdHkpIGZvciBlIGluIGV2ZW50c1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBhdCB0aGUgZW5kIG9mIHRoZSBldmVudHMgZ3JvdXAgd2UgZHJhdyB3aG8gaGFzIHJlYWQgYW55IG9mIGl0cyBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6ICdzZWVuLWxpc3QnLCAoKSAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgZSBpbiBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciBjaGF0X2lkIGluIGxhc3Rfc2Vlbl9jaGF0X2lkc193aXRoX2V2ZW50KGxhc3Rfc2VlbiwgZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBza2lwID0gZW50aXR5LmlzU2VsZihjaGF0X2lkKSBvciAoY2hhdF9pZCA9PSB1LmNpZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3U2VlbkF2YXRhcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5W2NoYXRfaWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmV2ZW50X2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3c3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkgaWYgbm90IHNraXBcblxuICAgICMgR28gdGhyb3VnaCBhbGwgdGhlIHBhcnRpY2lwYW50cyBhbmQgb25seSBzaG93IGhpcyBsYXN0IHNlZW4gc3RhdHVzXG4gICAgaWYgYz8uY3VycmVudF9wYXJ0aWNpcGFudD9cbiAgICAgICAgZm9yIHBhcnRpY2lwYW50IGluIGMuY3VycmVudF9wYXJ0aWNpcGFudFxuICAgICAgICAgICAgIyBnZXQgYWxsIGF2YXRhcnNcbiAgICAgICAgICAgIGFsbF9zZWVuID0gZG9jdW1lbnRcbiAgICAgICAgICAgIC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNlZW5bZGF0YS1pZD0nI3twYXJ0aWNpcGFudC5jaGF0X2lkfSddXCIpXG4gICAgICAgICAgICAjIHNlbGVjdCBsYXN0IG9uZVxuICAgICAgICAgICAgIyAgTk9UIFdPUktJTkdcbiAgICAgICAgICAgICNpZiBhbGxfc2Vlbi5sZW5ndGggPiAwXG4gICAgICAgICAgICAjICAgIGFsbF9zZWVuLmZvckVhY2ggKGVsKSAtPlxuICAgICAgICAgICAgIyAgICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSAnc2hvdydcbiAgICAgICAgICAgICMgICAgYWxsX3NlZW5bYWxsX3NlZW4ubGVuZ3RoIC0gMV0uY2xhc3NMaXN0LmFkZCAnc2hvdydcbiAgICBpZiBsYXN0Q29udiAhPSBjb252X2lkXG4gICAgICAgIGxhc3RDb252ID0gY29udl9pZFxuICAgICAgICBsYXRlciBhdFRvcElmU21hbGxcblxuZHJhd01lc3NhZ2VBdmF0YXIgPSAodSwgc2VuZGVyLCB2aWV3c3RhdGUsIGVudGl0eSkgLT5cbiAgICBkaXYgY2xhc3M6ICdzZW5kZXItd3JhcHBlcicsIC0+XG4gICAgICAgIGEgaHJlZjpsaW5rdG8odS5jaWQpLCB0aXRsZTogc2VuZGVyLCB7b25jbGlja30sIGNsYXNzOidzZW5kZXInLCAtPlxuICAgICAgICAgICAgZHJhd0F2YXRhcih1LmNpZCwgdmlld3N0YXRlLCBlbnRpdHkpXG4gICAgICAgIHNwYW4gc2VuZGVyXG5cbmdyb3VwRXZlbnRzQnlNZXNzYWdlVHlwZSA9IChldmVudCkgLT5cbiAgICByZXMgPSBbXVxuICAgIGluZGV4ID0gMFxuICAgIHByZXZXYXNNZSA9IHRydWVcbiAgICBmb3IgZSBpbiBldmVudFxuICAgICAgICBpZiBpc01lTWVzc2FnZSBlXG4gICAgICAgICAgICBpbmRleCA9IHJlcy5wdXNoIFtlXVxuICAgICAgICAgICAgcHJldldhc01lID0gdHJ1ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBpZiBwcmV2V2FzTWVcbiAgICAgICAgICAgICAgICBpbmRleCA9IHJlcy5wdXNoIFtlXVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlc1tpbmRleCAtIDFdLnB1c2ggZVxuICAgICAgICAgICAgcHJldldhc01lID0gZmFsc2VcbiAgICByZXR1cm4gcmVzXG5cbmlzTWVNZXNzYWdlID0gKGUpIC0+XG4gICAgZT8uY2hhdF9tZXNzYWdlPy5hbm5vdGF0aW9uP1swXT9bMF0gPT0gSEFOR09VVF9BTk5PVEFUSU9OX1RZUEUubWVfbWVzc2FnZVxuXG5kcmF3U2VlbkF2YXRhciA9ICh1LCBldmVudF9pZCwgdmlld3N0YXRlLCBlbnRpdHkpIC0+XG4gICAgaW5pdGlhbHMgPSBpbml0aWFsc29mIHVcbiAgICBkaXYgY2xhc3M6IFwic2VlblwiXG4gICAgLCBcImRhdGEtaWRcIjogdS5pZFxuICAgICwgXCJkYXRhLWV2ZW50LWlkXCI6IGV2ZW50X2lkXG4gICAgLCB0aXRsZTogdS5kaXNwbGF5X25hbWVcbiAgICAsIC0+XG4gICAgICAgIGRyYXdBdmF0YXIodS5pZCwgdmlld3N0YXRlLCBlbnRpdHkpXG5cbmRyYXdNZU1lc3NhZ2UgPSAoZSkgLT5cbiAgICBkaXYgY2xhc3M6J21lc3NhZ2UnLCAtPlxuICAgICAgICBlLmNoYXRfbWVzc2FnZT8ubWVzc2FnZV9jb250ZW50LnNlZ21lbnRbMF0udGV4dFxuXG5kcmF3TWVzc2FnZSA9IChlLCBlbnRpdHkpIC0+XG4gICAgIyBjb25zb2xlLmxvZyAnbWVzc2FnZScsIGUuY2hhdF9tZXNzYWdlXG4gICAgbWNseiA9IFsnbWVzc2FnZSddXG4gICAgbWNsei5wdXNoIGMgZm9yIGMgaW4gTUVTU0FHRV9DTEFTU0VTIHdoZW4gZVtjXT9cbiAgICB0aXRsZSA9IGlmIGUudGltZXN0YW1wIHRoZW4gbW9tZW50KGUudGltZXN0YW1wIC8gMTAwMCkuY2FsZW5kYXIoKSBlbHNlIG51bGxcbiAgICBkaXYgaWQ6ZS5ldmVudF9pZCwga2V5OmUuZXZlbnRfaWQsIGNsYXNzOm1jbHouam9pbignICcpLCB0aXRsZTp0aXRsZSwgLT5cbiAgICAgICAgaWYgZS5jaGF0X21lc3NhZ2VcbiAgICAgICAgICAgIGNvbnRlbnQgPSBlLmNoYXRfbWVzc2FnZT8ubWVzc2FnZV9jb250ZW50XG4gICAgICAgICAgICBmb3JtYXQgY29udGVudFxuICAgICAgICAgICAgIyBsb2FkSW5saW5lSW1hZ2VzIGNvbnRlbnRcbiAgICAgICAgICAgIGlmIGUucGxhY2Vob2xkZXIgYW5kIGUudXBsb2FkaW1hZ2VcbiAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucyBzcGluJywgJ2RvbnV0X2xhcmdlJ1xuICAgICAgICBlbHNlIGlmIGUuY29udmVyc2F0aW9uX3JlbmFtZVxuICAgICAgICAgICAgcGFzcyBcInJlbmFtZWQgY29udmVyc2F0aW9uIHRvICN7ZS5jb252ZXJzYXRpb25fcmVuYW1lLm5ld19uYW1lfVwiXG4gICAgICAgICAgICAjIHtuZXdfbmFtZTogXCJsYWJib3RcIiBvbGRfbmFtZTogXCJcIn1cbiAgICAgICAgZWxzZSBpZiBlLm1lbWJlcnNoaXBfY2hhbmdlXG4gICAgICAgICAgICB0ID0gZS5tZW1iZXJzaGlwX2NoYW5nZS50eXBlXG4gICAgICAgICAgICBlbnRzID0gZS5tZW1iZXJzaGlwX2NoYW5nZS5wYXJ0aWNpcGFudF9pZHMubWFwIChwKSAtPiBlbnRpdHlbcC5jaGF0X2lkXVxuICAgICAgICAgICAgbmFtZXMgPSBlbnRzLm1hcChuYW1lb2YpLmpvaW4oJywgJylcbiAgICAgICAgICAgIGlmIHQgPT0gJ0pPSU4nXG4gICAgICAgICAgICAgICAgcGFzcyBcImludml0ZWQgI3tuYW1lc31cIlxuICAgICAgICAgICAgZWxzZSBpZiB0ID09ICdMRUFWRSdcbiAgICAgICAgICAgICAgICBwYXNzIFwiI3tuYW1lc30gbGVmdCB0aGUgY29udmVyc2F0aW9uXCJcbiAgICAgICAgZWxzZSBpZiBlLmhhbmdvdXRfZXZlbnRcbiAgICAgICAgICAgIGhhbmdvdXRfZXZlbnQgPSBlLmhhbmdvdXRfZXZlbnRcbiAgICAgICAgICAgIHN0eWxlID0gJ3ZlcnRpY2FsLWFsaWduJzogJ21pZGRsZSdcbiAgICAgICAgICAgIGlmIGhhbmdvdXRfZXZlbnQuZXZlbnRfdHlwZSBpcyAnU1RBUlRfSEFOR09VVCdcbiAgICAgICAgICAgICAgICBzcGFuIHsgY2xhc3M6ICdtYXRlcmlhbC1pY29ucycsIHN0eWxlIH0sICdjYWxsX21hZGVfc21hbGwnXG4gICAgICAgICAgICAgICAgcGFzcyAnIENhbGwgc3RhcnRlZCdcbiAgICAgICAgICAgIGVsc2UgaWYgaGFuZ291dF9ldmVudC5ldmVudF90eXBlIGlzICdFTkRfSEFOR09VVCdcbiAgICAgICAgICAgICAgICBzcGFuIHsgY2xhc3M6J21hdGVyaWFsLWljb25zIHNtYWxsJywgc3R5bGUgfSwgJ2NhbGxfZW5kJ1xuICAgICAgICAgICAgICAgIHBhc3MgJyBDYWxsIGVuZGVkJ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBjb25zb2xlLmxvZyAndW5oYW5kbGVkIGV2ZW50IHR5cGUnLCBlLCBlbnRpdHlcblxuXG5hdFRvcElmU21hbGwgPSAtPlxuICAgIHNjcmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1haW4nKVxuICAgIG1zZ2VsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1lc3NhZ2VzJylcbiAgICBhY3Rpb24gJ2F0dG9wJywgbXNnZWw/Lm9mZnNldEhlaWdodCA8IHNjcmVsPy5vZmZzZXRIZWlnaHRcblxuXG4jIHdoZW4gdGhlcmUncyBtdXRhdGlvbiwgd2Ugc2Nyb2xsIHRvIGJvdHRvbSBpbiBjYXNlIHdlIGFscmVhZHkgYXJlIGF0IGJvdHRvbVxub25NdXRhdGUgPSAodmlld3N0YXRlKSAtPiB0aHJvdHRsZSAxMCwgLT5cbiAgICAjIGp1bXAgdG8gYm90dG9tIHRvIGZvbGxvdyBjb252XG4gICAgc2Nyb2xsVG9Cb3R0b20oKSBpZiB2aWV3c3RhdGUuYXRib3R0b21cblxuXG5zY3JvbGxUb0JvdHRvbSA9IG1vZHVsZS5leHBvcnRzLnNjcm9sbFRvQm90dG9tID0gLT5cbiAgICAjIGVuc3VyZSB3ZSdyZSBzY3JvbGxlZCB0byBib3R0b21cbiAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tYWluJylcbiAgICAjIHRvIGJvdHRvbVxuICAgIGVsLnNjcm9sbFRvcCA9IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSXG5cblxuaWZwYXNzID0gKHQsIGYpIC0+IGlmIHQgdGhlbiBmIGVsc2UgcGFzc1xuXG5mb3JtYXQgPSAoY29udCkgLT5cbiAgICBpZiBjb250Py5hdHRhY2htZW50P1xuICAgICAgICB0cnlcbiAgICAgICAgICAgIGZvcm1hdEF0dGFjaG1lbnQgY29udC5hdHRhY2htZW50XG4gICAgICAgIGNhdGNoIGVcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IgZVxuICAgIGZvciBzZWcsIGkgaW4gY29udD8uc2VnbWVudCA/IFtdXG4gICAgICAgIGNvbnRpbnVlIGlmIGNvbnQucHJveGllZCBhbmQgaSA8IDFcbiAgICAgICAgZm9ybWF0dGVycy5mb3JFYWNoIChmbikgLT5cbiAgICAgICAgICAgIGZuIHNlZywgY29udFxuICAgIG51bGxcblxuXG5mb3JtYXR0ZXJzID0gW1xuICAgICMgdGV4dCBmb3JtYXR0ZXJcbiAgICAoc2VnLCBjb250KSAtPlxuICAgICAgICBmID0gc2VnLmZvcm1hdHRpbmcgPyB7fVxuICAgICAgICBocmVmID0gc2VnPy5saW5rX2RhdGE/LmxpbmtfdGFyZ2V0XG4gICAgICAgIGlmcGFzcyhocmVmLCAoKGYpIC0+IGEge2hyZWYsIG9uY2xpY2t9LCBmKSkgLT5cbiAgICAgICAgICAgIGlmcGFzcyhmLmJvbGQsIGIpIC0+XG4gICAgICAgICAgICAgICAgaWZwYXNzKGYuaXRhbGljLCBpKSAtPlxuICAgICAgICAgICAgICAgICAgICBpZnBhc3MoZi51bmRlcmxpbmUsIHUpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICBpZnBhc3MoZi5zdHJpa2V0aHJvdWdoLCBzKSAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3MgaWYgY29udC5wcm94aWVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmlwUHJveGllZENvbG9uIHNlZy50ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiBzZWcudHlwZSA9PSAnTElORV9CUkVBSydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1xcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZy50ZXh0XG4gICAgIyBpbWFnZSBmb3JtYXR0ZXJcbiAgICAoc2VnKSAtPlxuICAgICAgICBocmVmID0gc2VnPy5saW5rX2RhdGE/LmxpbmtfdGFyZ2V0XG4gICAgICAgIGltYWdlVXJsID0gZ2V0SW1hZ2VVcmwgaHJlZiAjIGZhbHNlIGlmIGNhbid0IGZpbmQgb25lXG4gICAgICAgIGlmIGltYWdlVXJsIGFuZCBwcmVsb2FkIGltYWdlVXJsXG4gICAgICAgICAgICBkaXYgLT5cbiAgICAgICAgICAgICAgICBpZiBtb2RlbHMudmlld3N0YXRlLnNob3dJbWFnZVByZXZpZXdcbiAgICAgICAgICAgICAgICAgICAgaW1nIHNyYzogaW1hZ2VVcmxcbiAgICAgICAgICAgICAgICBlbHNlIGEge2ltYWdlVXJsLCBvbmNsaWNrfVxuICAgICMgdHdpdHRlciBwcmV2aWV3XG4gICAgKHNlZykgLT5cbiAgICAgICAgaHJlZiA9IHNlZz8udGV4dFxuICAgICAgICBpZiAhaHJlZlxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIG1hdGNoZXMgPSBocmVmLm1hdGNoIC9eKGh0dHBzPzpcXC9cXC8pKC4rXFwuKT8odHdpdHRlci5jb21cXC8uK1xcL3N0YXR1c1xcLy4rKS9cbiAgICAgICAgaWYgIW1hdGNoZXNcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBkYXRhID0gcHJlbG9hZFR3ZWV0IG1hdGNoZXNbMV0gKyBtYXRjaGVzWzNdXG4gICAgICAgIGlmICFkYXRhXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgZGl2IGNsYXNzOid0d2VldCcsIC0+XG4gICAgICAgICAgICBpZiBkYXRhLnRleHRcbiAgICAgICAgICAgICAgICBwIC0+XG4gICAgICAgICAgICAgICAgICAgIGRhdGEudGV4dFxuICAgICAgICAgICAgaWYgZGF0YS5pbWFnZVVybCBhbmQgKHByZWxvYWQgZGF0YS5pbWFnZVVybCkgYW5kIG1vZGVscy52aWV3c3RhdGUuc2hvd0ltYWdlUHJldmlld1xuICAgICAgICAgICAgICAgIGltZyBzcmM6IGRhdGEuaW1hZ2VVcmxcbiAgICAjIGluc3RhZ3JhbSBwcmV2aWV3XG4gICAgKHNlZykgLT5cbiAgICAgICAgaHJlZiA9IHNlZz8udGV4dFxuICAgICAgICBpZiAhaHJlZlxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIG1hdGNoZXMgPSBocmVmLm1hdGNoIC9eKGh0dHBzPzpcXC9cXC8pKC4rXFwuKT8oaW5zdGFncmFtLmNvbVxcL3BcXC8uKykvXG4gICAgICAgIGlmICFtYXRjaGVzXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgZGF0YSA9IHByZWxvYWRJbnN0YWdyYW1QaG90byAnaHR0cHM6Ly9hcGkuaW5zdGFncmFtLmNvbS9vZW1iZWQvP3VybD0nICsgaHJlZlxuICAgICAgICBpZiAhZGF0YVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIGRpdiBjbGFzczonaW5zdGFncmFtJywgLT5cbiAgICAgICAgICAgIGlmIGRhdGEudGV4dFxuICAgICAgICAgICAgICAgIHAgLT5cbiAgICAgICAgICAgICAgICAgICAgZGF0YS50ZXh0XG4gICAgICAgICAgICBpZiBkYXRhLmltYWdlVXJsIGFuZCAocHJlbG9hZCBkYXRhLmltYWdlVXJsKSBhbmQgbW9kZWxzLnZpZXdzdGF0ZS5zaG93SW1hZ2VQcmV2aWV3XG4gICAgICAgICAgICAgICAgaW1nIHNyYzogZGF0YS5pbWFnZVVybFxuXVxuXG5zdHJpcFByb3hpZWRDb2xvbiA9ICh0eHQpIC0+XG4gICAgaWYgdHh0Py5pbmRleE9mKFwiOiBcIikgPT0gMFxuICAgICAgICB0eHQuc3Vic3RyaW5nKDIpXG4gICAgZWxzZVxuICAgICAgICB0eHRcblxucHJlbG9hZF9jYWNoZSA9IHt9XG5cblxucHJlbG9hZCA9IChocmVmKSAtPlxuICAgIGNhY2hlID0gcHJlbG9hZF9jYWNoZVtocmVmXVxuICAgIGlmIG5vdCBjYWNoZVxuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ2ltZydcbiAgICAgICAgZWwub25sb2FkID0gLT5cbiAgICAgICAgICAgIHJldHVybiB1bmxlc3MgdHlwZW9mIGVsLm5hdHVyYWxXaWR0aCA9PSAnbnVtYmVyJ1xuICAgICAgICAgICAgZWwubG9hZGVkID0gdHJ1ZVxuICAgICAgICAgICAgbGF0ZXIgLT4gYWN0aW9uICdsb2FkZWRpbWcnXG4gICAgICAgIGVsLm9uZXJyb3IgPSAtPiBjb25zb2xlLmxvZyAnZXJyb3IgbG9hZGluZyBpbWFnZScsIGhyZWZcbiAgICAgICAgZWwuc3JjID0gaHJlZlxuICAgICAgICBwcmVsb2FkX2NhY2hlW2hyZWZdID0gZWxcbiAgICByZXR1cm4gY2FjaGU/LmxvYWRlZFxuXG5wcmVsb2FkVHdlZXQgPSAoaHJlZikgLT5cbiAgICBjYWNoZSA9IHByZWxvYWRfY2FjaGVbaHJlZl1cbiAgICBpZiBub3QgY2FjaGVcbiAgICAgICAgcHJlbG9hZF9jYWNoZVtocmVmXSA9IHt9XG4gICAgICAgIGZldGNoIGhyZWZcbiAgICAgICAgLnRoZW4gKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgcmVzcG9uc2UudGV4dCgpXG4gICAgICAgIC50aGVuIChodG1sKSAtPlxuICAgICAgICAgICAgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ2RpdidcbiAgICAgICAgICAgIGZyYWcuaW5uZXJIVE1MID0gaHRtbFxuICAgICAgICAgICAgY29udGFpbmVyID0gZnJhZy5xdWVyeVNlbGVjdG9yICdbZGF0YS1hc3NvY2lhdGVkLXR3ZWV0LWlkXSdcbiAgICAgICAgICAgIHRleHROb2RlID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IgKCcudHdlZXQtdGV4dCcpXG4gICAgICAgICAgICBpbWFnZSA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yICgnW2RhdGEtaW1hZ2UtdXJsXScpXG4gICAgICAgICAgICBwcmVsb2FkX2NhY2hlW2hyZWZdLnRleHQgPSB0ZXh0Tm9kZS50ZXh0Q29udGVudFxuICAgICAgICAgICAgcHJlbG9hZF9jYWNoZVtocmVmXS5pbWFnZVVybCA9IGltYWdlPy5kYXRhc2V0LmltYWdlVXJsXG4gICAgICAgICAgICBsYXRlciAtPiBhY3Rpb24gJ2xvYWRlZHR3ZWV0J1xuICAgIHJldHVybiBjYWNoZVxuXG5wcmVsb2FkSW5zdGFncmFtUGhvdG8gPSAoaHJlZikgLT5cbiAgICBjYWNoZSA9IHByZWxvYWRfY2FjaGVbaHJlZl1cbiAgICBpZiBub3QgY2FjaGVcbiAgICAgICAgcHJlbG9hZF9jYWNoZVtocmVmXSA9IHt9XG4gICAgICAgIGZldGNoIGhyZWZcbiAgICAgICAgLnRoZW4gKHJlc3BvbnNlKSAtPlxuICAgICAgICAgICAgcmVzcG9uc2UuanNvbigpXG4gICAgICAgIC50aGVuIChqc29uKSAtPlxuICAgICAgICAgICAgcHJlbG9hZF9jYWNoZVtocmVmXS50ZXh0ID0ganNvbi50aXRsZVxuICAgICAgICAgICAgcHJlbG9hZF9jYWNoZVtocmVmXS5pbWFnZVVybCA9IGpzb24udGh1bWJuYWlsX3VybFxuICAgICAgICAgICAgbGF0ZXIgLT4gYWN0aW9uICdsb2FkZWRpbnN0YWdyYW1waG90bydcbiAgICByZXR1cm4gY2FjaGVcblxuZm9ybWF0QXR0YWNobWVudCA9IChhdHQpIC0+XG4gICAgIyBjb25zb2xlLmxvZyAnYXR0YWNobWVudCcsIGF0dCBpZiBhdHQubGVuZ3RoID4gMFxuICAgIGlmIGF0dD9bMF0/LmVtYmVkX2l0ZW0/LnR5cGVfXG4gICAgICAgIGRhdGEgPSBleHRyYWN0UHJvdG9idWZTdHlsZShhdHQpXG4gICAgICAgIHJldHVybiBpZiBub3QgZGF0YVxuICAgICAgICB7aHJlZiwgdGh1bWIsIG9yaWdpbmFsX2NvbnRlbnRfdXJsfSA9IGRhdGFcbiAgICBlbHNlIGlmIGF0dD9bMF0/LmVtYmVkX2l0ZW0/LnR5cGVcbiAgICAgICAgY29uc29sZS5sb2coJ1RISVMgU0hPVUxEIE5PVCBIQVBQRU4gV1RGICEhJylcbiAgICAgICAgZGF0YSA9IGV4dHJhY3RQcm90b2J1ZlN0eWxlKGF0dClcbiAgICAgICAgcmV0dXJuIGlmIG5vdCBkYXRhXG4gICAgICAgIHtocmVmLCB0aHVtYiwgb3JpZ2luYWxfY29udGVudF91cmx9ID0gZGF0YVxuICAgIGVsc2VcbiAgICAgICAgY29uc29sZS53YXJuICdpZ25vcmluZyBhdHRhY2htZW50JywgYXR0IHVubGVzcyBhdHQ/Lmxlbmd0aCA9PSAwXG4gICAgICAgIHJldHVyblxuXG4gICAgIyBzdGlja2VycyBkbyBub3QgaGF2ZSBhbiBocmVmIHNvIHdlIGxpbmsgdG8gdGhlIG9yaWdpbmFsIGNvbnRlbnQgaW5zdGVhZFxuICAgIGhyZWYgPSBvcmlnaW5hbF9jb250ZW50X3VybCB1bmxlc3MgaHJlZlxuXG4gICAgIyBoZXJlIHdlIGFzc3VtZSBhdHRhY2htZW50cyBhcmUgb25seSBpbWFnZXNcbiAgICBpZiBwcmVsb2FkIHRodW1iXG4gICAgICAgIGRpdiBjbGFzczonYXR0YWNoJywgLT5cbiAgICAgICAgICAgIGEge2hyZWYsIG9uY2xpY2t9LCAtPlxuICAgICAgICAgICAgICAgIGlmIG1vZGVscy52aWV3c3RhdGUuc2hvd0ltYWdlUHJldmlld1xuICAgICAgICAgICAgICAgICAgICBpbWcgc3JjOnRodW1iXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBpMThuLl9fKCdjb252ZXJzYXRpb24ubm9fcHJldmlld19pbWFnZV9jbGlja190b19vcGVuOkltYWdlIHByZXZpZXcgaXMgZGlzYWJsZWQ6IGNsaWNrIHRvIG9wZW4gaXQgaW4gdGhlIGJyb3dzZXInKVxuXG5oYW5kbGUgJ2xvYWRlZGltZycsIC0+XG4gICAgIyBhbGxvdyBjb250cm9sbGVyIHRvIHJlY29yZCBjdXJyZW50IHBvc2l0aW9uXG4gICAgdXBkYXRlZCAnYmVmb3JlSW1nJ1xuICAgICMgd2lsbCBkbyB0aGUgcmVkcmF3IGluc2VydGluZyB0aGUgaW1hZ2VcbiAgICB1cGRhdGVkICdjb252J1xuICAgICMgZml4IHRoZSBwb3NpdGlvbiBhZnRlciByZWRyYXdcbiAgICB1cGRhdGVkICdhZnRlckltZydcblxuaGFuZGxlICdsb2FkZWR0d2VldCcsIC0+XG4gICAgdXBkYXRlZCAnY29udidcblxuaGFuZGxlICdsb2FkZWRpbnN0YWdyYW1waG90bycsIC0+XG4gICAgdXBkYXRlZCAnY29udidcblxuZXh0cmFjdFByb3RvYnVmU3R5bGUgPSAoYXR0KSAtPlxuICAgIGhyZWYgPSBudWxsXG4gICAgdGh1bWIgPSBudWxsXG5cbiAgICBlbWJlZF9pdGVtID0gYXR0P1swXT8uZW1iZWRfaXRlbVxuICAgIHtwbHVzX3Bob3RvLCBkYXRhLCB0eXBlX30gPSBlbWJlZF9pdGVtID8ge31cbiAgICBpZiBwbHVzX3Bob3RvP1xuICAgICAgICBocmVmICA9IHBsdXNfcGhvdG8uZGF0YT8udXJsXG4gICAgICAgIHRodW1iID0gcGx1c19waG90by5kYXRhPy50aHVtYm5haWw/LmltYWdlX3VybFxuICAgICAgICBocmVmICA9IHBsdXNfcGhvdG8uZGF0YT8udGh1bWJuYWlsPy51cmxcbiAgICAgICAgb3JpZ2luYWxfY29udGVudF91cmwgPSBwbHVzX3Bob3RvLmRhdGE/Lm9yaWdpbmFsX2NvbnRlbnRfdXJsXG4gICAgICAgIGlzVmlkZW8gPSBwbHVzX3Bob3RvLmRhdGE/Lm1lZGlhX3R5cGUgaXNudCAnTUVESUFfVFlQRV9QSE9UTydcbiAgICAgICAgcmV0dXJuIHtocmVmLCB0aHVtYiwgb3JpZ2luYWxfY29udGVudF91cmx9XG5cbiAgICB0ID0gdHlwZV8/WzBdXG4gICAgcmV0dXJuIGNvbnNvbGUud2FybiAnaWdub3JpbmcgKG9sZCkgYXR0YWNobWVudCB0eXBlJywgYXR0IHVubGVzcyB0ID09IDI0OVxuICAgIGsgPSBPYmplY3Qua2V5cyhkYXRhKT9bMF1cbiAgICByZXR1cm4gdW5sZXNzIGtcbiAgICBocmVmID0gZGF0YT9ba10/WzVdXG4gICAgdGh1bWIgPSBkYXRhP1trXT9bOV1cbiAgICBpZiBub3QgdGh1bWJcbiAgICAgICAgaHJlZiA9IGRhdGE/W2tdP1s0XVxuICAgICAgICB0aHVtYiA9IGRhdGE/W2tdP1s1XVxuXG4gICAge2hyZWYsIHRodW1iLCBvcmlnaW5hbF9jb250ZW50X3VybH1cblxuZXh0cmFjdE9iamVjdFN0eWxlID0gKGF0dCkgLT5cbiAgICBlaXRlbSA9IGF0dD9bMF0/LmVtYmVkX2l0ZW1cbiAgICB7dHlwZX0gPSBlaXRlbSA/IHt9XG4gICAgaWYgdHlwZT9bMF0gPT0gXCJQTFVTX1BIT1RPXCJcbiAgICAgICAgaXQgPSBlaXRlbVtcImVtYmVkcy5QbHVzUGhvdG8ucGx1c19waG90b1wiXVxuICAgICAgICBocmVmID0gaXQ/LnVybFxuICAgICAgICB0aHVtYiA9IGl0Py50aHVtYm5haWw/LnVybFxuICAgICAgICByZXR1cm4ge2hyZWYsIHRodW1ifVxuICAgIGVsc2VcbiAgICAgICAgY29uc29sZS53YXJuICdpZ25vcmluZyAobmV3KSB0eXBlJywgdHlwZVxuIl19
