var rcvdNumSpikes = false;
var spikesPaused = false;
var spikeSocket;
var numSpikes;
function spikeMessageHandler(msg) {
    console.log(msg);
    if (rcvdNumSpikes) {
        var view = new DataView(msg.data);
        var size = view.byteLength;
        for (var i = 0; i < size; i += 4) {
            //the ID of the spike channel is encoded in the first 16 bits of the 32-bit block
            var channelID = view.getUint16(i);
            //the number of spikes since the last packet was received is encoded in the 2nd 16 bits
            spikeGammas[channelID].x += view.getUint16(i + 2);
        }
    }
    else {
        //figure out how many spike channels we are dealing with
        var view = new DataView(msg.data);
        numSpikes = view.getInt32(0);
        rcvdNumSpikes = true;
        setUpSpikeDiv(numSpikes, document.getElementById('spike_div'));
    }
}
function setUpSpikeDiv(ns, sdiv) {
    //create and append a paragraph which will tell the user what the time scale is
    var scaleLabel = document.createElement('P');
    scaleLabel.id = 'scale_label';
    scaleLabel.innerHTML = '<big>Time Scale: ' + timeScale + ' ms</big>';
    sdiv.appendChild(scaleLabel);
    sdiv.appendChild(document.createElement('BR'));
    //create and append a slider which adjusts the time scale of the spike train visualization
    var scaleSlider = document.createElement('INPUT');
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
    scaleSlider.oninput = function () {
        decay = Math.pow(2, -1000 / (60 * parseFloat(scaleSlider.value)));
        document.getElementById('scale_label').innerHTML =
            '<big>Time Scale: ' + scaleSlider.value + ' ms</big>';
    };
    sdiv.appendChild(document.createElement('BR'));
    //if the spikes are being rendered in a separate window, add a pause button
    if (separate) {
        var spikePause = document.createElement('BUTTON');
        spikePause.id = 'spikePauseBtn';
        spikePause.innerHTML = 'Pause';
        var spDiv = document.createElement('DIV');
        sdiv.appendChild(spDiv);
        spDiv.appendChild(spikePause);
        sdiv.appendChild(document.createElement('BR'));
    }
    var spikeLabel = document.createElement('P');
    spikeLabel.id = 'spike_label';
    spikeLabel.innerHTML = '<big>Spike Trains</big>';
    sdiv.appendChild(spikeLabel);
    sdiv.appendChild(document.createElement('BR'));
    //create and append spike rendering canvas
    var scanvas = document.createElement('CANVAS');
    scanvas.id = 'spike_canvas';
    var height = 120 * Math.ceil(numSpikes / 12);
    scanvas.style.height = height + 'px';
    var width = 1440;
    scanvas.style.width = width + 'px';
    scanvas.style.backgroundColor = 'black';
    scanvas.style['border-radius'] = '12px';
    sdiv.appendChild(scanvas);
    sdiv.appendChild(document.createElement('BR'));
    //assign pausing function to the "Pause" button
    $('#spDiv').on('click', 'button', function () {
        spikesPaused = !spikesPaused;
        document.getElementById('spikePauseBtn').innerHTML = paused ? 'Unpause' : 'Pause';
    });
    //initilize the helper variable for the exponential filter computation
    for (var i = 0; i < ns; i++)
        spikeGammas.push(new THREE.Vector4(0, 0, 0, 0));
    if (separate) {
        initSpikeRendering(AA);
        animateSpikes();
    }
}
