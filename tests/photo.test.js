import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {RailwayPhoto}=await import('../dist/photo-mode.js');
const {PHOTO_RATIOS,cropRect,exportSize}=await import('../dist/photo-layout.js');
const {PHOTO_FILTERS,PHOTO_DEFAULTS,PhotoProcessor}=await import('../dist/photo-effects.js');
let calls=[],lastCanvas,anchor,encode=true,cleanup;
class Canvas{
  constructor(){lastCanvas=this;this.texts=[];this.rects=[];}
  getContext(){const c=this;return {drawImage(...args){calls.push(['copy',...args]);},fillRect(...args){c.rects.push(args);},fillText(text,x,y,maxWidth){c.texts.push({text,x,y,maxWidth,size:parseFloat(this.font)});}};}
  toBlob(callback,type){calls.push(['encode',type]);callback(encode?new Blob(['encoding is mocked'],{type}):null);}
}
globalThis.document={createElement(type){if(type==='canvas')return new Canvas();return anchor={click(){calls.push(['download',this.download]);}};}};
globalThis.URL={createObjectURL(blob){assert.equal(blob.type,'image/png');return 'blob:photo-test';},revokeObjectURL(url){calls.push(['cleanup',url]);}};globalThis.setTimeout=fn=>{cleanup=fn;};
const camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),orbit={target:new THREE.Vector3(),enabled:false,enablePan:false,minDistance:12,maxDistance:110,minPolarAngle:.18,maxPolarAngle:Math.PI*.48},source={width:3840,height:2160},renderer={domElement:source,render(){calls.push(['render']);}},photo=new RailwayPhoto({camera,root,orbit,renderer,scene:new THREE.Scene(),caption:()=> '遠い波の駅 · Far Tide · 18:40 GMT+7'});
await assert.rejects(()=>photo.capture());photo.setEnabled(true);assert.equal(orbit.minPolarAngle,.02);assert.equal(orbit.maxPolarAngle,Math.PI-.02);photo.frame='postcard';
for(const [width,height]of [[3840,2160],[900,1400],[640,360]]){
 calls=[];Object.assign(source,{width,height});await photo.capture();assert.equal(calls[0][0],'render');assert.equal(calls[1][0],'copy','Rendering immediately precedes copying the drawing buffer.');assert.equal(calls[2][1],'image/png');assert.equal(calls[3][0],'download');assert(anchor.download.endsWith('.png'));assert(Math.max(lastCanvas.width,lastCanvas.height)<=2880);assert.equal(lastCanvas.texts.length,2);
 const [title,caption]=lastCanvas.texts,footer=lastCanvas.rects[3];assert(title.y-title.size>=footer[1]&&caption.y-caption.size>title.y,'Separate postcard lines stay in the footer at every tested aspect ratio.');assert(caption.y<=lastCanvas.height);for(const t of lastCanvas.texts)assert(t.x>0&&t.x+t.maxWidth<lastCanvas.width,'Both text lines have a bounded width inside the border.');cleanup();assert.equal(calls.at(-1)[0],'cleanup');
}
encode=false;await assert.rejects(()=>photo.capture(),/Cannot encode photo/);photo.setEnabled(false);assert.equal(orbit.enabled,false);assert.equal(orbit.enablePan,false);assert.equal(orbit.minPolarAngle,.18);assert.equal(orbit.maxPolarAngle,Math.PI*.48);assert.equal(camera.fov,50);
encode=true;photo.setEnabled(true);
// Crop coordinates are shared by the preview and export at every aspect and DPR.
for(const [width,height]of [[3840,2160],[900,1400],[640,360],[390,844],[4000,900]])for(const ratio of Object.keys(PHOTO_RATIOS))for(const offset of [-1,0,1]){
 Object.assign(source,{width,height});photo.setRatio(ratio);photo.setOffset('x',offset);photo.setOffset('y',offset);const r=photo.rect(),size=exportSize(r);assert(r.x>=0&&r.y>=0&&r.x+r.width<=width+.001&&r.y+r.height<=height+.001);assert(Math.max(size.width,size.height)<=2880);
 if(PHOTO_RATIOS[ratio])assert(Math.abs(size.width/size.height-PHOTO_RATIOS[ratio])<=1/size.height*2);
 calls=[];const saved=await photo.capture(),copy=calls.find(v=>v[0]==='copy');assert.deepEqual(copy.slice(2),[r.x,r.y,r.width,r.height,0,0,size.width,size.height]);assert.equal(saved.width,size.width);assert.equal(saved.height,size.height);
 assert.equal(lastCanvas.texts.length,2,'Postcard is included within each chosen export aspect.');
 const [title,caption]=lastCanvas.texts,footer=lastCanvas.rects[3];assert(title.y-title.size>=footer[1]&&caption.y-caption.size>title.y);
}
assert.equal(Object.keys(PHOTO_RATIOS).length,8);assert.equal(Object.keys(PHOTO_FILTERS).length,8);
assert.throws(()=>photo.setRatio('bad'));assert.throws(()=>photo.setFilter('bad'));assert.throws(()=>photo.setAdjustment('exposure',3));assert.throws(()=>photo.setOffset('x',2));
// A real Three scene/material/target graph verifies passes and state restoration.
Object.assign(source,{width:3840,height:2160});renderer.toneMappingExposure=1.125;renderer.target=null;
renderer.getDrawingBufferSize=v=>v.set(source.width,source.height);renderer.getRenderTarget=()=>renderer.target;renderer.setRenderTarget=t=>{renderer.target=t;};
renderer.render=(s,c)=>{calls.push([s.name==='photo-postprocess'?'effect':'render',renderer.target,s.children[0]?.material]);};
photo.setRatio('9:16');photo.setOffset('x',.7);photo.frame='none';
for(const key of Object.keys(PHOTO_FILTERS)){
 photo.setFilter(key);calls=[];await photo.capture();assert.equal(calls[0][0],'render');assert.equal(calls.at(-3)[0],'copy');assert.equal(renderer.target,null);
 if(key!=='original'){
  assert(calls.some(c=>c[0]==='effect'));assert(calls.indexOf(calls.find(c=>c[0]==='copy'))>calls.map(c=>c[0]).lastIndexOf('effect'),'Filtered frame is rendered before copying PNG pixels.');
  const u=photo.processor.uniforms,r=photo.rect();assert.equal(u.uFilter.value,PHOTO_FILTERS[key].id);assert.equal(u.uSceneExposure.value,1.125);assert.equal(u.uPhotoToneExposure.value,1,'Scene exposure is applied once.');assert.equal(u.uCrop.value.x,r.x/source.width);assert.equal(u.uCrop.value.w,r.height/source.height);
  assert(Math.max(photo.processor.world.width,photo.processor.world.height)<=2880,'HDR allocations are bounded on large displays.');assert.equal(photo.processor.world.samples,2);
 }
}
photo.setFilter('film');photo.setGrid(true);photo.setComparing(true);calls=[];photo.render();assert.equal(calls.length,1,'Comparison bypasses every effect.');
calls=[];await photo.capture();assert(calls.some(c=>c[0]==='effect'),'Saving while comparing still includes the selected effects.');assert(photo.comparing);
photo.setComparing(false);photo.setAdjustment('intensity',0);calls=[];photo.render();assert.equal(calls.length,1,'Zero intensity is Original.');
photo.reset();assert.deepEqual(photo.settings,PHOTO_DEFAULTS);assert.equal(photo.ratio,'free');assert.equal(photo.filter,'original');assert(!photo.grid);assert.equal(photo.frame,'none');assert.equal(camera.fov,50);
const processor=new PhotoProcessor(renderer),originalRender=renderer.render,sentinel=new THREE.WebGLRenderTarget(1,1);renderer.target=sentinel;renderer.render=()=>{throw new Error('render failed');};assert.throws(()=>processor.render(new THREE.Scene(),camera,photo.state(),cropRect(source.width,source.height)),/render failed/);assert.equal(renderer.target,sentinel,'Even failed passes restore the renderer target.');renderer.render=originalRender;renderer.target=null;processor.dispose();
let disposed=0;photo.processor.world.addEventListener('dispose',()=>disposed++);photo.setEnabled(false);assert.equal(disposed,1);assert.equal(photo.processor,null);assert.equal(renderer.toneMappingExposure,1.125);
// Postcard preview geometry must equal PNG geometry, including min-size text.
const guideRects=[],gridLines=[],transforms=[];let transform=[1,1,0,0];const guideCtx={
 setTransform(a,b,c,d,x,y){transform=[a,d,x,y];},save(){transforms.push([...transform]);},restore(){transform=transforms.pop();},translate(x,y){transform[2]+=x*transform[0];transform[3]+=y*transform[1];},scale(x,y){transform[0]*=x;transform[1]*=y;},
 fillRect(x,y,w,h){guideRects.push([x*transform[0]+transform[2],y*transform[1]+transform[3],w*transform[0],h*transform[1]]);},fillText(){},strokeRect(){},beginPath(){},moveTo(x,y){gridLines.push([x,y]);},lineTo(){},stroke(){}
};photo.guides={style:{},getContext(){return guideCtx;}};photo.setEnabled(true);photo.frame='postcard';photo.grid=true;
for(const [width,height]of [[3840,2160],[900,1400],[640,360]])for(const ratio of Object.keys(PHOTO_RATIOS)){
 Object.assign(source,{width,height,clientWidth:width/2,clientHeight:height/2});photo.setRatio(ratio);guideRects.length=0;gridLines.length=0;await photo.capture();assert.equal(gridLines.length,4,'Preview has two vertical and two horizontal grid lines.');
 const r=photo.rect(),sx=r.width/lastCanvas.width,sy=r.height/lastCanvas.height,actual=guideRects.slice(4);for(let i=0;i<4;i++){
  const [x,y,w,h]=lastCanvas.rects[i],expected=[r.x+x*sx,r.y+y*sy,w*sx,h*sy];for(let k=0;k<4;k++)assert(Math.abs(actual[i][k]-expected[k])<.02,'Preview postcard scales the exact PNG footer and border.');
 }
}
photo.setEnabled(false);
// Graphics loss must fail clearly instead of downloading an empty framebuffer.
photo.setEnabled(true);renderer.getContext=()=>({isContextLost:()=>true});await assert.rejects(()=>photo.capture(),/Graphics context/);delete renderer.getContext;photo.setEnabled(false);
console.log('Photo studio: 120 crop/aspect/DPR cases, all 8 filter pipelines, PNG source bounds, postcard captions, compare/save, reset, intensity zero, HDR budgets, render-failure restoration and disposal passed; browser encoding/download are mocked.');
