(function ($) {
    "use strict";

    // Script for OffCanvas Menu Activation
    $(document).ready(function () {
        $('.toggle-bar').on('click', function () {
            $('.off-canvas-menu-wrap, .off-canvas-overlay').addClass('active');
        })

        $('.cls-off-canvas-menu').on('click', function () {
            $('.off-canvas-menu-wrap, .off-canvas-overlay').removeClass('active');
        })
    })

    $(document).ready(function(){
        $('.table-action-btns button').on('click', function(){
            $(this).toggleClass('active');
        })

        $('.user-pf > li > a').on('click', function(){
            $('.user-pf li ul.submenu').slideToggle(500);
        })

        $('.rec-btn').on('click', function(){
            $(this).toggleClass('active');
        })

        $('.weaving-had a').on('click', function(e){
            e.preventDefault();
            $(this).toggleClass('active');
        })

        $('.drawing-tool li a').on('click', function(e){
            e.preventDefault();
            $('.drawing-tool li a').removeClass('active');
            $(this).toggleClass('active');
        })
    })

    $('.sl-select').niceSelect();


  
})(jQuery);	 // End line

/*************************************************************
 * Make Video Dragable & Resizeable
**************************************************************/
$('.individual-class').draggable();
$('#videoContainer').draggable();
$('.individual-class').resizable();

/*************************************************************
 * Show loading message
**************************************************************/
function loading(status, message){
    if(status){
        $('.web-response .message').html(message);
        $('.web-response').removeClass('d-none');
    }else{
        $('.web-response').addClass('d-none');
    }
}










/*
var canvas, ctx, flag = false,
    prevX = 0,
    currX = 0,
    prevY = 0,
    currY = 0,
    dot_flag = false;

var x = "black",
    y = 2;





init();
function init() {
    canvas = document.getElementById('can');
    canvas.width = $('.drawing-field').innerWidth()-30;
    canvas.height = 400;
    ctx = canvas.getContext("2d");
    w = canvas.width;
    h = canvas.height;

    canvas.addEventListener("mousemove", function (e) {
        findxy('move', e)
    }, false);
    canvas.addEventListener("mousedown", function (e) {
        findxy('down', e)
    }, false);
    canvas.addEventListener("mouseup", function (e) {
        findxy('up', e)
    }, false);
    canvas.addEventListener("mouseout", function (e) {
        findxy('out', e)
    }, false);
}


function draw() {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = x;
    ctx.lineWidth = y;
    ctx.stroke();
    ctx.closePath();
}
function erase() {
    ctx.clearRect(0, 0, w, h);
    document.getElementById("canvasimg").style.display = "none";
}

function save() {
    document.getElementById("canvasimg").style.border = "2px solid";
    var dataURL = canvas.toDataURL();
    document.getElementById("canvasimg").src = dataURL;
    document.getElementById("canvasimg").style.display = "inline";
}

function findxy(res, e) {
    if (res == 'down') {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - canvas.offsetLeft;
        currY = e.clientY - canvas.offsetTop;

        flag = true;
        dot_flag = true;
        if (dot_flag) {
            ctx.beginPath();
            ctx.fillStyle = x;
            ctx.fillRect(currX, currY, 2, 2);
            ctx.closePath();
            dot_flag = false;
        }
    }
    if (res == 'up' || res == "out") {
        flag = false;
    }
    if (res == 'move') {
        if (flag) {
            prevX = currX;
            prevY = currY;
            currX = e.clientX - canvas.offsetLeft;
            currY = e.clientY - canvas.offsetTop;
            draw();
        }
    }
}
*/




/* Full Screen */
$(document).on("dblclick", "video" ,function () {
    if (this.requestFullscreen) {
        this.requestFullscreen();
    }
    else if (this.mozRequestFullScreen) {
        this.mozRequestFullScreen();
    }
    else if (this.webkitRequestFullscreen) {
        this.webkitRequestFullscreen();
    }
    else if (this.msRequestFullscreen) {
        this.msRequestFullscreen();
    }else{
        this.ExitFullscreen();
        this.webkitExitFullscreen();
        this.mozRequestExitFullscreen();
        this.msRequestExitFullscreen();
    }
});




// Smile Picker/Select
$(document).on('click', '.transparent-chat-field .emoji',function(){
    $('.emoji-picker').toggle();
});
$(document).on('click', '.transparent-chat-field input', function () {
    $('.emoji-picker').hide();
}); 
$(document).on('click', '.transparent-chat-field .emoji-picker span', function () {
    let val = $('.transparent-chat-field input').val();
    $('.transparent-chat-field input').val(val+$(this).text());
}); 