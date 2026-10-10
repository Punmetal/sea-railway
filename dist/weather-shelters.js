import * as THREE from 'three';
export function createShelterUniforms(stations=[]){
  const roofs=[0,1].map(i=>{const s=stations[i],b=s?.shelter;if(!b)return {centre:new THREE.Vector4(1e6,0,1e6,0),half:new THREE.Vector2()};const p=s.root.localToWorld(new THREE.Vector3((b.minX+b.maxX)/2,b.roofY,(b.minZ+b.maxZ)/2));return {centre:new THREE.Vector4(p.x,p.y,p.z,s.root.rotation.y),half:new THREE.Vector2((b.maxX-b.minX)*s.root.scale.x/2,(b.maxZ-b.minZ)*s.root.scale.z/2)};});
  return {uStationShelters:{value:roofs.map(r=>r.centre)},uStationRoofHalf:{value:roofs.map(r=>r.half)}};
}
export const stationShelterShader=`
#ifndef RAILWAY_STATION_SHELTER
#define RAILWAY_STATION_SHELTER
uniform vec4 uStationShelters[2];uniform vec2 uStationRoofHalf[2];
float stationShelter(vec3 p){
  float visible=1.;
  for(int i=0;i<2;i++){
    vec4 roof=uStationShelters[i];vec2 d=p.xz-roof.xz;
    vec2 local=vec2(d.x*cos(roof.w)-d.y*sin(roof.w),d.x*sin(roof.w)+d.y*cos(roof.w));
    if(abs(local.x)<uStationRoofHalf[i].x&&abs(local.y)<uStationRoofHalf[i].y&&p.y<roof.y)visible=0.;
  }
  return visible;
}
#endif
`;
