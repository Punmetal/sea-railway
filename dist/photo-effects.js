import * as THREE from 'three';
import {supportedHDRSamples} from './image-quality.js';

export const PHOTO_FILTERS=Object.freeze({
  original:{name:'Original',id:0,bloom:0,grain:0,vignette:0},
  warm:{name:'Warm Memory',id:1,bloom:8,grain:4,vignette:8},
  pastel:{name:'Pastel Dream',id:2,bloom:18,grain:0,vignette:0},
  film:{name:'Film 35mm',id:3,bloom:3,grain:28,vignette:24},
  anime:{name:'Anime Cel',id:4,bloom:0,grain:0,vignette:0},
  moonlit:{name:'Moonlit Blue',id:5,bloom:7,grain:0,vignette:12},
  rainy:{name:'Rainy Window',id:6,bloom:15,grain:5,vignette:10},
  monochrome:{name:'Black & White',id:7,bloom:0,grain:8,vignette:12}
});
export const PHOTO_DEFAULTS=Object.freeze({intensity:100,exposure:0,contrast:0,saturation:0,temperature:0,bloom:0,grain:0,vignette:0});
export const PHOTO_RANGES=Object.freeze({intensity:[0,100],exposure:[-2,2],contrast:[-100,100],saturation:[-100,100],temperature:[-100,100],bloom:[0,100],grain:[0,100],vignette:[0,100]});
export const PHOTO_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const PHOTO_BLUR=`
  uniform sampler2D uImage;uniform vec2 uStep,uThreshold;uniform float uExtract;varying vec2 vUv;
  vec3 sampleLight(vec2 uv){vec3 c=texture2D(uImage,uv).rgb;float brightness=max(c.r,max(c.g,c.b));return c*mix(1.0,smoothstep(uThreshold.x,uThreshold.y,brightness),uExtract);}
  void main(){vec3 c=sampleLight(vUv)*.227027;c+=(sampleLight(vUv+uStep*1.384615)+sampleLight(vUv-uStep*1.384615))*.316216;c+=(sampleLight(vUv+uStep*3.230769)+sampleLight(vUv-uStep*3.230769))*.070270;gl_FragColor=vec4(c,1.0);}
`;
export const PHOTO_FRAGMENT=`
  uniform sampler2D uImage,uBloom;
  uniform float uSceneExposure,uStrength,uExposure,uContrast,uSaturation,uTemperature,uGlow,uWorldGlow,uGrain,uVignette,uCompare;
  uniform int uFilter;uniform vec4 uCrop;uniform vec2 uResolution,uTexel;uniform float uAntialias,uSharpness;varying vec2 vUv;
  ${THREE.ShaderChunk.tonemapping_pars_fragment.replaceAll('toneMappingExposure','uPhotoToneExposure')}
  vec3 displayRGB(vec3 linear){vec3 c=ACESFilmicToneMapping(linear);return mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}
  float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
  vec3 imageDisplay(vec2 uv,float extraGlow,float exposure){
    vec3 source=texture2D(uImage,uv).rgb;
    vec3 halo=texture2D(uBloom,uv).rgb;
    return displayRGB((source+halo*(uWorldGlow+extraGlow)*.34)*uSceneExposure*exp2(exposure));
  }
  vec3 resolveDisplay(vec2 uv,float extraGlow,float exposure){
    vec3 centre=imageDisplay(uv,extraGlow,exposure);
    if(uAntialias<.5&&uSharpness<=0.)return centre;
    vec3 nw=imageDisplay(uv+vec2(-1.,1.)*uTexel,extraGlow,exposure),ne=imageDisplay(uv+uTexel,extraGlow,exposure);
    vec3 sw=imageDisplay(uv-uTexel,extraGlow,exposure),se=imageDisplay(uv+vec2(1.,-1.)*uTexel,extraGlow,exposure);
    float m=luma(centre),a=luma(nw),b=luma(ne),c=luma(sw),d=luma(se);
    float low=min(m,min(min(a,b),min(c,d))),high=max(m,max(max(a,b),max(c,d))),range=high-low;
    vec3 resolved=centre;
    if(uAntialias>.5&&range>max(.045,high*.125)){
      vec2 direction=vec2(-((a+b)-(c+d)),(a+c)-(b+d));
      float reduce=max((a+b+c+d)*.03125,.0078125);
      direction=clamp(direction/(min(abs(direction.x),abs(direction.y))+reduce),vec2(-6.),vec2(6.))*uTexel;
      vec3 inner=(imageDisplay(uv-direction/6.,extraGlow,exposure)+imageDisplay(uv+direction/6.,extraGlow,exposure))*.5;
      vec3 outer=inner*.5+(imageDisplay(uv-direction*.5,extraGlow,exposure)+imageDisplay(uv+direction*.5,extraGlow,exposure))*.25;
      float y=luma(outer);resolved=(y<low||y>high)?inner:outer;
    }
    // Recover gentle texture contrast; never sharpen a strong silhouette edge.
    float sharpen=uSharpness*(1.-smoothstep(.07,.20,range))*smoothstep(.004,.02,range);
    vec3 minimum=min(centre,min(min(nw,ne),min(sw,se))),maximum=max(centre,max(max(nw,ne),max(sw,se)));
    return clamp(resolved+(resolved-(nw+ne+sw+se)*.25)*sharpen,minimum,maximum);
  }
  vec3 saturation(vec3 c,float amount){return mix(vec3(luma(c)),c,amount);}
  vec3 preset(vec3 c){
    if(uFilter==1){c=saturation(c,.87);c=(c-.5)*.91+.5;c=c*vec3(1.035,1.005,.94)+vec3(.025,.017,.013)*(1.0-c);}
    else if(uFilter==2){c=saturation(c,.80);c=(c-.5)*.82+.5;c=mix(c,vec3(.96,.89,.88),.035);}
    else if(uFilter==3){c=saturation(c,.81);c=(c-.5)*1.045+.5;c=c*vec3(1.025,1.005,.965)+vec3(.028,.021,.017)*(1.0-c);}
    else if(uFilter==4){c=saturation(c,1.14);c=(c-.5)*1.075+.5;}
    else if(uFilter==5){float warm=smoothstep(.06,.28,c.r-c.b)*smoothstep(.25,.7,luma(c));vec3 blue=c*vec3(.89,.97,1.065)+vec3(.004,.012,.026)*(1.0-c);c=mix(blue,c,warm*.90);}
    else if(uFilter==6){c=saturation(c,.73);c=(c-.5)*.91+.5;c*=vec3(.965,1.015,1.025);}
    else if(uFilter==7){float y=luma(c);c=vec3((y-.5)*1.035+.5);}
    return clamp(c,0.0,1.0);
  }
  void main(){
    // Offscreen world rendering is linear HDR; apply the game's exact ACES once.
    vec3 original=resolveDisplay(vUv,0.,0.);
    if(uCompare>.5||uStrength<=0.){gl_FragColor=vec4(original,1.0);return;}
    if(uFilter==0&&uExposure==0.&&uContrast==0.&&uSaturation==0.&&uTemperature==0.&&uGlow==0.&&uGrain==0.&&uVignette==0.){gl_FragColor=vec4(original,1.0);return;}
    vec3 c=resolveDisplay(vUv,uGlow,uExposure);
    c=preset(c);
    c=saturation(c,max(0.0,1.0+uSaturation));
    c=(c-.5)*(1.0+uContrast*.6)+.5;
    c*=vec3(1.0+uTemperature*.10,1.0+abs(uTemperature)*.012,1.0-uTemperature*.10);
    vec2 frameUV=(vUv-uCrop.xy)/uCrop.zw;
    vec2 centered=(frameUV-.5)*2.0;
    float shade=smoothstep(.20,1.55,dot(centered,centered));c*=1.0-uVignette*.42*shade;
    // Grain is fixed to frame pixels: no flicker when the scene is frozen.
    vec2 pixel=floor(frameUV*uResolution);
    float noise=fract(sin(dot(pixel,vec2(12.9898,78.233)))*43758.5453)-.5;
    c+=noise*uGrain*.070*(.5+.5*(1.0-luma(c)));
    gl_FragColor=vec4(mix(original,clamp(c,0.0,1.0),uStrength),1.0);
  }
`;

