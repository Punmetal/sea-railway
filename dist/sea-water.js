import * as THREE from 'three';
import {Reflector} from './vendor/Reflector.js';
import {WATER_LEVEL} from './wheel-water.js';
import {rainWaterShader} from './rain.js';
import {shallowWaterShader} from './shallows.js';

// Dense near the viewer, sparse at the horizon: one ocean and one reflection pass.
export function makeWaterGeometry(coarse=false){
  const segments=coarse?96:160,geometry=new THREE.PlaneGeometry(6000,6000,segments,segments),positions=geometry.attributes.position;
  function redistribute(value){const q=Math.abs(value)/3000;return Math.sign(value)*(q<=.82?q/.82*70:70+Math.pow((q-.82)/.18,2)*2930);}
  for(let i=0;i<positions.count;i++)positions.setXYZ(i,redistribute(positions.getX(i)),redistribute(positions.getY(i)),0);
  positions.needsUpdate=true;geometry.computeBoundingSphere();geometry.boundingSphere.radius+=.08;return geometry;
}

export const waveFunctions=`
float hashWater(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiseWater(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashWater(i),hashWater(i+vec2(1.,0.)),f.x),mix(hashWater(i+vec2(0.,1.)),hashWater(i+vec2(1.,1.)),f.x),f.y);}
vec3 sampleWaves(vec2 p,float time){
  vec2 warp=vec2(noiseWater(p*.043+vec2(time*.014,-time*.009)),noiseWater(p*.057+vec2(-time*.011,time*.006)));
  p+=(warp-.5)*6.8;
  // Comparable energy in several directions, irregular envelopes and two
  // slow swells prevent a dominant endless row of parallel ridges.
  float envelope=.68+noiseWater(p*.083+time*.012)*.56;
  vec3 w=vec3(0.);
  for(int i=0;i<9;i++){
    float k=float(i),angle=k*2.399963+.31;
    float frequency=mix(.19,3.6,pow(k/8.,1.65));
    vec2 dir=vec2(cos(angle),sin(angle))*frequency;
    float amplitude=.025/(1.+k*k*.28),phase=dot(p,dir)+k*7.13-time*(.28+k*.19)*(mod(k,2.)<.5?1.:-1.);
    w.x+=sin(phase)*amplitude;w.yz+=cos(phase)*dir*amplitude;
  }
  w*=envelope;
  return w;
}`;

export const reflectionShader=`
uniform sampler2D tReflectionDepth;uniform mat4 uReflectionInverseProjection,uReflectionWorld;
vec4 reflectedHit(vec2 uv){
 float depth=texture2D(tReflectionDepth,uv).r;
 // Only the exact far plane is sky. Distant ridge geometry must still be
 // classified even when its depth lies very close to one.
 if(depth>=.99999994)return vec4(0.);
 vec4 hit=uReflectionInverseProjection*vec4(uv*2.-1.,depth*2.-1.,1.);
 if(abs(hit.w)<.0000001)return vec4(0.);
 return vec4((uReflectionWorld*vec4(hit.xyz/hit.w,1.)).xyz,1.);
}
vec2 reflectionWeights(vec4 hit,vec3 surface){
 if(hit.w<.5)return vec2(1.,0.);
 float height=max(0.,hit.y-.018),reach=length(hit.xz-surface.xz);
 float distant=smoothstep(300.,950.,reach);
 float nearby=clamp(exp(-height*.060-height*height*.012-reach*.009),.045,1.);
 // Thin, atmospheric mountains read as a wash of the current palette;
 // their lower tips disappear progressively into the sea.
 float ridge=.23*exp(-height*.019);
 return vec2(mix(nearby,ridge,distant),distant);
}
float reflectedObjectFade(vec2 uv,vec3 surface){
 return reflectionWeights(reflectedHit(uv),surface).x;
}
vec2 paintedReflectionRipple(vec2 p,float time,float footprint){
 float broad=sin(p.y*.78+noiseWater(p*.071+time*.009)*3.+time*.26)*.55;
 broad+=sin(p.x*.44+p.y*.33-time*.18)*.32;
 float detail=1.-smoothstep(.22,2.2,footprint);
 return vec2(broad*.0022,sin(p.x*.35-p.y*.21+time*.17)*.00042)*detail;
}
`;

