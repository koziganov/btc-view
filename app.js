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
    ws.id = id;
    ws_clients[id] = ws;
    console.log("ws:новое соединение: " + id);

    ws.on('message', function (message) {
        console.warn('ws:получено сообщение ' + message + ' ws.id=' + ws.id);

        for (var key in ws_clients) {
            if (ws_clients[key].readyState === WebSocket.OPEN) {
                ws_clients[key].send(message);
            }
        }
    });

    ws.on('close', function () {
        console.warn('ws: соединение закрыто ' + id);
        delete ws_clients[id];
    });
});
//WebSocket


//Telegram bot
const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '346514765:AAFbK80O_uaSZR2tLTy3YjPi7cyuFPeGPBA';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
bot.info={};

var bot_cfg={
    tick: 15000,
    pairs:["btc_usd", "ltc_usd", "ltc_btc"],
    active_pairs:{},
    chats:{}
}

bot.onText(/\/start/, function(msg){

    bot.sendMessage(msg.chat.id, "Welcome", {
        "reply_markup": {
            "keyboard": [bot_cfg.pairs]
        }
    });

});

/*
bot.onText(/\/echo (.+)/, (msg, match) => {

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"
    bot.sendMessage(chatId, resp);

});
*/


function get_pairs_info_loop(){
    var balance=0;

    for(pair in bot_cfg.active_pairs){
        get_pair_info(pair)
    }

    function get_pair_info(pair){
        balance++;
        getInfo("/api/3/ticker/"+pair,function(status,json){
            json=json[pair];
            bot.info[pair]=json;
            balance--;

            if (balance==0){ //все пары пришли
                //делаем рассылку тек.инфы
                send_pairs_info();
            }
        });
    }


}

function send_pairs_info(){
    for(chatID in bot_cfg.chats){
        if (bot_cfg[chatID]) {
            var user_pairs = bot_cfg[chatID].active_pairs;
            //console.log("1",user_pairs);
            var msg = "";
            var is_user_pairs=false;
            for (pair in user_pairs) {
                is_user_pairs=true;
                var json = bot.info[pair];
                if (json) {
                    msg += "<b>" + pair + ":</b> " + json.last + "; ";
                }
            }
            //console.log("send",chatID, msg);
            if (!msg && !is_user_pairs){
                msg="Выберите пары для мониторинга";
            }

            if (msg) {
                var buttons = [];
                for (var k = 0; k < bot_cfg.pairs.length; k++) {
                    var pair = bot_cfg.pairs[k];
                    if (pair in user_pairs) {
                        buttons.push(pair + " (-)")
                    } else {
                        buttons.push(pair)
                    }
                }

                bot.sendMessage(chatID, msg, {
                    parse_mode: "HTML",
                    "reply_markup": {
                        "keyboard": [buttons]
                    }
                });

                /*
                bot.sendMessage(chatID, "-", {
                    "reply_markup": {
                        "keyboard": [buttons]
                    }
                });
                */
            }
        }
    }
}

bot.on('message', function(msg){
    var chatId = msg.chat.id;
    bot_cfg.chats[chatId]=1;

    var remove_pair=false;
    var msg_text=msg.text;
    if (msg.text.match(/\s\(-\)$/)) {
        msg_text=msg_text.replace(/\s\(-\)$/,"");
        remove_pair=true;
    }

    if (bot_cfg.pairs.indexOf(msg_text)!=-1){ //запросили валидную пару
        var pair=msg_text;

        if (!remove_pair) { //добавляют пару

            //добавляем в глобальный список активных пар
            if (!(pair in bot_cfg.active_pairs)) {
                bot_cfg.active_pairs[pair] = 1;
            }

            //добавляем в список активных пар для юзера
            if (!(chatId in bot_cfg)) {
                bot_cfg[chatId] = {
                    active_pairs: {}
                }
            }
            bot_cfg[chatId].active_pairs[pair] = 1;

        } else { //удаляют пару

            //удаляем из списка активных пар для юзера
            if (chatId in bot_cfg) {
                if (bot_cfg[chatId].active_pairs) {
                    delete bot_cfg[chatId].active_pairs[pair]
                }
            }

            //если у всех юзеров нет этой пары - удаляем из глобального списка активных пар
            var is_pair=false;
            for(chatID in bot_cfg.chats) {
                if (bot_cfg[chatID]) {
                    var user_pairs = bot_cfg[chatID].active_pairs;
                    if (pair in user_pairs) {
                        is_pair=true;
                        break;
                    }
                }
            }
            if (!is_pair){
                delete bot_cfg.active_pairs[pair];
            }

        }

        if (!("start_loop" in bot_cfg)) {
            get_pairs_info_loop();
            setInterval(get_pairs_info_loop,bot_cfg.tick);
            bot_cfg.start_loop=1;
        }
        send_pairs_info(); //если др.юзеры запрашивали инфу - текущему достанется сразу

    }



});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/view', view);
app.use('/pol', pol);
app.use('/cap', cap);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;


var https = require("https");

function getInfo(url,callback){
    getJSON({
        host: 'btc-e.com',
        port: 443,
        path: url,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, function(status,result){
        callback(status,result);
    })
}

function getJSON(options, onResult){
    console.log("rest::getJSON:",options.path);

    var prot = options.port == 443 ? https : http;
    var req = prot.request(options, function(res)
    {
        var output = '';
        console.log(options.host + ':' + res.statusCode);
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            try {
                var obj = JSON.parse(output);
                onResult(res.statusCode, obj);
            } catch(e){
                console.warn(e,res.statusCode,output)
            }
        });
    });

    req.on('error', function(err) {
        //res.send('error: ' + err.message);
    });

    req.end();
};