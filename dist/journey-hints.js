const KEY='sea-railway-hints-v1';
const messages={outside:['ชมวิวได้ตามใจ','ลากหมุนมุมมอง · เลื่อนซูม · V เดินในรถไฟ'],walking:['ลองเดินสำรวจ','WASD เดิน · Shift เดินเร็ว · Esc ปล่อยเมาส์'],seat:['มีที่นั่งรอคุณอยู่','มองเบาะแล้วกด E เพื่อนั่ง · E อีกครั้งเพื่อลุก'],door:['เดินไปอีกตู้ได้','มองประตูแล้วกด E เปิด · รอให้บานเลื่อนจนสุด'],station:['ถึงสถานีแล้ว','เดินผ่านประตูข้างลงชานชาลา · รถไฟรอเมื่อคุณอยู่บนขั้น'],shore:['เดินเล่นสักพักก็ได้','สำรวจสถานีและเกาะ · ใช้ปุ่มเรียกรถไฟเมื่อพร้อมกลับ'],photo:['เก็บภาพจากการเดินทาง','ลากจัดมุม · Shift + ลากเลื่อนจุดมอง · บันทึก PNG · P ออก']};
export class JourneyHints{
 constructor({panel,title,text,close,storage,coarse=false}){Object.assign(this,{panel,title,text,close,storage,coarse});this.enabled=true;this.active=null;this.remaining=0;this.cooldown=2;this.seen=new Set();try{const v=JSON.parse(storage?.getItem(KEY));if(Array.isArray(v))for(const k of v)if(Object.hasOwn(messages,k))this.seen.add(k);}catch{}
  this.dismiss=()=>this.hide();close.addEventListener('click',this.dismiss);panel.hidden=true;
 }
 remember(){try{this.storage?.setItem(KEY,JSON.stringify([...this.seen]));}catch{}}
 setEnabled(value){this.enabled=Boolean(value);if(!this.enabled)this.hide();}
 hide(){this.panel.hidden=true;this.active=null;this.remaining=0;this.cooldown=4;}
 reset(){this.seen.clear();this.remember();this.hide();this.cooldown=1;}
 update(dt,{blocked=false,photo=false,onShore=false,docked=false,target=null,mode='outside'}={}){
  if(!this.enabled||blocked){this.panel.hidden=true;return;}
  if(this.active){this.remaining-=dt;this.panel.hidden=false;if(this.remaining<=0)this.hide();return;}
  this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown)return;
  const type=photo?'photo':onShore?'shore':docked?'station':target?.type==='seat'?'seat':target?.type==='door'?'door':mode==='inside'?'walking':mode==='outside'?'outside':null;
  if(!type||this.seen.has(type))return;this.active=type;this.seen.add(type);this.remember();this.remaining=8;this.title.textContent=messages[type][0];this.text.textContent=this.coarse?messages[type][1].replace('WASD เดิน · Shift เดินเร็ว · Esc ปล่อยเมาส์','ปุ่มลูกศรเดิน · ลากมองรอบตัว').replace('ลากหมุนมุมมอง · เลื่อนซูม · V เดินในรถไฟ','ลากหมุนมุมมอง · สองนิ้วซูม · ปุ่มเดินในรถไฟ').replace(/กด E/g,'แตะปุ่มโต้ตอบ').replace('E อีกครั้ง','แตะอีกครั้ง'):messages[type][1];this.panel.hidden=false;
 }
 dispose(){this.close.removeEventListener('click',this.dismiss);}
}
