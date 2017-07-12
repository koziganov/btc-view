var glob={};
glob.tick_interval=60000;

var margin = {top: 20, right: 100, bottom: 100, left: 70},
    width = $(window).width()-100 - margin.left - margin.right,
    height = $(window).height()-200 - margin.top - margin.bottom;

//time
var x = d3.time.scale()
    .range([0, width]);

//btc-usd=>usd
var y = d3.scale.linear()
    .range([height, 0]);

//btc-xem=>btc
var y2 = d3.scale.linear().range([height, 0]);

//btc-xem=>btc value
var y3 = d3.scale.linear().range([height, 0]);

//btc-usd=>btc value
var y4 = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(20)
    //.tickFormat(d3.timeFormat('%H:%M'));
    .tickFormat(d3.time.format('%d.%m %H:%M'));

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left").ticks(10);


var yAxisRight = d3.svg.axis().scale(y2)
    .orient("right").ticks(20).tickSize(-width)
    .tickFormat(d3.format(".8f"));

//первая пара
var line = d3.svg.area()
    .x(function(d) { return x(d.date); })
    .y0(function(d) { return y(d.low); })
    .y1(function(d) { return y(d.high); });

//вторая пара-цена
var line2 = d3.svg.area()
    //.interpolate("basis")
    .x(function(d) { return x(d.date); })
    .y0(function(d) { return y2(d.low); })
    .y1(function(d) { return y2(d.high); });

//вторая пара-объем
var line3 = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y3(d.volume); });

//первая пара-объем
var line4 = d3.svg.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y4(d.volume); });


//zoom
var zoom = d3.behavior.zoom()
    //.x(x)
    //.y(y)
    .scaleExtent([0.1, 3])
    .on("zoom", zoomed);

//drug
var drag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);

//добавляем svg
var svg = d3.select("body").append("svg")
    .on("click", mouseclick)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


var points={};

function get_point_id(start_point_id){

    var id=start_point_id;
    if (id in points) {
        start_point_id++;
        return get_point_id(start_point_id);
    }

    return id

}

function add_point(rec,manual_id){

    $(".point.active").attr("class","point");

    var price2=(rec.type=="high" || rec.type=="manual")  ? rec.high : rec.low;

    xc=x(rec.date);
    yc=y2(price2);

    var price1=y.invert(yc);

    $("#btc_price").val(price1);
    $("#coin_price").val(price2);

    if (!manual_id) {
        var id = get_point_id(1);
    } else {
        id=manual_id;
    }
    var point={id:id, price1:price1, price2:price2,type:rec.type,date:rec.date,high:rec.high, low:rec.low};
    points[id]=point;

    $("#points").html(repaint_points("price1",id)+repaint_points("price2",id));

    var stroke=(rec.type=="high")  ? "#840F0D" : ((rec.type=="low") ? "#115904" : "navy");

    svg.append("circle")
        .attr("class",'point active')
        .attr("id",id)
        .attr("cx",xc)
        .attr("cy",yc)
        .attr("r",5)
        .attr("stroke",stroke)
        .on("mouseover", function(){
            var active_point_id=$(this).prop("id");
            $(".point.active").attr("class","point");
            $("#"+active_point_id).attr("class","point active");
            //console.log($("#"+active_point_id).hasClass("active"));

            $("#points").html(repaint_points("price1",active_point_id)+repaint_points("price2",active_point_id));
        })
        .on("mouseout", function(){
            var active_point_id=$(this).prop("id");
            $("#"+active_point_id).attr("class","point");
            active_point_id="";
            //$("#points").html(repaint_points("price1",active_point_id)+repaint_points("price2",active_point_id));
        })
        .on("click", function(){
            d3.event.stopPropagation();
            var id=$(this).prop("id");
            delete points[id];
            this.remove();

            $("#"+id+"text").remove();

            $("#points").html(repaint_points("price1")+repaint_points("price2"));
        });

    svg.append("text")
        .attr("class",'point-text')
        .attr("id",id+"text")
        .attr("x",xc+5)
        .attr("y",yc-5)
        .attr("fill",stroke)
        .text(id)
}

