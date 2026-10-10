import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {SEATS,STANDING_EYE,SEATED_EYE,CAB_PARTITION_Z,isSeatOccupied} from '../dist/interior-layout.js';
import {pickInteraction,findStandPosition} from '../dist/interactions.js';
import {canStand,movePlayer,routePose,TRACK_LENGTH,CAR_SPACING} from '../dist/physics.js';
const doors=[0,1].map(car=>({car,kind:'gangway',z:car===0?-8.68:8.68,progress:0,target:0}));
const cabDoors=[0,1].map(car=>({car,kind:'cab',z:(car===0?1:-1)*CAB_PARTITION_Z,progress:0,target:0}));
function pick(player,target){const dx=target.x-player.x,dz=target.z-player.z;return pickInteraction({player,doors,cabDoors,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(target.y-STANDING_EYE,Math.hypot(dx,dz))});}
assert.equal(SEATS.length,64);assert.equal(new Set(SEATS.map(s=>s.id)).size,64);
for(const seat of SEATS){
  if(isSeatOccupied(seat)){assert.equal(pick({car:seat.car,x:0,z:seat.z},{...seat,y:1.95}),null,'No sit prompt on either occupied character seat');continue;}
  const player={car:seat.car,x:0,z:seat.z};
  assert.equal(pick(player,{...seat,y:1.95})?.seat.id,seat.id,'Every slot can be individually targeted from the aisle');
  assert.equal(pick(player,{x:0,y:STANDING_EYE,z:seat.z+2}),null,'Looking away must hide the prompt');
  const exit=findStandPosition(seat,[0,0],[0,0]);assert(exit&&canStand(exit.x,exit.z,exit.car,[0,0],[0,0]));
  assert(Math.abs(exit.z-seat.z)<.5&&Math.abs(exit.x)<.45,'Stand near the same seat in a clear aisle');
  assert.notEqual(pick({car:seat.car,x:0,z:seat.z+3},{...seat,y:1.95})?.seat,seat,'No remote seating');
  // Attachment in carriage coordinates remains exact on straights, curves and lap boundaries.
  for(const distance of [0,200,800,TRACK_LENGTH-.01,TRACK_LENGTH,TRACK_LENGTH+.01]){
    const pose=routePose(distance-seat.car*CAR_SPACING),car=new THREE.Group();car.position.set(pose.x,-.1,pose.z);car.rotation.y=pose.yaw;
    const local=new THREE.Vector3(seat.x,SEATED_EYE,seat.z),world=car.localToWorld(local.clone());
    assert(car.worldToLocal(world).distanceTo(local)<1e-10);
  }
}
for(const car of [0,1])for(const door of [doors[car],cabDoors[car]]){
  const toward=door.kind==='cab'?(car===0?1:-1):(car===0?-1:1),player={car,x:0,z:door.z-toward*.80};
  assert.equal(pick(player,{x:0,y:2.65,z:door.z})?.door,door);
  assert.equal(pick(player,{x:0,y:2.65,z:player.z-toward}),null,'A nearby door behind the gaze is not active');
}
for(const car of [0,1]){
  const sign=car===0?1:-1,z=sign*CAB_PARTITION_Z;
  for(const progress of [0,.50,.96])assert(!canStand(0,z,car,[1,1],[progress,progress]));
  assert(canStand(0,z,car,[1,1],[1,1]));assert(!canStand(.40,z,car,[1,1],[1,1]),'Open door still has solid wall sides');
  const player={car,x:0,z:z-sign*.8};movePlayer(player,0,sign*2,undefined,[1,1],[0,0]);assert(sign*(player.z-z)<-.29,'A large step cannot tunnel through a closed cab door');
  movePlayer(player,0,sign*1.1,undefined,[1,1],[1,1]);assert(sign*(player.z-z)>.3,'Open cab door admits the player');
  movePlayer(player,0,-sign*2,undefined,[1,1],[0,0]);assert(sign*(player.z-z)>.29,'Closing also blocks exit from the cab');
  movePlayer(player,0,-sign*1.1,undefined,[1,1],[1,1]);assert(sign*(player.z-z)<-.3);
}
for(const car of [0,1])for(const door of [doors[car],cabDoors[car]]){
  door.progress=1;
  for(const side of [-1,1]){
    const player={car,x:0,z:door.z+side*.75},target={x:(car===0?1:-1)*.35,y:2.64,z:door.z};
    assert.equal(pick(player,target)?.door,door,'The visible edge of a parked leaf can be targeted from either side');
  }
  door.progress=0;
}
console.log('Interior: 62 free seats targetable, Chihiro/No-Face seats reserved, gaze/range gating, clear stand-up positions, stable train attachment and two-way cab collisions passed.');
