import * as THREE from 'three';
import {createShelterUniforms,stationShelterShader} from './weather-shelters.js';

// Both falling drops and impacts use stationary world-space cells. Moving the
// camera only changes which cells are drawn, never an impact's position.
export const RAIN_CELL_SIZE=2.4;
export const rainFieldShader=`
float rainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 rainCentre(vec2 cell){return (cell+.16+vec2(rainHash(cell+4.),rainHash(cell+9.))*.68)*2.4;}
float rainPeriod(vec2 cell){return 2.65+rainHash(cell+37.)*1.25;}
float rainAge(vec2 cell,float time){float period=rainPeriod(cell);return fract(time/period+rainHash(cell+81.))*period;}
float rainShelter(vec3 p){
  float visible=1.;
  for(int i=0;i<2;i++){
    vec3 d=p-uCars[i];float yaw=i==0?uYaws.x:uYaws.y;
    vec2 local=vec2(d.x*cos(yaw)-d.z*sin(yaw),d.x*sin(yaw)+d.z*cos(yaw));
    if(abs(local.x)<1.58&&abs(local.y)<9.45&&d.y<4.22)visible=0.;
  }
  return visible;
}`;

export function addGlassRain(material){
  const uniforms={uGlassRain:{value:0},uGlassTime:{value:0},uGlassNight:{value:0}};
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWetGlass;varying vec3 vGlassNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvWetGlass=position;vGlassNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vWetGlass;varying vec3 vGlassNormal;uniform float uGlassRain,uGlassTime,uGlassNight;
      float glassHash(vec2 p){return fract(sin(dot(p,vec2(137.2,291.7)))*42173.7);}
      float glassDrop(vec2 p){
        vec2 uv=p*vec2(14.,12.);float column=floor(uv.x),seed=glassHash(vec2(column,9.));
        uv.y+=uGlassTime*(.025+seed*.085);
        vec2 cell=floor(uv),q=fract(uv)-.5;float h=glassHash(cell);
        q-=vec2((h-.5)*.40,(glassHash(cell+19.)-.5)*.28);
        float radius=.075+h*.065,edge=length(q*vec2(1.,.72));
        float rim=exp(-pow((edge-radius)/.029,2.));
        float centre=(1.-smoothstep(radius*.45,radius,edge))*.10;
        float trail=exp(-pow(q.x/.022,2.))*smoothstep(.02,.15,q.y)*(1.-smoothstep(.24,.43,q.y))*.36;
        return (rim+centre+trail)*step(.86,h);
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 glassUv=abs(vGlassNormal.x)>.5?vWetGlass.zy:vWetGlass.xy;
      float wetDrop=glassDrop(glassUv)*uGlassRain;
      diffuseColor.a=max(diffuseColor.a,wetDrop*mix(.40,.49,uGlassNight));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.76,.85,.88),wetDrop*.29);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.60,.74,.83)*wetDrop*mix(.08,.16,uGlassNight);');
  };
  material.customProgramCacheKey=()=> 'sea-railway-glass-rain-v2';return uniforms;
}

