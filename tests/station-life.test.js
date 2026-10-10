import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
globalThis.document={createElement(){return {getContext(){return {fillRect(){},fillText(){}};}};}};
const {createScenery}=await import('../dist/scenery.js');
const {canWalkShore,moveShore,StationJourney,BOARDING_Z}=await import('../dist/station-journey.js');
const {pickShoreInteraction,findShoreStandPosition,underStationRoof,SHORE_STANDING_EYE}=await import('../dist/station-activities.js');
const {BoardingConnection}=await import('../dist/boarding-connection.js');
const {SnowCover}=await import('../dist/snow-cover.js');
const {createShelterUniforms}=await import('../dist/weather-shelters.js');
const {TrainMotion}=await import('../dist/train-motion.js');
const {routePose,TRACK_LENGTH,canStand,movePlayer}=await import('../dist/physics.js');
const {FLOOR_TOP}=await import('../dist/train-shell.js');
const scene=new THREE.Scene(),first=createScenery(scene),wide=createScenery(scene,{distance:70+TRACK_LENGTH/2,widthScale:2,withIsland:false,withAnnex:true}),stations=[first,wide];
for(const station of stations){
  const off=station.platform.farX-7.6,p={x:4.5+off,z:2.3,y:.74};
  for(let i=0;i<90;i++)moveShore(station,p,.025,0);
  assert(p.x>5.5+off&&p.x<6.27+off,'The open shelter is accessible and its bench blocks walking.');assert(underStationRoof(station,p.x,p.z));
  assert(!canWalkShore(station,6+off,.94),'Side walls block walking.');assert(!canWalkShore(station,7.1+off,2.3),'Rear walls block walking.');
  for(const seat of station.seats){
    const standing=findShoreStandPosition(station,seat);assert(standing&&canWalkShore(station,standing.x,standing.z),'Every bench seat has a safe standing spot.');
    const dx=seat.x-standing.x,dz=seat.z-standing.z,eye=standing.y+SHORE_STANDING_EYE;
    const target=pickShoreInteraction({station,position:standing,eye,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(seat.top-eye,Math.hypot(dx,dz))});assert.equal(target?.seat.id,seat.id,'A visitor can select each actual seat by looking at it.');
    assert.equal(pickShoreInteraction({station,position:standing,eye,yaw:Math.atan2(dx,dz),pitch:0}),null,'Looking away hides the seat action.');
  }
  const seat=station.seats[1],behind={x:7.45+off,z:2.3,y:.74};assert.equal(pickShoreInteraction({station,position:behind,yaw:Math.PI/2,pitch:-.9}),null,'The shelter wall occludes seating.');
}
const roofUniforms=createShelterUniforms(stations);stations.forEach((s,i)=>{const r=roofUniforms.uStationShelters.value[i],p=s.root.worldToLocal(new THREE.Vector3(r.x,r.y,r.z));assert(Math.abs(p.x-(s.shelter.minX+s.shelter.maxX)/2)<1e-9);assert(Math.abs(p.y-s.shelter.roofY)<1e-9);});
for(const station of stations){
 const car=new THREE.Group(),motion=new TrainMotion(),journey=new StationJourney(stations);motion.distance=journey.target(station);motion.speed=0;motion.requested='stop';motion.phase='stopped';const pose=routePose(motion.distance);car.position.set(pose.x,-.10,pose.z);car.rotation.y=pose.yaw;
 const bridge=new BoardingConnection(scene,car,new THREE.MeshStandardMaterial());bridge.update(station,.96);assert(!bridge.active);bridge.update(station,1);
 assert(bridge.active);assert(bridge.length>.7&&bridge.length<1.5);assert(canStand(1.58,BOARDING_Z,0,[0,0],[0,0],true));assert(!canStand(1.58,BOARDING_Z,0,[0,0],[0,0],false));assert(!canStand(1.58,BOARDING_Z+1,0,[0,0],[0,0],true));
 let player={car:0,x:.65,z:BOARDING_Z};for(let i=0;i<28;i++)movePlayer(player,.035,0,null,[0,0],[0,0],bridge.active);assert(player.x>1.53);
 const foot=station.root.worldToLocal(car.localToWorld(new THREE.Vector3(player.x,FLOOR_TOP,player.z))),shore={x:foot.x,z:foot.z,y:bridge.groundAtStation(foot.x,foot.z)};assert(shore.y!==null);assert(bridge.occupied(station.root.localToWorld(new THREE.Vector3(shore.x,shore.y,shore.z))));
 const extra=(x,z)=>bridge.groundAtStation(x,z);for(let i=0;i<60;i++)moveShore(station,shore,.03,0,extra);assert(shore.x>station.platform.nearX+.5);assert.equal(shore.y,.74);
 const atSea={x:1.8,z:3,y:.74};moveShore(station,atSea,-.5,0,extra);assert.equal(atSea.x,1.8,'The bridge cannot be used outside the narrow doorway corridor.');
 for(let i=0;i<80;i++)moveShore(station,shore,-.03,0,extra);const returned=car.worldToLocal(station.root.localToWorld(new THREE.Vector3(shore.x,shore.y,shore.z)));assert(returned.x<1.13);assert(Math.abs(returned.z-BOARDING_Z)<.30);assert(Math.abs(shore.y-(FLOOR_TOP-.10))<1e-6);
 journey.station=station;journey.phase='waiting';journey.timer=.01;for(let i=0;i<600;i++){journey.update(.05,motion,{boardingOccupied:true});motion.update(.05);}assert.equal(journey.phase,'waiting');assert.equal(motion.speed,0);assert(journey.timer>=3);
 journey.phase='closing';journey.update(.05,motion,{boardingOccupied:true});assert.equal(journey.phase,'waiting');for(let i=0;i<200;i++){journey.update(.05,motion);motion.update(.05);}assert.equal(journey.phase,'travelling');assert(motion.speed>0);bridge.dispose();
}
const cover=new SnowCover(stations),snow={snow:1,rain:0};cover.update(30,snow);assert(cover.amount>.55&&cover.amount<.70,'Snow builds gradually over half a minute.');const covered=cover.amount;cover.update(0,{snow:0,rain:1});assert.equal(cover.amount,covered,'A frozen scene also freezes accumulation.');cover.update(15,{snow:0,rain:0});const clearMelt=covered-cover.amount;cover.amount=covered;cover.update(15,{snow:0,rain:1});assert(covered-cover.amount>clearMelt*2,'Rain melts accumulated snow more quickly.');cover.dispose();
console.log('Station life: shelter access/wall collision, 12 usable bench seats and safe standing, gaze/occlusion, both station boarding paths, off-door sea guards, delayed departure, shelter transforms and gradual snow/melt passed.');
