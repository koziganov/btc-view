function is_asks(id){
    return !!id.match(/asks/);
}

function change_price(target_price,id){

    try{
        target_price=parseFloat(target_price);
    } catch(e){
        console.warn(e);
        return
    }
    if (!target_price) {return}

    Ext.getCmp(id+'price').setFieldStyle('background-color: '+glob.selection_color+';background-image: none;');
    Ext.getCmp(id+'vls_percent').setFieldStyle('background-color: white;');
    Ext.getCmp(id+'diff_percent').setFieldStyle('background-color: white;');


    if (id.match(/ask/)) {
        glob.asks_target_value = target_price;
        glob.asks_target_func = change_price;
    } else {
        glob.bids_target_value = target_price;
        glob.bids_target_func = change_price;
    }

    var pair_arr=id.replace(/asks|bids/,"").split("_");

    var grid=Ext.getCmp(id);
    var store=grid.getStore();
    var data=store.data.items;

    var all_values=0;

    for(var k=0;k<data.length;k++){
        var rec=data[k].data;
        all_values+=rec.value;
    }

    var deep_cur=0;

    if (is_asks(id)) {

        for (var k = data.length-1; k>=0 ; k--) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;

            deep_cur += value;

            if (price>=target_price)  {
                break;
            }
        }

        var first_price=data[data.length-1].data.price;

    } else {
        var first_price=data[0].data.price;

        for (var k = 0; k<data.length; k++) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;
            deep_cur += value;

            if (price<=target_price)  {
                break;
            }
        }

    }

    //%vls
    var vls_percent=deep_cur/all_values*100;
    vls_percent=round(vls_percent,3);
    Ext.getCmp(id+'vls_percent').setValue(vls_percent);

    deep_cur=round(deep_cur,2);
    Ext.getCmp(id+'vls_percent').next().setValue("%vls <b>"+beautify_number(deep_cur)+"</b> "+pair_arr[0]);

    //%dif
    var diff=Math.abs(first_price-target_price); //разница цены
    var diff_percent=diff*100/first_price ; //считаем % разницы к максимуму

    diff_percent=round(diff_percent,2);
    Ext.getCmp(id+'diff_percent').setValue(diff_percent);


}

function change_vls_percent(target_vls_percent,id){
    try{
     target_vls_percent=parseFloat(target_vls_percent);
    } catch(e){
        console.warn(e);
        return
    }
    if (!target_vls_percent) {return}


    if (id.match(/ask/)) {
        glob.asks_target_value=target_vls_percent;
        glob.asks_target_func=change_vls_percent;
    } else {
        glob.bids_target_value=target_vls_percent;
        glob.bids_target_func=change_vls_percent;
    }

    Ext.getCmp(id+'price').setFieldStyle('background-color: white;');
    Ext.getCmp(id+'vls_percent').setFieldStyle('background-color: '+glob.selection_color+';background-image: none;');
    Ext.getCmp(id+'diff_percent').setFieldStyle('background-color: white;');


    var pair_arr=id.replace(/asks|bids/,"").split("_");

    var grid=Ext.getCmp(id);
    var store=grid.getStore();
    var data=store.data.items;

    var all_values=0;

    for(var k=0;k<data.length;k++){
        var rec=data[k].data;
        all_values+=rec.value;
    }

    var target_val=target_vls_percent/100*all_values;

    var deep_cur=0;
    //console.log(id,target_price,is_asks(id),first_price);

    if (is_asks(id)) {

        for (var k = data.length-1; k>=0 ; k--) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;

            deep_cur += value;
            //console.log(price, target_price);

            if (deep_cur>=target_val)  {
                break;
            }
        }

        var first_price=data[data.length-1].data.price;

    } else {
        var first_price=data[0].data.price;

        for (var k = 0; k<data.length; k++) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;

            deep_cur += value;
            //console.log(price, target_price);

            if (deep_cur>=target_val)  {
                break;
            }
        }

    }

    //price
    Ext.getCmp(id+'price').setValue(price);

    //%vls
    Ext.getCmp(id+'vls_percent').setValue(target_vls_percent);
    deep_cur=round(deep_cur,2);
    Ext.getCmp(id+'vls_percent').next().setValue("%vls <b>"+beautify_number(deep_cur)+"</b> "+pair_arr[0]);

    //%dif
    var diff=Math.abs(first_price-price); //разница цены
    var diff_percent=diff*100/first_price ; //считаем % разницы к максимуму

    diff_percent=round(diff_percent,2);
    Ext.getCmp(id+'diff_percent').setValue(diff_percent);

}


