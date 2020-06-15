/*

This file defines the basic helper variables and attaches an initialization function to the initialization button.

*/
//this object will store some basic rendering parameters retrieved from the server
var paramObj;
//button which initalizes connection to the server
let initButton = document.getElementById('init');
//render spikes and latent process in separate windows
let separate = false;
let transmitting = false;
let paused = false;
var address; //IP of server
var trajPort; //port sending latent trajectory
var spikePort; //port sending the spike trains
var dimension; //dimension of latent trajectory
var maxTrajPoints; //maximum number of points rendered in the trajectory at once
var timeScale; //how long do we want to see the effects of a paricular spike?
var decay; //computed from timescale
var AA; //anti-aliasing
//the state of each render disk for each spike train channel
var spikeGammas = [];
var numSliders; //computed from dimension of trajectory
var parameters; //computed from slider values
var sliderArray; //array of elements pointing to the sliders
var projection; //orthographic projection matrix used to visualize trajectory
//does the projection matrix need to be updated?
let projectionUpdate = false;
//read the user inputs and initialize the websockets
initButton.onclick = function () {
    let sepInput = document.getElementById('separate');
    separate = sepInput.checked;
    let ipInput = document.getElementById('ipaddress');
    address = ipInput.value;
    let tpInput = document.getElementById('trajPort');
    trajPort = tpInput.value;
    let mtpInput = document.getElementById('maxPoints');
    maxTrajPoints = parseInt(mtpInput.value);
    let spInput = document.getElementById('spikePort');
    spikePort = spInput.value;
    let tsInput = document.getElementById('timeScale');
    timeScale = parseFloat(tsInput.value);
    decay = Math.pow(2, -1000 / (60 * timeScale));
    let aaInput = document.getElementById('antialias');
    AA = aaInput.checked;
    //erase the page
    let mainDiv = document.getElementById('main');
    mainDiv.innerHTML = '';
    //initialize trajectory websocket
    trajSocket = new WebSocket('ws://' + address + ':' + trajPort);
    trajSocket.binaryType = 'arraybuffer';
    trajSocket.onmessage = function (msg) { trajMessageHandler(msg); };
    if (separate) {
        //open a new window for rendering the spike trains and send it the proper variables
        let getparams = 'address=' + address + '&'
            + 'spikePort=' + spikePort + '&'
            + 'transmitting=' + transmitting + '&'
            + 'timeScale=' + timeScale + '&'
            + 'decay=' + decay + '&'
            + 'AA=' + AA;
        window.open('auxillary.html?' + getparams);
    }
    else {
        //initialize spike train websocket
        spikeSocket = new WebSocket('ws://' + address + ':' + spikePort);
        spikeSocket.binaryType = 'arraybuffer';
        spikeSocket.onmessage = function (msg) { spikeMessageHandler(msg); };
    }
};
