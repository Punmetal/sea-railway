import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createFoliage} from './foliage.js';
import {addCottageDetails} from './scenery-detail.js';
import {routePose} from './physics.js';

// Sparse, original scenery inspired by the official Sea Railway film stills.
// Long stretches stay empty. Native 3D shapes share the existing ocean reflection.
export function createRouteVistas(scene,{coarse=false}={}){
  const root=new THREE.Group();root.name='quiet-route-vistas';scene.add(root);
  const batches=new Map(),materials={};
  const mat=(name,color,options={})=>materials[name]=new THREE.MeshStandardMaterial({color,roughness:.9,...options});
  const timber=mat('timber',0x695148),crossarm=mat('crossarm',0x514743),wire=mat('wires',0x3d414b),porcelain=mat('insulators',0xc9c7b1),iron=mat('iron',0x586265,{metalness:.32});
  const earth=mat('shore',0x83816b),grass=mat('grass',0x71855b),cream=mat('cottage',0xcdc9ae),roof=mat('roof',0x92604e),leaves=mat('leaves',0x537459);
  const windows=mat('windows',0x597477,{emissive:0xffce8b,emissiveIntensity:0}),lamps=mat('lamps',0xe2d7b3,{emissive:0xffd49b,emissiveIntensity:.1});
  const matrix=new THREE.Matrix4(),transform=new THREE.Object3D(),cameraObstacles=[],poles=[],landmarks=[],foliage=[];
  function add(geometry,material,group,x=0,y=0,z=0,rx=0,ry=0,rz=0){transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);transform.scale.set(1,1,1);transform.updateMatrix();group.updateMatrix();matrix.multiplyMatrices(group.matrix,transform.matrix);geometry.applyMatrix4(matrix);if(!batches.has(material))batches.set(material,[]);batches.get(material).push(geometry);}
  const box=(w,h,d,m,g,x,y,z,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),m,g,x,y,z,rx,ry,rz);
  const cyl=(r1,r2,h,m,g,x,y,z)=>add(new THREE.CylinderGeometry(r1,r2,h,8),m,g,x,y,z);
  function branch(g,a,b,r){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),geo=new THREE.CylinderGeometry(r*.65,r,av.distanceTo(bv),7);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bv.clone().sub(av).normalize()));geo.translate(...av.add(bv).multiplyScalar(.5).toArray());add(geo,timber,g);}
  function land(rx,ry,rz,m,g,x,y,z){const geo=new THREE.SphereGeometry(1,coarse?12:20,coarse?8:12);geo.scale(rx,ry,rz);add(geo,m,g,x,y,z);}
  function groupAt(distance,side,offset){const p=routePose(distance),g=new THREE.Group();g.position.set(p.x+Math.cos(p.yaw)*offset*side,0,p.z-Math.sin(p.yaw)*offset*side);g.rotation.y=p.yaw;return g;}
  function obstacle(g,rx,rz,height){cameraObstacles.push({x:g.position.x,z:g.position.z,yaw:g.rotation.y,halfX:rx,halfZ:rz,height});}
  function lamp(g,x,y,z){cyl(.024,.024,.22,iron,g,x,y+.14,z);box(.36,.06,.31,iron,g,x,y+.28,z);box(.19,.22,.18,lamps,g,x,y+.12,z);box(.28,.045,.25,iron,g,x,y-.015,z);}
  const spans=[{start:135,count:6,spacing:57,side:-1},{start:1110,count:6,spacing:54,side:1},{start:2460,count:5,spacing:58,side:-1}];
  for(const [section,span] of spans.entries()){
    const points=[];
    for(let i=0;i<span.count;i++){
      const distance=span.start+i*span.spacing,g=groupAt(distance,span.side,12.5),height=7.9+.28*Math.sin(i*1.7+section);
      cyl(.095,.145,height,timber,g,0,height/2-.08,0);box(2.08,.14,.14,crossarm,g,0,height-.58,0);box(.16,.74,.13,crossarm,g,0,height-.45,0);
      for(const x of [-.84,0,.84]){cyl(.035,.035,.18,iron,g,x,height-.42,0);for(const y of [height-.29,height-.22])cyl(.062,.048,.055,porcelain,g,x,y,0);}
      if(i===2){box(.055,.055,.92,iron,g,0,height-.89,.36,0,0,.12);lamp(g,0,height-.97,.79);}
      g.updateMatrixWorld();points.push({g,height});poles.push({distance,side:span.side,position:g.position.clone(),height});obstacle(g,1.15,1.05,height+.2);
    }
    for(let i=1;i<points.length;i++)for(const x of [-.84,0,.84]){
      const a=points[i-1].g.localToWorld(new THREE.Vector3(x,points[i-1].height-.20,0)),b=points[i].g.localToWorld(new THREE.Vector3(x,points[i].height-.20,0));
      const curve=new THREE.QuadraticBezierCurve3(a,new THREE.Vector3().addVectors(a,b).multiplyScalar(.5).add(new THREE.Vector3(0,-1.6,0)),b);
      const geometry=new THREE.TubeGeometry(curve,16,.016,4,false);if(!batches.has(wire))batches.set(wire,[]);batches.get(wire).push(geometry);
      // Camera guard includes the complete span, including the wires.
      const center=new THREE.Group();center.position.copy(a).add(b).multiplyScalar(.5);center.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);obstacle(center,1.08,a.distanceTo(b)/2+.5,Math.max(a.y,b.y)+.1);
    }
  }
  // A solitary cottage, warm windows and a tiny jetty: a quiet story, no quests.
  const cottage=groupAt(790,-1,43);land(10,.65,20,earth,cottage,0,-.40,0);land(9.7,.22,19.7,grass,cottage,0,.13,0);
  box(4.3,3.1,5.1,cream,cottage,0,1.86,0);box(4.6,.16,5.35,timber,cottage,0,.37,0);
  const angle=.51;for(const side of [-1,1])box(2.68,.15,5.8,roof,cottage,side*1.13,3.99,0,0,0,-side*angle);
  const triangle=new THREE.Shape();triangle.moveTo(-2.15,3.41);triangle.lineTo(2.15,3.41);triangle.lineTo(0,4.65);triangle.closePath();const gable=new THREE.ExtrudeGeometry(triangle,{depth:5.1,bevelEnabled:false});gable.translate(0,0,-2.55);add(gable,cream,cottage);
  box(.49,1.0,.45,cream,cottage,1.2,4.68,-1.35);box(.63,.10,.59,timber,cottage,1.2,5.20,-1.35);
  for(const face of [-1,1])for(const x of [-1.22,1.22]){box(.94,1.05,.075,timber,cottage,x,2.12,face*2.59);box(.80,.90,.018,windows,cottage,x,2.12,face*2.638);box(.045,.91,.02,cream,cottage,x,2.12,face*2.65);}
  box(.88,1.78,.08,timber,cottage,0,1.3,2.61);lamp(cottage,.65,2.6,2.70);
  for(let i=0;i<11;i++)box(1.45,.09,.45,timber,cottage,0,.28,3.05+i*.48);
  for(const z of [3.15,5.2,7.4])for(const x of [-.61,.61])cyl(.045,.06,.68,timber,cottage,x,.04,z);
  cyl(.16,.23,5.1,timber,cottage,4.8,2.8,-5.6);
  root.add(cottage);foliage.push(createFoliage(cottage,{coarse,count:1400,seed:318,crowns:[[4.65,5.75,-5.65,2,2.4,1.8],[5.7,5.2,-6.1,1.5,1.9,1.6]],name:'cottage-individual-leaves'}));
  for(const point of [[3.9,6.8,-6.2],[6.1,6.3,-5.1],[5.4,7.2,-6.3]])branch(cottage,[4.8,4.6,-5.6],point,.048);
  addCottageDetails(cottage,{timber,iron,cream,roof,windows,grass});
  obstacle(cottage,8,9,8.4);landmarks.push({name:'solitary-cottage',distance:790,position:cottage.position.clone()});
  // The former detached water stop now forms the second station's connected wooden annex.
  // A low grassy shoal and two wind-shaped trees, then a long open-water stretch.
  const grove=groupAt(2150,-1,51);land(13,.64,25,earth,grove,0,-.4,0);land(12.7,.22,24.7,grass,grove,0,.13,0);
  root.add(grove);for(const [i,[x,z,s]] of [[-3,-4,1],[4,5,.7]].entries()){cyl(.14*s,.24*s,5.2*s,timber,grove,x,2.9*s,z);for(const [dx,dy,dz]of [[2.2,6.7,-.5],[-1.7,6.1,1.5],[.5,7.0,1.0]])branch(grove,[x,4.9*s,z],[x+dx*s,dy*s,z+dz*s],.047*s);foliage.push(createFoliage(grove,{coarse,count:1600,seed:414+i,crowns:[[x+.7*s,5.8*s,z,3*s,2*s,2.3*s],[x-1.4*s,5.5*s,z+1.2*s,2.1*s,1.5*s,2.5*s]],name:'grove-individual-leaves-'+i}));}
  for(let i=0;i<9;i++){const x=-8+i*.65;box(.7,.07,1.45,timber,grove,x,.31,-1.6);if(i%3===0)for(const z of [-2.20,-1.0])cyl(.04,.055,.70,timber,grove,x,0,z);}
  obstacle(grove,9,10,8.3);landmarks.push({name:'quiet-tree-shoal',distance:2150,position:grove.position.clone()});
  for(const [material,geometries] of batches){const normalized=geometries.map(g=>g.index?g.toNonIndexed():g);const geo=mergeGeometries(normalized);for(const g of new Set([...geometries,...normalized]))g.dispose();const mesh=new THREE.Mesh(geo,material);mesh.name='vistas-'+Object.keys(materials).find(k=>materials[k]===material);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  root.updateMatrixWorld(true);
  const shores=[{x:cottage.position.x,z:cottage.position.z,yaw:cottage.rotation.y,radiusX:10,radiusZ:20},{x:grove.position.x,z:grove.position.z,yaw:grove.rotation.y,radiusX:13,radiusZ:25}];
  return {root,poles,landmarks,cameraObstacles,materials,shores,foliage,updatePalette(p){windows.emissiveIntensity=p.lamps*.75;lamps.emissiveIntensity=.15+p.lamps*1.75;},dispose(){foliage.forEach(f=>f.dispose());root.traverse(o=>o.geometry?.dispose());for(const m of Object.values(materials))m.dispose();}};
}
