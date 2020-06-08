let initButton = document.getElementById('init');

let separate = false;

let transmitting = false;
let paused = false;

var address : string;

var trajPort : string;
var dimension : number;
var maxTrajPoints : number;

var spikePort : string;
var timeScale : number;
var decay : number;

var AA;

var spikeGammas : THREE.Vector4[] = [];

var numSliders : number;
var parameters : Float32Array;
var sliderArray : HTMLInputElement[];
var projection : Float32Array[];

let projectionUpdate = false;

//read the user inputs and initialize the websockets
initButton.onclick = function() {

  let sepInput = <HTMLInputElement> document.getElementById('separate');
  separate = sepInput.checked;

  let ipInput = <HTMLInputElement> document.getElementById('ipaddress');
  address = ipInput.value;

  let tpInput = <HTMLInputElement> document.getElementById('trajPort');
  trajPort = tpInput.value;
  let mtpInput = <HTMLInputElement> document.getElementById('maxPoints');
  maxTrajPoints = parseInt(mtpInput.value);

  let spInput = <HTMLInputElement> document.getElementById('spikePort');
  spikePort = spInput.value;
  let tsInput = <HTMLInputElement> document.getElementById('timeScale');
  timeScale = parseFloat(tsInput.value);
  decay = Math.pow(2, -1000/(60*timeScale));

  let aaInput = <HTMLInputElement> document.getElementById('antialias');
  AA = aaInput.checked;

  //erase the page
  let mainDiv = document.getElementById('main');
  mainDiv.innerHTML = '';

  //initialize trajectory websocket
  trajSocket = new WebSocket('ws://' + address + ':' + trajPort);
  trajSocket.binaryType = 'arraybuffer';
  trajSocket.onmessage = function(msg){trajMessageHandler(msg);};

  if(separate) {
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
    spikeSocket.onmessage = function(msg){spikeMessageHandler(msg);};
  }
}