import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){return specifier==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:nextResolve(specifier,context);}});
const {createWheelWater,WATER_LEVEL,WHEEL_CONTACTS}=await import('../dist/wheel-water.js');
const {makeWaterGeometry}=await import('../dist/sea-water.js');

assert.equal(WHEEL_CONTACTS.length,16);
const scene=new THREE.Scene(),cars=[new THREE.Group(),new THREE.Group()];
cars[1].position.z=-18.75;cars.forEach(c=>scene.add(c));
const effects=createWheelWater(scene,cars),sea=new THREE.Color('#706ca0'),horizon=new THREE.Color('#edb3a4');
for(let step=0;step<=60;step++)effects.update(step/60,6.495,sea,horizon);
assert.equal(effects.rings.count,80);assert.equal(effects.drops.count,112);
const a=new THREE.Matrix4(),b=new THREE.Matrix4(),pa=new THREE.Vector3(),pb=new THREE.Vector3(),sa=new THREE.Vector3(),sb=new THREE.Vector3(),q=new THREE.Quaternion();
effects.rings.getMatrixAt(0,a);a.decompose(pa,q,sa);
assert(effects.rings.geometry.attributes.aFade.getX(0)>0);
cars[0].position.z+=10;effects.update(1.1,6.495,sea,horizon);
effects.rings.getMatrixAt(0,b);b.decompose(pb,q,sb);
assert(pa.distanceTo(pb)<.03,'An emitted crest must stay behind when the train advances.');
assert(sb.x>sa.x,'An emitted crest must expand.');
effects.update(2.3,6.495,sea,horizon);
let widest=0;
for(let i=0;i<64;i++){
  effects.rings.getMatrixAt(i,a);a.decompose(pa,q,sa);
  if(effects.rings.geometry.attributes.aFade.getX(i)>.30)widest=Math.max(widest,sa.x);
}
assert(widest>3.5,'Visible waves must reach several metres beyond the wheels.');
for(const mesh of [effects.rings,effects.drops]){
  assert([...mesh.instanceMatrix.array].every(Number.isFinite));
  assert([...mesh.geometry.attributes.aFade.array].every(v=>v>=0&&v<=1));
}
effects.update(10,0,sea,horizon);
assert([...effects.rings.geometry.attributes.aFade.array].every(v=>v===0),'Old waves must fade after stopping.');
assert([...effects.drops.geometry.attributes.aFade.array].every(v=>v===0));
const mobile=createWheelWater(scene,cars,{coarse:true});assert.equal(mobile.rings.count,64);assert.equal(mobile.drops.count,64);
for(const coarse of [false,true]){
  const geometry=makeWaterGeometry(coarse),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&p.getZ(i)===0);
  assert(geometry.boundingSphere.radius>4200);
  geometry.dispose();
}
effects.dispose();mobile.dispose();
console.log('Water: 16 contacts, broad expansion, persistent trail, natural fade, stopped emissions, mobile budget and finite water geometry passed.');
