import * as THREE from 'three';

export const WATER_LEVEL=.018, TRAIN_LEVEL=-.10;
export const WHEEL_CONTACTS=[];
for(let car=0;car<2;car++)for(const bogie of [-6.35,6.35])for(const axle of [-.67,.67])for(const side of [-1,1])WHEEL_CONTACTS.push({car,x:side*1.00,z:bogie+axle,side});

function foamMaterial(geometry,count){
  const fade=new Float32Array(count);geometry.setAttribute('aFade',new THREE.InstancedBufferAttribute(fade,1));
  const material=new THREE.MeshStandardMaterial({color:0xe3f2ee,roughness:.20,metalness:.06,transparent:true,opacity:.82,depthWrite:false,emissive:0x26363c,emissiveIntensity:.10});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float aFade;varying float vFade;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFade=aFade;');
    shader.fragmentShader='varying float vFade;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFade;');
  };
  material.customProgramCacheKey=()=> 'wheel-foam-fade-v2';return {material,fade};
}

function crestGeometry(coarse){
  const arc=Math.PI*1.12,geometry=new THREE.TorusGeometry(1,.065,5,coarse?22:32,arc);geometry.rotateZ(-arc/2);
  const p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),angle=Math.atan2(y,x),jitter=1+.072*Math.sin(angle*3.7+.5)+.035*Math.sin(angle*7.1),taper=.25+.75*Math.pow(Math.max(0,Math.cos(angle*.86)),.5);
    p.setXYZ(i,x*jitter,y*jitter,p.getZ(i)*taper+.028*Math.cos(angle*2.6)*taper);
  }
  geometry.computeVertexNormals();return geometry;
}

