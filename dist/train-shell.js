import * as THREE from 'three';
import {mergeVertices} from './vendor/BufferGeometryUtils.js';

// The same profiles define the walls, ceiling, end faces and floor. Window
// apertures are cut out of a thick shell, rather than gaps between trim boxes.
export const OUTER_X=1.47,INNER_X=1.304,REAR_Z=-8.83,NOSE_START_Z=7.85,FLOOR_TOP=1.095;
export const frontZ=(x,y)=>9.04-(y-.90)*.37+.13*(1-(x/1.45)**2);
export const cabWidth=y=>1.45-.045*(y-1.05);
const lerp=THREE.MathUtils.lerp;
const roots=t=>Math.sqrt(Math.max(0,1-t*t));
export const roofHeight=(t,inner=false)=>profileAt(t,a=>(inner?3.40:3.46)+(inner?.38:.44)*roots(a));
export const SIDE_DOOR_Z=[-8.15,6.18];
export const SIDE_WINDOWS=[...Array.from({length:9},(_,i)=>({z:-6.83+i*1.47,w:1.31})),{z:7.42,w:.66}];

// Each occupied grid cell has an outside and an inside face. Reveals are
// generated only next to an aperture or a free boundary, never between cells.
// This keeps the wall volume continuous without coplanar cover geometry.
export function shellPanel({place,outer,inner,us,vs,cell,flip=false,capEdges=[true,true,true,true],smooth=false,revealSlot}){
  const batches=new Map(),nu=us.length-1,nv=vs.length-1;
  const cells=Array.from({length:nv},(_,j)=>Array.from({length:nu},(_,i)=>cell((us[i]+us[i+1])/2,(vs[j]+vs[j+1])/2)));
  function quad(mat,points,uvs,reverse=flip){if(!batches.has(mat))batches.set(mat,{p:[],uv:[]});const b=batches.get(mat),indices=reverse?[0,2,1,0,3,2]:[0,1,2,0,2,3];for(const n of indices){b.p.push(...points[n]);b.uv.push(...uvs[n]);}}
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    const mats=cells[j][i];if(!mats)continue;
    const coords=[[us[i],vs[j]],[us[i+1],vs[j]],[us[i+1],vs[j+1]],[us[i],vs[j+1]]];
    const o=coords.map(([u,v])=>outer(u,v)),n=coords.map(([u,v])=>inner(u,v));
    quad(mats[0],o,coords);quad(mats[1],n,coords,!flip);
    // bottom, right, top, left in the outside face's winding order.
    const neighbours=[[j-1,i],[j,i+1],[j+1,i],[j,i-1]];
    for(let e=0;e<4;e++){const [jj,ii]=neighbours[e],boundary=jj<0||jj>=nv||ii<0||ii>=nu;
      if((boundary&&capEdges[e])||(!boundary&&!cells[jj][ii])){const a=e,b=(e+1)%4,cap=[o[a],n[a],n[b],o[b]],pieces=revealSlot?.(e,coords,cap)||[cap];for(const points of pieces)quad(mats[2]||mats[1],points,[[0,0],[1,0],[1,1],[0,1]]);}}
  }
  for(const [mat,b] of batches){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));if(smooth){const welded=mergeVertices(g);g.dispose();g=welded;}g.computeVertexNormals();place(g,mat);}
}
const knots=values=>[...new Set(values.map(v=>Math.round(v*1e10)/1e10))].sort((a,b)=>a-b);
const subdivide=(values,step)=>knots(values.flatMap((a,i)=>i===values.length-1?[a]:Array.from({length:Math.ceil((values[i+1]-a)/step)},(_,j)=>lerp(a,values[i+1],j/Math.ceil((values[i+1]-a)/step)))));
const PROFILE_T=knots([...Array.from({length:33},(_,i)=>-Math.cos(i/32*Math.PI)),...subdivide([-1,-.93,-.906,-.089,-.065,.065,.089,.906,.93,1],.065)]);
function profileAt(t,fn){t=THREE.MathUtils.clamp(t,-1,1);let i=0;while(i<PROFILE_T.length-2&&PROFILE_T[i+1]<t)i++;const a=PROFILE_T[i],b=PROFILE_T[i+1],f=(t-a)/(b-a),p=fn(a),q=fn(b);return Array.isArray(p)?p.map((v,j)=>lerp(v,q[j],f)):lerp(p,q,f);}
function noseRoof(t,inside=false){return profileAt(t,a=>{const y=3.46+.44*roots(a),x=a*cabWidth(y);return [x-(inside?a*(OUTER_X-INNER_X):0),inside?3.40+.38*roots(a):y,frontZ(x,y)-(inside?.075:0)];});}
// Open the right jamb's middle 24 cm into the wall cavity. The decorative jamb
// stays on its two faces; neither it nor a solid reveal cuts through the leaf.
function doorPocket(edge,coords,[a,b,c,d]){
  if(edge!==3||Math.abs(coords[0][0]-.465)>1e-7)return null;
  const mix=(p,q,f)=>p.map((n,i)=>lerp(n,q[i],f));
  return [[a,mix(a,b,.10),mix(d,c,.10),d],[mix(a,b,.90),b,c,mix(d,c,.90)]];
}

