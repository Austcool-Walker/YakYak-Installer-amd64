(function() {
  var tonotify;

  tonotify = [];

  module.exports = {
    addToNotify: function(ev) {
      return tonotify.push(ev);
    },
    popToNotify: function() {
      var t;
      if (!tonotify.length) {
        return [];
      }
      t = tonotify;
      tonotify = [];
      return t;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvbW9kZWxzL25vdGlmeS5qcyIsInNvdXJjZXMiOlsidWkvbW9kZWxzL25vdGlmeS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7QUFBQSxNQUFBOztFQUFBLFFBQUEsR0FBVzs7RUFFWCxNQUFNLENBQUMsT0FBUCxHQUNJO0lBQUEsV0FBQSxFQUFhLFFBQUEsQ0FBQyxFQUFELENBQUE7YUFBUSxRQUFRLENBQUMsSUFBVCxDQUFjLEVBQWQ7SUFBUixDQUFiO0lBQ0EsV0FBQSxFQUFhLFFBQUEsQ0FBQSxDQUFBO0FBQ2pCLFVBQUE7TUFBUSxLQUFpQixRQUFRLENBQUMsTUFBMUI7QUFBQSxlQUFPLEdBQVA7O01BQ0EsQ0FBQSxHQUFJO01BQ0osUUFBQSxHQUFXO0FBQ1gsYUFBTztJQUpFO0VBRGI7QUFISiIsInNvdXJjZXNDb250ZW50IjpbIlxudG9ub3RpZnkgPSBbXVxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gICAgYWRkVG9Ob3RpZnk6IChldikgLT4gdG9ub3RpZnkucHVzaCBldlxuICAgIHBvcFRvTm90aWZ5OiAtPlxuICAgICAgICByZXR1cm4gW10gdW5sZXNzIHRvbm90aWZ5Lmxlbmd0aFxuICAgICAgICB0ID0gdG9ub3RpZnlcbiAgICAgICAgdG9ub3RpZnkgPSBbXVxuICAgICAgICByZXR1cm4gdFxuIl19
