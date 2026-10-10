import * as THREE from 'three';

export function makeLeafGeometry(){
  const points=[0,0,0,-.22,.22,.014,0,.22,.055,.22,.22,.014,-.30,.54,.018,0,.54,.09,.30,.54,.018,-.17,.82,.014,0,.82,.055,.17,.82,.014,0,1,0];
  const indices=[0,2,1,0,3,2,1,2,4,2,5,4,2,3,5,3,6,5,4,5,7,5,8,7,5,6,8,6,9,8,7,8,10,8,9,10];
  const uv=[];for(let i=0;i<points.length;i+=3)uv.push(points[i]/.6+.5,points[i+1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export const leafWindVertex=`
  vec3 leafAnchor=instanceMatrix[3].xyz;
  float leafPhase=leafAnchor.x*.83+leafAnchor.z*.57;
  transformed.x+=sin(uLeafTime*.72+leafPhase)*.075*uv.y;
  transformed.z+=sin(uLeafTime*.49+leafPhase*1.31)*.042*uv.y;
`;
export function createFoliage(parent,{crowns,count=4200,coarse=false,seed=8301,name='individual-tree-leaves'}={}){
  const total=coarse?Math.round(count*.46):count,geometry=makeLeafGeometry(),uniforms={uLeafTime:{value:0},uLeafSnow:{value:0},uLeafSun:{value:new THREE.Color('#fff5dd')},uLeafNight:{value:0}};
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.93,side:THREE.DoubleSide});
  material.userData.individualFoliage=true;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uLeafTime;varying vec2 vLeafUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLeafUV=uv;\n'+leafWindVertex);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vLeafUV;uniform vec3 uLeafSun;uniform float uLeafSnow,uLeafNight;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      float veinAA=max(.008,fwidth(vLeafUV.x)*1.2);
      float vein=1.-smoothstep(.015,.015+veinAA,abs(vLeafUV.x-.5));
      float blade=smoothstep(.02,.25,vLeafUV.y)*(1.-smoothstep(.76,1.,vLeafUV.y));
      diffuseColor.rgb*=1.+vein*blade*.055;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.77,.85,.87),uLeafSnow*.24*blade);`)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*uLeafSun*.075*(1.-uLeafNight*.78);');
  };
  material.customProgramCacheKey=()=> 'painted-individual-leaves-v1';
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});depth.onBeforeCompile=shader=>{shader.uniforms.uLeafTime=uniforms.uLeafTime;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uLeafTime;').replace('#include <begin_vertex>','#include <begin_vertex>\n'+leafWindVertex);};depth.customProgramCacheKey=()=> 'painted-leaf-shadow-v1';
  const mesh=new THREE.InstancedMesh(geometry,material,total);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;mesh.customDepthMaterial=depth;mesh.userData.leafCount=total;mesh.userData.crownCount=crowns.length;parent.add(mesh);
  let state=seed>>>0;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;},dummy=new THREE.Object3D(),color=new THREE.Color();
  const palette=[0x648757,0x7c985f,0x507653,0x94aa70,0x658d60].map(c=>new THREE.Color(c));
  // Interleave crowns so quality reduction preserves every branch of the tree.
  for(let i=0;i<total;i++){
    const [x,y,z,rx,ry,rz]=crowns[i%crowns.length],angle=random()*Math.PI*2,vertical=random()*2-1,radial=Math.pow(random(),1/3),circle=Math.sqrt(1-vertical*vertical);
    dummy.position.set(x+Math.cos(angle)*circle*radial*rx,y+vertical*radial*ry,z+Math.sin(angle)*circle*radial*rz);
    dummy.rotation.set((random()-.5)*Math.PI,random()*Math.PI*2,(random()-.5)*2.3);const length=.28+random()*.36;dummy.scale.set(length*(.83+random()*.25),length,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    color.copy(palette[i%palette.length]).multiplyScalar(.88+random()*.25);mesh.setColorAt(i,color);
  }
  mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.12;
  return {mesh,material,uniforms,total,update(time,p,snow=0){uniforms.uLeafTime.value=time;uniforms.uLeafSnow.value=snow;uniforms.uLeafSun.value.copy(p.sun??new THREE.Color('#fff5dd'));uniforms.uLeafNight.value=p.night??0;},setQuality(fraction){mesh.count=Math.max(crowns.length,Math.floor(total*fraction));},dispose(){geometry.dispose();material.dispose();depth.dispose();parent.remove(mesh);}};
}
