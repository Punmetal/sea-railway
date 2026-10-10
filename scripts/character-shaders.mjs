// Export the game's real character buffers and material shaders for native
// component QA. This is a cutaway fixture, not a browser/whole-scene capture.
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {createChihiro}=await import('../dist/chihiro.js'),{createNoFace}=await import('../dist/no-face.js'),{addPaintSurface}=await import('../dist/visual-style.js'),{createShelterUniforms}=await import('../dist/weather-shelters.js');
const car=new THREE.Group(),child=createChihiro(car),noFace=createNoFace(car),context=new THREE.Group();car.add(context);
const seat=new THREE.MeshStandardMaterial({color:0xa23e46,roughness:.60}),wood=new THREE.MeshStandardMaterial({color:0x926841,roughness:.77}),floor=new THREE.MeshStandardMaterial({color:0xd0ac7d,roughness:.6}),brass=new THREE.MeshStandardMaterial({color:0xb69b59,roughness:.6}),sky=new THREE.MeshStandardMaterial({color:0x97cad4,roughness:1});
function box(w,h,d,mat,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);context.add(mesh);}
box(.61,.23,4.45,seat,-.995,1.55,1.65);box(.21,.68,4.45,seat,-1.16,1.91,1.65);box(.61,.32,4.45,wood,-.995,1.30,1.65);box(2.55,.06,4.55,floor,-.15,1.065,1.65);
box(.05,2.10,4.55,sky,-1.43,2.37,1.65);box(.065,.04,4.55,brass,-1.299,2.15,1.65);box(.08,.055,4.55,wood,-1.299,3.29,1.65);
for(const z of [.215,1.685,3.155])box(.04,1.16,.055,brass,-1.299,2.72,z);
const uniforms={uPaintTop:{value:new THREE.Color('#3d99d0')},uPaintHorizon:{value:new THREE.Color('#b8e2e9')},uPaintSea:{value:new THREE.Color('#429bb4')},uPaintNight:{value:0},uPaintRain:{value:0},uPaintMist:{value:0},...createShelterUniforms([])},materialIndices=new Map(),programs=[],meshes=[];
const numbers={NUM_DIR_LIGHTS:3,NUM_POINT_LIGHTS:0,NUM_HEMI_LIGHTS:1,NUM_SPOT_LIGHTS:0,NUM_RECT_AREA_LIGHTS:0,NUM_DIR_LIGHT_SHADOWS:0,NUM_POINT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_SHADOWS:0,NUM_SPOT_LIGHT_MAPS:0,NUM_SPOT_LIGHT_COORDS:0,NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS:0,NUM_CLIPPING_PLANES:0,UNION_CLIPPING_PLANES:0};
function expand(s){s=s.replace(/#include <(\w+)>/g,(_,n)=>expand(THREE.ShaderChunk[n]));for(const [key,n]of Object.entries(numbers).sort((a,b)=>b[0].length-a[0].length))s=s.replaceAll(key,String(n));return s.replace(/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,(_,start,end,body)=>Array.from({length:Number(end)-Number(start)},(_,i)=>body.replace(/\[\s*i\s*\]/g,'[ '+(i+Number(start))+' ]').replaceAll('UNROLLED_LOOP_INDEX',String(i+Number(start)))).join('\n'));}
const vp='uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;uniform mat3 normalMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;attribute vec3 normal;';
const fp='uniform mat4 viewMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n'+THREE.ShaderChunk.tonemapping_pars_fragment+'\nvec3 toneMapping(vec3 c){return ACESFilmicToneMapping(c);}\n'+THREE.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 c){return sRGBTransferOETF(c);}\n';
car.updateMatrixWorld();car.traverse(o=>{if(!o.isMesh)return;const mat=o.material;
 if(!materialIndices.has(mat)){
  if(!mat.transparent)addPaintSurface(mat,uniforms,{kind:[wood,floor].includes(mat)?'wood':'general'});
  const s={vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};mat.onBeforeCompile(s);
  const defines='#define TONE_MAPPING\n'+(mat.side===THREE.DoubleSide?'#define DOUBLE_SIDED\n':'');materialIndices.set(mat,programs.length);programs.push({name:o.name||'cutaway-material-'+programs.length,vertex:defines+vp+'\n'+expand(s.vertexShader),fragment:defines+fp+expand(s.fragmentShader)});
 }
 const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry;meshes.push({name:o.name,scope:o.parent===context?'context':o.name.startsWith('no-face')?'no-face':child.group.getObjectById(o.id)?'child':'companion',program:materialIndices.get(mat),positions:Array.from(geo.attributes.position.array),normals:Array.from(geo.attributes.normal.array),uv:geo.attributes.uv?Array.from(geo.attributes.uv.array):Array(geo.attributes.position.count*2).fill(0),model:o.matrixWorld.elements,color:mat.color.toArray(),opacity:mat.opacity,roughness:mat.roughness,transparent:mat.transparent,side:mat.side});
 if(geo!==o.geometry)geo.dispose();
});
const views=[['front',[2.8,2.45,1.77],[-1,2.17,1.77],42,4/3],['three-quarter',[2.5,2.4,4.2],[-1,2.12,1.9],42,4/3],['child',[1.75,2.05,1.77375],[-1,1.99,1.77375],38,.7]].map(([name,eye,target,fov,aspect])=>{const c=new THREE.PerspectiveCamera(fov,aspect,.05,40);c.position.set(...eye);c.lookAt(...target);c.updateMatrixWorld();return {name,view:c.matrixWorldInverse.elements,projection:c.projectionMatrix.elements,eye};});
console.log(JSON.stringify({characterPreview:true,programs,meshes,views,vertex:'void main(){gl_Position=vec4(position,1.);}'}));
