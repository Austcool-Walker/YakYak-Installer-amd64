(function() {
  var Menu, Tray, compact, create, destroy, i18n, nativeImage, os, path, quit, tray, trayIcons, update;

  path = require('path');

  os = require('os');

  i18n = require('i18n');

  ({Menu, Tray, nativeImage} = require('electron').remote);

  if (os.platform() === 'darwin') {
    trayIcons = {
      "read": path.join(__dirname, '..', '..', 'icons', 'osx-icon-read-Template.png'),
      "unread": path.join(__dirname, '..', '..', 'icons', 'osx-icon-unread-Template.png')
    };
  } else if (process.env.XDG_CURRENT_DESKTOP && process.env.XDG_CURRENT_DESKTOP.match(/KDE/)) {
    // This is to work around a bug with electron apps + KDE not showing correct icon size.
    trayIcons = {
      "read": path.join(__dirname, '..', '..', 'icons', 'icon-read@20.png'),
      "unread": path.join(__dirname, '..', '..', 'icons', 'icon-unread@20.png')
    };
  } else {
    trayIcons = {
      "read": path.join(__dirname, '..', '..', 'icons', 'icon-read@8x.png'),
      "unread": path.join(__dirname, '..', '..', 'icons', 'icon-unread@8x.png')
    };
  }

  tray = null;

  // TODO: this is all WIP
  quit = function() {};

  compact = function(array) {
    var i, item, len, results;
    results = [];
    for (i = 0, len = array.length; i < len; i++) {
      item = array[i];
      if (item) {
        results.push(item);
      }
    }
    return results;
  };

  create = function() {
    tray = new Tray(trayIcons["read"]);
    tray.currentImage = 'read';
    tray.setToolTip(i18n.__('title:YakYak - Hangouts Client'));
    // Emitted when the tray icon is clicked
    return tray.on('click', function() {
      return action('togglewindow');
    });
  };

  destroy = function() {
    if (tray) {
      tray.destroy();
    }
    return tray = null;
  };

  update = function(unreadCount, viewstate) {
    var contextMenu, e, templateContextMenu;
    // update menu
    templateContextMenu = compact([
      {
        label: i18n.__('menu.view.tray.toggle_minimize:Toggle window show/hide'),
        click: function() {
          return action('togglewindow');
        }
      },
      {
        label: i18n.__("menu.view.tray.start_minimize:Start minimized to tray"),
        type: "checkbox",
        checked: viewstate.startminimizedtotray,
        click: function() {
          return action('togglestartminimizedtotray');
        }
      },
      {
        label: i18n.__('menu.view.notification.show:Show notifications'),
        type: "checkbox",
        checked: viewstate.showPopUpNotifications,
        // usage of already existing method and implements same logic
        //  as other toggle... methods
        click: function() {
          return action('showpopupnotifications',
      !viewstate.showPopUpNotifications);
        }
      },
      {
        label: i18n.__("menu.view.tray.close:Close to tray"),
        type: "checkbox",
        checked: viewstate.closetotray,
        click: function() {
          return action('toggleclosetotray');
        }
      },
      os.platform() === 'darwin' ? {
        label: i18n.__('menu.view.hide_dock:Hide Dock icon'),
        type: 'checkbox',
        checked: viewstate.hidedockicon,
        click: function() {
          return action('togglehidedockicon');
        }
      } : void 0,
      {
        label: i18n.__('menu.file.quit:Quit'),
        click: function() {
          return action('quit');
        }
      }
    ]);
    contextMenu = Menu.buildFromTemplate(templateContextMenu);
    tray.setContextMenu(contextMenu);
    try {
      // update icon
      if (unreadCount > 0) {
        if (tray.currentImage !== 'unread') {
          tray.setImage(trayIcons["unread"]);
        }
        return tray.currentImage = 'unread';
      } else {
        if (tray.currentImage !== 'read') {
          tray.setImage(trayIcons["read"]);
        }
        return tray.currentImage = 'read';
      }
    } catch (error) {
      e = error;
      return console.log('missing icons', e);
    }
  };

  module.exports = function({viewstate, conv}) {
    if (viewstate.showtray) {
      if (tray == null) {
        create();
      }
      return update(conv.unreadTotal(), viewstate);
    } else {
      if (tray) {
        return destroy();
      }
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvdHJheWljb24uanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL3RyYXlpY29uLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsTUFBQSxFQUFBLE9BQUEsRUFBQSxJQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxTQUFBLEVBQUE7O0VBQUEsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEVBQUEsR0FBTyxPQUFBLENBQVEsSUFBUjs7RUFDUCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBRVAsQ0FBQSxDQUFFLElBQUYsRUFBUSxJQUFSLEVBQWMsV0FBZCxDQUFBLEdBQThCLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUMsTUFBbEQ7O0VBRUEsSUFBRyxFQUFFLENBQUMsUUFBSCxDQUFBLENBQUEsS0FBaUIsUUFBcEI7SUFDSSxTQUFBLEdBQ0k7TUFBQSxNQUFBLEVBQVEsSUFBSSxDQUFDLElBQUwsQ0FBVSxTQUFWLEVBQXFCLElBQXJCLEVBQTJCLElBQTNCLEVBQWlDLE9BQWpDLEVBQTBDLDRCQUExQyxDQUFSO01BQ0EsUUFBQSxFQUFVLElBQUksQ0FBQyxJQUFMLENBQVUsU0FBVixFQUFxQixJQUFyQixFQUEyQixJQUEzQixFQUFpQyxPQUFqQyxFQUEwQyw4QkFBMUM7SUFEVixFQUZSO0dBQUEsTUFLSyxJQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQVosSUFBbUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFoQyxDQUFzQyxLQUF0QyxDQUF0Qzs7SUFFRCxTQUFBLEdBQ0U7TUFBQSxNQUFBLEVBQVEsSUFBSSxDQUFDLElBQUwsQ0FBVSxTQUFWLEVBQXFCLElBQXJCLEVBQTJCLElBQTNCLEVBQWlDLE9BQWpDLEVBQTBDLGtCQUExQyxDQUFSO01BQ0EsUUFBQSxFQUFV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J3BhdGgnXG5vcyAgID0gcmVxdWlyZSAnb3MnXG5pMThuID0gcmVxdWlyZSAnaTE4bidcblxueyBNZW51LCBUcmF5LCBuYXRpdmVJbWFnZSB9ID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5yZW1vdGVcblxuaWYgb3MucGxhdGZvcm0oKSA9PSAnZGFyd2luJ1xuICAgIHRyYXlJY29ucyA9XG4gICAgICAgIFwicmVhZFwiOiBwYXRoLmpvaW4gX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnaWNvbnMnLCAnb3N4LWljb24tcmVhZC1UZW1wbGF0ZS5wbmcnXG4gICAgICAgIFwidW5yZWFkXCI6IHBhdGguam9pbiBfX2Rpcm5hbWUsICcuLicsICcuLicsICdpY29ucycsICdvc3gtaWNvbi11bnJlYWQtVGVtcGxhdGUucG5nJ1xuXG5lbHNlIGlmIHByb2Nlc3MuZW52LlhER19DVVJSRU5UX0RFU0tUT1AgJiYgcHJvY2Vzcy5lbnYuWERHX0NVUlJFTlRfREVTS1RPUC5tYXRjaCgvS0RFLylcbiAgICAjIFRoaXMgaXMgdG8gd29yayBhcm91bmQgYSBidWcgd2l0aCBlbGVjdHJvbiBhcHBzICsgS0RFIG5vdCBzaG93aW5nIGNvcnJlY3QgaWNvbiBzaXplLlxuICAgIHRyYXlJY29ucyA9XG4gICAgICBcInJlYWRcIjogcGF0aC5qb2luIF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ2ljb25zJywgJ2ljb24tcmVhZEAyMC5wbmcnXG4gICAgICBcInVucmVhZFwiOiBwYXRoLmpvaW4gX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnaWNvbnMnLCAnaWNvbi11bnJlYWRAMjAucG5nJ1xuXG5lbHNlXG4gICAgdHJheUljb25zID1cbiAgICAgICAgXCJyZWFkXCI6IHBhdGguam9pbiBfX2Rpcm5hbWUsICcuLicsICcuLicsICdpY29ucycsICdpY29uLXJlYWRAOHgucG5nJ1xuICAgICAgICBcInVucmVhZFwiOiBwYXRoLmpvaW4gX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnaWNvbnMnLCAnaWNvbi11bnJlYWRAOHgucG5nJ1xuXG50cmF5ID0gbnVsbFxuXG4jIFRPRE86IHRoaXMgaXMgYWxsIFdJUFxucXVpdCA9IC0+XG5cbmNvbXBhY3QgPSAoYXJyYXkpIC0+IGl0ZW0gZm9yIGl0ZW0gaW4gYXJyYXkgd2hlbiBpdGVtXG5cbmNyZWF0ZSA9ICgpIC0+XG4gICAgdHJheSA9IG5ldyBUcmF5IHRyYXlJY29uc1tcInJlYWRcIl1cbiAgICB0cmF5LmN1cnJlbnRJbWFnZSA9ICdyZWFkJ1xuICAgIHRyYXkuc2V0VG9vbFRpcCBpMThuLl9fKCd0aXRsZTpZYWtZYWsgLSBIYW5nb3V0cyBDbGllbnQnKVxuICAgICMgRW1pdHRlZCB3aGVuIHRoZSB0cmF5IGljb24gaXMgY2xpY2tlZFxuICAgIHRyYXkub24gJ2NsaWNrJywgLT4gYWN0aW9uICd0b2dnbGV3aW5kb3cnXG5cbmRlc3Ryb3kgPSAtPlxuICAgIHRyYXkuZGVzdHJveSgpIGlmIHRyYXlcbiAgICB0cmF5ID0gbnVsbFxuXG51cGRhdGUgPSAodW5yZWFkQ291bnQsIHZpZXdzdGF0ZSkgLT5cbiAgICAjIHVwZGF0ZSBtZW51XG4gICAgdGVtcGxhdGVDb250ZXh0TWVudSA9IGNvbXBhY3QoW1xuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IGkxOG4uX18gJ21lbnUudmlldy50cmF5LnRvZ2dsZV9taW5pbWl6ZTpUb2dnbGUgd2luZG93IHNob3cvaGlkZSdcbiAgICAgICAgICBjbGljazogLT4gYWN0aW9uICd0b2dnbGV3aW5kb3cnXG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IGkxOG4uX18gXCJtZW51LnZpZXcudHJheS5zdGFydF9taW5pbWl6ZTpTdGFydCBtaW5pbWl6ZWQgdG8gdHJheVwiXG4gICAgICAgICAgdHlwZTogXCJjaGVja2JveFwiXG4gICAgICAgICAgY2hlY2tlZDogdmlld3N0YXRlLnN0YXJ0bWluaW1pemVkdG90cmF5XG4gICAgICAgICAgY2xpY2s6IC0+IGFjdGlvbiAndG9nZ2xlc3RhcnRtaW5pbWl6ZWR0b3RyYXknXG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IGkxOG4uX18gJ21lbnUudmlldy5ub3RpZmljYXRpb24uc2hvdzpTaG93IG5vdGlmaWNhdGlvbnMnXG4gICAgICAgICAgdHlwZTogXCJjaGVja2JveFwiXG4gICAgICAgICAgY2hlY2tlZDogdmlld3N0YXRlLnNob3dQb3BVcE5vdGlmaWNhdGlvbnNcbiAgICAgICAgICAjIHVzYWdlIG9mIGFscmVhZHkgZXhpc3RpbmcgbWV0aG9kIGFuZCBpbXBsZW1lbnRzIHNhbWUgbG9naWNcbiAgICAgICAgICAjICBhcyBvdGhlciB0b2dnbGUuLi4gbWV0aG9kc1xuICAgICAgICAgIGNsaWNrOiAtPiBhY3Rpb24gJ3Nob3dwb3B1cG5vdGlmaWNhdGlvbnMnLFxuICAgICAgICAgICAgICAhdmlld3N0YXRlLnNob3dQb3BVcE5vdGlmaWNhdGlvbnNcbiAgICAgICAgfVxuXG4gICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBpMThuLl9fIFwibWVudS52aWV3LnRyYXkuY2xvc2U6Q2xvc2UgdG8gdHJheVwiXG4gICAgICAgICAgICB0eXBlOiBcImNoZWNrYm94XCJcbiAgICAgICAgICAgIGNoZWNrZWQ6IHZpZXdzdGF0ZS5jbG9zZXRvdHJheVxuICAgICAgICAgICAgY2xpY2s6IC0+IGFjdGlvbiAndG9nZ2xlY2xvc2V0b3RyYXknXG4gICAgICAgIH1cblxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6IGkxOG4uX18gJ21lbnUudmlldy5oaWRlX2RvY2s6SGlkZSBEb2NrIGljb24nXG4gICAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICAgIGNoZWNrZWQ6IHZpZXdzdGF0ZS5oaWRlZG9ja2ljb25cbiAgICAgICAgICBjbGljazogLT4gYWN0aW9uICd0b2dnbGVoaWRlZG9ja2ljb24nXG4gICAgICAgIH0gaWYgb3MucGxhdGZvcm0oKSA9PSAnZGFyd2luJ1xuXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogaTE4bi5fXygnbWVudS5maWxlLnF1aXQ6UXVpdCcpLFxuICAgICAgICAgIGNsaWNrOiAtPiBhY3Rpb24gJ3F1aXQnXG4gICAgICAgIH1cbiAgICBdKVxuXG4gICAgY29udGV4dE1lbnUgPSBNZW51LmJ1aWxkRnJvbVRlbXBsYXRlIHRlbXBsYXRlQ29udGV4dE1lbnVcbiAgICB0cmF5LnNldENvbnRleHRNZW51IGNvbnRleHRNZW51XG5cbiAgICAjIHVwZGF0ZSBpY29uXG4gICAgdHJ5XG4gICAgICAgIGlmIHVucmVhZENvdW50ID4gMFxuICAgICAgICAgICAgdHJheS5zZXRJbWFnZSB0cmF5SWNvbnNbXCJ1bnJlYWRcIl0gdW5sZXNzIHRyYXkuY3VycmVudEltYWdlID09ICd1bnJlYWQnXG4gICAgICAgICAgICB0cmF5LmN1cnJlbnRJbWFnZSA9ICd1bnJlYWQnXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRyYXkuc2V0SW1hZ2UgdHJheUljb25zW1wicmVhZFwiXSB1bmxlc3MgdHJheS5jdXJyZW50SW1hZ2UgPT0gJ3JlYWQnXG4gICAgICAgICAgICB0cmF5LmN1cnJlbnRJbWFnZSA9ICdyZWFkJ1xuICAgIGNhdGNoIGVcbiAgICAgICAgY29uc29sZS5sb2cgJ21pc3NpbmcgaWNvbnMnLCBlXG5cblxubW9kdWxlLmV4cG9ydHMgPSAoe3ZpZXdzdGF0ZSwgY29udn0pIC0+XG4gICAgaWYgdmlld3N0YXRlLnNob3d0cmF5XG4gICAgICAgIGNyZWF0ZSgpIGlmIG5vdCB0cmF5P1xuICAgICAgICB1cGRhdGUoY29udi51bnJlYWRUb3RhbCgpLCB2aWV3c3RhdGUpXG4gICAgZWxzZVxuICAgICAgICBkZXN0cm95KCkgaWYgdHJheVxuIl19
