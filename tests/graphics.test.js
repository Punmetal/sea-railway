import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {TRACK_LENGTH,routePose} from '../dist/physics.js';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
globalThis.document={createElement(){return {getContext(){return {fillRect(){},fillText(){}};}};}};
const {createScenery}=await import('../dist/scenery.js'),{createRouteVistas}=await import('../dist/route-vistas.js'),{RailwayVisuals}=await import('../dist/visual-style.js'),{SnowCover}=await import('../dist/snow-cover.js'),{createFarLandscape}=await import('../dist/far-landscape.js');
const scene=new THREE.Scene(),stations=[createScenery(scene),createScenery(scene,{distance:70+TRACK_LENGTH/2,widthScale:2,withIsland:false,withAnnex:true})],routeVistas=createRouteVistas(scene),cars=[new THREE.Group(),new THREE.Group()],sunLight=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight(),camera=new THREE.PerspectiveCamera();cars.forEach(c=>scene.add(c));scene.add(sunLight,sunLight.target,fill);
const trainMaterials={roof:new THREE.MeshStandardMaterial(),roofPanel:new THREE.MeshStandardMaterial()},cover=new SnowCover(stations,trainMaterials,[routeVistas.materials.roof]),visuals=new RailwayVisuals({scene,stations,routeVistas,cars,sunLight,fill,camera,materials:trainMaterials}),far=createFarLandscape(scene);
assert.equal(visuals.foliage.length,4);assert.equal(visuals.foliage.reduce((sum,t)=>sum+t.total,0),8800);
assert(!scene.getObjectByName('scenery-leaves1')&&!scene.getObjectByName('scenery-leaves2')&&!scene.getObjectByName('vistas-leaves'),'No solid crown lobes remain.');
for(const tree of visuals.foliage){
 assert(tree.mesh.isInstancedMesh&&tree.mesh.castShadow&&tree.mesh.customDepthMaterial);assert.equal(tree.mesh.geometry.index.count/3,12);assert(tree.mesh.geometry.attributes.position.getZ(5)>0,'Leaf blades curve in three dimensions.');assert([...tree.mesh.instanceMatrix.array,...tree.mesh.instanceColor.array].every(Number.isFinite));
 const widths=new Set();const matrix=new THREE.Matrix4(),scale=new THREE.Vector3();for(let i=0;i<tree.total;i+=23){tree.mesh.getMatrixAt(i,matrix);matrix.decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);widths.add(scale.y.toFixed(2));}assert(widths.size>15,'Leaf size varies naturally.');
}
for(const quality of ['low','medium','high']){visuals.setQuality(quality);for(const tree of visuals.foliage)assert(tree.mesh.count<=tree.total&&tree.mesh.count>=tree.mesh.userData.crownCount);}
const palette={top:new THREE.Color('#3d99d0'),horizon:new THREE.Color('#b8e2e9'),sea:new THREE.Color('#429bb4'),sun:new THREE.Color('#fff5dd'),night:0,sunY:.6},weather={rain:.8,mist:.3,cloud:.5};
for(let d=0;d<TRACK_LENGTH;d+=27){cars.forEach((c,i)=>{const p=routePose(d-i*18.75);c.position.set(p.x,.22,p.z);});camera.position.copy(cars[0].position).add(new THREE.Vector3(30,12,25));visuals.update(d,palette,weather,.6,18.5);
 const centre=cars[0].position.clone().add(cars[1].position).multiplyScalar(.5);assert(sunLight.target.position.distanceTo(centre)<18,'Shadow coverage follows the complete journey.');assert(sunLight.position.clone().sub(sunLight.target.position).distanceTo(new THREE.Vector3(-122.4,108,-129.6))<1e-6);assert(fill.target.parent===scene);}
assert.equal(visuals.uniforms.uPaintRain.value,.8);assert.equal(visuals.foliage[0].uniforms.uLeafSnow.value,.6);const clock=stations[0].details.group.getObjectByName('station-clock');assert(Math.abs(clock.children[1].rotation.x+Math.PI)<1e-9);
visuals.update(9,palette,weather,.6,null);assert(Math.abs(clock.children[1].rotation.x+Math.PI)<1e-9,'Clock hands stay frozen with the scene.');
assert(stations[0].details.housePieces>100&&stations[1].details.stationPieces>40);assert(stations[0].house.getObjectByName('house-crafted-details'));assert(routeVistas.root.getObjectByName('cottage-crafted-details'));
for(const contact of visuals.contacts){
 assert(contact.mesh.material.vertexShader.includes('instanceMatrix*p'),'Batched contact shadows use each footprint transform.');
 const matrix=new THREE.Matrix4(),normal=new THREE.Vector3(0,0,1);contact.mesh.getMatrixAt(0,matrix);normal.transformDirection(matrix);assert(normal.y>.99,'Contact shadows lie flat on the platform.');
 assert(matrix.elements[13]>0,'Contact shadows sit above the platform, not at the world origin.');
}
const compile=m=>{const s={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};m.onBeforeCompile(s);return s;};
const stone=compile(stations[0].materials.stone);assert(stone.uniforms.uSnowCover&&stone.uniforms.uPaintRain);assert(stone.fragmentShader.includes('paintWet')&&stone.fragmentShader.includes('snowCoating'));assert.equal(stone.uniforms.uStationShelters.value.length,2);
const cottage=compile(routeVistas.materials.roof);assert(cottage.uniforms.uSnowCover,'The cottage roof receives accumulated snow.');
const leaf=compile(stations[0].foliage.material);assert(leaf.vertexShader.includes('leafAnchor'));assert(leaf.fragmentShader.includes('fwidth(vLeafUV.x)'));const shadow={vertexShader:THREE.ShaderLib.depth.vertexShader,fragmentShader:THREE.ShaderLib.depth.fragmentShader,uniforms:{}};stations[0].foliage.mesh.customDepthMaterial.onBeforeCompile(shadow);assert.equal(shadow.uniforms.uLeafTime,leaf.uniforms.uLeafTime,'Wind in the leaf shadow and colour passes shares one clock.');
far.update(palette);assert.equal(far.root.children.length,4);for(const ridge of far.root.children){assert(Math.hypot(ridge.position.x,ridge.position.z)>1500);assert(ridge.material.color.toArray().every(v=>v>0));}
scene.traverse(o=>{if(o.geometry)for(const a of Object.values(o.geometry.attributes))assert([...a.array].every(Number.isFinite));});
const coarseScene=new THREE.Scene(),coarse=createScenery(coarseScene,{coarse:true});assert(coarse.foliage.total<stations[0].foliage.total);coarse.foliage.dispose();
visuals.dispose();cover.dispose();routeVistas.dispose();far.dispose();console.log('Graphics: 8800 curved individual leaves, branch/shadow clocks, quality counts, full-route shadow coverage, weather/snow composition, house/station details, distant ridges and finite geometry passed.');
