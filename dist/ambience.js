// Original sample-free soundscape. Nothing starts until the sound button is used.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class RailwayAmbience{
  constructor({createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),onChange=()=>{}}={}){
    this.createContext=createContext;this.onChange=onChange;this.enabled=false;this.volume=.45;this.trainEnabled=false;this.trainVolume=.55;this.error=false;this.travel=0;this.creakTime=0;this.nodes=[];this.voices=new Set();this.mix={speed:0,inside:false,window:0,door:0,distance:0,pan:0,rain:0};
  }
  state(){return {enabled:this.enabled,volume:this.volume,error:this.error,train:{enabled:this.trainEnabled,volume:this.trainVolume}};}
  emit(){this.onChange(this.state());}
  param(p,value,tau=.15){p.setTargetAtTime(value,this.context.currentTime,tau);}
  noise(seconds,seed){const c=this.context,b=c.createBuffer(1,Math.ceil(c.sampleRate*seconds),c.sampleRate),a=b.getChannelData(0);let s=seed;for(let i=0;i<a.length;i++){s=(s*1664525+1013904223)>>>0;a[i]=(s/4294967296)*2-1;}return b;}
  init(){
    const c=this.context;this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);this.trainMaster=c.createGain();this.trainMaster.gain.value=0;this.trainMaster.connect(c.destination);this.nodes.push(this.master,this.trainMaster);
    const bed=this.noise(7.3,9107);
    const loop=(type,frequency,q,outlet=this.master)=>{const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),pan=c.createStereoPanner();source.buffer=bed;source.loop=true;filter.type=type;filter.frequency.value=frequency;filter.Q.value=q;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(outlet);source.start(0);this.nodes.push(source,filter,gain,pan);return {source,filter,gain,pan};};
    this.rail=loop('lowpass',150,.65,this.trainMaster);this.wind=loop('bandpass',520,.45);this.water=loop('lowpass',760,.4);this.rain=loop('bandpass',1700,.5);
    this.tickBuffer=this.noise(.18,651);const tick=this.tickBuffer.getChannelData(0);for(let i=0;i<tick.length;i++){const t=i/c.sampleRate;tick[i]*=Math.exp(-t*48)*.5+Math.exp(-t*22)*Math.sin(t*970)*.22;}
    this.creakBuffer=this.noise(.65,37);const creak=this.creakBuffer.getChannelData(0);for(let i=0;i<creak.length;i++){const t=i/creak.length;creak[i]*=Math.sin(t*Math.PI)**2*(.18+.12*Math.sin(t*34));}
  }
  async setEnabled(enabled,{gesture=false}={}){
    if(!enabled){this.enabled=false;this.applyGain();this.emit();return this.state();}
    if(!this.context&&!gesture)return {...this.state(),needsGesture:true};
    this.enabled=true;this.error=false;
    try{if(!this.context){this.context=this.createContext();this.init();}await this.context.resume();this.applyGain();this.update(0,0,this.mix);this.emit();}
    catch{this.enabled=false;this.error=true;this.applyGain();this.emit();}
    return this.state();
  }
  async setTrainEnabled(enabled,{gesture=false}={}){
    if(!enabled){this.trainEnabled=false;this.travel=0;this.applyGain();this.emit();return this.state();}
    if(!this.context&&!gesture)return {...this.state(),needsGesture:true};this.trainEnabled=true;this.error=false;
    try{if(!this.context){this.context=this.createContext();this.init();}await this.context.resume();this.applyGain();this.update(0,0,this.mix);this.emit();}catch{this.trainEnabled=false;this.error=true;this.applyGain();this.emit();}return this.state();
  }
  setVolume(value){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid ambience volume');this.volume=value;this.applyGain();this.emit();return this.state();}
  setTrainVolume(value){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid train volume');this.trainVolume=value;this.applyGain();this.emit();return this.state();}
  bell(departure=false){
    if(!this.context||(!this.enabled&&!this.trainEnabled)||this.context.state==='suspended')return;
    const c=this.context,out=this.enabled?this.master:this.trainMaster;
    for(const [i,hz] of (departure?[784,659]:[659,523]).entries()){
      const oscillator=c.createOscillator(),gain=c.createGain(),start=c.currentTime+i*.38;oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.055,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+1.3);oscillator.connect(gain);gain.connect(out);oscillator.start(start);oscillator.stop(start+1.4);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }
  }
  applyGain(){if(this.master)this.param(this.master.gain,this.enabled?this.volume*.72:0,.12);if(this.trainMaster)this.param(this.trainMaster.gain,this.trainEnabled?this.trainVolume*.72:0,.12);}
  play(buffer,gain,frequency,delay=0){
    if(this.voices.size>18)return;const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=frequency;g.gain.value=gain;p.pan.value=this.mix.pan;source.connect(filter);filter.connect(g);g.connect(p);p.connect(this.trainMaster);
    const voice={source,filter,g,p};this.voices.add(voice);source.onended=()=>{for(const node of Object.values(voice))node.disconnect();this.voices.delete(voice);};source.start(c.currentTime+.015+delay);
  }
  update(dt,time,mix){
    this.mix=mix;if(!this.context||!this.rail||(!this.enabled&&!this.trainEnabled)||this.context.state==='suspended')return;
    const speed=clamp(Math.abs(mix.speed)/6.495,0,1),outside=1/(1+(mix.distance/32)**2),presence=mix.inside?1:outside;
    const opening=mix.inside?clamp(.12+mix.window*.45+mix.door*.65,0,1):1;
    this.param(this.rail.gain.gain,presence*speed*(mix.inside?.18:.12)*(1+.10*Math.sin(time*5.1)));
    this.param(this.rail.filter.frequency,90+speed*140);
    this.param(this.wind.gain.gain,(.025+speed*.085)*opening*(mix.sheltered?.55:1)*(.84+.16*Math.sin(time*.31)));
    this.param(this.wind.filter.frequency,mix.inside?340+opening*580:850);
    this.param(this.water.gain.gain,(mix.inside?.027:.075)*(mix.sheltered?.65:1)*(.85+.15*Math.sin(time*.43+.9)));
    this.param(this.rain.gain.gain,(mix.rain||0)*(mix.inside?.115:mix.sheltered?.095:.08)*(1+.1*Math.sin(time*1.7)+.045*Math.sin(time*9.1)));this.param(this.rain.filter.frequency,mix.inside?700+opening*850:mix.sheltered?800:1900);
    for(const layer of [this.rail,this.wind,this.water,this.rain])this.param(layer.pan.pan,clamp(mix.pan,-.75,.75));
    if(!this.trainEnabled)return;this.travel+=Math.abs(mix.speed)*dt;this.creakTime+=dt;
    if(this.travel>=12){this.travel%=12;this.play(this.tickBuffer,presence*speed*.25,mix.inside?780:1350);this.play(this.tickBuffer,presence*speed*.19,mix.inside?780:1350,.11);}
    if(this.creakTime>15.7&&speed>.15){this.creakTime=0;this.play(this.creakBuffer,presence*speed*(mix.inside?.10:.025),460);}
  }
  async onVisibility(hidden){if(!this.context)return;this.travel=0;this.creakTime=0;if(hidden)await this.context.suspend();else if(this.enabled||this.trainEnabled)try{await this.context.resume();}catch{}}
  dispose(){this.enabled=false;this.trainEnabled=false;for(const v of this.voices){v.source.stop();for(const node of Object.values(v))node.disconnect();}this.voices.clear();for(const node of this.nodes){if(node.stop)try{node.stop();}catch{}node.disconnect();}this.context?.close();}
}
