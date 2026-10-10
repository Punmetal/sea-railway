import * as THREE from 'three';

// Packed spotlight depth is shared by the volume and its water footprint.
// Testing from the lamp prevents glowing fog behind a platform, wall or tree.
export const HEADLIGHT_OCCLUSION=`
float lampDepth(vec4 rgba){return dot(rgba,vec4(255./256.,255./65536.,255./16777216.,1./16777216.));}
float lampVisibility(vec3 world,sampler2D shadow,mat4 matrix,vec2 texel,float ready){
 if(ready<.5)return 1.;vec4 clip=matrix*vec4(world,1.);vec3 q=clip.xyz/clip.w;
 if(q.z<0.||q.z>1.||q.x<0.||q.x>1.||q.y<0.||q.y>1.)return 0.;
 float depth=q.z-.0007,visibility=0.;
 visibility+=step(depth,lampDepth(texture2D(shadow,q.xy+texel*vec2(-.6,-.6))));
 visibility+=step(depth,lampDepth(texture2D(shadow,q.xy+texel*vec2(.6,-.6))));
 visibility+=step(depth,lampDepth(texture2D(shadow,q.xy+texel*vec2(-.6,.6))));
 visibility+=step(depth,lampDepth(texture2D(shadow,q.xy+texel*vec2(.6,.6))));
 return visibility*.25;
}`;

