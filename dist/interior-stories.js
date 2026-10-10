import * as THREE from 'three';
import {thaiTime} from './time-cycle.js';
export function createInteriorStories(cars){
  const root=new THREE.Group();root.name='quiet-interior-details';const owned=[];const clocks=[];
  const cream=new THREE.MeshStandardMaterial({color:0xd4cab0,roughness:.95}),wood=new THREE.MeshStandardMaterial({color:0x766351,roughness:.9}),ink=new THREE.MeshStandardMaterial({color:0x3b4444,roughness:1});owned.push(cream,wood,ink);
  const textures=[];
  function sign(lines,w,h){const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#ddd2b3';ctx.fillRect(0,0,512,192);ctx.fillStyle='#5b645d';ctx.textAlign='center';ctx.font='27px serif';lines.forEach((line,i)=>ctx.fillText(line,256,42+i*48));const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const m=new THREE.MeshStandardMaterial({map:texture,roughness:1});owned.push(m);return new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);}
  for(const [i,car] of cars.entries()){
    const g=root.clone();g.name='interior-story-'+i;car.getObjectByName('reference-train-model').add(g);
    const map=sign(['海の鉄道 · SEA RAILWAY','海の駅 ───── 遠い波の駅','SEA STATION       FAR TIDE'],1.5,.48);map.position.set(0,3.46,7.075);map.rotation.y=Math.PI;g.add(map);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(1.60,.57,.035),wood);frame.position.set(0,3.46,7.11);g.add(frame);
    const clock=new THREE.Group();clock.position.set(0,3.48,-8.49);g.add(clock);
    const face=new THREE.Mesh(new THREE.CircleGeometry(.16,32),cream);clock.add(face);
    for(let n=0;n<12;n++){const tick=new THREE.Mesh(new THREE.BoxGeometry(.009,n%3===0?.026:.014,.003),ink);const a=n/12*Math.PI*2;tick.position.set(Math.sin(a)*.132,Math.cos(a)*.132,.006);tick.rotation.z=-a;clock.add(tick);}
    const hands=[];for(const length of [.075,.108]){const h=new THREE.Group();const hand=new THREE.Mesh(new THREE.BoxGeometry(.010,length,.004),ink);hand.position.set(0,length/2,.012);h.add(hand);clock.add(h);hands.push(h);}clocks.push(hands);
    const ticket=sign(['海の駅 → 遠い波の駅','乗車券  ·  片道'],.22,.085);ticket.position.set(1.04,1.674,3.75);ticket.rotation.set(-Math.PI/2,0,.16);g.add(ticket);
    const bag=new THREE.Mesh(new THREE.BoxGeometry(.36,.27,.45),wood);bag.position.set(-.99,3.41,-2.4);g.add(bag);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.011,5,12,Math.PI),ink);handle.position.set(-.99,3.55,-2.4);g.add(handle);
    g.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=true;}});
  }
  return {update(date=new Date()){const t=thaiTime(date);for(const [hour,minute] of clocks){hour.rotation.z=-t.hour/12*Math.PI*2;minute.rotation.z=-(t.hour%1)*Math.PI*2;}},dispose(){for(const car of cars){const g=car.getObjectByName('interior-story-'+cars.indexOf(car));g?.traverse(o=>o.geometry?.dispose());g?.removeFromParent();}owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
