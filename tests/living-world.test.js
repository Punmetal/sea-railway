import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {routePose,TRACK_LENGTH,CAR_SPACING} from '../dist/physics.js';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {createRouteVistas}=await import('../dist/route-vistas.js');
const {createInteriorLife}=await import('../dist/interior-life.js');
const {CinematicCamera}=await import('../dist/cinematic-camera.js');
const scene=new THREE.Scene(),vistas=createRouteVistas(scene),cars=[new THREE.Group(),new THREE.Group()];
const materials={straps:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),floor:new THREE.MeshStandardMaterial(),seat:new THREE.MeshStandardMaterial(),wall:new THREE.MeshStandardMaterial()};
for(const [i,car] of cars.entries()){const model=new THREE.Group();model.name='reference-train-model';model.rotation.y=i*Math.PI;car.add(model);scene.add(car);for(const key of ['floor','seat','wall']){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),materials[key]);mesh.name='train-'+key;model.add(mesh);}}
const life=createInteriorLife(cars,{materials}),palette={sunY:.6,night:0,sun:new THREE.Color('#fff5dd')},matrix=new THREE.Matrix4(),next=new THREE.Matrix4();
life.update(1/60,0,6.495,palette);life.groups[0].loops.getMatrixAt(0,matrix);life.update(1/60,.1,6.495,palette);life.groups[0].loops.getMatrixAt(0,next);assert(matrix.elements.some((v,i)=>Math.abs(v-next.elements[i])>.00001));
for(let i=0;i<500;i++)life.update(1/60,i/60,0,palette);life.groups[0].loops.getMatrixAt(0,matrix);life.update(1/60,9,0,palette);life.groups[0].loops.getMatrixAt(0,next);assert(matrix.elements.every((v,i)=>Math.abs(v-next.elements[i])<.00001),'Straps settle when stopped.');
for(const g of life.groups){assert.equal(g.loops.count,26);assert([...g.loops.instanceMatrix.array].every(Number.isFinite));}
cars[0].rotation.y=1.2;life.update(1/60,10,-6.495,palette);const sun=life.groups[0].projections[0].uniforms.uWindowSun.value;assert(Math.abs(sun.length()-1)<1e-6);
const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};life.groups[0].projections[0].material.onBeforeCompile(shader);assert(shader.fragmentShader.includes('windowMask(vCarSurface)'));assert(shader.vertexShader.includes('vCarSurface=position;'));assert(shader.uniforms.uWindowSun);
assert.equal(vistas.landmarks.length,2);assert(!vistas.landmarks.some(s=>s.name==='empty-water-stop'),'The little stop is part of the main second station.');assert.equal(vistas.poles.length,17);let minimumRailGap=Infinity;
for(const pole of vistas.poles)for(let d=0;d<TRACK_LENGTH;d+=2){const p=routePose(d);minimumRailGap=Math.min(minimumRailGap,Math.hypot(p.x-pole.position.x,p.z-pole.position.z));}assert(minimumRailGap>11.5);
vistas.updatePalette({lamps:1});assert.equal(vistas.materials.windows.emissiveIntensity,.75);
const camera=new CinematicCamera({root:new THREE.Group(),cameraObstacles:[],lightTarget:new THREE.Vector3(1e5,0,0),routeVistas:vistas});
let checks=0;for(const direction of [-1,1]){camera.start(direction);for(let frame=0;frame<960;frame++){const distance=frame/960*TRACK_LENGTH;cars.forEach((car,i)=>{const p=routePose(distance-i*CAR_SPACING);car.position.set(p.x,0,p.z);car.rotation.y=p.yaw;});const shot=camera.update(.5,cars,direction*6.495);assert([...shot.position.toArray()].every(Number.isFinite));for(const b of vistas.cameraObstacles){const dx=shot.position.x-b.x,dz=shot.position.z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);if(Math.abs(dx*c-dz*s)<=b.halfX&&Math.abs(dx*s+dz*c)<=b.halfZ){assert(shot.position.y>=b.height+1.49);checks++;}}}}
vistas.root.traverse(o=>{if(o.isMesh)for(const a of Object.values(o.geometry.attributes))assert([...a.array].every(Number.isFinite));});
life.dispose();vistas.dispose();console.log(JSON.stringify({checks:'strap swing/settling, sun projection hooks, finite scenery, pole clearance, landmark lighting, cinematic obstacle clearance both directions',minimumRailGap,cameraObstacleChecks:checks}));
