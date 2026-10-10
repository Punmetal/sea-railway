import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const {createTrainModel}=await import('../dist/train-model.js');
const {roofHeight,frontZ,cabWidth}=await import('../dist/train-shell.js');
const {routePose,TRACK_LENGTH,CAR_SPACING}=await import('../dist/physics.js');
const scene=new THREE.Scene(),train=createTrainModel({scene,coarse:false,guardReflection(){}});
train.cars[1].position.z=-18.75;scene.updateMatrixWorld(true);
const ray=new THREE.Raycaster();let casts=0;
for(const car of train.cars){
  const model=car.getObjectByName('reference-train-model'),all=[],opaque=[];
  model.traverse(o=>{if(o.isMesh&&!o.isReflector){all.push(o);if(!o.material.transparent)opaque.push(o);}});
  const cast=(origin,direction,far=2,objects=all)=>{casts++;ray.set(model.localToWorld(new THREE.Vector3(...origin)),new THREE.Vector3(...direction).transformDirection(model.matrixWorld));ray.far=far;const h=ray.intersectObjects(objects,false)[0];if(h)h.local=model.worldToLocal(h.point.clone());return h;};
  // The exact under-window strip that leaked in the screenshots, at both faces.
  for(let z=-8.68;z<7.85;z+=.19)for(let y=1.12;y<2.17;y+=.067)for(const side of [-1,1]){
    const out=cast([side*2,y,z],[-side,0,0],.80,opaque);
    assert(out&&Math.abs(out.local.x)>1.29,`Exterior lower-wall leak ${car.name} ${side}/${y}/${z}`);
    assert(cast([side*1.21,y,z],[side,0,0],.39,opaque),`Interior lower-wall leak ${car.name} ${side}/${y}/${z}`);
  }
  // Scan the complete window-height side band, including the short blank strips
  // by the entrances and the small cab window. Any view out crosses glass.
  for(let z=-8.65;z<7.85;z+=.13)for(const y of [2.175,2.205,2.35,2.72,3.14,3.265,3.32])for(const side of [-1,1]){
    assert(cast([side*2,y,z],[-side,0,0],.81),`Unglazed side opening ${car.name} ${side}/${y}/${z}`);
  }
  for(let z=-8.64;z<8.00;z+=.31)for(let x=-1.23;x<=1.23;x+=.205){
    assert(cast([x,4.70,z],[0,-1,0],1.45,opaque),`Outer roof hole ${car.name} ${x}/${z}`);
    assert(cast([x,3.30,z],[0,1,0],1,opaque),`Inner ceiling hole ${car.name} ${x}/${z}`);
    if(z>=-8.53||Math.abs(x)<.465){const floor=cast([x,1.20,z],[0,-1,0],.20,opaque.filter(o=>o.material===train.materials.floor));
      assert(floor&&Math.abs(floor.local.y-1.095)<.004,`Floor hole ${car.name} ${x}/${z}`);}
  }
  // Roof/end seams, including rays just beneath the curved edge, not only
  // broad surfaces that could hide a narrow gap between differently curved pieces.
  for(let t=-.97;t<=.97;t+=.023){
    for(const below of [.005,.025,.06,.15,.30]){
      const y=roofHeight(t)-below,x=t*cabWidth(y);
      assert(cast([x,y,frontZ(x,y)+.30],[0,0,-1],.60,opaque),`Nose/roof seam ${car.name} ${t}/${below}`);
      const rearX=t*1.47;
      assert(cast([rearX,y,-9.10],[0,0,1],.70,opaque),`Rear/roof seam ${car.name} ${t}/${below}`);
    }
  }
  // Both cabs are sealed below the glazing and along the bowed side/nose joins.
  for(let y=1.12;y<3.38;y+=.073)for(let x=-1.15;x<=1.15;x+=.095){
    assert(cast([x,y,7.95],[0,0,1],1.45),`Unsealed cab front ${car.name} ${x}/${y}`);
  }
  for(let y=1.12;y<3.38;y+=.093)for(const side of [-1,1])for(let u=.02;u<.98;u+=.087){
    const z=THREE.MathUtils.lerp(7.85,frontZ(cabWidth(y),y),u);
    assert(cast([0,y,z],[side,0,0],1.65),`Unsealed cab side ${car.name} ${side}/${y}/${z}`);
  }
  // Lens must be the first visible surface, not buried in the roof/housing.
  assert.equal(cast([0,4.215,9],[0,0,-1],1.5,opaque)?.object.material,train.materials.headlight);
  for(const kind of ['gangway','cab']){
    const leaf=model.getObjectByName(kind+'-door-'+(train.cars.indexOf(car)+1)),z=leaf.position.z;
    for(const side of [-1,1])for(let x=-.45;x<.46;x+=.09)for(const y of [1.10,1.3,2.12,2.20,2.64,3.079,3.185,3.195])
      assert(cast([x,y,z+side*.45],[0,0,-side],.90),`Closed ${kind} door/frame gap ${car.name} ${x}/${y}/${side}`);
    leaf.position.x=.78;scene.updateMatrixWorld(true);
    for(const side of [-1,1]){
      assert.equal(cast([0,1.62,z+side*.45],[0,0,-side],.90,opaque),undefined,'Open door clears the passage');
      for(const x of [.52,.70,1,1.25])for(const y of [1.3,2.12,2.64,3.10]){
        const h=cast([x,y,z+side*.45],[0,0,-side],.60,opaque);
        assert(h&&Math.abs(h.local.z-z)>=.149,'The pocket skins must cover the parked leaf and its handles');
      }
      assert.equal(cast([.40,2,z+side*.117],[1,0,0],.80,opaque),undefined,'The pocket jamb needs a real slot, not a solid cap across the sliding leaf');
    }
    leaf.position.x=0;scene.updateMatrixWorld(true);
  }
  for(const mesh of opaque){const p=mesh.geometry.attributes.position;
    if(mesh.material===train.materials.seat)for(let i=0;i<p.count;i++){
      assert(Math.abs(p.getX(i))<1.304,'Leather must stay inside the wall');
      if(p.getY(i)>2.10)assert(Math.abs(p.getX(i))<1.249,'Backrests must clear the inner window trim');
    }
    if(mesh.material===train.materials.wood)for(let i=0;i<p.count;i++){
      const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
      assert(!(x>.68&&x<1.27&&y>1.70&&y<2.23&&z>-6.70&&z<5.43),'A wooden ledge/cap still crosses the leather or arm rail');
    }
  }
}
assert(Math.abs(train.connection.children[0].geometry.parameters.height-.08)<1e-6,'Gangway floor shares carriage floor height');
let jointChecks=0;
for(let distance=0;distance<TRACK_LENGTH;distance+=40){
  for(const [i,car]of train.cars.entries()){const pose=routePose(distance-i*CAR_SPACING);car.position.set(pose.x,-.1,pose.z);car.rotation.y=pose.yaw;}
  train.updateGangway();scene.updateMatrixWorld(true);
  const floor=train.connection.children[0],p=floor.geometry.attributes.position;
  for(const [i,car]of train.cars.entries())for(const x of [-.515,.515]){
    const target=car.localToWorld(new THREE.Vector3(x,1.095,i===0?-8.83:8.83));let gap=Infinity;
    for(let n=0;n<p.count;n++)gap=Math.min(gap,floor.localToWorld(new THREE.Vector3().fromBufferAttribute(p,n)).distanceTo(target));
    assert(gap<2e-6,'Bridge corners must meet both floor thresholds on every curve');jointChecks++;
  }
}
console.log(JSON.stringify({checks:'both mirrored shells: lower wall inside/out, glazed side band, roof/end seams, cab side/front, shaped floor, unobstructed headlights, seat/wood clearance, sealed closed doors and real sliding pockets, articulated bridge corners throughout the route',rayChecks:casts,jointChecks}));