export function createWheelWater(scene,cars,{coarse=false}={}){
  const ringsPerWheel=coarse?3:4,dropsPerWheel=coarse?4:7,count=WHEEL_CONTACTS.length;
  const ringGeometry=crestGeometry(coarse),dropGeometry=new THREE.SphereGeometry(1,7,5);
  const ringData=foamMaterial(ringGeometry,count*(ringsPerWheel+1)),dropData=foamMaterial(dropGeometry,count*dropsPerWheel);
  const rings=new THREE.InstancedMesh(ringGeometry,ringData.material,ringData.fade.length),drops=new THREE.InstancedMesh(dropGeometry,dropData.material,dropData.fade.length);
  rings.name='wheel-ripples';drops.name='wheel-splashes';
  for(const mesh of [rings,drops]){mesh.renderOrder=20;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
  const dummy=new THREE.Object3D(),contact=new THREE.Vector3(),color=new THREE.Color(),foamWhite=new THREE.Color(0xf4f8ed);
  const cursors=new Uint8Array(count),nextEmission=new Float64Array(count),states=Array.from({length:count*ringsPerWheel},()=>({born:-Infinity,x:0,z:0,yaw:0,side:1,lifetime:3,spread:2.2,aspect:.7,rotation:0}));
  let seed=7617;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++)nextEmission[i]=random()*.72;
  const baseSpeed=6.495153319;let flowTime=0,lastElapsed=0;
  function update(elapsed,speed,sea,horizon){
    const strength=THREE.MathUtils.clamp(Math.abs(speed)/baseSpeed,0,1.5),travelSign=Math.sign(speed)||1;flowTime+=Math.max(0,Math.min(.25,elapsed-lastElapsed))*strength;lastElapsed=elapsed;color.copy(horizon).lerp(foamWhite,.82);ringData.material.color.copy(color);dropData.material.color.copy(color);ringData.material.emissive.copy(horizon);dropData.material.emissive.copy(horizon);
    for(let i=0;i<count;i++){
      const wheel=WHEEL_CONTACTS[i],car=cars[wheel.car];car.localToWorld(contact.set(wheel.x,0,wheel.z));
      const yaw=car.rotation.y,forwardX=Math.sin(yaw)*travelSign,forwardZ=Math.cos(yaw)*travelSign,sideX=Math.cos(yaw)*wheel.side,sideZ=-Math.sin(yaw)*wheel.side;
      if(strength>.01&&elapsed>=nextEmission[i]){
        const n=i*ringsPerWheel+cursors[i],s=states[n];s.born=elapsed;s.x=contact.x;s.z=contact.z;s.yaw=yaw;s.side=wheel.side;s.lifetime=2.9+random()*.72;s.spread=(2.12+random()*.40)*strength;s.aspect=.61+random()*.20;s.rotation=(random()-.5)*.23;
        cursors[i]=(cursors[i]+1)%ringsPerWheel;nextEmission[i]=elapsed+.71+random()*.22;
      }
      for(let j=0;j<ringsPerWheel;j++){
        const n=i*ringsPerWheel+j,s=states[n],age=elapsed-s.born,phase=age/s.lifetime;
        if(!Number.isFinite(age)||phase<0||phase>=1){dummy.position.set(0,WATER_LEVEL,0);dummy.rotation.set(0,0,0);dummy.scale.set(.001,.001,.001);ringData.fade[n]=0;}
        else{
          const sx=Math.cos(s.yaw)*s.side,sz=-Math.sin(s.yaw)*s.side,radius=.30+age*s.spread;
          // Birth coordinates stay in world space while the train moves ahead.
          dummy.position.set(s.x+sx*(.13+age*.18),WATER_LEVEL+.039+Math.sin(phase*Math.PI)*.010,s.z+sz*(.13+age*.18));
          dummy.rotation.set(-Math.PI/2,0,s.yaw+(s.side<0?Math.PI:0)+s.rotation);dummy.scale.set(radius,radius*s.aspect,.62*(1-phase*.48));
          ringData.fade[n]=THREE.MathUtils.smoothstep(phase,0,.09)*(1-THREE.MathUtils.smoothstep(phase,.48,1))*.62;
        }
        dummy.updateMatrix();rings.setMatrixAt(n,dummy.matrix);
      }
      // A small, irregular raised foam crest stays at each live wheel contact.
      const n=count*ringsPerWheel+i,pulse=.5+.5*Math.sin(flowTime*4.9+i*2.13);
      dummy.position.set(contact.x+sideX*.10,WATER_LEVEL+.043,contact.z+sideZ*.10);dummy.rotation.set(-Math.PI/2,0,yaw+(wheel.side<0?Math.PI:0));dummy.scale.set(.30+pulse*.075,.42+pulse*.06,.69);dummy.updateMatrix();rings.setMatrixAt(n,dummy.matrix);ringData.fade[n]=(.39+pulse*.19)*strength;
      for(let j=0;j<dropsPerWheel;j++){
        const n=i*dropsPerWheel+j,phase=(flowTime*(1.43+(i%3)*.11)+i*.219+j/dropsPerWheel)%1,scatter=Math.sin(i*7.3+j*3.1);
        dummy.position.set(contact.x-forwardX*phase*.90+sideX*(.07+phase*(.33+scatter*.10)),WATER_LEVEL+.033+4*phase*(1-phase)*(.16+.10*(.5+.5*scatter))*strength,contact.z-forwardZ*phase*.90+sideZ*(.07+phase*.33));
        dummy.rotation.set(0,0,0);const size=(.016+.010*(.5+.5*scatter))*Math.max(.001,strength);dummy.scale.set(size,size*(1.8-phase),size);dummy.updateMatrix();drops.setMatrixAt(n,dummy.matrix);dropData.fade[n]=Math.sin(Math.PI*phase)*strength;
      }
    }
    rings.instanceMatrix.needsUpdate=drops.instanceMatrix.needsUpdate=true;ringGeometry.attributes.aFade.needsUpdate=dropGeometry.attributes.aFade.needsUpdate=true;
  }
  return {update,wheelCount:count,rings,drops,dispose(){for(const mesh of [rings,drops]){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}}};
}
