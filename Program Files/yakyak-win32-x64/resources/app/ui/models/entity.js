(function() {
  var add, domerge, funcs, list, lookup, merge, needEntity, shallowif;

  merge = function(t, ...os) {
    var i, k, len, o, v;
    for (i = 0, len = os.length; i < len; i++) {
      o = os[i];
      for (k in o) {
        v = o[k];
        if (v !== null && v !== (void 0)) {
          t[k] = v;
        }
      }
    }
    return t;
  };

  shallowif = function(o, f) {
    var k, r, v;
    r = {};
    for (k in o) {
      v = o[k];
      if (f(k, v)) {
        r[k] = v;
      }
    }
    return r;
  };

  lookup = {};

  domerge = function(id, props) {
    var ref;
    return lookup[id] = merge((ref = lookup[id]) != null ? ref : {}, props);
  };

  add = function(entity, opts = {
      silent: false
    }) {
    var chat_id, clone, gaia_id, ref;
    ({gaia_id, chat_id} = (ref = entity != null ? entity.id : void 0) != null ? ref : {});
    if (!(gaia_id || chat_id)) {
      return null;
    }
    if (!lookup[chat_id]) {
      // ensure there is at least something
      lookup[chat_id] = {};
    }
    // dereference .properties to be on main obj
    if (entity.properties) {
      domerge(chat_id, entity.properties);
    }
    // merge rest of props
    clone = shallowif(entity, function(k) {
      return k !== 'id' && k !== 'properties';
    });
    domerge(chat_id, clone);
    lookup[chat_id].id = chat_id;
    if (chat_id !== gaia_id) {
      // handle different chat_id to gaia_id
      lookup[gaia_id] = lookup[chat_id];
    }
    if (!opts.silent) {
      updated('entity');
    }
    // return the result
    return lookup[chat_id];
  };

  needEntity = (function() {
    var fetch, gather, tim;
    tim = null;
    gather = [];
    fetch = function() {
      tim = null;
      action('getentity', gather);
      return gather = [];
    };
    return function(id, wait = 1000) {
      var ref;
      if ((ref = lookup[id]) != null ? ref.fetching : void 0) {
        return;
      }
      if (lookup[id]) {
        lookup[id].fetching = true;
      } else {
        lookup[id] = {
          id: id,
          fetching: true
        };
      }
      if (tim) {
        clearTimeout(tim);
      }
      tim = setTimeout(fetch, wait);
      return gather.push(id);
    };
  })();

  list = function() {
    var k, results, v;
    results = [];
    for (k in lookup) {
      v = lookup[k];
      if (typeof v === 'object') {
        results.push(v);
      }
    }
    return results;
  };

  funcs = {
    count: function() {
      var c, k, v;
      c = 0;
      (function() {
        var results;
        results = [];
        for (k in lookup) {
          v = lookup[k];
          if (typeof v === 'object') {
            results.push(c++);
          }
        }
        return results;
      })();
      return c;
    },
    list: list,
    setPresence: function(id, p) {
      if (!lookup[id]) {
        return needEntity(id);
      }
      lookup[id].presence = p;
      return updated('entity');
    },
    isSelf: function(chat_id) {
      return !!lookup.self && lookup[chat_id] === lookup.self;
    },
    _reset: function() {
      var k, v;
      for (k in lookup) {
        v = lookup[k];
        if (typeof v === 'object') {
          delete lookup[k];
        }
      }
      updated('entity');
      return null;
    },
    _initFromSelfEntity: function(self) {
      updated('entity');
      return lookup.self = add(self);
    },
    _initFromEntities: function(entities) {
      var c, countIf, entity, i, len;
      c = 0;
      countIf = function(a) {
        if (a) {
          return c++;
        }
      };
      for (i = 0, len = entities.length; i < len; i++) {
        entity = entities[i];
        countIf(add(entity));
      }
      updated('entity');
      return c;
    },
    add: add,
    needEntity: needEntity
  };

  module.exports = merge(lookup, funcs);

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvbW9kZWxzL2VudGl0eS5qcyIsInNvdXJjZXMiOlsidWkvbW9kZWxzL2VudGl0eS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7QUFBQSxNQUFBLEdBQUEsRUFBQSxPQUFBLEVBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLFVBQUEsRUFBQTs7RUFBQSxLQUFBLEdBQVUsUUFBQSxDQUFDLENBQUQsRUFBQSxHQUFJLEVBQUosQ0FBQTtBQUFhLFFBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQSxFQUFBO0lBQUMsS0FBQSxvQ0FBQTs7TUFBQSxLQUFBLE1BQUE7O1lBQTJCLE1BQVUsUUFBVixNQUFnQjtVQUEzQyxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU87O01BQVA7SUFBQTtXQUFtRTtFQUFqRjs7RUFDVixTQUFBLEdBQVksUUFBQSxDQUFDLENBQUQsRUFBSSxDQUFKLENBQUE7QUFBUyxRQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7SUFBQyxDQUFBLEdBQUksQ0FBQTtJQUFJLEtBQUEsTUFBQTs7VUFBNEIsQ0FBQSxDQUFFLENBQUYsRUFBSSxDQUFKO1FBQTVCLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTzs7SUFBUDtXQUFvQztFQUF0RDs7RUFFWixNQUFBLEdBQVMsQ0FBQTs7RUFFVCxPQUFBLEdBQVUsUUFBQSxDQUFDLEVBQUQsRUFBSyxLQUFMLENBQUE7QUFBYyxRQUFBO1dBQUMsTUFBTSxDQUFDLEVBQUQsQ0FBTixHQUFhLEtBQUEsb0NBQW9CLENBQUEsQ0FBcEIsRUFBeUIsS0FBekI7RUFBNUI7O0VBRVYsR0FBQSxHQUFNLFFBQUEsQ0FBQyxNQUFELEVBQVMsT0FBTztNQUFBLE1BQUEsRUFBTztJQUFQLENBQWhCLENBQUE7QUFDTixRQUFBLE9BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBO0lBQUksQ0FBQSxDQUFDLE9BQUQsRUFBVSxPQUFWLENBQUEsK0RBQWtDLENBQUEsQ0FB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S0FBQSxXQUFBOztZQUF5QyxPQUFPLENBQVAsS0FBWTtVQUFyRCxPQUFPLE1BQU0sQ0FBQyxDQUFEOztNQUFiO01BQ0EsT0FBQSxDQUFRLFFBQVI7YUFDQTtJQUhJLENBWlI7SUFpQkEsbUJBQUEsRUFBcUIsUUFBQSxDQUFDLElBQUQsQ0FBQTtNQUNqQixPQUFBLENBQVEsUUFBUjthQUNBLE1BQU0sQ0FBQyxJQUFQLEdBQWMsR0FBQSxDQUFJLElBQUo7SUFGRyxDQWpCckI7SUFxQkEsaUJBQUEsRUFBcUIsUUFBQSxDQUFDLFFBQUQsQ0FBQTtBQUN6QixVQUFBLENBQUEsRUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBLENBQUEsRUFBQTtNQUFRLENBQUEsR0FBSTtNQUNKLE9BQUEsR0FBVSxRQUFBLENBQUMsQ0FBRCxDQUFBO1FBQU8sSUFBTyxDQUFQO2lCQUFBLENBQUEsR0FBQTs7TUFBUDtNQUNWLEtBQUEsMENBQUE7O1FBQUEsT0FBQSxDQUFRLEdBQUEsQ0FBSSxNQUFKLENBQVI7TUFBQTtNQUNBLE9BQUEsQ0FBUSxRQUFSO2FBQ0E7SUFMaUIsQ0FyQnJCO0lBNEJBLEdBQUEsRUFBSyxHQTVCTDtJQTZCQSxVQUFBLEVBQVk7RUE3Qlo7O0VBK0JKLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUEsQ0FBTSxNQUFOLEVBQWMsS0FBZDtBQTFGakIiLCJzb3VyY2VzQ29udGVudCI6WyJcbm1lcmdlICAgPSAodCwgb3MuLi4pIC0+IHRba10gPSB2IGZvciBrLHYgb2YgbyB3aGVuIHYgbm90IGluIFtudWxsLCB1bmRlZmluZWRdIGZvciBvIGluIG9zOyB0XG5zaGFsbG93aWYgPSAobywgZikgLT4gciA9IHt9OyByW2tdID0gdiBmb3IgaywgdiBvZiBvIHdoZW4gZihrLHYpOyByXG5cbmxvb2t1cCA9IHt9XG5cbmRvbWVyZ2UgPSAoaWQsIHByb3BzKSAtPiBsb29rdXBbaWRdID0gbWVyZ2UgKGxvb2t1cFtpZF0gPyB7fSksIHByb3BzXG5cbmFkZCA9IChlbnRpdHksIG9wdHMgPSBzaWxlbnQ6ZmFsc2UpIC0+XG4gICAge2dhaWFfaWQsIGNoYXRfaWR9ID0gZW50aXR5Py5pZCA/IHt9XG4gICAgcmV0dXJuIG51bGwgdW5sZXNzIGdhaWFfaWQgb3IgY2hhdF9pZFxuXG4gICAgIyBlbnN1cmUgdGhlcmUgaXMgYXQgbGVhc3Qgc29tZXRoaW5nXG4gICAgbG9va3VwW2NoYXRfaWRdID0ge30gdW5sZXNzIGxvb2t1cFtjaGF0X2lkXVxuXG4gICAgIyBkZXJlZmVyZW5jZSAucHJvcGVydGllcyB0byBiZSBvbiBtYWluIG9ialxuICAgIGlmIGVudGl0eS5wcm9wZXJ0aWVzXG4gICAgICAgIGRvbWVyZ2UgY2hhdF9pZCwgZW50aXR5LnByb3BlcnRpZXNcblxuICAgICMgbWVyZ2UgcmVzdCBvZiBwcm9wc1xuICAgIGNsb25lID0gc2hhbGxvd2lmIGVudGl0eSwgKGspIC0+IGsgbm90IGluIFsnaWQnLCAncHJvcGVydGllcyddXG4gICAgZG9tZXJnZSBjaGF0X2lkLCBjbG9uZVxuXG4gICAgbG9va3VwW2NoYXRfaWRdLmlkID0gY2hhdF9pZFxuXG4gICAgIyBoYW5kbGUgZGlmZmVyZW50IGNoYXRfaWQgdG8gZ2FpYV9pZFxuICAgIGxvb2t1cFtnYWlhX2lkXSA9IGxvb2t1cFtjaGF0X2lkXSBpZiBjaGF0X2lkICE9IGdhaWFfaWRcblxuICAgIHVwZGF0ZWQgJ2VudGl0eScgdW5sZXNzIG9wdHMuc2lsZW50XG5cbiAgICAjIHJldHVybiB0aGUgcmVzdWx0XG4gICAgbG9va3VwW2NoYXRfaWRdXG5cblxubmVlZEVudGl0eSA9IGRvIC0+XG4gICAgdGltID0gbnVsbFxuICAgIGdhdGhlciA9IFtdXG4gICAgZmV0Y2ggPSAtPlxuICAgICAgICB0aW0gPSBudWxsXG4gICAgICAgIGFjdGlvbiAnZ2V0ZW50aXR5JywgZ2F0aGVyXG4gICAgICAgIGdhdGhlciA9IFtdXG4gICAgKGlkLCB3YWl0PTEwMDApIC0+XG4gICAgICAgIHJldHVybiBpZiBsb29rdXBbaWRdPy5mZXRjaGluZ1xuICAgICAgICBpZiBsb29rdXBbaWRdXG4gICAgICAgICAgICBsb29rdXBbaWRdLmZldGNoaW5nID0gdHJ1ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb29rdXBbaWRdID0ge1xuICAgICAgICAgICAgICAgIGlkOiBpZFxuICAgICAgICAgICAgICAgIGZldGNoaW5nOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIGNsZWFyVGltZW91dCB0aW0gaWYgdGltXG4gICAgICAgIHRpbSA9IHNldFRpbWVvdXQgZmV0Y2gsIHdhaXRcbiAgICAgICAgZ2F0aGVyLnB1c2ggaWRcblxubGlzdCA9IC0+XG4gICAgdiBmb3IgaywgdiBvZiBsb29rdXAgd2hlbiB0eXBlb2YgdiA9PSAnb2JqZWN0J1xuXG5cblxuZnVuY3MgPVxuICAgIGNvdW50OiAtPlxuICAgICAgICBjID0gMDsgKGMrKyBmb3IgaywgdiBvZiBsb29rdXAgd2hlbiB0eXBlb2YgdiA9PSAnb2JqZWN0Jyk7IGNcblxuICAgIGxpc3Q6IGxpc3RcblxuICAgIHNldFByZXNlbmNlOiAoaWQsIHApIC0+XG4gICAgICAgIHJldHVybiBuZWVkRW50aXR5KGlkKSBpZiBub3QgbG9va3VwW2lkXVxuICAgICAgICBsb29rdXBbaWRdLnByZXNlbmNlID0gcFxuICAgICAgICB1cGRhdGVkICdlbnRpdHknXG5cbiAgICBpc1NlbGY6IChjaGF0X2lkKSAtPiByZXR1cm4gISFsb29rdXAuc2VsZiBhbmQgbG9va3VwW2NoYXRfaWRdID09IGxvb2t1cC5zZWxmXG5cbiAgICBfcmVzZXQ6IC0+XG4gICAgICAgIGRlbGV0ZSBsb29rdXBba10gZm9yIGssIHYgb2YgbG9va3VwIHdoZW4gdHlwZW9mIHYgPT0gJ29iamVjdCdcbiAgICAgICAgdXBkYXRlZCAnZW50aXR5J1xuICAgICAgICBudWxsXG5cbiAgICBfaW5pdEZyb21TZWxmRW50aXR5OiAoc2VsZikgLT5cbiAgICAgICAgdXBkYXRlZCAnZW50aXR5J1xuICAgICAgICBsb29rdXAuc2VsZiA9IGFkZCBzZWxmXG5cbiAgICBfaW5pdEZyb21FbnRpdGllczogICAoZW50aXRpZXMpIC0+XG4gICAgICAgIGMgPSAwXG4gICAgICAgIGNvdW50SWYgPSAoYSkgLT4gYysrIGlmIGFcbiAgICAgICAgY291bnRJZiBhZGQgZW50aXR5IGZvciBlbnRpdHkgaW4gZW50aXRpZXNcbiAgICAgICAgdXBkYXRlZCAnZW50aXR5J1xuICAgICAgICBjXG5cbiAgICBhZGQ6IGFkZFxuICAgIG5lZWRFbnRpdHk6IG5lZWRFbnRpdHlcblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZSBsb29rdXAsIGZ1bmNzXG4iXX0=
