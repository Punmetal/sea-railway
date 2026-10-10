import {SEATS,STANDING_EYE,CUSHION_X,CUSHION_WIDTH,GRAB_POLE_X,DOOR_TRAVEL,isSeatOccupied} from './interior-layout.js';
import {canStand} from './physics.js';

export function rayBox(origin,direction,min,max){let near=0,far=Infinity;for(let i=0;i<3;i++){
  if(Math.abs(direction[i])<1e-8){if(origin[i]<min[i]||origin[i]>max[i])return null;continue;}
  let a=(min[i]-origin[i])/direction[i],b=(max[i]-origin[i])/direction[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;
}return near;}

// Small analytic volumes avoid raycasting the detailed carriage triangles every frame.
export function pickInteraction({player,yaw,pitch,eye=STANDING_EYE,doors,cabDoors}){
  const origin=[player.x,eye,player.z],direction=[-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
  let nearest=null,distance=2.05;
  function consider(min,max,target){const t=rayBox(origin,direction,min,max);if(t!==null&&t<distance){nearest=target;distance=t;}}
  for(const seat of SEATS)if(!isSeatOccupied(seat)&&seat.car===player.car&&Math.hypot(player.x-seat.x,player.z-seat.z)<1.65){
    const xs=[seat.side*(CUSHION_X-CUSHION_WIDTH/2),seat.side*(CUSHION_X+CUSHION_WIDTH/2)].sort((a,b)=>a-b),back=[seat.side*1.025,seat.side*1.30].sort((a,b)=>a-b);
    consider([xs[0],1.43,seat.z-seat.width/2],[xs[1],1.68,seat.z+seat.width/2],{type:'seat',seat});
    consider([back[0],1.57,seat.z-seat.width/2],[back[1],2.28,seat.z+seat.width/2],{type:'seat',seat});
  }
  const localDoors=[doors[player.car],cabDoors[player.car]];
  for(const door of localDoors)if(door&&Math.hypot(player.x,player.z-door.z)<2.05){
    const t=door.progress*door.progress*(3-2*door.progress),x=(player.car===0?1:-1)*t*DOOR_TRAVEL;
    consider([x-.465,1.095,door.z-.11],[x+.465,3.19,door.z+.11],{type:'door',door});
  }
  if(!nearest)return null;
  // Occlusion by partition sides, closed doors, or support poles hides the prompt.
  const blocks=[];
  for(const d of localDoors)if(d){
    blocks.push([[-1.304,1.095,d.z-.15],[-.49,3.80,d.z+.15]],[[.49,1.095,d.z-.15],[1.304,3.80,d.z+.15]],[[-.49,3.20,d.z-.15],[.49,3.80,d.z+.15]]);
    if(d.progress<.97&&nearest.door!==d)blocks.push([[-.455,1.12,d.z-.06],[.455,3.19,d.z+.06]]);
  }
  for(const side of [-1,1])for(const z of [-6.84,0,6.84])blocks.push([[side*GRAB_POLE_X-.035,1.11,z-.035],[side*GRAB_POLE_X+.035,3.41,z+.035]]);
  for(const [min,max]of blocks){const t=rayBox(origin,direction,min,max);if(t!==null&&t<distance-.015)return null;}
  return nearest;
}

export function findStandPosition(seat,doors,cabDoors){
  for(const x of [seat.side*.40,seat.side*.25,0,-seat.side*.25])for(const dz of [0,.20,-.20,.40,-.40]){
    if(canStand(x,seat.z+dz,seat.car,doors,cabDoors))return {car:seat.car,x,z:seat.z+dz};
  }
  return null;
}
