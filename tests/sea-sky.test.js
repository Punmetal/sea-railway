import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
globalThis.document={createElementNS(){return {addEventListener(){},removeEventListener(){},set src(v){}};}};
const {createSeaWater}=await import('../dist/sea-water.js'),{createPaintedSky}=await import('../dist/painted-sky.js');
const scene=new THREE.Scene(),palette={top:new THREE.Color('#0b1639'),horizon:new THREE.Color('#3c527e'),sea:new THREE.Color('#253f68'),sun:new THREE.Color('#ccdfff'),warm:new THREE.Color('#687a9a'),cloud:new THREE.Color('#586383'),cloudShadow:new THREE.Color('#3f557a'),sunY:.24,night:1},water=createSeaWater(scene,{palette}),sky=createPaintedSky(scene,{palette});
const target=water.getRenderTarget(),uniforms=water.material.uniforms;assert(target.depthTexture.isDepthTexture&&target.depthTexture.type===THREE.UnsignedIntType);assert.equal(target.samples,0);assert.equal(uniforms.tReflectionDepth.value,target.depthTexture);assert.equal(uniforms.uReflectionWorld.value,water.camera.matrixWorld);
let renders=0,renderTarget=null;const renderer={xr:{enabled:false},shadowMap:{autoUpdate:true},state:{buffers:{depth:{setMask(){}}}},getRenderTarget:()=>renderTarget,setRenderTarget:t=>{renderTarget=t;},render(){renders++;}};
for(const height of [2.6,12,60])for(const heading of [0,.8,2.4,-2.9]){
 const camera=new THREE.PerspectiveCamera(48,1.5,.08,4500);camera.position.set(Math.sin(heading)*24,height,Math.cos(heading)*24);camera.lookAt(0,1.8,0);camera.updateMatrixWorld();scene.updateMatrixWorld();renders=0;water.onBeforeRender(renderer,scene,camera);assert.equal(renders,1,'Depth comes from the existing reflection pass.');assert.equal(renderTarget,null);assert(water.visible);assert(renderer.shadowMap.autoUpdate);
 const identity=uniforms.uReflectionInverseProjection.value.clone().multiply(water.camera.projectionMatrix);identity.elements.forEach((v,i)=>assert(Math.abs(v-(i%5===0?1:0))<1e-8,'Depth reconstruction uses the actual oblique projection.'));
 for(const h of [.3,2,6,12]){
  const world=new THREE.Vector3(1,h,-4),ndc=world.clone().project(water.camera),reconstructed=new THREE.Vector4(ndc.x,ndc.y,ndc.z,1).applyMatrix4(uniforms.uReflectionInverseProjection.value);reconstructed.divideScalar(reconstructed.w).applyMatrix4(uniforms.uReflectionWorld.value);assert(world.distanceTo(new THREE.Vector3(reconstructed.x,reconstructed.y,reconstructed.z))<1e-8);
 }
}
for(const n of [256,512,1024]){target.setSize(n,n);assert.equal(uniforms.tReflectionDepth.value,target.depthTexture,'Quality changes keep the same depth source binding.');}
sky.update(15,palette,1/60);assert.equal(sky.uniforms.uNight.value,1);assert.equal(sky.uniforms.uTime.value,15);sky.update(15,{...palette,night:0},0);assert.equal(sky.uniforms.uTime.value,15,'Aurora shares the frozen game/photo clock.');assert.equal(sky.uniforms.uNight.value,0);assert.equal(sky.uniforms.uAurora.value,1);assert(sky.mesh.material.fragmentShader.includes('paintedAurora(d,uTime)'));assert(sky.mesh.material.fragmentShader.includes('1.-clouds.a*.90'));assert(sky.mesh.material.vertexShader.includes('gl_Position.z=gl_Position.w'));
water.dispose();sky.dispose();console.log('Sea/sky: depth textures, twelve actual oblique reflection-camera matrices, world-position recovery, one reflection pass, quality depth binding and shared night/freeze clock passed.');
