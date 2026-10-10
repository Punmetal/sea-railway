export const SETTINGS_KEY='sea-railway-settings-v1';
export const DEFAULT_SETTINGS={time:'evening',sync:false,locked:false,lockedLight:null,weather:'clear',weatherAuto:false,weatherLocked:false,quality:'high',view:'outside',autoStops:true,hints:true,musicVolume:.25,ambienceVolume:.45,trainVolume:.55,musicEnabled:false,ambienceEnabled:false,trainEnabled:false};
const names={time:['day','evening','night'],weather:['clear','rain','snow','mist'],quality:['low','medium','high'],view:['outside','inside','cinematic']};
export function sanitizeSettings(input){
  const out={...DEFAULT_SETTINGS};if(!input||typeof input!=='object')return out;
  for(const [k,values] of Object.entries(names))if(values.includes(input[k]))out[k]=input[k];
  for(const k of ['sync','locked','weatherAuto','weatherLocked','autoStops','hints','musicEnabled','ambienceEnabled','trainEnabled'])if(typeof input[k]==='boolean')out[k]=input[k];
  for(const k of ['musicVolume','ambienceVolume','trainVolume'])if(Number.isFinite(input[k]))out[k]=Math.max(0,Math.min(1,input[k]));
  if(input.lockedLight&&typeof input.lockedLight==='object'){
    const p=input.lockedLight,colors=['top','horizon','warm','sea','cloud','cloudShadow','ambient','ground','sun'],numbers=['sunY','hemi','direct','night','lamps','exposure'];
    if(colors.every(k=>/^#[0-9a-f]{6}$/i.test(p[k]))&&numbers.every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=4))out.lockedLight=Object.fromEntries([...colors,...numbers].map(k=>[k,p[k]]));
  }
  if(input.weatherAmounts&&['rain','snow','mist','cloud'].every(k=>Number.isFinite(input.weatherAmounts[k])&&input.weatherAmounts[k]>=0&&input.weatherAmounts[k]<=1))out.weatherAmounts={...input.weatherAmounts};
  const pose=input.viewPose;if(pose&&Number.isFinite(pose.yaw)&&Number.isFinite(pose.pitch)&&Math.abs(pose.yaw)<10000&&Math.abs(pose.pitch)<=1.35&&['orbitOffset','orbitTarget'].every(k=>Array.isArray(pose[k])&&pose[k].length===3&&pose[k].every(v=>Number.isFinite(v)&&Math.abs(v)<550)))out.viewPose={yaw:pose.yaw,pitch:pose.pitch,orbitOffset:pose.orbitOffset,orbitTarget:pose.orbitTarget};
  return out;
}
export function loadSettings(storage){try{return sanitizeSettings(JSON.parse(storage?.getItem(SETTINGS_KEY)));}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(storage,settings){try{storage?.setItem(SETTINGS_KEY,JSON.stringify(sanitizeSettings(settings)));return Boolean(storage);}catch{return false;}}
export const QUALITY={low:{pixelRatio:1,shadow:0,reflection:256,floorReflection:false,rainFraction:.50,snowFraction:.45,birdFraction:.4,pebbleFraction:.35},medium:{pixelRatio:1.35,shadow:1024,reflection:512,floorReflection:false,rainFraction:.75,snowFraction:.70,birdFraction:.7,pebbleFraction:.65},high:{pixelRatio:2,shadow:2048,reflection:1024,floorReflection:true,rainFraction:1,snowFraction:1,birdFraction:1,pebbleFraction:1}};