export function createSeaWater(scene,{coarse=false,palette,shallows}={}){
  const shader={uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.lights,{color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uSea:{value:palette.sea.clone()},uHorizon:{value:palette.horizon.clone()},uSun:{value:palette.sun.clone()},uSunY:{value:palette.sunY},uTime:{value:0},uNight:{value:0},uRain:{value:0},uMist:{value:0},uCars:{value:[new THREE.Vector3(10000,0,0),new THREE.Vector3(10000,0,0)]},uYaws:{value:new THREE.Vector2()},uShores:{value:[new THREE.Vector4(0,0,1,1),new THREE.Vector4(0,0,1,1),new THREE.Vector4(0,0,1,1)]},uShoreYaws:{value:new THREE.Vector3()},uShoreCount:{value:0}},shallows?.uniforms??{}]),
    vertexShader:`
    #include <common>
    #include <shadowmap_pars_vertex>
    uniform mat4 textureMatrix;uniform float uTime,uRain;uniform vec3 uCars[2];uniform vec2 uYaws;varying vec4 vUv;varying vec3 vWorld;${waveFunctions}${rainWaterShader}
    void main(){vec3 displaced=position;vec3 baseWorld=(modelMatrix*vec4(position,1.)).xyz;float rainNear=1.-smoothstep(35.,85.,distance(cameraPosition.xz,baseWorld.xz));displaced.z+=sampleWaves(baseWorld.xz,uTime).x;if(uRain>.001)displaced.z+=rainRipples(baseWorld.xz,uTime).x*uRain*rainNear;vec4 worldPosition=modelMatrix*vec4(displaced,1.);vec3 transformedNormal=normalMatrix*normal;vWorld=worldPosition.xyz;vUv=textureMatrix*vec4(displaced,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(displaced,1.);
    #include <shadowmap_vertex>
    }`,
    fragmentShader:`
    #include <common>
    #include <packing>
    uniform bool receiveShadow;
    #include <shadowmap_pars_fragment>
    #include <shadowmask_pars_fragment>
    uniform sampler2D tDiffuse;uniform vec3 uSea,uHorizon,uSun,uCars[2];uniform vec2 uYaws;uniform float uTime,uSunY,uNight,uRain,uMist;varying vec4 vUv;varying vec3 vWorld;${waveFunctions}${reflectionShader}${rainWaterShader}${shallowWaterShader}
    void main(){vec3 waves=sampleWaves(vWorld.xz,uTime),rainWaves=vec3(0.);vec2 slope=waves.yz;
    float footprint=max(length(dFdx(vWorld.xz)),length(dFdy(vWorld.xz)));
    if(uRain>.001){rainWaves=rainRipples(vWorld.xz,uTime,footprint)*uRain*(1.-smoothstep(35.,85.,distance(cameraPosition.xz,vWorld.xz)));slope+=rainWaves.yz;}
    // Suppress subpixel ripples at the horizon instead of aliasing into stripes.
    slope*=1./(1.+footprint*.55);
    vec3 normal=normalize(vec3(-slope.x*2.7,1.,-slope.y*2.7)),view=normalize(cameraPosition-vWorld);
    vec3 light=normalize(vec3(-.68,max(.12,uSunY),-.72));float grazing=pow(1.-max(0.,dot(normal,view)),3.);
    vec2 uv=vUv.xy/vUv.w;
    // Perturb the projective coordinates by surface slope, attenuated with
    // distance: windows, clouds and moonlight share the actual scene reflection.
    float distortion=.021/(1.+distance(cameraPosition,vWorld)*.008);
    uv+=slope*distortion+paintedReflectionRipple(vWorld.xz,uTime,footprint)/(1.+distance(cameraPosition,vWorld)*.005);uv=clamp(uv,vec2(.003),vec2(.997));
    vec2 weights=reflectionWeights(reflectedHit(uv),vWorld);
    float reflectionSoftness=mix(min(.0025,.00065+footprint*.00025),.0032,weights.y);
    vec3 reflected=texture2D(tDiffuse,uv).rgb*.44;
    reflected+=(texture2D(tDiffuse,uv+vec2(reflectionSoftness,0.)).rgb+texture2D(tDiffuse,uv-vec2(reflectionSoftness,0.)).rgb)*.18;
    reflected+=(texture2D(tDiffuse,uv+vec2(0.,reflectionSoftness)).rgb+texture2D(tDiffuse,uv-vec2(0.,reflectionSoftness)).rgb)*.10;
    float relief=clamp(dot(normal,light)-light.y,-.28,.28);
    float depth=seabedDepth(vWorld.xz+slope*.12),shallow=1.-smoothstep(.28,3.2,depth);
    // Short optical paths reveal the actual bottom. Deep water absorbs its
    // warm colours; a grazing view gradually favours the sky reflection.
    float opticalDepth=depth/max(.24,dot(normal,view));
    vec3 transmission=exp(-opticalDepth*vec3(.46,.29,.21));
    float distanceFade=smoothstep(18.,100.,distance(cameraPosition,vWorld));
    float clarity=dot(transmission,vec3(.22,.56,.22))*(1.-grazing*.72)*(1.-distanceFade*.98);
    vec3 base=mix(uSea*.87,uSea+uHorizon*.12,shallow*(1.-uNight*.48));
    base=base*(1.+waves.x*1.1)+uHorizon*relief*.20;
    reflected=mix(reflected,mix(base,reflected,.46),weights.y);
    vec3 col=mix(base,reflected,(mix(.38,.24,shallow)+grazing*.52)*weights.x);
    float glint=pow(max(0.,dot(normal,normalize(light+view))),mix(105.,160.,uNight));
    col+=uSun*glint*mix(.16,.075,uNight)/(1.+footprint*3.5);
    float detail=noiseWater(vWorld.xz*.47+vec2(uTime*.075,-uTime*.041));
    float crest=smoothstep(.020,.058,waves.x)*detail;col+=uHorizon*crest*.048*(1.-uNight*.5);
    col+=uHorizon*min(.10,rainWaves.x*27.)/(1.+footprint*1.5);
    col*=mix(.83,1.,getShadowMask());
    // The oblique reflection camera clips the sky at the water plane. Far
    // grazing samples fade into atmospheric colour instead of its clear edge.
    float farAir=smoothstep(750.,2100.,distance(cameraPosition,vWorld));
    float horizonAir=1.-smoothstep(.002,.026,abs(view.y));
    col=mix(col,uHorizon,farAir*(.45+.55*horizonAir));
    float fog=1.-exp(-pow(distance(cameraPosition,vWorld)*uMist*.004,2.));col=mix(col,uHorizon,fog);
    gl_FragColor=vec4(max(col,vec3(0.)),mix(clamp(1.-clarity*.94,.20,.99),.99,fog));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`};
  const water=new Reflector(makeWaterGeometry(coarse),{textureWidth:coarse?512:1024,textureHeight:coarse?512:1024,clipBias:.003,multisample:0,shader});
  const target=water.getRenderTarget();target.depthTexture=new THREE.DepthTexture(target.width,target.height,THREE.UnsignedIntType);target.depthTexture.minFilter=THREE.NearestFilter;target.depthTexture.magFilter=THREE.NearestFilter;
  water.material.uniforms.tReflectionDepth={value:target.depthTexture};water.material.uniforms.uReflectionInverseProjection={value:new THREE.Matrix4()};water.material.uniforms.uReflectionWorld={value:water.camera.matrixWorld};
  const renderReflection=water.onBeforeRender;water.onBeforeRender=function(...args){renderReflection.apply(this,args);this.material.uniforms.uReflectionInverseProjection.value.copy(this.camera.projectionMatrix).invert();};
  water.name='sea-water';water.rotation.x=-Math.PI/2;water.position.y=WATER_LEVEL;water.material.lights=true;water.receiveShadow=true;water.material.transparent=true;water.material.depthWrite=false;water.renderOrder=10;scene.add(water);return water;
}
