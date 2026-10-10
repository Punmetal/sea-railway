import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(specifier,context,nextResolve){return specifier==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:nextResolve(specifier,context);}});
// Canvas drawing is irrelevant to geometry checks; retain real Three.js meshes/rays.
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const {createTrainModel}=await import('../dist/train-model.js');
const {canStand}=await import('../dist/physics.js');
const scene=new THREE.Scene(),train=createTrainModel({scene,coarse:false,guardReflection(){}});
train.cars[1].position.z=-18.75;scene.updateMatrixWorld(true);
const opaque=[],all=[];train.cars[0].traverse(o=>{if(o.isMesh&&!o.isReflector){all.push(o);if(!o.material.transparent)opaque.push(o);}});
const ray=new THREE.Raycaster();
function hits(objects,origin,direction,far=12){ray.set(new THREE.Vector3(...origin),new THREE.Vector3(...direction).normalize());ray.far=far;return ray.intersectObjects(objects,false);}
// Window apertures must not have an opaque panel hiding behind their glass.
for(const z of [-6.83,-5.36,-3.89,-2.42,-.95,.52,1.99,3.46,4.93])for(const side of [-1,1]){
  assert.equal(hits(opaque,[side*.98,2.72,z],[side,0,0],1).length,0,`Opaque blockage at window ${side}/${z}`);
  assert(hits(all,[side*.98,2.72,z],[side,0,0],1).some(h=>h.object.material===train.materials.glass));
}
for(const x of [-.6,.6]){
  assert.equal(hits(opaque,[x,2.75,7.65],[0,0,1],2).length,0,'The curved windshield must be a real opening');
  assert(hits(all,[x,2.75,7.65],[0,0,1],2).some(h=>h.object.material===train.materials.glass));
}
for(const side of [-1,1])assert.equal(hits(opaque,[0,2.75,8.15],[side,0,0],2).length,0,'Cab side pane must be clear');
const ceiling=hits(opaque,[0,2.69,1],[0,1,0],2)[0];assert(ceiling&&ceiling.point.y>3.7&&ceiling.point.y<3.9,'Continuous vaulted ceiling');
const roof=hits(opaque,[.4,5,4],[0,-1,0],2)[0];assert(roof&&roof.object.material===train.materials.roof,'Outer roof faces upward');
const floor=hits(opaque,[.20,2.69,1],[0,-1,0],3)[0];assert(floor&&Math.abs(floor.point.y-1.095)<.004,'Walkable wood floor remains level');
assert(hits(opaque,[0,1.62,-8],[0,0,-1],1).length,'Closed door has a solid lower panel');
train.doors[0].leaf.position.x=.78;scene.updateMatrixWorld(true);
assert.equal(hits(opaque,[0,1.62,-8],[0,0,-1],1).length,0,'The fully opened door clears the gangway');
assert(!canStand(0,8.10,0));assert(!canStand(0,-8.10,1));
assert(canStand(1,6.10,0));assert(canStand(1,-6.10,1));
const bounds=new THREE.Box3().setFromObject(train.cars[0]),size=bounds.getSize(new THREE.Vector3());
assert(size.x<3.2&&size.x>2.8&&size.z<18.6&&size.z>18&&bounds.max.y<4.5,JSON.stringify({size,bounds}));
let triangles=0;
for(const mesh of all){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;for(let i=0;i<p.count;i++){assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));assert(Number.isFinite(n.getX(i))&&Number.isFinite(n.getY(i))&&Number.isFinite(n.getZ(i)));}triangles+=(mesh.geometry.index?mesh.geometry.index.count:p.count)/3;}
// Both mirrored cab partitions block their sides while their doors clear the opening.
for(const car of [0,1]){
  const objects=[];train.cars[car].traverse(o=>{if(o.isMesh&&!o.isReflector&&!o.material.transparent)objects.push(o);});
  const sign=car===0?1:-1,base=car===0?0:-18.75,z=base+sign*7.10;
  assert(hits(objects,[0,1.62,z-sign*.6],[0,0,sign],1).length,'Closed cab door has a solid panel');
  assert(hits(objects,[.85,2.69,z-sign*.6],[0,0,sign],1).length,'Wooden partition sides are solid');
  train.cabDoors[car].leaf.position.x=.78;scene.updateMatrixWorld(true);
  assert.equal(hits(objects,[0,1.62,z-sign*.6],[0,0,sign],1).length,0,'An opened cab door leaves a real aperture');
}
assert(all.length<43,'Static and animated details plus one dedicated snow-covered roof panel stay batched');assert(triangles<85000,'Carriage geometry budget');
const panel=train.cars[0].getObjectByName('train-roofPanel');assert(panel,'The raised roof panel is an actual exterior mesh.');panel.geometry.computeBoundingBox();assert(panel.geometry.boundingBox.min.y>4.08);assert.notEqual(panel.material,train.materials.red);assert.equal(panel.material.map,train.materials.red.map,'The panel retains the original paint before snowfall.');
const {SnowCover}=await import('../dist/snow-cover.js');const cover=new SnowCover([],train.materials);cover.update(90,{snow:1,rain:0});
const compiled=m=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};m.onBeforeCompile(s);return s;};assert(compiled(panel.material).uniforms.uSnowCover.value>.9,'The raised panel receives the same accumulated snow as the main roof.');assert.equal(compiled(train.materials.red).uniforms.uSnowCover,undefined,'Snow does not coat the carriage walls or interior red surfaces.');cover.dispose();
console.log(JSON.stringify({checks:'clear side/cab windows, continuous ceiling, level floor, door clearance, cab collision, metre-scale bounds, finite batched geometry',meshesPerCar:all.length,trianglesPerCar:triangles}));
