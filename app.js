var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var view = require('./routes/view');
var pol = require('./routes/pol');
var cap = require('./routes/cap');

var app = express();

//WebSocket
const WebSocket = require('ws');
var wss = new WebSocket.Server({
    port: 8081
});

// подключенные клиенты
var ws_clients = {};

wss.on('connection', function connection(ws, req) {
    var id = Math.random();
    ws.id=id;
    ws_clients[id] = ws;
    console.log("ws:новое соединение: " + id);

    ws.on('message', function(message) {
        console.warn('ws:получено сообщение ' + message+' ws.id='+ws.id);

        for (var key in ws_clients) {
            if (ws_clients[key].readyState === WebSocket.OPEN) {
                ws_clients[key].send(message);
            }
        }
    });

    ws.on('close', function() {
        console.warn('ws: соединение закрыто ' + id);
        delete ws_clients[id];
    });
});
//WebSocket



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/view', view);
app.use('/pol', pol);
app.use('/cap', cap);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
