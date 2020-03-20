(function() {
  var totallyunique;

  totallyunique = function(...as) {
    return String(Date.now()) + (Math.random() * 1000000);
  };

  // fn is expected to return a promised that finishes
  // when fn is finished.

  // retry is whether we retry failures of fn

  // dedupe is a function that mashes the arguments to fn
  // into a dedupe value.
  module.exports = function(fn, retry, dedupe = totallyunique) {
    var deduped, execNext, execing, queue;
    queue = []; // the queue of args to exec
    deduped = []; // the dedupe(args) for deduping
    execing = false; // flag indicating whether execNext is running
    
    // will perpetually exec next until queue is empty
    execNext = function() {
      var args;
      if (!queue.length) {
        execing = false;
        return;
      }
      execing = true;
      args = queue[0];
      return fn(...args).then(function() {
        // it finished, drop args
        queue.shift();
        return deduped.shift();
      }).fail(function(err) {
        if (!retry) {
          // it failed.
          // no retry? then just drop args
          queue.shift();
          return deduped.shift();
        }
      }).then(function() {
        return execNext();
      });
    };
    return function(...as) {
      var d, i;
      d = dedupe(...as);
      if ((i = deduped.indexOf(d)) >= 0) {
        // replace entry, notice this can replace
        // a currently execing entry
        queue[i] = as;
      } else {
        // push a new entry
        queue.push(as);
        deduped.push(d);
      }
      if (!execing) {
        return execNext();
      }
    };
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VxcmVxLmpzIiwic291cmNlcyI6WyJzZXFyZXEuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0FBQUEsTUFBQTs7RUFBQSxhQUFBLEdBQWdCLFFBQUEsQ0FBQSxHQUFDLEVBQUQsQ0FBQTtXQUFXLE1BQUEsQ0FBTyxJQUFJLENBQUMsR0FBTCxDQUFBLENBQVAsQ0FBQSxHQUFxQixDQUFDLElBQUksQ0FBQyxNQUFMLENBQUEsQ0FBQSxHQUFnQixPQUFqQjtFQUFoQyxFQUFoQjs7Ozs7Ozs7O0VBU0EsTUFBTSxDQUFDLE9BQVAsR0FBaUIsUUFBQSxDQUFDLEVBQUQsRUFBSyxLQUFMLEVBQVksU0FBUyxhQUFyQixDQUFBO0FBRWpCLFFBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUE7SUFBSSxLQUFBLEdBQVEsR0FBWjtJQUNJLE9BQUEsR0FBVSxHQURkO0lBRUksT0FBQSxHQUFVLE1BRmQ7OztJQUtJLFFBQUEsR0FBVyxRQUFBLENBQUEsQ0FBQTtBQUNmLFVBQUE7TUFBUSxLQUFPLEtBQUssQ0FBQyxNQUFiO1FBQ0ksT0FBQSxHQUFVO0FBQ1YsZUFGSjs7TUFHQSxPQUFBLEdBQVU7TUFDVixJQUFBLEdBQU8sS0FBSyxDQUFDLENBQUQ7YUFDWixFQUFBLENBQUcsR0FBQSxJQUFILENBQVcsQ0FBQyxJQUFaLENBQWlCLFFBQUEsQ0FBQSxDQUFBLEVBQUE7O1FBRWIsS0FBSyxDQUFDLEtBQU4sQ0FBQTtlQUFlLE9BQU8sQ0FBQyxLQUFSLENBQUE7TUFGRixDQUFqQixDQUdBLENBQUMsSUFIRCxDQUdNLFFBQUEsQ0FBQyxHQUFELENBQUE7UUFHRixLQUF3QyxLQUF4Qzs7O1VBQUMsS0FBSyxDQUFDLEtBQU4sQ0FBQTtpQkFBZSxPQUFPLENBQUMsS0FBUixDQUFBLEVBQWhCOztNQUhFLENBSE4sQ0FPQSxDQUFDLElBUEQsQ0FPTSxRQUFBLENBQUEsQ0FBQTtlQUNGLFFBQUEsQ0FBQTtNQURFLENBUE47SUFOTztXQWdCWCxRQUFBLENBQUEsR0FBQyxFQUFELENBQUE7QUFDSixVQUFBLENBQUEsRUFBQTtNQUFRLENBQUEsR0FBSSxNQUFBLENBQU8sR0FBQSxFQUFQO01BQ0osSUFBRyxDQUFDLENBQUEsR0FBSSxPQUFPLENBQUMsT0FBUixDQUFnQixDQUFoQixDQUFMLENBQUEsSUFBNEIsQ0FBL0I7OztRQUdJLEtBQUssQ0FBQyxDQUFELENBQUwsR0FBVyxHQUhmO09BQUEsTUFBQTs7UUFNSSxLQUFLLENBQUMsSUFBTixDQUFXLEVBQVg7UUFDQSxPQUFPLENBQUMsSUFBUixDQUFhLENBQWIsRUFQSjs7TUFRQSxLQUFrQixPQUFsQjtlQUFBLFFBQUEsQ0FBQSxFQUFBOztJQVZKO0VBdkJhO0FBVGpCIiwic291cmNlc0NvbnRlbnQiOlsiXG50b3RhbGx5dW5pcXVlID0gKGFzLi4uKSAtPiBTdHJpbmcoRGF0ZS5ub3coKSkgKyAoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApXG5cbiMgZm4gaXMgZXhwZWN0ZWQgdG8gcmV0dXJuIGEgcHJvbWlzZWQgdGhhdCBmaW5pc2hlc1xuIyB3aGVuIGZuIGlzIGZpbmlzaGVkLlxuI1xuIyByZXRyeSBpcyB3aGV0aGVyIHdlIHJldHJ5IGZhaWx1cmVzIG9mIGZuXG4jXG4jIGRlZHVwZSBpcyBhIGZ1bmN0aW9uIHRoYXQgbWFzaGVzIHRoZSBhcmd1bWVudHMgdG8gZm5cbiMgaW50byBhIGRlZHVwZSB2YWx1ZS5cbm1vZHVsZS5leHBvcnRzID0gKGZuLCByZXRyeSwgZGVkdXBlID0gdG90YWxseXVuaXF1ZSkgLT5cblxuICAgIHF1ZXVlID0gW10gICAgICAjIHRoZSBxdWV1ZSBvZiBhcmdzIHRvIGV4ZWNcbiAgICBkZWR1cGVkID0gW10gICAgIyB0aGUgZGVkdXBlKGFyZ3MpIGZvciBkZWR1cGluZ1xuICAgIGV4ZWNpbmcgPSBmYWxzZSAjIGZsYWcgaW5kaWNhdGluZyB3aGV0aGVyIGV4ZWNOZXh0IGlzIHJ1bm5pbmdcblxuICAgICMgd2lsbCBwZXJwZXR1YWxseSBleGVjIG5leHQgdW50aWwgcXVldWUgaXMgZW1wdHlcbiAgICBleGVjTmV4dCA9IC0+XG4gICAgICAgIHVubGVzcyBxdWV1ZS5sZW5ndGhcbiAgICAgICAgICAgIGV4ZWNpbmcgPSBmYWxzZVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIGV4ZWNpbmcgPSB0cnVlXG4gICAgICAgIGFyZ3MgPSBxdWV1ZVswXSAjIG5leHQgYXJncyB0byB0cnlcbiAgICAgICAgZm4oYXJncy4uLikudGhlbiAtPlxuICAgICAgICAgICAgIyBpdCBmaW5pc2hlZCwgZHJvcCBhcmdzXG4gICAgICAgICAgICBxdWV1ZS5zaGlmdCgpOyBkZWR1cGVkLnNoaWZ0KClcbiAgICAgICAgLmZhaWwgKGVycikgLT5cbiAgICAgICAgICAgICMgaXQgZmFpbGVkLlxuICAgICAgICAgICAgIyBubyByZXRyeT8gdGhlbiBqdXN0IGRyb3AgYXJnc1xuICAgICAgICAgICAgKHF1ZXVlLnNoaWZ0KCk7IGRlZHVwZWQuc2hpZnQoKSkgdW5sZXNzIHJldHJ5XG4gICAgICAgIC50aGVuIC0+XG4gICAgICAgICAgICBleGVjTmV4dCgpXG5cbiAgICAoYXMuLi4pIC0+XG4gICAgICAgIGQgPSBkZWR1cGUgYXMuLi5cbiAgICAgICAgaWYgKGkgPSBkZWR1cGVkLmluZGV4T2YoZCkpID49IDBcbiAgICAgICAgICAgICMgcmVwbGFjZSBlbnRyeSwgbm90aWNlIHRoaXMgY2FuIHJlcGxhY2VcbiAgICAgICAgICAgICMgYSBjdXJyZW50bHkgZXhlY2luZyBlbnRyeVxuICAgICAgICAgICAgcXVldWVbaV0gPSBhc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICAjIHB1c2ggYSBuZXcgZW50cnlcbiAgICAgICAgICAgIHF1ZXVlLnB1c2ggYXNcbiAgICAgICAgICAgIGRlZHVwZWQucHVzaCBkXG4gICAgICAgIGV4ZWNOZXh0KCkgdW5sZXNzIGV4ZWNpbmdcbiJdfQ==
