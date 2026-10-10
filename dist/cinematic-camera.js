import * as THREE from 'three';
const smooth=t=>t*t*t*(10+t*(-15+6*t));
export const SHOTS=[
  {name:'front',angle:.18,radius:49,height:11,fov:48},
  {name:'side',angle:1.34,radius:36,height:8.5,fov:53},
  {name:'rear',angle:3.25,radius:52,height:12,fov:48},
  {name:'high',angle:4.45,radius:46,height:48,fov:45},
  {name:'wide',angle:5.58,radius:94,height:34,fov:43},
  {name:'landscape',angle:6.46,radius:72,height:19,fov:49}
];
// Polar interpolation always stays outside the whole train. A soft height field
// clears scenery before entering its footprint; no ray through the train is used.
export class CinematicCamera{
  constructor(scenery){this.scenery=scenery;this.time=0;this.directionAngle=0;this.angularVelocity=0;this.travelSign=1;this.local=new THREE.Vector3();this.anchor=new THREE.Vector3();this.position=new THREE.Vector3();this.target=new THREE.Vector3();this.shot='front';}
  start(sign=1){this.time=0;this.travelSign=sign<0?-1:1;this.directionAngle=sign<0?Math.PI:0;this.angularVelocity=0;}
  safePosition(position){this.scenery.root.worldToLocal(this.local.copy(position));let height=position.y;
    for(const b of this.scenery.cameraObstacles){const dx=Math.max(b.minX-this.local.x,0,this.local.x-b.maxX),dz=Math.max(b.minZ-this.local.z,0,this.local.z-b.maxZ),distance=Math.hypot(dx,dz),weight=1-smooth(THREE.MathUtils.clamp(distance/16,0,1));height=Math.max(height,THREE.MathUtils.lerp(position.y,Math.max(position.y,b.height+1.5),weight));}
    for(const b of this.scenery.routeVistas?.cameraObstacles??[]){const dx=position.x-b.x,dz=position.z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=dx*c-dz*s,z=dx*s+dz*c,distance=Math.hypot(Math.max(Math.abs(x)-b.halfX,0),Math.max(Math.abs(z)-b.halfZ,0)),weight=1-smooth(THREE.MathUtils.clamp(distance/16,0,1));height=Math.max(height,THREE.MathUtils.lerp(position.y,Math.max(position.y,b.height+1.5),weight));}
    for(const station of this.scenery.otherStations??[]){station.root.worldToLocal(this.local.copy(position));for(const b of station.cameraObstacles){const dx=Math.max(b.minX-this.local.x,0,this.local.x-b.maxX),dz=Math.max(b.minZ-this.local.z,0,this.local.z-b.maxZ),distance=Math.hypot(dx*station.root.scale.x,dz),weight=1-smooth(THREE.MathUtils.clamp(distance/16,0,1));height=Math.max(height,THREE.MathUtils.lerp(position.y,Math.max(position.y,b.height+1.5),weight));}}
    position.y=height;return position;
  }
  update(dt,cars,speed){this.time+=dt;const cycle=this.time/14,index=Math.floor(cycle)%SHOTS.length,lap=Math.floor(cycle/SHOTS.length),t=smooth(cycle%1),a=SHOTS[index],b=SHOTS[(index+1)%SHOTS.length];this.shot=a.name;
    if(Math.abs(speed)>.025)this.travelSign=Math.sign(speed);const wanted=this.travelSign<0?Math.PI:0;
    const difference=(wanted-this.directionAngle+Math.PI*3)%(Math.PI*2)-Math.PI,velocity=THREE.MathUtils.clamp(difference*.4,-.18,.18);
    this.angularVelocity+=(velocity-this.angularVelocity)*(1-Math.exp(-dt/1.2));this.directionAngle+=this.angularVelocity*dt;
    const start=a.angle+lap*Math.PI*2,end=b.angle+(lap+(index===SHOTS.length-1?1:0))*Math.PI*2,angle=THREE.MathUtils.lerp(start,end,t)+this.directionAngle;
    const radius=THREE.MathUtils.lerp(a.radius,b.radius,t),height=THREE.MathUtils.lerp(a.height,b.height,t);
    this.anchor.copy(cars[0].position).add(cars[1].position).multiplyScalar(.5);const yaw=cars[0].rotation.y;
    const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;
    this.position.set(this.anchor.x+Math.cos(yaw)*x+Math.sin(yaw)*z,height,this.anchor.z-Math.sin(yaw)*x+Math.cos(yaw)*z);this.safePosition(this.position);
    this.target.copy(this.anchor);this.target.y=2.25;
    let landmark=this.scenery.lightTarget;for(const point of this.scenery.routeVistas?.landmarks??[])if(this.anchor.distanceTo(point.position)<this.anchor.distanceTo(landmark))landmark=point.position;
    const proximity=1-THREE.MathUtils.smoothstep(this.anchor.distanceTo(landmark),35,180),wide=THREE.MathUtils.smoothstep(radius,55,88);
    this.target.lerp(landmark,proximity*wide*.30);
    return {position:this.position,target:this.target,fov:THREE.MathUtils.lerp(a.fov,b.fov,t),shot:this.shot};
  }
}
