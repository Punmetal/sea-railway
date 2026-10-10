import {createShelterUniforms,stationShelterShader} from './weather-shelters.js';

export const snowCoverShader=`
uniform float uSnowCover;varying vec3 vSnowSurfaceLocal,vSnowSurfaceWorld;varying float vSnowSurfaceUp;
${stationShelterShader}
float snowSurfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float snowSurfaceNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(snowSurfaceHash(i),snowSurfaceHash(i+vec2(1.,0.)),f.x),mix(snowSurfaceHash(i+vec2(0.,1.)),snowSurfaceHash(i+1.),f.x),f.y);}
float snowSurfaceCoverage(){
  if(uSnowCover<.001)return 0.;
  vec2 p=vSnowSurfaceLocal.xz;
  float drift=snowSurfaceNoise(p*.32+vec2(7.,19.))*.62+snowSurfaceNoise(p*.91)*.28+snowSurfaceNoise(p*2.7)*.10;
  float dust=smoothstep(.002,.05,uSnowCover)*.16;
  float blanket=smoothstep(.015,.88,uSnowCover);
  float deposits=smoothstep(drift*.40,drift*.40+.42,uSnowCover);
  float coverage=dust+(1.-dust)*(blanket*.72+deposits*.28);
  return coverage*smoothstep(.38,.83,vSnowSurfaceUp)*stationShelter(vSnowSurfaceWorld)*.94;
}
float snowSurfaceGrain(){
  vec2 p=vSnowSurfaceLocal.xz;float footprint=max(length(dFdx(p)),length(dFdy(p)));
  float visible=1.-smoothstep(.012,.055,footprint);
  return (snowSurfaceNoise(p*31.)-.5)*visible;
}
float snowSurfaceHeight(){
  vec2 p=vSnowSurfaceLocal.xz;
  return snowSurfaceNoise(p*.91+vec2(8.,2.))*.008+snowSurfaceNoise(p*3.7)*.002+snowSurfaceGrain()*.0006;
}
vec3 snowPowderNormal(vec3 surfacePosition,vec3 surfaceNormal,float height){
  vec3 dx=dFdx(surfacePosition),dy=dFdy(surfacePosition);
  vec3 r1=cross(dy,surfaceNormal),r2=cross(surfaceNormal,dx);float determinant=dot(dx,r1);
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(abs(determinant)*surfaceNormal-gradient+surfaceNormal*1e-10);
}`;
export class SnowCover{
  constructor(stations,trainMaterials,extraMaterials=[]){
    this.amount=0;this.uniforms={uSnowCover:{value:0},...createShelterUniforms(stations)};this.hooks=[];
    const materials=new Set([...stations.flatMap(s=>['stone','stoneLight','stoneDark','wood','shelterRoof','roofTiles','roofRidges'].map(k=>s.materials[k])),...extraMaterials].filter(Boolean));for(const key of ['roof','roofPanel'])if(trainMaterials?.[key])materials.add(trainMaterials[key]);
    for(const material of materials){
      const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
      material.onBeforeCompile=(shader,renderer)=>{
        previous.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSnowSurfaceLocal,vSnowSurfaceWorld;varying float vSnowSurfaceUp;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSnowSurfaceLocal=position;vSnowSurfaceWorld=(modelMatrix*vec4(position,1.)).xyz;vSnowSurfaceUp=normalize(mat3(modelMatrix)*normal).y;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+snowCoverShader)
          .replace('#include <color_fragment>','#include <color_fragment>\nfloat snowCoating=snowSurfaceCoverage();\nvec3 powderColour=vec3(.83,.88,.90)*(1.+snowSurfaceGrain()*.035);\ndiffuseColor.rgb=mix(diffuseColor.rgb,powderColour,snowCoating);')
          .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.96,snowCoating);')
          .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.,snowCoating);')
          .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nif(snowCoating>.001)normal=normalize(mix(normal,snowPowderNormal(-vViewPosition,normal,snowSurfaceHeight()),snowCoating));');
      };
      material.customProgramCacheKey=()=>cache.call(material)+'-gentle-snow-cover-v2';material.needsUpdate=true;this.hooks.push({material,previous,cache});
    }
  }
  update(dt,weather){const target=Math.min(1,Math.max(0,weather.snow)),tau=target>this.amount?32:weather.rain>.15?23:85;this.amount+=(target-this.amount)*(1-Math.exp(-dt/tau));this.uniforms.uSnowCover.value=this.amount;return this.amount;}
  dispose(){for(const {material,previous,cache}of this.hooks){material.onBeforeCompile=previous;material.customProgramCacheKey=cache;material.needsUpdate=true;}}
}
