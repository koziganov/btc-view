var express = require('express');
var router = express.Router();
var https = require("https");

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


router.all('/', function(req, res, next) {

    var pairs='';

    if (req.query.method=='returnTicker'){ //coin list
        pairs='/public?command=[method]'.replace('\[method\]',req.query.method);
    } else if (req.query.method=='returnTradeHistory') { //trades
        var d=parseInt((((new Date()).getTime())-1000*60*4)/1000);
        pairs=('/public?command=[method]&currencyPair=[pair]&start='+d+'&end=9999999999').replace('\[method\]',req.query.method).replace('\[pair\]',req.query.pair);
    } else { //orders
        pairs='/public?command=[method]&currencyPair=[pair]&depth=300'.replace('\[method\]',req.query.method).replace('\[pair\]',req.query.pair);
    }

    //res.send(pairs)
    //return;

    //https://poloniex.com/public?command=returnTicker

    getJSON({
        host: 'poloniex.com',
        port: 443,
        path: pairs,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, function(status,result){
        res.json(result);
    })


});

module.exports = router;
