"""Render Quiet Tide: an original 16-bar, seamless 72 BPM lo-fi composition.
No samples, recordings, third-party songs, or external synthesis libraries.
The generated composition and recording are dedicated to the public domain (CC0).
"""
from pathlib import Path
import wave
import numpy as np
from scipy.signal import butter, sosfilt

RATE=22050
BEAT=60/72
LENGTH=16*4*BEAT
N=round(RATE*LENGTH)
rng=np.random.default_rng(731)
mix=np.zeros((N,2),dtype=np.float64)

def add(signal,start,volume=.1,pan=0):
    idx=(round(start*RATE)+np.arange(len(signal)))%N
    np.add.at(mix[:,0],idx,signal*volume*np.sqrt((1-pan)/2))
    np.add.at(mix[:,1],idx,signal*volume*np.sqrt((1+pan)/2))

def tone(note,duration,kind='keys'):
    t=np.arange(round(duration*RATE))/RATE
    freq=440*2**((note-69)/12)
    if kind=='keys':
        signal=np.sin(2*np.pi*freq*t+1.1*np.sin(2*np.pi*freq*2*t)*np.exp(-t*3))
        signal+=.18*np.sin(2*np.pi*freq*3*t)*np.exp(-t*5)
        env=(1-np.exp(-t*100))*np.exp(-t*.95)
    else:
        signal=np.sin(2*np.pi*freq*t)+.12*np.sin(2*np.pi*freq*2*t)
        env=(1-np.exp(-t*45))*np.exp(-t*2.2)
    env*=np.minimum(1,(duration-t)/.05)
    return signal*env

# Am9, Dm9, G13, Cmaj9; two bars each, twice with a sparse melody variant.
chords=[(45,[57,60,64,67,71]),(50,[57,60,64,65,69]),(43,[55,59,64,65,69]),(48,[55,59,62,64,67])]
melody=[76,74,71,67,69,72,76,74,71,69,67,64,67,71,74,76]
for bar in range(16):
    root,notes=chords[(bar//2)%4]
    start=bar*4*BEAT
    for j,note in enumerate(notes):
        dry=tone(note,3.1)
        add(dry,start+j*.022,.078,(-1 if j%2 else 1)*.24)
        add(dry,start+j*.022+BEAT*.75,.018,.35)
        add(dry,start+j*.022+BEAT*1.5,.009,-.35)
    for beat in [0,2.55]:add(tone(root,1.1,'bass'),start+beat*BEAT,.16,0)
    add(tone(melody[bar],1.9),start+BEAT*(2.1 if bar%2 else 1.6),.039,.12)
    if bar%4==3:add(tone(melody[bar]-2,1.4),start+3.35*BEAT,.026,-.2)
    for beat in [0,2.55]:
        t=np.arange(round(.24*RATE))/RATE
        kick=np.sin(2*np.pi*(48*t+10*.04*(1-np.exp(-t/.04))))*np.exp(-t*22)
        add(kick,start+beat*BEAT,.18)
    for beat in [1.03,3.03]:
        t=np.arange(round(.16*RATE))/RATE
        noise=rng.normal(0,1,len(t));noise=np.convolve(noise,[1,-.75],mode='same')
        snare=(noise*.35+np.sin(2*np.pi*180*t)*.25)*np.exp(-t*28)
        add(snare,start+beat*BEAT,.042,-.1)
    for beat in [0,.58,1,1.58,2,2.58,3,3.58]:
        t=np.arange(round(.07*RATE))/RATE
        noise=rng.normal(0,1,len(t));noise=np.convolve(noise,[1,-1],mode='same')
        add(noise*np.exp(-t*90),start+beat*BEAT,.006,.25)

# Circular filtering avoids an initial filter transient at the loop seam.
sos=butter(2,4200,fs=RATE,output='sos')
extended=np.concatenate([mix,mix,mix])
mix=sosfilt(sos,extended,axis=0)[N:2*N]
mix=np.tanh(mix*1.3)
mix*=.68/max(np.max(np.abs(mix)),.01)
pcm=(mix*32767).astype('<i2')
out=Path(__file__).resolve().parents[1]/'dist/audio/quiet-tide.wav'
out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as wav:
    wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes(pcm.tobytes())
print({'seconds':N/RATE,'bytes':out.stat().st_size,'loop_boundary_step':float(np.max(np.abs(mix[0]-mix[-1]))),'peak':float(np.max(np.abs(mix)))})
