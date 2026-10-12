import * as GPU from '../vendor/webgpu-r170/three.webgpu.js';
import {createSkyGraph} from './sky-graph.js';

// Only the authored sky subsystem is migrated here. This is NOT a full-scene
// driver: renderer-runtime keeps the complete game on its compatible WebGL path.
export function createSkyNodeMaterial(uniforms){
 const graph=createSkyGraph(uniforms),material=new GPU.MeshBasicNodeMaterial({side:GPU.BackSide,depthWrite:false,fog:false});
 material.name='painted-sky-tsl-r170';
 const clip=GPU.modelViewProjection(GPU.positionGeometry);
 material.vertexNode=GPU.vec4(clip.xy,clip.w,clip.w);
 material.fragmentNode=graph.skyFragment();
 return material;
}

export async function createRenderer(options={}){
 return new GPU.WebGPURenderer({antialias:true,alpha:false,...options});
}
