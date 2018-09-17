'use strict';

export default class Chat {
    constructor(data) {
        let obj = this;
        //crear clases para el historial de mensajes y usuarios
        this.history = new History();
        this.users = new Users();

        this.ip = false;

        this._container = data.container;

        this.title = window.document.title;

        this.socket = io.connect("192.168.1.39:8080", { nsp: '/alex/chat/server/', forceNew: true });
        this.socket.on('ip', (data) => {
            if (obj.ip === false) {
                obj.ip = data.ip;
            }
        });
        this.socket.on('own-message', (data) => {
            obj.getOwnlMessage(data);
            obj.history.pushMessage(data.ip, data.message, 'own');
        });
        this.changeFavicon('grey');
        let interval;
        this.socket.on('external-message', (data) => {
            obj.getExternalMessage(data);
            obj.history.pushMessage(data.ip, data.message, 'external');

            if (!document.hasFocus()) {
                clearInterval(interval);
                this.changeFavicon('green');
                if (window.document.title != 'Nuevo mensaje') {
                    window.document.title = 'Nuevo mensaje';

                }
                interval = setInterval(() => {
                    this.changeFavicon('green');
                    if (window.document.title != 'Nuevo mensaje') {
                        window.document.title = 'Nuevo mensaje';

                    } else {
                        window.document.title = obj.title;
                    }
                }, 3000);
            } else {
                window.document.title = obj.title;
                this.changeFavicon('grey');
            }
        });

        this.connected = '';
        this.socket.on('connected', (data) => {
            obj.sendbutton.classList.add('active');
            if (obj.connected != data.conectados) {
                obj.updateConnected(data.conectados.split(','));
                obj.connected = data.conectados;
            }
        });

        this.writing = '';
        this.socket.on('updateWriting', (data) => {

            data.conectados = data.conectados.replace(obj.ip, '');
            if (obj.writing != data.conectados) {
                obj.writing = data.conectados;
            }
            this.users.getAllUsersInArray(obj.writing.split(','), (result) => {
                let s = '';
                for (let i = 0; i < result.length; i++) {
                    if (result[i] != "") {
                        s += result[i] + ' est&aacute; escribiendo...<br>';
                    }
                }
                if (s != this.infoLeftCell.innerHTML) {
                    this.infoLeftCell.innerHTML = s;
                }
            });
        });


        setInterval(() => {
            obj.socket.emit('pingConnected');
            // obj.socket.emit('pingWriting');
        }, 2000);

        this.socket.on('pingConnected', (data) => {
            if (obj.connected != data.conectados) {
                obj.updateConnected(data.conectados.split(','));
                obj.connected = data.conectados;
            }
        });

        this.createChat();

        let windowEvents = Array('visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'msvisibilitychange');
        for (let i = 0; i < windowEvents.length; i++) {
            document.addEventListener(windowEvents[i], () => {
                clearInterval(interval);
                window.document.title = this.title;
                this.changeFavicon('grey');
            }, { pasive: false });
        }
    }

    updateConnected(connectedArray) {
        let obj = this;
        this.users.getAllUsersInArray(connectedArray, (result) => {
            let s = '';
            for (let i = 0; i < result.length; i++) {
                s += result[i] + '<br>';
            }
            if (s != obj.connectedUsers.innerHTML) {
                obj.connectedUsers.innerHTML = s;
            }
        });
    }

    changeFavicon(color) {
        let link = document.createElement('link'),
            oldLink = document.getElementById('dynamic-favicon');
        link.id = 'dynamic-favicon';
        link.rel = 'shortcut icon';
        //ruta en local al favicon (uno es favicon-grey.png y el otro favicon-green.png)
        link.href = `//192.168.1.39/alex/chat/assets/img/favicon-${color}.png`;
        if (oldLink) {
            document.querySelector('head').removeChild(oldLink);
        }
        document.querySelector('head').appendChild(link);
    }

    createChat() {
        let obj = this;
        this.container = document.createElement('div');
        this.container.classList.add('container');

        //información sobre usuarios conectados
        this.info = document.createElement('div');
        this.info.classList.add('info');
        this.infoLeftCell = document.createElement('div');
        this.infoLeftCell.classList.add('left-cell');
        this.infoRightCell = document.createElement('div');
        this.infoRightCell.classList.add('right-cell');
        this.infoIcon = document.createElement('i');
        this.infoIcon.classList.add('infoIcon');
        this.infoIcon.innerHTML = '&#9432;';
        this.infoIcon.addEventListener('click', () => {
            obj.showConnected();
        }, { pasive: false })
        this.connectedUsers = document.createElement('div');
        this.connectedUsers.classList.add('connectedUsers');

        this.themes = document.createElement('div');
        this.themes.classList.add('themes');

        this.theme = Array();
        this.theme[0] = document.createElement('div');
        this.theme[0].classList.add('theme', 'white');
        this.theme[0].addEventListener('click', () => {
            document.body.className = '';
            document.body.classList.add('white');
        });

        this.theme[1] = document.createElement('div');
        this.theme[1].classList.add('theme', 'dark');
        this.theme[1].addEventListener('click', () => {
            document.body.className = '';
            document.body.classList.add('dark');
        });

        for (let k in this.theme) {
            this.themes.appendChild(this.theme[k]);
        }

        this.infoRightCell.appendChild(this.themes);
        this.infoRightCell.appendChild(this.infoIcon);
        this.info.appendChild(this.connectedUsers);
        this.info.appendChild(this.infoLeftCell);
        this.info.appendChild(this.infoRightCell);
        this.container.appendChild(this.info);

        //contenedor de los mensajes
        this.chat = document.createElement('div');
        this.chat.classList.add('chat');
        let chat = this.chat;
        this.history.getAllMessages((messages) => {
            for (let key in messages) {
                if (messages[key].type == 'own') {
                    obj.getOwnlMessage(messages[key]);
                } else {
                    obj.getExternalMessage(messages[key]);
                }
            }
        });

        this.container.appendChild(this.chat);

        this.controls = document.createElement('div');
        this.controls.classList.add('controls');

        this.textbox = document.createElement('textarea');
        this.textbox.classList.add('textbox');
        this.textbox.addEventListener('keyup', function(e) {
            let ev = e || event || window.event
            if (ev.keyCode == 13 && !ev.shiftKey) {
                obj.sendbutton.click();
                obj.socket.emit('stop-writing');
            }
        });
        this.textbox.addEventListener('input', () => {
            if (obj.textbox.value && obj.textbox.value.length > 0) {
                obj.socket.emit('sendWriting');
            } else {
                obj.socket.emit('stop-writing');
            }
        });

        this.sendbutton = document.createElement('button');
        this.sendbutton.classList.add('sendbutton');
        this.sendbutton.innerHTML = 'Enviar';

        this.sendbutton.addEventListener('click', () => {
            let text = obj.textbox.value;
            if ((text.replace(/\s/g, '').length)) {
                obj.socket.emit('new-message', { message: text });
                obj.textbox.value = '';
                obj.socket.emit('stop-writing');
            }
        });

        this.controls.appendChild(this.textbox);
        this.controls.appendChild(this.sendbutton);
        this.container.appendChild(this.controls);
        this._container.parentNode.replaceChild(this.container, this._container);
    }

    showConnected() {
        let obj = this;
        if (obj.connectedUsers.classList.contains('visible')) {
            obj.connectedUsers.classList.remove('visible');
        } else {
            obj.connectedUsers.classList.add('visible');
        }

        let ev = event || window.event;
        ev.preventDefault();
        ev.stopPropagation();
        ev.cancelBubble = true;
        window.addEventListener('click', () => {
            if (obj.connectedUsers.classList.contains('visible')) {
                obj.connectedUsers.classList.remove('visible');
            }
            window.removeEventListener('click', () => {
                if (obj.connectedUsers.classList.contains('visible')) {
                    obj.connectedUsers.classList.remove('visible');
                }
                window.removeEventListener('click');
            });
        }, { pasive: false });
    }

    getExternalMessage(data) {
        let obj = this;
        let message = document.createElement('div');
        message.classList.add('message', 'external');
        let ip = document.createElement('div');
        ip.classList.add('name');
        ip.innerHTML = data.ip;

        this.users.getUserFieldByIp('name', data.ip, (result = data.ip) => {
            ip.innerHTML = result;
        });

        let text = document.createElement('div');
        text.innerHTML = data.message;

        message.appendChild(ip);
        message.appendChild(text);
        this.chat.appendChild(message);

        message.addEventListener('click', () => {
            let name = prompt("Nuevo nombre de usuario: ", "ej: Pijus Magnificus");
            if (name && name.length > 0) {
                obj.users.deleteUserByIp(data.ip, () => {
                    obj.users.insertUser(name, data.ip, () => {
                        obj.socket.emit('pingConnected');
                    });
                });
            }

        }, { pasive: false });

        this.chat.scrollTop = this.chat.scrollHeight;
    }

    getOwnlMessage(data) {
        let message = document.createElement('div');
        message.classList.add('message', 'own');
        message.innerHTML = data.message;
        this.chat.appendChild(message);
        this.chat.scrollTop = this.chat.scrollHeight;
    }

}

/**
 *	Clase que crea la base de datos si no existe o si hay actualizaciones
 */
class Database {

