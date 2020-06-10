/*

This file is for defining how the client reacts to a message from the trajectory port and setting up the html accordingly.

*/
//did we receive the dimension of the trajectory yet?
var rcvdDimension = false;
//how many points are currently rendered in the trajectory?
var trajDrawCount = 0;
//maximum number of floating point coordinates used for defining the trajectory
var maxTrajCoords;
//array for storing the incoming positions
var queuedPos = new Array();
var trajSocket;
//this shouldn't need to be a thing . . .
function clone(array) {
    var l = array.length;
    var result = new Float32Array(l);
    for (var i = 0; i < l; i++)
        result[i] = array[i];
    return result;
}
//how to we react to a message from the trajectory port
function trajMessageHandler(msg) {
    //if we already know the dimension, the message contains a set of points
    //which need to be pushed to the array of queued positions
    if (rcvdDimension) {
        if (trajDrawCount < maxTrajPoints)
            trajDrawCount++;
        //help read and store the data
        var view = new DataView(msg.data);
        var numNew = view.getUint32(0); //first 32 bits define the number of new points in the message
        var helper = new Float32Array(dimension);
        //put the coordinates into helper and put helper into queued positions
        for (var i = 0; i < numNew; i++) {
            var k = 4 * dimension * i;
            for (var j = 0; j < dimension; j++) {
                helper[j] = view.getFloat32(4 * j + k + 4);
            }
            queuedPos.push(clone(helper)); //bad stuff happens if you don't clone here
        }
    }
    //if we don't know the dimension we expect to get it in the first message
    //set up the html properly after decoding it
    else {
        var view = new DataView(msg.data);
        dimension = view.getInt32(0);
        maxTrajCoords = dimension * maxTrajPoints;
        rcvdDimension = true;
        setUpTrajDiv(dimension);
    }
}
;
//smooth the edges of the sliders which are on the end of a row
function getBorderRadii(elem, fstInRow, lastInRow) {
    if (fstInRow && lastInRow)
        elem.style.borderRadius = '12px';
    else if (fstInRow) {
        elem.style.borderTopLeftRadius = '12px';
        elem.style.borderBottomLeftRadius = '12px';
    }
    else if (lastInRow) {
        elem.style.borderTopRightRadius = '12px';
        elem.style.borderBottomRightRadius = '12px';
    }
}
//insert the appropriate number of sliders and listen for input, return the number of sliders
function insertSliders(dim, divElem) {
    var numSliders = 3 * dim - 9;
    parameters = new Float32Array(numSliders);
    //add the sliders to the document
    for (var i = 1; i <= numSliders; i++) {
        var newSlider = document.createElement('INPUT');
        newSlider.type = 'range';
        newSlider.min = '-99';
        newSlider.max = '99';
        newSlider.value = '' + 15 * (i % 2 == 0 ? 1 : -1) * (i + 1);
        newSlider.id = 'param' + i;
        divElem.appendChild(newSlider);
        if (i % 4 == 0)
            divElem.innerHTML += '<br><br>';
    }
    sliderArray = new Array();
    var inputDo = '';
    var m4 = numSliders % 4;
    var d4 = numSliders >> 2;
    var _loop_1 = function (i) {
        var mod4 = i % 4;
        var fstInRow = mod4 == 1;
        var lastInRow = mod4 == 0 || (i > 4 * d4 && mod4 == m4);
        sliderArray.push(document.getElementById('param' + i));
        getBorderRadii(sliderArray[i - 1], fstInRow, lastInRow);
        sliderArray[i - 1].oninput = function () {
            var val = 0.001 * sliderArray[i - 1].value;
            parameters[i - 1] = Math.sign(val) * (Math.pow(12, Math.abs(val)) - 1);
            projection = getProjectionMatrix(dim, parameters);
            projectionUpdate = true;
        };
    };
    for (var i = 1; i <= numSliders; i++) {
        _loop_1(i);
    }
    eval(inputDo);
    return numSliders;
}
//this function is called when the user presses the "Begin Transmission" button.
//it basically tells the server to start sending data (both spikes and trajectory)
//it also updates html and initializes rendering
function beginTransmission() {
    var serverStart = document.getElementById('serverStart');
    if (separate) {
        if (transmitting) {
            trajSocket.close();
            serverStart.innerHTML = 'Transmission Ended';
            transmitting = false;
        }
        else {
            serverStart.innerHTML = 'End Transmission';
            transmitting = true;
            //tell the server that we are ready to receive data
            trajSocket.send('start');
            spikeSocket.send('start');
            //rendering is different based on dimension of trajectory (see RenderTrajectory.ts)
            //the render loop for spikes will have already been initialized
            if (dimension == 2) {
                init2D(AA);
                animateTraj2D();
            }
            else if (dimension == 3) {
                init3D(AA);
                animateTraj3D();
            }
            else {
                init3D(AA);
                animateTraj();
            }
        }
    }
    else {
        if (transmitting) {
            trajSocket.close();
            spikeSocket.close();
            serverStart.innerHTML = 'Transmission Ended';
            transmitting = false;
        }
        else {
            serverStart.innerHTML = 'End Transmission';
            transmitting = true;
            //tell the server that we are ready to receive data
            trajSocket.send('start');
            //rendering is different based on dimension of trajectory (see RenderTrajectory.ts)
            if (dimension == 2) {
                initSpikeRendering(AA);
                init2D(AA);
                animate2D();
            }
            else if (dimension == 3) {
                initSpikeRendering(AA);
                init3D(AA);
                animate3D();
            }
            else {
                initSpikeRendering(AA);
                init3D(AA);
                animate();
            }
        }
    }
}
//set up the html for rendering and interacting with the latent trajectory.
//called when the trajectory websocket receives the dimension of the trajectory from the server
function setUpTrajDiv(dim) {
    var trajDiv = document.getElementById('traj_div');
    //create and append start button
    var startDiv = document.createElement('DIV');
    startDiv.id = 'startDiv';
    trajDiv.appendChild(startDiv);
    var serverStart = document.createElement('BUTTON');
    serverStart.type = 'button';
    serverStart.id = 'serverStart';
    serverStart.innerHTML = 'Begin Transmission';
    startDiv.appendChild(serverStart);
    trajDiv.appendChild(document.createElement('BR'));
    //create and append trajectory rendering canvas
    var tcanvas = document.createElement('CANVAS');
    tcanvas.id = 'traj_canvas';
    tcanvas.style.height = '477px';
    tcanvas.style.width = '848px';
    tcanvas.style.backgroundColor = 'black';
    tcanvas.style['border-radius'] = '12px';
    trajDiv.appendChild(tcanvas);
    trajDiv.appendChild(document.createElement('BR'));
    //create and append pause button
    var pauseDiv = document.createElement('DIV');
    pauseDiv.id = 'pauseDiv';
    pauseDiv.align = 'center';
    trajDiv.appendChild(pauseDiv);
    var pauseBtn = document.createElement('BUTTON');
    pauseBtn.id = 'pauseBtn';
    pauseBtn.type = 'button';
    pauseBtn.innerHTML = 'Pause';
    pauseDiv.appendChild(pauseBtn);
    trajDiv.appendChild(document.createElement('BR'));
    trajDiv.appendChild(document.createElement('BR'));
    if (dimension > 3)
        numSliders = insertSliders(dimension, trajDiv);
    trajDiv.appendChild(document.createElement('BR'));
    trajDiv.appendChild(document.createElement('BR'));
    //initialize projection matrix parameters
    if (dimension > 3) {
        for (var i = 0; i < numSliders; i++)
            parameters[i] = 0.001 * sliderArray[i].value;
    }
    $('#startDiv').on('click', 'button', beginTransmission);
    //assign pausing function to the "Pause" button
    $('#pauseDiv').on('click', 'button', function () {
        paused = !paused;
        document.getElementById('pauseBtn').innerHTML = paused ? 'Unpause' : 'Pause';
    });
}
