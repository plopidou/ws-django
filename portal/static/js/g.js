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
// #########################################
// ########## DB / CACHE ##########
// #########################################
// see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB

/*
schema for cached pages:
{
    'rts': request timestamp,
    'ts': response timestamp,
    'q': querySelector expression,
    'h': the page href (used as main key index),
    'm': mode (@-+),
    'mk': markup
}
*/


const db_name = 'pages';
var db;
var online = w.navigator.onLine;
var cache_ttl = 10 * 60 * 1000;

// test init chain via promises
const db_init = function(){
    var promise = new Promise(function(resolve, reject){
        var indexedDB = w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB;
         // This line should only be needed if it is needed to support the object's constants for older browsers
        var IDBTransaction = w.IDBTransaction || w.webkitIDBTransaction || w.msIDBTransaction || {READ_WRITE: "readwrite"};
        var IDBKeyRange = w.IDBKeyRange || w.webkitIDBKeyRange || w.msIDBKeyRange;
        var db_request = indexedDB.open(db_name/*, 1*/);
        db_request.onerror = function(e){
            // console.log('Database error')
            // console.log(e);
            reject();
        };
        db_request.onsuccess = function(e){
            db_init(e);
        };
        db_request.onupgradeneeded = function(e){
            db_init(e);
        };
        var db_init = function(e){
            db = e.target.result;
            // indexedDB events bubbles, so: request -> transactions -> db
            db.onerror = function(e){
                console.log('Database error')
                console.log(e);
            };
            console.log(db);
        };
        resolve(db);
    });
    return promise;
};



// #########################################
// ########## UI ##########
// #########################################

var body = d.querySelector('body'),
    load_layer,
    scrollbar_width,
    socket_timer,
    messages;

const ui_init = function(){
    var promise = new Promise(function(resolve, reject){

        // get scrollbar width for overflow on/off
        const get_scrollbar_width = function(){
            var scroll = d.createElement('div');
            scroll.classList.add('scroll-measure');
            d.querySelector('body').appendChild(scroll);
            var width = scroll.offsetWidth - scroll.clientWidth;
            d.querySelector('body').removeChild(scroll);
            return width;
        };
        scrollbar_width = get_scrollbar_width();
        // console.log(scrollbar_width);

        // timer for websocket response times...
        socket_timer = d.createElement('p');
        socket_timer.id = 'socket-timer';
        d.querySelector('body').appendChild(socket_timer);

        // overlayer for loading wait
        load_layer = d.createElement('div');
        load_layer.id = 'load';
        d.querySelector('body').appendChild(load_layer);

        // container for messages pushed w/o any request
        messages = d.createElement('ul');
        messages.id = 'messages';
        d.querySelector('body').appendChild(messages);

        resolve();

    });
    return promise;
};


// #########################################
// ########## WEBSOCKET ##########
// #########################################

const nav_init = function(){
    var promise = new Promise(function(resolve, reject){
        const socket = new w.WebSocket(
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
            const wsnav_send = function(path, mode, target){
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
            [type, id, href, target, mode, markup]
            . type for one of:
                . 1: response to a requested path
                . 2: auto push from server
            . id is used to get the DOM selection string
            . href to update the window.hash
            . target for querySelector
            . mode for one of:
                . @ : replace html
                . - : insert at begin (prepend)
                . + : insert at end (append)
            . markup to populate the targeted element
            */
            const wsnav_receive = function(message){
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
            const wsnav_hash_parse = function(hash){
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
            const wsnav_hash_update = function(path, mode, target){
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

            const wsnav_load_layer_show = function(){
                load_layer.classList.add('on');
                body.classList.add('load');
                body.style.paddingRight = scrollbar_width + 'px';
            };
            const wsnav_load_layer_hide = function(){
                load_layer.classList.remove('on');
                body.classList.remove('load');
                body.style.paddingRight = '0';
            };

            // listen to initial load for hash in address bar
            const wsnav_hash_init = function(){
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

        resolve();
    });
    return promise;
};


ui_init()
.then(nav_init)
.then(db_init);


})(window, document);