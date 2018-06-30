(function(w,d){

var addEvent = function(object, type, callback){
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener){
        object.addEventListener(type, callback, false);
    }
    else if (object.attachEvent) {
        object.attachEvent('on' + type, callback);
    }
    else {
        object['on'+type] = callback;
    }
};

// timer for websocket response times...
var socket_timer = d.createElement('p');
socket_timer.id = 'socket-timer';
d.querySelector('body').appendChild(socket_timer);


var socket = new w.WebSocket(
    'ws://' + w.location.host + d.querySelector('body').dataset['wsnav']
);

socket.addEventListener('open', function(){
    console.log('ws opened');

    /**
    listen to incoming messages
    receive:
    [id, href, markup]
    id is used to get the DOM selection string
    href to update the window.hash
    markup to populate the targeted element
    */
    socket.addEventListener('message', function(e){
        var message = JSON.parse(e.data);
        var id = message[0];
        var href = message[1];
        var target = message[2];
        var mode = message[3];
        var markup = message[4];
        // take ref of navigation action and execute
        if( target ){
            //console.log('id found!');
            d.querySelector(target).innerHTML = markup;
            w.location.hash = [
                href,
                mode,
                target
            ].join('');
            socket_timer.innerHTML = (Date.now() - id) + 'ms';
        }
        else{
            // console no target specified
        }
    });

    var send_wsnav_message = function(path, mode, target){
        var id = Date.now();
        var message = [
            id,
            path,
            mode,
            target
        ];
        socket.send(JSON.stringify(message));
    };

    // listen to relevant clicks
    addEvent(d.querySelector('body'), 'click', function(e){
        var t = e.target;
        if( t.nodeName.toLowerCase() === 'a' && t.classList.contains('wsnav') ){
            e.preventDefault();
            send_wsnav_message(t.pathname, t.dataset['wsmode'], t.dataset['wstarget']);
        }
    });

    // listen to initial load for hash in address bar
    // format is #/path/to/page@#main, for example
    var initial_load_hash = function(hash){
        hash = hash.split('!');
        var href = hash[0].replace(/#/g,'');
        var target = hash[1];
        if( href && target ){
            send_wsnav_message(href, target);
        }
    };
    initial_load_hash(w.location.hash);
});

})(window, document);