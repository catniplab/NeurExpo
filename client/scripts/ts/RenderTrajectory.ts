/*
Render trajectory coming from the server.

Rendering the 2D and 3D trajectories is straightforward,
and the most intensive part is shifting points on the geometry and adding new points.

Rendering the high dimensional trajectories often requires re-calculating the
projection matrix (see Setup.ts) and re-projecting all the high dimensional points
in the current trajectory (which is fairly strenuous for the CPU is the dimension
is high and the trajectory is long).
*/

//get some rendering parameters from RenderParams.js
let trajParams = paramObj.traj_params

//trajectory rendering utilities
var trajScene : THREE.Scene;
var trajRenderer : THREE.Renderer;
var trajCanvas : HTMLCanvasElement;
var trajCamera : THREE.Camera;
var cameraControl : THREE.OrbitControls;

//trajectory object to be rendered
var trajMaterial : THREE.ShaderMaterial;
var trajGeometry : THREE.BufferGeometry;
var trajectory : THREE.Line;

//2D RENDERING/////////////////////////////////////////////////////////////////

//intialize rendering for 2 dimensions
function init2D(aa : boolean) : void {

  trajCanvas = <HTMLCanvasElement> document.getElementById('traj_canvas');

  //set up camera for rendering trajectory
  trajCamera = new THREE.PerspectiveCamera(trajParams.camera.fov,
                                           trajCanvas.clientWidth/trajCanvas.clientHeight,
                                           trajParams.camera.near,
                                           trajParams.camera.far);
  cameraControl = new THREE.OrbitControls(trajCamera, trajCanvas);
  cameraControl.rotateSpeed = 0.0;
  trajCamera.position.set(trajParams.camera.x, trajParams.camera.y, trajParams.camera.z);
  trajCamera.lookAt(new THREE.Vector3(0, 0, 0));

  //set up trajectory geometry
  trajGeometry = new THREE.BufferGeometry();
  trajGeometry.setAttribute('position',
                            new THREE.BufferAttribute(new Float32Array(3*maxTrajPoints), 3)
                           );
  let ds = 1.0/maxTrajPoints;
  let vertPos = new Float32Array(maxTrajPoints);
  vertPos[0] = 0.0;
  for(let i = 1; i < maxTrajPoints; i++)
    vertPos[i] = vertPos[i - 1] + ds;
  trajGeometry.setAttribute('vertPos', new THREE.BufferAttribute(vertPos, 1));
  trajGeometry.setDrawRange(0, trajDrawCount);

  //set up trajectory material
  trajMaterial = new THREE.ShaderMaterial({
		vertexShader : document.getElementById('traj_vs').textContent,
    fragmentShader : document.getElementById('traj_fs').textContent,
    uniforms : {
      color : {
        type: 'v3',
        value: new THREE.Vector3(trajParams.curve.r, trajParams.curve.g, trajParams.curve.b)
      }
    },
		depthWrite : false,
		depthTest : false,
    linewidth : trajParams.curve.width,
    transparent : true
  });

  //set up trajectory scene
  trajScene = new THREE.Scene();
  trajectory = new THREE.Line(trajGeometry, trajMaterial);
  trajScene.add(trajectory);

  //set up trajectory renderer
  trajRenderer = new THREE.WebGLRenderer({canvas: trajCanvas, antialias: aa, alpha: true});
  trajRenderer.setSize(trajCanvas.clientWidth, trajCanvas.clientHeight);
}

