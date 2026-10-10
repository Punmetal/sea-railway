import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {routePose,TRACK_LENGTH} from '../dist/physics.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
globalThis.document={createElement(){return {getContext(){return {fillRect(){},fillText(){}};}};}};
const {createScenery,STATION_DISTANCE,PLATFORM}=await import('../dist/scenery.js');
const {createBirds}=await import('../dist/birds.js');
const {createSeaWater}=await import('../dist/sea-water.js');
const scene=new THREE.Scene(),scenery=createScenery(scene);
assert.equal(scenery.stationCount,1);assert.equal(PLATFORM.nearX,2.2);
scenery.root.updateMatrixWorld(true);
let minimumGap=Infinity;
// The complete train envelope, not just its centre, must clear the platform through the bend.
for(let d=STATION_DISTANCE-35;d<STATION_DISTANCE+35;d+=.1){
  const p=routePose(d),car=new THREE.Object3D();car.position.set(p.x,0,p.z);car.rotation.y=p.yaw;car.updateMatrixWorld();
  for(const x of [-1.565,1.565])for(const z of [-9.4,9.4]){const corner=scenery.root.worldToLocal(car.localToWorld(new THREE.Vector3(x,.6,z)));if(Math.abs(corner.z)<PLATFORM.halfLength+.1){const gap=PLATFORM.nearX-corner.x;minimumGap=Math.min(minimumGap,gap);assert(gap>.25);}}
}
assert(minimumGap<.8);
// The long island lies outward from the railway, with its lawn low and above calm waves.
let shoreGap=Infinity;const point=new THREE.Vector3();
for(let i=0;i<64;i++){const a=i/64*Math.PI*2;scenery.root.localToWorld(point.set(33+Math.cos(a)*9.5,.1,4+Math.sin(a)*32.6));for(let d=0;d<TRACK_LENGTH;d+=3){const p=routePose(d);shoreGap=Math.min(shoreGap,Math.hypot(point.x-p.x,point.z-p.z));}}
assert(shoreGap>18);assert(scenery.island.radiusZ/scenery.island.radiusX>3);assert(scenery.island.maxHeight<.6);
const lawn=scene.getObjectByName('low-grassy-island');for(let i=0;i<lawn.geometry.attributes.position.count;i++){assert(lawn.geometry.attributes.position.getY(i)>=.08);assert(lawn.geometry.attributes.position.getY(i)<.49);}
assert(lawn.geometry.attributes.normal.getY(100)>0);
const front=new THREE.Vector3(0,0,1).applyQuaternion(scenery.house.quaternion);assert(front.x<-.999);
scenery.updatePalette({lamps:.08,night:0});assert.equal(scenery.materials.houseWindows.emissiveIntensity,0);
scenery.updatePalette({lamps:1,night:1});assert.equal(scenery.materials.houseWindows.emissiveIntensity,.65);assert.equal(scenery.materials.shelterLamp.emissiveIntensity,2.1);
scene.traverse(o=>{if(o.isMesh)for(const a of Object.values(o.geometry.attributes))assert([...a.array].every(Number.isFinite));});
const water=createSeaWater(scene,{palette:{sea:new THREE.Color(),horizon:new THREE.Color(),sun:new THREE.Color(),sunY:.5}});assert(water.material.lights&&water.receiveShadow);assert(water.material.uniforms.directionalShadowMap);assert(water.material.vertexShader.includes('shadowmap_vertex'));assert(water.material.fragmentShader.includes('getShadowMask'));
for(const coarse of [false,true]){
  const field=createBirds(scene,{coarse}),matrix=new THREE.Matrix4(),nextMatrix=new THREE.Matrix4(),pos=new THREE.Vector3();
  assert.equal(field.count,coarse?64:120);assert.equal(field.flockCount,coarse?16:24);
  let movingWing=false;
  for(let time=0;time<960;time+=3.7){field.update(time);field.left.getMatrixAt(0,matrix);field.update(time+.01);field.left.getMatrixAt(0,nextMatrix);movingWing ||= matrix.elements.some((v,i)=>Math.abs(v-nextMatrix.elements[i])>.0001);
    for(const mesh of [field.bodies,field.left,field.right])assert([...mesh.instanceMatrix.array].every(Number.isFinite));
    for(let i=0;i<field.count;i++){field.bodies.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);assert(pos.y>8,'Birds must stay in the sky, including wing clearance.');}
    // No position jumps at lap boundaries or glide/flap transitions.
    field.bodies.getMatrixAt(0,matrix);field.update(time+.02);field.bodies.getMatrixAt(0,nextMatrix);assert(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(new THREE.Vector3().setFromMatrixPosition(nextMatrix))<.10);
  }
  assert(movingWing);field.dispose();
}
console.log(JSON.stringify({checks:'station clearance, island clearance/height, gable orientation, lighting, finite geometry, water shadow hooks, bird altitude/animation/continuity/mobile budget',minimumGap,shoreGap}));
