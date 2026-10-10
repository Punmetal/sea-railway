import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}})})};
const {createTrainModel}=await import('../dist/train-model.js'),{createSnow}=await import('../dist/weather.js'),{createTrainLights}=await import('../dist/train-light.js'),{createSeaWater}=await import('../dist/sea-water.js');
const scene=new THREE.Scene(),train=createTrainModel({scene,coarse:false,guardReflection(){}}),ray=new THREE.Raycaster();let portalChecks=0;
for(const [i,car] of train.cars.entries()){
 const model=car.getObjectByName('reference-train-model'),door=train.sideDoors[i].leaf,meshes=[];model.traverse(o=>{if(o.isMesh&&!o.isReflector&&!o.material.transparent)meshes.push(o);});
 function hit(y,z){scene.updateMatrixWorld(true);ray.set(model.localToWorld(new THREE.Vector3(1.9,y,z)),new THREE.Vector3(-1,0,0).transformDirection(model.matrixWorld));ray.far=.65;return ray.intersectObjects(meshes,false);}
 assert(hit(2.09,6.18).length,'The belt line is present on the closed door.');
 door.position.set(.20,0,1.12);
 for(const y of [1.22,1.62,2.05,2.09,2.14,2.64,3.10])for(const z of [5.90,6.18,6.46]){assert.equal(hit(y,z).length,0,`Open side portal ${i}/${y}/${z} is unobstructed.`);portalChecks++;}
 door.position.set(0,0,0);assert(hit(2.09,6.18).length,'The belt line returns with the closing leaf.');
}
const palette={horizon:new THREE.Color('#3c527e'),sea:new THREE.Color('#253f68'),sun:new THREE.Color('#ccdfff'),sunY:.24},camera=new THREE.PerspectiveCamera();camera.position.set(0,12,24);
const snow=createSnow(scene,train.cars),reflectedCamera=camera.clone(),renderer={domElement:{width:3840},getRenderTarget:()=>({width:1024}),shadowMap:{enabled:true}};
snow.update(42,camera,palette,1,2);snow.mesh.onBeforeRender(renderer,scene,reflectedCamera);assert.equal(snow.uniforms.uSnowReflection.value,1);assert(Math.abs(snow.uniforms.uPixelRatio.value-2*1024/3840)<1e-10,'A smaller reflection target does not inflate snow sprites.');
snow.mesh.onBeforeRender(renderer,scene,camera);assert.equal(snow.uniforms.uSnowReflection.value,0);assert.equal(snow.uniforms.uPixelRatio.value,2);assert.equal(snow.uniforms.uTime.value,42);
const water={material:new THREE.ShaderMaterial({uniforms:{uTime:{value:42}},fragmentShader:'void main(){vec3 waves=vec3(0.);vec3 col=vec3(0.);col*=mix(.83,1.,getShadowMask());}'}),onBeforeRender(){}};
const lights=createTrainLights({cars:train.cars,materials:train.materials,water});lights.update({lamps:1},{snow:1},{speed:6});scene.updateMatrixWorld(true);const beam=lights.beams[0];beam.light.shadow.updateMatrices(beam.light);beam.light.shadow.map=new THREE.WebGLRenderTarget(512,512);
beam.mesh.onBeforeRender(renderer,scene,camera);assert.equal(beam.uniforms.uBeamShadowReady.value,1);assert.equal(beam.uniforms.uBeamShadow.value,beam.light.shadow.map.texture);assert(beam.uniforms.uBeamShadowMatrix.value.equals(beam.light.shadow.matrix));assert.equal(beam.uniforms.uBeamReflection.value,0);
reflectedCamera.position.y=-12;beam.mesh.onBeforeRender(renderer,scene,reflectedCamera);assert.equal(beam.uniforms.uBeamReflection.value,1,'Only the lamp and the surface footprint reflect, not the fog volume.');water.onBeforeRender(renderer,scene,camera);assert.equal(water.material.uniforms.uHeadShadow.value,beam.light.shadow.map.texture);assert.equal(water.material.uniforms.uHeadTime,water.material.uniforms.uTime);
const pole=beam.root.localToWorld(new THREE.Vector3(0,0,15)),projected=new THREE.Vector4(pole.x,pole.y,pole.z,1).applyMatrix4(beam.light.shadow.matrix);projected.divideScalar(projected.w);assert(Math.abs(projected.x-.5)<1e-6&&Math.abs(projected.y-.5)<1e-6,'Occlusion projects down the actual lamp axis.');
lights.update({lamps:1},{snow:0},{speed:-6});assert.equal(beam.light.castShadow,false);assert.equal(lights.beams[1].light.castShadow,true);lights.setQuality('low');assert.equal(beam.light.shadow.map,null,'Quality resize releases the old lamp shadow allocation.');lights.dispose();
const sea=createSeaWater(scene,{palette});camera.lookAt(0,1.8,0);camera.updateMatrixWorld();scene.updateMatrixWorld();sea.onBeforeRender({xr:{enabled:false},shadowMap:{autoUpdate:true},state:{buffers:{depth:{setMask(){}}}},getRenderTarget:()=>null,setRenderTarget(){},render(){}},scene,camera);
let ridgeChecks=0;for(const x of [-900,-500,0,500,900])for(const height of [2,18,35]){const point=new THREE.Vector3(x,height,-1500),ndc=point.clone().project(sea.camera),depth=(ndc.z+1)/2;if(ndc.x>=-1&&ndc.x<=1&&ndc.y>=-1&&ndc.y<=1&&depth>=0&&depth<1){assert(depth<.99999994,'Visible ridge depth is distinguished from the painted sky far plane.');ridgeChecks++;}}
assert(ridgeChecks>0);sea.dispose();snow.dispose();console.log(JSON.stringify({checks:'both boarding portals and closing belt line, reflection snow scale reset, shared lamp shadow binding, actual shadow projection, reverse/quality disposal, distant ridges versus sky depth',portalChecks,ridgeChecks}));
