// Painted cloud silhouettes, pigment and shading come from the existing artwork.
// The dome evaluates the same field in the main view and every sea reflection.
// No ray-march sampling, screen-space jitter or low-resolution intermediary.
export const cloudShader=`
uniform vec3 uCloudShadow;
float wrapGradient(float value){return value-floor(value+.5);}
vec3 paintedPanorama(float u,float v){
  vec2 dx=vec2(wrapGradient(dFdx(u)),dFdx(v)),dy=vec2(wrapGradient(dFdy(u)),dFdy(v));
  vec3 original=textureGrad(uPaintedSky,vec2(u,v),dx,dy).rgb;
  vec3 bridge=textureGrad(uPaintedSky,vec2(fract(u+.5),v),dx,dy).rgb;
  return mix(bridge,original,smoothstep(.008,.042,min(u,1.-u)));
}
vec4 paintedClouds(vec3 d,vec3 light){
  float u=atan(d.z,d.x)/6.28318530718+.5;
  float altitude=asin(clamp(d.y,0.,1.))*2./3.14159265359;
  // Broad banks at the horizon, rising billows, wisps above the train, then an
  // open zenith. The authored artwork is fixed to the world, never the screen.
  float v=pow(altitude,.78)*.94+.055;
  vec3 paint=paintedPanorama(u,clamp(v,0.,1.));
  float mask=smoothstep(.024,.185,paint.r-paint.b*.43);
  mask*=smoothstep(.008,.032,d.y)*(1.-smoothstep(.88,.995,altitude))*uReady;
  float pigment=dot(paint,vec3(.27,.58,.15));
  float shade=smoothstep(.22,.91,pigment);
  vec3 color=mix(uCloudShadow,uCloud,shade);
  float rim=smoothstep(.32,.85,pigment)*smoothstep(.015,.24,paint.r-paint.b);
  float sunward=.35+.65*pow(max(0.,dot(d,light)),3.);
  color=mix(color,uWarm,rim*sunward*.58*(1.-uNight));
  color*=.95+pigment*.10;
  float moonClear=smoothstep(.996,.9994,dot(d,light))*uNight;
  mask*=1.-moonClear*.88;
  return vec4(color,clamp(mask,0.,1.));
}`;

export function createClouds(scene,{paintedSky}={}){
  return {mesh:paintedSky.mesh,update(palette){paintedSky.uniforms.uCloudShadow.value.copy(palette.cloudShadow);},dispose(){}};
}
