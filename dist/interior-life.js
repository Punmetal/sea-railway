import * as THREE from 'three';
import {GRAB_POLE_X} from './interior-layout.js';

// Analytic window projection follows the actual world sun/moon through each car.
// Apply it in the existing surface shaders: no layered planes or extra reflectors.
export function addWindowLight(material){
  const uniforms={uWindowSun:{value:new THREE.Vector3()},uWindowTint:{value:new THREE.Color()},uWindowPower:{value:0}};
  material.userData.windowLight=uniforms;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCarSurface;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCarSurface=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vCarSurface;uniform vec3 uWindowSun;uniform vec3 uWindowTint;uniform float uWindowPower;
      float windowMask(vec3 p){
        vec3 d=uWindowSun;float side=d.x>=0.0?1.0:-1.0;
        float t=(side*1.405-p.x)/(side*max(abs(d.x),.025));vec3 hit=p+d*t;
        float vertical=smoothstep(2.16,2.24,hit.y)*(1.0-smoothstep(3.19,3.28,hit.y));
        float center=-6.83+clamp(floor((hit.z+6.83)/1.47+.5),0.0,8.0)*1.47;
        float penumbra=clamp(abs(t)*.025,.012,.08);
        float pane=1.0-smoothstep(.565-penumbra,.647+penumbra,abs(hit.z-center));
        float frame=1.0-.48*(1.0-smoothstep(.012,.035,abs(hit.y-2.70)));
        return vertical*pane*frame*smoothstep(.07,.27,abs(d.x))*step(0.0,t);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*uWindowTint*windowMask(vCarSurface)*uWindowPower;');
  };
  material.customProgramCacheKey=()=> 'sea-railway-window-light-v1';
  return uniforms;
}

export function createInteriorLife(cars,{materials}={}){
  const count=26,pivot=new THREE.Object3D(),groups=[];
  const ring=new THREE.TorusGeometry(.086,.016,7,20);ring.scale(1,1.27,1);ring.translate(0,-.37,0);
  const strap=new THREE.BoxGeometry(.025,.28,.035);strap.translate(0,-.15,0);
  // One shared geometry per material, two instanced draws per carriage.
  for(const [carIndex,car] of cars.entries()){
    const model=car.getObjectByName('reference-train-model'),loops=new THREE.InstancedMesh(ring,materials.straps,count),stems=new THREE.InstancedMesh(strap,materials.trim,count);
    loops.name='swaying-hand-loops-'+(carIndex+1);stems.name='swaying-hand-straps-'+(carIndex+1);loops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);model.add(loops,stems);
    const projections=[];
    for(const key of ['floor','seat','wall']){const mesh=model.getObjectByName('train-'+key);if(!mesh)continue;const mat=materials[key].clone(),uniforms=addWindowLight(mat);mesh.material=mat;projections.push({material:mat,uniforms});}
    groups.push({model,loops,stems,projections});
  }
  const sun=new THREE.Vector3(),q=new THREE.Quaternion();let swing=0,previousSpeed=0,acceleration=0;
  function update(dt,time,speed,palette){
    const a=dt>0?(speed-previousSpeed)/dt:0;previousSpeed=speed;acceleration+=(a-acceleration)*(1-Math.exp(-dt*3));swing+=(Math.min(1,Math.abs(speed)/6.495)-swing)*(1-Math.exp(-dt*2));
    groups.forEach(({model,loops,stems,projections},carIndex)=>{
      let i=0;for(const side of [-1,1])for(let z=-6.50;z<=6.55;z+=1.04){const phase=i*.43+carIndex*.7;
        pivot.position.set(side*GRAB_POLE_X,3.17,z);pivot.rotation.set(swing*(.043*Math.sin(time*1.85+phase)+.015*Math.sin(time*3.14+phase)) + THREE.MathUtils.clamp(-acceleration*.035,-.09,.09),0,swing*.021*Math.sin(time*1.33+phase));pivot.updateMatrix();loops.setMatrixAt(i,pivot.matrix);stems.setMatrixAt(i,pivot.matrix);i++;}
      loops.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;loops.computeBoundingSphere();stems.computeBoundingSphere();
      model.getWorldQuaternion(q).invert();sun.set(-122.4,palette.sunY*180,-129.6).normalize().applyQuaternion(q);
      for(const {uniforms} of projections){uniforms.uWindowSun.value.copy(sun);uniforms.uWindowTint.value.copy(palette.sun);uniforms.uWindowPower.value=.54*(1-palette.night)+.22*palette.night;}
    });
  }
  return {groups,update,dispose(){ring.dispose();strap.dispose();for(const g of groups)for(const p of g.projections)p.material.dispose();}};
}
