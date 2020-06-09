"""
This script serves as an example for how to use our protocol for transmitting spike trains and latent trajectories in real time.

In practice, this script would be getting data from software driving experimental hardware monitoring an animals brain.

You would probably have a separate script for inferring the latent trajectory (using online PCA, Kalman filterin, VJF, etc) as well as spike sorting.
"""

import os
import math
import random
import joblib
import asyncio

import numpy as np
import bitstring as bs
import websockets as ws

def rand_spikes(num_spikes: int):
    """
    :param num_spikes: number of spike train channels
    :return: bitstring encoding the spikes to be sent to the server
    """

    idx_set = set()

    #decide on some random channels which will have a spike this time around
    for i in range(num_spikes//3):
        idx = random.randint(0, num_spikes)
        idx_set.add(idx)

    string = bs.BitArray(bits='')

    for idx in idx_set:

        #first 16 bits tell the client which channel spiked
        idx_str = bs.BitArray(uint=idx, length=16)

        #second 16 bits tell the client how many spikes occurred
        #in practice, this will almost always be 1, so here it is always 1
        num_str = bs.BitArray(uint=1, length=16)

        #the message is broken into 32 bit blocks which contain information about each channel
        string = string + idx_str + num_str

    return string


def next_traj_points(dimension: int, last_point):
    """
    :param dimension: dimension of our fake latent trajectory
    :param last_point: the last point that was sent to the client as a numpy array
    :return: here we are sending 3 points at a time from a noisy Lorenz system
    """

    #Euler step size
    step  = 0.001

    #Lorenz parameters
    beta  = 2.666666
    sigma = 10
    rho   = 28

    point = np.zeros((4, dimension), dtype='float32')
    point[0] = last_point

    #compute the next few points
    for i in range(1, 4):

        x, y, z = point[i - 1, 0], point[i - 1, 1], point[i - 1, 2]

        #Lorenz system
        dx, dy, dz = sigma*(y - x), x*(rho - z) - y, x*y - beta*z
        point[i, 0] = x + step*dx
        point[i, 1] = y + step*dy
        point[i, 2] = z + step*dz

        #simple uniform noise
        point[i] = point[i - 1] + np.rand(dimension, dtype='float32')

    new_point = point[2]

    #we will actually send a scaled down version to the server for visualization purposes
    point *= 0.01

    string = bs.BitArray(bits='')

    for i in range(1, 4):
        for j in range(dimension):
            string = string + bs.Bits(point[i, j])

    return string, new_point

if __name__ == "__main__":

    print("Our IP address:")
    os.system("hostname -I")

    #for example: 3
    dim_in = input("Desired dimension of trajectory: ")
    dimension = int(dim_in)

    #for example: 8200
    tp_in = input("Desired port for running trajectory server: ")
    traj_port = int(tp_in)

    #however many spike train channels you would regularly expect to have in an experiment
    spike_in = input("Desired number of spike train channels: ")
    num_spikes = int(spike_in)

    #for example: 8400
    sp_in = input("Desired port for running spike server: ")
    spike_port = int(sp_in)