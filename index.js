var express = require("express");
var WebSocketServer = new require('ws');
var app = express();

app.disable('x-powered-by');
app.use(express.static('public'));
app.listen(8090);


var clients = new Array();
var clientsNames = new Array();
var history = {};
var webSocketServer = new WebSocketServer.Server({
  port: 9000
});

webSocketServer.on('connection', function(ws) {

  var id = parseInt(Math.random().toString().slice(0,10) * 10000);
  clients[id] = ws;

  ws.on('message', function(msg) {
    if (msg.length > 0) {
      msg = JSON.parse(msg);
      if (msg.type != undefined && msg.type.length > 0 && msg.data != undefined && msg.data.length > 0) {
        switch (msg.type) {
          case 'checkName':
            if (clientsNames.indexOf(msg.data) !== -1) {
              ws.send(JSON.stringify({
                type: 'checkName',
                data: false
              }));
              delete clients[id];
            }
            else {
              clientsNames[id] = msg.data;
              var userList = clientsNames.reduce(function(o, v, i) {
                o[i] = v;
                return o;
              }, {});
              ws.send(JSON.stringify({
                type: 'checkName',
                data: true,
                users: userList,
                history: {}
              }));
              for (var key in clients) {
                clients[key].send(JSON.stringify({
                  type: 'newUser',
                  data: msg.data,
                  users: userList
                }));
              }
            }
            break;
          case 'newMsg':
            for (var key in clients) {
              clients[key].send(JSON.stringify({
                type: 'newMsg',
                name: clientsNames[id],
                data: msg.data
              }));
            }
            break;
        }
      }
    }
  });

  ws.on('close', function() {
    delete clients[id];
    var leaveUserName = clientsNames[id];
    delete clientsNames[id];
    for (var key in clients) {
      var userList = clientsNames.reduce(function(o, v, i) {
        o[i] = v;
        return o;
      }, {});
      clients[key].send(JSON.stringify({
        type: 'leaveUser',
        data: leaveUserName,
        users: userList
      }));
    }
  });
});
