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


    var path=req.query.path;

    getJSON({
        host: 'api.coinmarketcap.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    }, function(status,result){
        res.json(result);
    })


});

module.exports = router;
