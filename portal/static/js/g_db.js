(function(w,d){

const hashCode = function(s){
    return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
};

const addEvent = function(object, type, callback){
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
    'h': hash (used as main key index) of path+mode+query
    'rts': request timestamp,
    'ts': response timestamp,
    't': target == querySelector expression,
    'p': the page path/href,
    'm': mode (@-+),
    'mk': markup
}
on click link:
1) check the db contains a cached copy that is recent enough
2a) if not, request to server normally
2b) if yes, use the cached markup
3) on receive type 1, populate db
*/


const db_name = 'django_channels_test';
const page_store_name = 'pages';
var db;
const online = w.navigator.onLine;
const cache_ttl = 10 * 60 * 1000;

// test init chain via promises
const db_init = function(){
    return;
    console.log('db_init 1');
    var promise = new Promise(function(resolve, reject){
        console.log('db_init 2');
        var indexedDB = w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB;
         // This line should only be needed if it is needed to support the object's constants for older browsers
        var IDBTransaction = w.IDBTransaction || w.webkitIDBTransaction || w.msIDBTransaction || {READ_WRITE: "readwrite"};
        var IDBKeyRange = w.IDBKeyRange || w.webkitIDBKeyRange || w.msIDBKeyRange;
        var db_request = indexedDB.open(db_name/*, 1*/);
        db_request.onerror = function(e){
            // console.log('Database error')
            // console.log(e);
            resolve();
        };
        db_request.onsuccess = function(e){
            console.log('db_init 3');
            db_init(e, false);
        };
        db_request.onupgradeneeded = function(e){
            console.log('db_init 4');
            db_init(e, true);
        };
        var db_init = function(e, upgradeneeded){
            console.log('db_init 5');
            db = e.target.result;
            // indexedDB events bubbles, so: request -> transactions -> db
            db.onerror = function(e){
                console.log('Database error')
                console.log(e);
            };

            // store for pages - the key 'h' is unique
            if( upgradeneeded ){
                var pageStore = db.createObjectStore(page_store_name, {keyPath: 'h'});
            }

            console.log(db);
            resolve();
        };
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

        const message_process = function(){

        };

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
                let type = message.shift();

                // read response to a "page" request
                if(type === 1){
                    var id = message.shift();
                    var href = message.shift();
                    var mode = decodeURIComponent(message.shift()).slice(1);
                    var target = decodeURIComponent(message.shift());
                    var markup = message.shift();
                    console.log([type, id, href, mode, target]);

                    // some other controls here
                    let target_el =  d.querySelector(target);

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
                // read a server push, directly targeted at element
                else if (type===2){
                    //console.log(message);
                    let mode = message.shift();
                    let target = message.shift();
                    let markup = message.shift();
                    console.log([type, mode, target]);

                    let target_el =  d.querySelector(target);

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
            parses the hash passed and if valid:
            1) first requests the page from the cache
            2) if not found, or too old, fires the send()
            // format is #/path/to/page!@#main, for example
            */
            const wsnav_hash_parse = function(hash){
                hash = hash.split('!');

                let path = hash[0].replace(/#/g,'');
                hash[1] = decodeURIComponent(hash[1]);
                let mode = hash[1].substring(0,1);
                let target = decodeURIComponent(hash[1].slice(1));

                //console.log([path, mode, target]);
                if( db && path && mode && target ){
                    // first build hash for the db query
                    console.log([path,mode,target]);
                    let s = path+mode+target;
                    let h = hashCode(s);
                    console.log(s);

                    let cached_page;

                    let transaction = db.transaction(db_name);
                    let objectStore = transaction.objectStore(db_name);
                    let request = objectStore.get(s);

                    request.onsuccess = function(e){
                        cached_page = request.result;
                        // if found in the cache, use it
                        if( cached_page ){
                            console.log('got the page in cache ' + cached_page);
                        }
                        // otherwise, simply send request
                        // the response will be cached
                        else{
                            wsnav_send(path, mode, target);
                        }
                    };
                    // on failure, simply call server
                    request.onerror = function(e){
                        wsnav_send(path, mode, target);
                    };
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
                let t = e.target;
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


db_init()
.then(ui_init)
.then(nav_init);


})(window, document);