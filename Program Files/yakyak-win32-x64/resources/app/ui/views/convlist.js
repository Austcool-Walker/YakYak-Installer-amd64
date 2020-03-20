(function() {
  var MESSAGE_CLASSES, drawAvatar, drawMessage, fixlink, format, ifpass, initialsof, moment, nameof, nameofconv;

  moment = require('moment');

  ({nameof, initialsof, nameofconv, fixlink, drawAvatar} = require('../util'));

  module.exports = view(function(models) {
    var clz, conv, entity, viewstate;
    ({conv, entity, viewstate} = models);
    clz = ['convlist'];
    if (viewstate.showConvThumbs) {
      clz.push('showconvthumbs');
    }
    if (viewstate.showAnimatedThumbs) {
      clz.push('showanimatedthumbs');
    }
    return div({
      class: clz.join(' ')
    }, function() {
      var c, convs, others, renderConv, starred;
      if (!viewstate.useSystemDateFormat) {
        moment.locale(i18n.getLocale());
      } else {
        moment.locale(window.navigator.language);
      }
      convs = conv.list();
      renderConv = function(c) {
        var cid, lastChanged, pureHang, ref, ur;
        if ((c != null ? c.self_conversation_state.view[0] : void 0) === 'ARCHIVED_VIEW') {
          return;
        }
        // remove emoji suggestions on renderConv
        if (document.querySelectorAll('.emoji-sugg-container').length) {
          document.querySelectorAll('.emoji-sugg-container')[0].parentNode.removeChild(document.querySelectorAll('.emoji-sugg-container')[0]);
        }
        pureHang = conv.isPureHangout(c);
        lastChanged = conv.lastChanged(c);
        // don't list pure hangouts that are older than 24h
        if (pureHang && (Date.now() - lastChanged) > 24 * 60 * 60 * 1000) {
          return;
        }
        cid = c != null ? (ref = c.conversation_id) != null ? ref.id : void 0 : void 0;
        ur = conv.unread(c);
        clz = ['conv'];
        clz.push(`type_${c.type}`);
        if (models.viewstate.selectedConv === cid) {
          clz.push("selected");
        }
        if (ur) {
          clz.push("unread");
        }
        if (pureHang) {
          clz.push("purehang");
        }
        return div({
          key: cid,
          class: clz.join(' '),
          "data-id": cid
        }, function() {
          var ents, lbl, name, p, part, ref1;
          part = (ref1 = c != null ? c.current_participant : void 0) != null ? ref1 : [];
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
          name = nameofconv(c);
          if (viewstate.showConvThumbs || viewstate.showConvMin) {
            div({
              class: 'thumbs thumbs-' + (ents.length > 4 ? '4' : ents.length)
            }, function() {
              var additional, index, j, lbl, len;
              additional = [];
              for (index = j = 0, len = ents.length; j < len; index = ++j) {
                p = ents[index];
                // if there are up to 4 people in the conversation
                //   then draw them all, otherwise, draw 3 avatars
                //   and then add a +X , where X is the remaining
                //   number of people
                if (index < 3 || ents.length === 4) {
                  entity.needEntity(p.id);
                  drawAvatar(p.id, viewstate, entity);
                } else {
                  additional.push(nameof(entity[p.id]));
                }
              }
              if (ents.length > 4) {
                div({
                  class: 'moreuser'
                }, `+${ents.length - 3}`, {
                  title: additional.join('\n')
                });
              }
              if (ur > 0 && !conv.isQuiet(c)) {
                lbl = ur >= conv.MAX_UNREAD ? `${conv.MAX_UNREAD}+` : ur + '';
                span({
                  class: 'unreadcount'
                }, lbl);
              }
              if (ents.length === 1) {
                return div({
                  class: 'presence ' + ents[0].presence
                });
              }
            });
          } else {
            if (ur > 0 && !conv.isQuiet(c)) {
              lbl = ur >= conv.MAX_UNREAD ? `${conv.MAX_UNREAD}+` : ur + '';
              span({
                class: 'unreadcount'
              }, lbl);
            }
            if (ents.length === 1) {
              div({
                class: 'presence ' + ents[0].presence
              });
            }
          }
          if (!viewstate.showConvMin) {
            div({
              class: 'convinfos'
            }, function() {
              if (viewstate.showConvTime) {
                span({
                  class: 'lasttime'
                }, moment(conv.lastChanged(c)).calendar());
              }
              span({
                class: 'convname'
              }, name);
              if (viewstate.showConvLast) {
                return div({
                  class: 'lastmessage'
                }, function() {
                  var ref2;
                  return drawMessage(c != null ? (ref2 = c.event) != null ? ref2.slice(-1)[0] : void 0 : void 0, entity);
                });
              }
            });
          }
          return div({
            class: 'divider'
          });
        }, {
          onclick: function(ev) {
            ev.preventDefault();
            return action('selectConv', c);
          }
        });
      };
      starred = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = convs.length; j < len; j++) {
          c = convs[j];
          if (conv.isStarred(c)) {
            results.push(c);
          }
        }
        return results;
      })();
      others = (function() {
        var j, len, results;
        results = [];
        for (j = 0, len = convs.length; j < len; j++) {
          c = convs[j];
          if (!conv.isStarred(c)) {
            results.push(c);
          }
        }
        return results;
      })();
      div({
        class: 'starred'
      }, function() {
        if (starred.length > 0) {
          div({
            class: 'label'
          }, i18n.__n('favorite.title:Favorites', 2));
          return starred.forEach(renderConv);
        }
      });
      return div({
        class: 'others'
      }, function() {
        if (starred.length > 0) {
          div({
            class: 'label'
          }, i18n.__('recent:Recent'));
        }
        return others.forEach(renderConv);
      });
    });
  });

  // possible classes of messages
  MESSAGE_CLASSES = ['placeholder', 'chat_message', 'conversation_rename', 'membership_change'];

  drawMessage = function(e, entity) {
    var c, j, len, mclz, title;
    mclz = ['message'];
    for (j = 0, len = MESSAGE_CLASSES.length; j < len; j++) {
      c = MESSAGE_CLASSES[j];
      if (e[c] != null) {
        mclz.push(c);
      }
    }
    title = e.timestamp ? moment(e.timestamp / 1000).calendar() : null;
    return div({
      id: `list_${e.event_id}`,
      key: `list_${e.event_id}`,
      class: mclz.join(' '),
      title: title
    }, function() {
      var content, ents, names, ref, t;
      if (e.chat_message) {
        content = (ref = e.chat_message) != null ? ref.message_content : void 0;
        return format(content);
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
      }
    });
  };

  ifpass = function(t, f) {
    if (t) {
      return f;
    } else {
      return pass;
    }
  };

  format = function(cont) {
    var f, i, j, len, ref, ref1, ref2, seg;
    ref1 = (ref = cont != null ? cont.segment : void 0) != null ? ref : [];
    for (i = j = 0, len = ref1.length; j < len; i = ++j) {
      seg = ref1[i];
      if (cont.proxied && i < 1) {
        continue;
      }
      f = (ref2 = seg.formatting) != null ? ref2 : {};
      // these are links to images that we try loading
      // as images and show inline. (not attachments)
      ifpass(f.bold, b)(function() {
        return ifpass(f.italics, i)(function() {
          return ifpass(f.underline, u)(function() {
            return ifpass(f.strikethrough, s)(function() {
              // preload returns whether the image
              // has been loaded. redraw when it
              // loads.
              return pass(cont.proxied ? stripProxiedColon(seg.text) : seg.text);
            });
          });
        });
      });
    }
    return null;
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29udmxpc3QuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2NvbnZsaXN0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsZUFBQSxFQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsT0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUE7O0VBQUEsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztFQUNULENBQUEsQ0FBQyxNQUFELEVBQVMsVUFBVCxFQUFxQixVQUFyQixFQUFpQyxPQUFqQyxFQUEwQyxVQUExQyxDQUFBLEdBQXdELE9BQUEsQ0FBUSxTQUFSLENBQXhEOztFQUVBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLElBQUEsQ0FBSyxRQUFBLENBQUMsTUFBRCxDQUFBO0FBRXRCLFFBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUE7SUFBSSxDQUFBLENBQUMsSUFBRCxFQUFPLE1BQVAsRUFBZSxTQUFmLENBQUEsR0FBNEIsTUFBNUI7SUFDQSxHQUFBLEdBQU0sQ0FBQyxVQUFEO0lBQ04sSUFBNkIsU0FBUyxDQUFDLGNBQXZDO01BQUEsR0FBRyxDQUFDLElBQUosQ0FBUyxnQkFBVCxFQUFBOztJQUNBLElBQWlDLFNBQVMsQ0FBQyxrQkFBM0M7TUFBQSxHQUFHLENBQUMsSUFBSixDQUFTLG9CQUFULEVBQUE7O1dBQ0EsR0FBQSxDQUFJO01BQUEsS0FBQSxFQUFNLEdBQUcsQ0FBQyxJQUFKLENBQVMsR0FBVDtJQUFOLENBQUosRUFBeUIsUUFBQSxDQUFBLENBQUE7QUFDN0IsVUFBQSxDQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7TUFBUSxJQUFHLENBQUMsU0FBUyxDQUFDLG1CQUFkO1FBQ0ksTUFBTSxDQUFDLE1BQVAsQ0FBYyxJQUFJLENBQUMsU0FBTCxDQUFBLENBQWQsRUFESjtPQUFBLE1BQUE7UUFHSSxNQUFNLENBQUMsTUFB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bml0aWFsc29mLCBuYW1lb2Zjb252LCBmaXhsaW5rLCBkcmF3QXZhdGFyfSA9IHJlcXVpcmUgJy4uL3V0aWwnXG5cbm1vZHVsZS5leHBvcnRzID0gdmlldyAobW9kZWxzKSAtPlxuXG4gICAge2NvbnYsIGVudGl0eSwgdmlld3N0YXRlfSA9IG1vZGVsc1xuICAgIGNseiA9IFsnY29udmxpc3QnXVxuICAgIGNsei5wdXNoICdzaG93Y29udnRodW1icycgaWYgdmlld3N0YXRlLnNob3dDb252VGh1bWJzXG4gICAgY2x6LnB1c2ggJ3Nob3dhbmltYXRlZHRodW1icycgaWYgdmlld3N0YXRlLnNob3dBbmltYXRlZFRodW1ic1xuICAgIGRpdiBjbGFzczpjbHouam9pbignICcpLCAtPlxuICAgICAgICBpZiAhdmlld3N0YXRlLnVzZVN5c3RlbURhdGVGb3JtYXRcbiAgICAgICAgICAgIG1vbWVudC5sb2NhbGUoaTE4bi5nZXRMb2NhbGUoKSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgbW9tZW50LmxvY2FsZSh3aW5kb3cubmF2aWdhdG9yLmxhbmd1YWdlKVxuICAgICAgICBjb252cyA9IGNvbnYubGlzdCgpXG4gICAgICAgIHJlbmRlckNvbnYgPSAoYykgLT5cbiAgICAgICAgICAgIHJldHVybiBpZiBjPy5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZS52aWV3WzBdID09ICdBUkNISVZFRF9WSUVXJ1xuICAgICAgICAgICAgI8KgcmVtb3ZlIGVtb2ppIHN1Z2dlc3Rpb25zIG9uIHJlbmRlckNvbnZcbiAgICAgICAgICAgIGlmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpLmxlbmd0aFxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpWzBdLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmVtb2ppLXN1Z2ctY29udGFpbmVyJylbMF0pXG4gICAgICAgICAgICBwdXJlSGFuZyA9IGNvbnYuaXNQdXJlSGFuZ291dChjKVxuICAgICAgICAgICAgbGFzdENoYW5nZWQgPSBjb252Lmxhc3RDaGFuZ2VkKGMpXG4gICAgICAgICAgICAjIGRvbid0IGxpc3QgcHVyZSBoYW5nb3V0cyB0aGF0IGFyZSBvbGRlciB0aGFuIDI0aFxuICAgICAgICAgICAgcmV0dXJuIGlmIHB1cmVIYW5nIGFuZCAoRGF0ZS5ub3coKSAtIGxhc3RDaGFuZ2VkKSA+IDI0ICogNjAgKiA2MCAqIDEwMDBcbiAgICAgICAgICAgIGNpZCA9IGM/LmNvbnZlcnNhdGlvbl9pZD8uaWRcbiAgICAgICAgICAgIHVyID0gY29udi51bnJlYWQgY1xuICAgICAgICAgICAgY2x6ID0gWydjb252J11cbiAgICAgICAgICAgIGNsei5wdXNoIFwidHlwZV8je2MudHlwZX1cIlxuICAgICAgICAgICAgY2x6LnB1c2ggXCJzZWxlY3RlZFwiIGlmIG1vZGVscy52aWV3c3RhdGUuc2VsZWN0ZWRDb252ID09IGNpZFxuICAgICAgICAgICAgY2x6LnB1c2ggXCJ1bnJlYWRcIiBpZiB1clxuICAgICAgICAgICAgY2x6LnB1c2ggXCJwdXJlaGFuZ1wiIGlmIHB1cmVIYW5nXG4gICAgICAgICAgICBkaXYga2V5OmNpZCwgY2xhc3M6Y2x6LmpvaW4oJyAnKSwgXCJkYXRhLWlkXCI6IGNpZCwgLT5cbiAgICAgICAgICAgICAgICBwYXJ0ID0gYz8uY3VycmVudF9wYXJ0aWNpcGFudCA/IFtdXG4gICAgICAgICAgICAgICAgZW50cyA9IGZvciBwIGluIHBhcnQgd2hlbiBub3QgZW50aXR5LmlzU2VsZiBwLmNoYXRfaWRcbiAgICAgICAgICAgICAgICAgICAgZW50aXR5W3AuY2hhdF9pZF1cbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZW9mY29udiBjXG4gICAgICAgICAgICAgICAgaWYgdmlld3N0YXRlLnNob3dDb252VGh1bWJzIG9yIHZpZXdzdGF0ZS5zaG93Q29udk1pblxuICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6ICd0aHVtYnMgdGh1bWJzLScrKGlmIGVudHMubGVuZ3RoPjQgdGhlbiAnNCcgZWxzZSBlbnRzLmxlbmd0aCksIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsID0gW11cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciBwLCBpbmRleCBpbiBlbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyBpZiB0aGVyZSBhcmUgdXAgdG8gNCBwZW9wbGUgaW4gdGhlIGNvbnZlcnNhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgICB0aGVuIGRyYXcgdGhlbSBhbGwsIG90aGVyd2lzZSwgZHJhdyAzIGF2YXRhcnNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjICAgYW5kIHRoZW4gYWRkIGEgK1ggLCB3aGVyZSBYIGlzIHRoZSByZW1haW5pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjICAgbnVtYmVyIG9mIHBlb3BsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGluZGV4IDwgMyB8fCAgZW50cy5sZW5ndGggPT0gNFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkubmVlZEVudGl0eShwLmlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3QXZhdGFyKHAuaWQsIHZpZXdzdGF0ZSwgZW50aXR5KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbC5wdXNoIG5hbWVvZiBlbnRpdHlbcC5pZF1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIGVudHMubGVuZ3RoID4gNFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpdiBjbGFzczonbW9yZXVzZXInLCBcIisje2VudHMubGVuZ3RoIC0gM31cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICwgdGl0bGU6IGFkZGl0aW9uYWwuam9pbignXFxuJylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIHVyID4gMCBhbmQgbm90IGNvbnYuaXNRdWlldChjKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxibCA9IGlmIHVyID49IGNvbnYuTUFYX1VOUkVBRCB0aGVuIFwiI3tjb252Lk1BWF9VTlJFQUR9K1wiIGVsc2UgdXIgKyAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J3VucmVhZGNvdW50JywgbGJsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBlbnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGl2IGNsYXNzOidwcmVzZW5jZSAnK2VudHNbMF0ucHJlc2VuY2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIGlmIHVyID4gMCBhbmQgbm90IGNvbnYuaXNRdWlldChjKVxuICAgICAgICAgICAgICAgICAgICAgICAgbGJsID0gaWYgdXIgPj0gY29udi5NQVhfVU5SRUFEIHRoZW4gXCIje2NvbnYuTUFYX1VOUkVBRH0rXCIgZWxzZSB1ciArICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOid1bnJlYWRjb3VudCcsIGxibFxuICAgICAgICAgICAgICAgICAgICBpZiBlbnRzLmxlbmd0aCA9PSAxXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6J3ByZXNlbmNlICcrZW50c1swXS5wcmVzZW5jZVxuICAgICAgICAgICAgICAgIHVubGVzcyB2aWV3c3RhdGUuc2hvd0NvbnZNaW5cbiAgICAgICAgICAgICAgICAgICAgZGl2IGNsYXNzOidjb252aW5mb3MnLCAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgdmlld3N0YXRlLnNob3dDb252VGltZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J2xhc3R0aW1lJywgbW9tZW50KGNvbnYubGFzdENoYW5nZWQoYykpLmNhbGVuZGFyKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J2NvbnZuYW1lJywgbmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgdmlld3N0YXRlLnNob3dDb252TGFzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpdiBjbGFzczonbGFzdG1lc3NhZ2UnLCAtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkcmF3TWVzc2FnZShjPy5ldmVudD8uc2xpY2UoLTEpWzBdLCBlbnRpdHkpXG4gICAgICAgICAgICAgICAgZGl2IGNsYXNzOidkaXZpZGVyJ1xuICAgICAgICAgICAgLCBvbmNsaWNrOiAoZXYpIC0+XG4gICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICAgIGFjdGlvbiAnc2VsZWN0Q29udicsIGNcblxuICAgICAgICBzdGFycmVkID0gKGMgZm9yIGMgaW4gY29udnMgd2hlbiBjb252LmlzU3RhcnJlZChjKSlcbiAgICAgICAgb3RoZXJzID0gKGMgZm9yIGMgaW4gY29udnMgd2hlbiBub3QgY29udi5pc1N0YXJyZWQoYykpXG4gICAgICAgIGRpdiBjbGFzczogJ3N0YXJyZWQnLCAtPlxuICAgICAgICAgICAgaWYgc3RhcnJlZC5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgZGl2IGNsYXNzOiAnbGFiZWwnLCBpMThuLl9fbignZmF2b3JpdGUudGl0bGU6RmF2b3JpdGVzJywgMilcbiAgICAgICAgICAgICAgICBzdGFycmVkLmZvckVhY2ggcmVuZGVyQ29udlxuICAgICAgICBkaXYgY2xhc3M6ICdvdGhlcnMnLCAtPlxuICAgICAgICAgICAgaWYgc3RhcnJlZC5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgZGl2IGNsYXNzOiAnbGFiZWwnLCBpMThuLl9fICdyZWNlbnQ6UmVjZW50J1xuICAgICAgICAgICAgb3RoZXJzLmZvckVhY2ggcmVuZGVyQ29udlxuXG4jIHBvc3NpYmxlIGNsYXNzZXMgb2YgbWVzc2FnZXNcbk1FU1NBR0VfQ0xBU1NFUyA9IFsncGxhY2Vob2xkZXInLCAnY2hhdF9tZXNzYWdlJyxcbidjb252ZXJzYXRpb25fcmVuYW1lJywgJ21lbWJlcnNoaXBfY2hhbmdlJ11cblxuZHJhd01lc3NhZ2UgPSAoZSwgZW50aXR5KSAtPlxuICAgIG1jbHogPSBbJ21lc3NhZ2UnXVxuICAgIG1jbHoucHVzaCBjIGZvciBjIGluIE1FU1NBR0VfQ0xBU1NFUyB3aGVuIGVbY10/XG4gICAgdGl0bGUgPSBpZiBlLnRpbWVzdGFtcCB0aGVuIG1vbWVudChlLnRpbWVzdGFtcCAvIDEwMDApLmNhbGVuZGFyKCkgZWxzZSBudWxsXG4gICAgZGl2IGlkOlwibGlzdF8je2UuZXZlbnRfaWR9XCIsIGtleTpcImxpc3RfI3tlLmV2ZW50X2lkfVwiLCBjbGFzczptY2x6LmpvaW4oJyAnKSwgdGl0bGU6dGl0bGUsIC0+XG4gICAgICAgIGlmIGUuY2hhdF9tZXNzYWdlXG4gICAgICAgICAgICBjb250ZW50ID0gZS5jaGF0X21lc3NhZ2U/Lm1lc3NhZ2VfY29udGVudFxuICAgICAgICAgICAgZm9ybWF0IGNvbnRlbnRcbiAgICAgICAgZWxzZSBpZiBlLmNvbnZlcnNhdGlvbl9yZW5hbWVcbiAgICAgICAgICAgIHBhc3MgXCJyZW5hbWVkIGNvbnZlcnNhdGlvbiB0byAje2UuY29udmVyc2F0aW9uX3JlbmFtZS5uZXdfbmFtZX1cIlxuICAgICAgICAgICAgIyB7bmV3X25hbWU6IFwibGFiYm90XCIgb2xkX25hbWU6IFwiXCJ9XG4gICAgICAgIGVsc2UgaWYgZS5tZW1iZXJzaGlwX2NoYW5nZVxuICAgICAgICAgICAgdCA9IGUubWVtYmVyc2hpcF9jaGFuZ2UudHlwZVxuICAgICAgICAgICAgZW50cyA9IGUubWVtYmVyc2hpcF9jaGFuZ2UucGFydGljaXBhbnRfaWRzLm1hcCAocCkgLT4gZW50aXR5W3AuY2hhdF9pZF1cbiAgICAgICAgICAgIG5hbWVzID0gZW50cy5tYXAobmFtZW9mKS5qb2luKCcsICcpXG4gICAgICAgICAgICBpZiB0ID09ICdKT0lOJ1xuICAgICAgICAgICAgICAgIHBhc3MgXCJpbnZpdGVkICN7bmFtZXN9XCJcbiAgICAgICAgICAgIGVsc2UgaWYgdCA9PSAnTEVBVkUnXG4gICAgICAgICAgICAgICAgcGFzcyBcIiN7bmFtZXN9IGxlZnQgdGhlIGNvbnZlcnNhdGlvblwiXG5cbmlmcGFzcyA9ICh0LCBmKSAtPiBpZiB0IHRoZW4gZiBlbHNlIHBhc3NcblxuZm9ybWF0ID0gKGNvbnQpIC0+XG4gICAgZm9yIHNlZywgaSBpbiBjb250Py5zZWdtZW50ID8gW11cbiAgICAgICAgY29udGludWUgaWYgY29udC5wcm94aWVkIGFuZCBpIDwgMVxuICAgICAgICBmID0gc2VnLmZvcm1hdHRpbmcgPyB7fVxuICAgICAgICAjIHRoZXNlIGFyZSBsaW5rcyB0byBpbWFnZXMgdGhhdCB3ZSB0cnkgbG9hZGluZ1xuICAgICAgICAgIyBhcyBpbWFnZXMgYW5kIHNob3cgaW5saW5lLiAobm90IGF0dGFjaG1lbnRzKVxuICAgICAgICBpZnBhc3MoZi5ib2xkLCBiKSAtPlxuICAgICAgICAgICAgaWZwYXNzKGYuaXRhbGljcywgaSkgLT5cbiAgICAgICAgICAgICAgICBpZnBhc3MoZi51bmRlcmxpbmUsIHUpIC0+XG4gICAgICAgICAgICAgICAgICAgIGlmcGFzcyhmLnN0cmlrZXRocm91Z2gsIHMpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAjIHByZWxvYWQgcmV0dXJucyB3aGV0aGVyIHRoZSBpbWFnZVxuICAgICAgICAgICAgICAgICAgICAgICAgIyBoYXMgYmVlbiBsb2FkZWQuIHJlZHJhdyB3aGVuIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAjIGxvYWRzLlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFzcyBpZiBjb250LnByb3hpZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpcFByb3hpZWRDb2xvbiBzZWcudGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZy50ZXh0XG4gICAgbnVsbFxuIl19
