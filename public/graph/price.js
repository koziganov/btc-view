var svg;
var margin;
var width, height;
var x, y;
var xAxis, yAxis;
var line;

//добавляем svg
function add_svg() {

    margin = {top: 50, right: 20, bottom: 100, left: 70},
        width = $("#graph").width() - 100 - margin.left - margin.right,
        height = $("#graph").height() - 50 - margin.top - margin.bottom;

    //value
    x = d3.scale.linear()
        .range([0, width]);

    //price
    y = d3.scale.linear()
        .range([height, 0]);


    xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(20);


    yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
        //.ticks(10);
        //.tickSize(-width)
        //.tickFormat(d3.format(".8f"));

    //объем
    line = d3.svg.line()
        .x(function (d) {
            return x(d.price);
        })
        .y(function (d) {
            return y(d.value);
        });

    svg = d3.select('#graph_svg').append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}

//main
function show_orders_graph(pair, data) {

    //console.log(pair, data);

    var coins = pair.split("_");

    //data = data[0];
    var asks = data[pair].asks; //продажа
    var bids = data[pair].bids; //покупка

    asks = arr_process(asks);
    bids = arr_process(bids).reverse();

    data = asks.concat(bids);

    //console.log(bids);

    x.domain([
        d3.min(data, function (d) {
            return Math.min(d.price);
        }),
        d3.max(data, function (d) {
            return Math.max(d.price);
        })
    ]);

    y.domain([
        d3.min(data, function (d) {
            return Math.min(d.value);
        }),
        d3.max(data, function (d) {
            return Math.max(d.value);
        })
    ]);


    //оси
    //x
    var ox = svg.selectAll(".x").data(data);
    ox.exit().remove();

    ox.enter().append("g")
        .attr("class", "x axis")
    /*
     .append("text")
     .style("text-anchor", "end")
     .attr("dx", "-1em")
     .attr("dy", "5em")
     .text(coins[1].toUpperCase())
     .style("fill", "steelblue");
     */

    ox.attr("transform", "translate(0," + (height + 2) + ")")
        .call(xAxis)
    //.selectAll("text")
    //.style("text-anchor", "end")
    //.attr("dx", ".8em")
    //.attr("dy", "1em")
    //.attr("transform", "rotate(-65)");

    //y-left
    var oy = svg.selectAll(".y").data(data);
    oy.exit().remove();
    oy.enter().append("g")
        .attr("class", "y axis");

    oy.call(yAxis);

    $(".y-label").remove();

    oy.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "-5.0em")
        //.attr("dx", "-5.0em")
        .style("text-anchor", "end")
        .text(coins[0].toUpperCase())
        .style("fill", "steelblue");





    //кривая value (bids)
    var l1 = svg.selectAll(".l1").data(bids);

    /*
     l1.enter().append("path")
     .attr("class", "line l1");


     l1.attr("d", function () {
     return interpolate ? line.interpolate('basis')(bids) : line.interpolate('none')(bids)
     });
     */

    l1.enter().append("rect")
        .attr("class", "line l1");

    l1
        .transition()
        .duration(500)
        .attr("x", function (d) {
            return x(d.price);
        })
        .attr("y", function (d) {
            return y(d.value);
        })
        .attr("width", 1)
        .attr("height", function (d) {
            return y(0) - y(d.value);
        })


    l1.exit().remove();


    //кривая value (asks)
    var l2 = svg.selectAll(".l2").data(asks);

    /*
     l2.enter().append("path")
     .attr("class", "line l2");

     l2.attr("d", function () {
     return interpolate ? line.interpolate('basis')(asks) : line.interpolate('none')(asks)
     });
     */
    l2.enter().append("rect")
        .attr("class", "line l2");

    l2
        .transition()
        .duration(500)
        .attr("x", function (d) {
            return x(d.price);
        })
        .attr("y", function (d) {
            return y(d.value);
        })
        .attr("width", 1)
        .attr("height", function (d) {
            return y(0) - y(d.value);
        })

    l2.exit().remove();

    function arr_process(data) {
        var sum = false;
        var d = [];

        var sum_value = 0;

        for (var k = 0; k < data.length; k++) {
            var rec = data[k];

            sum_value += rec[1];

            d.push({
                price: rec[0],
                value: (sum ? sum_value : rec[1])
            });

        }

        return d
    }

}


