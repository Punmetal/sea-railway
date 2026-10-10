import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {IMAGE_QUALITY,AdaptiveImageScale,supportedHDRSamples} from '../dist/image-quality.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {PhotoProcessor,PHOTO_DEFAULTS}=await import('../dist/photo-effects.js');
for(const name of ['low','medium','high'])for(const dpr of [1,1.25,2,3])for(const coarse of [true,false]){
 const scale=new AdaptiveImageScale(name,dpr,coarse),ceiling=scale.ceiling;
 for(let i=0;i<2400;i++)scale.update(1/24);assert(scale.scale>=scale.floor&&scale.scale<=ceiling);
 for(let i=0;i<2400;i++)scale.update(1/60);assert.equal(scale.scale,ceiling,'Sustained fast frames recover lost resolution.');
 const held=scale.scale;for(let i=0;i<2000;i++)scale.update(1/20,true);assert.equal(scale.scale,held,'Photo mode/hidden tabs cannot change resolution.');
 for(const dt of [0,-1,NaN,Infinity,.3,1])assert.equal(scale.update(dt),null,'Invalid and resumed/loading frames do not lower resolution.');
}
const high=new AdaptiveImageScale('high',2);for(let i=0;i<2000;i++)high.update(1/25);assert.equal(high.scale,1.5,'High quality never silently falls to one pixel per CSS pixel on Retina.');
const floor=high.scale;for(let i=0;i<200;i++)high.update(1/60);assert.equal(high.scale,floor,'Recovery waits for sustained headroom.');for(let i=0;i<2400;i++)high.update(1/60);assert.equal(high.scale,2);
let draws=0,target=null;const renderer={capabilities:{maxSamples:8},toneMappingExposure:1.125,domElement:{width:3840,height:2160},getContext(){return {RENDERBUFFER:1,RGBA16F:2,SAMPLES:3,getInternalformatParameter:()=>new Int32Array([4,2,0])};},getDrawingBufferSize:v=>v.set(renderer.domElement.width,renderer.domElement.height),getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},render(){draws++;}};
assert.equal(supportedHDRSamples(renderer,8),4);assert.equal(supportedHDRSamples(renderer,2),2);assert.equal(supportedHDRSamples(renderer,0),0);assert.equal(supportedHDRSamples({capabilities:{maxSamples:0}},4),0);
const p=new PhotoProcessor(renderer,{samples:4,maxEdge:IMAGE_QUALITY.high.maxEdge,worldGlow:.5}),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),state={filter:'original',settings:{...PHOTO_DEFAULTS},comparing:false};
let disposed=0;p.world.addEventListener('dispose',()=>disposed++);p.setSamples(8);assert.equal(disposed,0,'Requesting unsupported extra samples does not reallocate the same supported target.');p.setSamples(2);assert.equal(disposed,1);p.setSamples(4);assert.equal(disposed,2);
p.render(scene,camera,state,{x:0,y:0,width:3840,height:2160});assert.equal(p.world.samples,4);assert.equal(p.world.width,3840);assert.equal(p.world.height,2160);assert.equal(p.uniforms.uAntialias.value,1);assert.equal(p.uniforms.uTexel.value.x,1/3840);assert.equal(draws,4,'AA and sharpening share the existing final composite.');assert.equal(target,null);
for(const [w,h]of [[7680,4320],[6000,6000],[1080,8000]]){renderer.domElement.width=w;renderer.domElement.height=h;p.render(scene,camera,state,{x:0,y:0,width:w,height:h});assert(p.world.width*p.world.height<=8294400+8000);assert(Math.max(p.world.width,p.world.height)<=3840);assert(Math.abs(p.world.width/p.world.height-w/h)<.002);}
p.dispose();console.log('Image quality: supported 4x HDR MSAA, full 4K bounds, one composite AA/sharpen, quality floors, sustained recovery, photo/visibility hold, invalid frame guards and allocation cleanup passed.');
