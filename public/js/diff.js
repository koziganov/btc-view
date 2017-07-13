/**
 * Created by kozhiganov on 26.05.2017.
 */
function diff(old_arr,new_arr,exclude_fields){

    //console.warn(old_arr[0],new_arr[0])

    if (old_arr.length==0) {
        return {
            "old": [],
            "eq": new_arr,
            "new": [],
            "all": new_arr
        }
    }

    direction=(new_arr[0].price>new_arr[1].price) ? "desc" : "asc";

    var ret={

        direction: direction,
        old_arr: old_arr,
        new_arr: new_arr,

        old_elems: [],
        equal_elems: [],
        new_elems: [],
        all_elems: [],

        old_arr_pointer:0,
        new_arr_pointer:0,

        is_eq_pair: function(){
            var old_elem=this.old_arr[this.old_arr_pointer];
            var new_elem=this.new_arr[this.new_arr_pointer];

            if (typeof exclude_fields !='undefined') {
                for(var k=0;k<exclude_fields.length;k++){
                    var exclude_field=exclude_fields[k];
                    delete old_elem[exclude_field];
                    delete new_elem[exclude_field]
                }
            }

            //tmp
            if (JSON.stringify(old_elem,null,"\t")!=JSON.stringify(new_elem,null,"\t")) {
                //console.warn(old_arr,new_arr,JSON.stringify(old_elem,null,"\t"),JSON.stringify(new_elem,null,"\t"))
            }

            return JSON.stringify(old_elem,null,"\t")==JSON.stringify(new_elem,null,"\t");
        },

        //идем по старому массиву до элемента совпадающего с элементом нового
        moveByOldArr: function(){
            if (this.old_arr_pointer==this.old_arr.length) {return}
            if (this.new_arr_pointer==this.new_arr.length) {return}

            var old_elem=this.old_arr[this.old_arr_pointer];
            var new_elem=this.new_arr[this.new_arr_pointer];


            if (typeof exclude_fields !='undefined') {
                for(var k=0;k<exclude_fields.length;k++){
                    var exclude_field=exclude_fields[k];
                    delete old_elem[exclude_field];
                    delete new_elem[exclude_field]
                }
            }


            if (this.is_eq_pair()){ //в сравнении равные объекты
                old_elem._status="equal";
                this.all_elems.push(old_elem);
                this.equal_elems.push(old_elem);
                this.old_arr_pointer++;
                this.new_arr_pointer++

            } else { //в сравнении разные объекты

                this.all_elems.push(old_elem);

                if (this.direction=="asc"){
                    if (old_elem.price<new_elem.price){
                        old_elem._status="old";
                        this.old_elems.push(old_elem);
                        this.old_arr_pointer++;
                    }  else {
                        new_elem._status="new";
                        this.new_elems.push(new_elem);
                        this.new_arr_pointer++;
                    }
                } else {
                    if (old_elem.price>new_elem.price){
                        old_elem._status="old";
                        this.old_elems.push(old_elem);
                        this.old_arr_pointer++;
                    }  else {
                        new_elem._status="new";
                        this.new_elems.push(new_elem);
                        this.new_arr_pointer++;
                    }
                }

            }

            this.moveByOldArr();

        },

        moveByNewArr: function() {

            if (this.new_arr_pointer == this.new_arr.length) {
                return
            }

            for(var k=this.new_arr_pointer;k<this.new_arr.length;k++){
                var new_elem=this.new_arr[k];
                new_elem._status="new";
                this.new_elems.push(new_elem);
                this.all_elems.push(new_elem);
            }
        }

    };



    ret.moveByOldArr();
    ret.moveByNewArr();

    return {
        "old":ret.old_elems,
        "eq":ret.equal_elems,
        "new":ret.new_elems,
        "all":ret.all_elems
    }

}
