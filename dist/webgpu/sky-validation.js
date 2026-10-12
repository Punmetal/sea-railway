import * as THREE from 'three';
import {createPaintedSky} from '../painted-sky.js';
import {createSkyNodeMaterial,createRenderer} from './sky-material.js';
const status=document.querySelector('#status'),failure=document.querySelector('#failure'),issues=[];
const report=e=>{issues.push(String(e?.message??e));failure.textContent=issues.join('\n');};
addEventListener('error',e=>report(e.error??e.message));addEventListener('unhandledrejection',e=>report(e.reason));
const consoleError=console.error;console.error=(...args)=>{consoleError(...args);report(args.map(String).join(' '));};
const values={day:['#3d99d0','#b8e2e9','#edf9f2','#f7faf1','#849aad','#fff5dd',.60,0,1.02],evening:['#67618a','#edb3a4','#ffcba4','#e3bfd6','#635d81','#ffbf91',.07,0,.99],night:['#0b1639','#3c527e','#687a9a','#586383','#3f557a','#ccdfff',.24,1,1.125]};
const palette=name=>{const v=values[name];return {...Object.fromEntries(['top','horizon','warm','cloud','cloudShadow','sun'].map((k,i)=>[k,new THREE.Color(v[i])])),sunY:v[6],night:v[7],exposure:v[8]};};
let time='evening',elapsed=18,frames=0,gpu,legacy,nodeSky,oldSky,sceneGPU,sceneGL,camera;
try{
 if(!navigator.gpu||!isSecureContext)throw Error('WebGPU is unavailable; this fixture requires secure context and an actual WebGPU device.');
 legacy=new THREE.WebGLRenderer({antialias:true,alpha:false});gpu=await createRenderer();await gpu.init();
 const device=gpu.backend.device;device.addEventListener('uncapturederror',e=>report(e.error));
 const compile=device.createShaderModule.bind(device);device.createShaderModule=descriptor=>{const module=compile(descriptor);module.getCompilationInfo().then(info=>{for(const m of info.messages)if(m.type==='error')report(`${m.lineNum}:${m.linePos} ${m.message}\n${descriptor.code.split('\n').slice(Math.max(0,m.lineNum-2),m.lineNum+1).join('\n')}`);});return module;};
 if(gpu.backend?.isWebGPUBackend!==true)throw Error('Renderer selected WebGL fallback: WebGPU validation not performed');
 for(const r of [legacy,gpu]){r.setPixelRatio(1);r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.99;document.querySelector('#views').append(r.domElement);}
 sceneGL=new THREE.Scene();sceneGPU=new THREE.Scene();camera=new THREE.PerspectiveCamera(68,1,.08,4500);camera.position.set(0,5,0);camera.lookAt(-35,34,-140);
 oldSky=createPaintedSky(sceneGL,{palette:palette(time)});nodeSky=createPaintedSky(sceneGPU,{palette:palette(time)});
 const original=nodeSky.mesh.material;nodeSky.mesh.material=createSkyNodeMaterial(nodeSky.uniforms);original.dispose();
 const resize=()=>{const w=Math.floor(innerWidth/2),h=Math.floor(innerHeight*.62);legacy.setSize(w,h);gpu.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();addEventListener('resize',resize);
 status.textContent='Compiling authored sky on WebGPU…';
 await Promise.race([gpu.compileAsync(sceneGPU,camera),new Promise((_,reject)=>setTimeout(()=>reject(Error('WebGPU pipeline compilation timed out after 15 seconds')),15000))]);
 let previous=performance.now();const loop=now=>{const dt=Math.min(.05,(now-previous)/1000);previous=now;elapsed+=dt;const p=palette(time);oldSky.update(elapsed,p,dt);nodeSky.update(elapsed,p,dt);
  for(const r of [legacy,gpu])r.toneMappingExposure=p.exposure;
  legacy.render(sceneGL,camera);gpu.render(sceneGPU,camera);frames++;
  status.textContent=JSON.stringify({scope:'sky subsystem only',backend:gpu.backend?.isWebGPUBackend?'webgpu':'unexpected',time,frames,errors:issues.length,textureReady:[oldSky.uniforms.uReady.value,nodeSky.uniforms.uReady.value],revision:THREE.REVISION},null,2);
  if(saveNext){saveNext=false;const c=document.createElement('canvas');c.width=legacy.domElement.width*2;c.height=legacy.domElement.height;const ctx=c.getContext('2d');ctx.drawImage(legacy.domElement,0,0);ctx.drawImage(gpu.domElement,legacy.domElement.width,0);c.toBlob(b=>{if(!b)return report('PNG encoding failed');const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Sea-Railway-sky-'+time+'-GLSL-WebGPU.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000);});}
  requestAnimationFrame(loop);
 };requestAnimationFrame(loop);
 document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>time=b.dataset.time);
}catch(error){report(error);status.textContent='WebGPU validation FAILED / not measured';gpu?.dispose();legacy?.dispose();}
let saveNext=false;document.querySelector('#capture').onclick=()=>saveNext=true;
addEventListener('pagehide',()=>{gpu?.dispose();legacy?.dispose();oldSky?.dispose();nodeSky?.mesh.material.dispose();nodeSky?.dispose();});
