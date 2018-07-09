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
var get_scrollbar_width = function(){
    var scroll = d.createElement('div');
    scroll.classList.add('scroll-measure');
    d.querySelector('body').appendChild(scroll);
    // return w.innerWidth - d.documentElement.clientWidth;
    var width = scroll.offsetWidth - scroll.clientWidth;
    d.querySelector('body').removeChild(scroll);
    return width;
};
var scrollbar_width = get_scrollbar_width();
console.log(scrollbar_width);

// timer for websocket response times...
var socket_timer = d.createElement('p');
socket_timer.id = 'socket-timer';
d.querySelector('body').appendChild(socket_timer);

// overlayer for loading wait
var load_layer = d.createElement('div');
load_layer.id = 'load';
d.querySelector('body').appendChild(load_layer);

// container for messages pushed w/o any request
var messages = d.createElement('ul');
messages.id = 'messages';
d.querySelector('body').appendChild(messages);


var socket = new w.WebSocket(
    'ws://' + w.location.host + d.querySelector('body').dataset['wsnav']
);

socket.addEventListener('open', function(){
    // console.log('ws opened');

    /**
    send message
    encodeURIComponent:
    @ -> %40
    + -> %2B
    - -> -
    */
    var wsnav_send = function(path, mode, target){
        var id = Date.now();
        var message = [
            0,
            id,
            path,
            '!'+encodeURIComponent(mode),
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
        . - : insert at begin (prepend)
        . + : insert at end (append)
    markup to populate the targeted element
    */
    var wsnav_receive = function(message){
        //console.log(message);
        var type = message.shift();

        // response to a "page" request
        if(type === 1){
            var id = message.shift();
            var href = message.shift();
            var mode = decodeURIComponent(message.shift()).slice(1);
            var target = decodeURIComponent(message.shift());
            var markup = message.shift();
            console.log([type, id, href, mode, target]);

            // some other controls here
            var target_el =  d.querySelector(target);

            if( target_el && markup ){
                // replace
                if (mode == '@'){
                    target_el.innerHTML = markup;
                }
                // prepend
                else if (mode == '-'){
                    target_el.insertAdjacentHTML('afterbegin', markup);
                }
                // append
                else if (mode == '+'){
                    target_el.insertAdjacentHTML('beforeend', markup);
                }
                else{
                    return;
                }
                socket_timer.innerHTML = (Date.now() - id) + 'ms';
                wsnav_load_layer_hide();
            }
            else{
                return;
                // console no target specified
            }
        }
        // server push, directly targeted at element
        else if (type===2){
            //console.log(message);
            var mode = message.shift();
            var target = message.shift();
            var markup = message.shift();
            console.log([type, mode, target]);

            var target_el =  d.querySelector(target);

            if( target_el && markup ){
                // replace
                if (mode == '@'){
                    target_el.innerHTML = markup;
                }
                // prepend
                else if (mode == '-'){
                    target_el.insertAdjacentHTML('afterbegin', markup);
                }
                // append
                else if (mode == '+'){
                    target_el.insertAdjacentHTML('beforeend', markup);
                }
                else{
                    return;
                }
            }
            else{
                return;
                // console no target specified
            }

        }
    };

    /**
    parses the hash passed and if valid, fires the send()
    // format is #/path/to/page!@#main, for example
    */
    var wsnav_hash_parse = function(hash){
        hash = hash.split('!');

        var path = hash[0].replace(/#/g,'');
        hash[1] = decodeURIComponent(hash[1]);
        var mode = hash[1].substring(0,1);
        var target = decodeURIComponent(hash[1].slice(1));

        //console.log([path, mode, target]);
        if( path && mode && target ){
            wsnav_send(path, mode, target);
        }
        else{
            wsnav_load_layer_hide();
        }
    };
    /**
    updates the hash. this will be picked up by w.onhashchange below
    */
    var wsnav_hash_update = function(path, mode, target){
        w.location.hash = [
            path,
            '!',
            encodeURIComponent(mode),
            encodeURIComponent(target)
        ].join('');
    };

    socket.addEventListener('message', function(e){
        wsnav_receive(JSON.parse(e.data));
    });

    // listen to relevant clicks
    addEvent(d.querySelector('body'), 'click', function(e){
        var t = e.target;
        if( t.nodeName.toLowerCase() === 'a' && t.classList.contains('wsnav') ){
            e.preventDefault();
            wsnav_hash_update(t.pathname, t.dataset['wsmode'], t.dataset['wstarget']);
        }
    });

    var wsnav_load_layer_show = function(){
        load_layer.classList.add('on');
        var body = d.querySelector('body');
        body.classList.add('load');
        body.style.paddingRight = scrollbar_width + 'px';
    };
    var wsnav_load_layer_hide = function(){
        load_layer.classList.remove('on');
        var body = d.querySelector('body');
        body.classList.remove('load');
        body.style.paddingRight = '0';
    };

    // listen to initial load for hash in address bar
    var wsnav_hash_init = function(){
        wsnav_load_layer_show();
        wsnav_hash_parse(w.location.hash);
    };
    wsnav_hash_init();

    // on hash change, fire send
    w.onhashchange = function(){
        wsnav_load_layer_show();
        wsnav_hash_parse(w.location.hash);
    };
});

})(window, document);