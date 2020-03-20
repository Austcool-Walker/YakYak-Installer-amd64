(function() {
  var AGENT, Client, LOGIN_URL, Q, app, session;

  Client = require('hangupsjs');

  Q = require('q');

  ({session} = require('electron'));

  app = require('electron').app;

  // Current programmatic login workflow is described here
  // https://github.com/tdryer/hangups/issues/260#issuecomment-246578670
  LOGIN_URL = "https://accounts.google.com/o/oauth2/programmatic_auth?hl=en&scope=https%3A%2F%2Fwww.google.com%2Faccounts%2FOAuthLogin+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&client_id=936475272427.apps.googleusercontent.com&access_type=offline&delegated_client_id=183697946088-m3jnlsqshjhh5lbvg05k46q1k4qqtrgn.apps.googleusercontent.com&top_level_cookie=1";

  // Hack the user agent so this works again
  // Credit to https://github.com/yakyak/yakyak/issues/1087#issuecomment-565170640

  // WARN:: This should be removed in the long term.
  AGENT = app.userAgentFallback.replace('Chrome', 'Chromium');

  // promise for one-time oauth token
  module.exports = function(mainWindow) {
    return Q.Promise(function(rs) {
      var onDidFinishLoad, options;
      mainWindow.webContents.on('did-finish-load', onDidFinishLoad = function() {
        var url;
        // the url that just finished loading
        url = mainWindow.getURL();
        console.log('login: did-finish-load', url);
        if (url.indexOf('/o/oauth2/programmatic_auth') > 0) {
          console.log('login: programmatic auth');
          // get the cookie from browser session, it has to be there
          return session.defaultSession.cookies.get({}).then(function(values = []) {
            var i, len, oauth_code, value;
            oauth_code = false;
            for (i = 0, len = values.length; i < len; i++) {
              value = values[i];
              if (value.name === 'oauth_code') {
                oauth_code = value.value;
              }
            }
            if (oauth_code) {
              return rs(oauth_code);
            }
          }).catch(function(err) {
            return console.log('login: ERROR retrieving cookies::', err);
          });
        }
      });
      // redirect to google oauth
      options = {
        "userAgent": AGENT
      };
      return mainWindow.loadURL(LOGIN_URL, options);
    });
  };

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VzIjpbImxvZ2luLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEVBQUEsQ0FBQSxFQUFBLEdBQUEsRUFBQTs7RUFBQSxNQUFBLEdBQVMsT0FBQSxDQUFRLFdBQVI7O0VBQ1QsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxHQUFSOztFQUNKLENBQUEsQ0FBQyxPQUFELENBQUEsR0FBWSxPQUFBLENBQVEsVUFBUixDQUFaOztFQUNBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDLElBSDFCOzs7O0VBT0EsU0FBQSxHQUFZLHlXQVBaOzs7Ozs7RUFhQSxLQUFBLEdBQVEsR0FBRyxDQUFDLGlCQUNSLENBQUMsT0FERyxDQUNLLFFBREwsRUFDZSxVQURmLEVBYlI7OztFQWlCQSxNQUFNLENBQUMsT0FBUCxHQUFpQixRQUFBLENBQUMsVUFBRCxDQUFBO1dBQWdCLENBQUMsQ0FBQyxPQUFGLENBQVUsUUFBQSxDQUFDLEVBQUQsQ0FBQTtBQUUzQyxVQUFBLGVBQUEsRUFBQTtNQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBdkIsQ0FBMEIsaUJBQTFCLEVBQTZDLGVBQUEsR0FBa0IsUUFBQSxDQUFBLENBQUE7QUFFbkUsWUFBQSxHQUFBOztRQUNRLEdBQUEsR0FBTSxVQUFVLENBQUMsTUFBWCxDQUFBO1FBQ04sT0FBTyxDQUFDLEdBQVIsQ0FBWSx3QkFBWixFQUFzQyxHQUF0QztRQUVBLElBQUcsR0FBRyxDQUFDLE9BQUosQ0FBWSw2QkFBWixDQUFBLEdBQTZDLENBQWhEO1VBQ0ksT0FBTyxDQUFDLEdBQVIsQ0FBWSwwQkFBWixFQUFaOztpQkFFWSxPQUFPLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxHQUEvQixDQUFtQyxDQUFBLENBQW5DLENBQ0EsQ0FBQyxJQURELENBQ00sUUFBQSxDQUFDLFNBQU8sRUFBUixDQUFBO0FBQ2xCLGdCQUFBLENBQUEsRUFBQSxHQUFBLEVBQUEsVUFBQSxFQUFBO1lBQWdCLFVBQUEsR0FBYTtZQUNiLEtBQUEsd0NBQUE7O2NBQ0ksSUFBRyxLQUFLLENBQUMsSUFBTixLQUFjLFlBQWpCO2dCQUNJLFVBQUEsR0FBYSxLQUFLLENBQUMsTUFEdkI7O1lBREo7WUFHQSxJQUFrQixVQUFsQjtxQkFBQSxFQUFBLENBQUcsVUFBSCxFQUFBOztVQUxFLENBRE4sQ0FPQSxDQUFDLEtBUEQsQ0FPTyxRQUFBLENBQUMsR0FBRCxDQUFBO21CQUNILE9BQU8sQ0FBQyxHQUFSLENBQVksbUNBQVosRUFBaUQsR0FBakQ7VUFERyxDQVBQLEVBSEo7O01BTjJELENBQS9ELEVBQUo7O01Bb0JJLE9BQUEsR0FBVTtRQUFDLFdBQUEsRUFBYTtNQUFkO2FBQ1YsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsU0FBbkIsRUFBOEIsT0FBOUI7SUF2QnVDLENBQVY7RUFBaEI7QUFqQmpCIiwic291cmNlc0NvbnRlbnQiOlsiQ2xpZW50ID0gcmVxdWlyZSAnaGFuZ3Vwc2pzJ1xuUSA9IHJlcXVpcmUgJ3EnXG57c2Vzc2lvbn0gPSByZXF1aXJlKCdlbGVjdHJvbicpXG5hcHAgPSByZXF1aXJlKCdlbGVjdHJvbicpLmFwcFxuXG4jIEN1cnJlbnQgcHJvZ3JhbW1hdGljIGxvZ2luIHdvcmtmbG93IGlzIGRlc2NyaWJlZCBoZXJlXG4jIGh0dHBzOi8vZ2l0aHViLmNvbS90ZHJ5ZXIvaGFuZ3Vwcy9pc3N1ZXMvMjYwI2lzc3VlY29tbWVudC0yNDY1Nzg2NzBcbkxPR0lOX1VSTCA9IFwiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tL28vb2F1dGgyL3Byb2dyYW1tYXRpY19hdXRoP2hsPWVuJnNjb3BlPWh0dHBzJTNBJTJGJTJGd3d3Lmdvb2dsZS5jb20lMkZhY2NvdW50cyUyRk9BdXRoTG9naW4raHR0cHMlM0ElMkYlMkZ3d3cuZ29vZ2xlYXBpcy5jb20lMkZhdXRoJTJGdXNlcmluZm8uZW1haWwmY2xpZW50X2lkPTkzNjQ3NTI3MjQyNy5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSZhY2Nlc3NfdHlwZT1vZmZsaW5lJmRlbGVnYXRlZF9jbGllbnRfaWQ9MTgzNjk3OTQ2MDg4LW0zam5sc3FzaGpoaDVsYnZnMDVrNDZxMWs0cXF0cmduLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJnRvcF9sZXZlbF9jb29raWU9MVwiXG5cbiMgSGFjayB0aGUgdXNlciBhZ2VudCBzbyB0aGlzIHdvcmtzIGFnYWluXG4jIENyZWRpdCB0byBodHRwczovL2dpdGh1Yi5jb20veWFreWFrL3lha3lhay9pc3N1ZXMvMTA4NyNpc3N1ZWNvbW1lbnQtNTY1MTcwNjQwXG4jXG4jIFdBUk46OiBUaGlzIHNob3VsZCBiZSByZW1vdmVkIGluIHRoZSBsb25nIHRlcm0uXG5BR0VOVCA9IGFwcC51c2VyQWdlbnRGYWxsYmFja1xuICAgIC5yZXBsYWNlKCdDaHJvbWUnLCAnQ2hyb21pdW0nKVxuXG4jIHByb21pc2UgZm9yIG9uZS10aW1lIG9hdXRoIHRva2VuXG5tb2R1bGUuZXhwb3J0cyA9IChtYWluV2luZG93KSAtPiBRLlByb21pc2UgKHJzKSAtPlxuXG4gICAgbWFpbldpbmRvdy53ZWJDb250ZW50cy5vbiAnZGlkLWZpbmlzaC1sb2FkJywgb25EaWRGaW5pc2hMb2FkID0gLT5cblxuICAgICAgICAjIHRoZSB1cmwgdGhhdCBqdXN0IGZpbmlzaGVkIGxvYWRpbmdcbiAgICAgICAgdXJsID0gbWFpbldpbmRvdy5nZXRVUkwoKVxuICAgICAgICBjb25zb2xlLmxvZyAnbG9naW46IGRpZC1maW5pc2gtbG9hZCcsIHVybFxuXG4gICAgICAgIGlmIHVybC5pbmRleE9mKCcvby9vYXV0aDIvcHJvZ3JhbW1hdGljX2F1dGgnKSA+IDBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nICdsb2dpbjogcHJvZ3JhbW1hdGljIGF1dGgnXG4gICAgICAgICAgICAjIGdldCB0aGUgY29va2llIGZyb20gYnJvd3NlciBzZXNzaW9uLCBpdCBoYXMgdG8gYmUgdGhlcmVcbiAgICAgICAgICAgIHNlc3Npb24uZGVmYXVsdFNlc3Npb24uY29va2llcy5nZXQoe30pXG4gICAgICAgICAgICAudGhlbiAodmFsdWVzPVtdKSAtPlxuICAgICAgICAgICAgICAgIG9hdXRoX2NvZGUgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGZvciB2YWx1ZSBpbiB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgaWYgdmFsdWUubmFtZSBpcyAnb2F1dGhfY29kZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIG9hdXRoX2NvZGUgPSB2YWx1ZS52YWx1ZVxuICAgICAgICAgICAgICAgIHJzKG9hdXRoX2NvZGUpIGlmIG9hdXRoX2NvZGVcbiAgICAgICAgICAgIC5jYXRjaCAoZXJyKSAtPlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nICdsb2dpbjogRVJST1IgcmV0cmlldmluZyBjb29raWVzOjonLCBlcnJcblxuICAgICMgcmVkaXJlY3QgdG8gZ29vZ2xlIG9hdXRoXG4gICAgb3B0aW9ucyA9IHtcInVzZXJBZ2VudFwiOiBBR0VOVH1cbiAgICBtYWluV2luZG93LmxvYWRVUkwgTE9HSU5fVVJMLCBvcHRpb25zXG4iXX0=
