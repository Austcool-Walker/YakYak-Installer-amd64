(function() {
  module.exports = view(function(connection) {
    return div(function() {
      return pass(connection.infoText(), ' ', function() {
        if (connection.state === 'connect_failed') {
          span({
            class: 'material-icons'
          }, 'error_outline');
        }
        if (connection.state === 'connecting') {
          span({
            class: 'material-icons spin'
          }, 'donut_large');
        }
        if (connection.state === 'connected') {
          return span({
            class: 'material-icons'
          }, 'check_circle');
        }
      });
    });
  });

}).call(this);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkvdmlld3MvY29ubmluZm8uanMiLCJzb3VyY2VzIjpbInVpL3ZpZXdzL2Nvbm5pbmZvLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLElBQUEsQ0FBSyxRQUFBLENBQUMsVUFBRCxDQUFBO1dBQ3BCLEdBQUEsQ0FBSSxRQUFBLENBQUEsQ0FBQTthQUNGLElBQUEsQ0FBSyxVQUFVLENBQUMsUUFBWCxDQUFBLENBQUwsRUFBNEIsR0FBNUIsRUFBaUMsUUFBQSxDQUFBLENBQUE7UUFDL0IsSUFBZ0QsVUFBVSxDQUFDLEtBQVgsS0FBb0IsZ0JBQXBFO1VBQUEsSUFBQSxDQUFLO1lBQUEsS0FBQSxFQUFNO1VBQU4sQ0FBTCxFQUE2QixlQUE3QixFQUFBOztRQUNBLElBQW1ELFVBQVUsQ0FBQyxLQUFYLEtBQW9CLFlBQXZFO1VBQUEsSUFBQSxDQUFLO1lBQUEsS0FBQSxFQUFNO1VBQU4sQ0FBTCxFQUFrQyxhQUFsQyxFQUFBOztRQUNBLElBQStDLFVBQVUsQ0FBQyxLQUFYLEtBQW9CLFdBQW5FO2lCQUFBLElBQUEsQ0FBSztZQUFBLEtBQUEsRUFBTTtVQUFOLENBQUwsRUFBNkIsY0FBN0IsRUFBQTs7TUFIK0IsQ0FBakM7SUFERSxDQUFKO0VBRG9CLENBQUw7QUFBakIiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9IHZpZXcgKGNvbm5lY3Rpb24pIC0+XG4gIGRpdiAtPlxuICAgIHBhc3MgY29ubmVjdGlvbi5pbmZvVGV4dCgpLCAnICcsIC0+XG4gICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdlcnJvcl9vdXRsaW5lJyBpZiBjb25uZWN0aW9uLnN0YXRlID09ICdjb25uZWN0X2ZhaWxlZCdcbiAgICAgIHNwYW4gY2xhc3M6J21hdGVyaWFsLWljb25zIHNwaW4nLCAnZG9udXRfbGFyZ2UnIGlmIGNvbm5lY3Rpb24uc3RhdGUgPT0gJ2Nvbm5lY3RpbmcnXG4gICAgICBzcGFuIGNsYXNzOidtYXRlcmlhbC1pY29ucycsICdjaGVja19jaXJjbGUnIGlmIGNvbm5lY3Rpb24uc3RhdGUgPT0gJ2Nvbm5lY3RlZCdcbiJdfQ==
