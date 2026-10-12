// Generate a reviewable TSL port from the existing authored sky equations.
// Three.js r170's official GLSL decoder/TSL encoder are vendored with MIT license.
import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
globalThis.self=globalThis;
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {default:Decoder}=await import('./vendor/transpiler/GLSLDecoder.js');
const {default:Encoder}=await import('./vendor/transpiler/TSLEncoder.js');
const {createPaintedSky}=await import('../dist/painted-sky.js');
const THREE=await import('../dist/vendor/three.module.js');
globalThis.document={createElementNS(){return {addEventListener(){},set src(v){}};}};
const palette=Object.fromEntries(['top','horizon','warm','cloud','cloudShadow','sun'].map(k=>[k,new THREE.Color()]));
const sky=createPaintedSky(new THREE.Scene(),{palette});
let source=sky.mesh.material.fragmentShader;
const uniforms=new Map();
source=source.replace(/uniform\s+(\w+)\s+([^;]+);/g,(_,type,names)=>{for(const name of names.split(','))uniforms.set(name.trim(),type);return '';});
source=source.replace(/varying\s+\w+\s+[^;]+;/g,'').replace(/#include[^\n]+/g,'');
source=source.replace('void main()','vec4 skyFragment()').replace('gl_FragColor=','return ');
// Every atan call in the authored sky has two operands; WGSL names it atan2.
source=source.replace(/\batan\(/g,'atan2(');
const encoder=new Encoder();encoder.iife=true;
const ast=new Decoder().parse(source);
ast.body.find(node=>node.name==='skyFragment').layout=false;
let code=encoder.emit(ast);
// Sampler gradients are explicitly preserved.
code=code.replace('( function ( TSL, uniforms ) {','export function createSkyGraph(uniforms) {');
code=code.replace(/\n\} \);\s*$/,'\n}');
const bindings=[...uniforms].map(([name,type])=>type==='sampler2D'?`const ${name}=TSL.texture(uniforms.${name}.value);`:`const ${name}=TSL.reference('value',uniforms.${name}.value?.isColor?'color':'${type}',uniforms.${name});`).join('\n');
code=code.replace('export function createSkyGraph(uniforms) {',`export function createSkyGraph(uniforms) {\n${bindings}\nconst vDirection=TSL.varying(TSL.positionGeometry);\nconst textureGrad=(image,uv,dx,dy)=>image.uv(uv).grad(dx,dy);`);
code="// GENERATED: run node scripts/generate-sky-tsl.mjs; original sky/cloud/aurora equations.\nimport * as TSL from '../vendor/webgpu-r170/three.webgpu.js';\n"+code;
await fs.mkdir(new URL('../dist/webgpu/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../dist/webgpu/sky-graph.js',import.meta.url),code);
console.log('Generated sky graph:',uniforms.size,'live uniform bindings');