//update the trajectory with the new 2D points from the server
function updateTrajectory2D() : void {

  //copy the queued positions and then reset them
  const newPositions = queuedPos.slice();

  //get the current drawcount and compare against the number of new points
  let drc = trajDrawCount;
  let len = newPositions.length;
  let dif = drc - len;

  if(dif < 0) {

    queuedPos.splice(0, -dif);

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    for(let i = 0; i < drc; i++) {
      for(let j = 0; j < 2; j++) {
        posArray[3*i + j] = newPositions[i - dif][j];
      }
      posArray[3*i + 3] = 0;
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }

  else {

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    //shift the pre-existing points and add the new ones
    let index = 0;
    for(let i = 0; i < dif; i++) {
      for(let j = 0; j < 2; j++) {
        posArray[index] = posArray[index + 3*dif];
        index++;
      }
      index++;
    }
    for(let i = dif; i < drc; i++) {
      for(let j = 0; j < 2; j++) {
        posArray[index] = newPositions[i][j];
        index++;
      }
      index++;
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }
}

function animateTraj2D() : void {
  requestAnimationFrame(animateTraj2D);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory2D();
      trajRenderer.render(trajScene, trajCamera);
    }
  }
}

//3D RENDERING/////////////////////////////////////////////////////////////////

//intialize rendering for >2 dimensions
function init3D(aa : boolean) : void {

  //initialize projection matrix if the data is high-dimensional
  if(dimension > 3)
    projection = getProjectionMatrix(dimension, parameters);

  //set up canvas and renderer
  trajCanvas = <HTMLCanvasElement> document.getElementById('traj_canvas');
  trajRenderer = new THREE.WebGLRenderer({canvas : trajCanvas, antialias : aa, alpha : true});
  trajRenderer.setSize(trajCanvas.clientWidth, trajCanvas.clientHeight);

  //set up camera for rendering trajectory
  trajCamera = new THREE.PerspectiveCamera(trajParams.camera.fov,
                                           trajCanvas.clientWidth/trajCanvas.clientHeight,
                                           trajParams.camera.near,
                                           trajParams.camera.far);
  cameraControl = new THREE.OrbitControls(trajCamera, trajCanvas);
  cameraControl.rotateSpeed = 0.5;
  trajCamera.position.set(trajParams.camera.x, trajParams.camera.y, trajParams.camera.z);
  trajCamera.lookAt(new THREE.Vector3(0, 0, 0));
  cameraControl.update();

  //set up trajectory geometry
  trajGeometry = new THREE.BufferGeometry();
  trajGeometry.setAttribute('position',
                            new THREE.BufferAttribute(new Float32Array(3*maxTrajPoints), 3)
                           );
  let ds = 1.0/maxTrajPoints;
  let vertPos = new Float32Array(maxTrajPoints);
  vertPos[0] = 0.0;
  for(let i = 1; i < maxTrajPoints; i++)
    vertPos[i] = vertPos[i - 1] + ds;
  trajGeometry.setAttribute('vertPos', new THREE.BufferAttribute(vertPos, 1));
  trajGeometry.setDrawRange(0, trajDrawCount);

  //set up trajectory material
  trajMaterial = new THREE.ShaderMaterial({
		vertexShader : document.getElementById('traj_vs').textContent,
    fragmentShader : document.getElementById('traj_fs').textContent,
		depthWrite : false,
		depthTest : false,
    linewidth : trajParams.curve.width,
    transparent : true
  });

  //set up trajectory scene
  trajScene = new THREE.Scene();
  trajectory = new THREE.Line(trajGeometry, trajMaterial);
  trajScene.add(trajectory);
}

//update the trajectory with the new 3D points from the server
function updateTrajectory3D() : void {

  //copy the queued positions and then reset them
  const newPositions = queuedPos.slice();

  //get the current drawcount and compare against the number of new points
  let drc = trajDrawCount;
  let len = newPositions.length;
  let dif = drc - len;

  if(dif < 0) {

    queuedPos.splice(0, -dif);

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    for(let i = 0; i < drc; i++) {
      for(let j = 0; j < 3; j++) {
        posArray[3*i + j] = newPositions[i - dif][j];
      }
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }

  else {

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    //shift the pre-existing points and add the new ones
    let index = 0;
    for(let i = 0; i < dif; i++) {
      for(let j = 0; j < 3; j++) {
        posArray[index] = posArray[index + 3*dif];
        index++;
      }
      index++;
    }
    for(let i = dif; i < drc; i++) {
      for(let j = 0; j < 3; j++) {
        posArray[index] = newPositions[i][j];
        index++;
      }
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }
}

function animateTraj3D() : void {
  requestAnimationFrame(animateTraj3D);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory3D();
      trajRenderer.render(trajScene, trajCamera);
    }
  }
}

