"""Measure RGB differences between the two halves of a real browser sky PNG.

Dependency-free decoder for the browser's noninterlaced RGB/RGBA 8-bit PNGs.
This does not render, synthesize or alter pixels; it only reads an actual capture.
"""
import argparse
import json
import struct
import zlib
from pathlib import Path

def decode(path):
    data=path.read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Not a PNG')
    compressed=bytearray();offset=8
    while offset<len(data):
        size=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+size]
        crc=struct.unpack('>I',data[offset+8+size:offset+12+size])[0]
        if zlib.crc32(kind+payload)&0xffffffff!=crc:raise ValueError('PNG CRC failed')
        if kind==b'IHDR':width,height,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',payload)
        if kind==b'IDAT':compressed.extend(payload)
        offset+=size+12
    if depth!=8 or color not in (2,6) or interlace:raise ValueError('Expected noninterlaced 8-bit RGB/RGBA PNG')
    channels=3 if color==2 else 4;stride=width*channels;raw=zlib.decompress(compressed);rows=[];previous=bytearray(stride)
    for y in range(height):
        start=y*(stride+1);kind=raw[start];row=bytearray(raw[start+1:start+1+stride])
        for x in range(stride):
            a=row[x-channels] if x>=channels else 0;b=previous[x];c=previous[x-channels] if x>=channels else 0
            if kind==0:predict=0
            elif kind==1:predict=a
            elif kind==2:predict=b
            elif kind==3:predict=(a+b)//2
            elif kind==4:
                p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c);predict=a if pa<=pb and pa<=pc else b if pb<=pc else c
            else:raise ValueError('Invalid PNG filter')
            row[x]=(row[x]+predict)&255
        rows.append(row);previous=row
    return width,height,channels,rows

parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('png',type=Path);args=parser.parse_args()
width,height,channels,rows=decode(args.png)
if width%2:raise ValueError('Comparison image must contain equal-sized halves')
half=width//2;total=0;histogram=[0]*256;changed=0;opaque=True
for row in rows:
    for x in range(half):
        pixel_changed=False
        for k in range(3):
            d=abs(row[x*channels+k]-row[(x+half)*channels+k]);histogram[d]+=1;total+=d;pixel_changed|=d>2
        changed+=pixel_changed
        if channels==4:opaque&=row[x*channels+3]==255 and row[(x+half)*channels+3]==255
count=half*height*3;cumulative=0;p99=0
for value,n in enumerate(histogram):
    cumulative+=n
    if cumulative>=count*.99:p99=value;break
print(json.dumps({'file':args.png.name,'viewportPerBackend':[half,height],'meanAbsoluteRGBError8Bit':total/count,'p99AbsoluteChannelError8Bit':p99,'pixelsWithAnyChannelErrorAbove2Percent':changed/(half*height)*100,'opaque':opaque,'scope':'one captured sky camera/time, not full-scene visual parity'},indent=2))
