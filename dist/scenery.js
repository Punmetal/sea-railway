import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createFoliage} from './foliage.js';
import {addSceneryDetails} from './scenery-detail.js';
import {routePose} from './physics.js';

export const STATION_DISTANCE=70;
export const PLATFORM={nearX:2.2,farX:7.6,halfLength:7.2,top:.74};

// Reference: a stone platform, open red shelter, white fencing and a long low island.
// Static components are batched by material, shared by the main and ocean reflection views.
export function createScenery(scene,{coarse=false,distance=STATION_DISTANCE,widthScale=1,withIsland=true,withAnnex=false,name='water-station-and-island'}={}){
  const root=new THREE.Group();root.name=name;
  const platform={...PLATFORM,farX:PLATFORM.nearX+5.4*widthScale},far=platform.farX;
  const pose=routePose(distance);root.position.set(pose.x,0,pose.z);root.rotation.y=pose.yaw;scene.add(root);
  const batches=new Map(),materials={};
  function mat(name,color,options={}){const m=new THREE.MeshStandardMaterial({color,roughness:.86,...options});materials[name]=m;return m;}
  const stone=mat('stone',0x9b9b8b),stoneLight=mat('stoneLight',0xaeb0a1),stoneDark=mat('stoneDark',0x878d82),yellow=mat('yellow',0xc8ac48);
  const white=mat('white',0xe4e5cf),red=mat('shelter',0x955441),redDark=mat('shelterDark',0x713e31),roof=mat('shelterRoof',0x535c56,{metalness:.15,roughness:.75});
  const metal=mat('signalPole',0x777f78,{metalness:.28}),black=mat('signalHousing',0x242b28),green=mat('signalLamp',0x64794e,{emissive:0x7eac59,emissiveIntensity:.3});
  const cream=mat('houseWalls',0xe1ddbb),trim=mat('houseTrim',0xbac5b1),tile=mat('roofTiles',0xab633e),tileLight=mat('roofRidges',0xbb7750);
  const wood=mat('wood',0x655544),bark=mat('bark',0x655b3e),leaves=[mat('leaves1',0x588754),mat('leaves2',0x709359),mat('leaves3',0x40734c)];
  const glass=mat('houseWindows',0x4f747b,{roughness:.3,metalness:.1,emissive:0xfbc480,emissiveIntensity:0});
  const shore=mat('shore',0xa29e72),earth=mat('earth',0x7b7855);
  const lampMat=mat('shelterLamp',0xe4d7a8,{emissive:0xffd39c,emissiveIntensity:.6});
  const transform=new THREE.Object3D();
  function add(g,m,x,y,z,rx=0,ry=0,rz=0){transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);transform.scale.set(1,1,1);transform.updateMatrix();g.applyMatrix4(transform.matrix);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);}
  const box=(w,h,d,m,x,y,z,rx=0,ry=0,rz=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);
  const cyl=(r,h,m,x,y,z,rx=0,ry=0,rz=0)=>add(new THREE.CylinderGeometry(r,r,h,8),m,x,y,z,rx,ry,rz);
  function ellipsoid(rx,ry,rz,m,x,y,z){const g=new THREE.SphereGeometry(1,coarse?12:16,coarse?8:10);g.scale(rx,ry,rz);add(g,m,x,y,z);}
  function branch(a,b,r){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r*.64,r,av.distanceTo(bv),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),bv.clone().sub(av).normalize()));g.translate(...av.add(bv).multiplyScalar(.5).toArray());if(!batches.has(bark))batches.set(bark,[]);batches.get(bark).push(g);}
  // Thick masonry, individually jointed slabs and an unobstructed track-facing edge.
  box(5.4*widthScale,.84,14.4,stoneDark,(platform.nearX+far)/2,.30,0);
  const columns=Math.round(3*widthScale),slabWidth=5.4*widthScale/columns;
  for(let row=0;row<8;row++)for(let col=0;col<columns;col++)box(slabWidth-.015,.09,1.785,[stone,stoneLight,stoneDark][(row*5+col)%3],platform.nearX+slabWidth*(col+.5),.695,-6.3+row*1.8);
  for(let i=0;i<12;i++)box(.025,.38,.028,stoneDark,2.187,.32,-6.6+i*1.2);
  box(.17,.014,14.25,yellow,2.34,.752,0);
  function fence(x1,z1,x2,z2){const length=Math.hypot(x2-x1,z2-z1),yaw=Math.atan2(x2-x1,z2-z1),steps=Math.round(length/1.2);
    for(let i=0;i<=steps;i++){const f=i/steps;box(.10,1.14,.10,white,x1+(x2-x1)*f,1.31,z1+(z2-z1)*f);}
    for(const y of [1.22,1.78])box(.075,.085,length,white,(x1+x2)/2,y,(z1+z2)/2,0,yaw);
    for(let i=0;i<Math.floor(length/.3);i++){const f=(i+.5)/Math.floor(length/.3);box(.045,.75,.045,white,x1+(x2-x1)*f,1.43,z1+(z2-z1)*f);}}
  if(withIsland){fence(far-.12,-7.05,far-.12,-1.05);fence(far-.12,1.05,far-.12,7.05);}else fence(far-.12,withAnnex?-15.25:-7.05,far-.12,7.05);
  fence(2.65,-7.05,withAnnex?far-3.55:far-.12,-7.05);fence(2.65,7.05,far-.12,7.05);
  // Grow the masonry, not its furnishings. Shelter, seats and posts keep metre proportions.
  const shelterOffset=far-PLATFORM.farX;
  const furnishingOffset=shelterOffset;
  const baseAdd=add;
  function furnishing(g,m,x,y,z,rx=0,ry=0,rz=0){baseAdd(g,m,x+furnishingOffset,y,z,rx,ry,rz);}
  const hutBox=(w,h,d,m,x,y,z,rx=0,ry=0,rz=0)=>furnishing(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx,ry,rz);
  const hutCyl=(r,h,m,x,y,z,rx=0,ry=0,rz=0)=>furnishing(new THREE.CylinderGeometry(r,r,h,8),m,x,y,z,rx,ry,rz);
  // Open-front waiting shelter: no solid box across the doorway.
  hutBox(.14,2.27,2.70,red,7.13,1.925,2.3);
  for(const z of [.95,3.65]){hutBox(1.9,2.27,.13,red,6.18,1.925,z);hutBox(.13,2.27,.13,redDark,5.23,1.925,z);}
  for(const y of [1.18,2.7]){hutBox(.025,.07,2.66,white,7.04,y,2.3);for(const z of [.875,3.725])hutBox(1.88,.07,.025,white,6.18,y,z);}
  hutBox(.12,.27,2.7,redDark,5.23,2.925,2.3);hutBox(2.28,.12,3.10,roof,6.16,3.11,2.3,0,0,.028);
  for(let i=0;i<24;i++)hutBox(2.27,.036,.028,roof,6.16,3.18,.79+i*.132,0,0,.028);
  hutBox(.47,.12,2.05,wood,6.70,1.13,2.3);for(const z of [1.5,3.1])hutBox(.1,.33,.1,wood,6.70,.905,z);
  hutBox(.018,.67,.43,cream,5.22,1.97,1.32);for(let i=0;i<4;i++)hutBox(.022,.018,.29,redDark,5.202,2.16-i*.105,1.32);
  // Tiny native sign texture, based on the reference's pale signboard.
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#dedec6';ctx.fillRect(0,0,256,64);ctx.fillStyle='#594e3d';ctx.font='36px serif';ctx.textAlign='center';ctx.fillText(withIsland?'海の駅':'遠い波の駅',128,45);
  const signMat=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),roughness:1});const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.25),signMat);sign.position.set(5.155+shelterOffset,2.91,2.3);sign.rotation.y=-Math.PI/2;root.add(sign);
  // Signal stands safely behind the platform rather than beside the passing wheels.
  hutCyl(.068,6.15,metal,6.8,3.815,5.5);hutBox(.43,.10,.32,metal,6.8,6.90,5.5);
  for(const y of [5.85,6.40]){hutCyl(.25,.22,black,6.63,y,5.5,0,0,Math.PI/2);hutCyl(.15,.023,y===5.85?green:black,6.508,y,5.5,0,0,Math.PI/2);}
  for(const z of [5.34,5.66])hutCyl(.017,5.0,metal,6.95,3.5,z);
  for(let i=0;i<16;i++)hutBox(.035,.03,.37,metal,6.95,1.14+i*.32,5.5);
  ellipsoid(.16,.075,.16,lampMat,6.2+shelterOffset,2.91,2.3);
  const hutLight=new THREE.PointLight(0xffd29a,0,7,2);hutLight.position.set(6.1+shelterOffset,2.7,2.3);root.add(hutLight);
  function bench(x,z){
    box(.48,.12,2.02,wood,x,1.13,z);box(.09,.57,2.02,wood,x+.27,1.43,z);
    for(const end of [-.73,.73]){box(.065,.33,.065,metal,x,.905,z+end);box(.055,.42,.055,metal,x+.24,1.27,z+end);}
  }
  function platformLamp(x,z){
    cyl(.065,3.85,wood,x,2.665,z);box(.92,.07,.07,metal,x-.42,4.53,z);
    box(.28,.07,.30,metal,x-.84,4.47,z);box(.17,.21,.19,lampMat,x-.84,4.34,z);box(.26,.045,.28,metal,x-.84,4.21,z);
  }
  const furnishings=[{kind:'shelter',x:6.18+shelterOffset,z:2.3},{kind:'signal',x:6.8+shelterOffset,z:5.5}];
  const annex=withAnnex?{nearX:far-3.3,farX:far,nearZ:-15.4,farZ:-7.0,top:.74}:null;
  if(annex){
    // Relocated little water stop shares the station's deck and floor height, with a clear entrance.
    box(3.3,.84,8.4,stoneDark,far-1.65,.30,-11.2);
    for(let i=0;i<17;i++)box(3.25,.035,.475,wood,far-1.65,.7225,-15.15+i*.49);
    fence(far-3.17,-15.25,far-.12,-15.25);fence(far-3.17,-15.25,far-3.17,-7.12);
    bench(far-1.0,-12.2);platformLamp(far-.55,-14.35);
    box(.10,2.10,.10,wood,far-2.8,1.79,-14.45);box(.80,.35,.065,cream,far-2.8,2.65,-14.45);
    for(let i=0;i<3;i++)box(.12,.025,.070,wood,far-3.02+i*.22,2.65,-14.45);
    bench(far-1.0,-3.8);platformLamp(far-.55,-5.55);
    furnishings.push({kind:'bench',x:far-1,z:-3.8},{kind:'lamp',x:far-.55,z:-5.55},{kind:'bench',x:far-1,z:-12.2},{kind:'lamp',x:far-.55,z:-14.35});
  }else{platformLamp(far-.55,-5.55);furnishings.push({kind:'lamp',x:far-.55,z:-5.55});}
  let grass=null,house=null,foliage=null;
  if(withIsland){
  // A flattened long shoreline, with the inner lawn high enough to remain above waves.
  ellipsoid(9.4,.67,32.5,earth,33,-.52,4);ellipsoid(9.2,.19,32.2,shore,33,.06,4);
  const positions=[],colors=[],indices=[],rings=6,segments=64;
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,q=ring/rings,edge=1+.026*Math.sin(a*3)+.017*Math.cos(a*7),x=33+Math.cos(a)*9*q*edge,z=4+Math.sin(a)*32*q*edge,y=.46-.36*Math.pow(q,8)+.012*Math.sin(a*5)*q;
    positions.push(x,y,z);const c=new THREE.Color().setRGB(.25+.035*Math.sin(a*4+ring),.40+.025*Math.cos(a*7+ring),.20+.016*Math.sin(a*3));colors.push(c.r,c.g,c.b);}
  for(let r=0;r<rings;r++)for(let j=0;j<segments;j++){const a=r*(segments+1)+j,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const terrainGeo=new THREE.BufferGeometry();terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.setIndex(indices);terrainGeo.computeVertexNormals();
  const lawn=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));lawn.name='low-grassy-island';lawn.receiveShadow=true;root.add(lawn);
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.01,.22,.005,.03,0,0,0,0,-.03,.008,.16,.02,0,0,.03,-.03,0,-.03,-.04,.17,.035,.03,0,.03],3));grassGeo.computeVertexNormals();
  grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({color:0x638447,roughness:1,side:THREE.DoubleSide}),coarse?128:240);grass.name='island-grass';
  for(let i=0;i<grass.count;i++){const a=i*2.39996,q=Math.sqrt((i+.5)/grass.count)*.95,x=33+Math.cos(a)*8.7*q,z=4+Math.sin(a)*31*q;transform.position.set(x,.46-.36*Math.pow(q,8),z);transform.rotation.set(0,a,0);transform.scale.setScalar(.7+(i%7)*.07);transform.updateMatrix();grass.setMatrixAt(i,transform.matrix);}root.add(grass);
  // Pale two-storey house; gable and front door face the railway (-X).
  house=new THREE.Group();house.position.set(31,.46,-8);house.rotation.y=-Math.PI/2;root.add(house);
  function houseBox(w,h,d,m,x,y,z,rx=0,ry=0,rz=0){const g=new THREE.BoxGeometry(w,h,d);transform.position.set(x,y,z);transform.rotation.set(rx,ry,rz);transform.scale.set(1,1,1);transform.updateMatrix();g.applyMatrix4(transform.matrix);house.updateMatrix();g.applyMatrix4(house.matrix);if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);}
  houseBox(6.6,5.25,8,cream,0,2.625,0);houseBox(6.76,.15,8.13,trim,0,.24,0);houseBox(6.76,.09,8.13,trim,0,2.7,0);
  const gable=new THREE.Shape();gable.moveTo(-3.3,5.25);gable.lineTo(3.3,5.25);gable.lineTo(0,7.25);gable.closePath();
  const gableGeo=new THREE.ExtrudeGeometry(gable,{depth:8,bevelEnabled:false});gableGeo.translate(0,0,-4);house.updateMatrix();gableGeo.applyMatrix4(house.matrix);batches.get(cream).push(gableGeo);
  const roofAngle=Math.atan2(2,3.3),roofSpan=Math.hypot(3.3,2)+.45;
  for(const side of [-1,1]){houseBox(roofSpan,.15,8.65,tile,side*1.7,6.25,0,0,0,-side*roofAngle);
    for(let i=0;i<29;i++)houseBox(roofSpan,.031,.025,tileLight,side*1.7,6.34,-4.26+i*.305,0,0,-side*roofAngle);
    for(let i=0;i<6;i++)houseBox(.022,.036,8.63,tileLight,side*(.27+i*.63),7.24-(.27+i*.63)*2/3.3,0,0,0,-side*roofAngle);}
  houseBox(.16,.12,8.72,tileLight,0,7.30,0);
  for(const z of [-1.65,1.35]){houseBox(.48,1.30,.48,cream,1.45,7.20,z);houseBox(.59,.12,.59,trim,1.45,7.85,z);}
  houseBox(1.04,2.18,.08,wood,0,1.20,4.045);houseBox(.91,.34,.04,glass,0,2.03,4.1);
  for(const y of [1.55,4.05])for(const x of [-2.12,2.12]){houseBox(1.13,1.48,.07,wood,x,y,4.06);houseBox(.96,1.30,.03,glass,x,y,4.107);houseBox(.045,1.30,.035,trim,x,y,4.13);houseBox(.98,.045,.035,trim,x,y,4.13);houseBox(1.24,.10,.23,trim,x,y-.78,4.16);}
  for(const side of [-1,1])for(const y of [1.55,4.05])for(const z of [-2.35,1.85]){houseBox(.07,1.48,1.1,wood,side*3.34,y,z);houseBox(.03,1.30,.94,glass,side*3.386,y,z);houseBox(.04,.05,.94,trim,side*3.41,y,z);houseBox(.04,1.30,.04,trim,side*3.41,y,z);}
  // Slender leaning trunk and layered, asymmetric lobes rather than a round ball.
  branch([34,.47,19],[34.7,4.1,18.5],.22);branch([34.7,4.1,18.5],[36.1,7.5,18.1],.16);
  branch([35.4,6,18.2],[32.2,8.2,19.1],.11);branch([35.5,6.2,18.3],[38.5,8.3,17.4],.105);
  const crowns=[[34.8,9.8,18.4,3.6,2.5,3.6],[32.0,8.5,19.2,2.6,1.7,2.7],[38.0,9,17.8,2.6,1.9,2.6],[35.1,11.3,18.0,2.4,1.8,2.6],[33.1,10.6,17.8,2.2,1.7,2.4],[37,10.8,20.3,2.5,1.7,2.2],[35.6,8.2,21,2.8,1.6,2.3],[31.9,9.8,21,1.8,1.4,2.1],[38.3,8.1,20,1.7,1.3,2.0]];
  foliage=createFoliage(root,{crowns,coarse,count:4200,name:'island-individual-leaves'});
  for(let i=0;i<crowns.length;i++){const [x,y,z,rx,ry,rz]=crowns[i];branch([35.4,6.2,18.4],[x,y-.35,z],.046);for(const sign of [-1,1])branch([x,y-.35,z],[x+sign*rx*.54,y+ry*.3,z+rz*.28],.024);}
  }
  for(const [m,geometries] of batches){const compatible=geometries.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(compatible);compatible.forEach(v=>v.dispose());geometries.forEach(v=>v.dispose());const mesh=new THREE.Mesh(g,m);mesh.name='scenery-'+Object.keys(materials).find(k=>materials[k]===m);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  const details=addSceneryDetails({root,materials,house,shelterOffset,far,annex,coarse});
  root.updateMatrixWorld(true);
  const lightTarget=root.localToWorld(new THREE.Vector3(withIsland?24:4.9,2,0));
  const cameraObstacles=[{minX:5.10+shelterOffset,maxX:7.27+shelterOffset,minZ:.72,maxZ:3.88,height:3.25},{minX:6.35+shelterOffset,maxX:7.15+shelterOffset,minZ:5.18,maxZ:5.83,height:7.1},{minX:far-.67,maxX:far-.43,minZ:-5.67,maxZ:-5.43,height:4.65},...(annex?[{minX:far-1.25,maxX:far-.60,minZ:-4.85,maxZ:-2.75,height:1.9},{minX:far-1.25,maxX:far-.60,minZ:-13.25,maxZ:-11.15,height:1.9},{minX:far-.67,maxX:far-.43,minZ:-14.47,maxZ:-14.23,height:4.65},{minX:far-3.23,maxX:far-2.37,minZ:-14.62,maxZ:-14.28,height:2.9}]:[]),...(withIsland?[{minX:25.7,maxX:36.3,minZ:-12.9,maxZ:-3.1,height:8.7},{minX:28.9,maxX:41.5,minZ:13.5,maxZ:25.1,height:13.2}]:[])];
  const shelter={minX:5.02+shelterOffset,maxX:7.30+shelterOffset,minZ:.75,maxZ:3.85,roofY:3.04};
  const benches=[{id:'shelter',x:6.70+shelterOffset,z:2.3,width:2.05,covered:true},...(annex?[{id:'platform',x:far-1,z:-3.8,width:2.02},{id:'annex',x:far-1,z:-12.2,width:2.02}]:[])];
  const wall=(minX,maxX,minZ,maxZ,height=2.27,kind='wall',id=null)=>({minX:minX+shelterOffset,maxX:maxX+shelterOffset,minZ,maxZ,height,kind,id});
  const walkObstacles=[wall(7.06,7.20,.95,3.65),wall(5.18,7.20,.885,1.015),wall(5.18,7.20,3.585,3.715),wall(5.165,5.295,.885,1.015),wall(5.165,5.295,3.585,3.715),...cameraObstacles.slice(1).filter(b=>!annex||b.height!==1.9),...benches.map(b=>({minX:b.x-.245,maxX:b.x+.32,minZ:b.z-b.width/2,maxZ:b.z+b.width/2,height:1.05,kind:'bench',id:b.id}))];
  const seats=benches.flatMap(b=>[-.62,0,.62].map((dz,index)=>({id:`station-${distance}-${b.id}-${index}`,bench:b.id,x:b.x-.035,z:b.z+dz,width:.62,top:1.19,floor:platform.top,covered:Boolean(b.covered)})));
  return {root,cameraObstacles,walkObstacles,shelter,benches,seats,platform,platformWidth:5.4*widthScale,distance,annex,furnishings,shelterSize:{width:1.9,frontage:2.7,height:2.27},island:withIsland?{x:33,z:4,radiusX:9,radiusZ:32,maxHeight:.48}:null,house,grass,foliage,details,materials,lightTarget,stationCount:1,
    updatePalette(p){hutLight.intensity=p.lamps*4;lampMat.emissiveIntensity=.3+p.lamps*1.8;glass.emissiveIntensity=p.night*.65;glass.color.set(0x4f747b).lerp(new THREE.Color(0xb29969),p.night*.62);green.emissiveIntensity=.25+p.night*.35;}};
}
