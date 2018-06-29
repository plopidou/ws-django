(function(w,d){

var socket = new WebSocket(
    'ws://' + w.location.host + '/ws/'
);

})(window, document);