//HIGH DIMENSIONAL RENDERING MATH UTILITIES////////////////////////////////////

//normalize arbitrary-dimensional vector
function normalize(vector : Float32Array) : void {
  let magnitude = 0.0;
  let len = vector.length;

  for(let i = 0; i < len; i++)
    magnitude += vector[i]*vector[i];

  magnitude = Math.sqrt(magnitude);

  for(let i = 0; i < len; i++)
    vector[i] /= magnitude;
}

//multiply vector by matrix
function multiply(matrix : Float32Array[], vector : Float32Array) : Float32Array {
  let dim = matrix.length;
  let len = vector.length;

  let result = new Float32Array(dim);

  for(let i = 0; i < dim; i++) {
    result[i] = 0.0;
    for(let j = 0; j < len; j++) result[i] += matrix[i][j]*vector[j];
  }

  return result;
}

//dot product, assume vectors have same length
function dot(u : Float32Array, v : Float32Array) : number {
  let result = 0;
  let iters = u.length;
  for(let i = 0; i < iters; i++)
    result += u[i]*v[i];
  return result;
}

//Gram-Schmidt orthonormalization
function gramSchmidt(vectors : Float32Array[]) : void {

  let dim = vectors.length

  for(let i = 0; i < dim; i++) {
    for(let j = 0; j < i; j++) {
      let proj = dot(vectors[i], vectors[j]);
      for(let k = 0; k < dim; k++)
        vectors[i][k] -= proj*vectors[j][k];
    }
    normalize(vectors[i]);
  }
}

//PROJECTION MATRIX////////////////////////////////////////////////////////////

function getProjectionMatrix(dim : number, params : Float32Array) : Float32Array[] {

  //helper indices
  let d1 = dim - 1;
  let tdf = 2*dim - 4;
  let tdn = 3*dim - 9;

  //first components of the vector are inside the cube [-1,1]^(n-1)
  let vec1 = new Float32Array(dim);
  for(let i = 0; i < d1; i++)
    vec1[i] = params[i];

  //fold the cube into the bottom half of a cross-polytope
  let m = -1.0/0.0;
  for(let i = 0; i < d1; i++)
    m = Math.max(m, Math.abs(params[i]));
  vec1[d1] = 1 - m;

  //project onto sphere
  normalize(vec1);

  //vectors which are *hopefully* linearly independent with vec1
  let helpers = new Array();
  for(let i = 0; i < d1; i++) {
    let helper = new Float32Array(dim);
    for(let j = 0; j < d1; j++) {
      if(j == i) helper[j] = 1;
      else helper[j] = 0;
    }

    helper[d1] = -1;
    helpers.push(helper);
  }

  //get an orthonormal basis with vec1 in it
  let orthobasis = [vec1];
  let h1 = helpers.slice(0, d1);
  orthobasis = orthobasis.concat(h1);
  gramSchmidt(orthobasis);

  //construct the second vector
  let vec2 = new Float32Array(dim);

  if(d1 < tdf - 1) {
    for(let i = 0; i < dim; i++)
      vec2[i] = 0;

    //make vec2 a hypercube orthogonal to vec1
    for(let i = d1; i < tdf; i++) {
      for(let j = 0; j < dim; j++)
        vec2[j] += params[i]*orthobasis[i - d1 + 1][j];
    }

    //fold into cross-polytope
    m = -1.0/0.0;
    for(let i = d1; i < tdf; i++)
      m = Math.max(m, Math.abs(params[i]));
    m = 1 - m;
    for(let i = 0; i < dim; i++)
      vec2[i] += m*orthobasis[dim - 2][i];

    //project onto sphere
    normalize(vec2);
  }

  else vec2 = orthobasis[d1 - 1];

  //construct new orthonormal basis
  orthobasis = [vec1, vec2, orthobasis[d1]];
  let h2 = helpers.slice(0, d1 - 2);
  orthobasis = orthobasis.concat(h2);
  gramSchmidt(orthobasis);

  //construct the third vector
  let vec3 = new Float32Array(dim);

  if(tdf < tdn) {
    for(let i = 0; i < dim; i++)
      vec3[i] = 0;

    //make vec3 a hypercube orthogonal to vec1 and vec2
    for(let i = tdf; i < tdn; i++) {
      for(let j = 0; j < dim; j++)
        vec2[j] += params[i]*orthobasis[i - tdf + 3][j];
    }

    //fold into cross-polytope
    m = -1.0/0.0;
    for(let i = tdf; i < tdn; i++)
      m = Math.max(m, Math.abs(params[i]));
    m = 1 - m;
    for(let i = 0; i < dim; i++)
      vec3[i] += m*orthobasis[dim - 2][i];

    //project onto sphere
    normalize(vec3);
  }

  else vec3 = orthobasis[d1];

  //the projection matrix is a matrix whose rows form an orthonormal basis for the 3-plane
  return [vec1, vec2, vec3];
}

