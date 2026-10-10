import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {makeLeafGeometry} from './foliage.js';

function batchBuilder(parent,name){
  const batches=new Map(),dummy=new THREE.Object3D();let pieces=0;
  const add=(geo,mat,x,y,z,rx=0,ry=0,rz=0)=>{dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();geo.applyMatrix4(dummy.matrix);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(geo);pieces++;};
  const box=(w,h,d,m,x,y,z,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);
  const cyl=(r,h,m,x,y,z,rx=0,ry=0,rz=0)=>add(new THREE.CylinderGeometry(r,r,h,10),m,x,y,z,rx,ry,rz);
  return {box,cyl,add,flush(){for(const [mat,geos]of batches){const flat=geos.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(flat);for(const v of new Set([...flat,...geos]))v.dispose();const mesh=new THREE.Mesh(g,mat);mesh.name=name+'-'+mat.uuid;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);}return pieces;}};
}

export function addSceneryDetails({root,materials:m,house,shelterOffset:off,far,annex}){
  const group=new THREE.Group();group.name='station-crafted-details';root.add(group);const b=batchBuilder(group,'station-detail'),{box,cyl}=b;
  // Everything inside the shelter stays on its existing wall/bench volumes.
  for(const z of [1.52,2.30,3.08]){box(.32,.16,.25,m.wood,6.87+off,.84,z);box(.018,.17,.27,m.white,6.88+off,.85,z);}
  box(.038,.53,.68,m.wood,7.035+off,2.01,2.86);box(.042,.45,.60,m.houseWalls,7.01+off,2.01,2.86);
  for(let i=0;i<5;i++)box(.044,.008,.41,m.shelterDark,6.988+off,2.16-i*.072,2.86);
  cyl(.185,.055,m.signalPole,7.015+off,2.62,1.68,0,0,Math.PI/2);cyl(.155,.061,m.white,7.00+off,2.62,1.68,0,0,Math.PI/2);
  const clock=new THREE.Group();clock.name='station-clock';clock.position.set(6.96+off,2.62,1.68);group.add(clock);
  const clockHands=[];for(const [length,width]of [[.084,.016],[.12,.009]]){const pivot=new THREE.Group(),hand=new THREE.Mesh(new THREE.BoxGeometry(.008,length,width),m.shelterDark);hand.position.y=length*.35;pivot.add(hand);clock.add(pivot);clockHands.push(pivot);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(.009,.022,.010,m.shelterDark,6.961+off,2.62+Math.cos(a)*.127,1.68+Math.sin(a)*.127,Math.PI/2-a);}
  // A small wall-mounted ticket plate, with feet kept clear of the boarding route.
  box(.037,.32,.43,m.shelterDark,7.015+off,1.86,1.53);box(.043,.11,.30,m.houseWalls,6.992+off,1.95,1.53);
  cyl(.055,.007,m.signalPole,6.961+off,1.77,1.53,0,0,Math.PI/2);
  for(const bench of [{x:6.7+off,z:2.3},...(annex?[{x:far-1,z:-3.8},{x:far-1,z:-12.2}]:[])]){
    for(const dx of [-.11,.045])box(.009,.004,1.98,m.shelterDark,bench.x+dx,1.192,bench.z);
    for(const dz of [-.73,.73])cyl(.009,.012,m.signalPole,bench.x,1.198,bench.z+dz);
  }
  for(const z of annex?[-14.8,-6.6,6.6]:[-6.6,6.6]){box(.025,.50,.45,m.wood,far-.16,1.43,z);box(.03,.43,.39,m.houseWalls,far-.18,1.43,z);for(let i=0;i<3;i++)box(.031,.012,.24,m.shelterDark,far-.197,1.55-i*.12,z);}
  const stationPieces=b.flush();let housePieces=0;
  if(house){
    const detail=new THREE.Group();detail.name='house-crafted-details';house.add(detail);const h=batchBuilder(detail,'house-detail');
    // Gutters and downpipes follow the actual eaves, rather than floating above them.
    for(const side of [-1,1]){h.cyl(.052,8.55,m.signalPole,side*3.54,5.16,0,Math.PI/2);h.cyl(.036,4.76,m.signalPole,side*3.48,2.78,3.78);for(const y of [1.15,3.55])h.box(.055,.065,.105,m.signalPole,side*3.46,y,3.78);}
    for(const y of [1.55,4.05])for(const x of [-2.12,2.12])for(const side of [-1,1]){
      h.box(.38,1.53,.045,m.houseTrim,x+side*.77,y,4.14,0,side*.16);for(let i=0;i<9;i++)h.box(.33,.028,.049,m.white,x+side*.77,y-.58+i*.145,4.17,0,side*.16);
    }
    h.box(2.45,.12,.96,m.wood,0,.09,4.52);h.box(1.5,.12,.30,m.stoneLight,0,.045,5.05);
    h.box(2.66,.12,1.04,m.roofTiles,0,2.57,4.53,-.05);h.box(2.68,.12,.065,m.houseTrim,0,2.48,5.03);
    for(const x of [-1.17,1.17])h.box(.085,2.31,.085,m.wood,x,1.28,4.95);
    for(const x of [-.34,.34])h.box(.028,1.51,.025,m.houseTrim,x,1.12,4.10);for(const y of [.38,1.22,1.84])h.box(.72,.035,.025,m.houseTrim,0,y,4.10);
    h.cyl(.026,.035,m.signalPole,.34,1.11,4.132,Math.PI/2);
    for(const x of [-2.12,2.12]){h.box(1.24,.23,.28,m.wood,x,.61,4.23);for(let i=0;i<12;i++){const leaf=makeLeafGeometry();leaf.scale(.20,.24,.5);h.add(leaf,m.leaves2,x-.47+(i%6)*.19,.73,4.23+(i%2)*.05,(i%3-.8)*.30,i*1.7,(i%2-.5)*.8);}}
    for(const z of [-1.65,1.35])for(let i=0;i<7;i++){h.box(.50,.012,.492,m.roofRidges,1.45,6.73+i*.145,z);if(i%2===0)h.box(.012,.13,.49,m.roofRidges,1.43,6.80+i*.145,z);}
    housePieces=h.flush();
  }
  return {group,stationPieces,housePieces,update(hour){const minute=hour%1*60;clockHands[0].rotation.x=-hour/12*Math.PI*2;clockHands[1].rotation.x=-minute/60*Math.PI*2;}};
}

export function addCottageDetails(parent,m){
  const group=new THREE.Group();group.name='cottage-crafted-details';parent.add(group);const b=batchBuilder(group,'cottage-detail');
  for(const side of [-1,1]){b.cyl(.04,5.77,m.iron,side*2.3,3.34,0,Math.PI/2);b.cyl(.028,2.82,m.iron,side*2.20,1.78,2.37);}
  for(const x of [-1.22,1.22])for(const sign of [-1,1]){b.box(.28,1.13,.055,m.grass,x+sign*.65,2.12,2.67);for(let i=0;i<6;i++)b.box(.245,.028,.060,m.cream,x+sign*.65,1.74+i*.15,2.70);}
  b.box(1.58,.12,.60,m.timber,0,.42,2.84);b.box(1.58,.09,.45,m.timber,0,2.76,2.82,-.1);for(const x of [-.62,.62])b.box(.066,2.2,.066,m.timber,x,1.54,2.99);
  for(let i=0;i<13;i++)for(const side of [-1,1])b.box(2.69,.026,.021,m.timber,side*1.13,4.08,-2.82+i*.47,0,0,-side*.51);
  return {group,pieces:b.flush()};
}
