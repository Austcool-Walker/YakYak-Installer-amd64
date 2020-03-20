(function() {
  var ClientDeliveryMediumType, MessageActionType, MessageBuilder, OffTheRecordStatus, buildChatMessage, conv, parse, randomid, split_first, urlRegexp, viewstate;

  urlRegexp = require('uber-url-regex');

  ({MessageBuilder, OffTheRecordStatus, MessageActionType, ClientDeliveryMediumType} = require('hangupsjs'));

  viewstate = require('./viewstate');

  conv = require('./conv');

  randomid = function() {
    return Math.round(Math.random() * Math.pow(2, 32));
  };

  split_first = function(str, token) {
    var first, last, start;
    start = str.indexOf(token);
    first = str.substr(0, start);
    last = str.substr(start + token.length);
    return [first, last];
  };

  parse = function(mb, txt) {
    var after, before, i, index, j, last, len, len1, line, lines, url, urls;
    lines = txt.split(/\r?\n/);
    last = lines.length - 1;
    for (index = i = 0, len = lines.length; i < len; index = ++i) {
      line = lines[index];
      urls = line.match(urlRegexp());
      if (urls != null) {
        for (j = 0, len1 = urls.length; j < len1; j++) {
          url = urls[j];
          [before, after] = split_first(line, url);
          if (before) {
            mb.text(before);
          }
          line = after;
          mb.link(url, url);
        }
      }
      if (line) {
        mb.text(line);
      }
      if (index !== last) {
        mb.linebreak();
      }
    }
    return null;
  };

  buildChatMessage = function(sender, txt) {
    var action, client_generated_id, conv_id, conversation_state, delivery_medium, mb, message_action_type, ref, ref1, ref2, ref3, segs, segsj, ts;
    conv_id = viewstate.selectedConv;
    conversation_state = (ref = conv[conv_id]) != null ? ref.self_conversation_state : void 0;
    delivery_medium = ClientDeliveryMediumType[conversation_state != null ? (ref1 = conversation_state.delivery_medium_option) != null ? (ref2 = ref1[0]) != null ? (ref3 = ref2.delivery_medium) != null ? ref3.delivery_medium_type : void 0 : void 0 : void 0 : void 0];
    if (!delivery_medium) {
      delivery_medium = ClientDeliveryMediumType.BABEL;
    }
    action = null;
    if (/^\/me\s/.test(txt)) {
      txt = txt.replace(/^\/me/, sender.first_name);
      action = MessageActionType.ME_ACTION;
    }
    mb = new MessageBuilder(action);
    parse(mb, txt);
    segs = mb.toSegments();
    segsj = mb.toSegsjson();
    message_action_type = mb.toMessageActionType();
    client_generated_id = String(randomid());
    ts = Date.now();
    return {
      segs,
      segsj,
      conv_id,
      client_generated_id,
      ts,
      image_id: void 0,
      otr: OffTheRecordStatus.ON_THE_RECORD,
      message_action_type,
      delivery_medium: [delivery_medium] // requires to be used as an array
    };
  };

  module.exports = {buildChatMessage, parse};

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvbW9kZWxzL3VzZXJpbnB1dC5qcyIsInNvdXJjZXMiOlsidWkvbW9kZWxzL3VzZXJpbnB1dC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHdCQUFBLEVBQUEsaUJBQUEsRUFBQSxjQUFBLEVBQUEsa0JBQUEsRUFBQSxnQkFBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsUUFBQSxFQUFBLFdBQUEsRUFBQSxTQUFBLEVBQUE7O0VBQUEsU0FBQSxHQUFZLE9BQUEsQ0FBUSxnQkFBUjs7RUFDWixDQUFBLENBQUMsY0FBRCxFQUFpQixrQkFBakIsRUFBb0MsaUJBQXBDLEVBQXNELHdCQUF0RCxDQUFBLEdBQWtGLE9BQUEsQ0FBUSxXQUFSLENBQWxGOztFQUNBLFNBQUEsR0FBWSxPQUFBLENBQVEsYUFBUjs7RUFDWixJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBRVAsUUFBQSxHQUFXLFFBQUEsQ0FBQSxDQUFBO1dBQUcsSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFJLENBQUMsTUFBTCxDQUFBLENBQUEsR0FBZ0IsSUFBSSxDQUFDLEdBQUwsQ0FBUyxDQUFULEVBQVcsRUFBWCxDQUEzQjtFQUFIOztFQUVYLFdBQUEsR0FBYyxRQUFBLENBQUMsR0FBRCxFQUFNLEtBQU4sQ0FBQTtBQUNkLFFBQUEsS0FBQSxFQUFBLElBQUEsRUFBQTtJQUFFLEtBQUEsR0FBUSxHQUFHLENBQUMsT0FBSixDQUFZLEtBQVo7SUFDUixLQUFBLEdBQVEsR0FBRyxDQUFDLE1BQUosQ0FBVyxDQUFYLEVBQWMsS0FBZDtJQUNSLElBQUEsR0FBTyxHQUFHLENBQUMsTUFBSixDQUFXLEtBQUEsR0FBUSxLQUFLLENBQUMsTUFBekI7V0FDUCxDQUFDLEtBQUQsRUFBUSxJQUFSO0VBSlk7O0VBTWQsS0FBQSxHQUFRLFFBQUEsQ0FBQyxFQUFELEVBQUssR0FBTCxDQUFBO0FBQ1IsUUFBQSxLQUFBLEVBQUEsTUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsR0FBQSxFQUFBO0lBQUksS0FBQSxHQUFRLEdBQUcsQ0FBQyxLQUFKLENBQVUsT0FBVjtJQUNSLElBQUEsR0FBTyxLQUFLLENBQUMsTUFBTixHQUFlO0lBQ3RCLEtBQUEsdURBQUE7O01BQ0ksSUFBQSxHQUFPLElBQUksQ0FBQyxLQUFMLENBQVcsU0FBQSxDQUFBLENBQVg7TUFDUCxJQUFHLFlBQUg7UUFDSSxLQUFBLHdDQUFBOztVQUNJLENBQUMsTUFBRCxFQUFTLEtBQVQsQ0FBQSxHQUFrQixXQUFBLENBQVksSUFBWixFQUFrQixHQUFsQjtVQUNsQixJQUFHLE1BQUg7WUFBZSxFQUFFLENBQUMsSUFBSCxDQUFRLE1BQVIsRUFBZjs7VUFDQSxJQUFBLEdBQU87VUFDUCxFQUFFLENBQUMsSUFBSCxDQUFRLEdBQVIsRUFBYSxHQUFiO1FBSkosQ0FESjs7TUFNQSxJQUFnQixJQUFoQjtRQUFBLEVBQUUsQ0FBQyxJQUFILENBQVEsSUFBUixFQUFBOztNQUNBLElBQXNCLEtBQUEsS0FBUyxJQUEvQjtRQUFBLEVBQUUsQ0FBQyxTQUFILENBQUEsRUFBQTs7SUFUSjtXQVVBO0VBYkk7O0VBZVIsZ0JBQUEsR0FBbUIsUUFBQSxDQUFDLE1BQUQsRUFBUyxHQUFULENBQUE7QUFDbkIsUUFBQSxNQUFBLEVBQUEsbUJBQUEsRUFBQSxPQUFBLEVBQUEsa0JBQUEsRUFBQSxlQUFBLEVBQUEsRUFBQSxFQUFBLG1CQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUE7SUFBSSxPQUFBLEdBQVUsU0FBUyxDQUFDO0lBQ3BCLGtCQUFBLHNDQUFrQyxDQUFFO0lBQ3BDLGVBQUEsR0FBa0Isd0JBQXdCLGtLQUFnRSxDQUFFLHdEQUFsRTtJQUMxQyxJQUFHLENBQUksZUFBUDtNQUNFLGVBQUEsR0FBa0Isd0JBQXdCLENBQUMsTUFEN0M7O0lBRUEsTUFBQSxHQUFTO0lBQ1QsSUFBRyxTQUFTLENBQUMsSUFBVixDQUFlLEdBQWYsQ0FBSDtNQUNJLEdBQUEsR0FBTSxHQUFHLENBQUMsT0FBSixDQUFZLE9BQVosRUFBcUIsTUFBTSxDQUFDLFVBQTVCO01BQ04sTUFBQSxHQUFTLGlCQUFpQixDQUFDLFVBRi9COztJQUdBLEVBQUEsR0FBSyxJQUFJLGNBQUosQ0FBbUIsTUFBbkI7SUFDTCxLQUFBLENBQU0sRUFBTixFQUFVLEdBQVY7SUFDQSxJQUFBLEdBQVEsRUFBRSxDQUFDLFVBQUgsQ0FBQTtJQUNSLEtBQUEsR0FBUSxFQUFFLENBQUMsVUFBSCxDQUFBO0lBQ1IsbUJBQUEsR0FBc0IsRUFBRSxDQUFDLG1CQUFILENBQUE7SUFDdEIsbUJBQUEsR0FBc0IsTUFBQSxDQUFPLFFBQUEsQ0FBQSxDQUFQO0lBQ3RCLEVBQUEsR0FBSyxJQUFJLENBQUMsR0FBTCxDQUFBO1dBQ0w7TUFDSSxJQURKO01BRUksS0FGSjtNQUdJLE9BSEo7TUFJSSxtQkFKSjtNQUtJLEVBTEo7TUFNSSxRQUFBLEVBQVUsTUFOZDtNQU9JLEdBQUEsRUFBSyxrQkFBa0IsQ0FBQyxhQVA1QjtNQVFJLG1CQVJKO01BU0ksZUFBQSxFQUFpQixDQUFDLGVBQUQsQ0FUckI7SUFBQTtFQWpCZTs7RUE2Qm5CLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLENBQ2IsZ0JBRGEsRUFFYixLQUZhO0FBekRqQiIsInNvdXJjZXNDb250ZW50IjpbInVybFJlZ2V4cCA9IHJlcXVpcmUgJ3ViZXItdXJsLXJlZ2V4J1xue01lc3NhZ2VCdWlsZGVyLCBPZmZUaGVSZWNvcmRTdGF0dXMsTWVzc2FnZUFjdGlvblR5cGUsQ2xpZW50RGVsaXZlcnlNZWRpdW1UeXBlfSA9IHJlcXVpcmUgJ2hhbmd1cHNqcydcbnZpZXdzdGF0ZSA9IHJlcXVpcmUgJy4vdmlld3N0YXRlJ1xuY29udiA9IHJlcXVpcmUgJy4vY29udidcblxucmFuZG9taWQgPSAtPiBNYXRoLnJvdW5kIE1hdGgucmFuZG9tKCkgKiBNYXRoLnBvdygyLDMyKVxuXG5zcGxpdF9maXJzdCA9IChzdHIsIHRva2VuKSAtPlxuICBzdGFydCA9IHN0ci5pbmRleE9mIHRva2VuXG4gIGZpcnN0ID0gc3RyLnN1YnN0ciAwLCBzdGFydFxuICBsYXN0ID0gc3RyLnN1YnN0ciBzdGFydCArIHRva2VuLmxlbmd0aFxuICBbZmlyc3QsIGxhc3RdXG5cbnBhcnNlID0gKG1iLCB0eHQpIC0+XG4gICAgbGluZXMgPSB0eHQuc3BsaXQgL1xccj9cXG4vXG4gICAgbGFzdCA9IGxpbmVzLmxlbmd0aCAtIDFcbiAgICBmb3IgbGluZSwgaW5kZXggaW4gbGluZXNcbiAgICAgICAgdXJscyA9IGxpbmUubWF0Y2ggdXJsUmVnZXhwKClcbiAgICAgICAgaWYgdXJscz9cbiAgICAgICAgICAgIGZvciB1cmwgaW4gdXJsc1xuICAgICAgICAgICAgICAgIFtiZWZvcmUsIGFmdGVyXSA9IHNwbGl0X2ZpcnN0IGxpbmUsIHVybFxuICAgICAgICAgICAgICAgIGlmIGJlZm9yZSB0aGVuIG1iLnRleHQoYmVmb3JlKVxuICAgICAgICAgICAgICAgIGxpbmUgPSBhZnRlclxuICAgICAgICAgICAgICAgIG1iLmxpbmsgdXJsLCB1cmxcbiAgICAgICAgbWIudGV4dCBsaW5lIGlmIGxpbmVcbiAgICAgICAgbWIubGluZWJyZWFrKCkgdW5sZXNzIGluZGV4IGlzIGxhc3RcbiAgICBudWxsXG5cbmJ1aWxkQ2hhdE1lc3NhZ2UgPSAoc2VuZGVyLCB0eHQpIC0+XG4gICAgY29udl9pZCA9IHZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcbiAgICBjb252ZXJzYXRpb25fc3RhdGUgPSBjb252W2NvbnZfaWRdPy5zZWxmX2NvbnZlcnNhdGlvbl9zdGF0ZVxuICAgIGRlbGl2ZXJ5X21lZGl1bSA9IENsaWVudERlbGl2ZXJ5TWVkaXVtVHlwZVtjb252ZXJzYXRpb25fc3RhdGU/LmRlbGl2ZXJ5X21lZGl1bV9vcHRpb24/WzBdPy5kZWxpdmVyeV9tZWRpdW0/LmRlbGl2ZXJ5X21lZGl1bV90eXBlXVxuICAgIGlmIG5vdCBkZWxpdmVyeV9tZWRpdW1cbiAgICAgIGRlbGl2ZXJ5X21lZGl1bSA9IENsaWVudERlbGl2ZXJ5TWVkaXVtVHlwZS5CQUJFTFxuICAgIGFjdGlvbiA9IG51bGxcbiAgICBpZiAvXlxcL21lXFxzLy50ZXN0IHR4dFxuICAgICAgICB0eHQgPSB0eHQucmVwbGFjZSAvXlxcL21lLywgc2VuZGVyLmZpcnN0X25hbWVcbiAgICAgICAgYWN0aW9uID0gTWVzc2FnZUFjdGlvblR5cGUuTUVfQUNUSU9OXG4gICAgbWIgPSBuZXcgTWVzc2FnZUJ1aWxkZXIoYWN0aW9uKVxuICAgIHBhcnNlIG1iLCB0eHRcbiAgICBzZWdzICA9IG1iLnRvU2VnbWVudHMoKVxuICAgIHNlZ3NqID0gbWIudG9TZWdzanNvbigpXG4gICAgbWVzc2FnZV9hY3Rpb25fdHlwZSA9IG1iLnRvTWVzc2FnZUFjdGlvblR5cGUoKVxuICAgIGNsaWVudF9nZW5lcmF0ZWRfaWQgPSBTdHJpbmcgcmFuZG9taWQoKVxuICAgIHRzID0gRGF0ZS5ub3coKVxuICAgIHtcbiAgICAgICAgc2Vnc1xuICAgICAgICBzZWdzalxuICAgICAgICBjb252X2lkXG4gICAgICAgIGNsaWVudF9nZW5lcmF0ZWRfaWRcbiAgICAgICAgdHNcbiAgICAgICAgaW1hZ2VfaWQ6IHVuZGVmaW5lZFxuICAgICAgICBvdHI6IE9mZlRoZVJlY29yZFN0YXR1cy5PTl9USEVfUkVDT1JEXG4gICAgICAgIG1lc3NhZ2VfYWN0aW9uX3R5cGVcbiAgICAgICAgZGVsaXZlcnlfbWVkaXVtOiBbZGVsaXZlcnlfbWVkaXVtXSAjIHJlcXVpcmVzIHRvIGJlIHVzZWQgYXMgYW4gYXJyYXlcbiAgICB9XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIGJ1aWxkQ2hhdE1lc3NhZ2VcbiAgICBwYXJzZVxufVxuIl19
