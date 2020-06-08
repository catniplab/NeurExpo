function animate2D() : void {
  requestAnimationFrame(animate2D);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory2D();
      trajRenderer.render(trajScene, trajCamera);
    }
    spikeRenderer.render(spikeScene, spikeCamera);
  }
  //spike shader must be updated even if paused, otherwise the gamma filter will get messed up
  if(transmitting)
    updateSpikeShader();
}

function animate3D() : void {
  requestAnimationFrame(animate3D);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory3D();
      trajRenderer.render(trajScene, trajCamera);
    }
    spikeRenderer.render(spikeScene, spikeCamera);
  }
  //spike shader must be updated even if paused or else the gamma filter will get messed up
  if(transmitting)
    updateSpikeShader();
}

function animate() : void {
  requestAnimationFrame(animate);
  if(!paused) {
    if(queuedPos.length > 0) {
      updateTrajectory();
      trajRenderer.render(trajScene, trajCamera);
    }
    spikeRenderer.render(spikeScene, spikeCamera);
  }
  //spike shader must be updated even if paused or else the gamma filter will get messed up
  if(transmitting)
    updateSpikeShader();
}