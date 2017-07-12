/**
 * Created by kozhiganov on 12.07.2017.
 */
var convert={};

function coin_info(coin){

    if ($("#coin_info").length==0){
        $("<div id=coin_info></div>").insertBefore("svg")
    }

    var coin_id=convert[coin];
    $.get("/cap?path=/v1/ticker/"+coin_id+"/",function(j){
        /*
         [
         {
         "id": "nem",
         "name": "NEM",
         "symbol": "XEM",
         "rank": "7",
         "price_usd": "0.12024",
         "price_btc": "0.00005194",
         "24h_volume_usd": "4083840.0",
         "market_cap_usd": "1082160000.0",
         "available_supply": "8999999999.0",
         "total_supply": "8999999999.0",
         "percent_change_1h": "-0.0",
         "percent_change_24h": "-1.49",
         "percent_change_7d": "-31.66",
         "last_updated": "1499850546"
         }
         ]

         * */
        j=j[0];

        $("#coin_info").html("")
        .append("&nbsp;&nbsp;&nbsp;<b>price_btc:</b> "+j.price_btc)
        .append("&nbsp;&nbsp;&nbsp;<b>price_usd:</b> "+j.price_usd)
        .append("&nbsp;&nbsp;&nbsp;<b>percent_change_1h:</b> "+j.percent_change_1h)
        .append("&nbsp;&nbsp;&nbsp;<b>percent_change_24h:</b> "+j.percent_change_24h)
        .append("&nbsp;&nbsp;&nbsp;<b>percent_change_7d:</b> "+j.percent_change_7d)

    });



}

$(document).ready(function(){

    $.get("/cap?path=/v1/ticker/",function(j){
        for(var k=0;k<j.length;k++){
            var rec=j[k];
            convert[rec.symbol]=rec.id;
        }

        var coin=$("[type=button][c].active").attr("c");
        if (glob.coin_info_interval){
            clearInterval(glob.coin_info_interval)
        }
        glob.coin_info_interval=setInterval(coin_info,glob.tick_interval,coin);
        coin_info(coin)

    });

    function refresh_market_info(){

        if ($("#marketcap").length==0){
            $("<div id=marketcap></div>").insertBefore("svg")
        }

        $.get("/cap?path=/v1/global/",function(j){

            $("#marketcap").html("")
                .append("&nbsp;&nbsp;&nbsp;<b>total marketcap usd:</b> "+beautify_number(j.total_market_cap_usd)+"&nbsp;&nbsp;&nbsp;")
                .append("<b>total_24h_volume usd:</b> "+beautify_number(j.total_24h_volume_usd))

        })
    }

    setInterval(refresh_market_info,glob.tick_interval);
    refresh_market_info();

});

function beautify_number(d){
    var replacer="&thinsp;";
    var v=(''+d).split(".");
    var v1=v[0].split('').reverse().join('').replace(/(\d{3})/g,'$1][').split('').reverse().join('');
    v1=v1.replace(/^[^\d]+/,"").replace(/\[\]/g,replacer);
    return v.length>1 ? (v1+"."+v[1]) : v1
}