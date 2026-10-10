import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {TrainMotion,CRUISE_SPEED} from '../dist/train-motion.js';
import {routePose,TRACK_LENGTH,CAR_SPACING} from '../dist/physics.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {CinematicCamera,SHOTS}=await import('../dist/cinematic-camera.js');
const drive=new TrainMotion();drive.update(480);assert(Math.abs(drive.distance)<1e-8);
assert.throws(()=>drive.setDirection('constructor'));assert.throws(()=>drive.update(-1));
drive.setDirection('reverse');let zeros=0,sawNegative=false,previous=drive.speed;
for(let i=0;i<600;i++){drive.update(1/60);assert(Math.abs(drive.speed-previous)<.055);if(drive.speed===0)zeros++;if(drive.speed<0){assert(zeros>=12,'Direction reversal must include an actual stop.');sawNegative=true;}previous=drive.speed;}
assert(sawNegative);assert.equal(drive.phase,'cruise');assert.equal(drive.speed,-CRUISE_SPEED);
drive.setDirection('stop');drive.update(6);const d=drive.distance;drive.update(120);assert.equal(drive.distance,d);assert.equal(drive.speed,0);
// Interrupt commands at several points while accelerating or braking.
for(const delay of [.15,1.7,3.9]){const m=new TrainMotion();m.setDirection('reverse');m.update(delay);const speed=m.speed;m.setDirection('forward');assert.equal(m.speed,speed);m.update(10);assert.equal(m.speed,CRUISE_SPEED);m.setDirection('reverse');m.update(5);m.setDirection('stop');m.update(7);assert.equal(m.speed,0);}
function sequence(dt){const m=new TrainMotion();for(const [command,duration] of [['stop',6],['reverse',7],['forward',12]]){m.setDirection(command);for(let t=0;t<duration-1e-8;t+=dt)m.update(Math.min(dt,duration-t));}return m;}
const low=sequence(.1),high=sequence(1/120);assert(Math.abs(low.distance-high.distance)<1e-7);assert.equal(low.speed,high.speed);
const root=new THREE.Group(),stationPose=routePose(70);root.position.set(stationPose.x,0,stationPose.z);root.rotation.y=stationPose.yaw;root.updateMatrixWorld();
const obstacles=[{minX:4.4,maxX:7.9,minZ:.1,maxZ:4.5,height:3.25},{minX:5.8,maxX:7.8,minZ:4.5,maxZ:6.5,height:9.6},{minX:25.7,maxX:36.3,minZ:-12.9,maxZ:-3.1,height:8.7},{minX:28.9,maxX:41.5,minZ:13.5,maxZ:25.1,height:13.2}];
const scenery={root,cameraObstacles:obstacles,lightTarget:root.localToWorld(new THREE.Vector3(24,2,0))},cine=new CinematicCamera(scenery),cars=[new THREE.Group(),new THREE.Group()],point=new THREE.Vector3();
const seen=new Set();let tightest=Infinity;
for(const sign of [1,-1]){cine.start(sign);let last=null;for(let i=0;i<84*60;i++){const time=i/60,distance=70+sign*CRUISE_SPEED*(time-42);cars.forEach((car,k)=>{const p=routePose(distance-k*CAR_SPACING);car.position.set(p.x,-.1,p.z);car.rotation.y=p.yaw;car.updateMatrixWorld();});const shot=cine.update(1/60,cars,sign*CRUISE_SPEED);seen.add(shot.shot);
    assert([...shot.position.toArray(),...shot.target.toArray(),shot.fov].every(Number.isFinite));if(last)assert(shot.position.distanceTo(last)<.9,'No camera jumps at shot/lap boundaries.');last=shot.position.clone();
    for(const car of cars){const local=car.worldToLocal(point.copy(shot.position));assert(Math.abs(local.x)>2||Math.abs(local.z)>10||local.y>5.5);}
    const p=root.worldToLocal(point.copy(shot.position));for(const box of obstacles)if(p.x>box.minX&&p.x<box.maxX&&p.z>box.minZ&&p.z<box.maxZ){tightest=Math.min(tightest,p.y-box.height);assert(p.y>=box.height+1.49);}
  }}
assert.equal(seen.size,SHOTS.length);
// Cross the station during every shot, so the height guard is actually exercised.
let obstacleChecks=0;
for(let phase=0;phase<84;phase+=.7)for(let d=0;d<210;d+=1.5){cars.forEach((car,k)=>{const p=routePose(d-k*CAR_SPACING);car.position.set(p.x,-.1,p.z);car.rotation.y=p.yaw;car.updateMatrixWorld();});cine.time=phase;const shot=cine.update(0,cars,CRUISE_SPEED),p=root.worldToLocal(point.copy(shot.position));for(const b of obstacles)if(p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ){obstacleChecks++;tightest=Math.min(tightest,p.y-b.height);assert(p.y>=b.height+1.49);}}
assert(obstacleChecks>0);
// A reversal changes framing gradually rather than spinning around in one frame.
cine.start(1);let last=cine.update(0,cars,CRUISE_SPEED).position.clone();for(let i=0;i<1500;i++){const shot=cine.update(1/60,cars,-CRUISE_SPEED);assert(shot.position.distanceTo(last)<.9);last.copy(shot.position);}
// Stationary trains remain framed while the camera continues to orbit.
const stationary=cine.update(5,cars,0);assert(stationary.position.y>=8.5);
console.log(JSON.stringify({checks:'smooth braking/acceleration, zero-speed reversal, interrupted commands, frame-rate independence, six continuous camera shots both directions, train/scenery clearance, smooth reversal framing, stopped-train framing',cameraObstacleClearance:tightest,obstacleChecks}));
