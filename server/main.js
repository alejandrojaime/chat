var express = require('express');
var app = express();
var server = require('http').createServer();
var io = require('socket.io')(server, {
    path: '/',
    serveClient: false,
    // below are engine.IO options
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: true
});

var conectados = Array();
var escribiendo = Array();

io.sockets.on('connection', (socket) => {
    if (conectados.indexOf(socket.handshake.address) < 0) {
        conectados.push(socket.handshake.address);
        console.log('conectado: ' + socket.handshake.address);
        console.log(conectados)
        socket.emit('ip', { ip: socket.handshake.address });
    }
    io.sockets.emit('connected', { respuesta: 'Conectado', conectados: conectados.toString() });


    socket.on('disconnecting', function() {
        console.log('desconectado: ' + socket.handshake.address);
        var index = conectados.indexOf(socket.handshake.address);
        if (index > -1) { conectados.splice(index, 1); }
        var index = escribiendo.indexOf(socket.handshake.address);
        if (index > -1) { escribiendo.splice(index, 1); }
        io.sockets.emit('disconnected', { respuesta: 'Desconectado', conectados: conectados.toString() });
        console.log(conectados);
    });

    socket.on('pingConnected', function() {
        io.sockets.emit('pingConnected', { respuesta: 'Ping', conectados: conectados.toString() });
    });

    socket.on('sendWriting', function() {
        if (escribiendo.indexOf(socket.handshake.address) < 0) {
            escribiendo.push(socket.handshake.address);
        }
        console.log(escribiendo + ' está escribiendo...');
        socket.broadcast.emit('updateWriting', { respuesta: 'Escribiendo', conectados: escribiendo.toString(), });
    });

    socket.on('stop-writing', function() {
        var index = escribiendo.indexOf(socket.handshake.address);
        if (index > -1) { escribiendo.splice(index, 1); }
        socket.broadcast.emit('updateWriting', { conectados: escribiendo.toString() });
    });

    socket.on('new-message', (data) => {
        var text = convertLinks(data.message);
        socket.emit('own-message', { message: text, ip: socket.handshake.address });
        socket.broadcast.emit('external-message', { message: text, ip: socket.handshake.address });
    });

});



server.listen(8080, '192.168.1.39', () => {
    console.log("Server up and running...");
});


function convertLinks(text) {
    var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var text1 = text.replace(exp, "<a target=\"_blank\" href='$1'>$1</a>");
    var exp2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
    return text1.replace(exp2, '$1<a target="_blank" href="http://$2">$2</a>');
}