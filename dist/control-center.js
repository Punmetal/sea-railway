// One small disclosure owns the input boundary between the scene and controls.
export class ControlCenter{
 constructor({button,panel,close,sections=[],window:win,document:doc,onChange=()=>{},schedule=(fn,delay)=>globalThis.setTimeout(fn,delay),cancel=id=>globalThis.clearTimeout(id)}){
  Object.assign(this,{button,panel,win,doc,onChange,schedule,cancel});this.open=false;this.timer=null;this.listeners=[];
  const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);this.listeners.push(()=>el.removeEventListener(type,fn,options));};
  listen(button,'click',()=>this.setOpen(!this.open));listen(close,'click',()=>this.setOpen(false));
  listen(win,'pointerdown',e=>{if(this.open&&!panel.contains(e.target)&&!button.contains(e.target)){this.setOpen(false,{focus:false});e.preventDefault();e.stopImmediatePropagation();}},true);
  listen(win,'keydown',e=>{
   if(!this.open&&!panel.contains(e.target))return;
   if(e.code==='Escape'&&this.open){e.preventDefault();this.setOpen(false);}
   // Native Tab, select, slider and button behavior stays intact; game
   // shortcuts and movement never see a key pressed within this boundary.
   e.stopImmediatePropagation();
  },true);
  for(const section of sections)listen(section,'toggle',()=>{if(section.open)for(const other of sections)if(other!==section)other.open=false;});
  this.panel.inert=true;this.panel.setAttribute('aria-hidden','true');
 }
 setOpen(value,{focus=true}={}){
  const next=Boolean(value);if(next===this.open)return;this.open=next;
  if(this.timer!==null){this.cancel?.(this.timer);this.timer=null;}
  this.button.setAttribute('aria-expanded',String(next));this.button.setAttribute('aria-label',next?'ปิด Control Center':'เปิด Control Center');this.button.classList.toggle('active',next);
  this.panel.inert=!next;this.panel.setAttribute('aria-hidden',String(!next));
  this.panel.classList.toggle('is-open',next);if(next)this.panel.hidden=false;
  // Restore scene input synchronously. Native Window timers retain their
  // receiver through the wrappers above; they only finish the visual fade.
  this.onChange(next);if(focus){if(next)this.panel.querySelector?.('summary')?.focus();else this.button.focus?.();}
  if(!next){if(this.schedule)this.timer=this.schedule(()=>{if(!this.open)this.panel.hidden=true;this.timer=null;},200);else this.panel.hidden=true;}
 }
 dispose(){this.cancel?.(this.timer);for(const remove of this.listeners)remove();}
}
