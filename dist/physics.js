import {CAB_PARTITION_Z,CAB_FRONT_LIMIT,CUSHION_X,CUSHION_WIDTH,GRAB_POLE_X,NO_FACE_SEAT,CHIHIRO_SEAT} from './interior-layout.js';
// Metres, carriage-local coordinates. A closed arc-length table keeps the loop seamless.
export const TAU=Math.PI*2, LOOP_SECONDS=480, A=600, B=380, CAR_LENGTH=18, CAR_SPACING=18.75;
export const pointAtAngle=t=>({x:A*Math.cos(t),z:B*Math.sin(t)});
const samples=32768, cumulative=[0];let prev=pointAtAngle(0);
for(let i=1;i<=samples;i++){const p=pointAtAngle(i/samples*TAU);cumulative.push(cumulative[i-1]+Math.hypot(p.x-prev.x,p.z-prev.z));prev=p;}
export const TRACK_LENGTH=cumulative[samples];
export function routePose(distance){const d=((distance%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH;let lo=0,hi=samples;while(lo+1<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<=d)lo=mid;else hi=mid;}const f=(d-cumulative[lo])/(cumulative[hi]-cumulative[lo]);const t=(lo+f)/samples*TAU;return {...pointAtAngle(t),yaw:Math.atan2(-A*Math.sin(t),B*Math.cos(t))};}
export const fixtures=[];
for(const side of [-1,1]){const edges=[side*(CUSHION_X-CUSHION_WIDTH/2),side*(CUSHION_X+CUSHION_WIDTH/2)].sort((a,b)=>a-b);for(const car of [0,1])fixtures.push({car,minX:edges[0],maxX:edges[1],minZ:car===0?-6.72:-5.46,maxZ:car===0?5.46:6.72});for(const z of [-6.84,0,6.84])fixtures.push({minX:side*GRAB_POLE_X-.035,maxX:side*GRAB_POLE_X+.035,minZ:z-.035,maxZ:z+.035});}
// The seated cloak projects beyond the cushion; keep walkers clear of the knees.
fixtures.push({car:1,minX:-1.07,maxX:-.375,minZ:NO_FACE_SEAT.z-.37,maxZ:NO_FACE_SEAT.z+.37});
fixtures.push({car:1,minX:-1.07,maxX:-.41,minZ:CHIHIRO_SEAT.z-.245,maxZ:CHIHIRO_SEAT.z+.245});
const radius=.20;
// Stop before the newly sloped windshield at the passenger's eye/shoulder height.
export function canStand(x,z,car,doors=[1,1],cabDoors=[0,0],boardingOpen=false){
  const entrance=boardingOpen&&car===0&&x>=0&&x<=1.65&&Math.abs(z-6.18)<.30;
  if(Math.abs(x)>1.12&&!entrance)return false;
  const cabZ=(car===0?1:-1)*CAB_PARTITION_Z,gangwayZ=car===0?-8.68:8.68;
  // The parked leaf remains entirely inside the carriage. Its visible edge
  // leaves a 78 cm passage, with clearance for the player's 20 cm radius.
  const canonicalX=x*(car===0?1:-1),inDoor=canonicalX>=-.245&&canonicalX<=.095;
  if(Math.abs(z-gangwayZ)<.35&&(doors[car]<.97||!inDoor))return false;
  if(Math.abs(z-cabZ)<.35&&(cabDoors[car]<.97||!inDoor))return false;
  if((car===0?-z:z)>7.55&&Math.abs(x)>.27)return false;
  if((car===0?z:-z)>CAB_FRONT_LIMIT)return false;
  for(const b of fixtures)if((b.car===undefined||b.car===car)&&x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius)return false;
  return true;
}
export function movePlayer(p,dx,dz,onCross,doors=[1,1],cabDoors=[0,0],boardingOpen=false){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.06));for(let i=0;i<steps;i++){const nx=p.x+dx/steps,nz=p.z+dz/steps;if(canStand(nx,p.z,p.car,doors,cabDoors,boardingOpen))p.x=nx;if(canStand(p.x,nz,p.car,doors,cabDoors,boardingOpen))p.z=nz;if(p.car===0&&p.z< -CAR_SPACING/2){const crossed={from:0,to:1,x:p.x,z:p.z};p.car=1;p.z=CAR_SPACING/2-.015;p.x=Math.max(-.27,Math.min(.27,p.x));onCross?.(crossed,p);}else if(p.car===1&&p.z>CAR_SPACING/2){const crossed={from:1,to:0,x:p.x,z:p.z};p.car=0;p.z=-CAR_SPACING/2+.015;p.x=Math.max(-.27,Math.min(.27,p.x));onCross?.(crossed,p);}}return p;}
