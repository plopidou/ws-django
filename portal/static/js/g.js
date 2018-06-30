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
    // console.log('ws opened');

    /**
    send message
    */
    var wsnav_send = function(path, target, mode){
        var id = Date.now();
        var message = [
            id,
            path,
            mode,
            target
        ];
        socket.send(JSON.stringify(message));
    };

    /**
    listen to incoming messages
    receive:
    [id, href, target, mode, markup]
    id is used to get the DOM selection string
    href to update the window.hash
    target for querySelector
    mode for one of:
        . @ : replace html
        . - : insertbefore
        . + : insertafter
    markup to populate the targeted element
    */
    var wsnav_receive = function(message){
        var id = message[0];
        var href = message[1];
        var target = message[2];
        var mode = message[3];
        var markup = message[4];
        console.log(message);
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
    };

    /**
    parses the hash passed and if valid, fires the send()
    */
    var wsnav_parse_hash = function(hash){
        console.log(hash);
    };

    socket.addEventListener('message', function(e){
        wsnav_receive(JSON.parse(e.data));
    });

    // listen to relevant clicks
    addEvent(d.querySelector('body'), 'click', function(e){
        var t = e.target;
        if( t.nodeName.toLowerCase() === 'a' && t.classList.contains('wsnav') ){
            e.preventDefault();
            wsnav_send(t.pathname, t.dataset['wstarget'], t.dataset['wsmode']);
        }
    });

    // listen to initial load for hash in address bar
    // format is #/path/to/page@#main, for example
    var wsnav_hash_init = function(){
        wsnav_parse_hash(w.location.hash);
        /*
        hash = hash.split('!');
        var href = hash[0].replace(/#/g,'');
        var target = hash[1];
        if( href && target ){
            wsnav_send(href, target);
        }
        */
    };
    wsnav_hash_init();

    // on hash change, fire send
    w.onhashchange = function(){
        wsnav_parse_hash(w.location.hash);

    };
});

})(window, document);