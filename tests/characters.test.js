import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {createChihiro}=await import('../dist/chihiro.js'),{createNoFace}=await import('../dist/no-face.js');
const {CHIHIRO_SEAT,NO_FACE_SEAT,SEATS,isSeatOccupied}=await import('../dist/interior-layout.js'),{FLOOR_TOP}=await import('../dist/train-shell.js'),{canStand}=await import('../dist/physics.js');
const car=new THREE.Group(),child=createChihiro(car),noFace=createNoFace(car);car.updateMatrixWorld();
assert.equal(child.group.parent,car);assert.equal(child.companions.parent,car);assert.equal(child.group.rotation.y,Math.PI/2);
assert.equal(child.group.userData.seat,CHIHIRO_SEAT.id);assert.equal(noFace.group.userData.seat,NO_FACE_SEAT.id);
assert.equal(SEATS.filter(isSeatOccupied).length,2);assert.equal(SEATS.filter(s=>!isSeatOccupied(s)).length,62);
assert(CHIHIRO_SEAT.z>NO_FACE_SEAT.z,'Chihiro sits to the left when facing the pair from the aisle.');
for(const person of [child.group,noFace.group]){
 const box=new THREE.Box3().setFromObject(person);assert(Math.abs(box.min.y-FLOOR_TOP)<1e-6,'Feet and seated cloak reach the actual floor.');
 assert(box.min.x> -1.304&&box.max.x<-.35,'Seated bodies stay inside the carriage and leave the centre aisle clear.');
}
assert(new THREE.Box3().setFromObject(child.group).max.y<new THREE.Box3().setFromObject(noFace.group).max.y-.35,'The child is visibly shorter than No-Face.');
const cloak=noFace.group.getObjectByName('no-face-cloak');assert(cloak.material.transparent&&cloak.material.opacity>.8&&cloak.material.opacity<.94);assert.equal(cloak.material.depthWrite,false);assert.equal(noFace.group.getObjectByName('no-face-mask').material.transparent,false);
for(const z of [NO_FACE_SEAT.z,CHIHIRO_SEAT.z]){assert(canStand(0,z,1,[1,1],[1,1]));assert(!canStand(-.45,z,1,[1,1],[1,1]),'Walkers cannot intersect a seated character.');}
for(const creature of [child.mouse,child.bird]){
 const b=new THREE.Box3().setFromObject(creature);assert(Math.abs(b.min.y-2.1785)<.004,'Creature feet touch the window trim.');
 assert(b.min.z>1.765&&b.max.z<3.075,'Both companions fit within the real second-car window opening.');
 assert(b.min.x> -1.405&&b.max.x< -1.17,'Companions stay on the sill without piercing its glass.');
}
let triangles=0;car.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)));for(const v of o.geometry.attributes.normal.array)assert(Number.isFinite(v));triangles+=(o.geometry.index?.count??p.count)/3;});assert(triangles<120000);
function transforms(){const a=[];car.updateMatrixWorld();car.traverse(o=>a.push(...o.matrixWorld.elements));return a;}
child.update(1/60,12,6);noFace.update(1/60,12,6,null);const moving=transforms();child.update(0,12,6);noFace.update(0,12,6,null);assert.deepEqual(transforms(),moving,'Photo freeze preserves character idles.');
const headBefore=child.head.quaternion.clone();child.update(1/60,18,6);assert(child.head.quaternion.angleTo(headBefore)>.001);
for(const t of [0,1,6,17,120]){child.update(1/60,t,6);noFace.update(1/60,t,6,null);car.updateMatrixWorld();assert(Math.abs(new THREE.Box3().setFromObject(child.group).min.y-FLOOR_TOP)<1e-6);assert(Math.abs(new THREE.Box3().setFromObject(noFace.group).min.y-FLOOR_TOP)<1e-6,'No train sway lifts the cloak away from the floor.');}
const geometries=new Set(),materials=new Set();let gd=0,md=0;car.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);materials.add(o.material);});for(const g of geometries)g.addEventListener('dispose',()=>gd++);for(const m of materials)m.addEventListener('dispose',()=>md++);child.dispose();noFace.dispose();assert.equal(gd,geometries.size);assert.equal(md,materials.size);assert.equal(car.children.length,0);
console.log(`Characters: adjacent reserved seats, floor contact, child proportions, No-Face transparency, real window sill placement, aisle collisions, frozen idles and disposal passed (${triangles} triangles).`);
