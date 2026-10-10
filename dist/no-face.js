import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {NO_FACE_SEAT} from './interior-layout.js';
import {FLOOR_TOP} from './train-shell.js';

// A seated, metre-scale model made of real surfaces, not a camera-facing image.
export function createNoFace(car){
  const group=new THREE.Group();group.name='no-face';
  group.position.set(-.995,1.650,NO_FACE_SEAT.z);group.rotation.y=Math.PI/2;
  group.userData={character:'No-Face',carriage:2,seat:NO_FACE_SEAT.id};car.add(group);
  const cloak=new THREE.MeshStandardMaterial({color:0x101219,roughness:.92,metalness:0,transparent:true,opacity:.88,depthWrite:false});
  const ivory=new THREE.MeshStandardMaterial({color:0xf1ead9,roughness:.82,metalness:0});
  const ink=new THREE.MeshStandardMaterial({color:0x1e1b24,roughness:1});
  const violet=new THREE.MeshStandardMaterial({color:0x75687d,roughness:1});
  const hem=FLOOR_TOP-group.position.y;
  const profile=[[.365,hem],[.378,hem+.025],[.393,hem+.08],[.406,-.30],[.420,-.08],[.410,.085],[.355,.29],[.31,.48],[.285,.78],[.27,1.04],[.245,1.24],[.21,1.40],[.15,1.51],[.075,1.575],[0,1.605]];
  const bodyGeometry=new THREE.LatheGeometry(new THREE.SplineCurve(profile.map(([r,y])=>new THREE.Vector2(r,y))).getPoints(112),64);
  const p=bodyGeometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=Math.max(hem,p.getY(i)),z=p.getZ(i),angle=Math.atan2(z,x),fold=1+Math.sin(angle*7+y*2.3)*.018*Math.pow(1-y/1.605,2);
    // Seated knees push the lower cloak forward across the cushion. The
    // continuous surface drapes over the seat lip rather than adding limbs.
    const front=Math.max(0,z/Math.max(.001,Math.hypot(x,z)));
    const lap=.36*Math.exp(-Math.pow(Math.max(0,y-.07)/.34,2));
    const backLimit=-.070+.105*Math.min(y,.65);
    p.setXYZ(i,x*fold*.88,y,
      Math.max(backLimit,z*.54*fold+.035*(1-y/1.605)-y*.022+lap*Math.pow(front,1.3)));
  }
  bodyGeometry.computeVertexNormals();
  const body=new THREE.Mesh(bodyGeometry,cloak);body.name='no-face-cloak';group.add(body);
  // The hem rests on the same floor used by walking and carriage geometry.
  // Small feet remain mostly concealed by the continuous seated drape.
  const feet=[];for(const side of [-1,1]){const foot=new THREE.SphereGeometry(1,24,16);foot.scale(.08,.017,.075);foot.translate(side*.14,hem+.017,.45);feet.push(foot);}
  const feetMesh=new THREE.Mesh(mergeGeometries(feet,false),cloak);feetMesh.name='no-face-feet';group.add(feetMesh);feet.forEach(g=>g.dispose());
  const handsMaterial=new THREE.MeshStandardMaterial({color:0x62616a,roughness:.92,transparent:true,opacity:.84,depthWrite:false}),hands=[];
  for(const side of [-1,1]){
    const arm=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.27,.44,.28],[side*.26,.30,.46],[side*.17,.23,.54]].map(v=>new THREE.Vector3(...v))),20,.017,8,false);hands.push(arm);
    const palm=new THREE.SphereGeometry(1,20,12);palm.scale(.029,.016,.037);palm.translate(side*.17,.217,.551);hands.push(palm);
    for(let i=0;i<4;i++)hands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*(.146+i*.014),.217,.55],[side*(.145+i*.014),.185,.584],[side*(.143+i*.014),.166,.58]].map(v=>new THREE.Vector3(...v))),8,.005,6,false));
  }
  const handsMesh=new THREE.Mesh(mergeGeometries(hands,false),handsMaterial);handsMesh.name='no-face-hands';group.add(handsMesh);hands.forEach(g=>g.dispose());
  const centerY=1.125,centerZ=.186,maskW=.202,maskH=.372,maskD=.073;
  const head=new THREE.Group();head.name='no-face-head';head.position.y=centerY;group.add(head);
  const mask=new THREE.Mesh(new THREE.SphereGeometry(1,48,40),ivory);mask.name='no-face-mask';mask.scale.set(maskW,maskH,maskD);mask.position.set(0,0,centerZ);head.add(mask);
  const blackParts=[],purpleParts=[];
  // Curved markings sit on the mask surface, with no floating flat decals or
  // depth fighting. Each silhouette follows the oval's ellipsoidal curvature.
  function marking(x,y,w,h,parts,tilt=0,taper=false){
    const shape=new THREE.Shape();
    if(taper){shape.moveTo(0,h);shape.bezierCurveTo(-w,h*.4,-w,-h*.52,0,-h);shape.bezierCurveTo(w,-h*.52,w,h*.4,0,h);}
    else shape.absellipse(0,0,w,h,0,Math.PI*2,false,0);
    const flat=new THREE.ShapeGeometry(shape,20).toNonIndexed(),source=flat.attributes.position,array=[];
    // Subdivide before projection: a large flat glyph triangle would cut under
    // the curved ivory surface and leave white holes in the markings.
    const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    function subdivide(a,b,c,depth){if(!depth){for(const p of [a,b,c])array.push(p[0],p[1],0);return;}const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);subdivide(a,ab,ca,depth-1);subdivide(ab,b,bc,depth-1);subdivide(ca,bc,c,depth-1);subdivide(ab,bc,ca,depth-1);}
    for(let i=0;i<source.count;i+=3)subdivide([source.getX(i),source.getY(i)],[source.getX(i+1),source.getY(i+1)],[source.getX(i+2),source.getY(i+2)],2);
    flat.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(array,3));const q=geometry.attributes.position;
    for(let i=0;i<q.count;i++){
      const xx=q.getX(i)*Math.cos(tilt)-q.getY(i)*Math.sin(tilt)+x,yy=q.getX(i)*Math.sin(tilt)+q.getY(i)*Math.cos(tilt)+y;
      const zz=centerZ+maskD*Math.sqrt(Math.max(0,1-(xx/maskW)**2-(yy/maskH)**2))+.0025;
      q.setXYZ(i,xx,centerY+yy,zz);
    }
    geometry.computeVertexNormals();parts.push(geometry);
  }
  for(const side of [-1,1]){
    marking(side*.093,.040,.044,.019,blackParts,side*.045);
    marking(side*.097,-.004,.041,.006,blackParts);
    marking(side*.112,.159,.040,.073,purpleParts,-side*.11,true);
    marking(side*.117,-.114,.025,.109,purpleParts,side*.06,true);
  }
  marking(0,-.264,.064,.015,blackParts);marking(0,-.299,.038,.008,purpleParts);
  for(const [parts,material,name]of [[blackParts,ink,'no-face-eyes-mouth'],[purpleParts,violet,'no-face-mask-marks']]){
    const mesh=new THREE.Mesh(mergeGeometries(parts,false),material);mesh.geometry.translate(0,-centerY,0);mesh.name=name;head.add(mesh);parts.forEach(g=>g.dispose());
  }
  group.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
  const clothTime={value:0},clothSway={value:0};
  cloak.onBeforeCompile=shader=>{shader.uniforms.uCloakTime=clothTime;shader.uniforms.uCloakSway=clothSway;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uCloakTime,uCloakSway;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(position.y*3.2+uCloakTime*.64)*.009*smoothstep(-.50,.45,position.y)*(1.+uCloakSway);');};cloak.customProgramCacheKey=()=> 'no-face-breathing-cloth-v2';
  return {group,head,update(dt,time,speed,viewer){clothTime.value=time;clothSway.value=Math.min(1,Math.abs(speed)/6.5);const near=viewer?viewer.distanceTo(group.position)<3:false,peek=near?Math.sin(time*.19)*.13:Math.sin(time*.10)*.18;head.rotation.y+=(peek-head.rotation.y)*(1-Math.exp(-dt/2.8));head.rotation.z=Math.sin(time*.17)*.018;},dispose(){group.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.dispose();});for(const material of [cloak,ivory,ink,violet,handsMaterial])material.dispose();car.remove(group);}};
}
