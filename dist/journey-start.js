export class JourneyStart{
 constructor({panel,experience,primary,fresh,cancel,quality,sound,summary,window:win,onStart,onClose=()=>{},onShow=()=>{}}){
  Object.assign(this,{panel,experience,primary,fresh,cancel,quality,sound,summary,win,onStart,onClose,onShow});this.open=false;this.listeners=[];
  const listen=(el,event,fn,capture)=>{el.addEventListener(event,fn,capture);this.listeners.push(()=>el.removeEventListener(event,fn,capture));};
  listen(primary,'click',()=>this.start(Boolean(this.saved)));listen(fresh,'click',()=>this.start(false));listen(cancel,'click',()=>this.close());
  listen(win,'keydown',e=>{if(!this.open)return;
   if(e.code==='Escape'&&this.canCancel){e.preventDefault();this.close();}
   if(e.code==='Tab'){const all=[quality,sound,primary,...(this.saved?[fresh]:[]),...(this.canCancel?[cancel]:[])].filter(v=>!v.hidden&&!v.disabled);const i=all.indexOf(panel.ownerDocument?.activeElement);if(e.shiftKey&&(i<=0)){e.preventDefault();all.at(-1)?.focus?.();}else if(!e.shiftKey&&(i===all.length-1||i<0)){e.preventDefault();all[0]?.focus?.();}}
   e.stopImmediatePropagation();
  },true);
 }
 show({saved=null,quality='high',sound=false,canCancel=false}={}){this.saved=saved;this.canCancel=canCancel;this.open=true;this.quality.value=quality;this.sound.checked=sound;this.panel.hidden=false;this.panel.inert=false;this.experience.inert=true;this.primary.textContent=saved?'เดินทางต่อ':'ออกเดินทาง';this.fresh.hidden=!saved;this.cancel.hidden=!canCancel;
  this.summary.textContent=saved?(saved.shore?'กลับไปยังสถานีที่เดินค้างไว้':saved.player.seat!=null?'กลับไปนั่งชมวิวจากเบาะเดิม':'กลับไปยังจุดที่เดินค้างไว้'):'รถไฟสองตู้ ทะเลกว้าง และเวลาให้คุณค่อย ๆ มอง';this.onShow();this.primary.focus?.();
 }
 start(resume){if(!this.open)return;const choice={resume:resume&&Boolean(this.saved),quality:this.quality.value,sound:Boolean(this.sound.checked)};this.open=false;this.panel.hidden=true;this.panel.inert=true;this.experience.inert=false;this.onStart(choice);}
 close(){if(!this.open||!this.canCancel)return;this.open=false;this.panel.hidden=true;this.panel.inert=true;this.experience.inert=false;this.onClose();}
 dispose(){for(const remove of this.listeners)remove();}
}
