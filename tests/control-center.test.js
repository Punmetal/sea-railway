import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ControlCenter} from '../dist/control-center.js';
class Element{
 constructor(parent=null){this.parent=parent;this.events=[];this.attrs={};this.hidden=true;this.open=false;this.classList={toggle:(name,value)=>{this[name]=value;}};}
 addEventListener(type,fn,capture){this.events.push({type,fn,capture});}
 removeEventListener(type,fn){this.events=this.events.filter(e=>e.type!==type||e.fn!==fn);}
 contains(el){for(let p=el;p;p=p.parent)if(p===this)return true;return false;}
 setAttribute(k,v){this.attrs[k]=v;}focus(){this.focused=true;}querySelector(){return this.summary;}
 fire(type,e={}){for(const event of this.events.filter(v=>v.type===type)){event.fn(e);if(e.stopped)break;}}
}
const win=new Element(),button=new Element(),panel=new Element(),close=new Element(panel),summary=new Element(panel),slider=new Element(panel),outside=new Element();panel.summary=summary;
const sections=[new Element(panel),new Element(panel)],pending=new Map();let id=0,changes=[];
const cc=new ControlCenter({window:win,document:{},button,panel,close,sections,onChange:v=>changes.push(v),schedule:f=>{pending.set(++id,f);return id;},cancel:i=>pending.delete(i)});
const event=(code,target=slider)=>({code,target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}});
button.fire('click');assert(cc.open&&!panel.hidden&&!panel.inert&&summary.focused);assert.equal(button.attrs['aria-expanded'],'true');
for(const code of ['KeyW','KeyE','KeyC','Digit1','ArrowRight','Tab','Space','Enter']){const e=event(code);win.fire('keydown',e);assert(e.stopped&&!e.prevented,'UI blocks game listeners while retaining native keyboard controls.');}
let e=event('Escape');win.fire('keydown',e);assert(!cc.open&&panel.inert&&e.prevented&&button.focused);assert.equal(panel.attrs['aria-hidden'],'true');assert(!panel.hidden,'The closing animation keeps its painted panel until completion.');
button.fire('click');assert.equal(pending.size,0,'Rapid reopening cancels a stale close timer.');assert(cc.open&&!panel.hidden);
sections[0].open=true;sections[1].open=true;sections[1].fire('toggle');assert(!sections[0].open&&sections[1].open,'Only one section occupies the view.');
e=event('',slider);win.fire('pointerdown',e);assert(cc.open&&!e.stopped,'Inside clicks reach sliders.');
e=event('',outside);win.fire('pointerdown',e);assert(!cc.open&&e.stopped&&e.prevented,'The outside click closes without dragging the scene.');for(const f of pending.values())f();assert(panel.hidden);
e=event('KeyW',outside);win.fire('keydown',e);assert(!e.stopped,'Scene keys resume outside the closed panel.');
e=event('KeyW',button);win.fire('keydown',e);assert(!e.stopped,'Returning focus to the opener does not leave movement locked after closing.');
button.fire('click');close.fire('click');assert(!cc.open);cc.dispose();assert.equal(win.events.length,0);assert.equal(button.events.length,0);assert.deepEqual(changes,[true,false,true,false,true,false]);
const markup=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
for(const id of ['control-open','control-center','time-sync','time-lock','ambience-volume','train-volume','music-volume','cinematic','camera-ratio','camera-filter','photo-open','quality-select','hide-ui'])assert(ids.includes(id));
assert(!ids.includes('rain-toggle')&&!ids.includes('snow-toggle'),'Rain and snow use the same exclusive selector as clear and mist.');
assert.deepEqual([...markup.matchAll(/data-weather="([^"]+)"/g)].map(m=>m[1]),['clear','rain','snow','mist']);
assert.equal((markup.match(/data-control-section/g)||[]).length,5);assert(!ids.includes('audio-menu')&&!ids.includes('settings-open'));
// Browser timer functions may reject an unbranded receiver. Node's permissive
// timers and arrow-only mocks concealed the close/photo-entry regression.
const originalSchedule=globalThis.setTimeout,originalCancel=globalThis.clearTimeout,timers=new Map();let timerId=0;
try{
 globalThis.setTimeout=function(fn){assert.equal(this,globalThis,'Window.setTimeout keeps its global receiver.');timers.set(++timerId,fn);return timerId;};
 globalThis.clearTimeout=function(id){assert.equal(this,globalThis,'Window.clearTimeout keeps its global receiver.');timers.delete(id);};
 const b=new Element(),p=new Element(),c=new Element(p),w=new Element();let sceneEnabled=true;
 const native=new ControlCenter({button:b,panel:p,close:c,window:w,document:{},onChange:open=>{sceneEnabled=!open;}});
 for(let i=0;i<6;i++){b.fire('click');assert(!sceneEnabled);c.fire('click');assert(sceneEnabled,'Mouse control is returned before the close fade ends.');}
 b.fire('click');native.setOpen(false,{focus:false});assert(sceneEnabled,'Photo entry can close an open Control Center synchronously.');
 native.dispose();assert.equal(timers.size,0);
}finally{globalThis.setTimeout=originalSchedule;globalThis.clearTimeout=originalCancel;}
console.log('Control Center: browser timer receivers, synchronous mouse restoration, photo-entry closure, input isolation, rapid toggles, focus and one exclusive weather selector passed.');
