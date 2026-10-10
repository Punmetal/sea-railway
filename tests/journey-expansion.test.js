import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {StationJourney,routeGap,moveShore,canWalkShore,groundAt,BOARDING_Z}=await import('../dist/station-journey.js');
const {TrainMotion}=await import('../dist/train-motion.js');const {TRACK_LENGTH}=await import('../dist/physics.js');
const {RailwayWeather,createSnow}=await import('../dist/weather.js');const {loadSettings,saveSettings,sanitizeSettings,QUALITY}=await import('../dist/journey-settings.js');
globalThis.document={createElement(){return {getContext(){return {fillRect(){},fillText(){}};}};}};
const {createScenery}=await import('../dist/scenery.js');
const stations=[{distance:70,name:'first'},{distance:70+TRACK_LENGTH/2,name:'wide'}];
for(const sign of [1,-1])for(const dt of [1/30,1/60,.05]){
 const m=new TrainMotion(),events=[],journey=new StationJourney(stations,{onEvent:(kind,s)=>events.push([kind,s.name])});if(sign<0){m.distance=100;m.speed=-Math.abs(m.speed);m.requested='reverse';m.lastDirection=-1;}
 for(let i=0;i<Math.ceil(25/dt);i++){journey.update(dt,m);m.update(dt);if(journey.phase==='waiting')break;}
 assert.equal(journey.phase,'waiting');assert.equal(m.speed,0);assert(Math.abs(m.distance-(70-BOARDING_Z))<1e-9);assert.equal(journey.docked(m).name,'first');assert.deepEqual(events.map(e=>e[0]),['approach','arrival']);
 for(let i=0;i<Math.ceil(33/dt);i++){journey.update(dt,m);m.update(dt);}assert.equal(journey.phase,'travelling');assert(Math.sign(m.speed)===sign);assert(events.some(e=>e[0]==='departure'));
 journey.manual(m,'stop');for(let i=0;i<200;i++)m.update(.05);assert.equal(m.speed,0);journey.call(stations[0],m);
 for(let i=0;i<1500;i++){journey.update(.05,m);m.update(.05);if(journey.phase==='waiting')break;}assert.equal(journey.phase,'waiting');for(let i=0;i<1000;i++){journey.update(.05,m);m.update(.05);}assert.equal(m.speed,0,'A recalled train waits until boarding.');journey.boarded();assert.equal(journey.recall,null);
}
const island={root:{scale:{x:1}},platform:{nearX:2.2,farX:7.6,halfLength:7.2,top:.74},island:{},cameraObstacles:[{minX:25.7,maxX:36.3,minZ:-12.9,maxZ:-3.1}]};
let p={x:2.95,z:-.4};for(let i=0;i<1300;i++)moveShore(island,p,.025,0);assert(p.x>33,'The walkway connects the platform to the island.');assert(groundAt(island,p.x,p.z)!==null);assert(!canWalkShore(island,31,-8));assert(!canWalkShore(island,18,4));for(let i=0;i<3000;i++)moveShore(island,p,.06,.06);assert(groundAt(island,p.x,p.z)!==null,'Walking cannot leave the island into the sea.');
const stationScene=new THREE.Scene(),first=createScenery(stationScene),wide=createScenery(stationScene,{distance:stations[1].distance,widthScale:2,withIsland:false,withAnnex:true});
const roofSize=s=>{const g=s.root.getObjectByName('scenery-shelterRoof').geometry;g.computeBoundingBox();return g.boundingBox.getSize(new THREE.Vector3()).multiply(s.root.scale);};
assert(roofSize(first).distanceTo(roofSize(wide))<1e-5,'Doubling the platform must not stretch the shelter.');assert.equal(wide.platformWidth,2*first.platformWidth);assert.equal(wide.island,null);
let annexWalker={x:wide.annex.nearX+1,z:0};for(let i=0;i<550;i++)moveShore(wide,annexWalker,0,-.025);assert(annexWalker.z< -13,'A visitor can walk continuously from the main deck into the relocated stop.');assert.equal(annexWalker.y,.74);for(let i=0;i<300;i++)moveShore(wide,annexWalker,0,-.05);assert(annexWalker.z>wide.annex.nearZ+.24,'Annex edges keep visitors on the platform.');
for(const furnishing of wide.furnishings)assert(furnishing.x>wide.platform.nearX+3,'Benches, lamps and the shelter leave the boarding edge clear.');
const weather=new RailwayWeather();weather.select('snow');weather.update(3);assert(weather.values.snow>0&&weather.values.snow<1);weather.setLocked(true);const frozen={...weather.values};for(let i=0;i<500;i++)weather.update(.1);assert.deepEqual(weather.values,frozen);weather.setLocked(false);weather.select('rain');weather.update(2);assert(weather.values.rain>0&&weather.values.snow>0,'Weather crossfades gently.');weather.setAuto(true);weather.update(160);assert.notEqual(weather.selected,'snow');weather.select('clear');assert.equal(weather.auto,false);
const storage=new Map(),store={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};const settings={weather:'snow',view:'inside',quality:'low',musicVolume:.7,autoStops:false};assert(saveSettings(store,settings));const restored=loadSettings(store);assert.equal(restored.weather,'snow');assert.equal(restored.autoStops,false);assert.equal(restored.musicVolume,.7);assert.equal(sanitizeSettings({quality:'bad',weather:'bad',musicVolume:8}).quality,'high');assert.equal(sanitizeSettings({musicVolume:8}).musicVolume,1);assert.doesNotThrow(()=>loadSettings({getItem(){throw Error();}}));assert.equal(saveSettings({setItem(){throw Error();}},settings),false);
assert(QUALITY.low.reflection<QUALITY.high.reflection);assert(QUALITY.low.pebbleFraction<QUALITY.high.pebbleFraction);
const scene=new THREE.Scene(),cars=[new THREE.Group(),new THREE.Group()],snow=createSnow(scene,cars,{coarse:true});snow.update(10,new THREE.PerspectiveCamera(),{horizon:new THREE.Color()},1);assert(snow.mesh.visible);assert.equal(snow.uniforms.uSnow.value,1);assert([...snow.mesh.geometry.attributes.position.array].every(Number.isFinite));snow.update(12,new THREE.PerspectiveCamera(),{horizon:new THREE.Color()},0);assert(!snow.mesh.visible);snow.dispose();
console.log('Expansion: accurate station docking/departure both directions/frame rates, recall waits for boarding, connected shore/island collision, snow crossfade/lock, resilient persisted preferences and quality budgets passed.');
