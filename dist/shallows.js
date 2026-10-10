import * as THREE from 'three';
import {routePose,A,B,TRACK_LENGTH} from './physics.js';
import {WATER_LEVEL} from './wheel-water.js';

const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
// Periodic, independent shoulders remain smooth at the route's closing seam.
export function trackWidths(t){return {
  left:1.88+.21*Math.sin(t*23)+.12*Math.sin(t*73+.7)+.065*Math.sin(t*167+1.2),
  right:1.94+.23*Math.sin(t*29+1.1)+.12*Math.sin(t*83)+.06*Math.cos(t*211)
};}
export function trackProfile(distance){const p=routePose(distance),angle=Math.atan2(p.z/B,p.x/A);return {...p,angle,...trackWidths(angle)};}
export function trackDepth(lateral,angle){
  const widths=trackWidths(angle),width=lateral<0?widths.left:widths.right,x=Math.abs(lateral),outside=Math.max(0,x-width);
  return Math.min(8,.251+.15*smooth(1.20,width,x)+.08*outside+.052*outside*outside);
}
export function nearestTrack(x,z){
  let angle=Math.atan2(z/B,x/A);
  for(let i=0;i<3;i++){
    const c=Math.cos(angle),s=Math.sin(angle),dx=A*c-x,dz=B*s-z;
    const first=dx*(-A*s)+dz*B*c,second=A*A*s*s+B*B*c*c-dx*A*c-dz*B*s;
    angle-=THREE.MathUtils.clamp(first/Math.max(1,second),-.25,.25);
  }
  const c=Math.cos(angle),s=Math.sin(angle),nx=c/A,nz=s/B,n=Math.hypot(nx,nz);
  return {angle,lateral:((x-A*c)*nx+(z-B*s)*nz)/n};
}
export function shoreDistance(x,z,shore){
  const dx=x-shore.x,dz=z-shore.z,c=Math.cos(shore.yaw),s=Math.sin(shore.yaw),lx=dx*c-dz*s,lz=dx*s+dz*c;
  const q=Math.hypot(lx/shore.radiusX,lz/shore.radiusZ),gradient=Math.hypot(lx/(shore.radiusX*shore.radiusX),lz/(shore.radiusZ*shore.radiusZ))/Math.max(q,.001);
  return (q-1)/Math.max(gradient,.001);
}
export function shoreDepth(gap){const d=Math.max(0,gap);return Math.min(8,.075+.07*d+.065*d*d);}
export function sampleDepth(x,z,shores=[]){const track=nearestTrack(x,z);let depth=trackDepth(track.lateral,track.angle);for(const s of shores)depth=Math.min(depth,shoreDepth(shoreDistance(x,z,s)));return depth;}

// This same analytic bottom drives the geometry and the ocean's absorption.
export const shallowWaterShader=`
uniform vec4 uShores[3];uniform vec3 uShoreYaws;uniform int uShoreCount;
vec2 trackWidths(float t){return vec2(1.88+.21*sin(t*23.)+.12*sin(t*73.+.7)+.065*sin(t*167.+1.2),1.94+.23*sin(t*29.+1.1)+.12*sin(t*83.)+.06*cos(t*211.));}
float seabedDepth(vec2 p){
  float t=atan(p.y/380.,p.x/600.);
  for(int i=0;i<3;i++){
    float c=cos(t),s=sin(t);vec2 delta=vec2(600.*c,380.*s)-p,velocity=vec2(-600.*s,380.*c);
    float denominator=dot(velocity,velocity)-dot(delta,vec2(600.*c,380.*s));
    t-=clamp(dot(delta,velocity)/max(1.,denominator),-.25,.25);
  }
  vec2 n=normalize(vec2(cos(t)/600.,sin(t)/380.)),delta=p-vec2(600.*cos(t),380.*sin(t));
  float lateral=dot(delta,n),x=abs(lateral);vec2 widths=trackWidths(t);float width=lateral<0.?widths.x:widths.y,outside=max(0.,x-width);
  float depth=min(8.,.251+.15*smoothstep(1.20,width,x)+.08*outside+.052*outside*outside);
  for(int i=0;i<3;i++){
    if(i>=uShoreCount)break;
    vec4 shore=uShores[i];float yaw=uShoreYaws[i];vec2 d=p-shore.xy;
    vec2 local=vec2(d.x*cos(yaw)-d.y*sin(yaw),d.x*sin(yaw)+d.y*cos(yaw));
    float q=length(local/shore.zw),gradient=length(local/(shore.zw*shore.zw))/max(q,.001);
    float gap=max(0.,(q-1.)/max(gradient,.001));depth=min(depth,min(8.,.075+.07*gap+.065*gap*gap));
  }
  return depth;
}`;

