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

var address : string; //IP of server
var trajPort : string; //port sending latent trajectory
var spikePort : string; //port sending the spike trains

var dimension : number; //dimension of latent trajectory
var maxTrajPoints : number; //maximum number of points rendered in the trajectory at once

var timeScale : number; //how long do we want to see the effects of a paricular spike?
var decay : number; //computed from timescale

var AA; //anti-aliasing

//the state of each render disk for each spike train channel
var spikeGammas : THREE.Vector4[] = [];

var numSliders : number; //computed from dimension of trajectory
var parameters : Float32Array; //computed from slider values
var sliderArray : HTMLInputElement[]; //array of elements pointing to the sliders
var projection : Float32Array[]; //orthographic projection matrix used to visualize trajectory

//does the projection matrix need to be updated?
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