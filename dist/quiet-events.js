import * as THREE from 'three';
import {routePose,TRACK_LENGTH} from './physics.js';
const fade=(time,start,end)=>THREE.MathUtils.smoothstep(time,start,start+5)*(1-THREE.MathUtils.smoothstep(time,end-7,end));
export function createQuietEvents(scene,stations){
  const root=new THREE.Group();root.name='occasional-quiet-events';scene.add(root);
  const boat=new THREE.Group();boat.name='passing-small-boat';root.add(boat);
  const timber=new THREE.MeshStandardMaterial({color:0x7e6653,roughness:.95,transparent:true,opacity:0}),cloth=new THREE.MeshStandardMaterial({color:0xe3d8b9,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:0});
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),timber);hull.scale.set(.8,.28,2.4);hull.position.y=.15;boat.add(hull);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,3.3,6),timber);mast.position.y=1.7;boat.add(mast);
  const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([.06,.6,0,.06,3.2,0,1.65,.62,0],3));sailGeo.computeVertexNormals();boat.add(new THREE.Mesh(sailGeo,cloth));
  const meteorGeo=new THREE.BufferGeometry();meteorGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,13,-4,0],3));const meteorMat=new THREE.LineBasicMaterial({color:0xcfe0ee,transparent:true,opacity:0,depthWrite:false});const meteor=new THREE.Line(meteorGeo,meteorMat);meteor.name='rare-shooting-star';root.add(meteor);
  const ghosts=[];const ghostMat=new THREE.MeshStandardMaterial({color:0x66736d,transparent:true,opacity:0,roughness:1,depthWrite:false});
  for(const station of stations){const ghost=new THREE.Group();ghost.name='quiet-platform-traveller';const body=new THREE.Mesh(new THREE.ConeGeometry(.22,1.3,8),ghostMat);body.position.y=station.platform.top+.65;const head=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),ghostMat);head.position.y=station.platform.top+1.39;ghost.add(body,head);ghost.position.set(4.15,0,-4.3);station.root.add(ghost);ghosts.push(ghost);}
  let boatCycle=-1;const boatOrigin=new THREE.Vector3();
  return {root,update(time,cars,palette){
    const cycle=Math.floor(time/190),t=time%190;if(cycle!==boatCycle){boatCycle=cycle;const p=routePose((cycle*477+80)%TRACK_LENGTH);boat.position.set(p.x+Math.cos(p.yaw)*95,.02,p.z-Math.sin(p.yaw)*95);boat.rotation.y=p.yaw+.45;boatOrigin.copy(boat.position);}
    const a=fade(t,35,90);boat.visible=a>.001;timber.opacity=cloth.opacity=a;boat.position.copy(boatOrigin).addScaledVector(new THREE.Vector3(Math.sin(boat.rotation.y),0,Math.cos(boat.rotation.y)),(t-35)*.24);boat.position.y=.03+Math.sin(time*.43)*.05;
    const mt=time%137,m=palette.night*THREE.MathUtils.smoothstep(mt,76,76.7)*(1-THREE.MathUtils.smoothstep(mt,80,82.5));meteor.visible=m>.001;meteorMat.opacity=m*.55;meteor.position.copy(cars[0].position).add(new THREE.Vector3(-180+(mt-76)*18,160-(mt-76)*5,-260));
    const g=palette.night*fade(time%223,95,143);ghostMat.opacity=g*.23;ghosts.forEach(o=>{o.visible=g>.001;});
  },dispose(){root.traverse(o=>o.geometry?.dispose());ghosts.forEach(g=>{g.traverse(o=>o.geometry?.dispose());g.removeFromParent();});timber.dispose();cloth.dispose();ghostMat.dispose();meteorMat.dispose();root.removeFromParent();}};
}
