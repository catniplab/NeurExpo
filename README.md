# NeurExpo

In neuroscience, many experimental settings, such as those where we wish to stimulate and drive a system from which we are recording, call for real-time decoding of the latent processes emerging from the neural population's behavior. There exist many algorithms designed for this purpose, including online PCA, Kalman filtering, and variational joint filtering.

However, the output of these algorithms is usually high-dimensional, and restricting ourselves to visualizing the first 3 principal components is limiting. Further, raster plots of spike trains are difficult to interpret in the real-time setting. This software addresses these problems by allowing the user to adjust which 3 components of the latent trajectory are visualized and presenting a novel way of visualizing real-time spike trains.

Assuming there is a server-side program which reads from experimental hardware, sorts spikes, and infers a latent trajectory, we have designed a protocol for transmitting this data over a websocket and a portable browser-based GUI for visualizing it. The implementation of the server-side program will depend on the experimental hardware being used, but we have included some example scripts in `python` which demonstrate how to use our data transmission protocol.

## Usage

Simply clone this repository and open `client/home.html` with your favorite browser.

You will likely have to write the server-side code yourself to fit your experimental hardware and whichever spike-sorting and latent trajectory inference algorithms you prefer. Compile and read `manual/manual.tex` for details on how to do this.