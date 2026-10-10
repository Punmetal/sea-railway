import * as THREE from 'three';
import {PHOTO_RATIOS,cropRect,exportSize,drawPostcard} from './photo-layout.js';
import {PHOTO_FILTERS,PHOTO_DEFAULTS,PHOTO_RANGES,PhotoProcessor} from './photo-effects.js';

export class RailwayPhoto{
  constructor({camera,orbit,renderer,scene,root,guides=null,onChange=()=>{},caption=()=>'',processor=null}){
    Object.assign(this,{camera,orbit,renderer,scene,root,guides,onChange,caption});this.sharedProcessor=processor;
    this.enabled=false;this.frozen=true;this.frame='none';this.ratio='free';this.offset={x:0,y:0};this.grid=false;this.filter='original';this.settings={...PHOTO_DEFAULTS};this.comparing=false;this.saved=null;this.processor=null;this.guideKey='';
  }
  changed(){this.guideKey='';this.onChange(this.state());}
  setEnabled(value){if(Boolean(value)===this.enabled)return;this.enabled=Boolean(value);this.comparing=false;
    if(this.enabled){this.saved={position:this.root.worldToLocal(this.camera.position.clone()),target:this.root.worldToLocal(this.orbit.target.clone()),quaternion:this.camera.quaternion.clone(),fov:this.camera.fov,enabled:this.orbit.enabled,pan:this.orbit.enablePan,min:this.orbit.minDistance,max:this.orbit.maxDistance,minPolar:this.orbit.minPolarAngle,maxPolar:this.orbit.maxPolarAngle};if(!this.orbit.enabled)this.orbit.target.copy(this.camera.position).addScaledVector(this.camera.getWorldDirection(new THREE.Vector3()),6);this.orbit.enabled=true;this.orbit.enablePan=true;this.orbit.minDistance=.5;this.orbit.maxDistance=500;this.orbit.minPolarAngle=.02;this.orbit.maxPolarAngle=Math.PI-.02;this.frozen=true;}
    else if(this.saved){
      // Drain photo pan/rotation damping through the public API before putting
      // the game camera back. A residual photo drag must not move that pose.
      const damping=this.orbit.enableDamping;this.orbit.enableDamping=false;try{this.orbit.update?.();}finally{this.orbit.enableDamping=damping;}
      this.camera.position.copy(this.root.localToWorld(this.saved.position.clone()));this.orbit.target.copy(this.root.localToWorld(this.saved.target.clone()));this.camera.quaternion.copy(this.saved.quaternion);this.camera.fov=this.saved.fov;this.camera.updateProjectionMatrix();Object.assign(this.orbit,{enabled:this.saved.enabled,enablePan:this.saved.pan,minDistance:this.saved.min,maxDistance:this.saved.max,minPolarAngle:this.saved.minPolar,maxPolarAngle:this.saved.maxPolar});this.saved=null;this.processor?.dispose();this.processor=null;
    }
    if(this.guides)this.guides.hidden=!this.enabled;this.changed();
  }
  setFov(value){const f=Number(value);if(!Number.isFinite(f)||f<28||f>95)throw new Error('Invalid photo lens');this.camera.fov=f;this.camera.updateProjectionMatrix();this.changed();}
  setRatio(value){if(!Object.hasOwn(PHOTO_RATIOS,value))throw new Error('Invalid photo ratio');this.ratio=value;this.offset={x:0,y:0};this.changed();}
  setOffset(axis,value){const n=Number(value);if(!['x','y'].includes(axis)||!Number.isFinite(n)||Math.abs(n)>1)throw new Error('Invalid crop offset');this.offset[axis]=n;this.changed();}
  setFilter(value){if(!Object.hasOwn(PHOTO_FILTERS,value))throw new Error('Invalid photo filter');this.filter=value;const p=PHOTO_FILTERS[value];for(const k of ['bloom','grain','vignette'])this.settings[k]=p[k];this.changed();}
  setAdjustment(key,value){const n=Number(value),range=PHOTO_RANGES[key];if(!range||!Number.isFinite(n)||n<range[0]||n>range[1])throw new Error('Invalid photo adjustment');this.settings[key]=n;this.changed();}
  setFrame(value){if(!['none','postcard'].includes(value))throw new Error('Invalid photo frame');this.frame=value;this.changed();}
  setGrid(value){this.grid=Boolean(value);this.changed();}
  setComparing(value){this.comparing=this.enabled&&Boolean(value);this.onChange(this.state());}
  reset(){this.filter='original';this.settings={...PHOTO_DEFAULTS};this.comparing=false;this.ratio='free';this.offset={x:0,y:0};this.grid=false;this.frame='none';if(this.saved){this.camera.fov=this.saved.fov;this.camera.updateProjectionMatrix();}this.changed();}
  state(){return {enabled:this.enabled,frozen:this.frozen,frame:this.frame,fov:this.camera.fov,ratio:this.ratio,offset:{...this.offset},grid:this.grid,filter:this.filter,settings:{...this.settings},comparing:this.comparing};}
  rect(width=this.renderer.domElement.width,height=this.renderer.domElement.height){return cropRect(width,height,this.ratio,this.offset.x,this.offset.y);}
  render(){
    const active=this.enabled&&!this.comparing&&this.settings.intensity>0&&(this.filter!=='original'||Object.entries(this.settings).some(([k,v])=>k!=='intensity'&&v!==0));
    if(this.sharedProcessor){this.sharedProcessor.render(this.scene,this.camera,this.state(),this.rect());}
    else if(active){this.processor??=new PhotoProcessor(this.renderer);this.processor.render(this.scene,this.camera,this.state(),this.rect());}
    else this.renderer.render(this.scene,this.camera);
    if(this.enabled)this.drawGuides();
  }
  drawGuides(){
    if(!this.guides)return;
    const source=this.renderer.domElement,w=source.clientWidth||source.width,h=source.clientHeight||source.height,caption=this.caption();
    const key=[source.width,source.height,w,h,this.ratio,this.offset.x,this.offset.y,this.grid,this.frame,caption].join('|');if(key===this.guideKey)return;this.guideKey=key;
    const dimensions=source.width+':'+source.height;if(this.guideDimensions!==dimensions){this.guideDimensions=dimensions;this.onChange(this.state());}
    const dpr=Math.min(2,source.width/w),c=this.guides;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.width=w+'px';c.style.height=h+'px';
    const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const r=this.rect(w,h);
    ctx.fillStyle='rgba(17,25,35,.48)';ctx.fillRect(0,0,w,r.y);ctx.fillRect(0,r.y+r.height,w,h-r.y-r.height);ctx.fillRect(0,r.y,r.x,r.height);ctx.fillRect(r.x+r.width,r.y,w-r.x-r.width,r.height);
    if(this.frame==='postcard'){
      const out=exportSize(this.rect());ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.width/out.width,r.height/out.height);drawPostcard(ctx,out.width,out.height,caption);ctx.restore();
    }
    ctx.lineWidth=1;ctx.strokeStyle='rgba(255,246,223,.68)';ctx.strokeRect(r.x+.5,r.y+.5,Math.max(0,r.width-1),Math.max(0,r.height-1));
    if(this.grid){ctx.strokeStyle='rgba(255,246,223,.42)';ctx.beginPath();for(const t of [1/3,2/3]){ctx.moveTo(r.x+r.width*t,r.y);ctx.lineTo(r.x+r.width*t,r.y+r.height);ctx.moveTo(r.x,r.y+r.height*t);ctx.lineTo(r.x+r.width,r.y+r.height*t);}ctx.stroke();}
  }
  async capture(){
    if(!this.enabled)throw new Error('Open photo mode first');
    if(this.renderer.getContext?.().isContextLost?.())throw new Error('Graphics context is unavailable');
    const ratio=this.ratio,filter=this.filter;
    const comparing=this.comparing;try{this.comparing=false;this.render();}finally{this.comparing=comparing;}
    const source=this.renderer.domElement,r=this.rect(),size=exportSize(r),c=document.createElement('canvas');c.width=size.width;c.height=size.height;
    const ctx=c.getContext('2d');if(!ctx)throw new Error('Cannot create photo');ctx.drawImage(source,r.x,r.y,r.width,r.height,0,0,c.width,c.height);
    if(this.frame==='postcard')drawPostcard(ctx,c.width,c.height,this.caption());
    const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Cannot encode photo')),'image/png'));
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Sea-Railway-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';
    // Attach the download link for browsers that require a connected element.
    // Cleanup also runs if the click fails or the user exits while encoding.
    try{document.body?.appendChild(a);a.click();}finally{a.remove?.();setTimeout(()=>URL.revokeObjectURL(url),30000);}
    return {saved:true,width:c.width,height:c.height,ratio,filter};
  }
  dispose(){this.processor?.dispose();this.processor=null;}
}