export function createRain(scene,cars,{coarse=false,glassMaterial,stations=[]}={}){
  const side=coarse?25:35,cells=[];
  for(let x=0;x<side;x++)for(let z=0;z<side;z++)cells.push(x-(side-1)/2,z-(side-1)/2);
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,0,1,0,0,-1,1,0,1,1,0],3));
  geometry.setIndex([0,1,2,2,1,3]);
  geometry.setAttribute('aCell',new THREE.InstancedBufferAttribute(new Float32Array(cells),2));geometry.instanceCount=side*side;
  const uniforms={uRain:{value:0},uTime:{value:0},uCentre:{value:new THREE.Vector3()},uCars:{value:cars.map(()=>new THREE.Vector3())},uYaws:{value:new THREE.Vector2()},uTint:{value:new THREE.Color('#c1d4df')},uNight:{value:0},uDusk:{value:0},uViewport:{value:new THREE.Vector2(1280,720)}};
  Object.assign(uniforms,createShelterUniforms(stations));
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec2 aCell;uniform float uTime,uNight,uDusk;uniform vec3 uCentre,uCars[2];uniform vec2 uYaws,uViewport;varying vec2 vDrop;varying vec3 vRainWorld;varying float vRainAlpha;
      ${rainFieldShader}
      void main(){
        vec2 cell=floor(uCentre.xz/2.4)+aCell;float h=rainHash(cell+17.),period=rainPeriod(cell),age=rainAge(cell,uTime);
        float height=28.+h*10.,y=.018+height*(1.-age/period);
        vec2 centre=rainCentre(cell);
        // Wind tapers to zero at impact, keeping each splash aligned.
        vec3 head=vec3(centre.x+(1.-age/period)*.42,y,centre.y);
        float streak=(.36+h*.52)*mix(1.,1.12,uDusk)*mix(1.,1.20,uNight);
        vec3 tail=head+vec3(.008,streak,0.);
        vec4 a=projectionMatrix*viewMatrix*vec4(head,1.),b=projectionMatrix*viewMatrix*vec4(tail,1.);
        vec2 direction=(b.xy/max(.001,b.w)-a.xy/max(.001,a.w))*uViewport;
        vec2 perpendicular=normalize(vec2(-direction.y,direction.x)+vec2(.00001,0.));
        vec4 clip=mix(a,b,position.y);
        float pixelWidth=(.80+h*.55)*mix(1.,1.20,uNight);
        clip.xy+=perpendicular*position.x*pixelWidth/uViewport*clip.w;
        gl_Position=clip;vDrop=position.xy;vRainWorld=mix(head,tail,position.y);
        float radial=distance(centre,uCentre.xz),range=${coarse?'28.':'40.'};
        vRainAlpha=(1.-smoothstep(range-9.,range,radial))*(.48+h*.34);
      }`,
    fragmentShader:`uniform float uRain,uNight,uDusk;uniform vec3 uTint,uCars[2];uniform vec2 uYaws;varying vec2 vDrop;varying vec3 vRainWorld;varying float vRainAlpha;
      ${rainFieldShader}
      ${stationShelterShader}
      void main(){
        float edge=1.-smoothstep(.26,1.,abs(vDrop.x));
        float ends=smoothstep(0.,.10,vDrop.y)*(1.-smoothstep(.62,1.,vDrop.y));
        float alpha=uRain*vRainAlpha*edge*ends*rainShelter(vRainWorld)*stationShelter(vRainWorld)*mix(.48,.64,uNight);
        if(alpha<.003||vRainWorld.y<.018)discard;
        gl_FragColor=vec4(uTint,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='gentle-rain';mesh.frustumCulled=false;mesh.renderOrder=12;mesh.visible=false;scene.add(mesh);
  const glass=addGlassRain(glassMaterial),dayTint=new THREE.Color('#bfd8df'),nightTint=new THREE.Color('#adc5e3');let enabled=false,intensity=0,amount=0;
  return {mesh,uniforms,glass,get enabled(){return enabled;},get intensity(){return intensity;},setEnabled(value){enabled=Boolean(value);amount=Number(enabled);return {enabled};},setAmount(value){amount=THREE.MathUtils.clamp(value,0,1);enabled=amount>.001;},setIntensity(value){if(Number.isFinite(value))intensity=THREE.MathUtils.clamp(value,0,1);},
    update(dt,time,camera,palette){
      intensity+=(amount-intensity)*(1-Math.exp(-dt/1.4));if(Math.abs(intensity-amount)<.0001)intensity=amount;
      const night=palette.night??0,dusk=(1-night)*(1-THREE.MathUtils.smoothstep(palette.sunY??.6,.10,.42));
      mesh.visible=intensity>0;uniforms.uRain.value=intensity;uniforms.uTime.value=time;uniforms.uCentre.value.copy(camera.position);uniforms.uNight.value=night;uniforms.uDusk.value=dusk;
      uniforms.uTint.value.copy(palette.horizon).lerp(dayTint,.68).lerp(nightTint,night*.78);
      if(typeof innerWidth!=='undefined')uniforms.uViewport.value.set(Math.max(1,innerWidth),Math.max(1,innerHeight));
      cars.forEach((car,i)=>uniforms.uCars.value[i].copy(car.position));uniforms.uYaws.value.set(cars[0].rotation.y,cars[1].rotation.y);
      glass.uGlassRain.value=intensity;glass.uGlassTime.value=time;glass.uGlassNight.value=night;
    },dispose(){geometry.dispose();material.dispose();}};
}

// Age zero is the instant the drop reaches the sea. Variable lifetimes and
// radii keep rings irregular without a scrolling screen overlay.
export const rainWaterShader=`${rainFieldShader}
vec3 rainRipples(vec2 p,float time,float footprint){
  vec2 grid=floor(p/2.4);vec3 rings=vec3(0.);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 cell=grid+vec2(float(x),float(y)),centre=rainCentre(cell),delta=p-centre;
    float h=rainHash(cell+53.),age=rainAge(cell,time),life=1.25+h*.85,t=age/life;
    float radius=age*(.35+h*.20),baseWidth=.025+h*.019,width=sqrt(baseWidth*baseWidth+footprint*footprint*.25),d=length(delta);
    float fade=smoothstep(.01,.10,age)*(1.-smoothstep(.36,1.,t));
    float offset=d-radius,ridge=exp(-offset*offset/(width*width))*fade*(.0026+h*.0014)*baseWidth/width;
    float inner=d-radius*.70,echo=exp(-inner*inner/(width*width))*fade*.00065*smoothstep(.12,.35,age)*baseWidth/width;
    rings.x+=ridge+echo;
    rings.yz+=delta/max(d,.001)*(-2./(width*width))*(offset*ridge+inner*echo);
  }
  return rings*rainShelter(vec3(p.x,.018,p.y));
}
vec3 rainRipples(vec2 p,float time){return rainRipples(p,time,0.);}`;
