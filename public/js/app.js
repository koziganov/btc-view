//var org_status_interval;

//var pairs=[];



var glob={
    interval_ids:[],
    tick_interval:15000, //!!
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

            $.when(
                $.post("/view?method=depth&pairs="+pair_id),
                $.post("/view?method=trades&pairs="+pair_id)
            ).then(function(orders,trades){
                glob.orders=orders[0];
                glob.trades=trades[0];

                //ордера в виде графика
                /*
                if (glob.show_orders_graph_id){
                    clearInterval(glob.show_orders_graph_id);
                    delete glob.show_orders_graph_id;
                }
                */
                show_orders_graph(pair_id, glob.orders);
                //glob.show_orders_graph_id=setInterval(show_orders_graph,glob.tick_interval,pair_id, glob.orders);
                //console.log("then="+pair_id);

                var tab=Ext.getCmp(pair_id).down('panel');

                //продажа
                var grid_title='Продажа: ';
                id="asks"+pair_id;
                var asks_grid=Ext.getCmp(id);
                var asks_data=arr_process(glob.orders[pair_id].asks);
                var d=diff(glob[id] || [],asks_data,["id","_status"]);
                glob[id]=asks_data;
                //console.log(id,"asks_data2",asks_data,glob.asks);


                if (!asks_grid){
                    asks_grid=Ext.create('Ext.grid.Panel', get_orders_cfg(pair_id,[],grid_title,id,'desc'));
                    tab.add(asks_grid);
                }
                //показываем данные с учётом изменений
                add_changes_to_grid(asks_grid,d,grid_title);


                //сделки
                id="trades"+pair_id;
                var trades_grid=Ext.getCmp(id);
                var trades_data=glob.trades[pair_id];

                if (!trades_grid) {
                    //trades_grid.destroy();
                    trades_grid = Ext.create('Ext.grid.Panel', get_trades_cfg(pair_id, [], 'Сделки', id, 'desc'));
                    tab.add(trades_grid);
                }


                //последняя цена
                //trades_grid.down('displayfield').setValue(trades_data[0].price);

                function trades_tab(trades_grid,trades_data){
                    var start=trades_data[0].timestamp;
                    var orders=0;
                    var value=0;
                    var value_type=0;

                    for(var k=0;k<trades_data.length;k++){
                        var rec=trades_data[k];
                        if (rec.timestamp<(start-60)){
                            break;
                        }
                        orders++;
                        value+=rec.amount;
                        if (rec.type=='bid'){
                            value_type=value_type+rec.amount;
                        } else {
                            value_type=value_type-rec.amount;
                        }
                    }
                    //var dt=new Date(value*1000);
                    var f1=trades_grid.down('displayfield').setValue(round(value_type,2)+' v+/m');
                    var p=f1.next().next().setValue(trades_data[0].price);
                    p.next().next().setValue(round(value,2)+' v/m');
                }
                trades_tab(trades_grid,trades_data);

                var store=trades_grid.getStore();
                store.removeAll();
                //store.add(accum_func(trades_data));
                store.add(trades_data);


                //покупка
                var grid_title='Покупка: ';
                var id="bids"+pair_id;
                var bids_grid=Ext.getCmp(id);

                var bids_data=arr_process(glob.orders[pair_id].bids);
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

            var id=grid.id;
            //var pair_arr=pair_id.replace(/asks|bids/,"").split("_");
            //console.log(id, "changes", changes);

            var store=grid.getStore();

            //ищем что удалить
            var store_records_for_remove=[];
            for(var k=0;k<changes.old.length;k++){
                var rec_for_remove=changes.old[k];

                for(var j=0;j<store.data.count();j++){
                    var rec=store.data.items[j].data;
                    if (rec.price==rec_for_remove.price && rec.value==rec_for_remove.value) {
                        //store_records_for_remove.push(store.data.items[j]);

                        var record=store.getAt(j);
                        //var record=store.getById(store.data.items[j].id);
                        record.set("_status","old");
                        store_records_for_remove.push(record);

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

                /*
                if (changes.old.length==0){
                    store.removeAll();
                }
                */

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
                        xtype:'displayfield' //%vls

                    },'->',
                    {
                        xtype:'textfield', //%diff
                        emptyText:'%diff',
                        id: (id+'diff_percent'),
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
                        value:'%diff'


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
                            if ((price*row.data.value)>=2000) {
                                return '<b>'+price+'</b>'
                            }
                            return price
                        }
                    },
                    {   text: 'value', dataIndex: 'value', flex: 1,
                        renderer: function(value,b,row){
                            if ((value*row.data.price)>=2000) {
                                return '<b>'+value+'</b>'
                            }
                            return value
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
                        //console.log(record.get('type'));
                        if (record.get('type')=="bid") {
                            return 'emp_loaded'
                        }
                        return 'emp_err'
                    }

                },

                tbar: [
                    {
                        xtype: 'displayfield'
                    },
                    '->',
                    {
                        xtype: 'displayfield',
                        renderer: function(v){
                            var edizm=pair_id.split("_")[1]
                            return '<b>'+v+'</b> '+edizm
                        }
                    },
                    '->',
                    {
                        xtype: 'displayfield'
                    }
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
                                if (row.type == 'bid') { //покупка
                                    bids_value+=row.amount;
                                } else {
                                    asks_value+=row.amount;
                                }
                            }

                            bids_value=Math.round(bids_value*100000)/100000;
                            asks_value=Math.round(asks_value*100000)/100000;

                            return "покупка:"+bids_value+"; продажа:"+asks_value;
                        }
                    },

                    {
                        text: 'type', dataIndex: 'type', flex: 1,
                        renderer: function(value){
                            return value=='bid' ? "покупка" : "продажа"
                        }
                    },
                    {
                        text:'time',
                        dataIndex:'timestamp',
                        flex:1,
                        renderer: function(value){
                            var dt=new Date(value*1000);

                            var h=dt.getHours()+'';
                            if (h.length==1) {h='0'+h}

                            var m=dt.getMinutes()+'';
                            if (m.length==1) {m='0'+m}

                            var s=dt.getSeconds()+'';
                            if (s.length==1) {s='0'+s}

                            return h+":"+m+":"+s;
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
                        //console.log(glob.interval_ids,glob.ticker)
                        clearInterval(glob.ticker);
                        delete glob.ticker;
                    }

                    glob.asks=[];
                    glob.bids=[];

                    /*
                    var old_id=oldTab.id;
                    Ext.getCmp('asks'+old_id).destroy();
                    Ext.getCmp('bids'+old_id).destroy();
                    Ext.getCmp('trades'+old_id).destroy();
                    */

                    build_pair_info(pair_id);
                    glob.ticker=setInterval(build_pair_info,glob.tick_interval,pair_id);
                    glob.interval_ids.push(glob.ticker)

                    //newTab.addCls('emp_loaded')
                }
            },
            items: [ ]//tabs

        };

        var first_pair;

        for(var pair in j.pairs) {



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
                            id:'graph',
                            html:'<div id="graph_svg"></div>',
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

        add_svg();

        if (glob.ticker) {
            console.log(glob.interval_ids, glob.ticker);
            clearInterval(glob.ticker);
            delete glob.ticker
        }

        build_pair_info(first_pair);
        glob.ticker = setInterval(build_pair_info, glob.tick_interval, first_pair);
        glob.interval_ids.push(glob.ticker)
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


    $.post("/view?method=info","",function(j){
        glob.info=j;
        BuildMainTabs(j)
    });


}); //onReady