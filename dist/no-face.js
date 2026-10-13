import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {NO_FACE_SEAT} from './interior-layout.js';
import {FLOOR_TOP} from './train-shell.js';

// A seated, metre-scale model made of real surfaces, not a camera-facing image.
export function createNoFace(car){
  const group=new THREE.Group();group.name='no-face';
  group.position.set(-.995,1.650,NO_FACE_SEAT.z);group.rotation.y=Math.PI/2;
  group.userData={character:'No-Face',carriage:2,seat:NO_FACE_SEAT.id};car.add(group);
  const cloak=new THREE.MeshStandardMaterial({color:0x0c0d12,roughness:.92,metalness:0,transparent:true,opacity:.91,depthWrite:false});
  const ivory=new THREE.MeshStandardMaterial({color:0xf1ead9,roughness:.82,metalness:0});
  const ink=new THREE.MeshStandardMaterial({color:0x1e1b24,roughness:1});
  const violet=new THREE.MeshStandardMaterial({color:0x6c58a6,roughness:.9});
  const hem=FLOOR_TOP-group.position.y;
  // The mask sits in a hood: the head is wider than the mask and its front
  // forms a shallow plate behind it, so the mask reads as No-Face's face.
  const centerY=1.115,centerZ=.235,maskW=.232,maskH=.330,maskD=.090;
  const profile=[[.40,hem],[.412,hem+.025],[.425,hem+.08],[.436,-.30],[.448,-.08],[.440,.085],[.405,.29],[.380,.48],[.372,.78],[.384,1.04],[.370,1.24],[.318,1.40],[.228,1.51],[.118,1.575],[0,1.605]];
  const bodyGeometry=new THREE.LatheGeometry(new THREE.SplineCurve(profile.map(([r,y])=>new THREE.Vector2(r,y))).getPoints(112),72);
  const p=bodyGeometry.attributes.position,smax=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.max(a,b)+h*h*k/4;};
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=Math.max(hem,p.getY(i)),z=p.getZ(i),angle=Math.atan2(z,x),fold=1+Math.sin(angle*7+y*2.3)*.018*Math.pow(1-y/1.605,2);
    // Seated knees push the lower cloak forward across the cushion. The
    // continuous surface drapes over the seat lip rather than adding limbs.
    const front=Math.max(0,z/Math.max(.001,Math.hypot(x,z)));
    const lap=.36*Math.exp(-Math.pow(Math.max(0,y-.07)/.34,2));
    // The back settles against the backrest; above the lap the body is a
    // full rounded bell rather than a flat front shell.
    const backLimit=-.135,depth=THREE.MathUtils.lerp(.54,.62,THREE.MathUtils.smoothstep(y,.15,.62))-.04*THREE.MathUtils.smoothstep(y,.85,1.05);
    const X=x*fold*.88;let Z=Math.max(backLimit,z*depth*fold+.035*(1-y/1.605)-y*.022+lap*Math.pow(front,1.3));
    const fx=X/(maskW*1.10),fy=(y-centerY)/(maskH*1.08),r=Math.sqrt(fx*fx+fy*fy);
    const plate=centerZ-.004-.012*Math.min(r,1)**2-.42*Math.max(0,r-1);
    Z=THREE.MathUtils.lerp(Z,smax(Z,plate,.05),THREE.MathUtils.smoothstep(front,.12,.5));
    p.setXYZ(i,X,y,Z);
  }
  bodyGeometry.computeVertexNormals();
  const body=new THREE.Mesh(bodyGeometry,cloak);body.name='no-face-cloak';group.add(body);
  // The hem rests on the same floor used by walking and carriage geometry;
  // no separate feet show through the translucent drape.
  // Thin grey forearms leave the drape at the sides and the small hands rest
  // on the actual lap surface, found by casting down onto the cloak.
  const handsMaterial=new THREE.MeshStandardMaterial({color:0x56555e,roughness:.9}),hands=[];
  const caster=new THREE.Raycaster(),probe=new THREE.Mesh(bodyGeometry,cloak);
  const lapY=(x,z,fallback)=>{caster.set(new THREE.Vector3(x,1.2,z),new THREE.Vector3(0,-1,0));const hit=caster.intersectObject(probe)[0];return hit?hit.point.y:fallback;};
  const frontZ=(x,y,fallback)=>{caster.set(new THREE.Vector3(x,y,1.5),new THREE.Vector3(0,0,-1));const hit=caster.intersectObject(probe)[0];return hit?hit.point.z:fallback;};
  const taper=(points,r0,r1,segments=24,radial=10)=>{const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),false,'centripetal'),g=new THREE.TubeGeometry(path,segments,1,radial,false),q=g.attributes.position;
    for(let k=0;k<=segments;k++){const c=path.getPointAt(k/segments),rad=THREE.MathUtils.lerp(r0,r1,k/segments);for(let j=0;j<=radial;j++){const n=k*(radial+1)+j;q.setXYZ(n,c.x+(q.getX(n)-c.x)*rad,c.y+(q.getY(n)-c.y)*rad,c.z+(q.getZ(n)-c.z)*rad);}}g.computeVertexNormals();return g;};
  for(const side of [-1,1]){
    const hx=side*.165,hz=.47,hy=lapY(hx,hz,.24)+.012;
    // The forearm starts inside the drape and emerges through its surface.
    const ex=side*.205,ey=hy+.085,ez=Math.min(frontZ(ex,ey,hz-.16),hz-.10);
    hands.push(taper([[side*.212,ey+.03,ez-.08],[ex,ey,ez+.004],[side*.188,hy+.030,(ez+hz)/2-.012],[hx+side*.006,hy+.003,hz-.015]],.022,.016));
    const palm=new THREE.SphereGeometry(1,20,12);palm.scale(.031,.014,.036);palm.rotateX(.18);palm.translate(hx,hy,hz);hands.push(palm);
    // Fingers drape forward over the curve of the knee and stay short.
    for(let f=0;f<4;f++){const fx=hx+(f-1.5)*.014,y1=Math.max(lapY(fx,hz+.046,hy-.012)+.006,hy-.016),y2=Math.max(lapY(fx,hz+.064,y1-.02)+.005,y1-.024);
      hands.push(taper([[fx,hy,hz+.020],[fx+(f-1.5)*.003,y1,hz+.046],[fx+(f-1.5)*.005,Math.min(y2,y1-.006),hz+.062-Math.abs(f-1.5)*.006]],.0072,.0050,10,6));}
    hands.push(taper([[hx-side*.024,hy+.002,hz-.006],[hx-side*.034,hy-.004,hz+.018],[hx-side*.030,hy-.012,hz+.036]],.0068,.005,8,6));
  }
  const handsMesh=new THREE.Mesh(mergeGeometries(hands,false),handsMaterial);handsMesh.name='no-face-hands';group.add(handsMesh);hands.forEach(g=>g.dispose());
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
    // Narrow black eyes with a thin lower lid; short purple marks above and
    // longer tapering ones below, all kept well inside the mask outline.
    marking(side*.098,.036,.047,.017,blackParts,side*.04);
    marking(side*.099,.002,.040,.0055,blackParts);
    marking(side*.099,.118,.020,.050,purpleParts,-side*.04,true);
    marking(side*.100,-.088,.021,.072,purpleParts,side*.03,true);
  }
  marking(0,-.205,.052,.014,blackParts);marking(0,-.232,.030,.008,purpleParts);
  for(const [parts,material,name]of [[blackParts,ink,'no-face-eyes-mouth'],[purpleParts,violet,'no-face-mask-marks']]){
    const mesh=new THREE.Mesh(mergeGeometries(parts,false),material);mesh.geometry.translate(0,-centerY,0);mesh.name=name;head.add(mesh);parts.forEach(g=>g.dispose());
  }
  group.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
  const clothTime={value:0},clothSway={value:0};
  cloak.onBeforeCompile=shader=>{shader.uniforms.uCloakTime=clothTime;shader.uniforms.uCloakSway=clothSway;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uCloakTime,uCloakSway;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(position.y*3.2+uCloakTime*.64)*.009*smoothstep(-.50,.45,position.y)*(1.+uCloakSway);');};cloak.customProgramCacheKey=()=> 'no-face-breathing-cloth-v2';
  return {group,head,update(dt,time,speed,viewer){clothTime.value=time;clothSway.value=Math.min(1,Math.abs(speed)/6.5);const near=viewer?viewer.distanceTo(group.position)<3:false,peek=near?Math.sin(time*.19)*.06:Math.sin(time*.10)*.05;head.rotation.y+=(peek-head.rotation.y)*(1-Math.exp(-dt/2.8));head.rotation.z=Math.sin(time*.17)*.018;},dispose(){group.traverse(mesh=>{if(mesh.isMesh)mesh.geometry.dispose();});for(const material of [cloak,ivory,ink,violet,handsMaterial])material.dispose();car.remove(group);}};
}
