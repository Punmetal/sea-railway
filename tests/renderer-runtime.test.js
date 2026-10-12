import assert from 'node:assert/strict';
import {backendDecision,createSceneRenderer,renderingRequest,auditSceneMaterials,WEBGPU_PENDING} from '../dist/renderer-runtime.js';
assert.equal(renderingRequest('?renderer=webgpu&benchmark=1'),'webgpu');
assert.equal(renderingRequest('?other=webgpu'),'auto');
assert.equal(renderingRequest('?renderer=invalid'),'auto');
assert.equal(backendDecision({requested:'webgl',gpuAvailable:true,pending:[]}).reason,'forced-webgl');
assert.equal(backendDecision({secure:false,gpuAvailable:true,pending:[]}).reason,'insecure-context');
assert.equal(backendDecision({gpuAvailable:false}).reason,'webgpu-unavailable');
assert.equal(backendDecision({gpuAvailable:true}).reason,'scene-migration-incomplete');
assert(WEBGPU_PENDING.includes('photo-bloom-filters-and-export'));
let loads=0,disposals=0,removals=0;
const legacy={legacy:true};
const options={createWebGL:()=>legacy,gpuAvailable:true,secure:true,loadWebGPU:async()=>{loads++;return {createRenderer:async()=>({backend:{isWebGPUBackend:true},init:async()=>{},dispose(){disposals++;},domElement:{remove(){removals++;}}})};}};
let result=await createSceneRenderer(options);assert.equal(result.renderer,legacy);assert.equal(loads,0,'Incomplete scene cannot allocate a GPU renderer');
result=await createSceneRenderer({...options,pending:[]});assert.equal(result.status.backend,'webgpu');assert.equal(loads,1);
for(const kind of ['adapter-failure','silent-webgl-backend']){
 result=await createSceneRenderer({...options,pending:[],loadWebGPU:async()=>({createRenderer:async()=>({backend:{isWebGPUBackend:kind!=='silent-webgl-backend'},init:async()=>{if(kind==='adapter-failure')throw Error('requestDevice failed');},dispose(){disposals++;},domElement:{remove(){removals++;}}})})});
 assert.equal(result.renderer,legacy);assert.equal(result.status.reason,'webgpu-initialization-failed');assert.equal(result.status.errors.length,1);
}
assert.equal(disposals,2);assert.equal(removals,2);
await assert.rejects(createSceneRenderer({createWebGL(){throw Error('No graphics device');},gpuAvailable:false}),/No graphics device/);
const defaultMaterial={type:'MeshStandardMaterial',onBeforeCompile:function onBeforeCompile(/*shader, renderer*/) {}},glsl={type:'ShaderMaterial',isShaderMaterial:true},hook={type:'MeshStandardMaterial',onBeforeCompile:shader=>shader.fragmentShader+='effect'};
const audit=auditSceneMaterials({traverse(fn){for(const o of [{name:'ordinary',material:defaultMaterial},{name:'sky',material:glsl},{name:'other-sky',material:glsl},{name:'paint',material:hook},{name:'snow',isPoints:true,material:{type:'PointsMaterial'}}])fn(o);}});
assert.equal(audit.materials,4);assert.deepEqual(audit.incompatible.map(x=>x.reason),['glsl-shader','glsl-hook','point-primitive']);
console.log('Renderer selection, scene gate, genuine backend labeling and failed-device cleanup pass (CPU tests).');
