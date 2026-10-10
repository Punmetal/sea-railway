import * as THREE from 'three';
import {SEATS,isSeatOccupied,setVisitorSeat} from './interior-layout.js';
import {FLOOR_TOP} from './train-shell.js';
import {BOARDING_Z} from './station-journey.js';
export function createQuietPassenger(scene,stations){
 const root=new THREE.Group();root.name='occasional-platform-passenger';scene.add(root);root.visible=false;
 const coat=new THREE.MeshStandardMaterial({color:0x718b86,roughness:1,transparent:true,opacity:0}),skin=new THREE.MeshStandardMaterial({color:0xc0ae96,roughness:1,transparent:true,opacity:0}),hat=new THREE.MeshStandardMaterial({color:0x5c6467,roughness:1,transparent:true,opacity:0});
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.19,.55,4,8),coat);body.position.y=.79;root.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.135,10,8),skin);head.position.y=1.34;root.add(head);
 for(const [r,h,y]of [[.23,.045,1.46],[.14,.12,1.52]]){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),hat);m.position.y=y;root.add(m);}
 const legs=[];for(const x of [-.105,.105]){const m=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.29,3,6),hat);m.position.set(x,.23,0);root.add(m);legs.push(m);}
 const caseMesh=new THREE.Mesh(new THREE.BoxGeometry(.16,.25,.33),hat);caseMesh.position.set(.33,.42,0);root.add(caseMesh);
 let lastDock=null,serial=0,phase='hidden',seat=null,station=null,path=[],step=0,alpha=0,hold=0;
 const start=new THREE.Vector3(),destination=new THREE.Vector3(),playerWorld=new THREE.Vector3();
 function waypoints(s,car,boarding){const platform=s.root.localToWorld(new THREE.Vector3(3.6,s.platform.top,0)),outer=car.localToWorld(new THREE.Vector3(2.15,s.platform.top-car.position.y,BOARDING_Z)),door=car.localToWorld(new THREE.Vector3(1.25,FLOOR_TOP,BOARDING_Z)),aisle=car.localToWorld(new THREE.Vector3(0,FLOOR_TOP,BOARDING_Z)),seatAisle=car.localToWorld(new THREE.Vector3(0,FLOOR_TOP,seat.z)),end=car.localToWorld(new THREE.Vector3(seat.x,FLOOR_TOP,seat.z));const p=[platform,outer,door,aisle,seatAisle,end];return boarding?p:p.reverse();}
 function release(){setVisitorSeat(null);seat=null;}
 function reset(){release();phase='hidden';lastDock=null;serial=0;root.visible=false;alpha=0;hold=0;}
 return {root,get boarding(){return ['boarding','alighting'].includes(phase)&&hold===0;},get seat(){return seat?.id??null;},get phase(){return phase;},reset,
  update(dt,time,cars,{journey,motion,doorProgress=0,player,onShore=false,shoreWorld=null,seated=null}={}){
   if(!journey||!motion)return;const dock=journey.docked(motion);if(dt>0&&!dock)lastDock=null;
   if(dt>0&&dock&&dock!==lastDock&&journey.phase==='waiting'&&doorProgress>.97){lastDock=dock;serial++;
    if(phase==='riding'){station=dock;path=waypoints(station,cars[0],false);phase='alighting';step=0;start.copy(path[0]);root.position.copy(start);}
    else if(phase==='hidden'&&serial%2===1){seat=SEATS.find(s=>s.car===0&&s.id!==seated?.id&&!isSeatOccupied(s)&&Math.abs(s.z-2.7)<1.5);if(seat){setVisitorSeat(seat.id);station=dock;path=waypoints(station,cars[0],true);phase='boarding';step=0;start.copy(path[0]);root.position.copy(start);alpha=0;}}
   }
   if(phase==='hidden')return;
   root.visible=true;if(phase!=='leaving')alpha=Math.min(.8,alpha+dt*.3);for(const m of [coat,skin,hat])m.opacity=alpha;
   if(phase==='riding'){cars[0].localToWorld(root.position.set(seat.x,FLOOR_TOP,seat.z));root.quaternion.copy(cars[0].quaternion);root.rotateY(seat.side<0?Math.PI/2:-Math.PI/2);body.position.y=.68;head.position.y=1.15;caseMesh.position.y=.24;legs.forEach(l=>{l.position.y=.2;l.rotation.x=-.5;});root.children.filter(c=>c.material===hat&&c.geometry.type==='CylinderGeometry').forEach((c,i)=>c.position.y=i?1.33:1.27);return;}
   if(phase==='leaving'){alpha=Math.max(0,alpha-dt*.18);for(const m of [coat,skin,hat])m.opacity=alpha;root.position.addScaledVector(station.root.localToWorld(new THREE.Vector3(0,0,-1)).sub(station.root.localToWorld(new THREE.Vector3(0,0,0))),dt*.35);if(alpha===0){release();phase='hidden';root.visible=false;}return;}
   body.position.y=.79;head.position.y=1.34;caseMesh.position.y=.42;root.children.filter(c=>c.material===hat&&c.geometry.type==='CylinderGeometry').forEach((c,i)=>c.position.y=i?1.52:1.46);
   if(onShore&&shoreWorld)playerWorld.copy(shoreWorld);else if(player)cars[player.car].localToWorld(playerWorld.set(player.x,FLOOR_TOP,player.z));
   const near=player&&root.position.distanceTo(playerWorld)<.75;
   if(near){hold+=dt;if(hold>2){release();phase='leaving';root.position.copy(station.root.localToWorld(new THREE.Vector3(3.6,station.platform.top,0)));}return;}hold=0;
   if(!dock||doorProgress<.97){release();phase='hidden';root.visible=false;return;}
   let remaining=dt*.9;while(remaining>0&&step<path.length-1){const segment=Math.floor(step),distance=Math.max(.1,path[segment].distanceTo(path[segment+1])),travel=Math.min(remaining,(1-(step-segment))*distance);step+=travel/distance;if(step-segment>.999999999)step=segment+1;remaining-=travel;}
   const segment=Math.floor(step),t=step-segment;
   if(segment>=path.length-1){if(phase==='boarding'){phase='riding';}else{release();phase='leaving';}return;}
   start.copy(path[segment]);destination.copy(path[segment+1]);root.position.copy(start).lerp(destination,t);root.rotation.set(0,Math.atan2(destination.x-start.x,destination.z-start.z),0);root.position.y+=Math.sin(time*4)*.018;legs.forEach((l,i)=>l.rotation.x=Math.sin(time*3.5+i*Math.PI)*.19);
  },dispose(){release();root.traverse(o=>o.geometry?.dispose());for(const m of [coat,skin,hat])m.dispose();root.removeFromParent();}
 };
}
