+function(){
  window.Ui = function(){
    var myName = '';
    var xss = function(str) {
      var replaceAll = function(strreg, find, replace) {
        return strreg.replace(new RegExp(find, 'g'), replace);
      };
      str = replaceAll(str, '<', '&lt;');
      str = replaceAll(str, '>', '&gt;');
      return str;
    };
    var setUsers = function(users) {
      document.getElementById("user-list").innerHTML = Object.keys(users).map(function (key) {return users[key]}).reduce(function(html, current, i){
        return html + '<li class="list-group-item">' + current + '</li>';
      }, '');
      scrollHistory();
    };
    var currentTime = function() {
      var time = new Date();
      return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() ;
    };
    var getTime = function(timestamp) {
      var time = new Date();
      time.setTime(timestamp);
      return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds() ;
    };
    var scrollHistory = function() {
      var history = document.getElementById('history');
      history.scrollTop = history.scrollHeight;
    };
    var getTemplate = function(type, options) {
      var message = '';
      switch (type) {
        case 'addUser':
          message = document.createElement('p');
          message.className = 'message event';
          message.innerHTML = '<span class="time">' + options.time + '</span> \
                             <span class="marker">' + options.name + '</span> присоеденился к чату';
          break;

        case 'delUser':
          message = document.createElement('p');
          message.className = 'message event';
          message.innerHTML = '<span class="time">' + options.time + '</span> \
                             <span class="marker">' + options.name + '</span> покинул чат';
          break;

        case 'addMsg':
          var wrapper = document.createElement('div');
          wrapper.className = 'row';
          message = document.createElement('p');
          var msgIsMy = options.name == xss(myName);
          message.className = 'message ' + (msgIsMy ? 'pull-right' : 'pull-left');
          message.innerHTML = '<span class="time ' + (msgIsMy ? 'pull-left' : 'pull-right') + '">' + options.time +'</span>\
          <span class="marker">' + options.name + ': </span>\
          <span class="text">' + realContent(options.text) + '</span>';
          wrapper.appendChild(message);
          message = wrapper;

          break;
      }

      return message;
    };
    var setHistory = function(history) {
      var html = '';
      for (var key in history) {
        var message = '';
        var current = history[key];
        switch (current.type) {
          case 'newUser':
            message = getTemplate('addUser', {
              name: current.data,
              time: getTime(key)
            });
            break;
          case 'leaveUser':
            if (current.data == undefined) {
              continue;
            }
            message = getTemplate('delUser', {
              name: current.data,
              time: getTime(key)
            });
            break;
          case 'newMsg':
            message = getTemplate('addMsg', {
              name: current.name,
              text: current.data,
              time: getTime(key)
            });
            break;
        }
        html += message.outerHTML;
      }
      document.getElementById('history').innerHTML = html;
      scrollHistory();

    };
    var realContent = function(yourString) {
      var strSplice = function(str, index, count, add) {
        return str.slice(0, index) + (add || "") + str.slice(index + count);
      };

      var count = 0;

      var urls = yourString.match(/(?:^|[^"'])(\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|])/gim);

      if (urls === null) {
        return yourString.replace(new RegExp("\n", 'g'), '<br>');
      }

      urls.forEach(function(v,i,a){
        var n = yourString.indexOf(v,count);

        if(v.match(/\.(png|jpg|jpeg|gif)$/) === null){
          yourString = strSplice(yourString,n,v.length,'<a href="'+v+'" target="_blank">'+v+'</a>');
          count += (v.length*2)+16;
        }
        else{
          yourString = strSplice(yourString,n,v.length,"\n" + '<a href="'+v+'" target="_blank"><img src="'+v+'"/></a>' + "\n");
          count += v.length+14;
        }
      });


      return yourString.replace(new RegExp("\n", 'g'), '<br>');
    };
    return {
      error: function(text) {
        document.getElementById("error-place").innerHTML = '<div class="alert alert-danger" role="alert">\
          <span class="sr-only">Error:</span>' + text + '</div>';
      },
      goMeet: function(newName, users, history) {
        myName = newName;

        document.getElementById("my-name").innerHTML = xss(myName);
        document.getElementById("welcome-page").className = 'element-hidden';
        document.getElementById("meeting-page").className = '';
        setUsers(users);
        setHistory(history);
      },
      addUser: function(name, users) {
        var message = getTemplate('addUser', {
          name: name,
          time: currentTime()
        });
        document.getElementById("history").appendChild(message);
        setUsers(users);
      },
      delUser: function(name, users) {
        var message = getTemplate('delUser', {
          name: name,
          time: currentTime()
        });
        document.getElementById("history").appendChild(message);
        setUsers(users);
      },
      addMsg: function(name, text) {
        var message = getTemplate('addMsg', {
          name: name,
          text: text,
          time: currentTime()
        });
        document.getElementById("history").appendChild(message);
        scrollHistory();
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
    document.getElementById("user-name").onkeydown = function(e) {
      if (e.keyCode == 13) {
        document.getElementById("login").click();
      }
    };
    document.getElementById("login").onclick = function() {
      var name = document.getElementById("user-name").value;
      if (name.length > 0) {
        socket.send(JSON.stringify({
          type: "checkName",
          data: name
        }));
        socket.onmessage = function(msg) {
          if (msg.data != undefined && msg.data.length > 0) {
            var res = JSON.parse(msg.data);
            switch (res.type) {
              case 'checkName':
                if (res.data) {
                  ui.goMeet(name, res.users, JSON.parse(res.history));
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