//HIGH DIMENSIONAL RENDERING///////////////////////////////////////////////////

//store the high dimensional points in case they need to be re-projected
let highDimPos = new Array();
for(let i = 0; i < maxTrajCoords; i++)
  highDimPos.push(new Float32Array(dimension));

//update the trajectory with the new points from the server, and re-project the points if necessary
function updateTrajectory() : void {

  //has the projection matrix been updated?
  let pu = projectionUpdate;

  //copy the queued positions and then reset them
  const newPositions = queuedPos.slice();
  //queuedPos = [];

  //get the current drawcount and compare against the number of new points
  let drc = trajDrawCount;
  let len = newPositions.length;
  let dif = drc - len;

  if(dif < 0) {

    queuedPos.splice(0, -dif);

    //replace all the high dimensional points with the new points
    for(let i = 0; i < drc; i++)
      highDimPos[i] = newPositions[i - dif];

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    //project all the new high dimensional points
    for(let i = 0; i < drc; i++) {
      let pos = multiply(projection, highDimPos[i]);
      for(let j = 0; j < 3; j++) {
        posArray[3*i + j] = pos[j];
      }
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }

  else {

    //shift the pre-existing high dimensional points and add the new ones
    for(let i = 0; i < dif; i++)
      highDimPos[i] = highDimPos[i + len];
    for(let i = dif; i < drc; i++)
      highDimPos[i] = newPositions[i - dif];

    const currentGeometry = <THREE.BufferGeometry> trajectory.geometry;
    let currentPositions = <THREE.BufferAttribute> currentGeometry.getAttribute('position');
    let posArray = <Float32Array> currentPositions.array;

    //if the projection matrix has been updated, re-project all the points
    if(pu) {
      for(let i = 0; i < drc; i++) {
        let pos = multiply(projection, highDimPos[i]);
        for(let j = 0; j < 3; j++)
          posArray[3*i + j] = pos[j];
      }
      projectionUpdate = false;
    }

    //otherwise shift the low dimensional points and project the new ones
    else {

      let index = 0;
      for(let i = 0; i < dif; i++) {
        for(let j = 0; j < 3; j++) {
          posArray[index] = posArray[index + 3*dif];
          index++;
        }
        index++;
      }

      for(let i = dif; i < drc; i++) {
        let pos = multiply(projection, highDimPos[i]);
        for(let j = 0; j < 3; j++) {
          posArray[index] = pos[j];
          index++;
        }
      }
    }

    currentPositions.needsUpdate = true;
    currentGeometry.setDrawRange(0, trajDrawCount);
  }
}

function animateTraj() : void {
  requestAnimationFrame(animateTraj);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory();
      trajRenderer.render(trajScene, trajCamera);
    }
  }
}