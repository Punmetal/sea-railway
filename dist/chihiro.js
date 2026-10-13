import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {CHIHIRO_SEAT,CUSHION_X} from './interior-layout.js';
import {FLOOR_TOP} from './train-shell.js';

// Sculpted, carriage-local surfaces: cream/green shirt, pink shorts, brown
// fringe and small ponytail, white socks and yellow shoes in the train scene.
// Local +Z faces the aisle. The soles stay at y=0 throughout the idle motion.
export function createChihiro(car){
 const group=new THREE.Group();group.name='chihiro-ogino';group.position.set(-CUSHION_X,FLOOR_TOP,CHIHIRO_SEAT.z);group.rotation.y=Math.PI/2;
 group.userData={character:'Chihiro Ogino',carriage:2,seat:CHIHIRO_SEAT.id};car.add(group);
 const materials=new Set(),geometries=new Set();
 const material=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0,...options});materials.add(m);return m;};
 const skin=material(0xf0c5a4),faceMaterial=material(0xf0c5a4),cream=material(0xeeeede),green=material(0x789753),pink=material(0xc87678),pinkSeam=material(0xae686c),hair=material(0x393125),hairHighlight=material(0x514330),eyeInk=material(0x292820),eyeWhite=material(0xf4f0dd),iris=material(0x6c5540),mouth=material(0x946b5b),sock=material(0xe1e2d8),sockFold=material(0xcacfc7),shoe=material(0xd6b84f),sole=material(0xe2d9bb),shoeSeam=material(0xa67d35);
 const sphere=(center,scale,rotation=null)=>{const g=new THREE.SphereGeometry(1,24,16);g.scale(...scale);if(rotation)g.rotateX(rotation);g.translate(...center);return g;};
 const tube=(points,radius,segments=20,radial=8,endRadius=radius)=>{
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=new THREE.TubeGeometry(path,segments,1,radial,false),p=g.attributes.position;
  for(let i=0;i<=segments;i++){const center=path.getPointAt(i/segments),r=THREE.MathUtils.lerp(radius,endRadius,i/segments);for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;p.setXYZ(k,center.x+(p.getX(k)-center.x)*r,center.y+(p.getY(k)-center.y)*r,center.z+(p.getZ(k)-center.z)*r);}}
  g.computeVertexNormals();return g;
 };
 function add(parent,mat,parts,name){
  const flat=parts.map(g=>g.index?g.toNonIndexed():g),geometry=mergeGeometries(flat,false);for(const g of new Set([...flat,...parts]))g.dispose();
  geometries.add(geometry);const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 const bodyParts=new Map(),put=(mat,g)=>{if(!bodyParts.has(mat))bodyParts.set(mat,[]);bodyParts.get(mat).push(g);};
 function ringSection(a,b,segments=40){
  const p=[],uv=[],index=[];
  for(const [row,r]of [a,b].entries())for(let j=0;j<=segments;j++){const angle=j/segments*Math.PI*2,fold=1+Math.sin(angle*6+r.y*4)*.006;p.push(Math.sin(angle)*r.x*fold,r.y,r.z+Math.cos(angle)*r.depth*fold);uv.push(j/segments,row);}
  for(let j=0;j<segments;j++){const a=j,b=j+1,c=b+segments+1,d=a+segments+1;index.push(a,b,c,a,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
 }
 const rings=[{y:.59,x:.198,depth:.13,z:.076},{y:.66,x:.216,depth:.125,z:.05},{y:.78,x:.220,depth:.117,z:.026},{y:.825,x:.217,depth:.112,z:.02},{y:.99,x:.222,depth:.111,z:.013},{y:1.09,x:.218,depth:.10,z:.003},{y:1.155,x:.177,depth:.087,z:.002},{y:1.20,x:.065,depth:.057,z:.013}];
 for(let i=0;i<rings.length-1;i++)put((rings[i].y+rings[i+1].y)/2>.825&&(rings[i].y+rings[i+1].y)/2<.99?green:cream,ringSection(rings[i],rings[i+1]));
 put(skin,tube([[0,1.16,.012],[0,1.24,.016]],.056,8,16));
 put(green,tube([[-.064,1.196,.056],[-.041,1.158,.085],[0,1.144,.102],[.041,1.158,.085],[.064,1.196,.056]],.012,28,8));
 put(cream,tube([[-.195,.603,.115],[0,.599,.202],[.195,.603,.115]],.006,20,6));
 for(const side of [-1,1]){
  // Broad, relaxed half sleeves follow the upper arm instead of horizontal
  // cylinders. Separate fabric bands keep crisp green edges at any angle.
  const shoulder=[side*.177,1.106,.002],elbow=[side*.265,.765,.078];put(cream,sphere([side*.180,1.088,.006],[.070,.072,.068]));
  for(const [start,end,mat]of [[0,.33,cream],[.33,.78,green],[.78,1,cream]]){
   const a=shoulder.map((v,i)=>THREE.MathUtils.lerp(v,elbow[i],start)),b=shoulder.map((v,i)=>THREE.MathUtils.lerp(v,elbow[i],end));put(mat,tube([a,b],THREE.MathUtils.lerp(.067,.074,start),12,20,THREE.MathUtils.lerp(.067,.074,end)));
  }
  put(cream,tube([[side*.259,.77,.014],[side*.275,.747,.07],[side*.253,.77,.145]],.006,14,6));
  put(skin,sphere([side*.258,.768,.074],[.036,.034,.034]));
  const wrist=[side*.045,.644,.348];put(skin,tube([[side*.258,.764,.078],[side*.169,.701,.222],wrist],.037,24,12,.027));
  const handX=side*.039,handY=side<0?.632:.648,handZ=side<0?.363:.343;
  put(skin,sphere([handX,handY,handZ],[.035,.019,.043],-.20));
  for(let finger=0;finger<4;finger++){const x=handX+(finger-1.5)*.010;put(skin,tube([[x,handY,.362],[x-side*.004,handY-.014,.394],[x-side*.009,handY-.036,.405-(finger%3)*.003]],.0058,8,6,.0045));}
  put(skin,tube([[handX-side*.025,handY+.005,handZ-.012],[handX-side*.042,handY-.008,handZ+.005],[handX-side*.030,handY-.019,handZ+.018]],.007,10,6,.006));
  // The short trouser legs extend over the seated thighs; bare knees bend
  // into tapered shins, with both shoes planted on the carriage floor.
  put(pink,tube([[side*.092,.606,.089],[side*.102,.598,.22],[side*.104,.570,.328]],.095,24,20,.079));
  const hem=new THREE.RingGeometry(.048,.079,40);hem.rotateX(.254);hem.translate(side*.104,.570,.328);put(pink,hem);
  put(pinkSeam,tube([[side*.178,.563,.318],[side*.110,.527,.346],[side*.026,.556,.331]],.003,14,6));
  put(skin,sphere([side*.104,.548,.346],[.046,.045,.047]));
  put(skin,tube([[side*.104,.540,.349],[side*.111,.390,.369],[side*.113,.178,.402]],.045,28,16,.031));
  put(sock,tube([[side*.113,.132,.406],[side*.113,.215,.398]],.041,12,16,.043));
  // Loose socks bunch softly at the ankle instead of stacked rings.
  put(sock,sphere([side*.113,.168,.403],[.050,.034,.049]));put(sockFold,sphere([side*.115,.196,.401],[.047,.022,.046]));
  put(sole,sphere([side*.113,.021,.458],[.076,.021,.132]));
  put(shoe,sphere([side*.113,.074,.458],[.072,.061,.126]));
  put(shoe,sphere([side*.113,.127,.403],[.052,.027,.058]));
  put(shoeSeam,tube([[side*.060,.112,.440],[side*.113,.122,.476],[side*.166,.112,.440]],.0035,16,6));
  put(pinkSeam,tube([[side*.093,.143,.415],[side*.113,.136,.438],[side*.133,.143,.415]],.003,12,6));
  for(const z of [.448,.466])put(sole,tube([[side*.096,.125,z],[side*.130,.125,z]],.0024,4,5));
 }
 put(pink,sphere([0,.616,.100],[.191,.090,.115]));
 for(const [mat,parts]of bodyParts)add(group,mat,parts,'chihiro-'+(mat===green?'shirt-green':mat===cream?'shirt-cream':mat===skin?'arms-hands-legs':mat===pink?'shorts':mat===shoe?'yellow-shoes':mat===sole?'shoe-soles':'clothing-details'));

 const head=new THREE.Group();head.name='chihiro-head';head.position.set(0,1.43,.006);group.add(head);
 const face=new THREE.SphereGeometry(1,48,40),fp=face.attributes.position;
 for(let i=0;i<fp.count;i++){const y=fp.getY(i),jaw=.72+.28*THREE.MathUtils.smoothstep(y,-.85,.05);fp.setXYZ(i,fp.getX(i)*.205*jaw,y*(y<0?.213:.247),fp.getZ(i)*.179+(y<0?y*.012:0));}face.computeVertexNormals();
 add(head,faceMaterial,[face],'chihiro-face');
 faceMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vChildFace;').replace('#include <begin_vertex>','#include <begin_vertex>\nvChildFace=position;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vChildFace;').replace('#include <color_fragment>','#include <color_fragment>\nfloat blush=exp(-pow((abs(vChildFace.x)-.128)/.045,2.)-pow((vChildFace.y+.065)/.031,2.))*smoothstep(.065,.14,vChildFace.z);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.38,.30),blush*.20);');};faceMaterial.customProgramCacheKey=()=> 'chihiro-soft-cheeks-v1';
 add(head,skin,[sphere([-.193,-.022,-.014],[.027,.049,.022]),sphere([.193,-.022,-.014],[.027,.049,.022]),sphere([0,-.034,.178],[.020,.013,.018])],'chihiro-ears-nose');
 const faceZ=(x,y)=>.179*Math.sqrt(Math.max(0,1-(x/.205)**2-(y/(y<0?.213:.247))**2))+(y<0?y*.0563:0);
 const eyes=[];for(const side of [-1,1]){
  const eye=new THREE.Group();eye.name=side<0?'chihiro-left-eye':'chihiro-right-eye';eye.position.set(side*.077,.035,faceZ(side*.077,.035));head.add(eye);eyes.push(eye);
  add(eye,eyeWhite,[sphere([0,0,.004],[.028,.021,.009])],'chihiro-eye-white');
  add(eye,iris,[sphere([side*-.002,-.001,.011],[.019,.020,.004])],'chihiro-brown-iris');
  add(eye,eyeInk,[sphere([side*-.002,-.001,.015],[.013,.016,.002]),tube([[-.027,.003,.005],[-.014,.020,.009],[.006,.022,.009],[.027,.006,.005]],.0022,18,6)],'chihiro-pupil-upper-lid');
  add(eye,eyeWhite,[sphere([-.005,.007,.018],[.003,.004,.001])],'chihiro-eye-glint');
 }
 const brows=[];for(const side of [-1,1])brows.push(tube([[side*.039,.096,faceZ(side*.039,.096)+.004],[side*.074,.106,faceZ(side*.074,.106)+.004],[side*.110,.098,faceZ(side*.110,.098)+.004]],.0036,16,6));add(head,hair,brows,'chihiro-eyebrows');
 add(head,mouth,[tube([[-.024,-.116,faceZ(-.024,-.116)+.003],[0,-.119,faceZ(0,-.119)+.003],[.024,-.116,faceZ(.024,-.116)+.003]],.0024,16,6)],'chihiro-mouth');
 // A continuous scalp with a shaped hairline, followed by individually
 // tapered bangs and side locks. No spherical hair blob covers her face.
 const hp=[],huv=[],hi=[],around=64,down=30;
 for(let i=0;i<=down;i++)for(let j=0;j<=around;j++){const angle=j/around*Math.PI*2,front=Math.max(0,Math.cos(angle)),limit=THREE.MathUtils.lerp(2.72,1.045,Math.pow(front,3)),theta=i/down*limit;hp.push(Math.sin(theta)*Math.sin(angle)*.216,Math.cos(theta)*.263+.007,Math.sin(theta)*Math.cos(angle)*.198-.003);huv.push(j/around,i/down);}
 for(let i=0;i<down;i++)for(let j=0;j<around;j++){const a=i*(around+1)+j,b=a+1,c=b+around+1,d=a+around+1;hi.push(a,d,b,b,d,c);}
 const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));cap.setAttribute('uv',new THREE.Float32BufferAttribute(huv,2));cap.setIndex(hi);cap.computeVertexNormals();
 function lock(points,width,depth=.007){
  const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),p=[],uv=[],indices=[],n=24,r=10;
  for(let i=0;i<=n;i++){const t=i/n,c=path.getPoint(t),w=width*Math.pow(1-t,.62)+.0003;for(let j=0;j<=r;j++){const a=j/r*Math.PI*2;p.push(c.x+Math.cos(a)*w,c.y,c.z+Math.sin(a)*depth*Math.pow(1-t,.5));uv.push(j/r,t);}}
  for(let i=0;i<n;i++)for(let j=0;j<r;j++){const a=i*(r+1)+j,b=a+1,c=b+r+1,d=a+r+1;indices.push(a,b,c,a,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const hairParts=[cap],strokes=[];
 for(let i=0;i<11;i++){const x=(i-5)*.033,endY=[.010,.045,.084,.055,.090,.052,.089,.060,.034,.018,-.011][i],rootX=x*.82,rootZ=.198*Math.sqrt(Math.max(0,1-(rootX/.216)**2-(.198/.263)**2))-.002;
  const curve=[[rootX,.198,rootZ],[x*.99,.136,faceZ(x*.99,.136)+.018],[x+.005*Math.sin(i*2.7),endY,faceZ(x,endY)+.016]];hairParts.push(lock(curve,.024+(i%2)*.003,.0045));
  if(i%2===0)strokes.push(tube([curve[0],[curve[1][0]-.004,curve[1][1]+.015,curve[1][2]+.008]],.0015,14,5,.0006));
 }
 for(const side of [-1,1])hairParts.push(lock([[side*.166,.157,.111],[side*.200,-.025,.083],[side*.169,-.205,.069]],.023,.008));
 hairParts.push(sphere([0,-.095,-.184],[.063,.083,.046]));
 for(let i=0;i<7;i++)hairParts.push(lock([[(i-3)*.012,-.11,-.213],[(i-3)*.018,-.226,-.225],[(i-3)*.014,-.286+(i%2)*.025,-.163]],.015,.013));
 add(head,hair,hairParts,'chihiro-fringe-hair-ponytail');add(head,hairHighlight,strokes,'chihiro-hair-strokes');
 add(head,pink,[tube([[-.037,-.157,-.214],[0,-.175,-.23],[.037,-.157,-.214]],.006,14,6)],'chihiro-hair-tie');

 // Boh Mouse and the little fly bird share the *inner window sill*, looking
 // out at the sea to Chihiro's left. Their feet sit on the real trim top.
 const companions=new THREE.Group();companions.name='window-companions';car.add(companions);
 const mouse=new THREE.Group();mouse.name='boh-mouse';mouse.position.set(-1.297,2.1785,CHIHIRO_SEAT.z+.83);mouse.rotation.y=-Math.PI/2;mouse.userData.character='Boh Mouse';companions.add(mouse);
 const mouseFur=material(0xd6d2d6),mouseInner=material(0xd9a2a4),mouseNose=material(0x8a6670);
 const mouseBody=new THREE.SphereGeometry(1,28,24),mp=mouseBody.attributes.position;for(let i=0;i<mp.count;i++){const y=mp.getY(i),pear=1-y*.24;mp.setXYZ(i,mp.getX(i)*.078*pear,y*.112+.120,mp.getZ(i)*.072*pear);}mouseBody.computeVertexNormals();
 const mouseParts=[mouseBody,sphere([0,.218,.026],[.056,.058,.058]),sphere([-.037,.266,.008],[.017,.021,.010]),sphere([.037,.266,.008],[.017,.021,.010]),sphere([-.037,.011,.029],[.020,.011,.033]),sphere([.037,.011,.029],[.020,.011,.033])];
 for(const side of [-1,1])mouseParts.push(tube([[side*.059,.170,.014],[side*.076,.127,.029]],.013,12,8,.010));add(mouse,mouseFur,mouseParts,'boh-mouse-fur');
 // A long pink tail trails along the sill behind the plump body.
 add(mouse,mouseInner,[sphere([-.037,.267,.016],[.011,.014,.003]),sphere([.037,.267,.016],[.011,.014,.003]),tube([[0,.045,-.068],[-.026,.060,-.104],[-.075,.074,-.112],[-.130,.066,-.100],[-.170,.046,-.078]],.0065,36,8,.0025)],'boh-mouse-ears-tail');
 add(mouse,eyeInk,[sphere([-.022,.232,.079],[.005,.006,.003]),sphere([.022,.232,.079],[.005,.006,.003])],'boh-mouse-eyes');add(mouse,mouseNose,[sphere([0,.212,.086],[.008,.006,.005])],'boh-mouse-nose');
 const bird=new THREE.Group();bird.name='haedori-fly-bird';bird.position.set(-1.295,2.1785,CHIHIRO_SEAT.z+.54);bird.rotation.y=-Math.PI/2;bird.userData.character='Haedori';companions.add(bird);
 const birdDark=material(0x34323a),birdLeg=material(0x78634f),wingMaterial=material(0x3d3a44,{transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}),birdParts=[sphere([0,.073,0],[.037,.039,.032])];
 // A short crown of wiry feathers on top only, and a small yellow beak.
 for(let i=0;i<9;i++){const a=Math.PI*(.18+.64*i/8);birdParts.push(tube([[Math.cos(a)*.020,.095+Math.sin(a)*.026,-.004],[Math.cos(a)*.040,.096+Math.sin(a)*.056,-.010]],.0016,4,5,.0004));}add(bird,birdDark,birdParts,'haedori-body-feathers');
 const beak=new THREE.ConeGeometry(.010,.026,10);beak.rotateX(Math.PI/2);beak.translate(0,.068,.042);add(bird,material(0xd9b33c),[beak],'haedori-beak');
 const legs=[];for(const side of [-1,1]){legs.push(tube([[side*.013,.048,.003],[side*.018,.018,.008],[side*.030,.003,.018]],.002,10,5));legs.push(tube([[side*.018,.012,.008],[side*.031,.003,-.003]],.002,6,5));}add(bird,birdLeg,legs,'haedori-feet');
 const wings=[];for(const side of [-1,1]){const wing=new THREE.Group();wing.position.set(side*.025,.078,-.006);bird.add(wing);const g=sphere([side*.004,-.004,-.010],[.008,.020,.003]);g.rotateZ(-side*.2);add(wing,wingMaterial,[g],'haedori-wing');wings.push(wing);}
 add(bird,eyeWhite,[sphere([-.013,.084,.027],[.006,.007,.003]),sphere([.013,.084,.027],[.006,.007,.003])],'haedori-eyes');add(bird,eyeInk,[sphere([-.013,.084,.030],[.003,.004,.002]),sphere([.013,.084,.030],[.003,.004,.002])],'haedori-pupils');
 const baseHeadY=head.position.y;
 return {group,head,companions,mouse,bird,materials,update(dt,time,speed){
  // Gentle breathing/look and a rare blink use the frozen simulation clock.
  head.position.y=baseHeadY+Math.sin(time*.85)*.002;head.rotation.y=Math.sin(time*.17)*.055;head.rotation.z=Math.sin(time*.39)*.007*Math.min(1,Math.abs(speed)/6.5);
  const blinkTime=((time+1.37)%6.9),blink=blinkTime<.18?Math.max(.08,1-Math.sin(blinkTime/.18*Math.PI)*.94):1;for(const eye of eyes)eye.scale.y=blink;
  mouse.rotation.z=Math.sin(time*.64)*.008;for(let i=0;i<wings.length;i++)wings[i].rotation.z=(i===0?1:-1)*Math.sin(time*5.2)*.06;
 },dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();car.remove(group,companions);}};
}
