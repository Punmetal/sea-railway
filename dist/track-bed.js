import * as THREE from 'three';
import {TRACK_LENGTH} from './physics.js';
import {trackProfile,trackDepth} from './shallows.js';
import {WATER_LEVEL} from './wheel-water.js';

// The central rail support stays level while its two shoulders meander independently.
export function createTrackBed(scene,{coarse=false}={}){
  const segments=Math.ceil(TRACK_LENGTH/1.1),positions=[],uv=[],indices=[];
  for(let i=0;i<=segments;i++){
    const distance=i/segments*TRACK_LENGTH,p=trackProfile(distance),nx=Math.cos(p.yaw),nz=-Math.sin(p.yaw);
    const offsets=[-p.left,-1.20-(p.left-1.20)*.45,-.85,0,.85,1.20+(p.right-1.20)*.45,p.right];
    for(const x of offsets){positions.push(p.x+nx*x,WATER_LEVEL-trackDepth(x,p.angle),p.z+nz*x);uv.push(x,distance);}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<6;j++){const a=i*7+j,b=a+7;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0x969c98,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGravel;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGravel=uv;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vGravel;vec2 gravelHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.54);}
      vec3 gravelColor(vec2 p){
        vec2 q=p*11.+vec2(sin(p.y*.71),sin(p.x*2.7+p.y*.29))*.52,grid=floor(q);float nearest=9.;vec2 cell=grid;
        for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){
          vec2 c=grid+vec2(float(i),float(j)),delta=c+.10+gravelHash(c)*.80-q;
          float stretch=.74+gravelHash(c+7.).y*.65,d=length(delta*vec2(stretch,1./stretch));
          if(d<nearest){nearest=d;cell=c;}
        }
        float shade=gravelHash(cell).x;vec3 rock=mix(vec3(.31,.37,.38),vec3(.66,.65,.57),shade);
        rock*=.76+.24*(1.-smoothstep(.08,.56,nearest));
        float grout=smoothstep(.39,.65,nearest);return mix(rock,vec3(.26,.30,.26),grout*.66);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=gravelColor(vGravel)*1.65;');
  };material.customProgramCacheKey=()=> 'sea-railway-ballast-v2';
  const bed=new THREE.Mesh(geo,material);bed.name='submerged-gravel-track-bed';bed.receiveShadow=true;scene.add(bed);
  const count=coarse?6500:18000,rockGeo=new THREE.IcosahedronGeometry(1,0),rockMat=new THREE.MeshStandardMaterial({color:0x8b9290,roughness:1}),rocks=new THREE.InstancedMesh(rockGeo,rockMat,count);rocks.name='ballast-pebbles';rocks.receiveShadow=true;
  let seed=8901;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const transform=new THREE.Object3D(),color=new THREE.Color();
  const tieSpacing=TRACK_LENGTH/Math.floor(TRACK_LENGTH/.62);
  const gapDistance=d=>{const phase=((d%tieSpacing)+tieSpacing)%tieSpacing;return d+tieSpacing*.5-phase;};
  for(let i=0;i<count;i++){
    let d,p;
    do{d=rnd()*TRACK_LENGTH;p=trackProfile(d);}while(rnd()>.64+.24*Math.sin(p.angle*47+.3)*Math.sin(p.angle*113));
    let x=-p.left+.075+rnd()*(p.left+p.right-.15);
    const size=.028+Math.pow(rnd(),1.8)*.086;
    if(Math.abs(Math.abs(x)-.72)<.16+size)x=Math.sign(x)*(.72+(Math.abs(x)<.72?-1:1)*(.18+size));
    if(Math.abs(x)<1.1){d=gapDistance(d)+(rnd()-.5)*.12;p=trackProfile(d);}
    x=THREE.MathUtils.clamp(x,-p.left+.065,p.right-.065);
    const y=WATER_LEVEL-trackDepth(x,p.angle)+size*.12;
    transform.position.set(p.x+Math.cos(p.yaw)*x,y,p.z-Math.sin(p.yaw)*x);
    transform.rotation.set((rnd()-.5)*.55,rnd()*Math.PI,(rnd()-.5)*.55);transform.scale.set(size*(.85+rnd()*.65),size*(.25+rnd()*.16),size*(.7+rnd()*.50));transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
    color.setHSL(.10+rnd()*.12,.035+rnd()*.14,.36+rnd()*.27);rocks.setColorAt(i,color);
  }
  scene.add(rocks);
  // Five bent, tapered blades form each tuft; broad random clusters, no rows.
  const blades=[],bladeColors=[],up=new THREE.Color(0x93a570),base=new THREE.Color(0x626d49);
  for(let j=0;j<5;j++){
    const a=j*2.39996,c=Math.cos(a),s=Math.sin(a),h=.72+(j%3)*.14,w=.025+(j%2)*.010,lean=.09+(j%3)*.06;
    const points=[[-w,0,0],[w,0,0],[-w*.55,h*.56,lean*.4],[w*.55,h*.56,lean*.4],[0,h,lean]];
    for(const [index,height] of [[0,0],[1,0],[2,.56],[2,.56],[1,0],[3,.56],[2,.56],[3,.56],[4,1]]){
      const [x,y,z]=points[index];blades.push(x*c+z*s,y,-x*s+z*c);color.copy(base).lerp(up,height*.68);bladeColors.push(color.r,color.g,color.b);
    }
  }
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));grassGeo.setAttribute('color',new THREE.Float32BufferAttribute(bladeColors,3));grassGeo.computeVertexNormals();
  const grassMat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  const grass=new THREE.InstancedMesh(grassGeo,grassMat,coarse?380:1000);grass.name='trackside-grass';grass.receiveShadow=true;
  for(let i=0;i<grass.count;i++){
    // Tufts share small neighbourhoods, but each root is scattered inside them.
    const cluster=Math.floor(i/4),centre=(cluster*.61803398875%1)*TRACK_LENGTH;
    let d=centre+(rnd()-.5)*2.9,inner=rnd()<.14,side=rnd()<.5?-1:1;
    if(inner)d=gapDistance(d);
    const p=trackProfile(d);
    let x=inner?(rnd()<.5?(rnd()-.5)*.78:side*(1.10+rnd()*.20)):side*Math.max(1.44,(side<0?p.left:p.right)-.26+rnd()*.18);
    const height=inner?.11+rnd()*.075:.32+Math.pow(rnd(),.7)*.29;
    transform.position.set(p.x+Math.cos(p.yaw)*x,WATER_LEVEL-trackDepth(x,p.angle)+.003,p.z-Math.sin(p.yaw)*x);
    transform.rotation.set(0,rnd()*Math.PI*2,0);const spread=.65+rnd()*1.75;transform.scale.set(spread,height,spread);transform.updateMatrix();grass.setMatrixAt(i,transform.matrix);
    color.setHSL(.20+rnd()*.055,.09+rnd()*.10,.82+rnd()*.12);grass.setColorAt(i,color);
  }
  scene.add(grass);
  return {bed,rocks,grass,top:-.18,halfWidth:2.4,dispose(){geo.dispose();material.dispose();rockGeo.dispose();rockMat.dispose();grassGeo.dispose();grassMat.dispose();}};
}
