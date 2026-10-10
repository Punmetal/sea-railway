import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {TRACK_LENGTH,A,B} from '../dist/physics.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {trackWidths,trackProfile,trackDepth,nearestTrack,shoreDistance,shoreDepth,sampleDepth,createShallows}=await import('../dist/shallows.js');
const {createTrackBed}=await import('../dist/track-bed.js');
const {createRain}=await import('../dist/rain.js');
const {createSeaWater}=await import('../dist/sea-water.js');
const widths=[];
for(let d=0;d<TRACK_LENGTH;d+=2){
  const p=trackProfile(d),next=trackProfile(d+2);widths.push(p.left+p.right);
  assert(p.left>1.45&&p.right>1.5,'All rail ties retain a continuous support shoulder.');
  assert(Math.abs(p.left-next.left)<.18&&Math.abs(p.right-next.right)<.18,'Shoulders change gradually.');
  for(const x of [-15,-4,-2,0,2,4,15]){
    const world={x:p.x+Math.cos(p.yaw)*x,z:p.z-Math.sin(p.yaw)*x},nearest=nearestTrack(world.x,world.z);
    assert(Math.abs(nearest.lateral-x)<.002,'Water depth must follow the actual curved track.');
    assert(Math.abs(sampleDepth(world.x,world.z)-trackDepth(x,p.angle))<.003);
  }
  assert(trackDepth(0,p.angle)<trackDepth(p.right,p.angle));
  assert(trackDepth(p.right,p.angle)<trackDepth(p.right+5,p.angle));
}
assert(Math.max(...widths)-Math.min(...widths)>.7);
assert.deepEqual(trackProfile(0),trackProfile(TRACK_LENGTH));
for(const t of [-Math.PI,-.7,0,1.8,Math.PI]){const a=trackWidths(t),b=trackWidths(t+Math.PI*2);assert(Math.abs(a.left-b.left)<1e-12&&Math.abs(a.right-b.right)<1e-12);}
const shore={x:100,z:200,yaw:.73,radiusX:9,radiusZ:32};
for(const local of [[9,0],[0,32],[-9,0],[0,-32]]){const [x,z]=local,c=Math.cos(shore.yaw),s=Math.sin(shore.yaw);assert(Math.abs(shoreDistance(shore.x+x*c+z*s,shore.z-x*s+z*c,shore))<1e-10);}
assert(shoreDepth(.5)<shoreDepth(3));assert(shoreDepth(3)<shoreDepth(8));
const scene=new THREE.Scene(),shallows=createShallows(scene,{coarse:true,shores:[shore]}),bed=createTrackBed(scene,{coarse:true});
for(const mesh of [shallows.mesh,bed.bed]){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));assert(p.getY(i)<-.05);assert(n.getY(i)>.25);}
}
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),scales=[],phaseBins=new Set();
for(let i=0;i<bed.rocks.count;i++){
  bed.rocks.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);const p=nearestTrack(position.x,position.z);scales.push(scale.x);
  assert(Math.abs(Math.abs(p.lateral)-.72)>.16,'Pebbles leave the rails clear.');
  if(Math.abs(p.lateral)>1.20){const t=Math.atan2(position.z/B,position.x/A);phaseBins.add(Math.floor(((t+Math.PI)*20)%1*8));}
}
assert(Math.max(...scales)/Math.min(...scales)>4);assert.equal(phaseBins.size,8,'Shoulder pebbles do not align in rows.');
let inner=0,edge=0;const grassHeights=[];
for(let i=0;i<bed.grass.count;i++){
  bed.grass.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);const p=nearestTrack(position.x,position.z);grassHeights.push(scale.y);
  if(Math.abs(p.lateral)<1.4){inner++;assert(scale.y<.19);assert(position.y+scale.y<0,'Inner grass stays below the rail/wheel envelope.');}else{edge++;assert(scale.y>.30);}
}
assert(inner>20&&edge>200);assert(Math.max(...grassHeights)-Math.min(...grassHeights)>.35);
const glass=new THREE.MeshPhysicalMaterial(),rain=createRain(scene,[new THREE.Group(),new THREE.Group()],{coarse:true,glassMaterial:glass}),camera=new THREE.PerspectiveCamera();
assert.equal(rain.mesh.geometry.instanceCount,625);assert.equal(rain.mesh.geometry.index.count,6,'Rain width is rendered with quads on every GPU.');
rain.setEnabled(true);rain.update(20,7,camera,{horizon:new THREE.Color('#b8e2e9'),night:0,sunY:.6});assert.equal(rain.uniforms.uDusk.value,0);
rain.update(1/60,8,camera,{horizon:new THREE.Color('#edb3a4'),night:0,sunY:.07});assert.equal(rain.uniforms.uDusk.value,1);
rain.update(1/60,9,camera,{horizon:new THREE.Color('#3c527e'),night:1,sunY:.24});assert.equal(rain.uniforms.uNight.value,1);assert.equal(rain.glass.uGlassNight.value,1);
const water=createSeaWater(scene,{coarse:true,shallows,palette:{sea:new THREE.Color(),horizon:new THREE.Color(),sun:new THREE.Color(),sunY:.6}});
assert.equal(water.material.uniforms.uShoreCount.value,1);assert.equal(water.material.uniforms.uShores.value[0].x,shore.x);
shallows.dispose();bed.dispose();rain.dispose();water.dispose();water.geometry.dispose();water.material.dispose();
console.log(JSON.stringify({checks:'smooth periodic shoulders, track-aligned increasing depth, rotated shoreline, submerged upward geometry, clear rails, varied stones, scattered low grass, day/dusk/night rain, shared shoreline uniforms',pathWidthRange:[Math.min(...widths),Math.max(...widths)],grass:{inner,edge}}));
