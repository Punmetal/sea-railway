import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {routePose,TRACK_LENGTH,TAU} from './physics.js';

// Three instanced draws for all flocks; hinged wings alternate flight and gliding.
export function createBirds(scene,{coarse=false}={}){
  const flockCount=coarse?16:24,perFlock=coarse?4:5,count=flockCount*perFlock;
  const pale=new THREE.MeshStandardMaterial({color:0xc9c9bc,roughness:.92});
  const wingMat=new THREE.MeshStandardMaterial({color:0x8a9291,roughness:.95,side:THREE.DoubleSide});
  const body=new THREE.SphereGeometry(1,8,6);body.scale(.10,.105,.34);
  const head=new THREE.SphereGeometry(.09,8,6);head.translate(0,.055,.30);
  const beak=new THREE.ConeGeometry(.033,.12,5);beak.rotateX(Math.PI/2);beak.translate(0,.035,.415);
  const tail=new THREE.ConeGeometry(.12,.30,4);tail.scale(1,.9,.25);tail.rotateX(-Math.PI/2);tail.translate(0,0,-.37);
  const bodyGeo=mergeGeometries([body,head,beak,tail]);[body,head,beak,tail].forEach(g=>g.dispose());
  function wing(sign){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,.14, sign*.44,.025,.17, sign*.85,-.005,-.17,
    0,0,.14, sign*.85,-.005,-.17, sign*.47,.008,-.24,
    0,0,.14, sign*.47,.008,-.24, 0,0,-.14
  ],3));g.computeVertexNormals();return g;}
  const bodies=new THREE.InstancedMesh(bodyGeo,pale,count),left=new THREE.InstancedMesh(wing(-1),wingMat,count),right=new THREE.InstancedMesh(wing(1),wingMat,count);
  for(const [name,mesh] of [['bodies',bodies],['left-wings',left],['right-wings',right]]){mesh.name='sky-birds-'+name;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh);}
  const specs=Array.from({length:count},(_,i)=>{const flock=Math.floor(i/perFlock),member=i%perFlock,p=routePose((flock+.055)/flockCount*TRACK_LENGTH),near=flock%3!==2;return {p,member,near,side:flock%2?1:-1,phase:flock*2.399+member*.81,baseY:(near?9.6+(flock%4)*2.1:22+(flock%3)*5)+member*.52,scale:(near?.9:1.1)+((i*17)%9)*.035};});
  const wings=[[-1,left],[1,right]],meshes=[bodies,left,right];
  const dummy=new THREE.Object3D(),hinge=new THREE.Matrix4(),turn=new THREE.Matrix4(),combined=new THREE.Matrix4();
  function update(time){
    for(let i=0;i<count;i++){
      const s=specs[i],t=time*(.085+(Math.floor(i/perFlock)%3)*.009)+s.phase*.08;
      const length=s.near?34:58,width=s.near?12:24,along=length*Math.sin(t)+s.member*2.1,across=s.side*((s.near?15:55)+width*Math.cos(t*.81)+s.member*1.45);
      const vx=s.side*width*.81*Math.sin(t*.81)*-1,vz=length*Math.cos(t);
      dummy.position.set(s.p.x+Math.cos(s.p.yaw)*across+Math.sin(s.p.yaw)*along,s.baseY+Math.sin(t*1.3+s.phase)*1.2,s.p.z-Math.sin(s.p.yaw)*across+Math.cos(s.p.yaw)*along);
      dummy.rotation.set(Math.sin(t*1.3+s.phase)*.055,s.p.yaw+Math.atan2(vx,vz),Math.sin(t*.81)*.10);
      dummy.scale.setScalar(s.scale);dummy.updateMatrix();bodies.setMatrixAt(i,dummy.matrix);
      const cycle=time*.41+s.phase,flapGate=THREE.MathUtils.smoothstep(Math.sin(cycle),-.05,.45);
      const angle=.075+Math.sin(time*7.9+s.phase)*.53*flapGate;
      for(const [sign,mesh] of wings){
        hinge.makeTranslation(sign*.055,0,0);turn.makeRotationZ(sign*angle);hinge.multiply(turn);combined.multiplyMatrices(dummy.matrix,hinge);mesh.setMatrixAt(i,combined);
      }
    }
    for(const m of meshes)m.instanceMatrix.needsUpdate=true;
  }
  update(0);
  return {count,flockCount,bodies,left,right,update,dispose(){for(const m of meshes){scene.remove(m);m.geometry.dispose();}pale.dispose();wingMat.dispose();}};
}
