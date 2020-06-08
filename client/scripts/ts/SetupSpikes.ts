let rcvdNumSpikes = false;
let spikesPaused = false;

var spikeSocket : WebSocket;
var numSpikes : number;

function spikeMessageHandler(msg) {

  console.log(msg);

  if(rcvdNumSpikes) {
    let view = new DataView(msg.data);
    let size = view.byteLength;

    for(let i = 0; i < size; i += 4) {
      //the ID of the spike channel is encoded in the first 16 bits of the 32-bit block
      let channelID = view.getUint16(i);
      //the number of spikes since the last packet was received is encoded in the 2nd 16 bits
      spikeGammas[channelID].x += view.getUint16(i + 2);
    }
  }

  else {
    //figure out how many spike channels we are dealing with
    let view = new DataView(msg.data);
    numSpikes = view.getInt32(0);
    rcvdNumSpikes = true;

    setUpSpikeDiv(numSpikes, <HTMLDivElement> document.getElementById('spike_div'));
  }
}

function setUpSpikeDiv(ns : number, sdiv : HTMLDivElement) : void {

  //create and append a paragraph which will tell the user what the time scale is
  let scaleLabel = document.createElement('P');
  scaleLabel.id = 'scale_label';
  scaleLabel.innerHTML = '<big>Time Scale: ' + timeScale + ' ms</big>';
  sdiv.appendChild(scaleLabel);
  sdiv.appendChild(document.createElement('BR'));

  //create and append a slider which adjusts the time scale of the spike train visualization
  let scaleSlider = <HTMLInputElement> document.createElement('INPUT');
  scaleSlider.id = 'scale_slider';
  scaleSlider.type = 'range';
  scaleSlider.min = '1';
  scaleSlider.max = '100';
  scaleSlider.value = '' + timeScale;
  scaleSlider.style.borderTopLeftRadius = '12px';
  scaleSlider.style.borderBottomLeftRadius = '12px';
  scaleSlider.style.borderTopRightRadius = '12px';
  scaleSlider.style.borderBottomRightRadius = '12px';
  sdiv.appendChild(scaleSlider);
  sdiv.appendChild(document.createElement('BR'));
  scaleSlider.oninput = function() {
    decay = Math.pow(2, -1000/(60*parseFloat(scaleSlider.value)));
    document.getElementById('scale_label').innerHTML =
      '<big>Time Scale: ' + scaleSlider.value + ' ms</big>'
  }
  sdiv.appendChild(document.createElement('BR'));

  //if the spikes are being rendered in a separate window, add a pause button
  if(separate) {
    let spikePause = document.createElement('BUTTON');
    spikePause.id = 'spikePauseBtn';
    spikePause.innerHTML = 'Pause';
    let spDiv = document.createElement('DIV');
    sdiv.appendChild(spDiv);
    spDiv.appendChild(spikePause);
    sdiv.appendChild(document.createElement('BR'));
  }

  let spikeLabel = document.createElement('P');
  spikeLabel.id = 'spike_label';
  spikeLabel.innerHTML = '<big>Spike Trains</big>';
  sdiv.appendChild(spikeLabel);
  sdiv.appendChild(document.createElement('BR'));

  //create and append spike rendering canvas
  let scanvas = document.createElement('CANVAS');
  scanvas.id = 'spike_canvas';
  let height = 120*Math.ceil(numSpikes/12);
  scanvas.style.height = height + 'px';
  let width = 1440;
  scanvas.style.width = width + 'px';
  scanvas.style.backgroundColor = 'black';
  scanvas.style['border-radius'] = '12px';
  sdiv.appendChild(scanvas);
  sdiv.appendChild(document.createElement('BR'));

  //assign pausing function to the "Pause" button
  $('#spDiv').on('click', 'button', function() {
      spikesPaused = !spikesPaused;
      document.getElementById('spikePauseBtn').innerHTML = paused ? 'Unpause' : 'Pause';
  });

  //initilize the helper variable for the exponential filter computation
  for(let i = 0; i < ns; i++)
    spikeGammas.push(new THREE.Vector4(0, 0, 0, 0));

  if(separate) {
    initSpikeRendering(AA);
    animateSpikes();
  }
}