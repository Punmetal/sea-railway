import * as THREE from 'three';
import {rainFieldShader} from './rain.js';
import {createShelterUniforms,stationShelterShader} from './weather-shelters.js';
const clamp=THREE.MathUtils.clamp;
export class RailwayWeather{
  constructor(){this.selected='clear';this.auto=false;this.locked=false;this.time=0;this.changeAt=150;this.index=0;this.fadeSeconds=11;this.values={rain:0,snow:0,mist:0,cloud:0};this.frozen=null;}
  select(name){if(!['clear','rain','snow','mist'].includes(name))throw new Error('Unknown weather');this.selected=name;this.auto=false;this.locked=false;this.fadeSeconds=2.8;this.frozen=null;return this.state();}
  setAuto(value){this.auto=Boolean(value);this.locked=false;this.frozen=null;this.fadeSeconds=this.auto?11:2.8;this.changeAt=this.time+150;return this.state();}
  setLocked(value){this.locked=Boolean(value);this.frozen=this.locked?{...this.values}:null;return this.state();}
  update(dt,hour=12){
    if(!this.locked){this.time+=dt;if(this.auto&&this.time>=this.changeAt){const sequence=hour<8?['mist','clear','rain','clear','snow','clear']:['clear','rain','clear','snow','clear','mist'];this.index=(this.index+1)%sequence.length;this.selected=sequence[this.index];this.changeAt=this.time+150;}}
    const target=this.frozen??{rain:Number(this.selected==='rain'),snow:Number(this.selected==='snow'),mist:Number(this.selected==='mist'),cloud:this.selected==='rain'?.72:this.selected==='snow'?.54:this.selected==='mist'?.25:0};
    for(const k of Object.keys(this.values)){const tau=k==='cloud'?5:this.fadeSeconds;this.values[k]+=(target[k]-this.values[k])*(1-Math.exp(-dt/tau));if(Math.abs(this.values[k]-target[k])<.0001)this.values[k]=target[k];}
    return this.values;
  }
  state(){return {selected:this.selected,auto:this.auto,locked:this.locked,...this.values};}
}
export function createSnow(scene,cars,{coarse=false,stations=[]}={}){
  const count=coarse?1600:3200,positions=[],seeds=[];let seed=804;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){positions.push((rnd()-.5)*60,rnd()*36,(rnd()-.5)*60);seeds.push(rnd());}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
  const uniforms={uSnow:{value:0},uTime:{value:0},uCentre:{value:new THREE.Vector3()},uCars:{value:cars.map(()=>new THREE.Vector3())},uYaws:{value:new THREE.Vector2()},uTint:{value:new THREE.Color('#e4edf4')},uPixelRatio:{value:1},uSnowReflection:{value:0}};
  Object.assign(uniforms,createShelterUniforms(stations));
  const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
    vertexShader:`attribute float aSeed;uniform float uTime,uPixelRatio,uSnowReflection;uniform vec3 uCentre;varying vec3 vSnowWorld;varying float vSnowAlpha;
    void main(){vec3 p=position;p.xz+=uCentre.xz;float fall=mod(position.y-uTime*(.38+aSeed*.34),36.);p.y=max(0.,uCentre.y-14.)+fall;p.x+=sin(uTime*.43+aSeed*90.+p.y*.25)*.9;p.z+=cos(uTime*.31+aSeed*43.)*.6;
    // Reflected flakes have their own modest physical footprint. A minimum
    // screen-size intended for nearby falling snow must not carry into water.
    if(uSnowReflection>.5)p.xz+=vec2(sin(p.z*.8+uTime*.24),cos(p.x*.6-uTime*.18))*.045;
    vSnowWorld=p;vec4 mv=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;float size=clamp((125.+aSeed*145.)/max(1.,-mv.z),1.6,6.5);if(uSnowReflection>.5)size=clamp((30.+aSeed*42.)/max(1.,-mv.z),.6,2.3);gl_PointSize=size*uPixelRatio;
    vSnowAlpha=(1.-smoothstep(23.,32.,distance(p.xz,uCentre.xz)))*smoothstep(.04,.6,p.y)*smoothstep(0.,1.8,fall)*(1.-smoothstep(33.,36.,fall))*(.70+aSeed*.25);if(uSnowReflection>.5)vSnowAlpha*=.22*(1.-smoothstep(16.,65.,length(mv.xyz)));}`,
    fragmentShader:`uniform float uSnow,uSnowReflection;uniform vec3 uTint,uCars[2];uniform vec2 uYaws;varying vec3 vSnowWorld;varying float vSnowAlpha;${rainFieldShader}${stationShelterShader}
    void main(){vec2 q=gl_PointCoord-.5;float edge=1.-smoothstep(mix(.18,.06,uSnowReflection),.50,length(q));float alpha=edge*vSnowAlpha*uSnow*rainShelter(vSnowWorld)*stationShelter(vSnowWorld);if(alpha<.003)discard;gl_FragColor=vec4(uTint*mix(1.,.65,uSnowReflection),alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
  const mesh=new THREE.Points(geo,mat);mesh.name='quiet-snow';mesh.frustumCulled=false;mesh.renderOrder=13;mesh.visible=false;scene.add(mesh);
  let viewCamera=null,pointScale=1;mesh.onBeforeRender=(renderer,_s,camera)=>{const reflected=Boolean(viewCamera&&camera!==viewCamera);uniforms.uSnowReflection.value=Number(reflected);uniforms.uPixelRatio.value=pointScale*(reflected?Math.min(1,(renderer.getRenderTarget?.()?.width??renderer.domElement?.width??1)/(renderer.domElement?.width??1)):1);};
  return {mesh,count,uniforms,update(time,camera,palette,intensity,pixelRatio=1){viewCamera=camera;pointScale=pixelRatio;mesh.visible=intensity>.001;uniforms.uSnow.value=clamp(intensity,0,1);uniforms.uTime.value=time;uniforms.uCentre.value.copy(camera.position);uniforms.uPixelRatio.value=pixelRatio;uniforms.uTint.value.set('#e4edf4').lerp(palette.horizon,.20);cars.forEach((c,i)=>uniforms.uCars.value[i].copy(c.position));uniforms.uYaws.value.set(cars[0].rotation.y,cars[1].rotation.y);},dispose(){geo.dispose();mat.dispose();}};
}
export function tintWeather(base,weather,out){
  const cloud=weather.cloud,mist=weather.mist;
  for(const k of ['top','horizon','warm','sea','cloud','cloudShadow','ambient','ground','sun'])out[k].copy(base[k]);
  for(const k of ['sunY','hemi','direct','night','lamps','exposure'])out[k]=base[k];
  const overcast=new THREE.Color().copy(base.horizon).lerp(new THREE.Color('#9bacbb'),.34*(1-base.night));
  out.top.lerp(overcast,cloud*.45);out.horizon.lerp(overcast,cloud*.24+mist*.18);out.cloud.lerp(overcast,cloud*.25);out.sun.lerp(out.horizon,cloud*.28);out.direct*=1-cloud*.20;out.hemi*=1+cloud*.035;
  return out;
}
