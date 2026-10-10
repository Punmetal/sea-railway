import * as THREE from 'three';
import {cloudShader} from './clouds.js';
import {auroraShader} from './aurora.js';

export function createPaintedSky(scene,{palette,coarse=false}={}){
  const uniforms={uTop:{value:palette.top.clone()},uHorizon:{value:palette.horizon.clone()},uWarm:{value:palette.warm.clone()},uCloud:{value:palette.cloud.clone()},uCloudShadow:{value:palette.cloudShadow.clone()},uSun:{value:palette.sun.clone()},uAurora:{value:1},uNight:{value:0},uSunY:{value:.07},uTime:{value:0},uReady:{value:0},uOvercast:{value:0},uMist:{value:0},uPaintedSky:{value:null}};
  let loaded=false;
  const texture=new THREE.TextureLoader().load('./assets/painted-sky.png',()=>{loaded=true;},undefined,()=>{});
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.anisotropy=coarse?2:8;uniforms.uPaintedSky.value=texture;
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
    // A background sky stays at far depth even in the sea's oblique reflection
    // camera. Its clipping plane must not cut a black seam through the dome.
    vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}`,
    fragmentShader:`
    varying vec3 vDirection;uniform vec3 uTop,uHorizon,uWarm,uCloud,uSun;uniform float uNight,uSunY,uTime,uReady,uOvercast,uMist,uAurora;uniform sampler2D uPaintedSky;
    float hashSky(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    ${cloudShader}
    ${auroraShader}
    void main(){vec3 d=normalize(vDirection);float h=max(0.,d.y);
      vec3 col=mix(uHorizon,uTop,pow(smoothstep(0.,.88,h),.58));
      vec3 sunDirection=normalize(vec3(-.68,uSunY,-.72));float disc=dot(d,sunDirection);
      float glow=pow(max(0.,disc),18.)*.19;col=mix(col,uWarm,glow*(1.-uNight));
      float sun=smoothstep(.9995,.99975,disc)*(1.-uNight);col=mix(col,uSun,sun*.82);
      vec4 clouds=paintedClouds(d,sunDirection);clouds.a=clamp(clouds.a*(1.+uOvercast*.35)+uOvercast*.08*(1.-h),0.,1.);col=mix(col,clouds.rgb,clouds.a);
      float visibleNight=uNight*(1.-clouds.a*.86);
      if(uNight>.20&&uAurora>.001)col+=paintedAurora(d,uTime)*uAurora*smoothstep(.20,.85,uNight)*(1.-clouds.a*.90)*(1.-uOvercast*.70)*(1.-uMist*.60);
      float u=atan(d.z,d.x)/6.28318530718+.5,v=clamp(asin(clamp(d.y,0.,1.))*2./3.14159265359,0.,1.);
      // Stable, antialiased stars at the display resolution, with wrapped cells.
      vec2 grid=vec2(u*512.,v*170.),cell=floor(grid),fp=fract(grid)-.5;
      float seed=hashSky(vec2(mod(cell.x,512.),cell.y)),radius=mix(.04,.16,pow(seed,5.));
      float dx=wrapGradient(dFdx(u))*512.,dy=wrapGradient(dFdy(u))*512.;
      float aa=max(.012,max(abs(dx)+abs(dy),fwidth(grid.y))*.38);
      float star=(1.-smoothstep(radius,radius+aa,length(fp)))*step(.985,seed)*smoothstep(.05,.16,d.y)*(1.-smoothstep(.97,.999,d.y));
      col+=mix(vec3(.59,.72,1.),vec3(1.,.91,.78),hashSky(cell+15.))*star*visibleNight*(.7+seed*.8)*(.93+.07*sin(seed*100.+uTime*.35));
      vec3 moonSide=normalize(cross(vec3(0.,1.,0.),sunDirection)),moonUp=cross(sunDirection,moonSide);
      vec2 moon=vec2(dot(d,moonSide),dot(d,moonUp));float moonRadius=.019;
      float moonEdge=1.-smoothstep(moonRadius-.0007,moonRadius+.0007,length(moon));
      float facing=step(.99,disc),halfLight=smoothstep(-.00035,.00035,moon.x);
      col+=uSun*pow(max(0.,disc),420.)*.035*visibleNight;
      col=mix(col,uSun*(.87+.06*sin(moon.y*1200.)*sin(moon.x*950.)),moonEdge*halfLight*facing*visibleNight);
      col=mix(col,uHorizon,uMist*(1.-smoothstep(.02,.40,h))*.44);
      gl_FragColor=vec4(max(col,vec3(0.)),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(2400,64,40),material);mesh.name='painted-sky';mesh.renderOrder=-20;scene.add(mesh);
  return {mesh,uniforms,texture,update(time,p,dt){for(const [key,u] of [['top','uTop'],['horizon','uHorizon'],['warm','uWarm'],['cloud','uCloud'],['cloudShadow','uCloudShadow'],['sun','uSun']])uniforms[u].value.copy(p[key]);uniforms.uNight.value=p.night;uniforms.uSunY.value=p.sunY;uniforms.uTime.value=time;if(loaded)uniforms.uReady.value=Math.min(1,uniforms.uReady.value+dt/.9);},dispose(){texture.dispose();material.dispose();mesh.geometry.dispose();}};
}
