// Full-scene coverage is a release gate, not a browser-support assumption.
export const WEBGPU_PENDING=Object.freeze([
 'ocean-depth-reflections','floor-reflections','rain-streaks-and-ripples',
 'snow-billboards','wet-glass','snow-cover','painted-material-hooks',
 'foliage-and-shadow-displacement','headlight-volume-and-water-shadow',
 'photo-bloom-filters-and-export'
]);

export function renderingRequest(search=''){
 const value=String(search).match(/(?:^|[?&])renderer=(webgpu|webgl|auto)(?:&|$)/)?.[1];
 return value??'auto';
}

export function backendDecision({requested='auto',secure=true,gpuAvailable=false,pending=WEBGPU_PENDING}={}){
 if(requested==='webgl')return {backend:'webgl2',reason:'forced-webgl',pending:[]};
 if(!secure)return {backend:'webgl2',reason:'insecure-context',pending:[...pending]};
 if(!gpuAvailable)return {backend:'webgl2',reason:'webgpu-unavailable',pending:[...pending]};
 if(pending.length)return {backend:'webgl2',reason:'scene-migration-incomplete',pending:[...pending]};
 return {backend:'webgpu',reason:'eligible',pending:[]};
}

// Driver must cover the COMPLETE scene. No GLSL ShaderMaterial may reach WebGPU.
// Dependency injection makes startup/cleanup failure behavior directly testable.
export async function createSceneRenderer({createWebGL,loadWebGPU,
 requested=renderingRequest(globalThis.location?.search),
 secure=globalThis.isSecureContext!==false,gpuAvailable=Boolean(globalThis.navigator?.gpu),
 pending=WEBGPU_PENDING}={}){
 const decision=backendDecision({requested,secure,gpuAvailable,pending});
 const status={requested,...decision,errors:[],revision:'170'};
 let renderer;
 if(decision.backend==='webgpu'){
  try{
   const driver=await loadWebGPU();
   renderer=await driver.createRenderer();
   await renderer.init();
   // WebGPURenderer can silently select its OWN WebGL backend. This is not
   // the legacy GLSL-compatible rendering path and must not be mislabeled.
   if(renderer.backend?.isWebGPUBackend!==true)throw Error('WebGPU backend was not selected');
   status.backend='webgpu';
  }catch(error){
   try{renderer?.dispose();}catch{}
   renderer?.domElement?.remove?.();
   status.errors.push(String(error?.message??error));
   status.backend='webgl2';status.reason='webgpu-initialization-failed';
   renderer=null;
  }
 }
 if(!renderer)renderer=createWebGL();
 return {renderer,status};
}

export function auditSceneMaterials(scene){
 const seen=new Set(),incompatible=[];
 scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(!material||seen.has(material))continue;seen.add(material);
  const hook=String(material.onBeforeCompile??'').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
  const customHook=!material.isNodeMaterial&&Boolean(hook)&&!/\{\s*\}$/.test(hook);
  if(material.isShaderMaterial||customHook||object.isReflector||object.isPoints)
   incompatible.push({object:object.name||object.type,material:material.type,
    reason:object.isReflector?'legacy-reflector':object.isPoints?'point-primitive':material.isShaderMaterial?'glsl-shader':'glsl-hook'});
 }});
 return {materials:seen.size,incompatible};
}
