"use strict";
$(document).ready(function() {
  $("#fullpage").fullpage({
    resize:true,
    // 从底部循环滚动
    loopBottom: true,
    // 配置锚点
    anchors:['page1','page2','page3','page4'],
    // 导航
    navigation: true,
    navigationPosition: 'right',
    navigationTooltips: ['2019/01/05', '2018/01/04','2018/12/31', '2018/12/29'],
    showActiveTooltip: false,
    // 左右滑块的项目导航
    slidesNavigation: false,
    slidesNavPosition: "bottom"
  });
});
var app = new Vue({ el: "#fullpage", data: {} });