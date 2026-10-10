// Original project composition, CC0. Audio starts only from an explicit user gesture.
export class RailwayMusic{
  constructor({fetchAudio=()=>fetch('/audio/quiet-tide.wav'),createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),onChange=()=>{}}={}){this.fetchAudio=fetchAudio;this.createContext=createContext;this.onChange=onChange;this.enabled=false;this.volume=.25;this.loading=false;this.error=false;}
  state(){return {enabled:this.enabled,volume:this.volume,loading:this.loading,error:this.error};}
  emit(){this.onChange(this.state());}
  async setEnabled(enabled,{gesture=false}={}){
    if(!enabled){this.enabled=false;this.applyGain();this.emit();return this.state();}
    if(!this.context&&!gesture)return {...this.state(),needsGesture:true};
    this.enabled=true;this.error=false;
    try{
      if(!this.context){this.context=this.createContext();this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);}
      // Resume synchronously within the click handler, before fetching the file.
      const resume=this.context.resume();
      if(!this.ready){this.loading=true;this.ready=this.fetchAudio().then(r=>{if(!r.ok)throw new Error('Audio unavailable');return r.arrayBuffer();}).then(data=>this.context.decodeAudioData(data)).then(buffer=>{this.source=this.context.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.source.connect(this.gain);this.source.start();});}
      this.emit();await Promise.all([resume,this.ready]);this.loading=false;this.applyGain();this.emit();
    }catch{this.enabled=false;this.loading=false;this.error=true;this.ready=null;this.applyGain();this.emit();}
    return this.state();
  }
  setVolume(value){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid volume');this.volume=value;this.applyGain();this.emit();return this.state();}
  applyGain(){if(!this.gain)return;const g=this.gain.gain,t=this.context.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(this.enabled?this.volume*.65:0,t+.18);}
  async onVisibility(hidden){if(!this.context)return;if(hidden)await this.context.suspend();else if(this.enabled)try{await this.context.resume();}catch{}}
  dispose(){this.enabled=false;this.source?.stop();this.context?.close();}
}
