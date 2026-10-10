const bytes=s=>new TextEncoder().encode(s);
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=data=>{let n=0xffffffff;for(const b of data)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
// Store-only ZIP keeps screenshots readable by standard desktop archive tools.
export async function screenshotZip(files){
 const local=[],central=[];let offset=0,size=0;
 for(const f of files){const name=bytes(f.name),data=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
  const entry=new Uint8Array(46+name.length),v=new DataView(entry.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);entry.set(name,46);local.push(header,data);central.push(entry);offset+=header.length+data.length;size+=entry.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'});
}
export function downloadCapture(blob,name,doc=document){const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download=name;try{doc.body.appendChild(a);a.click();}finally{a.remove();globalThis.setTimeout(()=>URL.revokeObjectURL(url),30000);}}
export function canvasPng(source,doc=document){const c=doc.createElement('canvas'),ratio=Math.min(1,1280/Math.max(source.width,source.height));c.width=Math.max(1,Math.round(source.width*ratio));c.height=Math.max(1,Math.round(source.height*ratio));const ctx=c.getContext('2d');if(!ctx)throw new Error('สร้างภาพไม่ได้');ctx.drawImage(source,0,0,c.width,c.height);return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('สร้าง PNG ไม่ได้')),'image/png'));}
export class RailwayShowcase{
 constructor({canvas,onStatus=()=>{},onBusy=()=>{},download=downloadCapture,capture=canvasPng,createCanvas=()=>document.createElement('canvas'),Recorder=globalThis.MediaRecorder,schedule=(fn,t)=>globalThis.setTimeout(fn,t),cancelTimer=id=>globalThis.clearTimeout(id)}){Object.assign(this,{canvas,onStatus,onBusy,download,capture,createCanvas,Recorder,schedule,cancelTimer});this.mode=null;this.recorder=null;this.timer=null;this.token=0;this.stopRequested=false;this.disposed=false;this.captureCanvas=null;this.captureContext=null;}
 get busy(){return Boolean(this.mode);}
 async gallery({shots,prepare,apply,render,restore,nextFrame=()=>new Promise(r=>requestAnimationFrame(r))}){
  if(this.busy||this.disposed)return false;this.mode='gallery';this.stopRequested=false;const token=++this.token;let saved;
  try{saved=prepare();this.onBusy(true);const files=[];
   for(let i=0;i<shots.length;i++){if(this.stopRequested||token!==this.token)throw new Error('หยุดเก็บภาพแล้ว');this.onStatus('เก็บภาพ '+(i+1)+' / '+shots.length);apply(shots[i]);await nextFrame();await nextFrame();if(this.stopRequested)throw new Error('หยุดเก็บภาพแล้ว');render();files.push({name:shots[i].name+'.png',blob:await this.capture(this.canvas)});}
   const archive=await screenshotZip(files);if(this.stopRequested||this.disposed)throw new Error('หยุดเก็บภาพแล้ว');this.download(archive,'Sea-Railway-v31-gallery.zip');this.onStatus('บันทึกภาพทั้ง '+shots.length+' มุมแล้ว');return true;
  }catch(e){if(!this.disposed)this.onStatus(e.message||'เก็บภาพไม่ได้ ลองอีกครั้ง');return false;}
  finally{try{if(saved!==undefined)restore(saved);}finally{this.mode=null;this.onBusy(false);}}
 }
 record({prepare,restore,duration=15000}){
  if(this.busy||this.disposed)return false;
  if(!this.Recorder){this.onStatus('เบราว์เซอร์นี้ยังบันทึกคลิปไม่ได้ ใช้ชุดภาพ PNG ได้');return false;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>this.Recorder.isTypeSupported?.(t));if(!mime){this.onStatus('ไม่มีรูปแบบคลิปที่เบราว์เซอร์รองรับ');return false;}
  let saved,stream,chunks=[],done=false;this.mode='recording';this.stopRequested=false;
  const finish=error=>{if(done)return;done=true;this.cancelTimer(this.timer);this.timer=null;stream?.getTracks().forEach(t=>t.stop());this.captureCanvas=this.captureContext=null;try{if(!error&&!this.stopRequested&&!this.disposed&&chunks.length){this.download(new Blob(chunks,{type:mime}),'Sea-Railway-v31-view.'+(mime.startsWith('video/mp4')?'mp4':'webm'));this.onStatus('บันทึกคลิปชมวิวแล้ว · ไม่มีเสียง');}else if(!this.disposed)this.onStatus(error?'บันทึกคลิปไม่ได้ ลองอีกครั้ง':'หยุดบันทึกคลิปแล้ว');}finally{try{if(saved!==undefined)restore(saved);}finally{this.recorder=null;this.mode=null;this.onBusy(false);}}};
  try{saved=prepare();this.captureCanvas=this.createCanvas();const scale=Math.min(1,1280/Math.max(this.canvas.width,this.canvas.height));this.captureCanvas.width=Math.max(2,2*Math.round(this.canvas.width*scale/2));this.captureCanvas.height=Math.max(2,2*Math.round(this.canvas.height*scale/2));this.captureContext=this.captureCanvas.getContext('2d');if(!this.captureContext||!this.captureCanvas.captureStream)throw new Error('Canvas recording unavailable');stream=this.captureCanvas.captureStream(24);this.recorder=new this.Recorder(stream,{mimeType:mime,videoBitsPerSecond:2000000});this.recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};this.recorder.onerror=()=>finish(true);this.recorder.onstop=()=>finish(false);this.onBusy(true);this.recorder.start(1000);this.onStatus('กำลังบันทึกคลิปชมวิว 15 วินาที · ไม่มีเสียง');this.timer=this.schedule(()=>this.stop(false),duration);return true;}catch{finish(true);return false;}
 }
 recordFrame(){if(this.mode==='recording'&&this.captureContext)this.captureContext.drawImage(this.canvas,0,0,this.captureCanvas.width,this.captureCanvas.height);}
 stop(cancel=true){this.stopRequested=cancel;if(this.recorder?.state==='recording')this.recorder.stop();}
 dispose(){this.disposed=true;this.stop();this.cancelTimer(this.timer);}
}
export const SHOWCASE_SHOTS=[
 {name:'01-day-railway',time:'day',weather:'clear',car:0,eye:[31,12,27],target:[0,1.5,-5],fov:48},
 {name:'02-evening-sea-station',time:'evening',weather:'clear',station:0,car:0,eye:[24,14,27],target:[5,1,-1],fov:52},
 {name:'03-night-aurora',time:'night',weather:'clear',car:0,eye:[26,7,30],target:[0,18,-25],fov:65},
 {name:'04-quiet-passengers',time:'evening',weather:'clear',car:1,eye:[.5,2.55,4.25],target:[-1.04,2.70,1.45],fov:64},
 {name:'05-rain-window',time:'evening',weather:'rain',car:0,eye:[-.35,2.5,1.25],target:[10,2.35,1.25],fov:66},
 {name:'06-snow-far-tide',time:'day',weather:'snow',station:1,car:0,eye:[27,15,31],target:[7,1.5,-2],fov:54}
];
