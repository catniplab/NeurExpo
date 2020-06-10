"""
This script demonstrates how to use the protocol for transmitting spike trains.
"""

import os
import math
import time
import random
import asyncio
import subprocess

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


async def spike_server(num_spikes, websocket, path):

    print("Connection estabilished.")

    await websocket.send(num_spikes.to_bytes(32, byteorder='big'))

    msg = await websocket.recv()

    while True:

        time.sleep(0.01)

        bit_str = rand_spikes(num_spikes)
        websocket.send(bit_str)


if __name__ == "__main__":

    ip = subprocess.run(['hostname', '-I'], stdout=subprocess.PIPE).stdout.decode('utf-8')
    print("\nMy IP address:")
    print(ip)

    port_in = input("Desired port for spike train server: ")
    port = int(port_in)

    num_in = input("Desired number of spike train channels: ")
    num = int(num_in)

    print("\nReady.\n")

    start_server = ws.serve(lambda ws, p: spike_server(num, ws, p), ip, port)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
