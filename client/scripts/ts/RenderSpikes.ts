/*
Render the spike train data coming from the server.

For each spike train channel, a disk is constructed and added to the scene.
The disk's position, as well as the position of the camera and the in-shader
coordinate transformation, are based on the height of the canvas.
The disk is shaded so that each layer corresponds to a different time-scale,
with the brightness of each layer decaying exponentially.
*/

//get some rendering parameters from RenderParams.js
let spikeParams = paramObj.spike_params

//spike rendering utilities
var spikeCanvas : HTMLCanvasElement;
var spikeScene : THREE.Scene;
var spikeRenderer : THREE.WebGLRenderer;
var spikeCamera : THREE.OrthographicCamera;
var spikeShaders : THREE.ShaderMaterial[] = [];
var disks : THREE.Mesh[] = [];

//get shaders from document
let spikeVS = document.getElementById('spike_vs').innerHTML;
let spikeFS = document.getElementById('spike_fs').innerHTML;

function initSpikeRendering(aa : boolean) : void {

  //get canvas
  spikeCanvas = <HTMLCanvasElement> document.getElementById('spike_canvas');
  let height = spikeCanvas.clientHeight;
  let width = spikeCanvas.clientWidth;

  //initialize rendering utilities
  spikeScene = new THREE.Scene();
  spikeRenderer = new THREE.WebGLRenderer({canvas: spikeCanvas, antialias: aa});
  spikeRenderer.setSize(width, height, false);
  let cw = 36;
  let ch = 0.025*height;
  spikeCamera = new THREE.OrthographicCamera(-0.5*cw, 0.5*cw, -0.5*ch, 0.5*ch, 1, 10);
  let y0 = Math.floor(numSpikes/12)/2;
  y0 *= 3;
  y0 -= 0.4*ch;
  spikeCamera.position.set(0, y0, -5);
  spikeCamera.lookAt(new THREE.Vector3(0, y0, 0));

  //construct each disk and add it to the scene
  for(let i = 0; i < numSpikes; i++) {

    //compute center position
    let x = i%12; x *= 3; x -= 0.46*cw;
    let y = Math.floor(i/12); y *= 3; y -= 0.4*ch;

    //construct shader
    spikeShaders[i] = new THREE.ShaderMaterial({
      vertexShader: spikeVS,
      fragmentShader: spikeFS,
      uniforms: {
        resolution: {type: 'v2', value: new THREE.Vector2(width, height)},
        coefficient: {type: 'v4', value: spikeGammas[i]}
      }
    });

    //construct geometry, add attribute for center position
    let geometry = new THREE.CircleBufferGeometry(1.2, 64);
    let dcenters = new Float32Array(264);
    for(let j = 0; j < 66; j++) {
      dcenters[4*j]     = x;
      dcenters[4*j + 1] = y;
      dcenters[4*j + 2] = 0;
      dcenters[4*j + 3] = 1;
    }
    geometry.addAttribute('dcenter', new THREE.BufferAttribute(dcenters, 4));

    //construct the disk and set its position
    disks[i] = new THREE.Mesh(geometry, spikeShaders[i]);
    disks[i].position.x = x
    disks[i].position.y = y
    disks[i].position.z = 0;
    //disks[i].lookAt(negPos);

    //add disk to scene
    spikeScene.add(disks[i]);
  }
}

//run the exponential filter for each spike train and send the coefficients to the gpu
function updateSpikeShader() : void {
  for(let i = 0; i < numSpikes; i++) {

    let spike = spikeGammas[i];

    spike.x *= decay;
    spike.y *= decay;
    spike.y += spike.x
    spike.z *= decay;
    spike.z += spike.y
    spike.w *= decay;
    spike.w += spike.z

    spikeShaders[i].uniforms.coefficient.value = spike;
    spikeGammas[i] = spike;
  }
}

function animateSpikes() : void {
  requestAnimationFrame(animateSpikes);
  if(!spikesPaused) {
    spikeRenderer.render(spikeScene, spikeCamera);
  }
  //spike shader must be updated even if paused or else the gamma filter will get messed up
  if(transmitting)
    updateSpikeShader();
}