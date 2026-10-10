import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {A,B,LOOP_SECONDS,TRACK_LENGTH,CAR_SPACING,routePose,canStand,movePlayer} from '../dist/physics.js';

assert.equal(LOOP_SECONDS,480);
assert.equal(A,600);assert.equal(B,380);
assert(Math.abs(TRACK_LENGTH/LOOP_SECONDS-6.49515)<.001);
const start=routePose(0),end=routePose(TRACK_LENGTH);
assert.deepEqual(start,end);
const before=routePose(TRACK_LENGTH-.01),after=routePose(.01);
assert(Math.hypot(before.x-after.x,before.z-after.z)<.02001);
let min=Infinity,max=0;
for(let d=0;d<TRACK_LENGTH;d+=.5){const a=routePose(d),b=routePose(d+.05),speed=Math.hypot(a.x-b.x,a.z-b.z);min=Math.min(min,speed);max=Math.max(max,speed);}
assert(max/min<1.0001);
for(const car of [0,1]){
  const z=car===0?-8.68:8.68;
  assert(!canStand(0,z,car,[0,0]));
  assert(!canStand(0,z,car,[.8,.8]));
  assert(canStand(0,z,car,[1,1]));
  assert(!canStand(.4,z,car,[1,1]));
  assert(!canStand(1,0,car));
  assert(!canStand(.7,0,car));
}
const blocked={car:0,x:0,z:-7.9};movePlayer(blocked,0,-3,undefined,[0,0]);
assert.equal(blocked.car,0);assert(blocked.z>-8.42);
const open={car:0,x:0,z:-7.9};movePlayer(open,0,-4,undefined,[1,1]);
assert.equal(open.car,1);assert(open.z<8);
// A world-space transfer preserves the passenger's exact position through curves.
for(let d=0;d<TRACK_LENGTH;d+=9){
  const cars=[0,1].map(i=>{const p=routePose(d-i*CAR_SPACING),g=new THREE.Group();g.position.set(p.x,0,p.z);g.rotation.y=p.yaw;g.updateMatrixWorld();return g;});
  const passenger={car:0,x:0,z:-CAR_SPACING/2+.001};let error;
  movePlayer(passenger,0,-.015,(crossed,p)=>{const world=cars[0].localToWorld(new THREE.Vector3(crossed.x,0,crossed.z)),local=cars[1].worldToLocal(world.clone());p.x=local.x;p.z=local.z;error=cars[1].localToWorld(new THREE.Vector3(p.x,0,p.z)).distanceTo(world);},[1,1]);
  assert.equal(passenger.car,1);assert(error<1e-9);
}
console.log(JSON.stringify({lapSeconds:LOOP_SECONDS,trackMetres:TRACK_LENGTH,speedMetresPerSecond:TRACK_LENGTH/LOOP_SECONDS,checks:'loop continuity, constant speed, door/seat/pole/wall collision, open-door crossing, world-space transfer'}));
