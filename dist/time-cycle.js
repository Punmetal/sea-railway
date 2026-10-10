// Fixed Thailand offset, independent of the viewer's device timezone.
const smooth=t=>t*t*(3-2*t);
const frames=[[0,'night'],[5,'night'],[6,'evening'],[7.5,'day'],[16,'day'],[18.25,'evening'],[19.5,'night'],[24,'night']];
export function thaiTime(date=new Date()){
  const d=new Date(date.getTime()+7*3600000),hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600+d.getUTCMilliseconds()/3600000;
  const label=[d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()].map(n=>String(n).padStart(2,'0')).join(':');return {hour,label};
}
export function timeBlend(hour){
  const h=((hour%24)+24)%24;let i=0;while(i<frames.length-2&&h>=frames[i+1][0])i++;
  const [a,from]=frames[i],[b,to]=frames[i+1],mix=smooth((h-a)/(b-a));return {from,to,mix,name:mix<.5?from:to};
}
export class RailwayTime{
  constructor(){this.sync=false;this.locked=false;this.manual='evening';}
  select(name){if(!['day','evening','night'].includes(name))throw new Error('Unknown time');this.manual=name;this.sync=false;this.locked=false;}
  setSync(value){this.sync=Boolean(value);this.locked=false;}
  setLocked(value){this.locked=Boolean(value);}
  sample(date=new Date()){const time=thaiTime(date),blend=this.sync?timeBlend(time.hour):{from:this.manual,to:this.manual,mix:0,name:this.manual};return {...blend,...time,sync:this.sync,locked:this.locked};}
}
