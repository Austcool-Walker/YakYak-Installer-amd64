(function() {
  // some unused icons/actions
  //    {icon:'icon-user-add', action:'adduser'}
  //    {icon:'icon-pencil',   action:'renameconv'}
  //    {icon:'icon-videocam', action:'videocall'}
  //    {icon:'icon-phone',    action:'voicecall'}
  var onclickaction;

  onclickaction = function(a) {
    return function(ev) {
      return action(a);
    };
  };

  module.exports = view(function(models) {
    var c, conv, viewstate;
    ({conv, viewstate} = models);
    c = conv[viewstate.selectedConv];
    return div({
      class: 'controls'
    }, function() {
      return div({
        class: 'button',
        title: i18n.__('conversation.add:Add new conversation')
      }, {
        onclick: onclickaction('addconversation')
      }, function() {
        return span({
          class: 'material-icons'
        }, 'add');
      });
    });
  });

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29udHJvbHMuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2NvbnRyb2xzLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLK0M7RUFBQTs7Ozs7QUFBQSxNQUFBOztFQUUvQyxhQUFBLEdBQWdCLFFBQUEsQ0FBQyxDQUFELENBQUE7V0FBTyxRQUFBLENBQUMsRUFBRCxDQUFBO2FBQVEsTUFBQSxDQUFPLENBQVA7SUFBUjtFQUFQOztFQUVoQixNQUFNLENBQUMsT0FBUCxHQUFpQixJQUFBLENBQUssUUFBQSxDQUFDLE1BQUQsQ0FBQTtBQUN0QixRQUFBLENBQUEsRUFBQSxJQUFBLEVBQUE7SUFBSSxDQUFBLENBQUMsSUFBRCxFQUFPLFNBQVAsQ0FBQSxHQUFvQixNQUFwQjtJQUNBLENBQUEsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVg7V0FDUixHQUFBLENBQUk7TUFBQSxLQUFBLEVBQU07SUFBTixDQUFKLEVBQXNCLFFBQUEsQ0FBQSxDQUFBO2FBQ2xCLEdBQUEsQ0FBSTtRQUFBLEtBQUEsRUFBTSxRQUFOO1FBQWdCLEtBQUEsRUFBTyxJQUFJLENBQUMsRUFBTCxDQUFRLHVDQUFSO01BQXZCLENBQUosRUFDSTtRQUFBLE9BQUEsRUFBUSxhQUFBLENBQWMsaUJBQWQ7TUFBUixDQURKLEVBQzhDLFFBQUEsQ0FBQSxDQUFBO2VBQUcsSUFBQSxDQUFLO1VBQUEsS0FBQSxFQUFNO1FBQU4sQ0FBTCxFQUE2QixLQUE3QjtNQUFILENBRDlDO0lBRGtCLENBQXRCO0VBSGtCLENBQUw7QUFKOEIiLCJzb3VyY2VzQ29udGVudCI6WyJcbiMgc29tZSB1bnVzZWQgaWNvbnMvYWN0aW9uc1xuIyAgICB7aWNvbjonaWNvbi11c2VyLWFkZCcsIGFjdGlvbjonYWRkdXNlcid9XG4jICAgIHtpY29uOidpY29uLXBlbmNpbCcsICAgYWN0aW9uOidyZW5hbWVjb252J31cbiMgICAge2ljb246J2ljb24tdmlkZW9jYW0nLCBhY3Rpb246J3ZpZGVvY2FsbCd9XG4jICAgIHtpY29uOidpY29uLXBob25lJywgICAgYWN0aW9uOid2b2ljZWNhbGwnfVxuXG5vbmNsaWNrYWN0aW9uID0gKGEpIC0+IChldikgLT4gYWN0aW9uIGFcblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3IChtb2RlbHMpIC0+XG4gICAge2NvbnYsIHZpZXdzdGF0ZX0gPSBtb2RlbHNcbiAgICBjID0gY29udlt2aWV3c3RhdGUuc2VsZWN0ZWRDb252XVxuICAgIGRpdiBjbGFzczonY29udHJvbHMnLCAtPlxuICAgICAgICBkaXYgY2xhc3M6J2J1dHRvbicsIHRpdGxlOiBpMThuLl9fKCdjb252ZXJzYXRpb24uYWRkOkFkZCBuZXcgY29udmVyc2F0aW9uJyksXG4gICAgICAgICAgICBvbmNsaWNrOm9uY2xpY2thY3Rpb24oJ2FkZGNvbnZlcnNhdGlvbicpLCAtPiBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdhZGQnXG4iXX0=