    constructor() {
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        this.db = false;
        let obj = this;
        let request = this.indexedDB.open("chat");
        request.onupgradeneeded = function(event) {
            obj.db = event.target.result;

            //crear tabla menssages
            let messages = obj.db.createObjectStore("messages", { keyPath: 'id', autoIncrement: true });
            messages.createIndex("by_ip", "ip", { unique: false });
            messages.createIndex("by_message", "message", { unique: false });
            messages.createIndex("by_timestamp", "timestamp", { unique: false });
            messages.createIndex("by_type", "type", { unique: false });

            //crear tabla people
            let store = obj.db.createObjectStore("people", { keyPath: 'id', autoIncrement: true });
            let nameIndex = store.createIndex("by_name", "name");
            let ipIndex = store.createIndex("by_ip", "ip");

            // Populate with initial data.
            store.put({ name: "Jose", ip: '192.168.1.133' });
            store.put({ name: "Alex", ip: '192.168.1.39' });
        };

        request.onsuccess = function() {
            obj.db = request.result;
        };
    }
}

/**
 *	Clase que controla el historial de mensajes
 */
class History extends Database {

    constructor() {
        super();
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }

    pushMessage(ip, message, type) {
        let obj = this;
        let open = obj.indexedDB.open("chat", 1);
        open.onsuccess = function() {
            let db = open.result;
            let tx = db.transaction("messages", "readwrite");
            let store = tx.objectStore("messages");
            let now = new Date();
            store.put({ ip: ip, message: message, type: type, timestamp: now.getTime() });
            tx.oncomplete = function() {
                db.close();
            };
        }
    }

