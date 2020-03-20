(function() {
  var chilledaction, drawAvatar, fixlink, initialsof, inputSetValue, mayRestoreInitialValues, nameof, onclickaction, throttle, unique,
    indexOf = [].indexOf;

  ({initialsof, throttle, nameof, fixlink, drawAvatar} = require('../util'));

  chilledaction = throttle(1500, action);

  unique = function(obj) {
    return obj.id.chat_id || obj.id.gaia_id;
  };

  mayRestoreInitialValues = function(models) {
    var convsettings, initialName, initialSearchQuery;
    // If there is an initial value we set it an then invalidate it
    ({convsettings} = models);
    initialName = convsettings.getInitialName();
    if (initialName !== null) {
      setTimeout(function() {
        var name;
        name = document.querySelector('.name-input');
        if (name) {
          return name.value = initialName;
        }
      }, 1);
    }
    initialSearchQuery = convsettings.getInitialSearchQuery();
    if (initialSearchQuery !== null) {
      setTimeout(function() {
        var search;
        search = document.querySelector('.search-input');
        if (search) {
          return search.value = initialSearchQuery;
        }
      }, 1);
    }
    setTimeout(function() {
      var group;
      group = document.querySelector('.group');
      if (group) {
        return group.checked = convsettings.group;
      }
    });
    return null;
  };

  inputSetValue = function(sel, val) {
    setTimeout(function() {
      var el;
      el = document.querySelector(sel);
      if (el !== null) {
        return el.value = val;
      }
    }, 1);
    return null;
  };

  module.exports = view(function(models) {
    var conv, conversation, convsettings, editing, entity, viewstate;
    ({viewstate, convsettings, entity, conv} = models);
    editing = convsettings.id !== null;
    conversation = conv[viewstate.selectedConv];
    return div({
      class: 'convadd'
    }, function() {
      var style;
      if (editing) {
        h1(i18n.__('conversation.edit:Conversation edit'));
      } else {
        h1(i18n.__('conversation.new:New conversation'));
      }
      style = {};
      if (!convsettings.group) {
        style = {
          display: 'none'
        };
      }
      div({
        class: 'input'
      }, {style}, function() {
        return div(function() {
          return input({
            class: 'name-input',
            style: style,
            placeholder: i18n.__('conversation.name:Conversation name'),
            onkeyup: function(e) {
              return action('conversationname', e.currentTarget.value);
            }
          });
        });
      });
      div({
        class: 'input'
      }, function() {
        return div(function() {
          return input({
            class: 'search-input',
            placeholder: i18n.__('conversation.search:Search people'),
            onkeyup: function(e) {
              chilledaction('searchentities', e.currentTarget.value, 7);
              return action('conversationquery', e.currentTarget.value, 7);
            }
          });
        });
      });
      div({
        class: 'input'
      }, function() {
        return div(function() {
          return p(function() {
            var opts;
            opts = {
              type: 'checkbox',
              class: 'group',
              style: {
                width: 'auto',
                'margin-right': '5px'
              },
              onchange: function(e) {
                return action('togglegroup');
              }
            };
            if (convsettings.selectedEntities.length !== 1) {
              opts.disabled = 'disabled';
            }
            input(opts);
            return i18n.__('conversation.multiuser:Create multiuser chat');
          });
        });
      });
      ul(function() {
        var c, selected_ids;
        convsettings.selectedEntities.forEach(function(r) {
          var cid, ctInfo, ctLocal, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref15, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
          cid = r != null ? (ref = r.id) != null ? ref.chat_id : void 0 : void 0;
          ctLocal = '';
          ctInfo = '';
          console.log('meme', r.properties, entity[cid]);
          if (((ref1 = entity[cid]) != null ? ref1.type : void 0) === 0) {
            ctLocal = 'ct-local';
            ctInfo = 'Internal Contact' + "\r\n";
          }
          if ((ref2 = (ref3 = r.properties) != null ? (ref4 = ref3.emails) != null ? ref4[0] : void 0 : void 0) != null ? ref2 : (ref5 = entity[cid]) != null ? (ref6 = ref5.emails) != null ? ref6[0] : void 0 : void 0) {
            ctInfo += ((ref7 = (ref8 = r.properties) != null ? (ref9 = ref8.emails) != null ? ref9[0] : void 0 : void 0) != null ? ref7 : (ref10 = entity[cid]) != null ? (ref11 = ref10.emails) != null ? ref11.join("\r\n") : void 0 : void 0) + "\r\n";
          }
          if ((ref12 = r.properties) != null ? ref12.organization : void 0) {
            ctInfo += ((ref13 = r.properties) != null ? ref13.organization : void 0) + "\r\n";
          }
          if ((ref14 = r.properties) != null ? ref14.location : void 0) {
            ctInfo += ((ref15 = r.properties) != null ? ref15.location : void 0) + "\r\n";
          }
          return li({
            title: ctInfo,
            class: ctLocal + ' selected'
          }, function() {
            var ref16, ref17, ref18;
            drawAvatar(cid, viewstate, entity, (ref16 = (ref17 = r.properties) != null ? ref17.photo_url : void 0) != null ? ref16 : (ref18 = entity[cid]) != null ? ref18.photo_url : void 0, ctInfo, (r.properties != null ? initialsof(r.properties != null) : void 0));
            return p(nameof(r.properties));
          }, {
            onclick: function(e) {
              if (!editing) {
                return action('deselectentity', r);
              }
            }
          });
        });
        selected_ids = (function() {
          var i, len, ref, results;
          ref = convsettings.selectedEntities;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            c = ref[i];
            results.push(unique(c));
          }
          return results;
        })();
        return convsettings.searchedEntities.forEach(function(r) {
          var cid, ctInfo, ctLocal, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref15, ref16, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
          cid = r != null ? (ref = r.id) != null ? ref.chat_id : void 0 : void 0;
          ctLocal = '';
          ctInfo = '';
          if (((ref1 = entity[cid]) != null ? ref1.type : void 0) === 0) {
            ctLocal = 'ct-local';
            ctInfo = 'Internal Contact' + "\r\n";
          }
          if ((ref2 = (ref3 = r.properties) != null ? (ref4 = ref3.emails) != null ? ref4[0] : void 0 : void 0) != null ? ref2 : (ref5 = entity[cid]) != null ? (ref6 = ref5.emails) != null ? ref6[0] : void 0 : void 0) {
            ctInfo += ((ref7 = (ref8 = r.properties) != null ? (ref9 = ref8.emails) != null ? ref9[0] : void 0 : void 0) != null ? ref7 : (ref10 = entity[cid]) != null ? (ref11 = ref10.emails) != null ? ref11.join("\r\n") : void 0 : void 0) + "\r\n";
          }
          if ((ref12 = r.properties) != null ? ref12.organization : void 0) {
            ctInfo += ((ref13 = r.properties) != null ? ref13.organization : void 0) + "\r\n";
          }
          if ((ref14 = r.properties) != null ? ref14.location : void 0) {
            ctInfo += ((ref15 = r.properties) != null ? ref15.location : void 0) + "\r\n";
          }
          if (ref16 = unique(r), indexOf.call(selected_ids, ref16) >= 0) {
            return;
          }
          return li({
            title: ctInfo,
            class: ctLocal
          }, function() {
            var ref17, ref18, ref19;
            drawAvatar(cid, viewstate, entity, (ref17 = (ref18 = r.properties) != null ? ref18.photo_url : void 0) != null ? ref17 : (ref19 = entity[cid]) != null ? ref19.photo_url : void 0, ctInfo, (r.properties != null ? initialsof(r.properties != null) : void 0));
            return p(nameof(r.properties));
          }, {
            onclick: function(e) {
              return action('selectentity', r);
            }
          });
        });
      });
      if (editing) {
        div({
          class: 'leave'
        }, function() {
          var ref;
          if ((conversation != null ? (ref = conversation.type) != null ? ref.indexOf('ONE_TO_ONE') : void 0 : void 0) > 0) {
            return div({
              class: 'button',
              title: i18n.__('conversation.delete:Delete conversation'),
              onclick: onclickaction('deleteconv')
            }, function() {
              span({
                class: 'material-icons'
              }, 'close');
              return span(i18n.__('conversation.delete:Delete conversation'));
            });
          } else {
            return div({
              class: 'button',
              title: i18n.__('conversation.leave:Leave conversation'),
              onclick: onclickaction('leaveconv')
            }, function() {
              span({
                class: 'material-icons'
              }, 'close');
              return span(i18n.__('conversation.leave:Leave conversation'));
            });
          }
        });
      }
      div({
        class: 'validate'
      }, function() {
        var disabled;
        disabled = null;
        if (convsettings.selectedEntities.length <= 0) {
          disabled = {
            disabled: 'disabled'
          };
        }
        return div(disabled, {
          class: 'button',
          onclick: onclickaction('saveconversation')
        }, function() {
          span({
            class: 'material-icons'
          }, 'done');
          return span(i18n.__("actions.ok:OK"));
        });
      });
      return mayRestoreInitialValues(models);
    });
  });

  onclickaction = function(a) {
    return function(ev) {
      return action(a);
    };
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29udmFkZC5qcyIsInNvdXJjZXMiOlsidWkvdmlld3MvY29udmFkZC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7QUFBQSxNQUFBLGFBQUEsRUFBQSxVQUFBLEVBQUEsT0FBQSxFQUFBLFVBQUEsRUFBQSxhQUFBLEVBQUEsdUJBQUEsRUFBQSxNQUFBLEVBQUEsYUFBQSxFQUFBLFFBQUEsRUFBQSxNQUFBO0lBQUE7O0VBQUEsQ0FBQSxDQUFDLFVBQUQsRUFBYSxRQUFiLEVBQXVCLE1BQXZCLEVBQStCLE9BQS9CLEVBQXdDLFVBQXhDLENBQUEsR0FBc0QsT0FBQSxDQUFRLFNBQVIsQ0FBdEQ7O0VBQ0EsYUFBQSxHQUFnQixRQUFBLENBQVMsSUFBVCxFQUFlLE1BQWY7O0VBRWhCLE1BQUEsR0FBUyxRQUFBLENBQUMsR0FBRCxDQUFBO1dBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFQLElBQWtCLEdBQUcsQ0FBQyxFQUFFLENBQUM7RUFBbEM7O0VBRVQsdUJBQUEsR0FBMEIsUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUMxQixRQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUEsa0JBQUE7O0lBQ0ksQ0FBQSxDQUFDLFlBQUQsQ0FBQSxHQUFpQixNQUFqQjtJQUNBLFdBQUEsR0FBYyxZQUFZLENBQUMsY0FBYixDQUFBO0lBQ2QsSUFBRyxXQUFBLEtBQWUsSUFBbEI7TUFDSSxVQUFBLENBQVcsUUFBQSxDQUFBLENBQUE7QUFDbkIsWUFBQTtRQUFZLElBQUEsR0FBTyxRQUFRLENBQUMsYUFBVCxDQUF1QixhQUF2QjtRQUNQLElBQTRCLElBQTVCO2lCQUFBLElBQUksQ0FBQyxLQUFMLEdBQWEsWUFBYjs7TUFGTyxDQUFYLEVBR0UsQ0FIRixFQURKOztJQUtBLGtCQUFBLEdBQXFCLFlBQVksQ0FBQyxxQkFBYixDQUFBO0lBQ3JCLElBQUcsa0JBQUEsS0FBc0IsSUFBekI7TUFDSSxVQUFBLENBQVcsUUFBQSxDQUFBLENBQUE7QUFDbkIsWUFBQTtR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QUNYLElBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLE1BQTlCLElBQXdDLENBQTNDO1VBQ0ksUUFBQSxHQUFZO1lBQUEsUUFBQSxFQUFVO1VBQVYsRUFEaEI7O2VBRUEsR0FBQSxDQUFJLFFBQUosRUFBYztVQUFBLEtBQUEsRUFBTSxRQUFOO1VBQ1osT0FBQSxFQUFRLGFBQUEsQ0FBYyxrQkFBZDtRQURJLENBQWQsRUFDNkMsUUFBQSxDQUFBLENBQUE7VUFDekMsSUFBQSxDQUFLO1lBQUEsS0FBQSxFQUFNO1VBQU4sQ0FBTCxFQUE2QixNQUE3QjtpQkFDQSxJQUFBLENBQUssSUFBSSxDQUFDLEVBQUwsQ0FBUSxlQUFSLENBQUw7UUFGeUMsQ0FEN0M7TUFKa0IsQ0FBdEI7YUFTQSx1QkFBQSxDQUF3QixNQUF4QjtJQWpIa0IsQ0FBdEI7RUFOa0IsQ0FBTDs7RUF5SGpCLGFBQUEsR0FBZ0IsUUFBQSxDQUFDLENBQUQsQ0FBQTtXQUFPLFFBQUEsQ0FBQyxFQUFELENBQUE7YUFBUSxNQUFBLENBQU8sQ0FBUDtJQUFSO0VBQVA7QUF6SmhCIiwic291cmNlc0NvbnRlbnQiOlsiXG57aW5pdGlhbHNvZiwgdGhyb3R0bGUsIG5hbWVvZiwgZml4bGluaywgZHJhd0F2YXRhcn0gPSByZXF1aXJlICcuLi91dGlsJ1xuY2hpbGxlZGFjdGlvbiA9IHRocm90dGxlIDE1MDAsIGFjdGlvblxuXG51bmlxdWUgPSAob2JqKSAtPiBvYmouaWQuY2hhdF9pZCBvciBvYmouaWQuZ2FpYV9pZFxuXG5tYXlSZXN0b3JlSW5pdGlhbFZhbHVlcyA9IChtb2RlbHMpIC0+XG4gICAgIyBJZiB0aGVyZSBpcyBhbiBpbml0aWFsIHZhbHVlIHdlIHNldCBpdCBhbiB0aGVuIGludmFsaWRhdGUgaXRcbiAgICB7Y29udnNldHRpbmdzfSA9IG1vZGVsc1xuICAgIGluaXRpYWxOYW1lID0gY29udnNldHRpbmdzLmdldEluaXRpYWxOYW1lKClcbiAgICBpZiBpbml0aWFsTmFtZSAhPSBudWxsXG4gICAgICAgIHNldFRpbWVvdXQgLT5cbiAgICAgICAgICAgIG5hbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yICcubmFtZS1pbnB1dCdcbiAgICAgICAgICAgIG5hbWUudmFsdWUgPSBpbml0aWFsTmFtZSBpZiBuYW1lXG4gICAgICAgICwgMVxuICAgIGluaXRpYWxTZWFyY2hRdWVyeSA9IGNvbnZzZXR0aW5ncy5nZXRJbml0aWFsU2VhcmNoUXVlcnkoKVxuICAgIGlmIGluaXRpYWxTZWFyY2hRdWVyeSAhPSBudWxsXG4gICAgICAgIHNldFRpbWVvdXQgLT5cbiAgICAgICAgICAgIHNlYXJjaCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IgJy5zZWFyY2gtaW5wdXQnXG4gICAgICAgICAgICBzZWFyY2gudmFsdWUgPSBpbml0aWFsU2VhcmNoUXVlcnkgaWYgc2VhcmNoXG4gICAgICAgICwgMVxuICAgIHNldFRpbWVvdXQgLT5cbiAgICAgICAgZ3JvdXAgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yICcuZ3JvdXAnXG4gICAgICAgIGdyb3VwLmNoZWNrZWQgPSBjb252c2V0dGluZ3MuZ3JvdXAgaWYgZ3JvdXBcbiAgICBudWxsXG5cbmlucHV0U2V0VmFsdWUgPSAoc2VsLCB2YWwpIC0+XG4gICAgc2V0VGltZW91dCAtPlxuICAgICAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Igc2VsXG4gICAgICAgIGVsLnZhbHVlID0gdmFsIGlmIGVsICE9IG51bGxcbiAgICAsIDFcbiAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gdmlldyAobW9kZWxzKSAtPlxuICAgIHt2aWV3c3RhdGUsIGNvbnZzZXR0aW5ncywgZW50aXR5LCBjb252fSA9IG1vZGVsc1xuXG4gICAgZWRpdGluZyA9IGNvbnZzZXR0aW5ncy5pZCAhPSBudWxsXG4gICAgY29udmVyc2F0aW9uID0gY29udlt2aWV3c3RhdGUuc2VsZWN0ZWRDb252XVxuXG4gICAgZGl2IGNsYXNzOiAnY29udmFkZCcsIC0+XG4gICAgICAgIGlmIGVkaXRpbmdcbiAgICAgICAgICAgIGgxIGkxOG4uX18gJ2NvbnZlcnNhdGlvbi5lZGl0OkNvbnZlcnNhdGlvbiBlZGl0J1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBoMSBpMThuLl9fICdjb252ZXJzYXRpb24ubmV3Ok5ldyBjb252ZXJzYXRpb24nXG5cbiAgICAgICAgc3R5bGUgPSB7fVxuICAgICAgICBpZiBub3QgY29udnNldHRpbmdzLmdyb3VwXG4gICAgICAgICAgICBzdHlsZSA9IGRpc3BsYXk6ICdub25lJ1xuXG4gICAgICAgIGRpdiBjbGFzczogJ2lucHV0Jywge3N0eWxlfSwgLT5cbiAgICAgICAgICAgIGRpdiAtPlxuICAgICAgICAgICAgICAgIGlucHV0XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzOiAnbmFtZS1pbnB1dCdcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHN0eWxlXG4gICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBpMThuLl9fICdjb252ZXJzYXRpb24ubmFtZTpDb252ZXJzYXRpb24gbmFtZSdcbiAgICAgICAgICAgICAgICAgICAgb25rZXl1cDogKGUpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb24gJ2NvbnZlcnNhdGlvbm5hbWUnLCBlLmN1cnJlbnRUYXJnZXQudmFsdWVcblxuICAgICAgICBkaXYgY2xhc3M6ICdpbnB1dCcsIC0+XG4gICAgICAgICAgICBkaXYgLT5cbiAgICAgICAgICAgICAgICBpbnB1dFxuICAgICAgICAgICAgICAgICAgICBjbGFzczogJ3NlYXJjaC1pbnB1dCdcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGkxOG4uX18gJ2NvbnZlcnNhdGlvbi5zZWFyY2g6U2VhcmNoIHBlb3BsZSdcbiAgICAgICAgICAgICAgICAgICAgb25rZXl1cDogKGUpIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsbGVkYWN0aW9uICdzZWFyY2hlbnRpdGllcycsIGUuY3VycmVudFRhcmdldC52YWx1ZSwgN1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICdjb252ZXJzYXRpb25xdWVyeScsIGUuY3VycmVudFRhcmdldC52YWx1ZSwgN1xuXG4gICAgICAgIGRpdiBjbGFzczogJ2lucHV0JywgLT5cbiAgICAgICAgICAgIGRpdiAtPlxuICAgICAgICAgICAgICAgIHAgLT5cbiAgICAgICAgICAgICAgICAgICAgb3B0cyA9XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzczogJ2dyb3VwJ1xuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU6IHsgd2lkdGg6ICdhdXRvJywgJ21hcmdpbi1yaWdodCc6ICc1cHgnIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlOiAoZSkgLT4gYWN0aW9uICAgJ3RvZ2dsZWdyb3VwJ1xuICAgICAgICAgICAgICAgICAgICBpZiBjb252c2V0dGluZ3Muc2VsZWN0ZWRFbnRpdGllcy5sZW5ndGggIT0gMVxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5kaXNhYmxlZCA9ICdkaXNhYmxlZCdcbiAgICAgICAgICAgICAgICAgICAgaW5wdXQgb3B0c1xuICAgICAgICAgICAgICAgICAgICBpMThuLl9fICdjb252ZXJzYXRpb24ubXVsdGl1c2VyOkNyZWF0ZSBtdWx0aXVzZXIgY2hhdCdcblxuXG4gICAgICAgIHVsIC0+XG4gICAgICAgICAgICBjb252c2V0dGluZ3Muc2VsZWN0ZWRFbnRpdGllcy5mb3JFYWNoIChyKSAtPlxuICAgICAgICAgICAgICAgIGNpZCA9IHI/LmlkPy5jaGF0X2lkXG4gICAgICAgICAgICAgICAgY3RMb2NhbCA9ICcnXG4gICAgICAgICAgICAgICAgY3RJbmZvID0gJydcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbWVtZScsIHIucHJvcGVydGllcywgZW50aXR5W2NpZF0pXG4gICAgICAgICAgICAgICAgaWYgZW50aXR5W2NpZF0/LnR5cGUgPT0gMFxuICAgICAgICAgICAgICAgICAgICBjdExvY2FsID0gJ2N0LWxvY2FsJ1xuICAgICAgICAgICAgICAgICAgICBjdEluZm8gPSAnSW50ZXJuYWwgQ29udGFjdCcgKyBcIlxcclxcblwiXG4gICAgICAgICAgICAgICAgaWYgKHIucHJvcGVydGllcz8uZW1haWxzP1swXSA/IGVudGl0eVtjaWRdPy5lbWFpbHM/WzBdKVxuICAgICAgICAgICAgICAgICAgICBjdEluZm8gKz0gKHIucHJvcGVydGllcz8uZW1haWxzP1swXSA/IGVudGl0eVtjaWRdPy5lbWFpbHM/LmpvaW4oXCJcXHJcXG5cIikpICsgXCJcXHJcXG5cIlxuICAgICAgICAgICAgICAgIGlmIHIucHJvcGVydGllcz8ub3JnYW5pemF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGN0SW5mbyArPSByLnByb3BlcnRpZXM/Lm9yZ2FuaXphdGlvbiArIFwiXFxyXFxuXCJcbiAgICAgICAgICAgICAgICBpZiByLnByb3BlcnRpZXM/LmxvY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGN0SW5mbyArPSByLnByb3BlcnRpZXM/LmxvY2F0aW9uICsgXCJcXHJcXG5cIlxuICAgICAgICAgICAgICAgIGxpIHRpdGxlOmN0SW5mbywgY2xhc3M6IGN0TG9jYWwgKyAnIHNlbGVjdGVkJywgLT5cbiAgICAgICAgICAgICAgICAgICAgZHJhd0F2YXRhciBjaWQsIHZpZXdzdGF0ZSwgZW50aXR5XG4gICAgICAgICAgICAgICAgICAgICwgKHIucHJvcGVydGllcz8ucGhvdG9fdXJsID8gZW50aXR5W2NpZF0/LnBob3RvX3VybClcbiAgICAgICAgICAgICAgICAgICAgLCBjdEluZm9cbiAgICAgICAgICAgICAgICAgICAgLCAoaWYgci5wcm9wZXJ0aWVzPyB0aGVuIGluaXRpYWxzb2Ygci5wcm9wZXJ0aWVzPylcbiAgICAgICAgICAgICAgICAgICAgcCBuYW1lb2Ygci5wcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgLCBvbmNsaWNrOihlKSAtPiBpZiBub3QgZWRpdGluZyB0aGVuIGFjdGlvbiAnZGVzZWxlY3RlbnRpdHknLCByXG5cbiAgICAgICAgICAgIHNlbGVjdGVkX2lkcyA9ICh1bmlxdWUoYykgZm9yIGMgaW4gY29udnNldHRpbmdzLnNlbGVjdGVkRW50aXRpZXMpXG5cbiAgICAgICAgICAgIGNvbnZzZXR0aW5ncy5zZWFyY2hlZEVudGl0aWVzLmZvckVhY2ggKHIpIC0+XG4gICAgICAgICAgICAgICAgY2lkID0gcj8uaWQ/LmNoYXRfaWRcbiAgICAgICAgICAgICAgICBjdExvY2FsID0gJydcbiAgICAgICAgICAgICAgICBjdEluZm8gPSAnJ1xuICAgICAgICAgICAgICAgIGlmIGVudGl0eVtjaWRdPy50eXBlID09IDBcbiAgICAgICAgICAgICAgICAgICAgY3RMb2NhbCA9ICdjdC1sb2NhbCdcbiAgICAgICAgICAgICAgICAgICAgY3RJbmZvID0gJ0ludGVybmFsIENvbnRhY3QnICsgXCJcXHJcXG5cIlxuICAgICAgICAgICAgICAgIGlmIChyLnByb3BlcnRpZXM/LmVtYWlscz9bMF0gPyBlbnRpdHlbY2lkXT8uZW1haWxzP1swXSlcbiAgICAgICAgICAgICAgICAgICAgY3RJbmZvICs9IChyLnByb3BlcnRpZXM/LmVtYWlscz9bMF0gPyBlbnRpdHlbY2lkXT8uZW1haWxzPy5qb2luKFwiXFxyXFxuXCIpKSArIFwiXFxyXFxuXCJcbiAgICAgICAgICAgICAgICBpZiByLnByb3BlcnRpZXM/Lm9yZ2FuaXphdGlvblxuICAgICAgICAgICAgICAgICAgICBjdEluZm8gKz0gci5wcm9wZXJ0aWVzPy5vcmdhbml6YXRpb24gKyBcIlxcclxcblwiXG4gICAgICAgICAgICAgICAgaWYgci5wcm9wZXJ0aWVzPy5sb2NhdGlvblxuICAgICAgICAgICAgICAgICAgICBjdEluZm8gKz0gci5wcm9wZXJ0aWVzPy5sb2NhdGlvbiArIFwiXFxyXFxuXCJcbiAgICAgICAgICAgICAgICBpZiB1bmlxdWUocikgaW4gc2VsZWN0ZWRfaWRzIHRoZW4gcmV0dXJuXG4gICAgICAgICAgICAgICAgbGkgdGl0bGU6Y3RJbmZvLCBjbGFzczpjdExvY2FsLCAtPlxuICAgICAgICAgICAgICAgICAgICBkcmF3QXZhdGFyIGNpZCwgdmlld3N0YXRlLCBlbnRpdHlcbiAgICAgICAgICAgICAgICAgICAgLCAoci5wcm9wZXJ0aWVzPy5waG90b191cmwgPyBlbnRpdHlbY2lkXT8ucGhvdG9fdXJsKVxuICAgICAgICAgICAgICAgICAgICAsIGN0SW5mb1xuICAgICAgICAgICAgICAgICAgICAsIChpZiByLnByb3BlcnRpZXM/IHRoZW4gaW5pdGlhbHNvZiByLnByb3BlcnRpZXM/KVxuICAgICAgICAgICAgICAgICAgICBwIG5hbWVvZiByLnByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAsIG9uY2xpY2s6KGUpIC0+IGFjdGlvbiAnc2VsZWN0ZW50aXR5JywgclxuXG4gICAgICAgIGlmIGVkaXRpbmdcbiAgICAgICAgICAgIGRpdiBjbGFzczonbGVhdmUnLCAtPlxuICAgICAgICAgICAgICAgIGlmIGNvbnZlcnNhdGlvbj8udHlwZT8uaW5kZXhPZignT05FX1RPX09ORScpID4gMFxuICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6J2J1dHRvbidcbiAgICAgICAgICAgICAgICAgICAgLCB0aXRsZTogaTE4bi5fXygnY29udmVyc2F0aW9uLmRlbGV0ZTpEZWxldGUgY29udmVyc2F0aW9uJylcbiAgICAgICAgICAgICAgICAgICAgLCBvbmNsaWNrOm9uY2xpY2thY3Rpb24oJ2RlbGV0ZWNvbnYnKSwgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zJywgJ2Nsb3NlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BhbiBpMThuLl9fKCdjb252ZXJzYXRpb24uZGVsZXRlOkRlbGV0ZSBjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgZGl2IGNsYXNzOididXR0b24nXG4gICAgICAgICAgICAgICAgICAgICwgdGl0bGU6IGkxOG4uX18oJ2NvbnZlcnNhdGlvbi5sZWF2ZTpMZWF2ZSBjb252ZXJzYXRpb24nKVxuICAgICAgICAgICAgICAgICAgICAsIG9uY2xpY2s6b25jbGlja2FjdGlvbignbGVhdmVjb252JyksIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdjbG9zZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gaTE4bi5fXygnY29udmVyc2F0aW9uLmxlYXZlOkxlYXZlIGNvbnZlcnNhdGlvbicpXG5cbiAgICAgICAgZGl2IGNsYXNzOid2YWxpZGF0ZScsIC0+XG4gICAgICAgICAgICBkaXNhYmxlZCA9IG51bGxcbiAgICAgICAgICAgIGlmIGNvbnZzZXR0aW5ncy5zZWxlY3RlZEVudGl0aWVzLmxlbmd0aCA8PSAwXG4gICAgICAgICAgICAgICAgZGlzYWJsZWQgPSAgZGlzYWJsZWQ6ICdkaXNhYmxlZCdcbiAgICAgICAgICAgIGRpdiBkaXNhYmxlZCwgY2xhc3M6J2J1dHRvbidcbiAgICAgICAgICAgICwgb25jbGljazpvbmNsaWNrYWN0aW9uKCdzYXZlY29udmVyc2F0aW9uJyksIC0+XG4gICAgICAgICAgICAgICAgc3BhbiBjbGFzczonbWF0ZXJpYWwtaWNvbnMnLCAnZG9uZSdcbiAgICAgICAgICAgICAgICBzcGFuIGkxOG4uX18gXCJhY3Rpb25zLm9rOk9LXCJcblxuICAgICAgICBtYXlSZXN0b3JlSW5pdGlhbFZhbHVlcyBtb2RlbHNcblxub25jbGlja2FjdGlvbiA9IChhKSAtPiAoZXYpIC0+IGFjdGlvbiBhXG4iXX0=
