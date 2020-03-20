(function() {
  var togglemenu;

  module.exports = view(function(models) {
    return div({
      class: 'listheadlabel'
    }, function() {
      if (process.platform !== 'darwin') {
        button({
          title: i18n.__('menu.title:Menu'),
          onclick: togglemenu
        }, function() {
          return i({
            class: 'material-icons'
          }, "menu");
        });
      }
      return span(i18n.__n("conversation.title:Conversations", 2));
    });
  });

  togglemenu = function() {
    if (process.platform !== 'darwin') {
      return action('togglemenu');
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvbGlzdGhlYWQuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2xpc3RoZWFkLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsSUFBQSxDQUFLLFFBQUEsQ0FBQyxNQUFELENBQUE7V0FDckIsR0FBQSxDQUFJO01BQUEsS0FBQSxFQUFNO0lBQU4sQ0FBSixFQUEyQixRQUFBLENBQUEsQ0FBQTtNQUMxQixJQUFHLE9BQU8sQ0FBQyxRQUFSLEtBQXNCLFFBQXpCO1FBQ0MsTUFBQSxDQUFPO1VBQUEsS0FBQSxFQUFPLElBQUksQ0FBQyxFQUFMLENBQVEsaUJBQVIsQ0FBUDtVQUFtQyxPQUFBLEVBQVM7UUFBNUMsQ0FBUCxFQUErRCxRQUFBLENBQUEsQ0FBQTtpQkFDOUQsQ0FBQSxDQUFFO1lBQUEsS0FBQSxFQUFNO1VBQU4sQ0FBRixFQUEwQixNQUExQjtRQUQ4RCxDQUEvRCxFQUREOzthQUdBLElBQUEsQ0FBSyxJQUFJLENBQUMsR0FBTCxDQUFTLGtDQUFULEVBQTZDLENBQTdDLENBQUw7SUFKMEIsQ0FBM0I7RUFEcUIsQ0FBTDs7RUFPakIsVUFBQSxHQUFhLFFBQUEsQ0FBQSxDQUFBO0lBQ1osSUFBRyxPQUFPLENBQUMsUUFBUixLQUFzQixRQUF6QjthQUNDLE1BQUEsQ0FBTyxZQUFQLEVBREQ7O0VBRFk7QUFQYiIsInNvdXJjZXNDb250ZW50IjpbIm1vZHVsZS5leHBvcnRzID0gdmlldyAobW9kZWxzKSAtPlxuXHRkaXYgY2xhc3M6J2xpc3RoZWFkbGFiZWwnLCAtPlxuXHRcdGlmIHByb2Nlc3MucGxhdGZvcm0gaXNudCAnZGFyd2luJ1xuXHRcdFx0YnV0dG9uIHRpdGxlOiBpMThuLl9fKCdtZW51LnRpdGxlOk1lbnUnKSwgb25jbGljazogdG9nZ2xlbWVudSwgLT5cblx0XHRcdFx0aSBjbGFzczonbWF0ZXJpYWwtaWNvbnMnLCBcIm1lbnVcIlxuXHRcdHNwYW4gaTE4bi5fX24oXCJjb252ZXJzYXRpb24udGl0bGU6Q29udmVyc2F0aW9uc1wiLCAyKVxuXG50b2dnbGVtZW51ID0gLT5cblx0aWYgcHJvY2Vzcy5wbGF0Zm9ybSBpc250ICdkYXJ3aW4nXG5cdFx0YWN0aW9uICd0b2dnbGVtZW51J1xuIl19
