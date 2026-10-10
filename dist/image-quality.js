export const IMAGE_QUALITY={
 low:{samples:0,maxEdge:1920,minScale:1,anisotropy:2},
 medium:{samples:2,maxEdge:2880,minScale:1.2,anisotropy:8},
 high:{samples:4,maxEdge:3840,minScale:1.5,anisotropy:16}
};

export class AdaptiveImageScale{
 constructor(name,dpr,coarse=false){this.configure(name,dpr,coarse);}
 configure(name,dpr,coarse=false){
  const limits=IMAGE_QUALITY[name];if(!limits)throw Error('Unknown image quality');
  this.ceiling=Math.min(dpr,coarse?1.5:{low:1,medium:1.35,high:2}[name]);
  this.dpr=dpr;this.floor=Math.min(this.ceiling,coarse?1:limits.minScale);this.scale=this.ceiling;this.average=1/60;this.window=0;this.recovery=0;return this.scale;
 }
 update(dt,blocked=false){
  if(blocked||!Number.isFinite(dt)||dt<=0||dt>=.25)return null;
  this.average=this.average*.97+dt*.03;this.window+=dt;if(this.window<4)return null;
  this.window=0;const before=this.scale;
  if(this.average>.034){this.recovery=0;this.scale=Math.max(this.floor,this.scale-.125);}
  else if(this.average<.021){this.recovery+=4;if(this.recovery>=8){this.scale=Math.min(this.ceiling,this.scale+.125);this.recovery=0;}}
  else this.recovery=0;
  return this.scale===before?null:this.scale;
 }
}

export function supportedHDRSamples(renderer,requested){
 const maximum=Math.min(requested,renderer.capabilities?.maxSamples??4);
 const gl=renderer.getContext?.();
 if(gl?.getInternalformatParameter){
  const supported=gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES);
  return Math.max(0,...Array.from(supported??[]).filter(n=>n<=maximum));
 }
 return maximum;
}