export function createShallows(scene,{coarse=false,shores=[]}={}){
  const positions=[],colors=[],indices=[],tint=new THREE.Color();
  const add=(x,y,z,depth,shade=0)=>{positions.push(x,y,z);tint.setRGB(.40+shade,.43+shade,.34+shade).lerp(new THREE.Color(.18,.29,.31),smooth(.8,8,depth)*.58);colors.push(tint.r,tint.g,tint.b);};
  const segments=Math.ceil(TRACK_LENGTH/(coarse?3:2)),bands=11;
  for(let i=0;i<=segments;i++){
    const p=trackProfile(i/segments*TRACK_LENGTH),offsets=[-p.left-13,-p.left-8,-p.left-4,-p.left-1.5,-p.left,0,p.right,p.right+1.5,p.right+4,p.right+8,p.right+13];
    for(const x of offsets){const depth=trackDepth(x,p.angle);add(p.x+Math.cos(p.yaw)*x,WATER_LEVEL-depth-.018,p.z-Math.sin(p.yaw)*x,depth,.015*Math.sin(p.angle*97+x*2));}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<bands-1;j++){const a=i*bands+j,b=a+bands;indices.push(a,b,a+1,a+1,b,b+1);}
  for(const shore of shores){
    const base=positions.length/3,steps=coarse?64:96,gaps=[-.8,0,.8,1.8,3.2,5.2,8,11];
    for(const gap of gaps)for(let j=0;j<=steps;j++){
      const a=j/steps*Math.PI*2,c=Math.cos(a),s=Math.sin(a),gradient=Math.hypot(c/shore.radiusX,s/shore.radiusZ),q=1+gap*gradient;
      const lx=c*shore.radiusX*q,lz=s*shore.radiusZ*q,cy=Math.cos(shore.yaw),sy=Math.sin(shore.yaw),depth=shoreDepth(gap);
      add(shore.x+lx*cy+lz*sy,WATER_LEVEL-depth-.018,shore.z-lx*sy+lz*cy,depth,.012*Math.sin(a*13));
    }
    for(let i=0;i<gaps.length-1;i++)for(let j=0;j<steps;j++){const a=base+i*(steps+1)+j,b=a+steps+1;indices.push(a,a+1,b,b,a+1,b+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const time={value:0},material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uBedTime=time;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBedWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBedWorld=(modelMatrix*vec4(position,1.)).xyz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vBedWorld;uniform float uBedTime;
      float bedHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float bedNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bedHash(i),bedHash(i+vec2(1.,0.)),f.x),mix(bedHash(i+vec2(0.,1.)),bedHash(i+1.),f.x),f.y);}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 refraction=vec2(sin(vBedWorld.z*1.3+uBedTime*.31),sin(vBedWorld.x*1.1-uBedTime*.27))*.035;
      float grain=bedNoise((vBedWorld.xz+refraction)*18.);
      float mottle=bedNoise((vBedWorld.xz+refraction)*1.7);
      diffuseColor.rgb*=.88+grain*.16+mottle*.10;
      float shallow=1.-smoothstep(.25,2.4,-vBedWorld.y);
      float bedFootprint=max(length(dFdx(vBedWorld.xz)),length(dFdy(vBedWorld.xz)));
      vec2 lightCell=vBedWorld.xz*2.3+refraction*4.;
      float causticLine=abs(sin(lightCell.x+sin(lightCell.y*.8+uBedTime*.11))*.6+sin(lightCell.y-uBedTime*.13)*.5);
      float caustic=(1.-smoothstep(.035,.15,causticLine))*.10*(.6+.4*bedNoise(lightCell*.7));
      caustic*=1.-smoothstep(.035,.24,bedFootprint);
      diffuseColor.rgb+=vec3(.38,.49,.42)*caustic*shallow;`);
  };material.customProgramCacheKey=()=> 'sea-railway-seabed-v1';
  const mesh=new THREE.Mesh(geometry,material);mesh.name='shallow-seabed';mesh.receiveShadow=true;scene.add(mesh);
  const shoreVectors=Array.from({length:3},(_,i)=>{const s=shores[i];return s?new THREE.Vector4(s.x,s.z,s.radiusX,s.radiusZ):new THREE.Vector4(0,0,1,1);});
  return {mesh,shores,uniforms:{uShores:{value:shoreVectors},uShoreYaws:{value:new THREE.Vector3(...[0,1,2].map(i=>shores[i]?.yaw??0))},uShoreCount:{value:Math.min(3,shores.length)}},update(elapsed){time.value=elapsed;},dispose(){geometry.dispose();material.dispose();}};
}
