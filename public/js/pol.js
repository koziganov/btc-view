//var org_status_interval;
//var pairs=[];

//Ext.ComponentQuery.query('textfield[cls=order_vls_percent]');

var glob={
    tick_interval:60000, //!!
    remove_delay:300,
    trade_percent_asks:20, //ордера на продажу: на сколько заглядывать в стаканы (по value) для установки цены продажи
    trade_percent_bids:20, //ордера на закупку: на сколько заглядывать в стаканы (по value) для установки цены покупки
    info:{},
    asks:[], //current
    bids:[],  //current
    stop_refresh: false, //для приостановки обновления гридов при необходимости
    selection_color:'#d1eff7'
};

Ext.Loader.setConfig({
    disableCaching: true
});

Ext.onReady(function () {

    Ext.QuickTips.init();

    $.post("/pol?method=returnTicker","",function(j){
        glob.info=j;
        BuildMainTabs(j)
    });

    var HTMLPanel = Ext.extend(Ext.Panel, {
        constructor : function( config ) {
            HTMLPanel.superclass.constructor.apply(this, arguments);

            // load the html file with ajax when the item is
            // added to the parent container
            this.on(
                "added",
                function( panel, container, index ) {
                    if( this.url && (this.url.length > 0) )
                    {
                        Ext.Ajax.request({
                            url : this.url,
                            method : "GET",
                            success : function( response, request ) {
                                //console.log("success -- response: "+response.responseText);
                                panel.update(response.responseText);
                            },
                            failure : function( response, request ) {
                                //console.log("failed -- response: "+response.responseText);
                            }
                        });
                    }
                },
                this
            )
        },

        url : null
    });


    function accum_func(data){

        console.log('cur1',data[0]);

        var accum=[];
        var accum_rec={};
        var is_accumulated=false;
        for(var k=0;k<data.length;k++){
            is_accumulated=false;


            var rec=data[k];
            if (!('price' in accum_rec)){ //первая строка
                accum_rec=rec
            } else if (accum_rec.price==rec.price && accum_rec.type==rec.type){ //записи совпадают по цене и типу
                accum_rec.ammoun+=rec.ammount; //складываем value
            } else { //записи отличаются
                accum.push(accum_rec); //фиксируем что насобирали
                accum_rec=rec;//из тек.записи делаем новый аккум
                is_accumulated=true
            }
        } //for

        if (!is_accumulated) {
            accum.push(accum_rec);
        } else {
            accum.push(rec);
        }

        //console.log('cur2',accum[0]);

        return accum;
    }

    function BuildMainTabs(j){

        function build_pair_info(pair_id){

            if (glob.stop_refresh) {
                return
            }

           //console.log("build_pair_info="+pair_id);
            //var tab=Ext.getCmp(pair_id).down('panel')

            //https://poloniex.com/public?command=returnTradeHistory&currencyPair=BTC_NXT&start=1410158341&end=1410499372
            //https://poloniex.com/public?command=returnOrderBook&currencyPair=BTC_NXT&depth=10

            $.when(
                $.post("/pol?method=returnOrderBook&pair="+pair_id),
                $.post("/pol?method=returnTradeHistory&pair="+pair_id)
            ).then(function(orders,trades){
                glob.orders=orders[0];
                glob.trades=trades[0];

                //console.log("then="+pair_id);

                var tab=Ext.getCmp(pair_id).down('panel');

                //продажа
                var grid_title='Продажа: ';
                id="asks"+pair_id;
                var asks_grid=Ext.getCmp(id);
                var asks_data=arr_process(glob.orders.asks);

                var d=diff(glob[id] || [],asks_data,["id","_status"]);
                glob[id]=asks_data;
                //asks_grid.destroy();

                if (!asks_grid) {
                    asks_grid = Ext.create('Ext.grid.Panel', get_orders_cfg(pair_id, [], grid_title, id, 'desc'));
                    tab.add(asks_grid);
                }

                //показываем данные с учётом изменений
                add_changes_to_grid(asks_grid,d,grid_title);


                //сделки
                id="trades"+pair_id;
                var trades_grid=Ext.getCmp(id);
                var trades_data=glob.trades;


                for(var k=0;k<trades_data.length;k++){
                    trades_data[k].price=trades_data[k].rate;
                }

                if (!trades_grid){
                    //trades_grid.destroy();
                    trades_grid=Ext.create('Ext.grid.Panel', get_trades_cfg(pair_id,[],'Сделки',id,'desc'));
                    tab.add(trades_grid);
                }

                //последняя цена
                trades_grid.down('displayfield').setValue(trades_data[0].price);

                var store=trades_grid.getStore();
                store.removeAll();
                //store.add(accum_func(trades_data));
                store.add(trades_data);


                //покупка
                var grid_title='Покупка: ';
                var id="bids"+pair_id;
                var bids_grid=Ext.getCmp(id);

                var bids_data=arr_process(glob.orders.bids);
                var d=diff(glob[id] || [],bids_data,["id","_status"]);
                //console.log("diff",d);

                glob[id]=bids_data;

                if (!bids_grid) {
                    bids_grid=Ext.create('Ext.grid.Panel', get_orders_cfg(pair_id,[],grid_title,id,'desc'));
                    tab.add(bids_grid);
                }
                //показываем данные с учётом изменений
                add_changes_to_grid(bids_grid,d,grid_title);


                /*
                id="info"+pair_id;
                var info_panel=Ext.getCmp(id);
                if (info_panel) {
                    info_panel.destroy();
                }


                info_panel = asks_grid=Ext.create('Ext.panel.Panel', get_info_panel(id));
                tab.add(info_panel);
                */



                //console.log("glob",glob)
            });
        }

        function get_info_panel(id){
            return {
                xtype:'panel',
                flex: 1,
                id:id
            }
        }

        function arr_process(data){
            var d=[];

            for(var k=0;k<data.length;k++){
                var rec=data[k];
                d.push({
                    price:rec[0],
                    value:rec[1]
                });

            }

            return d
        }

        function add_changes_to_grid(grid,changes,title){

            //console.log("changes",changes);

            var id=grid.id;
            //var pair_arr=pair_id.replace(/asks|bids/,"").split("_");

            var store=grid.getStore();

            //ищем что удалить
            var store_records_for_remove=[];
            for(var k=0;k<changes.old.length;k++){
                var rec_for_remove=changes.old[k];

                for(var j=0;j<store.data.count();j++){
                    var rec=store.data.items[j].data;
                    if (rec.price==rec_for_remove.price && rec.value==rec_for_remove.value) {
                        store_records_for_remove.push(store.data.items[j]);

                        var record=store.getAt(j);
                        //var record=store.getById(store.data.items[j].id);
                        record.set("_status","old");

                        j=store.data.count(); //exit for
                    }
                }
            }

            //удаляем с задержкой+после удаления добавляем новые элементы
            setTimeout(function(store,vls){
                store.remove(vls);
                if (store.data.count()==0){ //при первом заполнении стора добавляем changes.eq (чтобы не красилось в зелёный)
                    store.add(changes.eq);
                }
                store.add(changes.new);

                var data=changes.new.concat(changes.eq);

                var d=[];
                var min=99999999;
                var max=0;
                var val=0;

                for(var k=0;k<data.length;k++){
                    var rec=data[k];
                    if (rec.price<min){min=rec.price}
                    if (rec.price>max){max=rec.price}
                    val+=rec.value;
                }

                val=round(val,2);

                grid.setTitle(title+" ["+min+"-"+max+"] v:"+beautify_number(val));


                /*
                 glob.target_value=target_price;
                 glob.target_func=change_price;
                */

                if (id.match(/ask/)) {
                    if (glob.asks_target_func) {
                        glob.asks_target_func.apply(this, [glob.asks_target_value, id])
                    }
                } else {
                    if (glob.bids_target_func) {
                        glob.bids_target_func.apply(this, [glob.bids_target_value, id])
                    }
                }

                if (id.match(/ask/)) {
                    //console.log(store.data.count()-1);
                    //setTimeout(function(grid,store){
                        //console.log()
                        grid.getView().focusRow(store.getAt(store.data.count()-1));
                    //},300,grid,store);

                } else {
                    grid.getView().focusRow(store.getAt(0));
                }


            },glob.remove_delay,store,store_records_for_remove);



        }

        function get_orders_cfg(pair_id,data,title,id,sort) {
            //console.log('pair_id',pair_id);
            var pair_arr=pair_id.replace(/asks|bids/,"").split("_");

            //грид с ордерами (покупка/продажа)
            return  {
                id:id,
                title: title,
                //scrollToTopOnRefresh:true,

                viewConfig: {

                    stripeRows: false,
                    getRowClass: function(record) {
                        if (record.get('_status')=="new") {
                            return 'emp_loaded'
                        } else if (record.get('_status')=="old") {
                            return 'emp_err'
                        }
                        return ''
                    }

                },

                tbar:[
                    {   //цена
                        xtype:'textfield',
                        id: (id+'price'),
                        cls:'order_price',
                        width: '80px',
                        enableKeyEvents: true,
                        emptyText:'price',

                        //fieldLabel:pair_arr[1]
                        listeners: {
                            focus: function(field,b){

                                /*
                                glob.stop_refresh=true;

                                var grid=field.up('grid');
                                var pair_id=grid.id.replace('asks',"").replace('bids',"");
                                console.log(pair_id,glob.ticker);

                                if (!glob.ticker) {
                                    clearInterval(glob.ticker)
                                }
                                */

                                //build_pair_info(pair_id);
                                //glob.ticker=setInterval(build_pair_info,glob.tick_interval,pair_id);
                            },
                            keyup: function(my){ //изменили цену
                                var target_price=my.getValue();
                                //my.addCls('emp_loaded');
                                change_price(target_price,id); //calc.js
                            } //change
                        } //listeners


                    },
                    {   //% заглядывания в ордеры

                        xtype:'textfield',
                        id: (id+'vls_percent'),
                        cls:'order_vls_percent',
                        emptyText:'%vls',
                        width: '50px',
                        enableKeyEvents: true,

                        listeners: {
                            keyup: function(my){ //изменили %
                                var target_vls_percent=my.getValue();
                                change_vls_percent(target_vls_percent,id) //calc.js
                            }
                        }


                    },
                    {
                        xtype:'displayfield', //%vls
                        cls:'order_vls_percent_edizm'

                    },'->',
                    {
                        xtype:'textfield', //%diff
                        emptyText:'%diff',
                        id: (id+'diff_percent'),
                        cls:'order_diff_percent',
                        width: '45px',
                        enableKeyEvents: true,
                        listeners:{
                            keyup: function(my){ //изменили %diff
                                var target_percent=my.getValue();
                                change_percent(target_percent,id) //calc.js
                            }
                        }

                    },
                    {
                        xtype:'displayfield', //%diff label
                        value:'%diff',
                        cls:'order_diff_percent_edizm'


                    }
                ],
                //selModel: {singleSelect:true},
                //multiSelect: false,
                //singleSelect: true,
                //selModel: Ext.create('Ext.selection.CheckboxModel'),
                listeners: {

                    'selectionchange': function (model, records) {

                        if (records.length == 0) {
                            return
                        }

                        var price = records[0].data.price;
                        Ext.getCmp(id).getSelectionModel().clearSelections();

                        Ext.getCmp(id).down('textfield').setValue(price);
                        change_price(price,id);

                    }


                },

                flex: 1,

                store: {
                    fields: ['price', 'value',"_status"],
                    data:data,
                    sorters: [{
                        property: 'price',
                        direction: sort
                    }],
                    autoLoad: true
                },

                columns: [
                    {
                        text: 'price',
                        dataIndex: 'price',
                        renderer: function(price,b,row){
                            if ((price*row.data.value)>=1) {
                                return '<b>'+price+'</b>'
                            }
                            return price
                        }
                    },
                    {   text: 'value', dataIndex: 'value', flex: 1,
                        renderer: function(value,b,row){
                            if ((value*row.data.price)>=1) {
                                return '<b>'+beautify_number(value)+'</b>'
                            }
                            return beautify_number(value)
                        }
                    }

                ]
            }
        }

        //совершённые сделки
        function get_trades_cfg(pair_id,data,title,id,sort){

            //грид с совершёнными сделками
            return  {
                id:id,
                title: title, //(title+" ["+min+"-"+max+"]"),
                /*
                features: [{
                    ftype: 'summary',
                    dock: 'top'
                }],
                */
                //selModel: {singleSelect:false},
                //multiSelect: true,
                //selModel: Ext.create('Ext.selection.CheckboxModel'),
                viewConfig: {

                    stripeRows: false,
                    getRowClass: function(record) {
                        if (record.get('type')=="buy") {
                            return 'emp_loaded'
                        }
                        return 'emp_err'
                    }

                },

                tbar: [
                    '->',
                    {
                        xtype: 'displayfield',
                        renderer: function(v){
                            var edizm=pair_id.split("_")[0];
                            return '<b>'+v+'</b> '+edizm
                        }
                    },
                    '->'
                ],

                singleSelect: false,
                flex: 1,

                store: {
                    fields: ['price', 'amount','type'],
                    data:data,
                    autoLoad: true
                },

                columns: [
                    {
                        text: 'price',
                        dataIndex: 'price',
                        //flex:1,
                        renderer: function(price,b,row){
                            //console.log(price*row.data.amount);
                            if ((price*row.data.amount)>=1000) {
                                return '<b>'+price+'</b>'
                            }
                            return price
                        },
                        summaryType: function (values) {

                            var bids_value = 0;
                            var asks_value = 0;
                            var bids_usd = 0;
                            var asks_usd = 0;


                            for (var k = 0; k < values.length; k++) {
                                var row = values[k].data;
                                if (row.type == 'bid') { //покупка
                                    bids_value+=row.amount;
                                    bids_usd+=row.amount*row.price;
                                } else { //продажи
                                    asks_value+=row.amount;
                                    asks_usd+=row.amount*row.price;
                                }
                            }

                            bids_value=Math.round(bids_usd/bids_value*100000)/100000;
                            asks_value=Math.round(asks_usd/asks_value*100000)/100000;

                            return "покупка:"+bids_value+"; продажа:"+asks_value;
                        }
                    },
                    {
                        text: 'value',
                        dataIndex: 'amount',
                        flex: 1,
                        summaryType: function (values) {
                            //console.log("values", values);
                            var bids_value = 0;
                            var asks_value = 0;


                            for (var k = 0; k < values.length; k++) {
                                var row = values[k].data;
                                if (row.type == 'buy') { //покупка
                                    bids_value+=row.amount;
                                } else {
                                    asks_value+=row.amount;
                                }
                            }

                            bids_value=Math.round(bids_value*100000)/100000;
                            asks_value=Math.round(asks_value*100000)/100000;

                            return "покупка:"+bids_value+"; продажа:"+asks_value;
                        },
                        renderer: function(value){
                            return beautify_number(value)
                        }
                    },

                    {
                        text: 'type', dataIndex: 'type', flex: 1,
                        renderer: function(value){
                            return (value=='buy') ? "покупка" : "продажа"
                        }
                    }

                ]
            }
        }

        //контейнер с табами
        cfg={
            xtype: 'tabpanel',
            //controller: 'tab-view',
            region: 'center',
            tabPosition:'left',
            tabRotation: 0,
            //layout: 'fit',
            layout: {
                type: 'hbox',
                align: 'stretch'
            },

            activeTab: 0,
            listeners:{
                tabchange: function (tabs, newTab, oldTab) {
                    var pair_id=newTab.id;

                    if (glob.ticker) {
                        clearInterval(glob.ticker)
                    }

                    /*
                    var old_id=oldTab.id;
                    Ext.getCmp('asks'+old_id).destroy();
                    Ext.getCmp('bids'+old_id).destroy();
                    Ext.getCmp('trades'+old_id).destroy();
                    */

                    build_pair_info(pair_id);
                    glob.ticker=setInterval(build_pair_info,glob.tick_interval,pair_id);

                    //newTab.addCls('emp_loaded')
                }
            },
            items: [ ]//tabs

        };

        var first_pair;

        for(var pair in j) {

            if (pair.match(/XEM/) || pair.match(/USDT/)) {

                if (!first_pair) {
                    first_pair = pair;
                }

                //1 таб
                cfg.items.push({

                    title: pair,
                    id: pair,

                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },

                    items: [
                        {
                            xtype: 'panel',
                            flex: 1,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            }

                        },

                        {
                            xtype: 'panel',
                            flex: 3,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            html:'<iframe src="graph/index.html" style="width:1400px; height:1000px;"></iframe>',

                            load: function () {
                                console.log('renderer')
                            }


                        }


                    ]


                });

            }

        } //for in pairs

        for(var pair in j) {

            if (! (pair.match(/XEM/) || pair.match(/USDT/)) ) {

                if (!first_pair) {
                    first_pair = pair;
                }

                //1 таб
                cfg.items.push({

                    title: pair,
                    id: pair,

                    layout: {
                        type: 'hbox',
                        align: 'stretch'
                    },

                    items: [
                        {
                            xtype: 'panel',
                            flex: 1,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            }

                        },
                        {
                            xtype: 'panel',
                            flex: 3,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            //html:'<iframe src="https://bitcoinwisdom.com/markets/btce/btcusd" style="width:800px; height:600px;"></iframe>',

                            load: function () {
                                console.log('renderer')
                            }


                        }

                    ]


                });

            }

        } //for in pairs


        //top-tabs
        var topTabs = Ext.create('Ext.tab.Panel', cfg);

        Ext.create('Ext.container.Viewport', {
            id: 'viewport',
            layout: 'border',
            items: [
                topTabs,
/*
                {
                    region: 'north',
                    xtype: 'panel',
                    id: 'footer',
                    height: 25,
                    titleAlign:'center'

                }
*/

            ]//items-viewport
        }); //viewPort

        //запускаем периодическое обновление
        //console.log("first_pair="+first_pair);


        if (glob.ticker) {
            clearInterval(glob.ticker)
        }

        build_pair_info(first_pair);
        glob.ticker=setInterval(build_pair_info,glob.tick_interval,first_pair);

        //$(".x-grid-row-summary .x-grid-cell").css("background-color","gray")

    }


    //hotkeys==
    function F1F3(ev, b, c) {

        //expand help on F1
        if (ev.browserEvent.code == 'F1') {
            ev.preventDefault();
            //Ext.Msg.show({ msg: 'F1 pressed!' });

            if (typeof(Ext.getCmp('helpPanel').getCollapsed()) == 'string') {
                Ext.getCmp('helpPanel').expand();
            } else {
                Ext.getCmp('helpPanel').collapse();
            }

            return
        }

        //open tab1 on F2
        if (ev.browserEvent.code == 'F2') {
            ev.preventDefault();
            Ext.getCmp('tab1').show();
            return;
        }

        //open tab2 on F3
        if (ev.browserEvent.code == 'F3') {
            ev.preventDefault();
            Ext.getCmp('tab2').show();
            return;
        }

        //open tab3 on F4
        if (ev.browserEvent.code == 'F4') {
            ev.preventDefault();
            Ext.getCmp('tab3').show();
            return;
        }
    }


    Ext.EventManager.on(window, 'keydown', function(e, t) {
        if (e.getKey() == e.BACKSPACE && ( (!/^input$/i.test(t.tagName) && !/^textarea$/i.test(t.tagName) ) || t.disabled || t.readOnly)) {
            e.stopEvent();
        }

    });
    Ext.getBody().on('keydown', F1F3);
    //end hotkeys==

}); //onReady