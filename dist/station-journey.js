import * as THREE from 'three';
import {TRACK_LENGTH} from './physics.js';
export const BOARDING_Z=6.18,DWELL_SECONDS=24;
const wrap=d=>((d%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH;
export const routeGap=(from,to,sign=1)=>wrap((to-from)*sign);
export class StationJourney{
  constructor(stations,{onEvent=()=>{}}={}){this.stations=stations;this.enabled=true;this.onEvent=onEvent;this.phase='travelling';this.station=null;this.timer=0;this.skip=null;this.recall=null;this.sign=1;}
  target(s){return wrap(s.distance-BOARDING_Z);}
  docked(motion){if(Math.abs(motion.speed)>.015)return null;return this.stations.find(s=>Math.min(routeGap(motion.distance,this.target(s)),routeGap(this.target(s),motion.distance))<.35)??null;}
  setEnabled(value,motion){this.enabled=Boolean(value);if(!this.enabled&&this.phase==='approaching'){this.phase='travelling';this.station=null;motion.setDirection(this.sign>0?'forward':'reverse');}return this.enabled;}
  manual(motion,direction){this.recall=null;this.skip=this.station??this.docked(motion);this.station=null;this.phase='travelling';this.timer=0;return motion.setDirection(direction);}
  call(station,motion){this.recall=station;const a=routeGap(motion.distance,this.target(station),1),b=routeGap(motion.distance,this.target(station),-1);this.sign=a<=b?1:-1;this.skip=null;
    if(this.docked(motion)===station){this.station=station;this.phase='waiting';this.timer=DWELL_SECONDS;return;}
    this.phase='travelling';this.station=null;motion.setDirection(this.sign>0?'forward':'reverse');
  }
  update(dt,motion,{boardingOccupied=false}={}){
    if(!dt)return;this.timer=Math.max(0,this.timer-dt);
    if(boardingOccupied&&this.docked(motion)){
      if(this.phase==='closing')this.phase='waiting';
      this.timer=Math.max(3,this.timer);return;
    }
    if(this.skip&&Math.min(routeGap(motion.distance,this.target(this.skip)),routeGap(this.target(this.skip),motion.distance))>45)this.skip=null;
    if(this.phase==='waiting'){
      if(this.recall){this.timer=DWELL_SECONDS;return;}
      if(!this.enabled||motion.requested!=='stop'){this.phase='travelling';this.skip=this.station;this.station=null;return;}
      if(!this.timer){this.phase='closing';this.timer=1.7;this.onEvent('departure',this.station);}return;
    }
    if(this.phase==='closing'){if(!this.timer){this.skip=this.station;this.station=null;this.phase='travelling';motion.setDirection(this.sign>0?'forward':'reverse');}return;}
    if(this.phase==='approaching'){
      if(motion.phase==='stopped'){motion.distance=this.target(this.station);this.phase='waiting';this.timer=DWELL_SECONDS;this.onEvent('arrival',this.station);}return;
    }
    if(!this.enabled&&!this.recall||Math.abs(motion.speed)<.1||motion.phase!=='cruise')return;
    this.sign=Math.sign(motion.speed);let closest=null,gap=Infinity;
    for(const s of this.recall?[this.recall]:this.stations){if(s===this.skip)continue;const d=routeGap(motion.distance,this.target(s),this.sign);if(d<gap){gap=d;closest=s;}}
    if(closest&&gap<32&&gap>.05){this.station=closest;this.phase='approaching';motion.requested='stop';motion.begin(0,Math.max(.15,2*gap/Math.abs(motion.speed)),'braking');this.onEvent('approach',closest);}
  }
  boarded(){this.recall=null;this.timer=DWELL_SECONDS;}
  state(){return {enabled:this.enabled,phase:this.phase,station:this.station?.name??null,remaining:Math.ceil(this.timer),recalling:Boolean(this.recall)};}
}
export function groundAt(station,x,z){
  const b=station.platform;
  if(x>b.nearX+.23&&x<b.farX-.22&&Math.abs(z)<b.halfLength-.25)return b.top;
  const a=station.annex;
  if(a&&x>a.nearX+.23&&x<a.farX-.22&&z>a.nearZ+.25&&z<a.farZ+.4)return a.top;
  if(station.island){
    if(x>=b.farX-.25&&x<25&&Math.abs(z)<.60)return .74-THREE.MathUtils.smoothstep(x,19,24)*.28;
    const q=Math.hypot((x-33)/8.70,(z-4)/30.9);
    if(q<.95)return .46-.36*Math.pow(Math.hypot((x-33)/9,(z-4)/32),8);
  }
  return null;
}
export function canWalkShore(station,x,z,extraGround){
  if(groundAt(station,x,z)===null&&extraGround?.(x,z)==null)return false;
  for(const b of station.walkObstacles??station.cameraObstacles){if(x>b.minX-.20&&x<b.maxX+.20&&z>b.minZ-.20&&z<b.maxZ+.20)return false;}
  return !station.island||Math.hypot(x-34,z-19)>.46;
}
export function moveShore(station,p,dx,dz,extraGround){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx*station.root.scale.x,dz)/.08));
  for(let i=0;i<steps;i++){if(canWalkShore(station,p.x+dx/steps,p.z,extraGround))p.x+=dx/steps;if(canWalkShore(station,p.x,p.z+dz/steps,extraGround))p.z+=dz/steps;}
  p.y=groundAt(station,p.x,p.z)??extraGround?.(p.x,p.z)??station.platform.top;return p;
}
export function addIslandWalkway(station){
  if(!station.island)return null;
  const group=new THREE.Group();group.name='island-walkway';station.root.add(group);
  const wood=new THREE.MeshStandardMaterial({color:0x8b785d,roughness:.9});
  for(let i=0;i<37;i++){const x=7.4+i*.47,y=.74-THREE.MathUtils.smoothstep(x,19,24)*.28;const plank=new THREE.Mesh(new THREE.BoxGeometry(.46,.075,1.55),wood);plank.position.set(x,y-.0375,0);group.add(plank);}
  for(let x=8;x<23;x+=2.8)for(const z of [-.74,.74]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.06,1.2,6),wood);pole.position.set(x,.22,z);group.add(pole);}
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return {group,dispose(){group.traverse(o=>o.geometry?.dispose());wood.dispose();}};
}