export const HEADLIGHT_VERTEX=`varying vec3 vBeamLocal,vBeamWorld;void main(){vBeamLocal=position;vBeamWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const HEADLIGHT_FRAGMENT=`
uniform mat4 uBeamInverse,uBeamMatrix,uBeamShadowMatrix;uniform sampler2D uBeamShadow;uniform vec2 uBeamShadowTexel;uniform float uBeamStrength,uBeamAir,uBeamShadowReady,uBeamReflection;uniform vec3 uBeamColor;varying vec3 vBeamLocal,vBeamWorld;
${HEADLIGHT_OCCLUSION}
void main(){
  if(uBeamReflection>.5)discard;
  vec3 eye=(uBeamInverse*vec4(cameraPosition,1.)).xyz;
  vec3 ray=vBeamLocal-eye;float distanceToExit=length(ray);ray/=max(.0001,distanceToExit);
  // Integrate only the ray interval inside the truncated cone. Sampling a fixed
  // distance behind its surface produces visible bands at grazing angles.
  float entry=0.,exit=distanceToExit;
  if(abs(ray.z)>.00001){vec2 cap=vec2(-eye.z,32.-eye.z)/ray.z;entry=max(entry,min(cap.x,cap.y));exit=min(exit,max(cap.x,cap.y));}
  float radiusAtEye=.15+eye.z*.245;
  float a=dot(ray.xy,ray.xy)-.060025*ray.z*ray.z;
  float b=2.*(dot(eye.xy,ray.xy)-radiusAtEye*.245*ray.z);
  float c=dot(eye.xy,eye.xy)-radiusAtEye*radiusAtEye;
  float discriminant=b*b-4.*a*c;
  if(abs(a)>.00001&&discriminant>0.){
    vec2 roots=vec2(-b-sqrt(discriminant),-b+sqrt(discriminant))/(2.*a);
    float lo=min(roots.x,roots.y),hi=max(roots.x,roots.y);
    if(a>0.){entry=max(entry,lo);exit=min(exit,hi);}
    else if(entry>lo&&entry<hi)entry=hi;
  }else if(abs(b)>.00001&&abs(a)<=.00001){if(b<0.)entry=max(entry,-c/b);else exit=min(exit,-c/b);}
  // Clip the ray interval to air before marching it. Merely fading individual
  // samples below the water leaves visible layered bands from a high view.
  vec3 worldEye=(uBeamMatrix*vec4(eye,1.)).xyz;
  float rise=(uBeamMatrix*vec4(ray,0.)).y;
  if(abs(rise)>.00001){float seaHit=(.045-worldEye.y)/rise;if(rise<0.)exit=min(exit,seaHit);else entry=max(entry,seaHit);}else if(worldEye.y<.045)discard;
  float stepLength=max(0.,exit-entry)/24.,density=0.;
  for(int i=0;i<24;i++){
    vec3 p=eye+ray*(entry+(float(i)+.5)*stepLength);
    float radius=.15+p.z*.245;
    float edge=1.-smoothstep(.22,1.,length(p.xy)/max(.15,radius));
    float range=smoothstep(.02,.8,p.z)*(1.-smoothstep(22.,32.,p.z));
    vec3 world=(uBeamMatrix*vec4(p,1.)).xyz;
    float air=smoothstep(.045,.22,world.y);
    if(air>.001)density+=edge*range*air*lampVisibility(world,uBeamShadow,uBeamShadowMatrix,uBeamShadowTexel,uBeamShadowReady)*stepLength;
  }
  float alpha=(1.-exp(-density*.035))*uBeamStrength*uBeamAir*.75;
  gl_FragColor=vec4(uBeamColor*1.7,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export const HEADLIGHT_WATER=`
uniform vec3 uHeadSource,uHeadColor;uniform vec2 uHeadForward,uHeadShadowTexel;uniform float uHeadStrength,uHeadShadowReady,uHeadTime;uniform mat4 uHeadShadowMatrix;uniform sampler2D uHeadShadow;
${HEADLIGHT_OCCLUSION}
vec3 headlightOnWater(vec3 p,float relief){
 vec2 delta=p.xz-uHeadSource.xz;float along=dot(delta,uHeadForward),across=abs(dot(delta,vec2(uHeadForward.y,-uHeadForward.x)));
 float wave=sin(p.x*.83+p.z*.57-uHeadTime*.42)*.18+sin(p.z*1.6+uHeadTime*.3)*.09;
 float edge=1.-smoothstep(.18,1.,(across+wave)/max(.2,.15+along*.245));
 float range=smoothstep(10.,18.,along)*(1.-smoothstep(24.,40.,along))*exp(-max(0.,along-16.)*.024);
 float broken=.72+.28*sin(p.z*1.12+p.x*.7-uHeadTime*.39)*sin(p.x*.63-p.z*.24+uHeadTime*.21);
 float visibility=lampVisibility(vec3(p.x,.055,p.z),uHeadShadow,uHeadShadowMatrix,uHeadShadowTexel,uHeadShadowReady);
 return uHeadColor*edge*range*uHeadStrength*broken*visibility*(.105+clamp(relief,-.04,.055));
}`;

export function createTrainLights({cars,materials,water,coarse=false}){
 const color=new THREE.Color('#ffdda0'),waterUniforms={uHeadSource:{value:new THREE.Vector3()},uHeadColor:{value:color},uHeadForward:{value:new THREE.Vector2(0,1)},uHeadStrength:{value:0},uHeadTime:water.material.uniforms?.uTime??{value:0},uHeadShadow:{value:null},uHeadShadowMatrix:{value:new THREE.Matrix4()},uHeadShadowTexel:{value:new THREE.Vector2(1/512,1/512)},uHeadShadowReady:{value:0}};
 Object.assign(water.material.uniforms,waterUniforms);
 water.material.fragmentShader=water.material.fragmentShader.replace('void main(){vec3 waves=',HEADLIGHT_WATER+'\nvoid main(){vec3 waves=').replace('col*=mix(.83,1.,getShadowMask());','col*=mix(.83,1.,getShadowMask());\ncol+=headlightOnWater(vWorld,waves.x+slope.x*.16);');water.material.needsUpdate=true;
 const geometry=new THREE.CylinderGeometry(.15,7.99,32,40,1,false);geometry.rotateX(-Math.PI/2);geometry.translate(0,0,16);
 const beams=cars.map((car,i)=>{
  const root=new THREE.Group();root.name='headlight-beam-'+i;root.position.set(0,4.215,8.08);root.rotation.x=.105;car.getObjectByName('reference-train-model').add(root);
  const uniforms={uBeamInverse:{value:new THREE.Matrix4()},uBeamMatrix:{value:new THREE.Matrix4()},uBeamStrength:{value:0},uBeamAir:{value:1},uBeamColor:{value:color},uBeamShadow:{value:null},uBeamShadowMatrix:{value:new THREE.Matrix4()},uBeamShadowTexel:{value:new THREE.Vector2(1/512,1/512)},uBeamShadowReady:{value:0},uBeamReflection:{value:0}};
  const material=new THREE.ShaderMaterial({vertexShader:HEADLIGHT_VERTEX,fragmentShader:HEADLIGHT_FRAGMENT,uniforms,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='warm-headlight-volume';mesh.renderOrder=12;root.add(mesh);
  const light=new THREE.SpotLight(color,0,48,Math.atan(.245),.72,1.5);light.name='headlight-spot-'+i;light.position.set(0,0,0);light.shadow.mapSize.set(coarse?256:512,coarse?256:512);light.shadow.camera.near=.08;light.shadow.camera.far=48;light.shadow.bias=-.0004;light.shadow.normalBias=.025;light.target.position.set(0,0,32);root.add(light,light.target);
  mesh.onBeforeRender=(r,_s,camera)=>{uniforms.uBeamReflection.value=Number(camera.position.y<.018);bindShadow(uniforms,'uBeam',light,r);};
  return {root,mesh,light,uniforms};
 });
 const tip=new THREE.Vector3(),direction=new THREE.Vector3();let leading=0;
 function bindShadow(uniforms,prefix,light,renderer){const shadow=light.shadow;uniforms[prefix+'Shadow'].value=shadow.map?.texture??null;uniforms[prefix+'ShadowMatrix'].value.copy(shadow.matrix);uniforms[prefix+'ShadowTexel'].value.set(1/shadow.mapSize.x,1/shadow.mapSize.y);uniforms[prefix+'ShadowReady'].value=Number(Boolean(shadow.map&&light.castShadow&&renderer.shadowMap?.enabled!==false));}
 const originalRender=water.onBeforeRender;water.onBeforeRender=function(...args){originalRender?.apply(this,args);bindShadow(waterUniforms,'uHead',beams[leading].light,args[0]);};
 return {beams,waterUniforms,setQuality(name){const size=coarse||name==='low'?256:512;for(const b of beams)if(b.light.shadow.mapSize.x!==size){b.light.shadow.mapSize.set(size,size);b.light.shadow.map?.dispose();b.light.shadow.map=null;}},update(p,w,motion){
  if(Math.abs(motion.speed)>.02)leading=motion.speed<0?1:0;
  const strength=THREE.MathUtils.smoothstep(p.lamps,.14,.85);
  for(let i=0;i<beams.length;i++){
   const b=beams[i],active=i===leading?strength:0;b.root.updateWorldMatrix(true,false);b.uniforms.uBeamMatrix.value.copy(b.root.matrixWorld);b.uniforms.uBeamInverse.value.copy(b.root.matrixWorld).invert();b.uniforms.uBeamStrength.value=active;b.uniforms.uBeamAir.value=.78+(w.mist??0)*.45+(w.rain??0)*.16+(w.snow??0)*.13;b.mesh.visible=active>.001;b.light.intensity=active*32;b.light.castShadow=active>.001;
  }
  const front=beams[leading];front.root.getWorldPosition(waterUniforms.uHeadSource.value);front.root.localToWorld(tip.set(0,0,32));direction.copy(tip).sub(waterUniforms.uHeadSource.value).normalize();waterUniforms.uHeadForward.value.set(direction.x,direction.z).normalize();waterUniforms.uHeadStrength.value=strength;
  materials.headlight.emissive.copy(color);materials.headlight.emissiveIntensity=1.2+strength*3.1;
 },dispose(){water.onBeforeRender=originalRender;for(const b of beams){b.light.shadow.dispose();b.root.removeFromParent();b.mesh.material.dispose();}geometry.dispose();}};
}
