(function() {
  var autosize, clearsImagePreview, clipboard, convertEmoji, cursorToEnd, emojiCategories, emojiSuggListIndex, history, historyBackup, historyIndex, historyLength, historyPush, historyWalk, insertTextAtCursor, isAltCtrlMeta, isModifierKey, lastConv, later, laterMaybeFocus, maybeFocus, messages, openByDefault, openEmoticonDrawer, preparemessage, scrollToBottom, setClass, toggleVisibility;

  autosize = require('autosize');

  clipboard = require('electron').clipboard;

  ({scrollToBottom, messages} = require('./messages'));

  ({later, toggleVisibility, convertEmoji, insertTextAtCursor} = require('../util'));

  isModifierKey = function(ev) {
    return ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey;
  };

  isAltCtrlMeta = function(ev) {
    return ev.altKey || ev.ctrlKey || ev.metaKey;
  };

  cursorToEnd = function(el) {
    return el.selectionStart = el.selectionEnd = el.value.length;
  };

  history = [];

  historyIndex = 0;

  historyLength = 100;

  historyBackup = "";

  historyPush = function(data) {
    history.push(data);
    if (history.length === historyLength) {
      history.shift();
    }
    return historyIndex = history.length;
  };

  historyWalk = function(el, offset) {
    var val;
    // if we are starting to dive into history be backup current message
    if (offset === -1 && historyIndex === history.length) {
      historyBackup = el.value;
    }
    historyIndex = historyIndex + offset;
    // constrain index
    if (historyIndex < 0) {
      historyIndex = 0;
    }
    if (historyIndex > history.length) {
      historyIndex = history.length;
    }
    // if don't have history value restore 'current message'
    val = history[historyIndex] || historyBackup;
    el.value = val;
    return setTimeout((function() {
      return cursorToEnd(el);
    }), 1);
  };

  lastConv = null;

  emojiCategories = require('./emojicategories');

  openByDefault = 'people';

  emojiSuggListIndex = -1;

  if (document.querySelectorAll('.emoji-sugg-container').length) {
    document.querySelectorAll('.emoji-sugg-container')[0].parentNode.removeChild(document.querySelectorAll('.emoji-sugg-container')[0]);
  }

  module.exports = view(function(models) {
    div({
      class: 'input'
    }, function() {
      div({
        id: 'preview-container'
      }, function() {
        div({
          class: 'close-me material-icons',
          onclick: function(e) {
            return clearsImagePreview();
          }
        }, function() {
          return span('');
        });
        return div({
          class: 'relative',
          onclick: function(e) {
            var element;
            console.log('going to upload preview image');
            element = document.getElementById("message-input");
            // send text
            return preparemessage(element);
          }
        }, function() {
          img({
            id: 'preview-img',
            src: ''
          });
          return div({
            class: 'after material-icons'
          }, function() {
            return span('send');
          });
        });
      });
      div({
        class: 'relative'
      }, function() {
        return div({
          id: 'emoji-container'
        }, function() {
          div({
            id: 'emoji-group-selector'
          }, function() {
            var glow, j, len1, name, range, results;
            results = [];
            for (j = 0, len1 = emojiCategories.length; j < len1; j++) {
              range = emojiCategories[j];
              name = range['title'];
              glow = '';
              if (name === openByDefault) {
                glow = 'glow';
              }
              results.push(span({
                id: name + '-button',
                title: name,
                class: 'emoticon ' + glow
              }, range['representation'], {
                onclick: (function(name) {
                  return function() {
                    console.log("Opening " + name);
                    return openEmoticonDrawer(name);
                  };
                })(name)
              }));
            }
            return results;
          });
          return div({
            class: 'emoji-selector'
          }, function() {
            var j, len1, name, range, results, visible;
            results = [];
            for (j = 0, len1 = emojiCategories.length; j < len1; j++) {
              range = emojiCategories[j];
              name = range['title'];
              visible = '';
              if (name === openByDefault) {
                visible = 'visible';
              }
              results.push(span({
                id: name,
                class: 'group-content ' + visible
              }, function() {
                var emoji, k, len2, ref, results1;
                ref = range['range'];
                results1 = [];
                for (k = 0, len2 = ref.length; k < len2; k++) {
                  emoji = ref[k];
                  if (emoji.indexOf("\u200d") >= 0) {
                    // FIXME For now, ignore characters that have the "glue" character in them;
                    // they don't render properly
                    continue;
                  }
                  results1.push(span({
                    class: 'emoticon'
                  }, emoji, {
                    onclick: (function(emoji) {
                      return function() {
                        var element;
                        element = document.getElementById("message-input");
                        return insertTextAtCursor(element, emoji);
                      };
                    })(emoji)
                  }));
                }
                return results1;
              }));
            }
            return results;
          });
        });
      });
      return div({
        class: 'input-container'
      }, function() {
        textarea({
          id: 'message-input',
          autofocus: true,
          placeholder: i18n.__('input.message:Message'),
          rows: 1
        }, '', {
          onDOMNodeInserted: function(e) {
            var ta;
            // at this point the node is still not inserted
            ta = e.target;
            later(function() {
              return autosize(ta);
            });
            return ta.addEventListener('autosize:resized', function() {
              // we do this because the autosizing sets the height to nothing
              // while measuring and that causes the messages scroll above to
              // move. by pinning the div of the outer holding div, we
              // are not moving the scroller.
              ta.parentNode.style.height = (ta.offsetHeight + 24) + 'px';
              if (messages != null) {
                return messages.scrollToBottom();
              }
            });
          },
          onkeydown: function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
              action('selectNextConv', -1);
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
              action('selectNextConv', +1);
            }
            if (!isModifierKey(e)) {
              if (e.keyCode === 27) {
                e.preventDefault();
                if (models.viewstate.showtray && !models.viewstate.escapeClearsInput) {
                  action('hideWindow');
                } else {
                  // must focus on field and then execute:
                  //  - select all text in input
                  //  - replace them with an empty string
                  document.getElementById("message-input").focus();
                  document.execCommand("selectAll", false);
                  document.execCommand("insertText", false, "");
                  // also remove image preview
                  clearsImagePreview();
                }
              }
              if (e.keyCode === 13) {
                e.preventDefault();
                preparemessage(e.target);
              }
              if (e.target.value === '') {
                if (e.key === 'ArrowUp') {
                  historyWalk(e.target, -1);
                }
                if (e.key === 'ArrowDown') {
                  historyWalk(e.target, +1);
                }
              }
            }
            if (!isAltCtrlMeta(e)) {
              return action('lastkeydown', Date.now());
            }
          },
          onkeyup: function(e) {
            var d, element, emojiInserted, emojiSuggItem, emojiSuggList, i, index, len, lenAfter, results, startSel, unicodeMap;
            //check for emojis after pressing space
            element = document.getElementById("message-input");
            unicodeMap = require('../emojishortcode');
            emojiSuggListIndex = -1;
            if (e.keyCode === 32) {
              // Converts emojicodes (e.g. :smile:, :-) ) to unicode
              if (models.viewstate.convertEmoji) {
                // get cursor position
                startSel = element.selectionStart;
                len = element.value.length;
                element.value = convertEmoji(element.value);
                // Set cursor position (otherwise it would go to end of inpu)
                lenAfter = element.value.length;
                element.selectionStart = startSel - (len - lenAfter);
                element.selectionEnd = element.selectionStart;
              }
            }
            // remove emoji suggestion wrapper each time
            if (document.querySelectorAll('.emoji-sugg-container').length) {
              document.querySelectorAll('.emoji-sugg-container')[0].parentNode.removeChild(document.querySelectorAll('.emoji-sugg-container')[0]);
            }
            if (element.value.length && models.viewstate.suggestEmoji) {
              index = 0;
              results = [];
              for (d in unicodeMap) {
                i = unicodeMap[d];
                // util function to know if a emoji is trying to be typed, to launch suggestion
                emojiInserted = function(emoji, text) {
                  var searchedText;
                  searchedText = text.substr(text.lastIndexOf(':'));
                  if (searchedText === ':' || searchedText.indexOf(':') === -1) {
                    return false;
                  }
                  return emoji.startsWith(searchedText) || emoji.indexOf(searchedText) > -1;
                };
                // Insert suggestion
                if (emojiInserted(d, element.value) && index < 5) {
                  emojiSuggList = document.querySelectorAll('.emoji-sugg-container')[0];
                  if (!emojiSuggList) {
                    emojiSuggList = document.createElement('ul');
                    emojiSuggList.className = 'emoji-sugg-container';
                    element.parentNode.appendChild(emojiSuggList);
                  }
                  index++;
                  emojiSuggItem = document.createElement('li');
                  emojiSuggItem.className = 'emoji-sugg';
                  emojiSuggItem.innerHTML = '<i>' + i + '</i>' + '<span>' + d + '</span>';
                  emojiSuggList.appendChild(emojiSuggItem);
                  emojiSuggItem.addEventListener('click', (function() {
                    var emojiValue, finalText;
                    emojiValue = this.querySelector('i').innerHTML;
                    finalText = document.getElementById('message-input').value.substr(0, document.getElementById('message-input').value.lastIndexOf(':')) + emojiValue;
                    document.getElementById('message-input').value = finalText;
                    if (document.querySelectorAll('.emoji-sugg-container').length) {
                      return document.querySelectorAll('.emoji-sugg-container')[0].parentNode.removeChild(document.querySelectorAll('.emoji-sugg-container')[0]);
                    }
                  }));
                  results.push(setTimeout(function() {
                    return emojiSuggList.classList.toggle('animate');
                  }));
                } else {
                  results.push(void 0);
                }
              }
              return results;
            }
          },
          onpaste: function(e) {
            return setTimeout(function() {
              if (!clipboard.readImage().isEmpty() && !clipboard.readText()) {
                return action('onpasteimage');
              }
            }, 2);
          }
        });
        return span({
          class: 'button-container'
        }, function() {
          return button({
            title: i18n.__('input.emoticons:Show emoticons'),
            onclick: function(ef) {
              document.querySelector('#emoji-container').classList.toggle('open');
              return scrollToBottom();
            }
          }, function() {
            return span({
              class: 'material-icons'
            }, "mood");
          });
        }, function() {
          button({
            title: i18n.__('input.image:Attach image'),
            onclick: function(ev) {
              return document.getElementById('attachFile').click();
            }
          }, function() {
            return span({
              class: 'material-icons'
            }, 'photo');
          });
          return input({
            type: 'file',
            id: 'attachFile',
            accept: '.jpg,.jpeg,.png,.gif',
            onchange: function(ev) {
              return action('uploadimage', ev.target.files);
            }
          });
        });
      });
    });
    // focus when switching convs
    if (lastConv !== models.viewstate.selectedConv) {
      lastConv = models.viewstate.selectedConv;
      return laterMaybeFocus();
    }
  });

  //suggestEmoji : added enter handle and tab handle to navigate and select emoji when suggested
  window.addEventListener('keydown', (function(e) {
    var el, j, len1, newText, ref;
    if (models.viewstate.suggestEmoji) {
      if (e.keyCode === 9 && document.querySelectorAll('.emoji-sugg-container')[0]) {
        emojiSuggListIndex++;
        if (emojiSuggListIndex === 5) {
          emojiSuggListIndex = 0;
        }
        ref = document.querySelectorAll('.emoji-sugg');
        for (j = 0, len1 = ref.length; j < len1; j++) {
          el = ref[j];
          el.classList.remove('activated');
        }
        if (document.querySelectorAll('.emoji-sugg')[emojiSuggListIndex]) {
          document.querySelectorAll('.emoji-sugg')[emojiSuggListIndex].classList.toggle('activated');
        }
      }
      if (e.keyCode === 13 && document.querySelectorAll('.emoji-sugg-container')[0] && emojiSuggListIndex !== -1) {
        newText = function(originalText) {
          var newEmoji;
          newEmoji = document.querySelectorAll('.emoji-sugg')[emojiSuggListIndex].querySelector('i').innerText;
          return originalText.substr(0, originalText.lastIndexOf(':')) + newEmoji;
        };
        e.preventDefault();
        return document.getElementById('message-input').value = newText(document.getElementById('message-input').value.trim());
      }
    }
  }).bind(this));

  clearsImagePreview = function() {
    var element;
    element = document.getElementById('preview-img');
    element.src = '';
    document.getElementById('attachFile').value = '';
    return document.querySelector('#preview-container').classList.remove('open');
  };

  laterMaybeFocus = function() {
    return later(maybeFocus);
  };

  maybeFocus = function() {
    var el, ref;
    // no active element? or not focusing something relevant...
    el = document.activeElement;
    if (!el || !((ref = el.nodeName) === 'INPUT' || ref === 'TEXTAREA')) {
      // steal it!!!
      el = document.querySelector('.input textarea');
      if (el) {
        return el.focus();
      }
    }
  };

  preparemessage = function(ev) {
    var element, img;
    if (models.viewstate.convertEmoji) {
      // before sending message, check for emoji
      element = document.getElementById("message-input");
      // Converts emojicodes (e.g. :smile:, :-) ) to unicode
      element.value = convertEmoji(element.value);
    }
    
    action('sendmessage', ev.value);
    
    // check if there is an image in preview
    img = document.getElementById("preview-img");
    if (img.getAttribute('src') !== '') {
      action('uploadpreviewimage');
    }
    
    document.querySelector('#emoji-container').classList.remove('open');
    historyPush(ev.value);
    ev.value = '';
    return autosize.update(ev);
  };

  handle('noinputkeydown', function(ev) {
    var el;
    el = document.querySelector('.input textarea');
    if (el && !isAltCtrlMeta(ev)) {
      return el.focus();
    }
  });

  openEmoticonDrawer = function(drawerName) {
    var j, len1, range, results, set;
    results = [];
    for (j = 0, len1 = emojiCategories.length; j < len1; j++) {
      range = emojiCategories[j];
      set = range['title'] === drawerName;
      setClass(set, document.querySelector('#' + range['title']), 'visible');
      results.push(setClass(set, document.querySelector('#' + range['title'] + '-button'), 'glow'));
    }
    return results;
  };

  setClass = function(boolean, element, className) {
    if (element === void 0 || element === null) {
      return console.error("Cannot set visibility for undefined variable");
    } else {
      if (boolean) {
        return element.classList.add(className);
      } else {
        return element.classList.remove(className);
      }
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvaW5wdXQuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2lucHV0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsUUFBQSxFQUFBLGtCQUFBLEVBQUEsU0FBQSxFQUFBLFlBQUEsRUFBQSxXQUFBLEVBQUEsZUFBQSxFQUFBLGtCQUFBLEVBQUEsT0FBQSxFQUFBLGFBQUEsRUFBQSxZQUFBLEVBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxXQUFBLEVBQUEsa0JBQUEsRUFBQSxhQUFBLEVBQUEsYUFBQSxFQUFBLFFBQUEsRUFBQSxLQUFBLEVBQUEsZUFBQSxFQUFBLFVBQUEsRUFBQSxRQUFBLEVBQUEsYUFBQSxFQUFBLGtCQUFBLEVBQUEsY0FBQSxFQUFBLGNBQUEsRUFBQSxRQUFBLEVBQUE7O0VBQUEsUUFBQSxHQUFXLE9BQUEsQ0FBUSxVQUFSOztFQUNYLFNBQUEsR0FBWSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztFQUNoQyxDQUFBLENBQUMsY0FBRCxFQUFpQixRQUFqQixDQUFBLEdBQTZCLE9BQUEsQ0FBUSxZQUFSLENBQTdCOztFQUNBLENBQUEsQ0FBQyxLQUFELEVBQVEsZ0JBQVIsRUFBMEIsWUFBMUIsRUFBd0Msa0JBQXhDLENBQUEsR0FBOEQsT0FBQSxDQUFRLFNBQVIsQ0FBOUQ7O0VBRUEsYUFBQSxHQUFnQixRQUFBLENBQUMsRUFBRCxDQUFBO1dBQVEsRUFBRSxDQUFDLE1BQUgsSUFBYSxFQUFFLENBQUMsT0FBaEIsSUFBMkIsRUFBRSxDQUFDLE9BQTlCLElBQXlDLEVBQUUsQ0FBQztFQUFwRDs7RUFDaEIsYUFBQSxHQUFnQixRQUFBLENBQUMsRUFBRCxDQUFBO1dBQVEsRUFBRSxDQUFDLE1BQUgsSUFBYSxFQUFFLENBQUMsT0FBaEIsSUFBMkIsRUFBRSxDQUFDO0VBQXRDOztFQUVoQixXQUFBLEdBQWMsUUFBQSxDQUFDLEVBQUQsQ0FBQTtXQUFRLEVBQUUsQ0FBQyxjQUFILEdBQW9CLEVBQUUsQ0FB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QUhKO09BSEo7O0VBRE87QUFqUlgiLCJzb3VyY2VzQ29udGVudCI6WyJhdXRvc2l6ZSA9IHJlcXVpcmUgJ2F1dG9zaXplJ1xuY2xpcGJvYXJkID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5jbGlwYm9hcmRcbntzY3JvbGxUb0JvdHRvbSwgbWVzc2FnZXN9ID0gcmVxdWlyZSAnLi9tZXNzYWdlcydcbntsYXRlciwgdG9nZ2xlVmlzaWJpbGl0eSwgY29udmVydEVtb2ppLCBpbnNlcnRUZXh0QXRDdXJzb3J9ID0gcmVxdWlyZSAnLi4vdXRpbCdcblxuaXNNb2RpZmllcktleSA9IChldikgLT4gZXYuYWx0S2V5IHx8IGV2LmN0cmxLZXkgfHwgZXYubWV0YUtleSB8fCBldi5zaGlmdEtleVxuaXNBbHRDdHJsTWV0YSA9IChldikgLT4gZXYuYWx0S2V5IHx8IGV2LmN0cmxLZXkgfHwgZXYubWV0YUtleVxuXG5jdXJzb3JUb0VuZCA9IChlbCkgLT4gZWwuc2VsZWN0aW9uU3RhcnQgPSBlbC5zZWxlY3Rpb25FbmQgPSBlbC52YWx1ZS5sZW5ndGhcblxuaGlzdG9yeSA9IFtdXG5oaXN0b3J5SW5kZXggPSAwXG5oaXN0b3J5TGVuZ3RoID0gMTAwXG5oaXN0b3J5QmFja3VwID0gXCJcIlxuXG5oaXN0b3J5UHVzaCA9IChkYXRhKSAtPlxuICAgIGhpc3RvcnkucHVzaCBkYXRhXG4gICAgaWYgaGlzdG9yeS5sZW5ndGggPT0gaGlzdG9yeUxlbmd0aCB0aGVuIGhpc3Rvcnkuc2hpZnQoKVxuICAgIGhpc3RvcnlJbmRleCA9IGhpc3RvcnkubGVuZ3RoXG5cbmhpc3RvcnlXYWxrID0gKGVsLCBvZmZzZXQpIC0+XG4gICAgIyBpZiB3ZSBhcmUgc3RhcnRpbmcgdG8gZGl2ZSBpbnRvIGhpc3RvcnkgYmUgYmFja3VwIGN1cnJlbnQgbWVzc2FnZVxuICAgIGlmIG9mZnNldCBpcyAtMSBhbmQgaGlzdG9yeUluZGV4IGlzIGhpc3RvcnkubGVuZ3RoIHRoZW4gaGlzdG9yeUJhY2t1cCA9IGVsLnZhbHVlXG4gICAgaGlzdG9yeUluZGV4ID0gaGlzdG9yeUluZGV4ICsgb2Zmc2V0XG4gICAgIyBjb25zdHJhaW4gaW5kZXhcbiAgICBpZiBoaXN0b3J5SW5kZXggPCAwIHRoZW4gaGlzdG9yeUluZGV4ID0gMFxuICAgIGlmIGhpc3RvcnlJbmRleCA+IGhpc3RvcnkubGVuZ3RoIHRoZW4gaGlzdG9yeUluZGV4ID0gaGlzdG9yeS5sZW5ndGhcbiAgICAjIGlmIGRvbid0IGhhdmUgaGlzdG9yeSB2YWx1ZSByZXN0b3JlICdjdXJyZW50IG1lc3NhZ2UnXG4gICAgdmFsID0gaGlzdG9yeVtoaXN0b3J5SW5kZXhdIG9yIGhpc3RvcnlCYWNrdXBcbiAgICBlbC52YWx1ZSA9IHZhbFxuICAgIHNldFRpbWVvdXQgKC0+IGN1cnNvclRvRW5kIGVsKSwgMVxuXG5sYXN0Q29udiA9IG51bGxcblxuZW1vamlDYXRlZ29yaWVzID0gcmVxdWlyZSAnLi9lbW9qaWNhdGVnb3JpZXMnXG5vcGVuQnlEZWZhdWx0ID0gJ3Blb3BsZSdcbmVtb2ppU3VnZ0xpc3RJbmRleCA9IC0xXG5pZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZy1jb250YWluZXInKS5sZW5ndGhcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZy1jb250YWluZXInKVswXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpWzBdKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZpZXcgKG1vZGVscykgLT5cbiAgICBkaXYgY2xhc3M6J2lucHV0JywgLT5cbiAgICAgICAgZGl2IGlkOiAncHJldmlldy1jb250YWluZXInLCAtPlxuICAgICAgICAgICAgZGl2IGNsYXNzOiAnY2xvc2UtbWUgbWF0ZXJpYWwtaWNvbnMnXG4gICAgICAgICAgICAgICAgLCBvbmNsaWNrOiAoZSkgLT5cbiAgICAgICAgICAgICAgICAgICAgY2xlYXJzSW1hZ2VQcmV2aWV3KClcbiAgICAgICAgICAgICAgICAsIC0+XG4gICAgICAgICAgICAgICAgICAgIHNwYW4gJ+6XjSdcbiAgICAgICAgICAgIGRpdiBjbGFzczogJ3JlbGF0aXZlJ1xuICAgICAgICAgICAgICAgICwgb25jbGljazogKGUpIC0+XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nICdnb2luZyB0byB1cGxvYWQgcHJldmlldyBpbWFnZSdcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIFwibWVzc2FnZS1pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgICMgc2VuZCB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIHByZXBhcmVtZXNzYWdlIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAsIC0+XG4gICAgICAgICAgICAgICAgICAgIGltZyBpZDogJ3ByZXZpZXctaW1nJywgc3JjOiAnJ1xuICAgICAgICAgICAgICAgICAgICBkaXYgY2xhc3M6ICdhZnRlciBtYXRlcmlhbC1pY29ucydcbiAgICAgICAgICAgICAgICAgICAgICAgICwgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuICdzZW5kJ1xuXG4gICAgICAgIGRpdiBjbGFzczogJ3JlbGF0aXZlJywgLT5cbiAgICAgICAgICAgIGRpdiBpZDonZW1vamktY29udGFpbmVyJywgLT5cbiAgICAgICAgICAgICAgICBkaXYgaWQ6J2Vtb2ppLWdyb3VwLXNlbGVjdG9yJywgLT5cbiAgICAgICAgICAgICAgICAgICAgZm9yIHJhbmdlIGluIGVtb2ppQ2F0ZWdvcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IHJhbmdlWyd0aXRsZSddXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG93ID0gJydcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIG5hbWUgPT0gb3BlbkJ5RGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3cgPSAnZ2xvdydcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gaWQ6bmFtZSsnLWJ1dHRvbidcbiAgICAgICAgICAgICAgICAgICAgICAgICwgdGl0bGU6bmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgLCBjbGFzczonZW1vdGljb24gJyArIGdsb3dcbiAgICAgICAgICAgICAgICAgICAgICAgICwgcmFuZ2VbJ3JlcHJlc2VudGF0aW9uJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICwgb25jbGljazogZG8gKG5hbWUpIC0+IC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJPcGVuaW5nIFwiICsgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVuRW1vdGljb25EcmF3ZXIgbmFtZVxuXG4gICAgICAgICAgICAgICAgZGl2IGNsYXNzOidlbW9qaS1zZWxlY3RvcicsIC0+XG4gICAgICAgICAgICAgICAgICAgIGZvciByYW5nZSBpbiBlbW9qaUNhdGVnb3JpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSByYW5nZVsndGl0bGUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgdmlzaWJsZSA9ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBuYW1lID09IG9wZW5CeURlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlID0gJ3Zpc2libGUnXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gaWQ6bmFtZSwgY2xhc3M6J2dyb3VwLWNvbnRlbnQgJyArIHZpc2libGUsIC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIGVtb2ppIGluIHJhbmdlWydyYW5nZSddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGVtb2ppLmluZGV4T2YoXCJcXHUyMDBkXCIpID49IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgRklYTUUgRm9yIG5vdywgaWdub3JlIGNoYXJhY3RlcnMgdGhhdCBoYXZlIHRoZSBcImdsdWVcIiBjaGFyYWN0ZXIgaW4gdGhlbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgdGhleSBkb24ndCByZW5kZXIgcHJvcGVybHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J2Vtb3RpY29uJywgZW1vamlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLCBvbmNsaWNrOiBkbyAoZW1vamkpIC0+IC0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQgXCJtZXNzYWdlLWlucHV0XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydFRleHRBdEN1cnNvciBlbGVtZW50LCBlbW9qaVxuXG4gICAgICAgIGRpdiBjbGFzczonaW5wdXQtY29udGFpbmVyJywgLT5cbiAgICAgICAgICAgIHRleHRhcmVhIGlkOidtZXNzYWdlLWlucHV0JywgYXV0b2ZvY3VzOnRydWUsIHBsYWNlaG9sZGVyOiBpMThuLl9fKCdpbnB1dC5tZXNzYWdlOk1lc3NhZ2UnKSwgcm93czogMSwgJydcbiAgICAgICAgICAgICwgb25ET01Ob2RlSW5zZXJ0ZWQ6IChlKSAtPlxuICAgICAgICAgICAgICAgICMgYXQgdGhpcyBwb2ludCB0aGUgbm9kZSBpcyBzdGlsbCBub3QgaW5zZXJ0ZWRcbiAgICAgICAgICAgICAgICB0YSA9IGUudGFyZ2V0XG4gICAgICAgICAgICAgICAgbGF0ZXIgLT4gYXV0b3NpemUgdGFcbiAgICAgICAgICAgICAgICB0YS5hZGRFdmVudExpc3RlbmVyICdhdXRvc2l6ZTpyZXNpemVkJywgLT5cbiAgICAgICAgICAgICAgICAgICAgIyB3ZSBkbyB0aGlzIGJlY2F1c2UgdGhlIGF1dG9zaXppbmcgc2V0cyB0aGUgaGVpZ2h0IHRvIG5vdGhpbmdcbiAgICAgICAgICAgICAgICAgICAgIyB3aGlsZSBtZWFzdXJpbmcgYW5kIHRoYXQgY2F1c2VzIHRoZSBtZXNzYWdlcyBzY3JvbGwgYWJvdmUgdG9cbiAgICAgICAgICAgICAgICAgICAgIyBtb3ZlLiBieSBwaW5uaW5nIHRoZSBkaXYgb2YgdGhlIG91dGVyIGhvbGRpbmcgZGl2LCB3ZVxuICAgICAgICAgICAgICAgICAgICAjIGFyZSBub3QgbW92aW5nIHRoZSBzY3JvbGxlci5cbiAgICAgICAgICAgICAgICAgICAgdGEucGFyZW50Tm9kZS5zdHlsZS5oZWlnaHQgPSAodGEub2Zmc2V0SGVpZ2h0ICsgMjQpICsgJ3B4J1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcy5zY3JvbGxUb0JvdHRvbSgpIGlmIG1lc3NhZ2VzP1xuICAgICAgICAgICAgLCBvbmtleWRvd246IChlKSAtPlxuICAgICAgICAgICAgICAgIGlmIChlLm1ldGFLZXkgb3IgZS5jdHJsS2V5KSBhbmQgZS5rZXkgPT0gJ0Fycm93VXAnIHRoZW4gYWN0aW9uICdzZWxlY3ROZXh0Q29udicsIC0xXG4gICAgICAgICAgICAgICAgaWYgKGUubWV0YUtleSBvciBlLmN0cmxLZXkpIGFuZCBlLmtleSA9PSAnQXJyb3dEb3duJyB0aGVuIGFjdGlvbiAnc2VsZWN0TmV4dENvbnYnLCArMVxuICAgICAgICAgICAgICAgIHVubGVzcyBpc01vZGlmaWVyS2V5KGUpXG4gICAgICAgICAgICAgICAgICAgIGlmIGUua2V5Q29kZSA9PSAyN1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBtb2RlbHMudmlld3N0YXRlLnNob3d0cmF5ICYmICFtb2RlbHMudmlld3N0YXRlLmVzY2FwZUNsZWFyc0lucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICdoaWRlV2luZG93J1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgbXVzdCBmb2N1cyBvbiBmaWVsZCBhbmQgdGhlbiBleGVjdXRlOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICMgIC0gc2VsZWN0IGFsbCB0ZXh0IGluIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIyAgLSByZXBsYWNlIHRoZW0gd2l0aCBhbiBlbXB0eSBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1lc3NhZ2UtaW5wdXRcIikuZm9jdXMoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwic2VsZWN0QWxsXCIsIGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKFwiaW5zZXJ0VGV4dFwiLCBmYWxzZSwgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAjIGFsc28gcmVtb3ZlIGltYWdlIHByZXZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhcnNJbWFnZVByZXZpZXcoKVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIGUua2V5Q29kZSA9PSAxM1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVwYXJlbWVzc2FnZSBlLnRhcmdldFxuICAgICAgICAgICAgICAgICAgICBpZiBlLnRhcmdldC52YWx1ZSA9PSAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgZS5rZXkgaXMgJ0Fycm93VXAnIHRoZW4gaGlzdG9yeVdhbGsgZS50YXJnZXQsIC0xXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiBlLmtleSBpcyAnQXJyb3dEb3duJyB0aGVuIGhpc3RvcnlXYWxrIGUudGFyZ2V0LCArMVxuICAgICAgICAgICAgICAgIGFjdGlvbiAnbGFzdGtleWRvd24nLCBEYXRlLm5vdygpIHVubGVzcyBpc0FsdEN0cmxNZXRhKGUpXG4gICAgICAgICAgICAsIG9ua2V5dXA6IChlKSAtPlxuICAgICAgICAgICAgICAgICNjaGVjayBmb3IgZW1vamlzIGFmdGVyIHByZXNzaW5nIHNwYWNlXG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkIFwibWVzc2FnZS1pbnB1dFwiO1xuICAgICAgICAgICAgICAgIHVuaWNvZGVNYXAgPSByZXF1aXJlICcuLi9lbW9qaXNob3J0Y29kZSc7XG4gICAgICAgICAgICAgICAgZW1vamlTdWdnTGlzdEluZGV4ID0gLTE7XG4gICAgICAgICAgICAgICAgaWYgZS5rZXlDb2RlID09IDMyXG4gICAgICAgICAgICAgICAgICAgICMgQ29udmVydHMgZW1vamljb2RlcyAoZS5nLiA6c21pbGU6LCA6LSkgKSB0byB1bmljb2RlXG4gICAgICAgICAgICAgICAgICAgIGlmIG1vZGVscy52aWV3c3RhdGUuY29udmVydEVtb2ppXG4gICAgICAgICAgICAgICAgICAgICAgICAjIGdldCBjdXJzb3IgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0U2VsID0gZWxlbWVudC5zZWxlY3Rpb25TdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gZWxlbWVudC52YWx1ZS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudmFsdWUgPSBjb252ZXJ0RW1vamkoZWxlbWVudC52YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICMgU2V0IGN1cnNvciBwb3NpdGlvbiAob3RoZXJ3aXNlIGl0IHdvdWxkIGdvIHRvIGVuZCBvZiBpbnB1KVxuICAgICAgICAgICAgICAgICAgICAgICAgbGVuQWZ0ZXIgPSBlbGVtZW50LnZhbHVlLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZWxlY3Rpb25TdGFydCA9IHN0YXJ0U2VsIC0gKGxlbiAtIGxlbkFmdGVyKVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5zZWxlY3Rpb25FbmQgPSBlbGVtZW50LnNlbGVjdGlvblN0YXJ0XG4gICAgICAgICAgICAgICAgIyByZW1vdmUgZW1vamkgc3VnZ2VzdGlvbiB3cmFwcGVyIGVhY2ggdGltZVxuICAgICAgICAgICAgICAgIGlmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZy1jb250YWluZXInKVswXS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpWzBdKVxuICAgICAgICAgICAgICAgIGlmIGVsZW1lbnQudmFsdWUubGVuZ3RoICYmIG1vZGVscy52aWV3c3RhdGUuc3VnZ2VzdEVtb2ppXG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgIyByZWFkIGVtb2ppIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGZvciBkLCBpIG9mIHVuaWNvZGVNYXBcbiAgICAgICAgICAgICAgICAgICAgICAgICMgdXRpbCBmdW5jdGlvbiB0byBrbm93IGlmIGEgZW1vamkgaXMgdHJ5aW5nIHRvIGJlIHR5cGVkLCB0byBsYXVuY2ggc3VnZ2VzdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgZW1vamlJbnNlcnRlZCA9IChlbW9qaSwgdGV4dCkgLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hlZFRleHQgPSB0ZXh0LnN1YnN0cih0ZXh0Lmxhc3RJbmRleE9mKCc6JykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgc2VhcmNoZWRUZXh0ID09ICc6JyB8fMKgc2VhcmNoZWRUZXh0LmluZGV4T2YoJzonKSA9PSAtMVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZW1vamkuc3RhcnRzV2l0aChzZWFyY2hlZFRleHQpIHx8IGVtb2ppLmluZGV4T2Yoc2VhcmNoZWRUZXh0KSA+IC0xXG4gICAgICAgICAgICAgICAgICAgICAgICAjIEluc2VydCBzdWdnZXN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAgZW1vamlJbnNlcnRlZChkLCBlbGVtZW50LnZhbHVlKSAmJiBpbmRleCA8IDVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVN1Z2dMaXN0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmVtb2ppLXN1Z2ctY29udGFpbmVyJylbMF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAhZW1vamlTdWdnTGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVN1Z2dMaXN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVN1Z2dMaXN0LmNsYXNzTmFtZSA9ICdlbW9qaS1zdWdnLWNvbnRhaW5lcidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnROb2RlLmFwcGVuZENoaWxkKGVtb2ppU3VnZ0xpc3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXgrK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtb2ppU3VnZ0l0ZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1vamlTdWdnSXRlbS5jbGFzc05hbWUgPSAnZW1vamktc3VnZydcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVN1Z2dJdGVtLmlubmVySFRNTCA9ICc8aT4nICsgaSArICc8L2k+JyArICc8c3Bhbj4nICsgZCArICc8L3NwYW4+JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVN1Z2dMaXN0LmFwcGVuZENoaWxkKGVtb2ppU3VnZ0l0ZW0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1vamlTdWdnSXRlbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbW9qaVZhbHVlID0gdGhpcy5xdWVyeVNlbGVjdG9yKCdpJykuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaW5hbFRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVzc2FnZS1pbnB1dCcpLnZhbHVlLnN1YnN0cigwLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVzc2FnZS1pbnB1dCcpLnZhbHVlLmxhc3RJbmRleE9mKCc6JykpICsgZW1vamlWYWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVzc2FnZS1pbnB1dCcpLnZhbHVlID0gZmluYWxUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmVtb2ppLXN1Z2ctY29udGFpbmVyJylbMF0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZy1jb250YWluZXInKVswXSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpLT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1vamlTdWdnTGlzdC5jbGFzc0xpc3QudG9nZ2xlKCdhbmltYXRlJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAsIG9ucGFzdGU6IChlKSAtPlxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQgKCkgLT5cbiAgICAgICAgICAgICAgICAgICAgaWYgbm90IGNsaXBib2FyZC5yZWFkSW1hZ2UoKS5pc0VtcHR5KCkgYW5kIG5vdCBjbGlwYm9hcmQucmVhZFRleHQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uICdvbnBhc3RlaW1hZ2UnXG4gICAgICAgICAgICAgICAgLCAyXG5cbiAgICAgICAgICAgIHNwYW4gY2xhc3M6J2J1dHRvbi1jb250YWluZXInLCAtPlxuICAgICAgICAgICAgICAgIGJ1dHRvbiB0aXRsZTogaTE4bi5fXygnaW5wdXQuZW1vdGljb25zOlNob3cgZW1vdGljb25zJyksIG9uY2xpY2s6IChlZikgLT5cbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2Vtb2ppLWNvbnRhaW5lcicpLmNsYXNzTGlzdC50b2dnbGUoJ29wZW4nKVxuICAgICAgICAgICAgICAgICAgICBzY3JvbGxUb0JvdHRvbSgpXG4gICAgICAgICAgICAgICAgLCAtPlxuICAgICAgICAgICAgICAgICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsIFwibW9vZFwiXG4gICAgICAgICAgICAsIC0+XG4gICAgICAgICAgICAgICAgYnV0dG9uIHRpdGxlOiBpMThuLl9fKCdpbnB1dC5pbWFnZTpBdHRhY2ggaW1hZ2UnKSwgb25jbGljazogKGV2KSAtPlxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXR0YWNoRmlsZScpLmNsaWNrKClcbiAgICAgICAgICAgICAgICAsIC0+XG4gICAgICAgICAgICAgICAgICAgIHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zJywgJ3Bob3RvJ1xuICAgICAgICAgICAgICAgIGlucHV0IHR5cGU6J2ZpbGUnLCBpZDonYXR0YWNoRmlsZScsIGFjY2VwdDonLmpwZywuanBlZywucG5nLC5naWYnLCBvbmNoYW5nZTogKGV2KSAtPlxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24gJ3VwbG9hZGltYWdlJywgZXYudGFyZ2V0LmZpbGVzXG5cbiAgICAjIGZvY3VzIHdoZW4gc3dpdGNoaW5nIGNvbnZzXG4gICAgaWYgbGFzdENvbnYgIT0gbW9kZWxzLnZpZXdzdGF0ZS5zZWxlY3RlZENvbnZcbiAgICAgICAgbGFzdENvbnYgPSBtb2RlbHMudmlld3N0YXRlLnNlbGVjdGVkQ29udlxuICAgICAgICBsYXRlck1heWJlRm9jdXMoKVxuXG4jc3VnZ2VzdEVtb2ppIDogYWRkZWQgZW50ZXIgaGFuZGxlIGFuZCB0YWIgaGFuZGxlIHRvIG5hdmlnYXRlIGFuZCBzZWxlY3QgZW1vamkgd2hlbiBzdWdnZXN0ZWRcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKChlKSAtPlxuICAgIGlmIG1vZGVscy52aWV3c3RhdGUuc3VnZ2VzdEVtb2ppXG4gICAgICAgIGlmIGUua2V5Q29kZSA9PSA5ICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpWzBdXG4gICAgICAgICAgICBlbW9qaVN1Z2dMaXN0SW5kZXgrK1xuICAgICAgICAgICAgaWYgZW1vamlTdWdnTGlzdEluZGV4ID09IDVcbiAgICAgICAgICAgICAgICBlbW9qaVN1Z2dMaXN0SW5kZXggPSAwXG4gICAgICAgICAgICBmb3IgZWwgaW4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmVtb2ppLXN1Z2cnKVxuICAgICAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2YXRlZCcpXG4gICAgICAgICAgICBpZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZycpW2Vtb2ppU3VnZ0xpc3RJbmRleF1cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZycpW2Vtb2ppU3VnZ0xpc3RJbmRleF0uY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZhdGVkJylcbiAgICAgICAgaWYgZS5rZXlDb2RlID09IDEzICYmIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5lbW9qaS1zdWdnLWNvbnRhaW5lcicpWzBdICYmIGVtb2ppU3VnZ0xpc3RJbmRleCAhPSAtMVxuICAgICAgICAgICAgbmV3VGV4dCA9IChvcmlnaW5hbFRleHQpIC0+XG4gICAgICAgICAgICAgICAgbmV3RW1vamkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZW1vamktc3VnZycpW2Vtb2ppU3VnZ0xpc3RJbmRleF0ucXVlcnlTZWxlY3RvcignaScpLmlubmVyVGV4dFxuICAgICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbFRleHQuc3Vic3RyKDAsIG9yaWdpbmFsVGV4dC5sYXN0SW5kZXhPZignOicpKSArIG5ld0Vtb2ppO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2UtaW5wdXQnKS52YWx1ZSA9IG5ld1RleHQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lc3NhZ2UtaW5wdXQnKS52YWx1ZS50cmltKCkpXG4pLmJpbmQodGhpcykpXG5cbmNsZWFyc0ltYWdlUHJldmlldyA9IC0+XG4gICAgZWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkICdwcmV2aWV3LWltZydcbiAgICBlbGVtZW50LnNyYyA9ICcnXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2F0dGFjaEZpbGUnKS52YWx1ZSA9ICcnXG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXctY29udGFpbmVyJylcbiAgICAgICAgLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKVxuXG5sYXRlck1heWJlRm9jdXMgPSAtPiBsYXRlciBtYXliZUZvY3VzXG5cbm1heWJlRm9jdXMgPSAtPlxuICAgICMgbm8gYWN0aXZlIGVsZW1lbnQ/IG9yIG5vdCBmb2N1c2luZyBzb21ldGhpbmcgcmVsZXZhbnQuLi5cbiAgICBlbCA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnRcbiAgICBpZiAhZWwgb3Igbm90IChlbC5ub2RlTmFtZSBpbiBbJ0lOUFVUJywgJ1RFWFRBUkVBJ10pXG4gICAgICAgICMgc3RlYWwgaXQhISFcbiAgICAgICAgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW5wdXQgdGV4dGFyZWEnKVxuICAgICAgICBlbC5mb2N1cygpIGlmIGVsXG5cbnByZXBhcmVtZXNzYWdlID0gKGV2KSAtPlxuICAgIGlmIG1vZGVscy52aWV3c3RhdGUuY29udmVydEVtb2ppXG4gICAgICAgICMgYmVmb3JlIHNlbmRpbmcgbWVzc2FnZSwgY2hlY2sgZm9yIGVtb2ppXG4gICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCBcIm1lc3NhZ2UtaW5wdXRcIlxuICAgICAgICAjIENvbnZlcnRzIGVtb2ppY29kZXMgKGUuZy4gOnNtaWxlOiwgOi0pICkgdG8gdW5pY29kZVxuICAgICAgICBlbGVtZW50LnZhbHVlID0gY29udmVydEVtb2ppKGVsZW1lbnQudmFsdWUpXG4gICAgI1xuICAgIGFjdGlvbiAnc2VuZG1lc3NhZ2UnLCBldi52YWx1ZVxuICAgICNcbiAgICAjIGNoZWNrIGlmIHRoZXJlIGlzIGFuIGltYWdlIGluIHByZXZpZXdcbiAgICBpbWcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCBcInByZXZpZXctaW1nXCJcbiAgICBhY3Rpb24gJ3VwbG9hZHByZXZpZXdpbWFnZScgaWYgaW1nLmdldEF0dHJpYnV0ZSgnc3JjJykgIT0gJydcbiAgICAjXG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2Vtb2ppLWNvbnRhaW5lcicpLmNsYXNzTGlzdC5yZW1vdmUoJ29wZW4nKVxuICAgIGhpc3RvcnlQdXNoIGV2LnZhbHVlXG4gICAgZXYudmFsdWUgPSAnJ1xuICAgIGF1dG9zaXplLnVwZGF0ZSBldlxuXG5oYW5kbGUgJ25vaW5wdXRrZXlkb3duJywgKGV2KSAtPlxuICAgIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmlucHV0IHRleHRhcmVhJylcbiAgICBlbC5mb2N1cygpIGlmIGVsIGFuZCBub3QgaXNBbHRDdHJsTWV0YShldilcblxub3BlbkVtb3RpY29uRHJhd2VyID0gKGRyYXdlck5hbWUpIC0+XG4gICAgZm9yIHJhbmdlIGluIGVtb2ppQ2F0ZWdvcmllc1xuICAgICAgICBzZXQgPSAocmFuZ2VbJ3RpdGxlJ10gPT0gZHJhd2VyTmFtZSlcbiAgICAgICAgc2V0Q2xhc3Mgc2V0LCAoZG9jdW1lbnQucXVlcnlTZWxlY3RvciAnIycrcmFuZ2VbJ3RpdGxlJ10pLCAndmlzaWJsZSdcbiAgICAgICAgc2V0Q2xhc3Mgc2V0LCAoZG9jdW1lbnQucXVlcnlTZWxlY3RvciAnIycrcmFuZ2VbJ3RpdGxlJ10rJy1idXR0b24nKSwgJ2dsb3cnXG5cblxuc2V0Q2xhc3MgPSAoYm9vbGVhbiwgZWxlbWVudCwgY2xhc3NOYW1lKSAtPlxuICAgIGlmIGVsZW1lbnQgPT0gdW5kZWZpbmVkIG9yIGVsZW1lbnQgPT0gbnVsbFxuICAgICAgICBjb25zb2xlLmVycm9yIFwiQ2Fubm90IHNldCB2aXNpYmlsaXR5IGZvciB1bmRlZmluZWQgdmFyaWFibGVcIlxuICAgIGVsc2VcbiAgICAgICAgaWYgYm9vbGVhblxuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSlcbiJdfQ==
