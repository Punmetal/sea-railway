// Actual PNG encoding/decoding through the game's capture path. Native Canvas
// replaces browser Canvas; DOM download and WebGL remain separate QA items.
import assert from 'node:assert/strict';
import {createRequire,registerHooks} from 'node:module';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const {createCanvas,loadImage}=require('@napi-rs/canvas'),{PNG}=require('pngjs');
const {RailwayPhoto}=await import('../dist/photo-mode.js');
const {PHOTO_RATIOS,exportSize}=await import('../dist/photo-layout.js');
const source=createCanvas(960,720),ctx=source.getContext('2d');
ctx.fillStyle='#b8e2e9';ctx.fillRect(0,0,960,720);
const imagePath=process.argv[2];
if(imagePath)ctx.drawImage(await loadImage(imagePath),0,0,960,720);
else{ctx.fillStyle='#b8e2e9';ctx.fillRect(0,0,960,720);ctx.fillStyle='#a8544c';ctx.fillRect(120,180,660,340);}
let encoded,connected=false,downloads=0,removals=0,cleanup=0;
const realDocument=globalThis.document,realURL=globalThis.URL,realTimer=globalThis.setTimeout;
globalThis.document={body:{appendChild(){connected=true;}},createElement(type){
 if(type==='canvas'){const c=createCanvas(1,1);c.toBlob=callback=>{encoded=c.toBuffer('image/png');callback(new Blob([encoded],{type:'image/png'}));};return c;}
 return {click(){assert(connected,'Download link is connected before clicking');downloads++;},remove(){connected=false;removals++;}};
}};
globalThis.URL={createObjectURL:()=> 'blob:native-png',revokeObjectURL(){cleanup++;}};
globalThis.setTimeout=fn=>{fn();};
try{
 const camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),orbit={target:new THREE.Vector3(),enabled:true,enablePan:false,minDistance:12,maxDistance:110,minPolarAngle:.18,maxPolarAngle:1.5};
 const photo=new RailwayPhoto({camera,root,orbit,renderer:{domElement:source,render(){}},scene:new THREE.Scene(),caption:()=> 'Sea Railway · Far Tide · GMT+7'});
 photo.setEnabled(true);
 for(const ratio of Object.keys(PHOTO_RATIOS))for(const frame of ['none','postcard']){
  photo.setRatio(ratio);photo.setFrame(frame);photo.setOffset('x',.6);
  const expected=exportSize(photo.rect()),result=await photo.capture(),decoded=PNG.sync.read(encoded);
  assert.deepEqual([decoded.width,decoded.height],[expected.width,expected.height]);
  assert.deepEqual([result.width,result.height],[expected.width,expected.height]);
  assert.equal(result.ratio,ratio);assert(decoded.data.some(v=>v!==0));
  assert(decoded.data.every((v,i)=>i%4!==3||v===255),'Export stays opaque');
  if(frame==='postcard')assert(decoded.data[0]>220&&decoded.data[1]>210,'Postcard border is included');
  if(ratio==='9:16'&&frame==='none'&&process.argv[3])writeFileSync(process.argv[3],encoded);
 }
 assert.equal(downloads,16);assert.equal(removals,16);assert.equal(cleanup,16);
 photo.setEnabled(false);
 console.log(JSON.stringify({checks:'Actual PNG encode/decode, 8 ratios × 2 frames, pixel content, opaque alpha, attached download link and cleanup',captures:downloads,note:'Native Canvas test; browser download and full WebGL framebuffer are not tested.'}));
}finally{globalThis.document=realDocument;globalThis.URL=realURL;globalThis.setTimeout=realTimer;}