export class PhotoProcessor{
  constructor(renderer,{worldGlow=0,maxEdge=2880,blurScale=.5,samples=2,antialias=true,sharpness=.12}={}){
    this.renderer=renderer;this.size=new THREE.Vector2();this.width=0;this.height=0;this.worldGlow=worldGlow;this.maxEdge=maxEdge;this.blurScale=blurScale;this.antialias=antialias;this.sharpness=sharpness;
    const options={type:THREE.HalfFloatType,depthBuffer:true,samples:supportedHDRSamples(renderer,samples)};
    this.world=new THREE.WebGLRenderTarget(1,1,options);
    this.blurA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});this.blurB=this.blurA.clone();
    this.scene=new THREE.Scene();this.scene.name='photo-postprocess';this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.uniforms={uImage:{value:this.world.texture},uBloom:{value:this.blurB.texture},uSceneExposure:{value:1},uPhotoToneExposure:{value:1},uFilter:{value:0},uStrength:{value:1},uExposure:{value:0},uContrast:{value:0},uSaturation:{value:0},uTemperature:{value:0},uGlow:{value:0},uWorldGlow:{value:0},uGrain:{value:0},uVignette:{value:0},uCompare:{value:0},uAntialias:{value:1},uSharpness:{value:.12},uTexel:{value:new THREE.Vector2(1,1)},uCrop:{value:new THREE.Vector4(0,0,1,1)},uResolution:{value:new THREE.Vector2(1,1)}};
    this.material=new THREE.ShaderMaterial({vertexShader:PHOTO_VERTEX,fragmentShader:PHOTO_FRAGMENT,uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false});
    this.blur=new THREE.ShaderMaterial({vertexShader:PHOTO_VERTEX,fragmentShader:PHOTO_BLUR,uniforms:{uImage:{value:null},uStep:{value:new THREE.Vector2()},uThreshold:{value:new THREE.Vector2(.65,2.5)},uExtract:{value:1}},depthTest:false,depthWrite:false,toneMapped:false});
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);
  }
  setSamples(requested){const samples=supportedHDRSamples(this.renderer,requested);if(samples!==this.world.samples){this.world.samples=samples;this.world.dispose();}}
  render(scene,camera,{filter,settings,comparing},rect){
    const r=this.renderer;r.getDrawingBufferSize(this.size);const w=this.size.x,h=this.size.y,scale=Math.min(1,this.maxEdge/Math.max(w,h),Math.sqrt(8294400/(w*h))),rw=Math.max(1,Math.round(w*scale)),rh=Math.max(1,Math.round(h*scale)),bw=Math.max(1,Math.ceil(rw*this.blurScale)),bh=Math.max(1,Math.ceil(rh*this.blurScale));
    if(rw!==this.width||rh!==this.height||bw!==this.blurA.width||bh!==this.blurA.height){this.width=rw;this.height=rh;this.world.setSize(rw,rh);this.blurA.setSize(bw,bh);this.blurB.setSize(bw,bh);}
    const u=this.uniforms;u.uSceneExposure.value=r.toneMappingExposure;u.uFilter.value=PHOTO_FILTERS[filter].id;u.uStrength.value=settings.intensity/100;u.uExposure.value=settings.exposure;
    for(const [key,setting]of [['uContrast','contrast'],['uSaturation','saturation'],['uTemperature','temperature'],['uGlow','bloom'],['uGrain','grain'],['uVignette','vignette']])u[key].value=settings[setting]/100;
    u.uWorldGlow.value=this.worldGlow;u.uCompare.value=Number(comparing);u.uAntialias.value=Number(this.antialias);u.uSharpness.value=this.sharpness;u.uTexel.value.set(1/rw,1/rh);u.uCrop.value.set(rect.x/w,1-(rect.y+rect.height)/h,rect.width/w,rect.height/h);u.uResolution.value.set(rect.width,rect.height);
    const target=r.getRenderTarget();
    try{
      r.setRenderTarget(this.world);r.render(scene,camera);
      if(this.worldGlow>0||(settings.bloom>0&&!comparing)){
        this.blur.uniforms.uThreshold.value.set(this.worldGlow>0?1.15:.65,this.worldGlow>0?3.0:2.5);
        const spread=this.worldGlow>0?1.65:1;
        this.quad.material=this.blur;this.blur.uniforms.uImage.value=this.world.texture;this.blur.uniforms.uExtract.value=1;this.blur.uniforms.uStep.value.set(spread/this.blurA.width,0);r.setRenderTarget(this.blurA);r.render(this.scene,this.camera);
        this.blur.uniforms.uImage.value=this.blurA.texture;this.blur.uniforms.uExtract.value=0;this.blur.uniforms.uStep.value.set(0,spread/this.blurA.height);r.setRenderTarget(this.blurB);r.render(this.scene,this.camera);
      }
      this.quad.material=this.material;r.setRenderTarget(target);r.render(this.scene,this.camera);
    }finally{this.quad.material=this.material;r.setRenderTarget(target);}
  }
  dispose(){for(const target of [this.world,this.blurA,this.blurB])target.dispose();this.quad.geometry.dispose();this.material.dispose();this.blur.dispose();}
}
