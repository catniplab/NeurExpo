"""
This script demonstrates how to use the protocol which transmits points on the latent trajectory.
"""

import os
import math
import time
import asyncio
import subprocess

import numpy as np
import bitstring as bs
import websockets as ws

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


async def traj_server(dimension, websocket, path):

    print("Connection estabilished.")

    await websocket.send(dimension.to_byte(32, byteorder='big'))

    msg = await websocket.recv()

    last_point = np.zeros((dimension), dtype='float32')

    while True:

        time.sleep(0.01)

        bit_str, last_point = next_traj_points(dimension, last_point)
        websocket.send(bit_str)


if __name__ == "__main__":

    ip = subprocess.run(['hostname', '-I'], stdout=subprocess.PIPE).stdout.decode('utf-8')
    print("\nMy IP address:")
    print(ip)

    port_in = input("Desired port for trajectory train server: ")
    port = int(port_in)

    dim_in = input("Desired dimension of trajectory: ")
    dim = int(dim_in)

    print("\nReady.\n")

    start_server = ws.serve(lambda ws, p: traj_server(dim, ws, p), ip, port)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
