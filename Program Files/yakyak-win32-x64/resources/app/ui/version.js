(function() {
  var check, options, request, versionToInt;

  request = require('request');

  options = {
    headers: {
      'User-Agent': 'request'
    },
    url: 'https://api.github.com/repos/yakyak/yakyak/releases/latest'
  };

  versionToInt = function(version) {
    var major, micro, minor;
    [major, minor, micro] = version.split('.');
    return version = (micro * Math.pow(10, 4)) + (minor * Math.pow(10, 8)) + (major * Math.pow(10, 12));
  };

  check = function() {
    return request.get(options, function(err, res, body) {
      var higherVersionAvailable, localVersion, releasedVersion, tag, versionAdvertised;
      if (err) {
        return console.log(err);
      }
      body = JSON.parse(body);
      tag = body.tag_name;
      releasedVersion = tag != null ? tag.substr(1) : void 0; // remove first "v" char
      localVersion = require('electron').remote.require('electron').app.getVersion();
      versionAdvertised = window.localStorage.versionAdvertised || null;
      if ((releasedVersion != null) && (localVersion != null)) {
        higherVersionAvailable = versionToInt(releasedVersion) > versionToInt(localVersion);
        if (higherVersionAvailable && (releasedVersion !== versionAdvertised)) {
          window.localStorage.versionAdvertised = releasedVersion;
          notr({
            html: `A new YakYak version is available<br/>Please upgrade ${localVersion} to ${releasedVersion}<br/><i style=\"font-size: .9em; color: gray\">(click to dismiss)</i>`,
            stay: 0
          });
        }
        return console.log(`YakYak local version is ${localVersion}, released version is ${releasedVersion}`);
      }
    });
  };

  module.exports = {check, versionToInt};

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmVyc2lvbi5qcyIsInNvdXJjZXMiOlsidWkvdmVyc2lvbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0E7QUFBQSxNQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxFQUFBOztFQUFBLE9BQUEsR0FBVSxPQUFBLENBQVEsU0FBUjs7RUFFVixPQUFBLEdBQ0k7SUFBQSxPQUFBLEVBQ0U7TUFBQSxZQUFBLEVBQWM7SUFBZCxDQURGO0lBRUEsR0FBQSxFQUFLO0VBRkw7O0VBSUosWUFBQSxHQUFlLFFBQUEsQ0FBQyxPQUFELENBQUE7QUFDZixRQUFBLEtBQUEsRUFBQSxLQUFBLEVBQUE7SUFBSSxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsS0FBZixDQUFBLEdBQXdCLE9BQU8sQ0FBQyxLQUFSLENBQWMsR0FBZDtXQUN4QixPQUFBLEdBQVUsQ0FBQyxLQUFBLEdBQVEsSUFBSSxDQUFDLEdBQUwsQ0FBUyxFQUFULEVBQVksQ0FBWixDQUFULENBQUEsR0FBMkIsQ0FBQyxLQUFBLEdBQVEsSUFBSSxDQUFDLEdBQUwsQ0FBUyxFQUFULEVBQVksQ0FBWixDQUFULENBQTNCLEdBQXNELENBQUMsS0FBQSxHQUFRLElBQUksQ0FBQyxHQUFMLENBQVMsRUFBVCxFQUFZLEVBQVosQ0FBVDtFQUZyRDs7RUFJZixLQUFBLEdBQVEsUUFBQSxDQUFBLENBQUE7V0FDSixPQUFPLENBQUMsR0FBUixDQUFZLE9BQVosRUFBc0IsUUFBQSxDQUFDLEdBQUQsRUFBTSxHQUFOLEVBQVcsSUFBWCxDQUFBO0FBQzFCLFVBQUEsc0JBQUEsRUFBQSxZQUFBLEVBQUEsZUFBQSxFQUFBLEdBQUEsRUFBQTtNQUFRLElBQTBCLEdBQTFCO0FBQUEsZUFBTyxPQUFPLENBQUMsR0FBUixDQUFZLEdBQVosRUFBUDs7TUFDQSxJQUFBLEdBQU8sSUFBSSxDQUFDLEtBQUwsQ0FBVyxJQUFYO01BQ1AsR0FBQSxHQUFNLElBQUksQ0FBQztNQUNYLGVBQUEsaUJBQWtCLEdBQUcsQ0FBRSxNQUFMLENBQVksQ0FBWixXQUgxQjtNQUlRLFlBQUEsR0FBZSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUEzQixDQUFtQyxVQUFuQyxDQUE4QyxDQUFDLEdBQUcsQ0FBQyxVQUFuRCxDQUFBO01BQ2YsaUJBQUEsR0FBb0IsTUFBTSxDQUFDLFlBQVksQ0FBQyxpQkFBcEIsSUFBeUM7TUFDN0QsSUFBRyx5QkFBQSxJQUFvQixzQkFBdkI7UUFDSSxzQkFBQSxHQUF5QixZQUFBLENBQWEsZUFBYixDQUFBLEdBQWdDLFlBQUEsQ0FBYSxZQUFiO1FBQ3pELElBQUcsc0JBQUEsSUFBMkIsQ0FBQyxlQUFBLEtBQXFCLGlCQUF0QixDQUE5QjtVQUNJLE1BQU0sQ0FBQyxZQUFZLENBQUMsaUJBQXBCLEdBQXdDO1VBQ3hDLElBQUEsQ0FBSztZQUNELElBQUEsRUFBTSxDQUFBLHFEQUFBLENBQUEsQ0FBd0QsWUFBeEQsQ0FBQSxJQUFBLENBQUEsQ0FBMkUsZUFBM0UsQ0FBQSxxRUFBQSxDQURMO1lBRUQsSUFBQSxFQUFNO1VBRkwsQ0FBTCxFQUZKOztlQU1BLE9BQU8sQ0FBQyxHQUFSLENBQVksQ0FBQSx3QkFBQSxDQUFBLENBQTJCLFlBQTNCLENBQUEsc0JBQUEsQ0FBQSxDQUFnRSxlQUFoRSxDQUFBLENBQVosRUFSSjs7SUFQa0IsQ0FBdEI7RUFESTs7RUFrQlIsTUFBTSxDQUFDLE9BQVAsR0FBaUIsQ0FBQyxLQUFELEVBQVEsWUFBUjtBQTdCakIiLCJzb3VyY2VzQ29udGVudCI6WyJcbnJlcXVlc3QgPSByZXF1aXJlICdyZXF1ZXN0J1xuXG5vcHRpb25zID1cbiAgICBoZWFkZXJzOlxuICAgICAgJ1VzZXItQWdlbnQnOiAncmVxdWVzdCdcbiAgICB1cmw6ICdodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zL3lha3lhay95YWt5YWsvcmVsZWFzZXMvbGF0ZXN0J1xuXG52ZXJzaW9uVG9JbnQgPSAodmVyc2lvbikgLT5cbiAgICBbbWFqb3IsIG1pbm9yLCBtaWNyb10gPSB2ZXJzaW9uLnNwbGl0KCcuJylcbiAgICB2ZXJzaW9uID0gKG1pY3JvICogTWF0aC5wb3coMTAsNCkpICsgKG1pbm9yICogTWF0aC5wb3coMTAsOCkpICsgKG1ham9yICogTWF0aC5wb3coMTAsMTIpKVxuXG5jaGVjayA9ICgpLT5cbiAgICByZXF1ZXN0LmdldCBvcHRpb25zLCAgKGVyciwgcmVzLCBib2R5KSAtPlxuICAgICAgICByZXR1cm4gY29uc29sZS5sb2cgZXJyIGlmIGVyclxuICAgICAgICBib2R5ID0gSlNPTi5wYXJzZSBib2R5XG4gICAgICAgIHRhZyA9IGJvZHkudGFnX25hbWVcbiAgICAgICAgcmVsZWFzZWRWZXJzaW9uID0gdGFnPy5zdWJzdHIoMSkgIyByZW1vdmUgZmlyc3QgXCJ2XCIgY2hhclxuICAgICAgICBsb2NhbFZlcnNpb24gPSByZXF1aXJlKCdlbGVjdHJvbicpLnJlbW90ZS5yZXF1aXJlKCdlbGVjdHJvbicpLmFwcC5nZXRWZXJzaW9uKClcbiAgICAgICAgdmVyc2lvbkFkdmVydGlzZWQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLnZlcnNpb25BZHZlcnRpc2VkIG9yIG51bGxcbiAgICAgICAgaWYgcmVsZWFzZWRWZXJzaW9uPyAmJiBsb2NhbFZlcnNpb24/XG4gICAgICAgICAgICBoaWdoZXJWZXJzaW9uQXZhaWxhYmxlID0gdmVyc2lvblRvSW50KHJlbGVhc2VkVmVyc2lvbikgPiB2ZXJzaW9uVG9JbnQobG9jYWxWZXJzaW9uKVxuICAgICAgICAgICAgaWYgaGlnaGVyVmVyc2lvbkF2YWlsYWJsZSBhbmQgKHJlbGVhc2VkVmVyc2lvbiBpc250IHZlcnNpb25BZHZlcnRpc2VkKVxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UudmVyc2lvbkFkdmVydGlzZWQgPSByZWxlYXNlZFZlcnNpb25cbiAgICAgICAgICAgICAgICBub3RyIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogXCJBIG5ldyBZYWtZYWsgdmVyc2lvbiBpcyBhdmFpbGFibGU8YnIvPlBsZWFzZSB1cGdyYWRlICN7bG9jYWxWZXJzaW9ufSB0byAje3JlbGVhc2VkVmVyc2lvbn08YnIvPjxpIHN0eWxlPVxcXCJmb250LXNpemU6IC45ZW07IGNvbG9yOiBncmF5XFxcIj4oY2xpY2sgdG8gZGlzbWlzcyk8L2k+XCIsXG4gICAgICAgICAgICAgICAgICAgIHN0YXk6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyBcIllha1lhayBsb2NhbCB2ZXJzaW9uIGlzICN7bG9jYWxWZXJzaW9ufSwgcmVsZWFzZWQgdmVyc2lvbiBpcyAje3JlbGVhc2VkVmVyc2lvbn1cIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjaGVjaywgdmVyc2lvblRvSW50fVxuIl19
