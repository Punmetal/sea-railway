import * as THREE from 'three';

export function createFarLandscape(scene){
  const root=new THREE.Group();root.name='painted-distant-ridges';scene.add(root);const materials=[];
  for(const [i,[x,z,width,height,yaw]]of [[-1150,-1200,780,64,.6],[1350,-900,920,82,-.9],[-1450,650,700,52,-.2],[980,1350,1000,74,1.0]].entries()){
    const positions=[],colors=[],indices=[],steps=48;
    for(let j=0;j<=steps;j++){
      const q=j/steps,profile=Math.sin(q*Math.PI)*(.5+.20*Math.sin(q*17+i)+.13*Math.sin(q*31-i));
      positions.push((q-.5)*width,-.18,0,(q-.5)*width,Math.max(0,profile*height),0);colors.push(.91,.96,1,.76,.85,.93);
      if(j<steps){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
    const material=new THREE.MeshBasicMaterial({color:0xb7c8d6,vertexColors:true,side:THREE.DoubleSide,fog:true}),mesh=new THREE.Mesh(geo,material);mesh.position.set(x,0,z);mesh.rotation.y=yaw;mesh.name='distant-ridge-'+i;root.add(mesh);materials.push(material);
  }
  return {root,update(p){materials.forEach((m,i)=>m.color.copy(p.horizon).lerp(p.top,.10+i*.018).multiplyScalar(.96));},dispose(){root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());}};
}
