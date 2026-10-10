import * as THREE from 'three';
import {createShelterUniforms,stationShelterShader} from './weather-shelters.js';

export const paintSurfaceShader=`
varying vec3 vPaintLocal,vPaintWorld,vPaintNormal;varying vec2 vPaintUV;
uniform vec3 uPaintTop,uPaintHorizon,uPaintSea;uniform float uPaintNight,uPaintRain,uPaintMist;
${stationShelterShader}
float paintHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float paintNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(paintHash(i),paintHash(i+vec3(1,0,0)),f.x),mix(paintHash(i+vec3(0,1,0)),paintHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(paintHash(i+vec3(0,0,1)),paintHash(i+vec3(1,0,1)),f.x),mix(paintHash(i+vec3(0,1,1)),paintHash(i+1.),f.x),f.y),f.z);}
float paintAir(){return smoothstep(80.,720.,distance(cameraPosition,vPaintWorld))*(.47+uPaintMist*.2);}
`;

export function addPaintSurface(material,uniforms,{kind='general',wet=false,floor=false}={}){
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
  material.userData.paintStyle={kind,wet,floor};
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaintLocal,vPaintWorld,vPaintNormal;varying vec2 vPaintUV;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      vPaintLocal=position;vPaintUV=uv;vec4 paintWorld=vec4(position,1.);vec3 paintNormal=normal;
      #ifdef USE_INSTANCING
        paintWorld=instanceMatrix*paintWorld;paintNormal=mat3(instanceMatrix)*paintNormal;
      #endif
      vPaintWorld=(modelMatrix*paintWorld).xyz;vPaintNormal=normalize(mat3(modelMatrix)*paintNormal);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+paintSurfaceShader)
      .replace('#include <color_fragment>',`#include <color_fragment>
      float paintFootprint=max(length(dFdx(vPaintLocal)),length(dFdy(vPaintLocal)));
      float paintDetail=1.-smoothstep(.04,.23,paintFootprint);
      float paintBroad=(paintNoise(vPaintLocal*.63)-.5)*.045;
      float paintBrush=(paintNoise(vPaintLocal*vec3(${kind==='wood'?'6.0,.52,1.5':'1.4,9.0,1.7'}))-.5)*.033*paintDetail;
      diffuseColor.rgb*=1.+paintBroad+paintBrush;
      ${floor?'diffuseColor.rgb*=1.-smoothstep(.72,1.28,abs(vPaintLocal.x))*.095;':''}
      float paintWet=${wet?'uPaintRain*stationShelter(vPaintWorld)*(.3+.7*max(0.,vPaintNormal.y))':'0.'};
      diffuseColor.rgb*=1.-paintWet*.085;
      ${kind==='window'?`float curtains=smoothstep(.18,.30,vPaintUV.x)*(1.-smoothstep(.70,.82,vPaintUV.x));
      float room=(.58+.42*curtains)*(.82+.18*smoothstep(.02,.40,vPaintUV.y));
      diffuseColor.rgb*=room;diffuseColor.rgb=mix(diffuseColor.rgb,uPaintHorizon,.11*(1.-uPaintNight));`:''}`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=max(.28,roughnessFactor-paintWet*.25);')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      ${kind==='window'?'totalEmissiveRadiance*=room;':''}
      ${floor?'totalEmissiveRadiance+=diffuseColor.rgb*uPaintSea*.035;':''}`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=mix(outgoingLight,uPaintHorizon,paintAir());\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=>cache.call(material)+'-painted-surface-v1-'+kind+'-'+Number(wet)+'-'+Number(floor);material.needsUpdate=true;
  return {material,previous,cache};
}

export function addGlassDepth(material,uniforms){
  const previous=material.onBeforeCompile,cache=material.customProgramCacheKey;
  material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaneWorld,vPaneNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaneWorld=(modelMatrix*vec4(position,1.)).xyz;vPaneNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPaneWorld,vPaneNormal;uniform vec3 uPaintTop,uPaintHorizon;uniform float uPaintSnow,uPaintNight;')
      .replace('#include <color_fragment>',`#include <color_fragment>
      vec3 paneView=normalize(cameraPosition-vPaneWorld),paneN=normalize(vPaneNormal);
      float paneFresnel=pow(1.-abs(dot(paneView,paneN)),4.);
      vec3 paneReflection=reflect(-paneView,paneN);vec3 paneSky=mix(uPaintHorizon,uPaintTop,pow(max(0.,paneReflection.y),.65));
      float coldEdge=uPaintSnow*(1.-smoothstep(.03,.16,abs(vWetGlass.y-2.20)))*.08;
      diffuseColor.a=max(diffuseColor.a,.045+paneFresnel*.045+coldEdge);
      diffuseColor.rgb=mix(diffuseColor.rgb,paneSky,.13*paneFresnel);`)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=paneSky*(.03+paneFresnel*.16)*(1.-uPaintNight*.42);');
  };
  material.customProgramCacheKey=()=>cache.call(material)+'-painted-pane-depth-v1';material.needsUpdate=true;return {material,previous,cache};
}

function contacts(station){
  const geometry=new THREE.PlaneGeometry(1,1),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    vertexShader:`varying vec2 vContactUV;void main(){vContactUV=uv;vec4 p=vec4(position,1.);
    #ifdef USE_INSTANCING
      p=instanceMatrix*p;
    #endif
    gl_Position=projectionMatrix*modelViewMatrix*p;}`,
    fragmentShader:'varying vec2 vContactUV;void main(){vec2 p=(vContactUV-.5)*2.;float a=(1.-smoothstep(.12,1.,dot(p,p)))*.17;gl_FragColor=vec4(.15,.18,.16,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  });
  const points=station.benches.flatMap(b=>[-.73,.73].map(dz=>[b.x,b.z+dz,.45,.45,station.platform.top+.014]));
  if(station.house)points.push([31,-8,8.5,6.9,.473],[34,19,1.1,1.1,.473]);
  const mesh=new THREE.InstancedMesh(geometry,material,points.length);mesh.name='soft-contact-shadows-'+station.distance;mesh.renderOrder=2;const d=new THREE.Object3D();
  points.forEach(([x,z,w,h,y],i)=>{d.position.set(x,y,z);d.rotation.set(-Math.PI/2,0,0);d.scale.set(w,h,1);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);});station.root.add(mesh);return {mesh,dispose(){geometry.dispose();material.dispose();}};
}

export class RailwayVisuals{
  constructor({scene,cars,stations,routeVistas,materials,sunLight,fill,camera,coarse=false}){
    Object.assign(this,{scene,cars,stations,routeVistas,sunLight,fill,camera,coarse});this.hooks=[];this.contacts=stations.map(contacts);this.foliage=[...stations.map(s=>s.foliage).filter(Boolean),...routeVistas.foliage];
    this.uniforms={uPaintTop:{value:new THREE.Color()},uPaintHorizon:{value:new THREE.Color()},uPaintSea:{value:new THREE.Color()},uPaintNight:{value:0},uPaintRain:{value:0},uPaintMist:{value:0},uPaintSnow:{value:0},...createShelterUniforms(stations)};
    const known=new Map();for(const [key,m]of Object.entries(materials))known.set(m,{kind:['wood','wall','trim','floor','ties'].includes(key)?'wood':'general',wet:['red','roof','roofPanel','rails','bronze'].includes(key)});
    for(const s of stations)for(const [key,m]of Object.entries(s.materials))known.set(m,{kind:key==='houseWindows'?'window':['wood','bark'].includes(key)?'wood':'general',wet:!['houseWindows','leaves1','leaves2','leaves3','shelterLamp','signalLamp'].includes(key)});
    for(const [key,m]of Object.entries(routeVistas.materials))known.set(m,{kind:key==='windows'?'window':['timber','crossarm'].includes(key)?'wood':'general',wet:!['lamps','windows','leaves'].includes(key)});
    const visited=new Set();scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m?.isMeshStandardMaterial||visited.has(m)||m.userData.individualFoliage)continue;visited.add(m);
      if(m===materials.glass){this.hooks.push(addGlassDepth(m,this.uniforms));continue;}
      if(m.transparent||(!known.has(m)&&m.emissiveIntensity>.2))continue;
      const options=known.get(m)??{kind:o.name==='train-floor'||o.name==='train-wall'?'wood':'general',wet:false,floor:o.name==='train-floor'};
      if(o.name==='train-floor')options.floor=true;this.hooks.push(addPaintSurface(m,this.uniforms,options));
    }});
    this.bounce=new THREE.DirectionalLight(0x91bbcf,.16);scene.add(this.bounce,this.bounce.target,fill.target);this.centre=new THREE.Vector3();
    sunLight.shadow.radius=2.4;sunLight.shadow.normalBias=.016;sunLight.shadow.camera.left=-52;sunLight.shadow.camera.right=52;sunLight.shadow.camera.top=52;sunLight.shadow.camera.bottom=-52;sunLight.shadow.camera.updateProjectionMatrix();
  }
  setQuality(name){const f={low:.52,medium:.78,high:1}[name];this.foliage.forEach(tree=>tree.setQuality(f));}
  update(time,p,w,cover=0,hour=18){
    const u=this.uniforms;u.uPaintTop.value.copy(p.top);u.uPaintHorizon.value.copy(p.horizon);u.uPaintSea.value.copy(p.sea);u.uPaintNight.value=p.night;u.uPaintRain.value=w.rain;u.uPaintMist.value=w.mist;u.uPaintSnow.value=cover;
    this.foliage.forEach(tree=>tree.update(time,p,cover));if(hour!==null)this.stations.forEach(s=>s.details.update(hour));
    this.centre.copy(this.cars[0].position).add(this.cars[1].position).multiplyScalar(.5);if(this.camera.position.distanceTo(this.centre)<110)this.centre.lerp(this.camera.position,.25);this.centre.y=2;
    const offset=new THREE.Vector3(-122.4,p.sunY*180,-129.6),side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),offset).normalize(),up=new THREE.Vector3().crossVectors(offset.clone().normalize(),side).normalize();
    const texel=104/Math.max(1,this.sunLight.shadow.mapSize.x),x=this.centre.dot(side),y=this.centre.dot(up);
    this.centre.addScaledVector(side,Math.round(x/texel)*texel-x).addScaledVector(up,Math.round(y/texel)*texel-y);
    this.sunLight.target.position.copy(this.centre);this.sunLight.position.copy(this.centre).add(offset);
    this.fill.color.copy(p.horizon).lerp(p.sea,.35);this.fill.position.copy(this.centre).add(new THREE.Vector3(80,38,150));this.fill.target.position.copy(this.centre);
    this.bounce.color.copy(p.sea).lerp(p.horizon,.38);this.bounce.intensity=(.20-p.night*.10)*(1-w.cloud*.25);this.bounce.position.copy(this.centre).add(new THREE.Vector3(32,7,-45));this.bounce.target.position.copy(this.centre);
  }
  dispose(){for(const {material,previous,cache}of this.hooks){material.onBeforeCompile=previous;material.customProgramCacheKey=cache;material.needsUpdate=true;}this.contacts.forEach(c=>c.dispose());this.stations.forEach(s=>s.foliage?.dispose());this.scene.remove(this.bounce,this.bounce.target);}
}
