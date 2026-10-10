import {TRACK_LENGTH,canStand} from './physics.js';
import {SEATS,isSeatOccupied} from './interior-layout.js';
import {groundAt,canWalkShore} from './station-journey.js';
import {CRUISE_SPEED} from './train-motion.js';

export const JOURNEY_KEY='sea-railway-journey-v1';
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const stationId=n=>Number.isInteger(n)&&n>=0&&n<2?n:null;
const shoreSeatId=n=>Number.isInteger(n)||typeof n==='string'&&n.length>0&&n.length<=120?n:null;
const doors=a=>Array.isArray(a)&&a.length===2&&a.every(n=>n===0||n===1)?[...a]:[0,0];
export function sanitizeJourney(value){
 if(!value||value.version!==1||!finite(value.savedAt,0,9e15)||!finite(value.elapsed,0,1e9))return null;
 const t=value.train,p=value.player,j=value.journey;
 if(!t||!finite(t.distance,0,TRACK_LENGTH)||!finite(t.speed,-CRUISE_SPEED,CRUISE_SPEED)||!['forward','reverse','stop'].includes(t.requested))return null;
 if(!p||![0,1].includes(p.car)||!finite(p.x,-1.7,1.7)||!finite(p.z,-10,10)||!finite(p.yaw,-10000,10000)||!finite(p.pitch,-1.35,1.35))return null;
 if(!j||!['travelling','approaching','waiting','closing'].includes(j.phase)||!finite(j.timer,0,120)||![-1,1].includes(j.sign))return null;
 const station=stationId(j.station);if(j.phase!=='travelling'&&station===null)return null;
 const shore=value.shore;
 if(shore&&(!Number.isInteger(shore.station)||stationId(shore.station)===null||!finite(shore.x,-100,100)||!finite(shore.z,-100,100)))return null;
 const out={version:1,savedAt:value.savedAt,elapsed:value.elapsed,view:['outside','inside','cinematic'].includes(value.view)?value.view:'outside',snowCover:finite(value.snowCover,0,1)?value.snowCover:0,train:{distance:t.distance,speed:t.speed,requested:t.requested},player:{car:p.car,x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,seat:Number.isInteger(p.seat)?p.seat:null},journey:{phase:j.phase,timer:j.timer,sign:j.sign,station,skip:stationId(j.skip),recall:stationId(j.recall)},doors:doors(value.doors),cabDoors:doors(value.cabDoors),shore:shore?{station:shore.station,x:shore.x,z:shore.z,seat:shoreSeatId(shore.seat)}:null};
 return out;
}
export function loadJourney(storage){try{return sanitizeJourney(JSON.parse(storage?.getItem(JOURNEY_KEY)));}catch{return null;}}
export function saveJourney(storage,value){try{const clean=sanitizeJourney(value);if(!storage||!clean)return false;storage.setItem(JOURNEY_KEY,JSON.stringify(clean));return true;}catch{return false;}}
export function restoreTrainMotion(motion,saved){
 const speed=saved?.speed??CRUISE_SPEED,requested=saved?.requested??'forward',sign={forward:1,reverse:-1,stop:0}[requested];
 Object.assign(motion,{distance:saved?.distance??0,speed,requested,lastDirection:Math.sign(speed)||sign||1,phase:speed?'cruise':'stopped',segment:null,hold:0});
 const to=!sign||(speed!==0&&Math.sign(speed)!==sign)?0:sign*CRUISE_SPEED;
 if(Math.abs(speed-to)>.001)motion.begin(to,4,to===0?'braking':'accelerating');
 return motion;
}
export function resolveJourneyLocation(value,stations){
 const s=sanitizeJourney(value);if(!s)return null;
 if(s.shore){const station=stations[s.shore.station];if(station){const seat=station.seats.find(v=>v.id===s.shore.seat);if(seat)return {shore:{station,x:seat.x,z:seat.z,y:seat.floor,seat},player:s.player,recovered:false};if(canWalkShore(station,s.shore.x,s.shore.z))return {shore:{station,x:s.shore.x,z:s.shore.z,y:groundAt(station,s.shore.x,s.shore.z),seat:null},player:s.player,recovered:false};}}
 else{
  const seat=SEATS.find(v=>v.id===s.player.seat&&v.car===s.player.car&&!isSeatOccupied(v));
  if(seat)return {shore:null,player:{...s.player,x:seat.x,z:seat.z},seat,recovered:false};
  if(canStand(s.player.x,s.player.z,s.player.car,s.doors,s.cabDoors,false))return {shore:null,player:s.player,seat:null,recovered:false};
 }
 // A saved threshold or obsolete layout never strands the player in a collider.
 return {shore:null,player:{car:0,x:0,z:1.3,yaw:Math.PI,pitch:0,seat:null},seat:null,recovered:true};
}
