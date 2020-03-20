(function() {
  var nameof, scrollToBottom;

  ({scrollToBottom} = require('./messages'));

  ({nameof} = require('../util'));

  module.exports = view(function(models) {
    var c, conv, conv_id, entity, ref, viewstate;
    ({viewstate, conv, entity} = models);
    conv_id = viewstate != null ? viewstate.selectedConv : void 0;
    c = conv[conv_id];
    return div({
      class: 'typing ' + ((c != null ? (ref = c.typing) != null ? ref.length : void 0 : void 0) ? 'typingnow' : void 0)
    }, function() {
      var i, j, len, name, ref1, ref2, ref3, ref4, t;
      if (!c) {
        return;
      }
      if (c != null ? (ref1 = c.typing) != null ? ref1.length : void 0 : void 0) {
        span({
          class: 'material-icons'
        }, 'more_horiz');
      }
      ref3 = (ref2 = c.typing) != null ? ref2 : [];
      for (i = j = 0, len = ref3.length; j < len; i = ++j) {
        t = ref3[i];
        name = nameof(entity[t.user_id.chat_id]);
        span({
          class: `typing_${t.status}`
        }, name);
        if (i < (c.typing.length - 1)) {
          pass(', ');
        }
      }
      if (c != null ? (ref4 = c.typing) != null ? ref4.length : void 0 : void 0) {
        return pass(` ${i18n.__('input.typing:is typing')}`);
      }
    });
  });

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvdHlwaW5naW5mby5qcyIsInNvdXJjZXMiOlsidWkvdmlld3MvdHlwaW5naW5mby5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLE1BQUEsRUFBQTs7RUFBQSxDQUFBLENBQUMsY0FBRCxDQUFBLEdBQW1CLE9BQUEsQ0FBUSxZQUFSLENBQW5COztFQUNBLENBQUEsQ0FBQyxNQUFELENBQUEsR0FBWSxPQUFBLENBQVEsU0FBUixDQUFaOztFQUVBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLElBQUEsQ0FBSyxRQUFBLENBQUMsTUFBRCxDQUFBO0FBQ3RCLFFBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBLEdBQUEsRUFBQTtJQUFJLENBQUEsQ0FBQyxTQUFELEVBQVksSUFBWixFQUFrQixNQUFsQixDQUFBLEdBQTRCLE1BQTVCO0lBRUEsT0FBQSx1QkFBVSxTQUFTLENBQUU7SUFDckIsQ0FBQSxHQUFJLElBQUksQ0FBQyxPQUFEO1dBRVIsR0FBQSxDQUFJO01BQUEsS0FBQSxFQUFNLFNBQUEsR0FBVSw0Q0FBeUIsQ0FBRSx5QkFBMUIsR0FBQSxXQUFBLEdBQUEsTUFBRDtJQUFoQixDQUFKLEVBQXdELFFBQUEsQ0FBQSxDQUFBO0FBQzVELFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQTtNQUFRLEtBQWMsQ0FBZDtBQUFBLGVBQUE7O01BQ0EsZ0RBQXNELENBQUUsd0JBQXhEO1FBQUEsSUFBQSxDQUFLO1VBQUEsS0FBQSxFQUFNO1FBQU4sQ0FBTCxFQUE2QixZQUE3QixFQUFBOztBQUNBO01BQUEsS0FBQSw4Q0FBQTs7UUFDSSxJQUFBLEdBQU8sTUFBQSxDQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQVgsQ0FBYjtRQUNQLElBQUEsQ0FBSztVQUFBLEtBQUEsRUFBTSxDQUFBLE9BQUEsQ0FBQSxDQUFVLENBQUMsQ0FBQyxNQUFaLENBQUE7UUFBTixDQUFMLEVBQWlDLElBQWpDO1FBQ0EsSUFBYSxDQUFBLEdBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQVQsR0FBa0IsQ0FBbkIsQ0FBakI7VUFBQSxJQUFBLENBQUssSUFBTCxFQUFBOztNQUhKO01BSUEsZ0RBQXdELENBQUUsd0JBQTFEO2VBQUEsSUFBQSxDQUFLLEVBQUEsQ0FBQSxDQUFJLElBQUksQ0FBQyxFQUFMLENBQVEsd0JBQVIsQ0FBSixDQUFBLENBQUwsRUFBQTs7SUFQb0QsQ0FBeEQ7RUFOa0IsQ0FBTDtBQUhqQiIsInNvdXJjZXNDb250ZW50IjpbIntzY3JvbGxUb0JvdHRvbX0gPSByZXF1aXJlICcuL21lc3NhZ2VzJ1xue25hbWVvZn0gID0gcmVxdWlyZSAnLi4vdXRpbCdcblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3IChtb2RlbHMpIC0+XG4gICAge3ZpZXdzdGF0ZSwgY29udiwgZW50aXR5fSA9IG1vZGVsc1xuXG4gICAgY29udl9pZCA9IHZpZXdzdGF0ZT8uc2VsZWN0ZWRDb252XG4gICAgYyA9IGNvbnZbY29udl9pZF1cblxuICAgIGRpdiBjbGFzczondHlwaW5nICcrKCd0eXBpbmdub3cnIGlmIGM/LnR5cGluZz8ubGVuZ3RoKSwgLT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBjXG4gICAgICAgIHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zJywgJ21vcmVfaG9yaXonIGlmIGM/LnR5cGluZz8ubGVuZ3RoXG4gICAgICAgIGZvciB0LCBpIGluIChjLnR5cGluZyA/IFtdKVxuICAgICAgICAgICAgbmFtZSA9IG5hbWVvZiBlbnRpdHlbdC51c2VyX2lkLmNoYXRfaWRdXG4gICAgICAgICAgICBzcGFuIGNsYXNzOlwidHlwaW5nXyN7dC5zdGF0dXN9XCIsIG5hbWVcbiAgICAgICAgICAgIHBhc3MgJywgJyBpZiBpIDwgKGMudHlwaW5nLmxlbmd0aCAtIDEpXG4gICAgICAgIHBhc3MgXCIgI3tpMThuLl9fICdpbnB1dC50eXBpbmc6aXMgdHlwaW5nJ31cIiBpZiBjPy50eXBpbmc/Lmxlbmd0aFxuIl19
