(function() {
  var Menu, check, i18n, ipc, path, remote, versionToInt;

  ipc = require('electron').ipcRenderer;

  path = require('path');

  i18n = require('i18n');

  remote = require('electron').remote;

  Menu = remote.Menu;

  ({check, versionToInt} = require('../version'));

  module.exports = view(function(models) {
    var localVersion, releasedVersion, shouldUpdate;
    // simple context menu that can only copy
    remote.getCurrentWindow().webContents.on('context-menu', function(e, params) {
      var menuTemplate;
      e.preventDefault();
      menuTemplate = [
        {
          label: 'Copy',
          role: 'copy',
          enabled: params.editFlags.canCopy
        },
        {
          label: "Copy Link",
          visible: params.linkURL !== '' && params.mediaType === 'none',
          click: function() {
            if (process.platform === 'darwin') {
              return clipboard.writeBookmark(params.linkText,
        params.linkText);
            } else {
              return clipboard.writeText(params.linkText);
            }
          }
        }
      ];
      return Menu.buildFromTemplate(menuTemplate).popup(remote.getCurrentWindow());
    });
    
    // decide if should update
    localVersion = remote.require('electron').app.getVersion();
    releasedVersion = window.localStorage.versionAdvertised;
    shouldUpdate = (releasedVersion != null) && (localVersion != null) && versionToInt(releasedVersion) > versionToInt(localVersion);
    
    return div({
      class: 'about'
    }, function() {
      div(function() {
        return img({
          src: path.join(YAKYAK_ROOT_DIR, '..', 'icons', 'icon@8.png')
        });
      });
      div({
        class: 'name'
      }, function() {
        return h2(function() {
          span('YakYak v' + localVersion);
          if (!shouldUpdate) {
            return span({
              class: 'f-small f-no-bold'
            }, ' (latest)');
          }
        });
      });
      // TODO: if objects are undefined then it should check again on next
      //        time about window is opened
      //        releasedVersion = window.localStorage.versionAdvertised
      if (shouldUpdate) {
        div({
          class: 'update'
        }, function() {
          return span(i18n.__('menu.help.about.newer:A newer version is available, please upgrade from %s to %s', localVersion, releasedVersion));
        });
      }
      div({
        class: 'description'
      }, function() {
        return span(i18n.__('title:YakYak - Hangouts Client'));
      });
      div({
        class: 'license'
      }, function() {
        return span(function() {
          em(`${i18n.__('menu.help.about.license:License')}: `);
          return span('MIT');
        });
      });
      div({
        class: 'devs'
      }, function() {
        div(function() {
          h3(i18n.__('menu.help.about.authors:Main authors'));
          return ul(function() {
            li('Davide Bertola');
            return li('Martin Algesten');
          });
        });
        return div(function() {
          h3(i18n.__('menu.help.about.contributors:Contributors'));
          return ul(function() {
            li('David Banham');
            li('Max Kueng');
            li('Arnaud Riu');
            li('Austin Guevara');
            return li('André Veríssimo');
          });
        });
      });
      return div({
        class: 'home'
      }, function() {
        var href;
        href = "https://github.com/yakyak/yakyak";
        return a({
          href: href,
          onclick: function(ev) {
            var address;
            ev.preventDefault();
            address = ev.currentTarget.getAttribute('href');
            require('electron').shell.openExternal(address);
            return false;
          }
        }, href);
      });
    });
  });

  //$('document').on 'click', '.link-out', (ev)->


}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvYWJvdXQuanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2Fib3V0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsSUFBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLElBQUEsRUFBQSxNQUFBLEVBQUE7O0VBQUEsR0FBQSxHQUFPLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBQzNCLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsTUFBQSxHQUFTLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0VBQzdCLElBQUEsR0FBUyxNQUFNLENBQUM7O0VBRWhCLENBQUEsQ0FBQyxLQUFELEVBQVEsWUFBUixDQUFBLEdBQXdCLE9BQUEsQ0FBUSxZQUFSLENBQXhCOztFQUVBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLElBQUEsQ0FBSyxRQUFBLENBQUMsTUFBRCxDQUFBO0FBRXRCLFFBQUEsWUFBQSxFQUFBLGVBQUEsRUFBQSxZQUFBOztJQUNJLE1BQU0sQ0FBQyxnQkFBUCxDQUFBLENBQXlCLENBQUMsV0FBVyxDQUFDLEVBQXRDLENBQXlDLGNBQXpDLEVBQXlELFFBQUEsQ0FBQyxDQUFELEVBQUksTUFBSixDQUFBO0FBQzdELFVBQUE7TUFBUSxDQUFDLENBQUMsY0FBRixDQUFBO01BQ0EsWUFBQSxHQUFlO1FBQUM7VUFDWixLQUFBLEVBQU8sTUFESztVQUVaLElBQUEsRUFBTSxNQUZNO1VBR1osT0FBQSxFQUFTLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFIZCxDQUFEO1FBS2Y7VUFDSSxLQUFBLEVBQU8sV0FEWDtVQUVJLE9BQUEsRUFBUyxNQUFNLENBQUMsT0FBUCxLQUFrQixFQUFsQixJQUF5QixNQUFNLENBQUMsU0FBUCxLQUFvQixNQUYxRDtVQUdJLEtBQUEsRUFBTyxRQUFBLENBQUEsQ0FBQTtZQUNILElBQUcsT0FBTyxDQUFDLFFB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QkFDQSxFQUFBLENBQUcsaUJBQUg7VUFMRCxDQUFIO1FBRkEsQ0FBSjtNQU5lLENBQW5CO2FBY0EsR0FBQSxDQUFJO1FBQUEsS0FBQSxFQUFPO01BQVAsQ0FBSixFQUFtQixRQUFBLENBQUEsQ0FBQTtBQUMzQixZQUFBO1FBQVksSUFBQSxHQUFPO2VBQ1AsQ0FBQSxDQUFFO1VBQUEsSUFBQSxFQUFNLElBQU47VUFDQSxPQUFBLEVBQVMsUUFBQSxDQUFDLEVBQUQsQ0FBQTtBQUN2QixnQkFBQTtZQUFnQixFQUFFLENBQUMsY0FBSCxDQUFBO1lBQ0EsT0FBQSxHQUFVLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBakIsQ0FBOEIsTUFBOUI7WUFDVixPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDLEtBQUssQ0FBQyxZQUExQixDQUF1QyxPQUF2QzttQkFDQTtVQUpPO1FBRFQsQ0FBRixFQU1FLElBTkY7TUFGZSxDQUFuQjtJQW5DZ0IsQ0FBcEI7RUE3QmtCLENBQUw7O0VBUmpCOztBQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaXBjICA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbnBhdGggPSByZXF1aXJlICdwYXRoJ1xuaTE4biA9IHJlcXVpcmUgJ2kxOG4nXG5yZW1vdGUgPSByZXF1aXJlKCdlbGVjdHJvbicpLnJlbW90ZVxuTWVudSAgID0gcmVtb3RlLk1lbnVcblxue2NoZWNrLCB2ZXJzaW9uVG9JbnR9ID0gcmVxdWlyZSAnLi4vdmVyc2lvbidcblxubW9kdWxlLmV4cG9ydHMgPSB2aWV3IChtb2RlbHMpIC0+XG5cbiAgICAjIHNpbXBsZSBjb250ZXh0IG1lbnUgdGhhdCBjYW4gb25seSBjb3B5XG4gICAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKS53ZWJDb250ZW50cy5vbiAnY29udGV4dC1tZW51JywgKGUsIHBhcmFtcykgLT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIG1lbnVUZW1wbGF0ZSA9IFt7XG4gICAgICAgICAgICBsYWJlbDogJ0NvcHknXG4gICAgICAgICAgICByb2xlOiAnY29weSdcbiAgICAgICAgICAgIGVuYWJsZWQ6IHBhcmFtcy5lZGl0RmxhZ3MuY2FuQ29weVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcIkNvcHkgTGlua1wiXG4gICAgICAgICAgICB2aXNpYmxlOiBwYXJhbXMubGlua1VSTCAhPSAnJyBhbmQgcGFyYW1zLm1lZGlhVHlwZSA9PSAnbm9uZSdcbiAgICAgICAgICAgIGNsaWNrOiAoKSAtPlxuICAgICAgICAgICAgICAgIGlmIHByb2Nlc3MucGxhdGZvcm0gPT0gJ2RhcndpbidcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkXG4gICAgICAgICAgICAgICAgICAgIC53cml0ZUJvb2ttYXJrIHBhcmFtcy5saW5rVGV4dCwgcGFyYW1zLmxpbmtUZXh0XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmQud3JpdGVUZXh0IHBhcmFtcy5saW5rVGV4dFxuICAgICAgICB9XVxuICAgICAgICBNZW51LmJ1aWxkRnJvbVRlbXBsYXRlKG1lbnVUZW1wbGF0ZSkucG9wdXAgcmVtb3RlLmdldEN1cnJlbnRXaW5kb3coKVxuXG4gICAgI1xuICAgICMgZGVjaWRlIGlmIHNob3VsZCB1cGRhdGVcbiAgICBsb2NhbFZlcnNpb24gICAgPSByZW1vdGUucmVxdWlyZSgnZWxlY3Ryb24nKS5hcHAuZ2V0VmVyc2lvbigpXG4gICAgcmVsZWFzZWRWZXJzaW9uID0gd2luZG93LmxvY2FsU3RvcmFnZS52ZXJzaW9uQWR2ZXJ0aXNlZFxuICAgIHNob3VsZFVwZGF0ZSAgICA9IHJlbGVhc2VkVmVyc2lvbj8gJiYgbG9jYWxWZXJzaW9uPyAmJlxuICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb25Ub0ludChyZWxlYXNlZFZlcnNpb24pID4gdmVyc2lvblRvSW50KGxvY2FsVmVyc2lvbilcbiAgICAjXG4gICAgZGl2IGNsYXNzOiAnYWJvdXQnLCAtPlxuICAgICAgICBkaXYgLT5cbiAgICAgICAgICAgIGltZyBzcmM6IHBhdGguam9pbiBZQUtZQUtfUk9PVF9ESVIsICcuLicsICdpY29ucycsICdpY29uQDgucG5nJ1xuICAgICAgICBkaXYgY2xhc3M6ICduYW1lJywgLT5cbiAgICAgICAgICAgIGgyIC0+XG4gICAgICAgICAgICAgICAgc3BhbiAnWWFrWWFrIHYnICsgbG9jYWxWZXJzaW9uXG4gICAgICAgICAgICAgICAgc3BhbiBjbGFzczogJ2Ytc21hbGwgZi1uby1ib2xkJywgJyAobGF0ZXN0KScgdW5sZXNzIHNob3VsZFVwZGF0ZVxuICAgICAgICAjIFRPRE86IGlmIG9iamVjdHMgYXJlIHVuZGVmaW5lZCB0aGVuIGl0IHNob3VsZCBjaGVjayBhZ2FpbiBvbiBuZXh0XG4gICAgICAgICMgICAgICAgIHRpbWUgYWJvdXQgd2luZG93IGlzIG9wZW5lZFxuICAgICAgICAjICAgICAgICByZWxlYXNlZFZlcnNpb24gPSB3aW5kb3cubG9jYWxTdG9yYWdlLnZlcnNpb25BZHZlcnRpc2VkXG4gICAgICAgIGlmIHNob3VsZFVwZGF0ZVxuICAgICAgICAgICAgZGl2IGNsYXNzOiAndXBkYXRlJywgLT5cbiAgICAgICAgICAgICAgICBzcGFuIGkxOG4uX18oJ21lbnUuaGVscC5hYm91dC5uZXdlcjpBIG5ld2VyIHZlcnNpb24gaXMgYXZhaWxhYmxlLCBwbGVhc2UgdXBncmFkZSBmcm9tICVzIHRvICVzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIGxvY2FsVmVyc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAsIHJlbGVhc2VkVmVyc2lvbilcbiAgICAgICAgZGl2IGNsYXNzOiAnZGVzY3JpcHRpb24nLCAtPlxuICAgICAgICAgICAgc3BhbiBpMThuLl9fKCd0aXRsZTpZYWtZYWsgLSBIYW5nb3V0cyBDbGllbnQnKVxuICAgICAgICBkaXYgY2xhc3M6ICdsaWNlbnNlJywgLT5cbiAgICAgICAgICAgIHNwYW4gLT5cbiAgICAgICAgICAgICAgICBlbSBcIiN7aTE4bi5fXyAnbWVudS5oZWxwLmFib3V0LmxpY2Vuc2U6TGljZW5zZSd9OiBcIlxuICAgICAgICAgICAgICAgIHNwYW4gJ01JVCdcbiAgICAgICAgZGl2IGNsYXNzOiAnZGV2cycsIC0+XG4gICAgICAgICAgICBkaXYgLT5cbiAgICAgICAgICAgICAgICBoMyBpMThuLl9fKCdtZW51LmhlbHAuYWJvdXQuYXV0aG9yczpNYWluIGF1dGhvcnMnKVxuICAgICAgICAgICAgICAgIHVsIC0+XG4gICAgICAgICAgICAgICAgICAgIGxpICdEYXZpZGUgQmVydG9sYSdcbiAgICAgICAgICAgICAgICAgICAgbGkgJ01hcnRpbiBBbGdlc3RlbidcbiAgICAgICAgICAgIGRpdiAtPlxuICAgICAgICAgICAgICAgIGgzIGkxOG4uX18oJ21lbnUuaGVscC5hYm91dC5jb250cmlidXRvcnM6Q29udHJpYnV0b3JzJylcbiAgICAgICAgICAgICAgICB1bCAtPlxuICAgICAgICAgICAgICAgICAgICBsaSAnRGF2aWQgQmFuaGFtJ1xuICAgICAgICAgICAgICAgICAgICBsaSAnTWF4IEt1ZW5nJ1xuICAgICAgICAgICAgICAgICAgICBsaSAnQXJuYXVkIFJpdSdcbiAgICAgICAgICAgICAgICAgICAgbGkgJ0F1c3RpbiBHdWV2YXJhJ1xuICAgICAgICAgICAgICAgICAgICBsaSAnQW5kcsOpIFZlcsOtc3NpbW8nXG4gICAgICAgIGRpdiBjbGFzczogJ2hvbWUnLCAtPlxuICAgICAgICAgICAgaHJlZiA9IFwiaHR0cHM6Ly9naXRodWIuY29tL3lha3lhay95YWt5YWtcIlxuICAgICAgICAgICAgYSBocmVmOiBocmVmXG4gICAgICAgICAgICAsIG9uY2xpY2s6IChldikgLT5cbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgICAgYWRkcmVzcyA9IGV2LmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlICdocmVmJ1xuICAgICAgICAgICAgICAgIHJlcXVpcmUoJ2VsZWN0cm9uJykuc2hlbGwub3BlbkV4dGVybmFsIGFkZHJlc3NcbiAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgLCBocmVmXG5cbiMkKCdkb2N1bWVudCcpLm9uICdjbGljaycsICcubGluay1vdXQnLCAoZXYpLT5cbiNcbiJdfQ==
