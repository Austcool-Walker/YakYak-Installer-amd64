(function() {
  var app, dockAlreadyVisible;

  app = require('electron').remote.require('electron').app;

  // calling show multiple times makes the osx app flash
  // therefore we remember here if the dock is already shown
  // and we avoid re-calling app.dock.show() multiple times
  dockAlreadyVisible = true;

  module.exports = function(viewstate) {
    if (require('os').platform() !== 'darwin') {
      return;
    }
    if (viewstate.hidedockicon && (dockAlreadyVisible === true)) {
      console.log('hiding dock');
      app.dock.hide();
      dockAlreadyVisible = false;
    }
    if (!viewstate.hidedockicon && (dockAlreadyVisible === false)) {
      console.log('showing dock');
      app.dock.show();
      return dockAlreadyVisible = true;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvZG9ja2ljb24uanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2RvY2tpY29uLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsR0FBQSxFQUFBOztFQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUEzQixDQUFtQyxVQUFuQyxDQUE4QyxDQUFDLElBQXJEOzs7OztFQUtBLGtCQUFBLEdBQXFCOztFQUVyQixNQUFNLENBQUMsT0FBUCxHQUFpQixRQUFBLENBQUMsU0FBRCxDQUFBO0lBQ2YsSUFBRyxPQUFBLENBQVEsSUFBUixDQUFhLENBQUMsUUFBZCxDQUFBLENBQUEsS0FBOEIsUUFBakM7QUFBK0MsYUFBL0M7O0lBRUEsSUFBRyxTQUFTLENBQUMsWUFBVixJQUEyQixDQUFDLGtCQUFBLEtBQXNCLElBQXZCLENBQTlCO01BQ0UsT0FBTyxDQUFDLEdBQVIsQ0FBWSxhQUFaO01BQ0EsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFULENBQUE7TUFDQSxrQkFBQSxHQUFxQixNQUh2Qjs7SUFLQSxJQUFHLENBQUksU0FBUyxDQUFDLFlBQWQsSUFBK0IsQ0FBQyxrQkFBQSxLQUFzQixLQUF2QixDQUFsQztNQUNFLE9BQU8sQ0FBQyxHQUFSLENBQVksY0FBWjtNQUNBLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBVCxDQUFBO2FBQ0Esa0JBQUEsR0FBcUIsS0FIdkI7O0VBUmU7QUFQakIiLCJzb3VyY2VzQ29udGVudCI6WyJhcHAgPSByZXF1aXJlKCdlbGVjdHJvbicpLnJlbW90ZS5yZXF1aXJlKCdlbGVjdHJvbicpLmFwcFxuXG4jIGNhbGxpbmcgc2hvdyBtdWx0aXBsZSB0aW1lcyBtYWtlcyB0aGUgb3N4IGFwcCBmbGFzaFxuIyB0aGVyZWZvcmUgd2UgcmVtZW1iZXIgaGVyZSBpZiB0aGUgZG9jayBpcyBhbHJlYWR5IHNob3duXG4jIGFuZCB3ZSBhdm9pZCByZS1jYWxsaW5nIGFwcC5kb2NrLnNob3coKSBtdWx0aXBsZSB0aW1lc1xuZG9ja0FscmVhZHlWaXNpYmxlID0gdHJ1ZVxuXG5tb2R1bGUuZXhwb3J0cyA9ICh2aWV3c3RhdGUpIC0+XG4gIGlmIHJlcXVpcmUoJ29zJykucGxhdGZvcm0oKSBpc250ICdkYXJ3aW4nIHRoZW4gcmV0dXJuXG5cbiAgaWYgdmlld3N0YXRlLmhpZGVkb2NraWNvbiBhbmQgKGRvY2tBbHJlYWR5VmlzaWJsZSBpcyB0cnVlKVxuICAgIGNvbnNvbGUubG9nICdoaWRpbmcgZG9jaydcbiAgICBhcHAuZG9jay5oaWRlKClcbiAgICBkb2NrQWxyZWFkeVZpc2libGUgPSBmYWxzZVxuXG4gIGlmIG5vdCB2aWV3c3RhdGUuaGlkZWRvY2tpY29uIGFuZCAoZG9ja0FscmVhZHlWaXNpYmxlIGlzIGZhbHNlKVxuICAgIGNvbnNvbGUubG9nICdzaG93aW5nIGRvY2snXG4gICAgYXBwLmRvY2suc2hvdygpXG4gICAgZG9ja0FscmVhZHlWaXNpYmxlID0gdHJ1ZVxuIl19