function change_percent(target_percent,id){
    try{
        target_percent=parseFloat(target_percent);
    } catch(e){
        console.warn(e);
        return
    }
    if (!target_percent) {return}


    if (id.match(/ask/)) {
        glob.asks_target_value=target_percent;
        glob.asks_target_func=change_percent;
    } else {
        glob.bids_target_value=target_percent;
        glob.bids_target_func=change_percent;
    }

    Ext.getCmp(id+'price').setFieldStyle('background-color: white;');
    Ext.getCmp(id+'vls_percent').setFieldStyle('background-color: white;');
    Ext.getCmp(id+'diff_percent').setFieldStyle('background-color: '+glob.selection_color+';background-image: none;');

    var pair_arr=id.replace(/asks|bids/,"").split("_");

    var grid=Ext.getCmp(id);
    var store=grid.getStore();
    var data=store.data.items;

    var all_values=0;

    for(var k=0;k<data.length;k++){
        var rec=data[k].data;
        all_values+=rec.value;
    }

    var deep_cur=0;



    if (is_asks(id)) {

        var first_price=parseFloat(data[data.length-1].data.price);
        var target_price=first_price+first_price*target_percent/100;

        for (var k = data.length-1; k>=0 ; k--) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;

            deep_cur += value;

            if (price>=target_price)  {
                break;
            }
        }

    } else {
        var first_price=parseFloat(data[0].data.price);
        var target_price=first_price-first_price*target_percent/100;

        for (var k = 0; k<data.length; k++) {
            var rec = data[k].data;
            var price = rec.price;
            var value = rec.value;

            deep_cur += value;

            if (price<=target_price)  {
                break;
            }
        }

    }

    //console.log(target_percent,first_price,target_price);

    //price
    target_price=round(target_price,parseInt(target_price)==0 ? 8 : 3 );
    Ext.getCmp(id+'price').setValue(target_price);

    //%vls
    vls_percent=deep_cur/all_values*100;
    vls_percent=round(vls_percent,3);
    Ext.getCmp(id+'vls_percent').setValue(vls_percent);
    deep_cur=round(deep_cur,2);
    Ext.getCmp(id+'vls_percent').next().setValue("%vls <b>"+beautify_number(deep_cur)+"</b> "+pair_arr[0]);

    //%dif
    Ext.getCmp(id+'diff_percent').setValue(target_percent);


}

function round(base,digits_after_point){
    var d=Math.pow(10,digits_after_point);
    return Math.round(base*d)/d;
}

/*
function fix(base,digits_after_point){
    var d=Math.pow(10,digits_after_point);
    return Math.floor(base*d)/d;
}
*/

function group(arr,grp_field,digits_after_point,sum_field){
    var result={};
    for(var k=0;k<arr.length;k++){
        var rec=arr[k];
        var key=round(rec[grp_field],digits_after_point);
        if (!(key in result)){
            result[key]=rec;
            result[key]._count=1
        } else {
            result[key][sum_field]=result[key][sum_field]+rec[sum_field];
            result[key]._count++;
        }
        result[key][grp_field]=key;

    }

    var sort_asc=(arr[0][grp_field]<arr[1][grp_field]);

    return obj2arr(result,function(a,b){
        return sort_asc ? a[grp_field]>b[grp_field] : a[grp_field]<b[grp_field];
    });
}

function obj2arr(obj,sort_func){
    var result=[];
    for(var k in obj){
        result.push(obj[k])
    };
    return result.sort(sort_func)
}

function beautify_number(d){
    var replacer="&thinsp;";
    var v=(''+d).split(".");
    var v1=v[0].split('').reverse().join('').replace(/(\d{3})/g,'$1][').split('').reverse().join('');
    v1=v1.replace(/^[^\d]+/,"").replace(/\[\]/g,replacer);
    return v.length>1 ? (v1+"."+v[1]) : v1
}