function mouseclick() {
    var coords=d3.mouse(this);
    var xc=coords[0]-margin.left;
    var yc=coords[1]-margin.top;

    //var price1=y.invert(yc);
    var price2=y2.invert(yc);
    var date=x.invert(xc);

    rec={high:price2,date:date,type:'manual'};
    add_point(rec)

}

function repaint_points(price_field,active_point_id){
    var used={};
    var h="<table class='points-table'>";
    h+="<thead><th>id</th><th>point1</th><th>point2</th><th>diff%</th></thead>";
    var pair="";
    var count=0;

    for(var id1 in points){
        for(var id2 in points){
                if (id1!=id2) {
                    pair=id1+"=>"+id2;
                    if (!(pair in used)) {
                        used[pair]=1;
                        var point1=points[id1];
                        var point2=points[id2];
                        var cls="";
                        var valid=true;

                        if (active_point_id) {
                            if (active_point_id==id1){
                                //cls="class='active'";
                            } else {
                                valid=false;
                            }
                        }

                        if (valid) {

                            var diff = (point2[price_field] - point1[price_field]) / point1[price_field] * 100;
                            diff = round(diff, 3);

                            var p1 = point1[price_field];
                            p1 = round(p1, 8);

                            var p2 = point2[price_field];
                            p2 = round(p2, 8);

                            h += "<tr " + cls + "><td>" + pair + "</td><td>" + p1 + "</td><td>" + p2 + "</td><td>" + diff + "</td></tr>";
                            count++;

                        }

                    }
                }
        }
    }
    h+="</table>";
    if (count==0) {h=""}

    return h
}

    //.call(drag);
    //.call(zoom);


function zoomed() {
    svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

var minus_min_start;

function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
    minus_min_start=minus_min;
}

