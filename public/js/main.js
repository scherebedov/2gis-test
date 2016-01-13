+function(){
  window.Ui = function(){
    var myName = '';
    var setUsers = function(users) {
      document.getElementById("user-list").innerHTML = Object.keys(users).map(function (key) {return users[key]}).reduce(function(html, current, i){
        return html + '<li class="list-group-item">' + current + '</li>';
      }, '');
    };
    var currentTime = function() {
      var time = new Date();
      return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() ;
    };
    return {
      error: function(text) {
        document.getElementById("error-place").innerHTML = '<div class="alert alert-danger" role="alert">\
          <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>\
          <span class="sr-only">Error:</span>' + text + '</div>';
      },
      goMeet: function(newName, users) {
        myName = newName;
        document.getElementById("welcome-page").className = 'element-hidden';
        document.getElementById("meeting-page").className = '';
        setUsers(users)
      },
      setUsers: function(users) {
        setUsers(users);
      },
      addUser: function(name, users) {
        var message = document.createElement('p');
        message.className = 'message event';
        message.innerHTML = '<span class="time">' + currentTime() + '</span> \
                             <span class="marker">' + name + '</span> присоеденился к чату';
        document.getElementById("history").appendChild(message);
        setUsers(users);
      },
      delUser: function(name, users) {
        var message = document.createElement('p');
        message.className = 'message event';
        message.innerHTML = '<span class="time">' + currentTime() + '</span> \
                             <span class="marker">' + name + '</span> покинул чат';
        document.getElementById("history").appendChild(message);
        setUsers(users);
      },
      addMsg: function(name, text) {
        console.log(name + ' ' + text);
        var message = document.createElement('p');
        var msgIsMy = name == myName;
        message.className = 'message ' + (msgIsMy ? 'pull-right' : 'pull-left');
        message.innerHTML = '<span class="time ' + (msgIsMy ? 'pull-left' : 'pull-right') + '">' + currentTime() +'</span>\
          <span class="marker">' + name + '</span>\
          <span class="text">' + text + '</span>';
        document.getElementById("history").appendChild(message);
      },
      getMyName: function() {
        return myName;
      }
    }

  };
}();

document.addEventListener("DOMContentLoaded", function(event) {
  var ui = new Ui();
  var socket = new WebSocket('ws://127.0.0.1:9000');

  socket.onopen = function() {
    document.getElementById("login").onclick = function() {
      var name = document.getElementById("user-name").value;
      if (name.length > 0) {
        socket.send(JSON.stringify({
          type: "checkName",
          data: name
        }));
        socket.onmessage = function(msg) {
          console.log(msg);
          if (msg.data != undefined && msg.data.length > 0) {
            var res = JSON.parse(msg.data);
            switch (res.type) {
              case 'checkName':
                if (res.data) {
                  ui.goMeet(name, res.users);
                  document.getElementById("send-message").onclick = function() {
                    var textMsg = document.getElementById("message-text").value;
                    document.getElementById("message-text").value = '';
                    if (textMsg != undefined && textMsg.length > 0) {
                      socket.send(JSON.stringify({
                        type: "newMsg",
                        data: textMsg
                      }));
                    }
                  };
                }
                else {
                  ui.error("К сожалению, в настоящий момент этот псевдоним занят, пожалуйста, введите другой псевдоним или зайдите позже.");
                }
                break;
              case 'newUser':
                ui.addUser(res.data, res.users);
                break;
              case 'newMsg':
                ui.addMsg(res.name, res.data);
                break;
              case 'leaveUser':
                ui.delUser(res.data, res.users);
                break;
            }
          }

        };
      }
      else {
        ui.error("Введите псевдоним, поле не может быть пустым.");
      }
    };
  };
});
