// Painted curtains share the sky's time and cloud mask, including its reflection.
export const auroraShader=`
vec3 paintedAurora(vec3 d,float time){
 if(d.y<.03||d.y>.70)return vec3(0.);
 float phi=atan(d.z,d.x),height=d.y,drift=time*.018;
 float pixelAngle=max(.0001,fwidth(phi/6.28318530718)*6.28318530718);
 float threadDetail=1.-smoothstep(.015,.065,pixelAngle);
 vec3 glow=vec3(0.);
 for(int i=0;i<3;i++){
  float layer=float(i),centre=-2.4+layer*2.25;
  float delta=atan(sin(phi-centre),cos(phi-centre));
  float arc=1.-smoothstep(.55,1.48,abs(delta));
  float folds=sin(delta*3.+drift+layer*2.)*.045+sin(delta*7.-drift*.7+layer)*.023;
  float base=.15+layer*.018+folds;
  float rise=max(0.,height-base);
  float curtain=smoothstep(base-.025,base+.028,height)*exp(-rise*7.5)*(1.-smoothstep(.47,.70,height));
  float strands=.68+sin(phi*64.+sin(phi*9.+drift)*2.6+time*.11+layer)*.16*threadDetail;
  strands+=sin(phi*137.-drift*2.+layer)*.065*threadDetail;
  vec3 colour=mix(vec3(.065,.47,.29),vec3(.22,.095,.32),smoothstep(.035,.25,rise));
  float breath=.88+.12*sin(time*.047+layer*1.9);
  glow+=colour*curtain*arc*strands*breath*.96;
 }
 return glow*smoothstep(.03,.10,height);
}`;