function dragged(d) {
    //console.log(d3.event,d);

    var dx=parseInt(d3.event.dx);
    if (dx<=0) {return}

    var pxInHour=x(new Date("01.01.2000 01:00"))-x(new Date("01.01.2000 00:00"));
    var pxInMin=pxInHour/60;

    //console.log(pxInHour,pxInMin,dx,dx/pxInMin, parseInt(minus_min)+dx/pxInMin)

    minus_min=parseFloat(parseFloat(minus_min)+dx/pxInMin);

    if (Math.abs(minus_min_start-minus_min)>=1) {
        minus_min_start=parseFloat(minus_min);

        //x
        var s=parseInt((((new Date()).getTime())-1000*60*minus_min)/1000);
        glob_data.unshift({date:s});

        var dt=new Date();
        glob_data[0].date=dt.setTime(glob_data[0].date*1000);

        x.domain(d3.extent(glob_data, function(d) { return d.date; }));
        var ox=svg.selectAll(".x").data(glob_data);
        ox.exit().remove();

        ox.enter().append("g")
            .attr("class", "x axis")
            //.call(xAxis(x).tickFormat(d3.timeFormat('%H:%M')) )
            .call(drag);

        ox.attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");

    }

    //d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

function dragended(d) {
    d3.select(this).classed("dragging", false);

    clearInterval(interval);
    interval=setInterval(redraw,10000,minus_min,pairs,period);
    redraw(minus_min,pairs,period);

    //console.log(minus_min)

}

//main
function redraw(minus_min,pairs,period){

    var s=parseInt((((new Date()).getTime())-1000*60*minus_min)/1000);
    var cutoff_s=s;
    var po=parseInt((((new Date()).getTime()))/1000);

    var pair1=pairs[0].pair1;
    var pair2=pairs[0].pair2;

    var pair3=pairs[1].pair1;
    var pair4=pairs[1].pair2;


    function get_new_intervals(){
        var key="save"+pair4+period;
        if (!(key in glob)){
            return [[s,po,'new']];
        } else {
            result=[];

            old=glob[key];


            if ((s*1000)<old.s.getTime()){
                result.push([s,parseInt(old.s.getTime()/1000),'start'])
            }

            if ((po*1000)>old.po.getTime()){
                result.push([parseInt(old.po.getTime()/1000),po,'end'])
            }

            return result

        }
    }
    var intervals=get_new_intervals();
    var balance=0;

    for(var k=0;k<intervals.length;k++){
        var interval=intervals[k];
        redraw_interval(interval);
    }

    function redraw_interval(interval) {

        var s=interval[0];
        var po=interval[1];
        var interval_type=interval[2];

        var url1="https://poloniex.com/public?command=returnChartData&currencyPair="+pair1+"_"+pair2+"&start="+s+"&end="+po+"&period="+period;
        var url2="https://poloniex.com/public?command=returnChartData&currencyPair="+pair3+"_"+pair4+"&start="+s+"&end="+po+"&period="+period;

        balance++;

        $.when(
            $.get(url1),
            $.get(url2)
        ).then(function (data, data2) {

            balance--;

            var dt1 = new Date();
            dt1.setTime(s * 1000);
            var dt2 = new Date();
            dt2.setTime(po * 1000);
            var dt3 = new Date();
            dt3.setTime(cutoff_s * 1000);

            //console.log("interval:",interval,[dt1,dt2]);

            data = data[0];
            data2 = data2[0];

            data.forEach(function (d) {
                //формируем js дату/время
                var dt = new Date();
                dt.setTime(d.date * 1000);
                d.date = dt;
            });
            data2.forEach(function (d) {
                //формируем js дату/время
                var dt = new Date();
                dt.setTime(d.date * 1000);
                d.date = dt;
            });

            //добавляем новую порцию данных к хранимым
            function save_data(s, po, period, pair2, pair4, data, data2) {
                var dt1 = new Date();
                dt1.setTime(s * 1000);

                var dt2 = new Date();
                dt2.setTime(po * 1000);

                function save_coin(key, graph_data) {

                    if (!(key in glob)) { //данные пришли первый раз
                        //console.log("данные пришли первый раз");
                        glob[key] = {s: dt1, po: dt2, graph_data: graph_data}
                    } else { //данные были ранее

                        //бежим по новой порции данных
                        var old = glob[key];
                        var start = [];
                        for (var k = 0; k < graph_data.length; k++) {
                            var rec = graph_data[k];
                            //console.log(k,rec.date.getTime(),old.po.getTime());

                            if (rec.date.getTime() < old.s.getTime()) { //если запись раньше сохранённого периода - добавляем её в start[]
                                start.push(rec);
                            } else if (rec.date.getTime() > old.po.getTime()) { //если запись позже сохранённого периода - добавляем её в конец сохранённого периода
                                old.graph_data.push(rec)
                            }
                        }


                        //start[] - добавляем в начало массива сохранённого периода
                        if (start.length > 0) {
                            start.reverse();
                            for (k = 0; k < start.length; k++) {
                                rec = start[k];
                                old.graph_data.unshift(rec)
                            }
                        }

                        //console.log("новая порция",glob[key]);

                    }

                    glob[key].s = glob[key].graph_data[0].date;
                    glob[key].po = glob[key].graph_data[glob[key].graph_data.length - 1].date;
                    return glob[key].graph_data
                }

                function cutoff(d,dt_from){
                    //console.log(dt_from,s);
                    var result=[];
                    for (k = 0; k < d.length; k++) {
                        rec = d[k];
                        //console.log(dt_from.getTime(),rec.date.getTime());

                        if (rec.date.getTime()>=dt_from.getTime()){
                            result.push(rec)
                        }
                    }
                    return result;
                }

                data = save_coin("save" + pair2 + period, data);
                data2 = save_coin("save" + pair4 + period, data2);

                return {
                    data: cutoff(data, dt3),
                    data2: cutoff(data2, dt3)
                }


            }

            var obj=save_data(s, po, period, pair2, pair4, data, data2);
            data=obj.data;
            data2=obj.data2;

            //начинаем рисовать, только когда пришли все куски данных
            if (balance==0) {

                //console.log("data", data);

                glob_data = data;

                x.domain(d3.extent(data, function (d) {
                    return d.date;
                }));

                y.domain([
                    d3.min(data, function (d) {
                        return Math.min(d.low);
                    }),
                    d3.max(data, function (d) {
                        return Math.max(d.high);
                    })
                ]);

                y2.domain([
                    d3.min(data2, function (d) {
                        return Math.min(d.low);
                    }),
                    d3.max(data2, function (d) {
                        return Math.max(d.high);
                    })
                ]);

                y3.domain([
                    d3.min(data2, function (d) {
                        return Math.min(d.volume);
                    }),
                    d3.max(data2, function (d) {
                        return Math.max(d.volume);
                    })
                ]);

                y4.domain([
                    d3.min(data, function (d) {
                        return Math.min(d.volume);
                    }),
                    d3.max(data, function (d) {
                        return Math.max(d.volume);
                    })
                ]);


                //оси
                //x
                var ox = svg.selectAll(".x").data(data);
                ox.exit().remove();

                ox.enter().append("g")
                    .attr("class", "x axis")
                    .call(drag);

                ox.attr("transform", "translate(0," + height + ")")
                    .call(xAxis)
                    .selectAll("text")
                    .style("text-anchor", "end")
                    .attr("dx", "-.8em")
                    .attr("dy", ".15em")
                    .attr("transform", "rotate(-65)");

                //y-left
                var oy = svg.selectAll(".y").data(data);
                oy.exit().remove();
                oy.enter().append("g")
                    .attr("class", "y axis")
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "-5.0em")
                    .style("text-anchor", "end")
                    .text(pairs[0].pair1 + " / " + pairs[0].pair2)
                    .style("fill", "steelblue");

                oy.transition()
                    .duration(500)
                    .call(yAxis);

                //y-right
                //console.log(data2);
                var oy2 = svg.selectAll(".y2").data(data2);
                oy2.exit().remove();

                oy2.enter().append("g")
                    .attr("transform", "translate(" + width + " ,0)")
                    .attr("class", "y2 axis")
                    //.style("fill", "navy")
                    .append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "6.71em")
                    .style("text-anchor", "end")
                    .text(pairs[1].pair1 + " / " + pairs[1].pair2)
                    .style("fill", "red");


                oy2.transition()
                    .duration(500)
                    .call(yAxisRight)
                    .select("text")
                    .text(pairs[1].pair1 + " / " + pairs[1].pair2)




                //кривая-1
                var l1 = svg.selectAll(".l1").data(data);

                l1.enter().append("path")
                    .attr("class", "line l1");

                l1.attr("d", function () {
                    return interpolate ? line.interpolate('basis')(data) : line.interpolate('none')(data)
                }); //.transition().duration(500)

                l1.exit().remove();


                //кривая-2 xem price in btc
                var l2 = svg.selectAll(".l2").data(data2);

                l2.enter().append("path")
                    .attr("class", "line l2");

                l2.attr("d", function () {
                    return interpolate ? line2.interpolate('basis')(data2) : line2.interpolate('none')(data2)
                });

                l2.exit().remove();

                //кривая-3 xem value in btc
                var l3 = svg.selectAll(".l3").data(data2);

                l3.enter().append("path")
                    .attr("class", "line l3");

                l3.attr("d", function () {
                    return interpolate ? line3.interpolate('basis')(data2) : line3.interpolate('none')(data2)
                });

                l3.exit().remove();

                //кривая-4 usd value in btc/usd
                var l4 = svg.selectAll(".l4").data(data);

                l4.enter().append("path")
                    .attr("class", "line l4");

                l4.attr("d", function () {
                    return interpolate ? line4.interpolate('basis')(data) : line4.interpolate('none')(data)
                });

                l4.exit().remove();


                //points
                $(".point,.point-text").remove();
                for (id in points) {
                    var point = points[id];
                    if (point.type == 'manual') {
                        delete points[id];
                        add_point(point, id);
                    } else {
                        delete points[id]
                    }
                }

                //tops
                was_points = {};
                if (is_points) {
                    find(data2, 'high');
                    find(data2, 'low');
                }

            } //balance

        });

    }


}

