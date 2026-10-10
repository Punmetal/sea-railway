import {rayBox} from './interactions.js';
import {groundAt,canWalkShore} from './station-journey.js';
export const SHORE_STANDING_EYE=1.595,SHORE_SEATED_EYE=1.22;

export function underStationRoof(station,x,z){const b=station.shelter;return Boolean(b&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ);}
export function pickShoreInteraction({station,position,yaw,pitch,eye=position.y+SHORE_STANDING_EYE}){
  const origin=[position.x,eye,position.z],direction=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
  let target=null,distance=2.05;
  for(const seat of station.seats){
    if(Math.hypot(position.x-seat.x,position.z-seat.z)>1.8)continue;
    const boxes=[[[seat.x-.22,seat.top-.08,seat.z-seat.width/2],[seat.x+.26,seat.top+.035,seat.z+seat.width/2]]];
    if(!seat.covered)boxes.push([[seat.x+.25,seat.top,seat.z-seat.width/2],[seat.x+.36,seat.top+.53,seat.z+seat.width/2]]);
    for(const [min,max]of boxes){const t=rayBox(origin,direction,min,max);if(t!==null&&t<distance){target={type:'shore-seat',seat};distance=t;}}
  }
  if(!target)return null;
  for(const b of station.walkObstacles){if(b.kind==='bench'&&b.id===target.seat.bench)continue;const t=rayBox(origin,direction,[b.minX,station.platform.top,b.minZ],[b.maxX,station.platform.top+b.height,b.maxZ]);if(t!==null&&t<distance-.015)return null;}
  return target;
}
export function findShoreStandPosition(station,seat){
  for(const dx of [-.60,-.80,-1.05])for(const dz of [0,.22,-.22]){
    const x=seat.x+dx,z=seat.z+dz;if(canWalkShore(station,x,z))return {x,z,y:groundAt(station,x,z)};
  }
  return null;
}
