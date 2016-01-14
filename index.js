var express = require("express");
var WebSocketServer = new require('ws');
var app = express();

app.disable('x-powered-by');
app.use(express.static('public'));

app.get('*', function(req,res) {
  res.status(404).send('Такой страницы не существует, перейдите на <a href="/">главную</a>');
});

app.listen(8090);

var History = function() {
  var hist = {};
  var getTime = function() {
    return new Date().getTime();
  };
  return {
    get: function() {
      return JSON.stringify(hist);
    },
    addUser: function(name) {
      hist[getTime()] = {
        type: 'newUser',
        data: xss(name)
      }
    },
    delUser: function(name) {
      hist[getTime()] = {
        type: 'leaveUser',
        data: xss(name)
      }
    },
    addMsg: function(name, text) {
      hist[getTime()] = {
        type: 'newMsg',
        data: text,
        name: xss(name)
      }
    }

  }
};

var history = new History();

var xss = function(str) {
  if (typeof str != 'string') {
    return str;
  }
  var replaceAll = function(strreg, find, replace) {
    return strreg.replace(new RegExp(find, 'g'), replace);
  };
  str = replaceAll(str, '<', '&lt;');
  str = replaceAll(str, '>', '&gt;');
  return str;
};

var clients = {};
var clientsNames = new Array();

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
              history.addUser(msg.data);
              var userList = clientsNames.reduce(function(o, v, i) {
                o[i] = xss(v);
                return o;
              }, {});
              ws.send(JSON.stringify({
                type: 'checkName',
                data: true,
                users: userList,
                history: history.get()
              }));
              for (var key in clients) {
                if (key != id) {
                  clients[key].send(JSON.stringify({
                    type: 'newUser',
                    data: xss(msg.data),
                    users: userList
                  }));
                }
              }
            }
            break;
          case 'newMsg':
            history.addMsg(clientsNames[id], msg.data);
            for (var key in clients) {
              clients[key].send(JSON.stringify({
                type: 'newMsg',
                name: xss(clientsNames[id]),
                data: xss(msg.data)
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
    history.delUser(leaveUserName);
    delete clientsNames[id];
    for (var key in clients) {
      var userList = clientsNames.reduce(function(o, v, i) {
        o[i] = xss(v);
        return o;
      }, {});
      clients[key].send(JSON.stringify({
        type: 'leaveUser',
        data: xss(leaveUserName),
        users: userList
      }));
    }
  });
});
