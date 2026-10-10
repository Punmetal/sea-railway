import * as THREE from 'three';
import {Reflector} from './vendor/Reflector.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {CAB_PARTITION_Z,CUSHION_COUNT,CUSHION_SPACING,FIRST_CUSHION_Z,CUSHION_X,CUSHION_WIDTH,BACKREST_X,GRAB_POLE_X} from './interior-layout.js';
import {buildCarriageShell,buildCabPartition,frontZ,cabWidth,roofHeight,INNER_X,REAR_Z,FLOOR_TOP,SIDE_DOOR_Z} from './train-shell.js';

// Built in metres from the user's nine September 30 reference views.
// Both cars share a canonical model: the cab points +Z, the gangway -Z.
export function createTrainModel({scene,coarse,guardReflection}){
  const clamp=THREE.MathUtils.clamp;
  const materials={
    red:new THREE.MeshStandardMaterial({color:0xa55f64,roughness:.76}),
    roof:new THREE.MeshStandardMaterial({color:0x8b515a,roughness:.72}),
    cream:new THREE.MeshStandardMaterial({color:0xc3a573,metalness:.16,roughness:.61,side:THREE.DoubleSide}),
    dark:new THREE.MeshStandardMaterial({color:0x292b30,roughness:.81}),
    trim:new THREE.MeshStandardMaterial({color:0x6c4f37,roughness:.69}),
    bronze:new THREE.MeshStandardMaterial({color:0x79634e,metalness:.34,roughness:.65,side:THREE.DoubleSide}),
    wood:new THREE.MeshStandardMaterial({color:0xb18a60,roughness:.68}),
    wall:new THREE.MeshStandardMaterial({color:0x926841,roughness:.77,side:THREE.DoubleSide}),
    ceiling:new THREE.MeshStandardMaterial({color:0xd8cdb0,roughness:.86,side:THREE.DoubleSide}),
    rib:new THREE.MeshStandardMaterial({color:0xb7aa89,roughness:.81}),
    seat:new THREE.MeshStandardMaterial({color:0xa23e46,roughness:.60}),
    metal:new THREE.MeshStandardMaterial({color:0xa9aaa4,metalness:.72,roughness:.34}),
    brass:new THREE.MeshStandardMaterial({color:0xb69b59,metalness:.56,roughness:.40}),
    straps:new THREE.MeshStandardMaterial({color:0xe2d9c6,roughness:.73}),
    bag:new THREE.MeshStandardMaterial({color:0x596343,roughness:.91}),
    glass:new THREE.MeshPhysicalMaterial({color:0xc7e6e2,transparent:true,opacity:.055,roughness:.18,depthWrite:false,side:THREE.DoubleSide}),
    lamp:new THREE.MeshStandardMaterial({color:0xffedc2,emissive:0xffd49a,emissiveIntensity:.3}),
    headlight:new THREE.MeshStandardMaterial({color:0xf0f5ff,emissive:0xe9f3ff,emissiveIntensity:2.2}),
    rails:new THREE.MeshStandardMaterial({color:0x4b6171,metalness:.65,roughness:.45}),
    ties:new THREE.MeshStandardMaterial({color:0x574f4a,roughness:1})
  };
  let seed=731;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
  const texture=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;};
  const [grain,gx]=canvas(256,512);gx.fillStyle='#bd986e';gx.fillRect(0,0,256,512);
  for(let i=0;i<220;i++){const x=rnd()*256;gx.strokeStyle=`rgba(76,43,24,${.035+rnd()*.13})`;gx.lineWidth=.5+rnd();gx.beginPath();gx.moveTo(x,0);for(let y=0;y<=512;y+=12)gx.lineTo(x+Math.sin(y*.015+i)*1.8,y);gx.stroke();}
  const woodTexture=texture(grain);materials.wood.map=woodTexture;materials.wall.map=woodTexture;
  materials.floor=new THREE.MeshPhysicalMaterial({color:0xd0ac7d,map:woodTexture,roughness:.43,clearcoat:.25,clearcoatRoughness:.36});
  const [leather,lx]=canvas(256,256);lx.fillStyle='#aaaaaa';lx.fillRect(0,0,256,256);
  for(let i=0;i<12000;i++){lx.fillStyle=rnd()>.5?'rgba(255,255,255,.20)':'rgba(20,20,20,.16)';lx.fillRect(rnd()*256,rnd()*256,.5+rnd()*1.1,.5+rnd()*1.1);}
  const leatherBump=new THREE.CanvasTexture(leather);leatherBump.wrapS=leatherBump.wrapT=THREE.RepeatWrapping;
  materials.seat.bumpMap=leatherBump;materials.seat.bumpScale=.012;materials.seat.roughnessMap=leatherBump;
  // Muted paint variation, tiny oxidation flecks and rubbed edges, rather than a flat colour.
  const [paint,px]=canvas(256,256);px.fillStyle='#dedad5';px.fillRect(0,0,256,256);
  for(let i=0;i<2300;i++){px.fillStyle=rnd()>.25?'rgba(65,48,42,.055)':'rgba(255,244,226,.09)';px.fillRect(rnd()*256,rnd()*256,.4+rnd()*2,.4+rnd()*2);}
  for(let i=0;i<50;i++){px.strokeStyle='rgba(67,43,38,.07)';px.lineWidth=.5;const x=rnd()*256,y=rnd()*256;px.beginPath();px.moveTo(x,y);px.lineTo(x+.8,y+3+rnd()*12);px.stroke();}
  const paintTexture=texture(paint);for(const key of ['red','roof','cream','bronze'])materials[key].map=paintTexture;
  // Separate exterior roof hardware keeps snow off the carriage's red walls.
  materials.roofPanel=materials.red.clone();
  const batches=new Map();let collecting=null;
  function place(geometry,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
    if(collecting){mesh.updateMatrix();const g=(geometry.index?geometry.toNonIndexed():geometry.clone()).applyMatrix4(mesh.matrix);if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(g);geometry.dispose();return mesh;}
    scene.add(mesh);return mesh;
  }
  const box=(w,h,l,mat,x,y,z,rx=0,ry=0,rz=0)=>place(new THREE.BoxGeometry(w,h,l),mat,x,y,z,rx,ry,rz);
  const cylinder=(r,h,mat,x,y,z,rx=0,ry=0,rz=0)=>place(new THREE.CylinderGeometry(r,r,h,16),mat,x,y,z,rx,ry,rz);
  function flush(group){for(const [mat,geoms] of batches){const merged=mergeGeometries(geoms,false);if(!merged)throw new Error('Carriage geometry could not be batched');const mesh=new THREE.Mesh(merged,mat);mesh.name='train-'+Object.keys(materials).find(k=>materials[k]===mat);group.add(mesh);geoms.forEach(g=>g.dispose());}batches.clear();}
  function rounded(w,h,l,r,mat,x,y,z,rz=0,segments=5){const geo=new THREE.BoxGeometry(w,h,l,segments,segments,segments),p=geo.attributes.position,n=geo.attributes.normal,v=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(clamp(v.x,-w/2+r,w/2-r),clamp(v.y,-h/2+r,h/2-r),clamp(v.z,-l/2+r,l/2-r));v.sub(c).normalize();n.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(c);p.setXYZ(i,v.x,v.y,v.z);}return place(geo,mat,x,y,z,0,0,rz);}
  function tube(points,r,mat,segments=18){return place(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,6,false),mat);}
  function patch(fn,mat,cols=20,rows=8,flip=false){const p=[],uv=[],idx=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){p.push(...fn(i/cols,j/rows));uv.push(i/cols,j/rows);}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}if(flip)for(let i=0;i<idx.length;i+=3)[idx[i+1],idx[i+2]]=[idx[i+2],idx[i+1]];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return place(g,mat);}
  const windshield=(u,v,offset=0)=>{const y=2.20+v*(1.16+.24*Math.sqrt(Math.max(0,1-u*u))),x=u*cabWidth(y);return [x,y,frontZ(x,y)+offset];};
  function windowPatch(u0,u1,v0,v1,mat,offset=0){patch((u,v)=>windshield(THREE.MathUtils.lerp(u0,u1,u),THREE.MathUtils.lerp(v0,v1,v),offset),mat,16,8);}
  const cars=[],doors=[],cabDoors=[],warmLights=[],sideDoors=[];
  function makeDoor(model,index,z=-8.68,kind='gangway'){const leaf=new THREE.Group();leaf.name=kind+'-door-'+(index+1);leaf.position.z=z;model.add(leaf);const parts=new Map();
    const part=(w,h,l,mat,x,y,zz=0)=>{const geom=new THREE.BoxGeometry(w,h,l).toNonIndexed();geom.translate(x,y,zz);if(!parts.has(mat))parts.set(mat,[]);parts.get(mat).push(geom);};
    part(.93,1.065,.075,materials.wood,0,1.6275);part(.93,.11,.085,materials.trim,0,2.16);part(.93,.12,.085,materials.trim,0,3.13);
    for(const x of [-.41,.41])part(.09,.94,.085,materials.wood,x,2.64);
    part(.73,.89,.022,materials.glass,0,2.64);
    for(const face of [-1,1]){part(.72,.66,.023,materials.wall,0,1.62,face*.049);for(const x of [-.37,.37])part(.026,.74,.024,materials.trim,x,1.62,face*.057);for(const y of [1.24,2])part(.76,.028,.024,materials.trim,0,y,face*.057);part(.07,.28,.022,materials.brass,-.30,2.02,face*.068);part(.028,.19,.048,materials.metal,-.30,2.02,face*.087);}
    for(const [mat,geoms]of parts){leaf.add(new THREE.Mesh(mergeGeometries(geoms,false),mat));geoms.forEach(g=>g.dispose());}
    (kind==='cab'?cabDoors:doors)[index]={leaf,progress:0,target:0,z:z*(index===0?1:-1),car:index,kind};
  }
  function makeFloorReflection(model){const shader={uniforms:{color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()}},vertexShader:Reflector.ReflectorShader.vertexShader,fragmentShader:`uniform sampler2D tDiffuse;varying vec4 vUv;void main(){vec2 uv=vUv.xy/vUv.w;vec3 reflected=texture2D(tDiffuse,uv).rgb*.4;reflected+=(texture2D(tDiffuse,uv+vec2(.003,0.)).rgb+texture2D(tDiffuse,uv-vec2(.003,0.)).rgb+texture2D(tDiffuse,uv+vec2(0.,.003)).rgb+texture2D(tDiffuse,uv-vec2(0.,.003)).rgb)*.15;gl_FragColor=vec4(reflected,.14);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`};const m=new Reflector(new THREE.PlaneGeometry(2.60,17.34),{textureWidth:coarse?256:512,textureHeight:coarse?256:512,clipBias:.002,shader});m.name='wood-floor-reflection';m.rotation.x=-Math.PI/2;m.position.y=1.106;m.material.transparent=true;m.material.depthWrite=false;guardReflection(m);model.add(m);}
  function sideDoor(side,z){const x=side*1.408,w=1.03;
    // The belt line belongs to the leaf, so it slides clear of the portal.
    box(.025,.08,w,materials.dark,side*1.4825,2.09,z);
    box(.030,.94,.67,materials.glass,x,2.68,z);
    for(const dz of [-.352,.352])box(.031,1.01,.025,materials.dark,side*1.497,2.69,z+dz);
    for(const y of [2.18,3.20])box(.031,.025,.73,materials.dark,side*1.497,y,z);
    rounded(.026,.79,.79,.012,materials.bronze,side*1.496,1.58,z);
    rounded(.027,.72,.71,.012,materials.cream,side*1.512,1.58,z);
    for(const dz of [-.515,.515])box(.022,2.26,.018,materials.dark,side*1.494,2.23,z+dz);
    for(const face of [-1,1]){const xx=side*(1.408+face*.10);box(.026,.24,.063,materials.brass,xx,2.04,z+.36);box(.04,.17,.025,materials.metal,xx+side*face*.018,2.04,z+.36);}
    box(.29,.08,1.07,materials.bronze,side*1.42,1.08,z);
  }
  function sideWindow(side,z,w=1.31){const x=side*1.405;
    box(.028,1.10,w,materials.glass,x,2.72,z);
    for(const dz of [-w/2,w/2]){rounded(.17,1.19,.04,.010,materials.dark,side*1.437,2.72,z+dz,0,2);rounded(.046,1.16,.055,.008,materials.brass,side*1.299,2.72,z+dz,0,2);box(.041,1.10,.023,materials.trim,side*1.270,2.72,z+dz-side*.015);}
    for(const y of [2.15,3.29]){rounded(.17,.042,w+.04,.010,materials.dark,side*1.437,y,z,0,2);rounded(.046,.057,w+.075,.008,materials.brass,side*1.299,y,z,0,2);}
  }
  function makeCar(index){const car=new THREE.Group(),model=new THREE.Group();car.name='carriage-'+(index+1);model.name='reference-train-model';if(index===1)model.rotation.y=Math.PI;car.add(model);collecting=model;
    const boarding=new THREE.Group();boarding.name='boarding-door-'+(index+1);model.add(boarding);sideDoors.push({leaf:boarding,progress:0,target:0,car:index});
    const entrancePlace=(g,m,side,z)=>{if(side===1&&z===6.18){const mesh=new THREE.Mesh(g,m);boarding.add(mesh);}else place(g,m);};
    box(2.82,.19,17.66,materials.bronze,0,.92,0);
    buildCarriageShell({place,materials,sideEntrancePlace:entrancePlace});
    // Staggered plank ends and tiny nail heads, all batched, with the grain unobscured.
    const plankWidth=2*INNER_X/14;
    for(let i=0;i<14;i++){const x=-INNER_X+i*plankWidth;if(i>0)box(.006,.003,17.16,materials.trim,x,1.097,.08);for(let z=-8.45+(i%3)*.77;z<8.65;z+=2.31){box(plankWidth-.008,.003,.005,materials.trim,x+plankWidth/2,1.098,z);for(const xx of [x+.023,x+plankWidth-.023])for(const zz of [z-.035,z+.035])place(new THREE.CircleGeometry(.005,6),materials.dark,xx,1.100,zz,-Math.PI/2);}}
    for(const side of [-1,1]){const x=side*1.405;
      let start=-8.74;
      for(const z of [...SIDE_DOOR_Z,8.365]){const end=z-.515;if(end>start)box(.025,.08,end-start,materials.dark,side*1.4825,2.09,(start+end)/2);start=z+.515;}
      // Narrow panel ribs, interrupted at the two side entrances.
      for(let z=-8.68;z<7.82;z+=.31)if(Math.abs(z+8.15)>.55&&Math.abs(z-6.18)>.55){box(.013,.82,.022,materials.bronze,side*1.4765,1.54,z);box(.014,.79,.038,materials.red,side*1.477,1.55,z+.025);}
      const posts=Array.from({length:10},(_,i)=>-7.565+i*1.47);
      for(const z of posts)for(const y of [1.21,2.015])if(Math.abs(z-6.18)>.65&&Math.abs(z+8.15)>.65)place(new THREE.CylinderGeometry(.010,.010,.005,6),materials.bronze,side*1.494,y,z,0,0,Math.PI/2);
      for(const z of posts)box(.027,1.25,.14,materials.wood,side*1.2905,2.72,z);
      for(let i=0;i<9;i++)sideWindow(side,-6.83+i*1.47);
      sideDoor(side,-8.15);
      if(side===1){const saved=new Map([...batches].map(([m,gs])=>[m,gs.length]));sideDoor(side,6.18);for(const [m,gs] of batches){const fresh=gs.splice(saved.get(m)??0);if(fresh.length){boarding.add(new THREE.Mesh(mergeGeometries(fresh,false),m));fresh.forEach(g=>g.dispose());}}}else sideDoor(side,6.18);
      sideWindow(side,7.42,.66);
      // The short triangular cab-side pane follows the sloping nose.
      const sideCab=(u,v,offset=0)=>{const y=2.18+v*1.25,x=side*THREE.MathUtils.lerp(1.47,cabWidth(y),u),z=THREE.MathUtils.lerp(7.85,frontZ(side*cabWidth(y),y),u);return [x+side*offset,y,z];};
      const sidePatch=(a,b,c,d,mat,offset=0)=>patch((u,v)=>sideCab(THREE.MathUtils.lerp(a,b,u),THREE.MathUtils.lerp(c,d,v),offset),mat,6,6);
      sidePatch(.11,.90,.095,.915,materials.glass,-.08);
      for(const u of [.12,.89])tube([sideCab(u,.10,.015),sideCab(u,.50,.015),sideCab(u,.91,.015)],.021,materials.dark);
      for(const v of [.10,.91])tube([sideCab(.12,v,.015),sideCab(.89,v,.015)],.021,materials.dark,4);
      // Deep bronze sill with wheel cut-outs instead of covering the bogies.
      for(const [a,b] of [[-8.95,-7.45],[-5.25,5.25],[7.45,8.90]])box(.16,.44,b-a,materials.bronze,side*1.41,.87,(a+b)/2);
      box(.19,.075,17.48,materials.bronze,side*1.425,1.0525,0);
      box(CUSHION_WIDTH,.32,12.18,materials.wood,side*CUSHION_X,1.30,-.63);
      for(let i=0;i<CUSHION_COUNT;i++){const z=FIRST_CUSHION_Z+i*CUSHION_SPACING;rounded(CUSHION_WIDTH,.23,1.505,.082,materials.seat,side*CUSHION_X,1.55,z);rounded(.21,.68,1.505,.085,materials.seat,side*BACKREST_X,1.91,z,side*.10);}
      for(const z of [-6.75,5.48])tube([[side*GRAB_POLE_X,1.72,z],[side*.69,1.98,z],[side*.96,2.04,z],[side*1.22,2.04,z]],.025,materials.metal);
      for(const z of [-6.84,0,6.84])cylinder(.025,2.30,materials.metal,side*GRAB_POLE_X,2.26,z);
      // Five lengthwise wooden luggage rods, with curved steel brackets at the posts.
      for(let i=0;i<5;i++)cylinder(.017,12.67,materials.wood,side*(.865+i*.095),3.23,-.62,Math.PI/2);
      for(const z of posts.slice(1)){tube([[side*.79,3.25,z],[side*.92,3.18,z],[side*1.20,3.18,z],[side*1.30,3.31,z],[side*1.31,3.45,z]],.022,materials.metal);}
      cylinder(.023,14.10,materials.metal,side*GRAB_POLE_X,3.17,0,Math.PI/2);
      // Hand straps are animated separately around this rail's pivot.
      // A couple of reference-visible parcels stay above the racks, clear of walking.
      for(const z of (side<0?[-4.5]:[3.50])){rounded(.42,.30,.53,.055,materials.bag,side*.94,3.40,z);for(const dz of [-.19,.19])box(.43,.022,.018,materials.trim,side*.94,3.554,z+dz);box(.016,.30,.54,materials.trim,side*.94,3.40,z);}
    }
    // Cream transverse ribs and a central longitudinal bead on the vaulted ceiling.
    for(let z=-8.35;z<7.60;z+=1.35){const points=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI;points.push([-INNER_X*Math.cos(a),3.377+.38*Math.sin(a),z]);}tube(points,.022,materials.rib,36);}
    box(.045,.025,16.26,materials.rib,0,3.77,-.29);
    // A single low, bevelled clerestory vent, as seen in the overhead references.
    rounded(1.34,.22,4.62,.10,materials.roof,0,3.98,-.20);box(1.10,.035,4.38,materials.roofPanel,0,4.102,-.20);
    for(const z of [-2.43,2.03]){box(1.13,.11,.027,materials.dark,0,3.98,z);for(let i=0;i<4;i++)box(1.15,.012,.033,materials.bronze,0,3.94+i*.027,z+.018);}
    for(const z of [-6,-2,2,6]){cylinder(.035,.0475,materials.metal,0,3.75625,z);cylinder(.215,.045,materials.trim,0,3.71,z);cylinder(.184,.025,materials.lamp,0,3.677,z);const light=new THREE.PointLight(0xffcb81,5,10,1.5);light.position.set(0,3.30,z);model.add(light);warmLights.push(light);}
    // Flat underside panels and restrained mechanical detail visible in the underside view.
    box(2.42,.10,17.4,materials.bronze,0,.74,0);for(const x of [-.89,.89])box(.11,.16,17.35,materials.dark,x,.67,0);
    for(let z=-7.8;z<8.2;z+=2.6)box(2.38,.04,.075,materials.dark,0,.68,z);
    box(1.35,.28,2.25,materials.bronze,0,.54,-.35);for(const x of [-.65,.65])box(.035,.31,2.31,materials.dark,x,.53,-.35);
    for(const z of [-6.35,6.35]){box(1.74,.24,2.13,materials.dark,0,.65,z);
      for(const zz of [z-.67,z+.67]){cylinder(.075,2.0,materials.metal,0,.40,zz,0,0,Math.PI/2);
        for(const side of [-1,1]){cylinder(.36,.14,materials.dark,side*1.00,.40,zz,0,0,Math.PI/2);cylinder(.31,.154,materials.metal,side*1.016,.40,zz,0,0,Math.PI/2);cylinder(.105,.18,materials.bronze,side*1.05,.40,zz,0,0,Math.PI/2);box(.18,.18,.20,materials.metal,side*1.11,.43,zz);cylinder(.066,.22,materials.dark,side*.85,.71,zz);}}
      for(const side of [-1,1]){box(.11,.13,1.56,materials.bronze,side*1.09,.50,z);box(.095,.075,1.49,materials.metal,side*1.20,.39,z);for(const zz of [z-.36,z+.36])box(.10,.21,.085,materials.metal,side*1.16,.49,zz);for(let i=0;i<3;i++)box(.13,.018,1.01-i*.12,materials.dark,side*.93,.69+i*.025,z);}
    }
    // Wooden gangway end: narrow central door, boarded wall, rounded ceiling header.
    for(let x=-1.30;x<=1.31;x+=.16)if(Math.abs(x)>.51)box(.008,2.21,.014,materials.trim,x,2.23,-8.523);
    for(const face of [-1,1]){for(const x of [-.49,.49])box(.055,2.0775,.026,materials.trim,x,2.13375,-8.68+face*.163);box(1.035,.055,.026,materials.trim,0,3.20,-8.68+face*.163);box(2.608,.10,.028,materials.wood,0,3.33,-8.68+face*.164);}
    box(1.76,.025,.035,materials.metal,.37,3.22,-8.68);
    for(const y of [3.44,3.57,3.70])box(.456,.025,.031,materials.wood,0,y,-8.5145);for(const x of [-.24,.24])box(.024,.33,.030,materials.wood,x,3.57,-8.515);
    for(const x of [-.91,.91]){box(.45,.63,.026,materials.metal,x,2.63,-8.517);box(.40,.57,.030,materials.dark,x,2.63,-8.489);for(let y=2.41;y<2.89;y+=.048)box(.31,.006,.008,materials.straps,x,y,-8.470);}
    makeDoor(model,index);
    // Matching wooden cab partition: solid sides and a genuinely open central doorway.
    const cabZ=CAB_PARTITION_Z;
    buildCabPartition({place,material:materials.wall,z:cabZ});
    for(let x=-1.30;x<=1.31;x+=.16)if(Math.abs(x)>.52)for(const face of [-1,1])box(.008,2.20,.014,materials.trim,x,2.23,cabZ+face*.157);
    for(const face of [-1,1]){for(const x of [-.49,.49])box(.055,2.0775,.026,materials.trim,x,2.13375,cabZ+face*.163);box(1.035,.055,.026,materials.trim,0,3.20,cabZ+face*.163);box(2.608,.075,.028,materials.wood,0,3.36,cabZ+face*.164);}
    box(1.76,.025,.035,materials.metal,.37,3.22,cabZ);
    box(.45,.16,.018,materials.brass,-.93,2.82,cabZ-.159);
    makeDoor(model,index,cabZ,'cab');
    // Bowed lower nose and two sloped, curved windshield panes with rubber seals.
    patch((u,v)=>{const y=.67+v*(1.015-.67),x=(u*2-1)*cabWidth(y);return [x,y,frontZ(x,y)];},materials.bronze);
    for(const [a,b] of [[-.93,-.065],[.065,.93]]){
      windowPatch(a+.024,b-.024,.108,.897,materials.glass,-.035);
    }
    // The roof arch and windshield header meet without a rectangular overhang.
    for(const side of [-1,1])tube([[side*cabWidth(1.10),1.10,frontZ(side*cabWidth(1.10),1.10)],[side*cabWidth(2.18),2.18,frontZ(side*cabWidth(2.18),2.18)],[side*cabWidth(3.47),3.47,frontZ(side*cabWidth(3.47),3.47)]],.030,materials.dark);
    // White main lamp, small round marker lamps, stout silver buffers and destination board.
    // A roof-mounted pedestal and open lamp barrel. The lens is in front of
    // the annular rim, so the housing cannot hide or cut into the light.
    const lampFoot=new THREE.Shape();lampFoot.moveTo(-.17,3.955);lampFoot.lineTo(.17,3.955);
    for(const x of [.17,.10,0,-.10,-.17])lampFoot.lineTo(x,roofHeight(x/1.47));lampFoot.closePath();
    const mountingPlate=new THREE.ExtrudeGeometry(lampFoot,{depth:.28,bevelEnabled:false});mountingPlate.translate(0,0,7.57);place(mountingPlate,materials.bronze);
    cylinder(.055,.085,materials.bronze,0,3.9975,7.75);
    place(new THREE.CylinderGeometry(.18,.18,.34,24,1,true),materials.roof,0,4.215,7.87,Math.PI/2);
    place(new THREE.CircleGeometry(.18,24),materials.bronze,0,4.215,7.70,0,Math.PI);
    place(new THREE.TorusGeometry(.162,.018,8,24),materials.bronze,0,4.215,8.04);
    place(new THREE.CircleGeometry(.146,24),materials.headlight,0,4.215,8.059);
    for(const x of [-1.03,1.03]){const z=frontZ(x,1.51);cylinder(.11,.095,materials.metal,x,1.51,z+.03,Math.PI/2);cylinder(.048,.106,materials.headlight,x,1.51,z+.065,Math.PI/2);const bz=frontZ(x,.86);cylinder(.11,.22,materials.bronze,x,.86,bz+.07,Math.PI/2);cylinder(.14,.17,materials.metal,x,.86,bz+.22,Math.PI/2);}
    box(.25,.16,.27,materials.dark,0,.74,9.20);box(.11,.11,.19,materials.metal,0,.74,9.37);
    box(2.18,.12,.43,materials.wood,0,2.01,8.31);
    for(const side of [-1,1]){tube([[side*.68,2.33,frontZ(side*.68,2.33)+.025],[side*.82,2.77,frontZ(side*.82,2.77)+.025]],.011,materials.dark,4);tube([[side*.48,2.39,frontZ(side*.48,2.39)+.030],[side*.99,2.39,frontZ(side*.99,2.39)+.030]],.011,materials.dark,5);}
    for(const x of [-1.18,-.8,-.4,.4,.8,1.18])cylinder(.012,.018,materials.bronze,x,1.17,frontZ(x,1.17)+.015,Math.PI/2);
    const [cv,ctx]=canvas(128,192);ctx.fillStyle='#dab799';ctx.fillRect(0,0,128,192);ctx.strokeStyle='#574536';ctx.lineWidth=8;ctx.strokeRect(4,4,120,184);ctx.fillStyle='#433a35';ctx.font='bold 67px serif';ctx.textAlign='center';ctx.fillText('中',64,80);ctx.fillText('道',64,154);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(.37,.55),new THREE.MeshStandardMaterial({map:texture(cv),roughness:.78}));sign.name='destination-board';sign.position.set(0,1.64,frontZ(0,1.64)+.026);sign.rotation.x=-Math.atan(.37);model.add(sign);
    flush(model);collecting=null;makeFloorReflection(model);model.traverse(o=>{if(o.isMesh&&!o.isReflector){o.castShadow=!o.material.transparent;o.receiveShadow=true;}});scene.add(car);cars.push(car);
  }
  makeCar(0);makeCar(1);
  const connection=new THREE.Group();connection.name='open-articulated-gangway';scene.add(connection);
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(1.03,.08,1),materials.floor);bridge.position.y=FLOOR_TOP-.04;connection.add(bridge);
  for(const side of [-1,1]){const edge=new THREE.Mesh(new THREE.BoxGeometry(.06,.18,1),materials.wood);edge.position.set(side*.52,FLOOR_TOP+.09,0);connection.add(edge);const rail=new THREE.Mesh(new THREE.BoxGeometry(.034,.034,1),materials.metal);rail.position.set(side*.53,2.15,0);connection.add(rail);for(const z of [-.43,.43]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.96,8),materials.metal);pole.position.set(side*.53,1.67,z);connection.add(pole);}}
  // Deform the bridge to the actual portal edges of both carriages. A scaled
  // rectangle leaves wedge-shaped gaps at its corners when the cars turn.
  const bridgeParts=connection.children.map(mesh=>{mesh.updateMatrix();mesh.geometry.applyMatrix4(mesh.matrix);mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);return {mesh,source:mesh.geometry.attributes.position.array.slice()};});
  const aL=new THREE.Vector3(),aR=new THREE.Vector3(),bL=new THREE.Vector3(),bR=new THREE.Vector3(),mid=new THREE.Vector3();
  function updateGangway(){
    cars[0].localToWorld(aL.set(-.515,0,REAR_Z));cars[0].localToWorld(aR.set(.515,0,REAR_Z));
    cars[1].localToWorld(bL.set(-.515,0,-REAR_Z));cars[1].localToWorld(bR.set(.515,0,-REAR_Z));
    mid.copy(aL).add(aR).add(bL).add(bR).multiplyScalar(.25);connection.position.copy(mid);connection.rotation.y=Math.atan2(aL.x+aR.x-bL.x-bR.x,aL.z+aR.z-bL.z-bR.z);connection.scale.set(1,1,1);connection.updateMatrixWorld(true);
    for(const p of [aL,aR,bL,bR])connection.worldToLocal(p);
    for(const {mesh,source} of bridgeParts){const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const w=source[i*3]/1.03+.5,t=source[i*3+2]+.5,ax=THREE.MathUtils.lerp(aL.x,aR.x,w),az=THREE.MathUtils.lerp(aL.z,aR.z,w),bx=THREE.MathUtils.lerp(bL.x,bR.x,w),bz=THREE.MathUtils.lerp(bL.z,bR.z,w);p.setXYZ(i,THREE.MathUtils.lerp(bx,ax,t),source[i*3+1],THREE.MathUtils.lerp(bz,az,t));}
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    }
  }
  return {materials,cars,doors,cabDoors,sideDoors,warmLights,connection,updateGangway,box,cylinder};
}
