require('../../common/vendor.js');(global["webpackJsonp"]=global["webpackJsonp"]||[]).push([["pages/goods/lottery/components/noticeBar"],{2554:function(t,n,e){},"2e77":function(t,n,e){"use strict";Object.defineProperty(n,"__esModule",{value:!0}),n.default=void 0;var i={name:"noticeBar",data:function(){return{animateUp:!1,listData:JSON.parse(JSON.stringify(this.showMsg)),timer:null}},props:{showMsg:{type:Array}},mounted:function(){this.timer=setInterval(this.scrollAnimate,2500)},methods:{scrollAnimate:function(){var t=this;this.animateUp=!0,setTimeout((function(){t.listData.push(t.listData[0]),t.listData.shift(),t.animateUp=!1}),500)}},destroyed:function(){clearInterval(this.timer)}};n.default=i},5789:function(t,n,e){"use strict";var i=e("2554"),a=e.n(i);a.a},c2cc:function(t,n,e){"use strict";e.r(n);var i=e("2e77"),a=e.n(i);for(var r in i)["default"].indexOf(r)<0&&function(t){e.d(n,t,(function(){return i[t]}))}(r);n["default"]=a.a},d9c2:function(t,n,e){"use strict";e.r(n);var i=e("dce6"),a=e("c2cc");for(var r in a)["default"].indexOf(r)<0&&function(t){e.d(n,t,(function(){return a[t]}))}(r);e("5789");var s=e("828b"),c=Object(s["a"])(a["default"],i["b"],i["c"],!1,null,"303a5a66",null,!1,i["a"],void 0);n["default"]=c.exports},dce6:function(t,n,e){"use strict";e.d(n,"b",(function(){return i})),e.d(n,"c",(function(){return a})),e.d(n,"a",(function(){}));var i=function(){var t=this.$createElement,n=(this._self._c,this.$t("恭喜您")),e=this.$t("获得");this.$mp.data=Object.assign({},{$root:{m0:n,m1:e}})},a=[]}}]);
;(global["webpackJsonp"] = global["webpackJsonp"] || []).push([
    'pages/goods/lottery/components/noticeBar-create-component',
    {
        'pages/goods/lottery/components/noticeBar-create-component':(function(module, exports, __webpack_require__){
            __webpack_require__('df3c')['createComponent'](__webpack_require__("d9c2"))
        })
    },
    [['pages/goods/lottery/components/noticeBar-create-component']]
]);