export function buildCarriageShell({place,materials:m,sideEntrancePlace}){
  const panel=args=>shellPanel({place,...args});
  const opaque=(outside,inside=m.wall)=>[outside,inside,m.trim];
  const sideY=y=>y>3.30?y-(y-3.30)/.16*.06:y;
  for(const side of [-1,1]){
    const zs=knots([REAR_Z,NOSE_START_Z,...SIDE_WINDOWS.flatMap(w=>[w.z-w.w/2,w.z+w.w/2]),...SIDE_DOOR_Z.flatMap(z=>[z-.515,z+.515])]);
    panel({outer:(z,y)=>[side*OUTER_X,y,z],inner:(z,y)=>[side*INNER_X,sideY(y),z],us:zs,vs:[1.015,1.095,2.13,2.17,3.27,3.30,3.39,3.46],flip:side>0,capEdges:[true,false,false,false],cell:(z,y)=>{
      if(SIDE_DOOR_Z.some(d=>Math.abs(z-d)<.515)&&y<3.39)return null;
      if(y>2.17&&y<3.27&&SIDE_WINDOWS.some(w=>Math.abs(z-w.z)<w.w/2))return null;
      return opaque(y<2.13?m.red:m.cream,y<2.17?m.wall:m.ceiling);
    }});
    // A complete side entrance leaf with one glazed opening, including its
    // lower/upper window reveals. The boarding leaf is collected separately.
    for(const z of SIDE_DOOR_Z)shellPanel({place:sideEntrancePlace?(g,m)=>sideEntrancePlace(g,m,side,z):place,outer:(dz,y)=>[side*1.488,y,z+dz],inner:(dz,y)=>[side*INNER_X,y,z+dz],us:[-.515,-.335,.335,.515],vs:[1.015,2.21,3.15,3.39],flip:side>0,cell:(dz,y)=>Math.abs(dz)<.335&&y>2.21&&y<3.15?null:opaque(m.cream)});
    const nose=(u,y,inner=false)=>{const x=side*lerp(OUTER_X,cabWidth(y),u),z=lerp(NOSE_START_Z,frontZ(side*cabWidth(y),y),u);return [x-(inner?side*(OUTER_X-INNER_X):0),inner?sideY(y):y,z-(inner?u*.075:0)];};
    panel({outer:(u,y)=>nose(u,y),inner:(u,y)=>nose(u,y,true),us:[0,.12,.89,1],vs:[1.015,2.13,2.305,3.3175,3.30,3.46].sort((a,b)=>a-b),flip:side>0,capEdges:[true,false,false,false],cell:(u,y)=>u>.12&&u<.89&&y>2.305&&y<3.3175?null:opaque(y<2.13?m.red:m.cream,y<2.13?m.wall:m.ceiling)});
  }
  const front=(t,v,inside=false)=>{
    const y=v<=1?lerp(1.015,2.20,v):2.20+(Math.min(v,2)-1)*(1.16+.24*roots(t));
    const x=t*cabWidth(y),p=[x-(inside?t*(OUTER_X-INNER_X):0),inside?sideY(y):y,frontZ(x,y)-(inside?.075:0)];
    return v<=2?p:p.map((n,i)=>lerp(n,noseRoof(t,inside)[i],v-2));
  };
  panel({outer:(t,v)=>front(t,v),inner:(t,v)=>front(t,v,true),us:PROFILE_T,vs:subdivide([0,(FLOOR_TOP-1.015)/1.185,(2.15-1.015)/1.185,1,1.085,1.108,1.897,1.92,2,3],.16),capEdges:[true,false,false,false],cell:(t,v)=>{
    if(v>1.108&&v<1.897&&((t>-.906&&t<-.089)||(t>.089&&t<.906)))return null;
    const rubber=v>1.085&&v<1.92&&((t>-.93&&t<-.065)||(t>.065&&t<.93));
    return opaque(v<1?(v<(2.15-1.015)/1.185?m.red:m.dark):rubber?m.dark:m.cream,v<1?m.wall:m.ceiling);
  }});
  const roof=(t,v,inside=false)=>{const p=[t*(inside?INNER_X:OUTER_X),roofHeight(t,inside),v<=.96?lerp(REAR_Z,NOSE_START_Z,v/.96):NOSE_START_Z];return v<=.96?p:p.map((n,i)=>lerp(n,noseRoof(t,inside)[i],(v-.96)/.04));};
  panel({outer:(t,v)=>roof(t,v),inner:(t,v)=>roof(t,v,true),us:PROFILE_T,vs:[...Array.from({length:41},(_,i)=>i/40*.96),.97,.98,.99,1],flip:true,capEdges:[false,false,false,false],smooth:true,cell:()=>[m.roof,m.ceiling]});
  // Rear bulkhead reaches the very same curved roof profile and side walls.
  // Preserve the door jamb positions as the wing width changes with thickness.
  const rearX=(x,v,inside=false)=>{const w=inside?INNER_X:OUTER_X,t=Math.abs(x)<=.465?x:Math.sign(x)*lerp(.465,w,(Math.abs(x)-.465)/(OUTER_X-.465));return [t,v<=1?lerp(1.015,3.20,v):lerp(3.20,roofHeight(t/w,inside),v-1),inside?REAR_Z+.30:REAR_Z];};
  const innerToOuter=x=>Math.abs(x)<=.465?x:Math.sign(x)*lerp(.465,OUTER_X,(Math.abs(x)-.465)/(INNER_X-.465));
  const floorV=(FLOOR_TOP-1.015)/(3.20-1.015);
  panel({outer:(x,v)=>rearX(x,v),inner:(x,v)=>rearX(x,v,true),us:knots([...subdivide([-OUTER_X,-.515,-.465,.465,.515,OUTER_X],.10),...PROFILE_T.map(t=>t*OUTER_X),...PROFILE_T.map(t=>innerToOuter(t*INNER_X))]),vs:[0,floorV,1,2],flip:true,capEdges:[true,false,false,false],revealSlot:doorPocket,cell:(x,v)=>(Math.abs(x)<.465&&v<1)||(Math.abs(x)<.515&&v<floorV)?null:opaque(m.wall)});
  // The shaped floor follows the bowed nose; its front corners used to end in
  // mid-air because the entire floor was a shorter rectangular box.
  const shape=new THREE.Shape(),rearInside=REAR_Z+.30;
  // The floor meets the inside of the bulkhead; only the doorway tongue runs
  // through it to the bridge. No shared floor/end-wall faces can flicker.
  shape.moveTo(-INNER_X,-rearInside);shape.lineTo(-.515,-rearInside);shape.lineTo(-.515,-REAR_Z);shape.lineTo(.515,-REAR_Z);shape.lineTo(.515,-rearInside);shape.lineTo(INNER_X,-rearInside);shape.lineTo(INNER_X,-NOSE_START_Z);
  const noseW=cabWidth(FLOOR_TOP)-(OUTER_X-INNER_X);
  shape.lineTo(noseW,-(frontZ(cabWidth(FLOOR_TOP),FLOOR_TOP)-.075));
  for(const t of [...PROFILE_T].reverse().slice(1))shape.lineTo(t*noseW,-(frontZ(t*cabWidth(FLOOR_TOP),FLOOR_TOP)-.075));
  shape.lineTo(-INNER_X,-NOSE_START_Z);shape.closePath();
  const floor=new THREE.ExtrudeGeometry(shape,{depth:.08,bevelEnabled:false,curveSegments:1});floor.rotateX(-Math.PI/2);floor.translate(0,1.015,0);place(floor,m.floor);
}

export function buildCabPartition({place,material,z}){
  shellPanel({place,outer:(x,v)=>[x,v<=1?lerp(FLOOR_TOP,3.20,v):lerp(3.20,roofHeight(x/INNER_X,true),v-1),z+.15],inner:(x,v)=>[x,v<=1?lerp(FLOOR_TOP,3.20,v):lerp(3.20,roofHeight(x/INNER_X,true),v-1),z-.15],us:knots([...subdivide([-INNER_X,-.465,.465,INNER_X],.10),...PROFILE_T.map(t=>t*INNER_X)]),vs:[0,1,2],revealSlot:doorPocket,cell:(x,v)=>Math.abs(x)<.465&&v<1?null:[material,material]});
}
