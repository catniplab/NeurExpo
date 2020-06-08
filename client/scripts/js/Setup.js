var initButton = document.getElementById('init');
var separate = false;
var transmitting = false;
var paused = false;
var address;
var trajPort;
var dimension;
var maxTrajPoints;
var spikePort;
var timeScale;
var decay;
var AA;
var spikeGammas = [];
var numSliders;
var parameters;
var sliderArray;
var projection;
var projectionUpdate = false;
//read the user inputs and initialize the websockets
initButton.onclick = function () {
    var sepInput = document.getElementById('separate');
    separate = sepInput.checked;
    var ipInput = document.getElementById('ipaddress');
    address = ipInput.value;
    var tpInput = document.getElementById('trajPort');
    trajPort = tpInput.value;
    var mtpInput = document.getElementById('maxPoints');
    maxTrajPoints = parseInt(mtpInput.value);
    var spInput = document.getElementById('spikePort');
    spikePort = spInput.value;
    var tsInput = document.getElementById('timeScale');
    timeScale = parseFloat(tsInput.value);
    decay = Math.pow(2, -1000 / (60 * timeScale));
    var aaInput = document.getElementById('antialias');
    AA = aaInput.checked;
    //erase the page
    var mainDiv = document.getElementById('main');
    mainDiv.innerHTML = '';
    //initialize trajectory websocket
    trajSocket = new WebSocket('ws://' + address + ':' + trajPort);
    trajSocket.binaryType = 'arraybuffer';
    trajSocket.onmessage = function (msg) { trajMessageHandler(msg); };
    if (separate) {
        //open a new window for rendering the spike trains and send it the proper variables
        var getparams = 'address=' + address + '&'
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
