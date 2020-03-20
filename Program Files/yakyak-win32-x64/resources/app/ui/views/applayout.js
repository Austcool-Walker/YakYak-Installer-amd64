(function() {
  var addClass, attachListeners, attached, closest, drag, exp, noInputKeydown, onActivity, onScroll, path, removeClass, resize, resizers, throttle, topof;

  ({throttle, topof} = require('../util'));

  path = require('path');

  attached = false;

  attachListeners = function() {
    if (attached) {
      return;
    }
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    return window.addEventListener('keydown', noInputKeydown);
  };

  onActivity = throttle(100, function(ev) {
    // This occasionally happens to generate error when
    // user clicking has generated an application event
    // that is being handled while we also receive the event
    // Current fix: defer the action generated during the update
    return setTimeout(function() {
      var ref;
      return action('activity', (ref = ev.timeStamp) != null ? ref : Date.now());
    }, 1);
  });

  noInputKeydown = function(ev) {
    if (ev.target.tagName !== 'TEXTAREA') {
      return action('noinputkeydown', ev);
    }
  };

  onScroll = throttle(20, function(ev) {
    var atbottom, attop, child, el;
    el = ev.target;
    child = el.children[0];
    // calculation to see whether we are at the bottom with a tolerance value
    atbottom = (el.scrollTop + el.offsetHeight) >= (child.offsetHeight - 10);
    action('atbottom', atbottom);
    // check whether we are at the top with a tolerance value
    attop = el.scrollTop <= (el.offsetHeight / 2);
    return action('attop', attop);
  });

  addClass = function(el, cl) {
    if (!el) {
      return;
    }
    if (RegExp(`\\s*${cl}`).exec(el.className)) {
      return;
    }
    el.className += el.className ? ` ${cl}` : cl;
    return el;
  };

  removeClass = function(el, cl) {
    if (!el) {
      return;
    }
    el.className = el.className.replace(RegExp(`\\s*${cl}`), '');
    return el;
  };

  closest = function(el, cl) {
    if (!el) {
      return;
    }
    if (!(cl instanceof RegExp)) {
      cl = RegExp(`\\s*${cl}`);
    }
    if (el.className.match(cl)) {
      return el;
    } else {
      return closest(el.parentNode, cl);
    }
  };

  drag = (function() {
    var ondragenter, ondragleave, ondragover, ondrop;
    ondragover = ondragenter = function(ev) {
      // this enables dragging at all
      ev.preventDefault();
      addClass(closest(ev.target, 'dragtarget'), 'dragover');
      removeClass(closest(ev.target, 'dragtarget'), 'drag-timeout');
      ev.dataTransfer.dropEffect = 'copy';
      return false;
    };
    ondrop = function(ev) {
      ev.preventDefault();
      removeClass(closest(ev.target, 'dragtarget'), 'dragover');
      removeClass(closest(ev.target, 'dragtarget'), 'drag-timeout');
      return action('uploadimage', ev.dataTransfer.files);
    };
    ondragleave = function(ev) {
      // it was firing the leave event while dragging, had to
      //  use a timeout to check if it was a "real" event
      //  by remaining out
      addClass(closest(ev.target, 'dragtarget'), 'drag-timeout');
      return setTimeout(function() {
        if (closest(ev.target, 'dragtarget').classList.contains('drag-timeout')) {
          removeClass(closest(ev.target, 'dragtarget'), 'dragover');
          return removeClass(closest(ev.target, 'dragtarget'), 'drag-timeout');
        }
      }, 200);
    };
    return {ondragover, ondragenter, ondrop, ondragleave};
  })();

  resize = (function() {
    var rz;
    rz = null;
    return {
      onmousemove: function(ev) {
        if (rz && ev.buttons & 1) {
          return rz(ev);
        } else {
          return rz = null;
        }
      },
      onmousedown: function(ev) {
        var ref;
        return rz = resizers[(ref = ev.target.dataset) != null ? ref.resize : void 0];
      },
      onmouseup: function(ev) {
        return rz = null;
      }
    };
  })();

  resizers = {
    leftResize: function(ev) {
      return action('leftresize', Math.max(90, ev.clientX));
    }
  };

  module.exports = exp = layout(function() {
    var platform;
    platform = process.platform === 'darwin' ? 'osx' : '';
    div({
      class: 'applayout ' + platform
    }, resize, region('last'), function() {
      div({
        class: 'left'
      }, function() {
        div({
          class: 'listhead'
        }, region('listhead'));
        div({
          class: 'list'
        }, region('left'));
        return div({
          class: 'lfoot'
        }, region('lfoot'));
      });
      div({
        class: 'leftresize',
        'data-resize': 'leftResize'
      });
      return div({
        class: 'right dragtarget '
      }, drag, function() {
        div({
          id: 'drop-overlay'
        }, function() {
          return div({
            class: 'inner-overlay'
          }, function() {
            return div('Drop file here.');
          });
        });
        div({
          class: 'convhead'
        }, region('convhead'));
        div({
          class: 'main'
        }, region('main'), {
          onscroll: onScroll
        });
        div({
          class: 'maininfo'
        }, region('maininfo'));
        return div({
          class: 'foot'
        }, region('foot'));
      });
    });
    return attachListeners();
  });

  (function() {
    var id, lastVisibleMessage, ofs;
    id = ofs = null;
    lastVisibleMessage = function() {
      var bottom, i, last, len, m, ref, screl;
      // the viewport
      screl = document.querySelector('.main');
      // the pixel offset for the bottom of the viewport
      bottom = screl.scrollTop + screl.offsetHeight;
      // all messages
      last = null;
      ref = document.querySelectorAll('.message');
      for (i = 0, len = ref.length; i < len; i++) {
        m = ref[i];
        if (topof(m) < bottom) {
          last = m;
        }
      }
      return last;
    };
    exp.recordMainPos = function() {
      var el;
      el = lastVisibleMessage();
      id = el != null ? el.id : void 0;
      if (!(el && id)) {
        return;
      }
      return ofs = topof(el);
    };
    return exp.adjustMainPos = function() {
      var el, inserted, nofs, screl;
      if (!(id && ofs)) {
        return;
      }
      el = document.getElementById(id);
      nofs = topof(el);
      // the size of the inserted elements
      inserted = nofs - ofs;
      screl = document.querySelector('.main');
      screl.scrollTop = screl.scrollTop + inserted;
      // reset
      return id = ofs = null;
    };
  })();

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvYXBwbGF5b3V0LmpzIiwic291cmNlcyI6WyJ1aS92aWV3cy9hcHBsYXlvdXQuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0FBQUEsTUFBQSxRQUFBLEVBQUEsZUFBQSxFQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxjQUFBLEVBQUEsVUFBQSxFQUFBLFFBQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUEsUUFBQSxFQUFBOztFQUFBLENBQUEsQ0FBQyxRQUFELEVBQVcsS0FBWCxDQUFBLEdBQW9CLE9BQUEsQ0FBUSxTQUFSLENBQXBCOztFQUVBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxRQUFBLEdBQVc7O0VBQ1gsZUFBQSxHQUFrQixRQUFBLENBQUEsQ0FBQTtJQUNkLElBQVUsUUFBVjtBQUFBLGFBQUE7O0lBQ0EsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFdBQXhCLEVBQXFDLFVBQXJDO0lBQ0EsTUFBTSxDQUFDLGdCQUFQLENBQXdCLE9BQXhCLEVBQWlDLFVBQWpDO0lBQ0EsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFNBQXhCLEVBQW1DLFVBQW5DO1dBQ0EsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFNBQXhCLEVBQW1DLGNBQW5DO0VBTGM7O0VBT2xCLFVBQUEsR0FBYSxRQUFBLENBQVMsR0FBVCxFQUFjLFFBQUEsQ0FBQyxFQUFELENBQUEsRUFBQTs7Ozs7V0FLdkIsVUFBQSxDQUFXLFFBQUEsQ0FBQSxDQUFBO0FBQ2YsVUFBQTthQUFNLE1BQUEsQ0FBTyxVQUFQLHVDQUFrQyxJQUFJLENBQUMsR0FBTCxDQUFBLENBQWxDO0lBRFMsQ0FBWCxFQUVFLENBRkY7RUFMdUIsQ0FBZDs7RUFTYixjQUFBLEdBQWlCLFFBQUEsQ0FBQyxFQUFELENBQUE7SUFDYixJQUErQixFQUFFLENBQUMsTUFBTSxDQUFDLE9BQVYsS0FBcUIsVUFBcEQ7YUFBQSxNQUFB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QUFjLEVBQUEsSUFBTyxHQUFyQjtBQUFBLGVBQUE7O2FBQ0EsR0FBQSxHQUFNLEtBQUEsQ0FBTSxFQUFOO0lBSlU7V0FNcEIsR0FBRyxDQUFDLGFBQUosR0FBb0IsUUFBQSxDQUFBLENBQUE7QUFDeEIsVUFBQSxFQUFBLEVBQUEsUUFBQSxFQUFBLElBQUEsRUFBQTtNQUFRLE1BQWMsRUFBQSxJQUFPLElBQXJCO0FBQUEsZUFBQTs7TUFDQSxFQUFBLEdBQUssUUFBUSxDQUFDLGNBQVQsQ0FBd0IsRUFBeEI7TUFDTCxJQUFBLEdBQU8sS0FBQSxDQUFNLEVBQU4sRUFGZjs7TUFJUSxRQUFBLEdBQVcsSUFBQSxHQUFPO01BQ2xCLEtBQUEsR0FBUSxRQUFRLENBQUMsYUFBVCxDQUF1QixPQUF2QjtNQUNSLEtBQUssQ0FBQyxTQUFOLEdBQWtCLEtBQUssQ0FBQyxTQUFOLEdBQWtCLFNBTjVDOzthQVFRLEVBQUEsR0FBSyxHQUFBLEdBQU07SUFUSztFQW5CckIsQ0FBQTtBQXRISCIsInNvdXJjZXNDb250ZW50IjpbIlxue3Rocm90dGxlLCB0b3BvZn0gPSByZXF1aXJlICcuLi91dGlsJ1xuXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcblxuYXR0YWNoZWQgPSBmYWxzZVxuYXR0YWNoTGlzdGVuZXJzID0gLT5cbiAgICByZXR1cm4gaWYgYXR0YWNoZWRcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgb25BY3Rpdml0eVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdjbGljaycsIG9uQWN0aXZpdHlcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAna2V5ZG93bicsIG9uQWN0aXZpdHlcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAna2V5ZG93bicsIG5vSW5wdXRLZXlkb3duXG5cbm9uQWN0aXZpdHkgPSB0aHJvdHRsZSAxMDAsIChldikgLT5cbiAgICAjIFRoaXMgb2NjYXNpb25hbGx5IGhhcHBlbnMgdG8gZ2VuZXJhdGUgZXJyb3Igd2hlblxuICAgICPCoHVzZXIgY2xpY2tpbmcgaGFzIGdlbmVyYXRlZCBhbiBhcHBsaWNhdGlvbiBldmVudFxuICAgICMgdGhhdCBpcyBiZWluZyBoYW5kbGVkIHdoaWxlIHdlIGFsc28gcmVjZWl2ZSB0aGUgZXZlbnRcbiAgICAjIEN1cnJlbnQgZml4OiBkZWZlciB0aGUgYWN0aW9uIGdlbmVyYXRlZCBkdXJpbmcgdGhlIHVwZGF0ZVxuICAgIHNldFRpbWVvdXQgLT5cbiAgICAgIGFjdGlvbiAnYWN0aXZpdHknLCBldi50aW1lU3RhbXAgPyBEYXRlLm5vdygpXG4gICAgLCAxXG5cbm5vSW5wdXRLZXlkb3duID0gKGV2KSAtPlxuICAgIGFjdGlvbiAnbm9pbnB1dGtleWRvd24nLCBldiBpZiBldi50YXJnZXQudGFnTmFtZSAhPSAnVEVYVEFSRUEnXG5cbm9uU2Nyb2xsID0gdGhyb3R0bGUgMjAsIChldikgLT5cbiAgICBlbCA9IGV2LnRhcmdldFxuICAgIGNoaWxkID0gZWwuY2hpbGRyZW5bMF1cblxuICAgICMgY2FsY3VsYXRpb24gdG8gc2VlIHdoZXRoZXIgd2UgYXJlIGF0IHRoZSBib3R0b20gd2l0aCBhIHRvbGVyYW5jZSB2YWx1ZVxuICAgIGF0Ym90dG9tID0gKGVsLnNjcm9sbFRvcCArIGVsLm9mZnNldEhlaWdodCkgPj0gKGNoaWxkLm9mZnNldEhlaWdodCAtIDEwKVxuICAgIGFjdGlvbiAnYXRib3R0b20nLCBhdGJvdHRvbVxuXG4gICAgIyBjaGVjayB3aGV0aGVyIHdlIGFyZSBhdCB0aGUgdG9wIHdpdGggYSB0b2xlcmFuY2UgdmFsdWVcbiAgICBhdHRvcCA9IGVsLnNjcm9sbFRvcCA8PSAoZWwub2Zmc2V0SGVpZ2h0IC8gMilcbiAgICBhY3Rpb24gJ2F0dG9wJywgYXR0b3BcblxuYWRkQ2xhc3MgPSAoZWwsIGNsKSAtPlxuICAgIHJldHVybiB1bmxlc3MgZWxcbiAgICByZXR1cm4gaWYgUmVnRXhwKFwiXFxcXHMqI3tjbH1cIikuZXhlYyBlbC5jbGFzc05hbWVcbiAgICBlbC5jbGFzc05hbWUgKz0gaWYgZWwuY2xhc3NOYW1lIHRoZW4gXCIgI3tjbH1cIiBlbHNlIGNsXG4gICAgZWxcblxucmVtb3ZlQ2xhc3MgPSAoZWwsIGNsKSAtPlxuICAgIHJldHVybiB1bmxlc3MgZWxcbiAgICBlbC5jbGFzc05hbWUgPSBlbC5jbGFzc05hbWUucmVwbGFjZSBSZWdFeHAoXCJcXFxccyoje2NsfVwiKSwgJydcbiAgICBlbFxuXG5jbG9zZXN0ID0gKGVsLCBjbCkgLT5cbiAgICByZXR1cm4gdW5sZXNzIGVsXG4gICAgY2wgPSBSZWdFeHAoXCJcXFxccyoje2NsfVwiKSB1bmxlc3MgY2wgaW5zdGFuY2VvZiBSZWdFeHBcbiAgICBpZiBlbC5jbGFzc05hbWUubWF0Y2goY2wpIHRoZW4gZWwgZWxzZSBjbG9zZXN0KGVsLnBhcmVudE5vZGUsIGNsKVxuXG5kcmFnID0gZG8gLT5cblxuICAgIG9uZHJhZ292ZXIgPSBvbmRyYWdlbnRlciA9IChldikgLT5cbiAgICAgICAgIyB0aGlzIGVuYWJsZXMgZHJhZ2dpbmcgYXQgYWxsXG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgYWRkQ2xhc3MgY2xvc2VzdChldi50YXJnZXQsICdkcmFndGFyZ2V0JyksICdkcmFnb3ZlcidcbiAgICAgICAgcmVtb3ZlQ2xhc3MgY2xvc2VzdChldi50YXJnZXQsICdkcmFndGFyZ2V0JyksICdkcmFnLXRpbWVvdXQnXG4gICAgICAgIGV2LmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgb25kcm9wID0gKGV2KSAtPlxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHJlbW92ZUNsYXNzIGNsb3Nlc3QoZXYudGFyZ2V0LCAnZHJhZ3RhcmdldCcpLCAnZHJhZ292ZXInXG4gICAgICAgIHJlbW92ZUNsYXNzIGNsb3Nlc3QoZXYudGFyZ2V0LCAnZHJhZ3RhcmdldCcpLCAnZHJhZy10aW1lb3V0J1xuICAgICAgICBhY3Rpb24gJ3VwbG9hZGltYWdlJywgZXYuZGF0YVRyYW5zZmVyLmZpbGVzXG5cbiAgICBvbmRyYWdsZWF2ZSA9IChldikgLT5cbiAgICAgICAgIyBpdCB3YXMgZmlyaW5nIHRoZSBsZWF2ZSBldmVudCB3aGlsZSBkcmFnZ2luZywgaGFkIHRvXG4gICAgICAgICMgIHVzZSBhIHRpbWVvdXQgdG8gY2hlY2sgaWYgaXQgd2FzIGEgXCJyZWFsXCIgZXZlbnRcbiAgICAgICAgIyAgYnkgcmVtYWluaW5nIG91dFxuICAgICAgICBhZGRDbGFzcyBjbG9zZXN0KGV2LnRhcmdldCwgJ2RyYWd0YXJnZXQnKSwgJ2RyYWctdGltZW91dCdcbiAgICAgICAgc2V0VGltZW91dCAtPlxuICAgICAgICAgICAgaWYgY2xvc2VzdChldi50YXJnZXQsICdkcmFndGFyZ2V0JykuY2xhc3NMaXN0LmNvbnRhaW5zKCdkcmFnLXRpbWVvdXQnKVxuICAgICAgICAgICAgICAgIHJlbW92ZUNsYXNzIGNsb3Nlc3QoZXYudGFyZ2V0LCAnZHJhZ3RhcmdldCcpLCAnZHJhZ292ZXInXG4gICAgICAgICAgICAgICAgcmVtb3ZlQ2xhc3MgY2xvc2VzdChldi50YXJnZXQsICdkcmFndGFyZ2V0JyksICdkcmFnLXRpbWVvdXQnXG4gICAgICAgICwgMjAwXG5cbiAgICB7b25kcmFnb3Zlciwgb25kcmFnZW50ZXIsIG9uZHJvcCwgb25kcmFnbGVhdmV9XG5cblxucmVzaXplID0gZG8gLT5cbiAgICByeiA9IG51bGxcbiAgICB7XG4gICAgICAgIG9ubW91c2Vtb3ZlOiAoZXYpIC0+XG4gICAgICAgICAgICBpZiByeiBhbmQgZXYuYnV0dG9ucyAmIDFcbiAgICAgICAgICAgICAgICByeihldilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByeiA9IG51bGxcbiAgICAgICAgb25tb3VzZWRvd246IChldikgLT5cbiAgICAgICAgICAgIHJ6ID0gcmVzaXplcnNbZXYudGFyZ2V0LmRhdGFzZXQ/LnJlc2l6ZV1cbiAgICAgICAgb25tb3VzZXVwOiAoZXYpIC0+XG4gICAgICAgICAgICByeiA9IG51bGxcbiAgICB9XG5cbnJlc2l6ZXJzID1cbiAgICBsZWZ0UmVzaXplOiAoZXYpIC0+IGFjdGlvbiAnbGVmdHJlc2l6ZScsIChNYXRoLm1heCA5MCwgZXYuY2xpZW50WClcblxubW9kdWxlLmV4cG9ydHMgPSBleHAgPSBsYXlvdXQgLT5cbiAgICBwbGF0Zm9ybSA9IGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ2RhcndpbicgdGhlbiAnb3N4JyBlbHNlICcnXG4gICAgZGl2IGNsYXNzOidhcHBsYXlvdXQgJyArIHBsYXRmb3JtLCByZXNpemUsIHJlZ2lvbignbGFzdCcpLCAtPlxuICAgICAgICBkaXYgY2xhc3M6J2xlZnQnLCAtPlxuICAgICAgICAgICAgZGl2IGNsYXNzOidsaXN0aGVhZCcsIHJlZ2lvbignbGlzdGhlYWQnKVxuICAgICAgICAgICAgZGl2IGNsYXNzOidsaXN0JywgcmVnaW9uKCdsZWZ0JylcbiAgICAgICAgICAgIGRpdiBjbGFzczonbGZvb3QnLCByZWdpb24oJ2xmb290JylcbiAgICAgICAgZGl2IGNsYXNzOidsZWZ0cmVzaXplJywgJ2RhdGEtcmVzaXplJzonbGVmdFJlc2l6ZSdcbiAgICAgICAgZGl2IGNsYXNzOidyaWdodCBkcmFndGFyZ2V0ICcsIGRyYWcsIC0+XG4gICAgICAgICAgICBkaXYgaWQ6ICdkcm9wLW92ZXJsYXknLCAtPlxuICAgICAgICAgICAgICAgIGRpdiBjbGFzczogJ2lubmVyLW92ZXJsYXknLCAoKSAtPlxuICAgICAgICAgICAgICAgICAgICBkaXYgJ0Ryb3AgZmlsZSBoZXJlLidcbiAgICAgICAgICAgIGRpdiBjbGFzczonY29udmhlYWQnLCByZWdpb24oJ2NvbnZoZWFkJylcbiAgICAgICAgICAgIGRpdiBjbGFzczonbWFpbicsIHJlZ2lvbignbWFpbicpLCBvbnNjcm9sbDogb25TY3JvbGxcbiAgICAgICAgICAgIGRpdiBjbGFzczonbWFpbmluZm8nLCByZWdpb24oJ21haW5pbmZvJylcbiAgICAgICAgICAgIGRpdiBjbGFzczonZm9vdCcsIHJlZ2lvbignZm9vdCcpXG4gICAgYXR0YWNoTGlzdGVuZXJzKClcblxuXG5kbyAtPlxuICAgIGlkID0gb2ZzID0gbnVsbFxuXG4gICAgbGFzdFZpc2libGVNZXNzYWdlID0gLT5cbiAgICAgICAgIyB0aGUgdmlld3BvcnRcbiAgICAgICAgc2NyZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWFpbicpXG4gICAgICAgICMgdGhlIHBpeGVsIG9mZnNldCBmb3IgdGhlIGJvdHRvbSBvZiB0aGUgdmlld3BvcnRcbiAgICAgICAgYm90dG9tID0gc2NyZWwuc2Nyb2xsVG9wICsgc2NyZWwub2Zmc2V0SGVpZ2h0XG4gICAgICAgICMgYWxsIG1lc3NhZ2VzXG4gICAgICAgIGxhc3QgPSBudWxsXG4gICAgICAgIGxhc3QgPSBtIGZvciBtIGluIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5tZXNzYWdlJykgd2hlbiB0b3BvZihtKSA8IGJvdHRvbVxuICAgICAgICByZXR1cm4gbGFzdFxuXG4gICAgZXhwLnJlY29yZE1haW5Qb3MgPSAtPlxuICAgICAgICBlbCA9IGxhc3RWaXNpYmxlTWVzc2FnZSgpXG4gICAgICAgIGlkID0gZWw/LmlkXG4gICAgICAgIHJldHVybiB1bmxlc3MgZWwgYW5kIGlkXG4gICAgICAgIG9mcyA9IHRvcG9mIGVsXG5cbiAgICBleHAuYWRqdXN0TWFpblBvcyA9IC0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgaWQgYW5kIG9mc1xuICAgICAgICBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIGlkXG4gICAgICAgIG5vZnMgPSB0b3BvZiBlbFxuICAgICAgICAjIHRoZSBzaXplIG9mIHRoZSBpbnNlcnRlZCBlbGVtZW50c1xuICAgICAgICBpbnNlcnRlZCA9IG5vZnMgLSBvZnNcbiAgICAgICAgc2NyZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWFpbicpXG4gICAgICAgIHNjcmVsLnNjcm9sbFRvcCA9IHNjcmVsLnNjcm9sbFRvcCArIGluc2VydGVkXG4gICAgICAgICMgcmVzZXRcbiAgICAgICAgaWQgPSBvZnMgPSBudWxsXG4iXX0=
