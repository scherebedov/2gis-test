var express = require("express");
var app = express();

app.disable('x-powered-by');
app.use(express.static('public'));


app.get('/', function(req, res){

});

app.listen(8090);