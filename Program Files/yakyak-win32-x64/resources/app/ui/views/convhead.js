(function() {
  var convoptions, mainWindow, nameofconv, onclickaction, remote, toggleHidden;

  ({nameofconv} = require('../util'));

  remote = require('electron').remote;

  onclickaction = function(a) {
    return function(ev) {
      return action(a);
    };
  };

  module.exports = view(function(models) {
    var c, conv, conv_id, viewstate;
    ({conv, viewstate} = models);
    conv_id = viewstate != null ? viewstate.selectedConv : void 0;
    c = conv[conv_id];
    return div({
      class: 'headwrap'
    }, function() {
      var name;
      if (!c) { // region cannot take undefined
        return;
      }
      name = nameofconv(c);
      span({
        class: 'name'
      }, function() {
        if (conv.isQuiet(c)) {
          span({
            class: 'material-icons'
          }, 'notifications_off');
        }
        if (conv.isStarred(c)) {
          span({
            class: 'material-icons'
          }, "star");
        }
        return name;
      });
      div({
        class: "optionwrapper"
      }, function() {
        if (process.platform === 'win32') {
          div({
            class: "win-buttons"
          }, function() {
            button({
              id: "win-minimize",
              title: i18n.__('window.controls:Minimize'),
              onclick: onclickaction('minimize')
            });
            button({
              id: "win-maximize",
              title: i18n.__('window.controls:Maximize'),
              onclick: onclickaction('resizewindow')
            });
            button({
              id: "win-restore",
              title: i18n.__('window.controls:Restore'),
              onclick: onclickaction('resizewindow')
            });
            return button({
              id: "win-close",
              title: i18n.__('window.controls:Close'),
              onclick: onclickaction('close')
            });
          });
        }
        return div({
          class: 'button',
          title: i18n.__('conversation.options:Conversation Options'),
          onclick: convoptions
        }, function() {
          return span({
            class: 'material-icons'
          }, 'more_vert');
        });
      });
      return div({
        class: 'convoptions',
        title: i18n.__('conversation.settings:Conversation settings')
      }, function() {
        div({
          class: 'button',
          title: i18n.__('menu.view.notification.toggle:Toggle notifications'),
          onclick: onclickaction('togglenotif')
        }, function() {
          if (conv.isQuiet(c)) {
            span({
              class: 'material-icons'
            }, 'notifications_off');
          } else {
            span({
              class: 'material-icons'
            }, 'notifications');
          }
          return div({
            class: 'option-label'
          }, i18n.__n('notification:Notification', 1));
        });
        div({
          class: 'button',
          title: i18n.__('favorite.star_it:Star / unstar'),
          onclick: onclickaction('togglestar')
        }, function() {
          if (!conv.isStarred(c)) {
            span({
              class: 'material-icons'
            }, 'star_border');
          } else {
            span({
              class: 'material-icons'
            }, 'star');
          }
          return div({
            class: 'option-label'
          }, i18n.__n('favorite.title:Favorite', 1));
        });
        return div({
          class: 'button',
          title: i18n.__('settings:Settings'),
          onclick: onclickaction('convsettings')
        }, function() {
          span({
            class: 'material-icons'
          }, 'info_outline');
          return div({
            class: 'option-label'
          }, i18n.__('details:Details'));
        });
      });
    });
  });

  if (process.platform === 'win32') {
    mainWindow = remote.getCurrentWindow();
    mainWindow.on('maximize', function() {
      toggleHidden(document.getElementById('win-maximize'), true);
      return toggleHidden(document.getElementById('win-restore'), false);
    });
    mainWindow.on('unmaximize', function() {
      toggleHidden(document.getElementById('win-maximize'), false);
      return toggleHidden(document.getElementById('win-restore'), true);
    });
    toggleHidden = function(element, hidden) {
      if (!element) {
        return;
      }
      if (hidden) {
        return element.style.display = 'none';
      } else {
        return element.style.display = 'inline';
      }
    };
  }

  convoptions = function() {
    var viewstate;
    ({viewstate} = models);
    document.querySelector('.convoptions').classList.toggle('open');
    if (viewstate.state === viewstate.STATE_ADD_CONVERSATION) {
      return action('saveconversation');
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29udmhlYWQuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2NvbnZoZWFkLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsV0FBQSxFQUFBLFVBQUEsRUFBQSxVQUFBLEVBQUEsYUFBQSxFQUFBLE1BQUEsRUFBQTs7RUFBQSxDQUFBLENBQUMsVUFBRCxDQUFBLEdBQWdCLE9BQUEsQ0FBUSxTQUFSLENBQWhCOztFQUVBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztFQUU3QixhQUFBLEdBQWdCLFFBQUEsQ0FBQyxDQUFELENBQUE7V0FBTyxRQUFBLENBQUMsRUFBRCxDQUFBO2FBQVEsTUFBQSxDQUFPLENBQVA7SUFBUjtFQUFQOztFQUVoQixNQUFNLENBQUMsT0FBUCxHQUFpQixJQUFBLENBQUssUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUN0QixRQUFBLENBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBO0lBQUUsQ0FBQSxDQUFDLElBQUQsRUFBTyxTQUFQLENBQUEsR0FBb0IsTUFBcEI7SUFDQSxPQUFBLHVCQUFVLFNBQVMsQ0FBRTtJQUNyQixDQUFBLEdBQUksSUFBSSxDQUFDLE9BQUQ7V0FDUixHQUFBLENBQUk7TUFBQSxLQUFBLEVBQU07SUFBTixDQUFKLEVBQXNCLFFBQUEsQ0FBQSxDQUFBO0FBQ3hCLFVBQUE7TUFBSSxJQUFVLENBQUksQ0FBZDtBQUFBLGVBQUE7O01BQ0EsSUFBQSxHQUFPLFVBQUEsQ0FBVyxDQUFYO01BQ1AsSUFBQSxDQUFLO1FBQUEsS0FBQSxFQUFNO01BQU4sQ0FBTCxFQUFtQixRQUFBLENBQUEsQ0FBQTtRQUNqQixJQUFHLElBQUksQ0FBQyxPQUFMLENBQWEsQ0FBYixDQUFIO1VBQ00sSUFBQSxDQUFLO1lBQUEsS0FBQSxFQUFNO1VBQU4sQ0FBTCxFQUE2QixtQkFBN0IsRUFETjs7UUFFQSxJQUFHLElBQUksQ0FBQyxTQUFMLENBQWUsQ0FBZixDQUFIO1VBQ0Us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LElBQUcsTUFBSDtlQUNJLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBZCxHQUF3QixPQUQ1QjtPQUFBLE1BQUE7ZUFHSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQWQsR0FBd0IsU0FINUI7O0lBRlcsRUFWbkI7OztFQWlCQSxXQUFBLEdBQWUsUUFBQSxDQUFBLENBQUE7QUFDZixRQUFBO0lBQUUsQ0FBQSxDQUFDLFNBQUQsQ0FBQSxHQUFjLE1BQWQ7SUFDQSxRQUFRLENBQUMsYUFBVCxDQUF1QixjQUF2QixDQUFzQyxDQUFDLFNBQVMsQ0FBQyxNQUFqRCxDQUF3RCxNQUF4RDtJQUNBLElBQUcsU0FBUyxDQUFDLEtBQVYsS0FBbUIsU0FBUyxDQUFDLHNCQUFoQzthQUNFLE1BQUEsQ0FBTyxrQkFBUCxFQURGOztFQUhhO0FBakZmIiwic291cmNlc0NvbnRlbnQiOlsie25hbWVvZmNvbnZ9ICA9IHJlcXVpcmUgJy4uL3V0aWwnXG5cbnJlbW90ZSA9IHJlcXVpcmUoJ2VsZWN0cm9uJykucmVtb3RlXG5cbm9uY2xpY2thY3Rpb24gPSAoYSkgLT4gKGV2KSAtPiBhY3Rpb24gYVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXcgKG1vZGVscykgLT5cbiAge2NvbnYsIHZpZXdzdGF0ZX0gPSBtb2RlbHNcbiAgY29udl9pZCA9IHZpZXdzdGF0ZT8uc2VsZWN0ZWRDb252XG4gIGMgPSBjb252W2NvbnZfaWRdXG4gIGRpdiBjbGFzczonaGVhZHdyYXAnLCAtPlxuICAgIHJldHVybiBpZiBub3QgYyAjIHJlZ2lvbiBjYW5ub3QgdGFrZSB1bmRlZmluZWRcbiAgICBuYW1lID0gbmFtZW9mY29udiBjXG4gICAgc3BhbiBjbGFzczonbmFtZScsIC0+XG4gICAgICBpZiBjb252LmlzUXVpZXQoYylcbiAgICAgICAgICAgIHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zJywgJ25vdGlmaWNhdGlvbnNfb2ZmJ1xuICAgICAgaWYgY29udi5pc1N0YXJyZWQoYylcbiAgICAgICAgc3BhbiBjbGFzczonbWF0ZXJpYWwtaWNvbnMnLCBcInN0YXJcIlxuICAgICAgbmFtZVxuICAgIGRpdiBjbGFzczpcIm9wdGlvbndyYXBwZXJcIiwgLT5cbiAgICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJ1xuICAgICAgICAgIGRpdiBjbGFzczpcIndpbi1idXR0b25zXCIsIC0+XG4gICAgICAgICAgICBidXR0b24gaWQ6IFwid2luLW1pbmltaXplXCJcbiAgICAgICAgICAgICwgdGl0bGU6aTE4bi5fXygnd2luZG93LmNvbnRyb2xzOk1pbmltaXplJylcbiAgICAgICAgICAgICwgb25jbGljazogb25jbGlja2FjdGlvbignbWluaW1pemUnKVxuICAgICAgICAgICAgYnV0dG9uIGlkOiBcIndpbi1tYXhpbWl6ZVwiXG4gICAgICAgICAgICAsIHRpdGxlOmkxOG4uX18oJ3dpbmRvdy5jb250cm9sczpNYXhpbWl6ZScpXG4gICAgICAgICAgICAsIG9uY2xpY2s6IG9uY2xpY2thY3Rpb24oJ3Jlc2l6ZXdpbmRvdycpXG4gICAgICAgICAgICBidXR0b24gaWQ6IFwid2luLXJlc3RvcmVcIlxuICAgICAgICAgICAgLCB0aXRsZTppMThuLl9fKCd3aW5kb3cuY29udHJvbHM6UmVzdG9yZScpXG4gICAgICAgICAgICAsIG9uY2xpY2s6IG9uY2xpY2thY3Rpb24oJ3Jlc2l6ZXdpbmRvdycpXG4gICAgICAgICAgICBidXR0b24gaWQ6IFwid2luLWNsb3NlXCJcbiAgICAgICAgICAgICwgdGl0bGU6aTE4bi5fXygnd2luZG93LmNvbnRyb2xzOkNsb3NlJylcbiAgICAgICAgICAgICwgb25jbGljazogb25jbGlja2FjdGlvbignY2xvc2UnKVxuICAgICAgZGl2IGNsYXNzOididXR0b24nXG4gICAgICAsIHRpdGxlOiBpMThuLl9fKCdjb252ZXJzYXRpb24ub3B0aW9uczpDb252ZXJzYXRpb24gT3B0aW9ucycpXG4gICAgICAsIG9uY2xpY2s6Y29udm9wdGlvbnMsIC0+IHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zJywgJ21vcmVfdmVydCdcbiAgICBkaXYgY2xhc3M6J2NvbnZvcHRpb25zJ1xuICAgICwgdGl0bGU6aTE4bi5fXygnY29udmVyc2F0aW9uLnNldHRpbmdzOkNvbnZlcnNhdGlvbiBzZXR0aW5ncycpLCAtPlxuICAgICAgICBkaXYgY2xhc3M6J2J1dHRvbidcbiAgICAgICAgLCB0aXRsZTogaTE4bi5fXygnbWVudS52aWV3Lm5vdGlmaWNhdGlvbi50b2dnbGU6VG9nZ2xlIG5vdGlmaWNhdGlvbnMnKVxuICAgICAgICAsIG9uY2xpY2s6b25jbGlja2FjdGlvbigndG9nZ2xlbm90aWYnKVxuICAgICAgICAsIC0+XG4gICAgICAgICAgICBpZiBjb252LmlzUXVpZXQoYylcbiAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdub3RpZmljYXRpb25zX29mZidcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdub3RpZmljYXRpb25zJ1xuICAgICAgICAgICAgZGl2IGNsYXNzOidvcHRpb24tbGFiZWwnLCBpMThuLl9fbignbm90aWZpY2F0aW9uOk5vdGlmaWNhdGlvbicsIDEpXG4gICAgICAgIGRpdiBjbGFzczonYnV0dG9uJ1xuICAgICAgICAsIHRpdGxlOmkxOG4uX18oJ2Zhdm9yaXRlLnN0YXJfaXQ6U3RhciAvIHVuc3RhcicpXG4gICAgICAgICwgb25jbGljazpvbmNsaWNrYWN0aW9uKCd0b2dnbGVzdGFyJylcbiAgICAgICAgLCAtPlxuICAgICAgICAgICAgaWYgbm90IGNvbnYuaXNTdGFycmVkKGMpXG4gICAgICAgICAgICAgICAgc3BhbiBjbGFzczonbWF0ZXJpYWwtaWNvbnMnLCAnc3Rhcl9ib3JkZXInXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgc3BhbiBjbGFzczonbWF0ZXJpYWwtaWNvbnMnLCAnc3RhcidcbiAgICAgICAgICAgIGRpdiBjbGFzczonb3B0aW9uLWxhYmVsJywgaTE4bi5fX24oJ2Zhdm9yaXRlLnRpdGxlOkZhdm9yaXRlJywxKVxuICAgICAgICBkaXYgY2xhc3M6J2J1dHRvbidcbiAgICAgICAgLCB0aXRsZTppMThuLl9fKCdzZXR0aW5nczpTZXR0aW5ncycpXG4gICAgICAgICwgb25jbGljazpvbmNsaWNrYWN0aW9uKCdjb252c2V0dGluZ3MnKVxuICAgICAgICAsIC0+XG4gICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdpbmZvX291dGxpbmUnXG4gICAgICAgICAgICBkaXYgY2xhc3M6J29wdGlvbi1sYWJlbCcsIGkxOG4uX18oJ2RldGFpbHM6RGV0YWlscycpXG5cbmlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJ1xuICAgIG1haW5XaW5kb3cgPSByZW1vdGUuZ2V0Q3VycmVudFdpbmRvdygpXG4gICAgbWFpbldpbmRvdy5vbiAnbWF4aW1pemUnLCAoKSAtPlxuICAgICAgICB0b2dnbGVIaWRkZW4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dpbi1tYXhpbWl6ZScpLCB0cnVlXG4gICAgICAgIHRvZ2dsZUhpZGRlbiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnd2luLXJlc3RvcmUnKSwgZmFsc2VcblxuICAgIG1haW5XaW5kb3cub24gJ3VubWF4aW1pemUnLCAoKSAtPlxuICAgICAgICB0b2dnbGVIaWRkZW4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dpbi1tYXhpbWl6ZScpLCBmYWxzZVxuICAgICAgICB0b2dnbGVIaWRkZW4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3dpbi1yZXN0b3JlJyksIHRydWVcblxuICAgIHRvZ2dsZUhpZGRlbiA9IChlbGVtZW50LCBoaWRkZW4pIC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgZWxlbWVudFxuICAgICAgICBpZiBoaWRkZW5cbiAgICAgICAgICAgIGVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJ1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnaW5saW5lJ1xuXG5jb252b3B0aW9ucyAgPSAtPlxuICB7dmlld3N0YXRlfSA9IG1vZGVsc1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udm9wdGlvbnMnKS5jbGFzc0xpc3QudG9nZ2xlKCdvcGVuJyk7XG4gIGlmIHZpZXdzdGF0ZS5zdGF0ZSA9PSB2aWV3c3RhdGUuU1RBVEVfQUREX0NPTlZFUlNBVElPTlxuICAgIGFjdGlvbiAnc2F2ZWNvbnZlcnNhdGlvbidcbiJdfQ==