var coin="XEM";

var pairs=[
    {pair1:"USDT",pair2:"BTC"},
    {pair1:"BTC",pair2:coin}
];

var period=300;
var minus_min=60;
var interval;
var glob_data;
var interpolate=false;
var is_points=false;

$(document).ready(function(){

    function run_repaint(){
        clearInterval(interval);
        interval=setInterval(redraw,10000,minus_min,pairs,period);
        redraw(minus_min,pairs,period);
    }

    $("[type=button][v]").click(function(e){
        $("[type=button][v]").removeClass("active");

        var btn=$(e.target);
        $(btn).addClass("active");

        period=$(btn).attr("v");

        run_repaint();
    });

    $("[type=button][m]").click(function(e){
        $("[type=button][m]").removeClass("active");

        var btn=$(e.target);
        $(btn).addClass("active");

        minus_min=$(btn).attr("m");

        run_repaint();
    });

    //change coin
    $("[type=button][c]").click(function(e){
        $("[type=button][c]").removeClass("active");

        var btn=$(e.target);
        $(btn).addClass("active");

        coin=$(btn).attr("c");

        if (glob.coin_info_interval){
            clearInterval(glob.coin_info_interval)
        }
        glob.coin_info_interval=setInterval(coin_info,glob.tick_interval,coin);
        coin_info(coin);

        pairs[1].pair2=coin;

        run_repaint();
    });

    //interpolate
    $("#interpolate").change(function(){
        interpolate=$(this).prop('checked');
        run_repaint();
    });

    //points
    $("#is_points").change(function(){
        is_points=$(this).prop('checked');
        run_repaint();
    });


    period=$("[type=button][v].active").attr("v");
    minus_min=$("[type=button][m].active").attr("m");

    interval=setInterval(redraw,10000,minus_min,pairs,period);
    redraw(minus_min,pairs,period);

});