    getAllMessages(callback) {
        let obj = this;
        let request = this.indexedDB.open("chat");
        request.onsuccess = function() {
            let db = request.result;
            let tx = db.transaction("messages", "readwrite");
            let store = tx.objectStore("messages");
            let index = store.index("by_timestamp");
            let solicitud = index.openCursor();
            let allMessages = Array();
            solicitud.onsuccess = function(e) {
                let ev = e || event || window.event
                let cursor = ev.target.result;
                if (cursor) {
                    allMessages.push(cursor.value);
                    cursor.continue();
                }
            };

            tx.oncomplete = function() {
                db.close();
                callback(allMessages);
            };
        }
    }
}

/**
 *	Clase que controla los usuarios registrados
 */
class Users extends Database {

    constructor() {
        super();
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }

    getUserFieldByIp(field = 'name', ip, callback) {
        let open = this.indexedDB.open("chat", 1);
        open.onsuccess = function() {
            // Start a new transaction
            let db = open.result;
            let tx = db.transaction("people", "readwrite");
            let store = tx.objectStore("people");
            let index = store.index("by_ip");
            let getIp = index.get(`${ip}`);
            getIp.onsuccess = function() {
                if (typeof getIp.result != 'undefined') {
                    callback(getIp.result[field]);
                }
            };
            tx.oncomplete = function() {
                db.close();
            };
        }
    }

    deleteUserByIp(ip, callback) {
        let open = this.indexedDB.open("chat", 1);
        open.onsuccess = function() {
            let db = open.result;
            let tx = db.transaction("people", "readwrite");
            let store = tx.objectStore("people");
            let index = store.index("by_ip");
            let results = index.get(`${ip}`);

            results.onsuccess = function() {
                if (typeof results.result != 'undefined') {
                    let key = results.result.id;
                    store.delete(key);
                }
            };
            tx.oncomplete = function() {
                db.close();
                callback();
            };
        }
    }

    insertUser(name, ip, callback) {
        let open = this.indexedDB.open("chat", 1);
        open.onsuccess = function() {
            let db = open.result;
            let tx = db.transaction("people", "readwrite");
            let store = tx.objectStore("people");
            store.put({ name: name, ip: `${ip}` });
            tx.oncomplete = function() {
                db.close();
                callback();
            };
        }
    }

    getAllUsersInArray(connectedArray, callback) {
        let open = this.indexedDB.open("chat", 1);
        open.onsuccess = function() {
            let db = open.result;
            let tx = db.transaction("people", "readwrite");
            let store = tx.objectStore("people");
            let index = store.index("by_ip");
            let request = index.openCursor();

            request.onsuccess = function(e) {
                let ev = e || event || window.event
                let cursor = ev.target.result;
                if (cursor) {
                    if (connectedArray.indexOf(cursor.value.ip) > -1) {
                        connectedArray[connectedArray.indexOf(cursor.value.ip)] = cursor.value.name;
                    }
                    cursor.continue();
                }
            };

            tx.oncomplete = function() {
                db.close();
                callback(connectedArray);
            };
        }
    }
}