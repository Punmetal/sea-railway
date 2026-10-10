import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {thaiTime,timeBlend,RailwayTime} from '../dist/time-cycle.js';
import {routePose,TRACK_LENGTH,CAR_SPACING} from '../dist/physics.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
globalThis.document={createElement(){return {getContext(){return {fillRect(){},fillText(){}};}};}};
const {createScenery,STATION_DISTANCE,PLATFORM}=await import('../dist/scenery.js');
const {createTrackBed}=await import('../dist/track-bed.js');
const {createRain}=await import('../dist/rain.js');
const {CinematicCamera}=await import('../dist/cinematic-camera.js');
assert.equal(thaiTime(new Date('2026-10-01T17:01:02Z')).label,'00:01:02');assert.equal(thaiTime(new Date('2026-10-01T05:00:00Z')).hour,12);
const clock=new RailwayTime();clock.setSync(true);assert.equal(clock.sample(new Date('2026-10-01T05:00:00Z')).name,'day');clock.setLocked(true);assert(clock.sample().locked);clock.select('evening');assert.equal(clock.sync,false);assert.equal(clock.locked,false);
const nightWeight=h=>{const s=timeBlend(h);return (s.from==='night'?1:0)*(1-s.mix)+(s.to==='night'?1:0)*s.mix;};assert.equal(nightWeight(12),0);assert.equal(nightWeight(22),1);assert(nightWeight(18.8)>0&&nightWeight(18.8)<1);
for(const h of [0,5,6,7.5,16,18.25,19.5,24])assert(Math.abs(nightWeight(h-.00001)-nightWeight(h+.00001))<.001);
const scene=new THREE.Scene(),first=createScenery(scene),wide=createScenery(scene,{distance:STATION_DISTANCE+TRACK_LENGTH/2,widthScale:2,withIsland:false,name:'wide-water-station'});first.otherStations=[wide];
assert.equal(wide.platformWidth,first.platformWidth*2);assert.equal(wide.house,null);assert.equal(wide.grass,null);assert.equal(wide.island,null);assert(wide.root.position.distanceTo(first.root.position)>900);assert(!wide.root.getObjectByName('low-grassy-island'));
let clearance=Infinity;for(let d=wide.distance-36;d<wide.distance+36;d+=.2){const p=routePose(d),car=new THREE.Object3D();car.position.set(p.x,0,p.z);car.rotation.y=p.yaw;car.updateMatrixWorld();for(const x of [-1.565,1.565])for(const z of [-9.4,9.4]){const v=wide.root.worldToLocal(car.localToWorld(new THREE.Vector3(x,.6,z)));if(Math.abs(v.z)<PLATFORM.halfLength+.1){const gap=(PLATFORM.nearX-v.x)*wide.root.scale.x;clearance=Math.min(clearance,gap);assert(gap>.25);}}}
const cameraGuard=new CinematicCamera(first);for(const b of wide.cameraObstacles){const p=wide.root.localToWorld(new THREE.Vector3((b.minX+b.maxX)/2,2,(b.minZ+b.maxZ)/2));cameraGuard.safePosition(p);assert(p.y>=b.height+1.49);}
const bed=createTrackBed(scene,{coarse:true}),positions=bed.bed.geometry.attributes.position;for(let i=0;i<positions.count;i++)assert(positions.getY(i)<-.20);for(let i=0;i<7;i++)assert(new THREE.Vector3().fromBufferAttribute(positions,i).distanceTo(new THREE.Vector3().fromBufferAttribute(positions,positions.count-7+i))<.0001);assert([...bed.rocks.instanceMatrix.array].every(Number.isFinite));assert.equal(bed.rocks.count,6500);assert(bed.bed.geometry.attributes.normal.getY(3)>.99);
const cars=[new THREE.Group(),new THREE.Group()],rain=createRain(scene,cars,{coarse:true,glassMaterial:new THREE.MeshPhysicalMaterial()}),palette={horizon:new THREE.Color('#b8e2e9')},camera=new THREE.PerspectiveCamera();
rain.setEnabled(true);rain.update(1/60,1,camera,palette);assert(rain.intensity>0&&rain.intensity<1);for(let i=0;i<900;i++)rain.update(1/60,i/60,camera,palette);assert.equal(rain.intensity,1);assert.equal(rain.glass.uGlassRain.value,1);assert.equal(rain.mesh.visible,true);rain.setEnabled(false);for(let i=0;i<900;i++)rain.update(1/60,i/60,camera,palette);assert.equal(rain.intensity,0);assert.equal(rain.mesh.visible,false);assert.equal(rain.glass.uGlassRain.value,0);
rain.dispose();bed.dispose();console.log(JSON.stringify({checks:'GMT+7/midnight, smooth stars, manual override, second station width/island exclusion/camera clearance, continuous submerged ballast, finite pebbles, rain/glass fade',platformClearance:clearance}));