function round(x,y){
    var d=Math.pow(10,y);
    return Math.round(x*d)/d;
}

var was_points={};
//поиск локальных минимумов/максимумов
function find(data,field){

    var diff=0.5; //%
    var group_count=5;
    var result=[];

    for(var k=0;k<data.length-group_count;k++){
        var arr=data.slice(k,k+group_count).sort(function(a,b){
            var v1=a[field];
            var v2=b[field];
            return (field=="high") ? v1>v2 : v1<v2
        });
        //console.log(arr)
        is_top();
    }

    //показываем последние максимумы
    if (result.length){
        var arr=result.reverse().slice(0,2);
        //var arr=result;
        for(var z=arr.length-1;z>=0;z--){
            add_point(arr[z]);
        }
    }

    function is_top(){
        var max=arr[group_count-1];

        var max_val=(field=="high") ? (max[field]-max[field]*diff/100) : (max[field]+max[field]*diff/100);
        max_dt=max.date.getTime();

        var is_left=false;
        var is_right=false;
        var right;

        for(var z=0;z<arr.length-1;z++){
            var min=arr[z];
            var v1=min[field];
            if ((field=="high" && v1<max_val) || (field=="low" && v1>max_val)){
                if (min.date.getTime()<max_dt) {
                    is_left=true;
                } else if (min.date.getTime()>max_dt) {
                    is_right=true;
                    right=min;
                }
            }
        }

        if (is_left && is_right){

                var key=max_dt+'+'+max[field];
                if (!(key in was_points)) {
                    was_points[key] = 1;
                    max.type=field;
                    right.type=field;
                    //result.push(max);
                    result.push(right);
                }

        }

    }
}