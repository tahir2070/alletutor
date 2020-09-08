/*************************************************************
 * White Board
**************************************************************/
$(document).ready(function () {
    resize_canvas();
    $(window).on("resize", function () {
        resize_canvas();
    });
});

function resize_canvas(){
    canvas.setDimensions({ width: $('.drawing-field').innerWidth()-20, height: $('.drawing-field').innerHeight()-20 });
}


var line, circle, rect, text, isDown, mode = 'select', color = "black", origX, origY;
var canvas = new fabric.Canvas('c');
canvas.setDimensions({width:300, height:300});
canvas.perPixelTargetFind = true;
canvas.targetFindTolerance = 4;

$(document).on('click', '.drawing-tool a', function () {
    let tool = $(this).data('tool');
    switch (tool) {
        case 'mouse':
            $('body').css('cursor', 'default');
            $('canvas').css('cursor', 'default');
            canvas.set({ hoverCursor: 'pointer, auto' });
            $('a, button').css('cursor', 'pointer');
            mode = "select";
            canvas.selection = true;
            break;
        case 'pencil':
            mode = "draw";
            canvas.selection = false;
            break;

        case 'shape':
            canvas.selection = false;
            break;

        case 'text':
            mode = "text";
            canvas.selection = false;
            break;
            
        case 'eraser':
            deleteObjects();
            break;
        default:
            break;
    }
});



$(document).on('change', '#options', function () {
    mode = this.value;
    if (mode == 'select') {
        canvas.selection = true;
        canvas.renderAll();
    }
    else if (mode == 'delete') {
        deleteObjects();
    } else {
        canvas.selection = false;
    }
});

// Adding objects to the canvas...


canvas.on('mouse:down', function (o) {
    console.log(mode);
    isDown = true;
    var pointer = canvas.getPointer(o.e);
    var points = [pointer.x, pointer.y, pointer.x, pointer.y];

    if (mode == "draw") {
        line = new fabric.Line(points, {
            strokeWidth: 5,
            fill: color,
            stroke: color,
            originX: 'center',
            originY: 'center',
            selectable: true,
            targetFindTolerance: true

        });
        canvas.add(line);
    }


    if (mode == 'rectangle') {
        origX = pointer.x;
        origY = pointer.y;

        rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 100,
            height: 100,
            selectable: true,
            fill: 'green'
        });
        canvas.add(rect);
    }


    if (mode == "circle") {
        origX = pointer.x;
        origY = pointer.y;

        circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            fill: 'red',
            selectable: true,
            hasBorders: false,
            lockMovementX: false,
            lockMovementY: false,
            radius: 50,
            hoverCursor: 'default'
        });
        canvas.add(circle);
    }

    if (mode == 'text') {
        text = new fabric.IText('Tap and Type', {
            fontFamily: 'arial black',
            fontSize: 14,
            fill: color,
            lineHeight: 1.1,
            left: pointer.x,
            top: pointer.y,
        });
        canvas.add(text);
        mode = "select";
    }
});

canvas.on('mouse:move', function (o) {
    if (!isDown) return;
    var pointer = canvas.getPointer(o.e);

    if (mode == "draw") {
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
    }

    if (mode == "rectangle") {
        if (origX > pointer.x) {
            rect.set({ left: Math.abs(pointer.x) });
        }
        if (origY > pointer.y) {
            rect.set({ top: Math.abs(pointer.y) });
        }

        rect.set({ width: Math.abs(origX - pointer.x) });
        rect.set({ height: Math.abs(origY - pointer.y) });
        canvas.renderAll();
    }


    if (mode == "circle") {
        circle.set({ radius: Math.abs(origX - pointer.x) });
        // circle.radius = radius;
        canvas.renderAll();
    }


});

canvas.on('mouse:up', function (o) {
    isDown = false;
    if (mode == "draw")
        line.setCoords();
    if (mode == "circle"){
        circle.setCoords();
        mode = "select";
    }
    if (mode == "rectangle"){
        rect.setCoords();
        mode = "select";
    }
});



// select all objects
function deleteObjects() {
    var activeObject = canvas.getActiveObject(),
        activeGroup = canvas.getActiveGroup();
    if (activeObject) {
        if (confirm('Are you sure?')) {
            canvas.remove(activeObject);
        }
    }
    else if (activeGroup) {
        if (confirm('Are you sure?')) {
            var objectsInGroup = activeGroup.getObjects();
            canvas.discardActiveGroup();
            objectsInGroup.forEach(function (object) {
                canvas.remove(object);
            });
        }
    }
}


$(document).on('change', 'input[name="color"]:checked', function () {
    color = this.value;
    $('.selected-color-value label').attr("for", this.value);
});

$(document).on('change', 'input[name="shape"]:checked', function () {
    console.log(this.value);
    mode = this.value;
    $('.selected-color-value label').attr("for", this.value);
});

$(document).on('click', 'a[data-tool="laser"]', function () {
    $('body, a, button, canvas').css('cursor', 'url("./assets/css/laser.ico"), auto');
    canvas.set({ hoverCursor: 'url("./assets/css/laser.ico"), auto' });
});


function erase(){
    canvas.clear();
}

