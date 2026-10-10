import * as THREE from 'three';
import {BOARDING_Z} from './station-journey.js';
import {FLOOR_TOP} from './train-shell.js';

// Two shallow treads connect the real side-door threshold to the platform.
// All queries use the same world-space path as the visible geometry.
export class BoardingConnection{
  constructor(scene,car,material){
    this.car=car;this.station=null;this.active=false;this.start=new THREE.Vector3();this.end=new THREE.Vector3();this.axis=new THREE.Vector3();this.point=new THREE.Vector3();this.group=new THREE.Group();this.group.name='station-boarding-steps';this.group.visible=false;
    this.geometry=new THREE.BoxGeometry(1,.08,.98);this.steps=[0,1].map(()=>{const m=new THREE.Mesh(this.geometry,material);m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;});scene.add(this.group);
  }
  update(station,progress){
    this.station=station;this.active=Boolean(station&&progress>.97);this.group.visible=this.active;if(!this.active)return;
    this.car.localToWorld(this.start.set(1.47,FLOOR_TOP,BOARDING_Z));station.root.localToWorld(this.end.set(station.platform.nearX+.40,station.platform.top,0));
    this.axis.subVectors(this.end,this.start);this.length=Math.hypot(this.axis.x,this.axis.z);this.axis.y=0;this.axis.divideScalar(this.length);
    this.group.position.set(this.start.x,0,this.start.z);this.group.rotation.y=Math.atan2(-this.axis.z,this.axis.x);
    this.steps.forEach((m,i)=>{m.position.set((i+.5)*this.length/2,THREE.MathUtils.lerp(this.start.y,this.end.y,(i+1)/2)-.04,0);m.scale.x=this.length/2;});
  }
  coordinates(world){
    const dx=world.x-this.start.x,dz=world.z-this.start.z;
    return {along:dx*this.axis.x+dz*this.axis.z,across:-dx*this.axis.z+dz*this.axis.x};
  }
  groundAtStation(x,z){
    if(!this.active)return null;this.station.root.localToWorld(this.point.set(x,0,z));const {along,across}=this.coordinates(this.point);
    if(along<-.38||along>this.length+.12||Math.abs(across)>.29)return null;
    const y=along<=0?this.start.y:along<this.length/2?THREE.MathUtils.lerp(this.start.y,this.end.y,.5):this.end.y;
    return y-this.station.root.position.y;
  }
  occupied(world){if(!this.active)return false;const {along,across}=this.coordinates(world);return Math.abs(across)<.44&&along>-.37&&along<this.length-.10;}
  dispose(){this.geometry.dispose();this.group.removeFromParent();}
}
