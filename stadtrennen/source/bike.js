import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.0;
const camera=new THREE.PerspectiveCamera(50,W/H,0.1,900);
let scene=new THREE.Scene();
const composer=new EffectComposer(renderer);const rpass=new RenderPass(scene,camera);composer.addPass(rpass);
const bloom=new UnrealBloomPass(new THREE.Vector2(W/2,H/2),0,0.5,1.0);composer.addPass(bloom);composer.addPass(new OutputPass());
const envTex=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),0.04).texture;
const $=id=>document.getElementById(id);
const capEl=$('cap'),flashEl=$('flash'),fadeEl=$('fade'),chatEl=$('chat'),lbEl=$('lb'),vhsEl=$('vhs'),bigEl=$('big');

// ---------- utils
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const easeOut=t=>1-Math.pow(1-clamp(t),3);
const easeIn=t=>Math.pow(clamp(t),2);
const prog=(t,a,b)=>clamp((t-a)/(b-a));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const lv=(a,b,t)=>a.clone().lerp(b,t);
function ctex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.userData.c=c;t.userData.g=g;return t}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const add=(...o)=>{o.forEach(x=>scene.add(x));return o[0]};
const PL=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:o.r??0.5,metalness:o.m??0,...(o.x||{})});
const geoCache={};
function rbox(w,h,d,r=0.07){const k=[w,h,d,r].join();return geoCache[k]||(geoCache[k]=new RoundedBoxGeometry(w,h,d,2,r))}
function mesh(geo,mat,shadow=true){const m=new THREE.Mesh(geo,mat);m.castShadow=shadow;m.receiveShadow=true;return m}

// ---------- studs
const studCanvas=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='#dcdcdc';g.fillRect(0,0,64,64);
  g.fillStyle='rgba(0,0,0,.16)';g.beginPath();g.arc(35,36,19,0,7);g.fill();
  const gr=g.createRadialGradient(26,25,3,32,32,19);gr.addColorStop(0,'#ffffff');gr.addColorStop(.75,'#e6e6e6');gr.addColorStop(1,'#c6c6c6');g.fillStyle=gr;g.beginPath();g.arc(32,32,18,0,7);g.fill();
  g.strokeStyle='rgba(0,0,0,.08)';g.strokeRect(0,0,64,64);return c})();
function studTex(rx,ry){const t=new THREE.CanvasTexture(studCanvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=8;return t}
function part(w,h,d,color,o={}){
  const side=PL(color,{r:o.r??0.5,x:o.neon?{emissive:new THREE.Color(color),emissiveIntensity:o.ei??1.2}:(o.glass?{transparent:true,opacity:o.opacity??0.3,depthWrite:false}:{})});
  let top=side;if(o.studs&&!o.neon&&!o.glass)top=PL(color,{x:{map:studTex(Math.max(1,Math.round(w*2)),Math.max(1,Math.round(d*2)))}});
  const m=mesh(new THREE.BoxGeometry(w,h,d),[side,side,top,side,side,side],!o.glass);if(o.pos)m.position.set(...o.pos);return m;
}

// ---------- faces (decal, transparent)
const faceCache={};
function faceTex(expr){
  if(faceCache[expr])return faceCache[expr];
  const t=ctex(172,128,(g)=>{g.fillStyle='#111';g.strokeStyle='#111';g.lineCap='round';g.lineWidth=7;
    const cx=86;const eye=(x,y,w=14,h=26)=>{g.beginPath();g.ellipse(x,y,w/2,h/2,0,0,7);g.fill()};
    const arc=(x,y,r,a0,a1)=>{g.beginPath();g.arc(x,y,r,a0,a1);g.stroke()};
    const brow=(x1,y1,x2,y2)=>{g.lineWidth=6;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.lineWidth=7};
    switch(expr){
      case 'smile':eye(cx-20,44);eye(cx+20,44);arc(cx,62,28,0.22*Math.PI,0.78*Math.PI);break;
      case 'happy':arc(cx-20,50,11,Math.PI+0.3,-0.3);arc(cx+20,50,11,Math.PI+0.3,-0.3);g.beginPath();g.arc(cx,72,24,0,Math.PI);g.closePath();g.fillStyle='#3a1010';g.fill();g.fillStyle='#fff';g.fillRect(cx-18,72,36,7);break;
      case 'laugh':arc(cx-20,46,11,Math.PI+0.3,-0.3);arc(cx+20,46,11,Math.PI+0.3,-0.3);g.fillStyle='#3a1010';g.beginPath();g.moveTo(cx-28,68);g.lineTo(cx+28,68);g.quadraticCurveTo(cx+28,112,cx,112);g.quadraticCurveTo(cx-28,112,cx-28,68);g.fill();
        g.fillStyle='#e46';g.beginPath();g.ellipse(cx,102,12,6,0,0,7);g.fill();g.fillStyle='#fff';g.fillRect(cx-22,68,44,8);break;
      case 'shock':g.fillStyle='#fff';g.beginPath();g.arc(cx-20,44,13,0,7);g.fill();g.lineWidth=4;g.stroke();g.beginPath();g.arc(cx+20,44,13,0,7);g.fill();g.stroke();g.fillStyle='#111';g.beginPath();g.arc(cx-20,44,5,0,7);g.fill();g.beginPath();g.arc(cx+20,44,5,0,7);g.fill();
        g.beginPath();g.ellipse(cx,88,11,15,0,0,7);g.fill();break;
      case 'sad':eye(cx-20,48);eye(cx+20,48);brow(cx-34,26,cx-10,20);brow(cx+10,20,cx+34,26);arc(cx,104,20,Math.PI+0.5,-0.5);break;
      case 'smug':g.beginPath();g.ellipse(cx-20,48,8,6,0,0,7);g.fill();g.beginPath();g.ellipse(cx+20,48,8,6,0,0,7);g.fill();brow(cx-34,34,cx-8,38);brow(cx+8,30,cx+34,22);
        g.beginPath();g.moveTo(cx-20,84);g.quadraticCurveTo(cx+8,92,cx+26,74);g.stroke();break;
      case 'strain':g.beginPath();g.moveTo(cx-34,34);g.lineTo(cx-12,46);g.lineTo(cx-34,58);g.stroke();g.beginPath();g.moveTo(cx+34,34);g.lineTo(cx+12,46);g.lineTo(cx+34,58);g.stroke();
        g.fillStyle='#fff';g.fillRect(cx-26,74,52,22);g.lineWidth=4;g.strokeRect(cx-26,74,52,22);g.beginPath();g.moveTo(cx-26,85);g.lineTo(cx+26,85);for(const x of [-13,0,13]){g.moveTo(cx+x,74);g.lineTo(cx+x,96)}g.stroke();
        g.fillStyle='rgba(230,60,60,.45)';g.beginPath();g.ellipse(cx-46,72,12,7,0,0,7);g.fill();g.beginPath();g.ellipse(cx+46,72,12,7,0,0,7);g.fill();break;
      case 'determined':eye(cx-20,48);eye(cx+20,48);brow(cx-36,24,cx-8,34);brow(cx+8,34,cx+36,24);g.beginPath();g.moveTo(cx-18,86);g.lineTo(cx+18,86);g.stroke();break;
      case 'sleep':arc(cx-20,42,11,0.3,Math.PI-0.3);arc(cx+20,42,11,0.3,Math.PI-0.3);g.beginPath();g.ellipse(cx,86,7,8,0,0,7);g.fill();break;
      case 'tired':g.beginPath();g.ellipse(cx-20,50,8,6,0,0,7);g.fill();g.beginPath();g.ellipse(cx+20,50,8,6,0,0,7);g.fill();brow(cx-32,40,cx-8,40);brow(cx+8,40,cx+32,40);g.beginPath();g.moveTo(cx-14,86);g.lineTo(cx+14,84);g.stroke();break;
    }
  });
  faceCache[expr]=t;return t;
}
// ---------- name tags & bubbles
function tagDraw(g,name,gold){g.clearRect(0,0,512,96);g.font='900 50px P';g.textAlign='center';g.textBaseline='middle';g.lineWidth=10;g.strokeStyle='rgba(0,0,0,.85)';g.strokeText(name,256,50);
  if(gold){const gr=g.createLinearGradient(0,20,0,80);gr.addColorStop(0,'#fff6b0');gr.addColorStop(1,'#ffb300');g.fillStyle=gr}else g.fillStyle='#fff';g.fillText(name,256,50)}
function makeTag(name){const t=ctex(512,96,g=>tagDraw(g,name,false));const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false}));s.scale.set(1.9,0.36,1);s.renderOrder=6;s.userData={t,name};return s}
function setTagGold(ch){const s=ch.userData.tag;if(!s||s.userData.gold)return;s.userData.gold=true;tagDraw(s.userData.t.userData.g,s.userData.name,true);s.userData.t.needsUpdate=true}
function bubbleDraw(g,text){g.clearRect(0,0,640,200);g.font='900 46px P';const w=Math.min(600,g.measureText(text).width+56);const x=(640-w)/2;
  g.fillStyle='rgba(0,0,0,.25)';rr(g,x+4,24,w,104,30);g.fill();g.fillStyle='#fff';rr(g,x,18,w,104,30);g.fill();g.beginPath();g.moveTo(300,120);g.lineTo(340,120);g.lineTo(320,150);g.fill();
  g.fillStyle='#1b1b1b';g.textAlign='center';g.textBaseline='middle';g.fillText(text,320,72)}
function bubble(ch,text,scale=1){const u=ch.userData;if(!u.bub){const t=ctex(640,200,g=>{});const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false,depthTest:false}));s.renderOrder=8;u.head.add(s);u.bub=s;s.userData={t,text:null}}
  const s=u.bub;if(text==null){s.visible=false;return}s.visible=true;if(s.userData.text!==text){s.userData.text=text;bubbleDraw(s.userData.t.userData.g,text);s.userData.t.needsUpdate=true}
  s.scale.set(2.6*scale,0.81*scale,1);s.position.set(0,1.45+0.1*scale,0)}
function bubbleAt(ch,t,list){let cur=null,k=1;for(const [a,b,txt] of list){if(t>=a&&t<b){cur=txt;k=easeOut(prog(t,a,a+0.15))}}bubble(ch,cur,0.4+0.6*k)}

// ---------- R6 character
const ME={skin:'#f5cd30',shirt:'#0d69ac',pants:'#4b974b',arms:'#f5cd30',hair:'messy',hairColor:'#3b2414',band:'#e53935',name:'xX_Treppe_Xx',face:'determined'};
const NAMES=['Kevin2012','LindaGamer','Aufzug_Fan','chillmaxx','Bernd_derNachbar','PizzaLord','NoobSlayer','mia_2013','Lennox99','xXLazyXx','Tobi_TV','EmmaPlays'];
const SKINS=['#f5cd30','#e8b68b','#c68a5a','#ffcc99','#8d5a3b','#f5cd30'];
const SHIRTS=['#e53935','#1e88e5','#43a047','#fdd835','#8e24aa','#fb8c00','#00acc1','#f06292','#263238','#ffffff'];
const PANTS=['#1f1f24','#37474f','#3949ab','#5d4037','#212121','#1565c0'];
function npc(i,o={}){const R=rng(i*13+5);const pick=a=>a[Math.floor(R()*a.length)];
  const hair=['messy','cap','beanie','long','bald','spiky'][i%6];
  return {skin:pick(SKINS),shirt:pick(SHIRTS),pants:pick(PANTS),hair,hairColor:pick(['#3b2414','#111','#d9a441','#8d4a2b','#e0e0e0']),capColor:pick(SHIRTS),name:NAMES[i%NAMES.length],face:'smile',seed:i,...o}}
function headGeo(){if(geoCache.head)return geoCache.head;const pts=[];const r=0.31,h=0.31,c=0.1;pts.push(V(0,-h,0));
  for(let i=0;i<=6;i++){const a=-Math.PI/2+i/6*Math.PI/2;pts.push(new THREE.Vector2(r-c+Math.cos(a)*c,-h+c+Math.sin(a)*c))}
  for(let i=0;i<=6;i++){const a=i/6*Math.PI/2;pts.push(new THREE.Vector2(r-c+Math.cos(a)*c,h-c+Math.sin(a)*c))}pts.push(new THREE.Vector2(0,h));
  return geoCache.head=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p.x,p.y)),32)}
function makeR(o={}){
  const c={skin:'#f5cd30',shirt:'#e53935',pants:'#1f1f24',arms:null,hair:'messy',hairColor:'#3b2414',face:'smile',seed:1,name:null,shirtText:null,suit:false,tie:'#c62828',...o};
  const root=new THREE.Group();const skinM=PL(c.skin,{r:.42}),shirtM=PL(c.shirt,{r:.45}),pantsM=PL(c.pants,{r:.45}),armM=PL(c.arms||c.shirt,{r:.45});
  const mkLeg=x=>{const g=new THREE.Group();g.position.set(x,1,0);const m=mesh(rbox(0.49,1.0,0.5),pantsM);m.position.y=-0.5;g.add(m);root.add(g);return g};
  const legL=mkLeg(-0.25),legR=mkLeg(0.25);
  const upper=new THREE.Group();upper.position.y=1;root.add(upper);
  let front=shirtM;if(c.shirtText||c.suit){front=PL('#ffffff',{r:.45,x:{map:ctex(128,128,g=>{g.fillStyle=c.shirt;g.fillRect(0,0,128,128);
    if(c.suit){g.fillStyle='#fff';g.beginPath();g.moveTo(40,0);g.lineTo(88,0);g.lineTo(64,64);g.fill();g.fillStyle=c.tie;g.beginPath();g.moveTo(58,4);g.lineTo(70,4);g.lineTo(74,66);g.lineTo(64,80);g.lineTo(54,66);g.fill()}
    if(c.shirtText){g.fillStyle=c.shirtTextColor||'#fff';g.font='900 50px P';g.textAlign='center';g.textBaseline='middle';g.fillText(c.shirtText,64,64)}})}})}
  const torso=mesh(rbox(1.0,1.0,0.5),[shirtM,shirtM,shirtM,shirtM,front,shirtM]);torso.position.y=0.5;upper.add(torso);
  const mkArm=x=>{const g=new THREE.Group();g.position.set(x,0.95,0);const m=mesh(rbox(0.49,1.0,0.5),armM);m.position.y=-0.45;g.add(m);upper.add(g);return g};
  const armL=mkArm(-0.75),armR=mkArm(0.75);
  const head=new THREE.Group();head.position.y=1.0;upper.add(head);
  const headMesh=mesh(headGeo(),skinM);headMesh.position.y=0.33;head.add(headMesh);
  const faceMat=new THREE.MeshStandardMaterial({map:faceTex(c.face),transparent:true,roughness:.5,polygonOffset:true,polygonOffsetFactor:-2});
  const decal=new THREE.Mesh(new THREE.CylinderGeometry(0.313,0.313,0.44,24,1,true,-0.95,1.9),faceMat);decal.position.y=0.33;head.add(decal);
  const hm=PL(c.hairColor,{r:.6});const R=rng(c.seed*31+7);
  const hb=(geo,x,y,z,rx=0,ry=0,rz=0,m=hm)=>{const b=mesh(geo,m);b.position.set(x,y,z);b.rotation.set(rx,ry,rz);head.add(b);return b};
  if(c.hair==='messy'||c.hair==='spiky'){hb(new THREE.SphereGeometry(0.335,20,12,0,Math.PI*2,0,Math.PI*0.52),0,0.42,-0.02);
    for(let i=0;i<(c.hair==='spiky'?12:9);i++){const s=0.13+R()*0.1;hb(rbox(s,s*1.4,s,0.03),(R()-.5)*0.5,0.66+R()*0.08,(R()-.5)*0.45,R()-.5,R()*2,R()-.5)}
    for(let i=0;i<4;i++)hb(rbox(0.16,0.2,0.12,0.03),-0.21+i*0.14,0.6,0.27,0.5,0,(i-1.5)*0.2)}
  if(c.hair==='long'){hb(new THREE.SphereGeometry(0.34,20,12,0,Math.PI*2,0,Math.PI*0.55),0,0.42,-0.02);hb(rbox(0.66,0.62,0.18,0.05),0,0.2,-0.26)}
  if(c.hair==='cap'){const cm=PL(c.capColor||'#e53935',{r:.5});hb(new THREE.SphereGeometry(0.335,20,12,0,Math.PI*2,0,Math.PI*0.5),0,0.45,0,0,0,0,cm);hb(rbox(0.5,0.05,0.34,0.02),0,0.47,0.36,0.12,0,0,cm)}
  if(c.hair==='beanie'){const cm=PL(c.capColor||'#3949ab',{r:.8});hb(new THREE.SphereGeometry(0.34,20,12,0,Math.PI*2,0,Math.PI*0.55),0,0.42,0,0,0,0,cm);hb(new THREE.CylinderGeometry(0.345,0.345,0.1,24),0,0.5,0,0,0,0,PL('#ffffff'))}
  if(c.band){hb(new THREE.CylinderGeometry(0.322,0.322,0.09,28),0,0.55,0,0,0,0,PL(c.band))}
  let tag=null;if(c.name){tag=makeTag(c.name);tag.position.y=1.0;head.add(tag)}
  root.userData={legL,legR,upper,armL,armR,head,headMesh,faceMat,decal,tag,c};
  return root;
}
function setFace(ch,e){const u=ch.userData;if(u.face===e)return;u.face=e;u.faceMat.map=faceTex(e);u.faceMat.needsUpdate=true}
function pose(ch){const u=ch.userData;[u.legL,u.legR,u.armL,u.armR,u.head,u.upper].forEach(o=>o.rotation.set(0,0,0));u.upper.position.set(0,1,0);return u}
function walk(ch,t,spd=9,amp=0.7){const u=ch.userData,s=Math.sin(t*spd)*amp;u.legL.rotation.x=s;u.legR.rotation.x=-s;u.armL.rotation.x=-s;u.armR.rotation.x=s}
function jumpPose(ch,k=1){const u=ch.userData;u.armL.rotation.x=u.armR.rotation.x=-2.9*k;u.armL.rotation.z=-0.15*k;u.armR.rotation.z=0.15*k;u.legL.rotation.x=0.35*k;u.legR.rotation.x=-0.15*k}
function sit(ch){const u=ch.userData;u.legL.rotation.x=u.legR.rotation.x=-Math.PI/2}
function goldify(ch,amt){const u=ch.userData;
  if(!u.gold){u.gold=PL('#ffc93c',{r:.22,m:1,x:{emissive:new THREE.Color('#ff9d00'),emissiveIntensity:0,envMap:envTex,envMapIntensity:1.1}});u.orig=[];ch.traverse(o=>{if(o.isMesh&&o!==u.decal)u.orig.push(o)})}
  if(amt>0&&!u.isGold){u.isGold=true;u.orig.forEach(o=>o.material=u.gold);setTagGold(ch)}
  u.gold.emissiveIntensity=amt*0.15}

// ---------- world
function skyTex(stops){return ctex(8,512,(g)=>{const gr=g.createLinearGradient(0,0,0,512);stops.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,8,512)})}
const SKY=[[0,'#3c8fe0'],[0.55,'#7fc0f4'],[1,'#d6ecfb']];
function lights(o={}){const hemi=new THREE.HemisphereLight('#d8ecff','#8a8a7a',o.hemi??1.5);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff4e0',o.sun??2.4);sun.position.set(...(o.sunPos||[18,30,14]));sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const s=o.size||22;Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:1,far:120});sun.shadow.normalBias=0.03;sun.shadow.bias=-0.0004;
  const tg=o.target||[0,0,0];sun.target.position.set(...tg);sun.position.set(tg[0]+18,tg[1]+30,tg[2]+14);scene.add(sun,sun.target);return {hemi,sun}}
function baseplate(){const g=new THREE.Mesh(new THREE.PlaneGeometry(240,240),PL('#a3a2a5',{r:.6,x:{map:studTex(480,480)}}));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  const road=part(240,0.06,7,'#5a5b60',{});road.position.set(0,0.03,9);road.castShadow=false;scene.add(road);
  const dm=PL('#ffffff');for(let x=-60;x<60;x+=4){const d=new THREE.Mesh(new THREE.PlaneGeometry(2,0.2),dm);d.rotation.x=-Math.PI/2;d.position.set(x,0.07,9);scene.add(d)}}
function rtree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);const tr=mesh(new THREE.CylinderGeometry(0.3,0.35,2,10),PL('#8b5a2b'));tr.position.y=1;g.add(tr);
  const lm=PL('#4caf50',{r:.6});const a=mesh(new THREE.SphereGeometry(1.4,14,10),lm);a.position.y=2.9;g.add(a);const b=mesh(new THREE.SphereGeometry(0.9,12,8),lm);b.position.set(0.7,3.6,0.2);g.add(b);scene.add(g);return g}
function cloud(x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);const m=new THREE.MeshStandardMaterial({color:'#fff',roughness:1,emissive:'#ffffff',emissiveIntensity:.45});
  [[0,0,0,4,1.2,2.4],[2.2,0.5,0.3,3,1,2],[-2.4,0.3,-0.2,3,1,2]].forEach(([a,b,c,w,h,d])=>{const m2=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);m2.position.set(a,b,c);g.add(m2)});scene.add(g);return g}
function rbuilding(x,z,w,h,d,color,o={}){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=o.rot||0;const b=part(w,h,d,color,{studs:true});b.position.y=h/2;g.add(b);
  const gl=PL('#9fd7ff',{r:.15,m:.1,x:{emissive:new THREE.Color('#2a5e8a'),emissiveIntensity:o.lit??0.15}});
  for(let y=1.8;y<h-0.8;y+=2.2)for(let xx=-w/2+1.1;xx<w/2-0.6;xx+=1.6){const wdw=mesh(new THREE.BoxGeometry(1.0,1.2,0.08),gl,false);wdw.position.set(xx,y,d/2+0.03);g.add(wdw)}
  const door=part(1.4,2.2,0.1,'#6d4c41');door.position.set(0,1.1,d/2+0.05);g.add(door);scene.add(g);return g}
const MOVERS=[];
function signTex(txt,bg,fg='#fff'){return ctex(512,128,g=>{g.fillStyle=bg;g.fillRect(0,0,512,128);g.fillStyle=fg;g.font='900 76px P';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,256,70)})}
function glassMat(){return PL('#9fd7ff',{r:.15,m:.1,x:{emissive:new THREE.Color('#2a5e8a'),emissiveIntensity:0.15}})}
function windowsOn(g,w,h,d,y0=1.8,step=2.2,mat=glassMat()){for(let y=y0;y<h-0.8;y+=step)for(let xx=-w/2+1.1;xx<w/2-0.6;xx+=1.6){const wdw=mesh(new THREE.BoxGeometry(1.0,1.2,0.08),mat,false);wdw.position.set(xx,y,d/2+0.03);g.add(wdw)}}
function placeAt(g,x,z,rot){g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);return g}
function shop(x,z,rot,name,col,awn){const g=new THREE.Group();const w=7,h=5,d=6;const b=part(w,h,d,col,{studs:true});b.position.y=h/2;g.add(b);
  const win=mesh(new THREE.BoxGeometry(4.6,2.2,0.08),glassMat(),false);win.position.set(-0.6,1.6,d/2+0.04);g.add(win);
  const door=part(1.3,2.4,0.1,'#5d4037');door.position.set(2.5,1.2,d/2+0.05);g.add(door);
  const sg=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.4),new THREE.MeshStandardMaterial({map:signTex(name,'#ffffff','#222'),roughness:.6}));sg.position.set(0,4.1,d/2+0.06);g.add(sg);
  const at=ctex(64,8,gg=>{for(let i=0;i<8;i++){gg.fillStyle=i%2?'#ffffff':awn;gg.fillRect(i*8,0,8,8)}});at.wrapS=THREE.RepeatWrapping;at.repeat.set(2,1);
  const aw=mesh(new THREE.BoxGeometry(w-0.4,0.12,1.4),new THREE.MeshStandardMaterial({map:at,roughness:.7}));aw.position.set(0,3.05,d/2+0.7);aw.rotation.x=0.25;g.add(aw);
  return placeAt(g,x,z,rot)}
function house(x,z,rot,col,roof){const g=new THREE.Group();const w=6,h=4,d=6;const b=part(w,h,d,col);b.position.y=h/2;g.add(b);
  const rm=PL(roof,{r:.6});[-1,1].forEach(s=>{const r=mesh(new THREE.BoxGeometry(w+0.6,0.3,d/2/Math.cos(0.6)+0.5),rm);r.position.set(0,h+0.95,s*d/4);r.rotation.x=s*0.6;g.add(r)});
  const tri=new THREE.Shape([new THREE.Vector2(-d/2,0),new THREE.Vector2(d/2,0),new THREE.Vector2(0,2.0)]);const tg=new THREE.ShapeGeometry(tri);
  [w/2+0.01,-w/2-0.01].forEach(xx=>{const m=new THREE.Mesh(tg,PL(col));m.position.set(xx,h,0);m.rotation.y=xx>0?Math.PI/2:-Math.PI/2;g.add(m)});
  // gable runs along z: rotate so roof slopes face front/back
  const door=part(1.2,2.2,0.1,'#6d4c41');door.position.set(-1.4,1.1,d/2+0.05);g.add(door);
  [1.3].forEach(xx=>{const wdw=mesh(new THREE.BoxGeometry(1.6,1.3,0.08),glassMat(),false);wdw.position.set(xx,2.1,d/2+0.03);g.add(wdw)});
  const fm=PL('#ffffff');for(let i=-3;i<=3;i++){const p=mesh(rbox(0.16,0.9,0.16,0.03),fm);p.position.set(i,0.45,d/2+2.2);g.add(p)}const rail=mesh(new THREE.BoxGeometry(6.2,0.12,0.1),fm);rail.position.set(0,0.75,d/2+2.2);g.add(rail);
  const lawn=part(w+1,0.08,4,'#5cb85c');lawn.position.set(0,0.04,d/2+1.4);lawn.castShadow=false;g.add(lawn);
  return placeAt(g,x,z,rot)}
function apartment(x,z,rot,col,h){const g=new THREE.Group();const w=8,d=7;const b=part(w,h,d,col,{studs:true});b.position.y=h/2;g.add(b);windowsOn(g,w,h,d);
  for(let y=4;y<h-1;y+=4.4){const bal=part(w-1,0.2,1,'#eeeeee');bal.position.set(0,y-0.6,d/2+0.5);g.add(bal)}
  const door=part(1.6,2.4,0.1,'#455a64');door.position.set(0,1.2,d/2+0.05);g.add(door);const rf=part(w+0.3,0.4,d+0.3,'#78909c');rf.position.y=h+0.2;g.add(rf);return placeAt(g,x,z,rot)}
function lamp(x,z){const g=new THREE.Group();const p=mesh(new THREE.CylinderGeometry(0.08,0.1,4,8),PL('#37474f'));p.position.y=2;g.add(p);const arm=mesh(new THREE.BoxGeometry(0.1,0.1,1),PL('#37474f'));arm.position.set(0,3.95,0.45);g.add(arm);
  const bulb=mesh(new THREE.BoxGeometry(0.4,0.15,0.4),PL('#fffde7',{x:{emissive:new THREE.Color('#fff3c0'),emissiveIntensity:0.4}}),false);bulb.position.set(0,3.85,0.9);g.add(bulb);g.position.set(x,0,z);scene.add(g);return g}
function car(x,z,rot,col){const g=new THREE.Group();const b=mesh(rbox(1.9,0.75,4,0.15),PL(col,{r:.3,m:.2}));b.position.y=0.75;g.add(b);
  const cab=mesh(rbox(1.7,0.7,2.1,0.12),PL('#263238',{r:.1,m:.3}));cab.position.set(0,1.45,-0.2);g.add(cab);const top=mesh(rbox(1.72,0.12,1.9,0.05),PL(col,{r:.3}));top.position.set(0,1.82,-0.2);g.add(top);
  const wm=PL('#111',{r:.8});[[-0.95,1.25],[0.95,1.25],[-0.95,-1.25],[0.95,-1.25]].forEach(([a,c])=>{const w=mesh(new THREE.CylinderGeometry(0.38,0.38,0.3,16),wm);w.rotation.z=Math.PI/2;w.position.set(a,0.38,c);g.add(w)});
  const hl=PL('#fffde7',{x:{emissive:new THREE.Color('#fff8d0'),emissiveIntensity:0.5}});[-0.6,0.6].forEach(a=>{const h=mesh(new THREE.BoxGeometry(0.4,0.2,0.05),hl,false);h.position.set(a,0.85,2.01);g.add(h)});
  return placeAt(g,x,z,rot)}
function trafficLight(x,z,rot){const g=new THREE.Group();const p=mesh(new THREE.CylinderGeometry(0.1,0.1,3.4,8),PL('#37474f'));p.position.y=1.7;g.add(p);const bx=part(0.5,1.3,0.4,'#212121');bx.position.set(0,3.6,0);g.add(bx);
  [['#ff3b30',4.0],['#ffcc00',3.6],['#34c759',3.2]].forEach(([c,y],i)=>{const l=mesh(new THREE.CircleGeometry(0.13,12),new THREE.MeshBasicMaterial({color:i===2?c:'#333',toneMapped:false}),false);l.position.set(0,y,0.21);g.add(l)});return placeAt(g,x,z,rot)}
function bench(x,z,rot){const g=new THREE.Group();const s=part(2,0.15,0.6,'#8d6e63');s.position.y=0.55;g.add(s);const b=part(2,0.6,0.12,'#8d6e63');b.position.set(0,0.95,-0.28);g.add(b);[-0.8,0.8].forEach(a=>{const l=part(0.12,0.55,0.5,'#424242');l.position.set(a,0.27,0);g.add(l)});return placeAt(g,x,z,rot)}
function planter(x,z){const p=part(1.6,0.6,1.6,'#8d6e63',{});p.position.set(x,0.3,z);scene.add(p);const f=mesh(new THREE.SphereGeometry(0.75,10,8),PL('#66bb6a',{r:.7}));f.position.set(x,0.9,z);scene.add(f);
  const cols=['#e91e63','#ffeb3b','#ff5722'];for(let i=0;i<5;i++){const fl=mesh(new THREE.SphereGeometry(0.12,6,4),PL(cols[i%3]));fl.position.set(x+Math.cos(i*1.3)*0.5,1.35,z+Math.sin(i*1.3)*0.5);scene.add(fl)}}
function strip(x0,x1,z0,z1,col,y=0.03,h=0.06,studs=false){const p=part(Math.abs(x1-x0),h,Math.abs(z1-z0),col,{studs});p.position.set((x0+x1)/2,y,(z0+z1)/2);p.castShadow=false;scene.add(p);return p}
function roadX(z,x0,x1){strip(x0,x1,z-3.5,z+3.5,'#4a4b50',0.04,0.08);strip(x0,x1,z-4.6,z-3.5,'#c9c9cc',0.12,0.24,true);strip(x0,x1,z+3.5,z+4.6,'#c9c9cc',0.12,0.24,true);
  const dm=PL('#ffd54a');for(let x=x0+1;x<x1;x+=4){const d=new THREE.Mesh(new THREE.PlaneGeometry(2,0.2),dm);d.rotation.x=-Math.PI/2;d.position.set(x,0.09,z);scene.add(d)}}
function roadZ(x,z0,z1){strip(x-3.5,x+3.5,z0,z1,'#4a4b50',0.045,0.09);strip(x-4.6,x-3.5,z0,z1,'#c9c9cc',0.12,0.24,true);strip(x+3.5,x+4.6,z0,z1,'#c9c9cc',0.12,0.24,true);
  const dm=PL('#ffd54a');for(let z=z0+1;z<z1;z+=4){const d=new THREE.Mesh(new THREE.PlaneGeometry(0.2,2),dm);d.rotation.x=-Math.PI/2;d.position.set(x,0.1,z);scene.add(d)}}
function crosswalk(x,z,alongX){const m=PL('#ffffff');for(let i=-3;i<=3;i++){const s=new THREE.Mesh(new THREE.PlaneGeometry(alongX?0.5:3,alongX?3:0.5),m);s.rotation.x=-Math.PI/2;s.position.set(x+(alongX?i*0.9:0),0.1,z+(alongX?0:i*0.9));scene.add(s)}}
function city(o={}){scene.background=skyTex(SKY);scene.fog=new THREE.Fog('#cfe6f7',70,220);
  const skip=o.skip||(()=>false);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(260,260),PL('#5aa84f',{r:.7,x:{map:studTex(520,520)}}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);
  // plaza
  strip(-11,11,-17,4.4,'#bdbdbd',0.05,0.1,true);
  roadX(9,-80,80);roadX(-24,-22,22);roadZ(-22,-60,9);roadZ(22,-60,9);crosswalk(0,9,true);crosswalk(-22,0,false);crosswalk(22,0,false);
  // plaza shops (west side facing +x, east facing -x)
  const shopsW=[['PIZZA','#e53935','#c62828',-12],['BÄCKEREI','#ffcc80','#8d6e63',-4],['EIS','#f8bbd0','#ec407a',3.5]];
  shopsW.forEach(([n,c,a,z])=>{if(!skip(-14.5,z))shop(-14.5,z,Math.PI/2,n,c,a)});
  const shopsE=[['SUPERMARKT','#a5d6a7','#2e7d32',-12],['KIOSK','#90caf9','#1565c0',-4],['FRISEUR','#ce93d8','#6a1b9a',3.5]];
  shopsE.forEach(([n,c,a,z])=>{if(!skip(14.5,z))shop(14.5,z,-Math.PI/2,n,c,a)});
  // apartments north
  const ac=['#ef9a9a','#90caf9','#fff59d','#a5d6a7','#ffcc80','#b39ddb'];[-17,-8,1,10,19].forEach((x,i)=>{if(!skip(x,-33))apartment(x,-33,0,ac[i%6],12+((i*7)%4)*3)});
  [-17,-6,6,17].forEach((x,i)=>{if(!skip(x,-47))apartment(x,-47,0,ac[(i+2)%6],18+i*2)});
  // houses east & west of side roads
  const hc=[['#fff3e0','#c62828'],['#e3f2fd','#37474f'],['#fce4ec','#6d4c41'],['#f1f8e9','#1565c0'],['#fffde7','#2e7d32']];
  [-40,-28,-16,-4].forEach((z,i)=>{const [c,r]=hc[i%5];if(!skip(-32,z))house(-32,z,Math.PI/2,c,r);const [c2,r2]=hc[(i+2)%5];if(!skip(32,z))house(32,z,-Math.PI/2,c2,r2)});
  [-44,-34,-24,24,34,44].forEach((x,i)=>{const [c,r]=hc[i%5];if(!skip(x,22))house(x,22,Math.PI,c,r)});
  [-12,-2,8].forEach((x,i)=>{if(!skip(x,30))apartment(x,30,Math.PI,ac[(i+3)%6],10+i*3)});
  // street furniture
  for(let x=-56;x<=56;x+=10){if(Math.abs(x)>4)lamp(x,4.9).rotation.y=0}for(let x=-56;x<=56;x+=10){const l=lamp(x,13.1);l.rotation.y=Math.PI}
  for(let z=-50;z<=0;z+=10){lamp(-17.4,z).rotation.y=Math.PI/2;lamp(17.4,z).rotation.y=-Math.PI/2}
  trafficLight(-17.6,4.8,Math.PI/2);trafficLight(17.6,4.8,-Math.PI/2);trafficLight(-26.4,13.2,-Math.PI/2);trafficLight(26.4,13.2,Math.PI/2);
  const cc=['#e53935','#1e88e5','#fdd835','#ffffff','#43a047','#212121','#ff9800'];
  [[-30,6.6,Math.PI/2],[-40,6.6,Math.PI/2],[27,6.6,Math.PI/2],[40,11.4,-Math.PI/2],[-44,11.4,-Math.PI/2],[-19.6,-14,0],[19.6,-30,Math.PI],[24.4,-8,0]].forEach(([x,z,r],i)=>{if(!skip(x,z))car(x,z,r,cc[i%cc.length])});
  if(o.traffic!==false){const a=car(-60,11.4,Math.PI/2,'#1e88e5');MOVERS.push({o:a,x0:-70,x1:70,z:11.4,v:9,dir:1,ph:0});const b=car(60,6.6,-Math.PI/2,'#e53935');MOVERS.push({o:b,x0:70,x1:-70,z:6.6,v:8,dir:-1,ph:3})}
  [[-9,-15],[9,-15],[-9,2.5],[9,2.5]].forEach(([x,z])=>planter(x,z));bench(-7,-15.8,0);bench(7,-15.8,0);
  [[-27,-10],[-27,-22],[27,-16],[27,-34],[-27,-36],[-36,17],[36,17],[-52,17],[-50,0],[50,-6]].forEach(([x,z])=>{if(!skip(x,z))rtree(x,z,1)});
  cloud(-25,44,-70,2.5);cloud(20,50,-80,3);cloud(45,40,-50,2);cloud(-45,46,-40,2.2)}
function updMovers(T){MOVERS.forEach(m=>{const span=Math.abs(m.x1-m.x0);const p=((T*m.v+m.ph*10)%span);m.o.position.x=m.x0+Math.sign(m.x1-m.x0)*p})}

// ---------- tower + elevator + obby
const TW={x:0,z:-6,w:8,h:34};
const PR=6.6,PN=21;
function platPos(k){const a=0.25+k*0.55;return V(TW.x+Math.sin(a)*PR,0.8+k*1.58,TW.z+Math.cos(a)*PR)}
function platTop(k){if(k>=PN){return V(TW.x+1.2,TW.h+0.55,TW.z+1.0)}const p=platPos(k);p.y+=0.25;return p}
function makeCabin(){const g=new THREE.Group();const fm=PL('#cfd8dc',{r:.4});
  const fl=part(2.8,0.2,2.2,'#90a4ae');g.add(fl);const rf=part(2.8,0.2,2.2,'#90a4ae');rf.position.y=3.1;g.add(rf);
  const bk=part(2.8,3.1,0.15,'#b0bec5');bk.position.set(0,1.55,-1.05);g.add(bk);[-1.35,1.35].forEach(x=>{const s=part(0.12,3.1,2.2,'#b0bec5');s.position.set(x,1.55,0);g.add(s)});
  const panel=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.05,1.4),new THREE.MeshBasicMaterial({color:'#fffbe6',toneMapped:false}));panel.position.y=2.98;g.add(panel);
  const light=new THREE.PointLight('#fff6dd',4,6,1.4);light.position.y=2.6;g.add(light);
  const glass=part(2.6,2.9,0.05,'#bfe9ff',{glass:true,opacity:0.18});glass.position.set(0,1.55,1.1);g.add(glass);
  const alarm=new THREE.PointLight('#ff2020',0,6,1.2);alarm.position.set(0,2.5,0.6);g.add(alarm);
  return {g,panel,light,alarm}}
function tower(o={}){
  const T={};const core=part(TW.w,TW.h,TW.w,'#eceff1',{studs:true});core.position.set(TW.x,TW.h/2,TW.z);scene.add(core);
  const bands=['#e53935','#fdd835','#1e88e5','#43a047'];for(let i=1;i<TW.h/4;i++){const b=part(TW.w+0.12,0.35,TW.w+0.12,bands[i%4]);b.position.set(TW.x,i*4,TW.z);b.castShadow=false;scene.add(b)}
  const roof=part(TW.w+1,0.6,TW.w+1,'#fdd835',{studs:true});roof.position.set(TW.x,TW.h+0.3,TW.z);scene.add(roof);
  // banner
  const bt=ctex(1024,256,g=>{g.fillStyle='#e53935';g.fillRect(0,0,1024,256);g.fillStyle='#fff';g.font='900 150px P';g.textAlign='center';g.textBaseline='middle';g.fillText('TURMRENNEN',512,138)});
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(TW.w,2),new THREE.MeshStandardMaterial({map:bt,roughness:.6}));ban.position.set(TW.x,TW.h-2.5,TW.z+TW.w/2+0.02);scene.add(ban);
  // shaft on front
  const sz=TW.z+TW.w/2+1.3;T.shaftZ=sz;
  const shG=new THREE.Group();shG.visible=!o.noShaft;scene.add(shG);const _add=scene.add.bind(scene);const shAdd=(...a)=>shG.add(...a);
  const shaft=part(3.2,TW.h,2.6,'#bfe9ff',{glass:true,opacity:0.16});shaft.position.set(TW.x+2,TW.h/2,sz);shAdd(shaft);
  [[-1.6,-1.3],[1.6,-1.3],[-1.6,1.3],[1.6,1.3]].forEach(([dx,dz])=>{const p=part(0.18,TW.h,0.18,'#78909c');p.position.set(TW.x+2+dx,TW.h/2,sz+dz);shAdd(p)});
  for(let y=4;y<TW.h;y+=4){const r=part(3.4,0.12,2.8,'#78909c');r.position.set(TW.x+2,y,sz);r.castShadow=false;shAdd(r)}
  const cab=makeCabin();cab.g.position.set(TW.x+2,0.1,sz);scene.add(cab.g);T.cab=cab;
  const sign=ctex(512,128,g=>{g.fillStyle='#263238';g.fillRect(0,0,512,128);g.fillStyle='#fff';g.font='900 72px P';g.textAlign='center';g.textBaseline='middle';g.fillText('AUFZUG ▲',256,68)});
  const sm=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.65),new THREE.MeshStandardMaterial({map:sign}));sm.position.set(TW.x+2,3.9,sz+1.32);scene.add(sm);
  // obby
  const cols=['#e53935','#1e88e5','#fdd835','#43a047','#ff9800','#ab47bc'];T.plats=[];
  for(let k=0;k<PN;k++){const p=platPos(k);const neon=k%4===3;const m=part(2.2,0.5,2.2,neon?'#ff2d95':cols[k%cols.length],{studs:true,neon,ei:0.8});m.position.copy(p);scene.add(m);T.plats.push(m)}
  const os=ctex(512,160,g=>{g.fillStyle='#43a047';g.fillRect(0,0,512,160);g.fillStyle='#fff';g.font='900 80px P';g.textAlign='center';g.textBaseline='middle';g.fillText('OBBY ▲',256,86)});
  const p0=platPos(0);const osm=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.75),new THREE.MeshStandardMaterial({map:os}));osm.position.set(p0.x+1.6,1.3,p0.z+1.2);osm.rotation.y=0.6;scene.add(osm);
  const post=part(0.15,1.2,0.15,'#555');post.position.set(p0.x+1.6,0.6,p0.z+1.15);scene.add(post);
  // trophy on top
  if(o.trophy!==false){T.trophy=makeTrophy();T.trophy.position.set(TW.x-1.6,TW.h+0.6,TW.z-1);scene.add(T.trophy)}
  return T;
}
function makeTrophy(){const g=new THREE.Group();const m=PL('#ffcc33',{r:.2,m:1,x:{envMap:envTex,envMapIntensity:1.3,emissive:new THREE.Color('#ff9d00'),emissiveIntensity:.2}});
  const base=mesh(new THREE.BoxGeometry(1.0,0.4,1.0),PL('#5d4037'));base.position.y=0.2;g.add(base);
  const st=mesh(new THREE.CylinderGeometry(0.12,0.2,0.6,12),m);st.position.y=0.7;g.add(st);
  const cup=mesh(new THREE.CylinderGeometry(0.55,0.25,0.9,20,1,true),m);cup.position.y=1.45;g.add(cup);cup.material.side=THREE.DoubleSide;
  [-1,1].forEach(s=>{const h=mesh(new THREE.TorusGeometry(0.25,0.06,8,16,Math.PI),m);h.position.set(s*0.58,1.5,0);h.rotation.z=s*-Math.PI/2;g.add(h)});return g}

// ---------- fx
function makeRays(){const t=ctex(512,512,(g)=>{const c=256;for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.beginPath();g.moveTo(c,c);g.arc(c,c,256,a,a+Math.PI/24);g.closePath();
    const gr=g.createRadialGradient(c,c,10,c,c,256);gr.addColorStop(0,'rgba(255,215,110,.6)');gr.addColorStop(1,'rgba(255,170,0,0)');g.fillStyle=gr;g.fill()}});
  return new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshBasicMaterial({map:t,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}))}
const sparkT=ctex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,230,1)');gr.addColorStop(.25,'rgba(255,210,80,.9)');gr.addColorStop(1,'rgba(255,170,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);g.fillStyle='rgba(255,255,240,.9)';g.fillRect(30,2,4,60);g.fillRect(2,30,60,4)});
function makeSparks(n=120,seed=3){const R=rng(seed);const pos=new Float32Array(n*3);const data=[];for(let i=0;i<n;i++)data.push({a:R()*6.28,r:0.8+R()*2.6,s:0.4+R()*1.2,ph:R()});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({map:sparkT,size:0.35,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));p.userData={data};p.frustumCulled=false;return p}
function updSparks(p,t,cx,cy,cz){const a=p.geometry.attributes.position.array;p.userData.data.forEach((d,i)=>{const k=(t*0.25*d.s+d.ph)%1;const ang=d.a+t*d.s*0.8;a[i*3]=cx+Math.cos(ang)*d.r*(0.6+k*0.6);a[i*3+1]=cy+k*5-0.5;a[i*3+2]=cz+Math.sin(ang)*d.r*(0.6+k*0.6)});p.geometry.attributes.position.needsUpdate=true}
function makeConfetti(n=220,seed=9){const R=rng(seed);const g=new THREE.Group();const cols=['#e53935','#1e88e5','#fdd835','#43a047','#ff9800','#ab47bc','#ffffff'];
  for(let i=0;i<n;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.09),new THREE.MeshBasicMaterial({color:cols[i%cols.length],side:THREE.DoubleSide,toneMapped:false}));m.userData={x:(R()-.5)*14,z:(R()-.5)*10,y0:6+R()*8,v:0.9+R()*1.2,ph:R()*6,sp:2+R()*5};g.add(m)}return g}
function updConfetti(g,t,cx,cy,cz){g.children.forEach(m=>{const d=m.userData;const y=d.y0-t*d.v*1.6;m.position.set(cx+d.x+Math.sin(t*1.5+d.ph)*0.6,cy+((y%14)+14)%14-2,cz+d.z);m.rotation.set(t*d.sp,t*d.sp*0.7,d.ph)})}
const dropT=ctex(64,64,g=>{g.fillStyle='#8fd8ff';g.beginPath();g.moveTo(32,4);g.quadraticCurveTo(56,40,32,60);g.quadraticCurveTo(8,40,32,4);g.fill();g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(26,40,5,8,0,0,7);g.fill()});
function makeDrops(n=12){const arr=[];for(let i=0;i<n;i++){const d=new THREE.Sprite(new THREE.SpriteMaterial({map:dropT,transparent:true,toneMapped:false,depthWrite:false}));d.scale.set(0.16,0.2,1);scene.add(d);arr.push(d)}return arr}
function updDrops(drops,t,times,hp){drops.forEach((d,i)=>{const hi=Math.floor(i/2);const ht=times[Math.min(hi,times.length-1)];const lt=t-ht;d.visible=lt>0&&lt<0.7;if(!d.visible)return;const s=i%2?1:-1;d.position.set(hp.x+s*(0.4+lt*1.1),hp.y+0.3+lt*1.5-lt*lt*6,hp.z+0.15)})}

// ---------- camera
function shot(pos,look,roll=0,fov=50,shake=0.02,t=0){camera.fov=fov;camera.updateProjectionMatrix();const n=(f,p)=>Math.sin(t*f+p)*shake;
  camera.position.set(pos.x+n(1.3,0),pos.y+n(1.7,1),pos.z+n(1.1,2));camera.up.set(0,1,0);camera.lookAt(look.x+n(0.9,3),look.y+n(1.2,4),look.z);camera.rotateZ(roll+n(0.7,5)*0.3)}

// ---------- HUD
let hudChat=null,hudLb=null;
function chat(lines,t){const vis=lines.filter(l=>t>=l[0]).slice(-5);const key=vis.map(l=>l[1]+l[2]).join('|');if(!vis.length){chatEl.style.display='none';hudChat=null;return}
  chatEl.style.display='block';if(key!==hudChat){hudChat=key;chatEl.innerHTML=vis.map(l=>`<div><b style="color:${l[3]||'#8fd3ff'}">[${l[1]}]:</b> ${l[2]}</div>`).join('')}}
function leaderboard(rows,meName){if(!rows){lbEl.style.display='none';hudLb=null;return}lbEl.style.display='block';const key=JSON.stringify(rows);if(key===hudLb)return;hudLb=key;
  lbEl.innerHTML=`<div class="h"><span>Spieler</span><span>Stufen</span></div>`+rows.map(r=>`<div class="r ${r[0]===meName?'me':''}"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('')}
const wordT=(sc,w)=>{const x=sc.words.find(x=>x[0].toLowerCase().startsWith(w.toLowerCase()));return x?x[1]:0};

// ---------- bike video additions
const K=Math.tan(0.26),RX0=60,RX1=124,PLY=(RX1-RX0)*K;
const rampTop=x=>x<RX0?0.12:x>RX1?PLY+0.21:(x-RX0)*K+0.21;
function hill(){
  const len=(RX1-RX0)/Math.cos(0.26);const ramp=part(len,0.4,7,'#4a4b50');ramp.position.set((RX0+RX1)/2,PLY/2,9);ramp.rotation.z=0.26;scene.add(ramp);
  const dm=PL('#ffd54a');for(let x=RX0+2;x<RX1;x+=4){const d=new THREE.Mesh(new THREE.PlaneGeometry(2,0.2),dm);d.rotation.x=-Math.PI/2;d.rotation.y=0;d.position.set(x,rampTop(x)+0.01,9);d.rotation.set(-Math.PI/2,0.26,0);scene.add(d)}
  for(let x=RX0;x<RX1;x+=4){const h=rampTop(x)-0.25;if(h<0.2)continue;const b=part(4,h,22,'#5aa84f',{studs:true});b.position.set(x+2,h/2,9);b.castShadow=false;scene.add(b)}
  const pl=part(34,PLY,26,'#5aa84f',{studs:true});pl.position.set(RX1+17,PLY/2,9);scene.add(pl);
  const top=part(34,0.1,7,'#4a4b50');top.position.set(RX1+17,PLY+0.05,9);scene.add(top);
  // finish arch
  const fx=RX1+10;[-4.2,4.2].forEach(dz=>{const p=part(0.6,6,0.6,'#ffffff');p.position.set(fx,PLY+3,9+dz);scene.add(p)});
  const bt=ctex(1024,256,g=>{for(let i=0;i<32;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*32,j*32,32,32)}g.fillStyle='#e53935';g.fillRect(0,64,1024,192);g.fillStyle='#fff';g.font='900 140px P';g.textAlign='center';g.textBaseline='middle';g.fillText('ZIEL',512,165)});
  const ban=new THREE.Mesh(new THREE.BoxGeometry(0.3,2.2,9),[PL('#fff',{x:{map:bt}}),PL('#fff',{x:{map:bt}}),PL('#e53935'),PL('#e53935'),PL('#e53935'),PL('#e53935')]);ban.position.set(fx,PLY+6.2,9);scene.add(ban);
  const line=ctex(64,512,g=>{for(let i=0;i<2;i++)for(let j=0;j<16;j++){g.fillStyle=(i+j)%2?'#111':'#fff';g.fillRect(i*32,j*32,32,32)}});const fl=new THREE.Mesh(new THREE.PlaneGeometry(1,7),new THREE.MeshStandardMaterial({map:line}));fl.rotation.x=-Math.PI/2;fl.position.set(fx,PLY+0.11,9);scene.add(fl);
  const tr=makeTrophy();tr.position.set(fx+5,PLY+0.1,13);scene.add(tr);
  [[RX1+4,15],[RX1+20,3],[RX1+26,16],[RX0+20,18],[RX0+36,1],[RX0+44,17]].forEach(([x,z])=>{const t=rtree(x,z,1);t.position.y=rampTop(x)<0.3?0:Math.max(0,rampTop(x)-0.5)});
  return {fx,tr}}
function world(o={}){city(o);return hill()}
function makeBike(col='#e53935'){const g=new THREE.Group();const fm=PL(col,{r:.35,m:.2});const dk=PL('#222',{r:.6});
  const wheel=z=>{const w=new THREE.Group();w.position.set(0,0.45,z);const tire=mesh(new THREE.TorusGeometry(0.42,0.07,8,24),dk);tire.rotation.y=Math.PI/2;w.add(tire);
    for(let i=0;i<6;i++){const s=mesh(new THREE.BoxGeometry(0.02,0.8,0.02),PL('#bbb'),false);s.rotation.x=i*Math.PI/6;w.add(s)}g.add(w);return w};
  const wf=wheel(0.85),wb=wheel(-0.85);
  const bar=(len,x,y,z,rx)=>{const b=mesh(new THREE.BoxGeometry(0.09,0.09,len),fm);b.position.set(x,y,z);b.rotation.x=rx;g.add(b);return b};
  bar(1.2,0,0.85,0,0.15);bar(0.9,0,0.62,-0.42,-0.75);bar(0.9,0,0.62,0.4,0.6);bar(0.8,0,0.75,0.8,-0.35).rotation.x=0.35;
  const post=mesh(new THREE.BoxGeometry(0.08,0.55,0.08),fm);post.position.set(0,1.0,-0.48);g.add(post);const seat=mesh(rbox(0.3,0.1,0.5,0.04),dk);seat.position.set(0,1.27,-0.5);g.add(seat);
  const stem=mesh(new THREE.BoxGeometry(0.08,0.6,0.08),fm);stem.position.set(0,1.15,0.72);g.add(stem);const hb=mesh(new THREE.BoxGeometry(0.9,0.07,0.07),dk);hb.position.set(0,1.45,0.72);g.add(hb);
  const crank=new THREE.Group();crank.position.set(0,0.45,0);g.add(crank);[-1,1].forEach(s=>{const a=mesh(new THREE.BoxGeometry(0.05,0.32,0.05),PL('#999'),false);a.position.set(s*0.14,s*0.16,0);crank.add(a);const p=mesh(new THREE.BoxGeometry(0.22,0.05,0.12),dk,false);p.position.set(s*0.22,s*0.32,0);crank.add(p)});
  g.userData={wf,wb,crank};return g}
function makeRider(o={},bcol){const rig=new THREE.Group();const pitch=new THREE.Group();rig.add(pitch);const bike=makeBike(bcol);pitch.add(bike);const ch=makeR(o);ch.position.set(0,0.3,-0.45);pitch.add(ch);rig.userData={pitch,bike,ch};return rig}
function ride(rig,x,z,dir,ang,climb=0){const {pitch,bike,ch}=rig.userData;const y=rampTop(x);rig.position.set(x,y,z);rig.rotation.y=dir;pitch.rotation.x=-(x>RX0&&x<RX1?0.26:0)*Math.sign(Math.sin(dir));
  bike.userData.wf.rotation.x=ang*2.2;bike.userData.wb.rotation.x=ang*2.2;bike.userData.crank.rotation.x=ang;
  const u=pose(ch);u.upper.rotation.x=0.35+climb*0.15;u.armL.rotation.x=u.armR.rotation.x=-1.25;u.armL.rotation.z=-0.1;u.armR.rotation.z=0.1;u.head.rotation.x=-0.3;
  u.legL.rotation.x=-1.0+Math.sin(ang)*0.45;u.legR.rotation.x=-1.0-Math.sin(ang)*0.45}
function weather(kind,n=900,seed=4){const R=rng(seed);const pos=new Float32Array(n*3);for(let i=0;i<n*3;i++)pos[i]=R();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos.slice(),3));
  const p=new THREE.Points(g,new THREE.PointsMaterial({color:kind==='snow'?'#ffffff':'#bfe3ff',size:kind==='snow'?0.16:0.07,transparent:true,opacity:kind==='snow'?0.95:0.7,depthWrite:false}));p.frustumCulled=false;p.userData={base:pos,kind};scene.add(p);return p}
function updWeather(p,t,c){const a=p.geometry.attributes.position.array,b=p.userData.base;const sp=p.userData.kind==='snow'?1.5:18;const sz=26;
  for(let i=0;i<a.length/3;i++){a[i*3]=c.x+(b[i*3]-.5)*sz+(p.userData.kind==='snow'?Math.sin(t+i)*0.4:0);a[i*3+1]=c.y+(((b[i*3+1]*sz-t*sp)%sz)+sz)%sz-sz/2;a[i*3+2]=c.z+(b[i*3+2]-.5)*sz}p.geometry.attributes.position.needsUpdate=true}
function jamCars(x0,x1){const cc=['#e53935','#1e88e5','#fdd835','#ffffff','#43a047','#212121','#ff9800','#8e24aa'];const arr=[];let i=0;
  for(let x=x0;x<x1;x+=5.2){[6.6,11.4].forEach((z,j)=>{const c=car(x+(j?2:0),z,j?-Math.PI/2:Math.PI/2,cc[(i++)%cc.length]);c.position.y=rampTop(x);c.rotation.z=j?-0:0;arr.push(c)})}return arr}
function lb(rows,meName,label){if(!rows){leaderboard(null);return}leaderboard(rows,meName);const h=lbEl.querySelector('.h span:last-child');if(h&&label)h.textContent=label}

function crowdAround(n,cx,cz,r0=3.2,face='laugh'){const arr=[];for(let i=0;i<n;i++){const a=-1.2+i/(n-1)*2.4;const r=r0+(i%2)*1.1;const ch=makeR(npc(i,{face}));ch.position.set(cx+Math.sin(a)*r,0,cz+Math.cos(a)*r);ch.rotation.y=Math.atan2(cx-ch.position.x,cz-ch.position.z);add(ch);arr.push(ch)}return arr}
// ---------- scenes
const S={};const MEB={...ME,name:'xX_Radler_Xx'};
S.hook={build(){world();lights({target:[90,10,9],size:18});const rig=makeRider(MEB);add(rig);const drops=makeDrops(18);bloom.strength=0;return {rig,drops}},
 update(c,t,sc){const H=sc.huss;let n=-1;for(let i=0;i<H.length;i++)if(t>=H[i])n=i;const dt=n>=0?t-H[n]:9;const pulse=Math.exp(-dt*8);
  const x=86+Math.max(0,n)*1.4+(n>=0?easeOut(dt/0.3)*1.4:0)+t*0.25;const ang=x*1.6;ride(c.rig,x,10.2,Math.PI/2,ang,1);const ch=c.rig.userData.ch;
  ch.userData.upper.rotation.x=0.35+0.25*pulse;ch.userData.upper.rotation.z=Math.sin(ang)*0.12;setFace(ch,n>=0?'strain':'determined');
  c.rig.updateMatrixWorld(true);const hp=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(hp);updDrops(c.drops,t,H,hp);
  const alt=n%2===0;const p=c.rig.position;
  if(alt)shot(V(p.x-2.5,p.y+3.0,p.z+8.5),V(p.x+0.5,p.y+1.3,p.z),-0.06,52-9*pulse,0.01+0.07*pulse,t);
  else shot(V(p.x+5.5,p.y+2.6,p.z+2.2),V(p.x,p.y+1.5,p.z),0.08,50-9*pulse,0.01+0.07*pulse,t)}};
S.rewind={build(){world();lights({target:[60,6,9],size:40});const rig=makeRider(MEB);add(rig);vhsEl.style.display='block';renderer.domElement.style.filter='saturate(0.55) contrast(1.15) hue-rotate(-8deg)';return {rig}},
 update(c,t,sc){const x=lerp(95,-20,ease(t/(sc.dur*0.9)));ride(c.rig,x,10.2,Math.PI/2,x*1.6,0);$('vbar').style.top=(((t*900)%1400)-100)+'px';
  shot(V(lerp(110,10,ease(t/sc.dur)),32,48),V(lerp(95,-10,ease(t/sc.dur)),4,8),0.02*Math.sin(t*40),50,0.1,t*7)}};
S.cars={build(){world({traffic:false});lights({target:[0,0,9],size:22});const R=rng(5);const cc=['#e53935','#1e88e5','#fdd835','#ffffff','#43a047','#212121','#ff9800'];
  for(let i=0;i<8;i++){const lane=i%2;const o=car(0,lane?11.4:6.6,lane?-Math.PI/2:Math.PI/2,cc[i%cc.length]);MOVERS.push({o,x0:lane?60:-60,x1:lane?-60:60,v:7+R()*4,ph:i*1.7})}
  bloom.strength=0;return {}},
 update(c,t){shot(lv(V(-12,4.5,19),V(-9,4,17.5),ease(t/2)),V(6,1,7),-0.04,50,0.015,t)}};
S.bakery={build(){world({traffic:false,skip:(x,z)=>(x===-24&&z===22)||(x===-30&&z===6.6)});lights({target:[-29,0,16],size:16});shop(-24,22,Math.PI,'BÄCKEREI','#ffcc80','#8d6e63');
  const cr=car(-34,11.4,-Math.PI/2,'#43a047');const np=makeR(npc(3,{face:'smile'}));add(np);np.visible=false;return {cr,np}},
 update(c,t,sc){const p=ease(prog(t,0.2,1.7));c.cr.position.x=lerp(-36,-24.5,p);c.cr.rotation.y=Math.PI/2;
  const ex=prog(t,1.8,sc.dur);c.np.visible=t>1.8;if(t>1.8){const u=pose(c.np);c.np.position.set(-24.5,0.25,lerp(12.8,17.5,ex));c.np.rotation.y=0;walk(c.np,t,9,0.6)}
  bubbleAt(c.np,t,[[1.9,9,'5 meter lol']]);const m=wordT(sc,'nebenan');
  shot(lv(V(-31,5.5,1),V(-30,5,2.5),ease(t/sc.dur)),V(-28.5,1.5,15),0.03,50,0.012,t)}};
S.bike={build(sc){world({traffic:false});lights({target:[0,0,7],size:20});const rig=makeRider(MEB);add(rig);c0=null;const rain=weather('rain');const snow=weather('snow',700,7);return {rig,rain,snow}},
 update(c,t,sc){const x=-14+t*4.2;ride(c.rig,x,6.6,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,'determined');
  const r=wordT(sc,'Regen'),s=wordT(sc,'Schnee'),im=wordT(sc,'Immer');const mode=t>=im?'sun':t>=s?'snow':t>=r?'rain':'sun';
  const p=c.rig.position;c.rain.visible=mode==='rain';c.snow.visible=mode==='snow';updWeather(c.rain,t,p);updWeather(c.snow,t,p);
  scene.background=mode==='rain'?new THREE.Color('#6d7b8a'):mode==='snow'?new THREE.Color('#c9d6e3'):skyTex(SKY);
  shot(V(p.x+1.5,p.y+2.6,p.z+7),V(p.x+0.8,p.y+1.3,p.z),-0.03,50,0.015,t)}};
let c0=null;
S.neighbor={build(){world({traffic:false});lights({target:[0,0,9],size:16});const cr=car(2,11.4,-Math.PI/2,'#212121');
  const nb=makeR(npc(4,{name:'Bernd_derNachbar',suit:true,shirt:'#37474f',face:'laugh',hair:'long',hairColor:'#8d4a2b'}));nb.position.set(2.5,0.2,13.5);nb.rotation.y=Math.PI*0.9;add(nb);
  const rig=makeRider(MEB);add(rig);return {cr,nb,rig}},
 update(c,t,sc){const x=-6+t*3.2;ride(c.rig,x,6.6,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,t>1.5?'sad':'determined');
  const u=pose(c.nb);const b=Math.abs(Math.sin(t*9));u.upper.rotation.x=-0.1+b*0.15;u.armR.rotation.x=-1.4;
  const f=wordT(sc,'Fahrräder');bubbleAt(c.nb,t,[[0.1,f,'HUP HUP 😂'.replace(' 😂','')],[f,9,'Fahrräder sind für Babys']]);
  chat([[f,'Bernd_derNachbar','fahrräder sind für babys lol','#ffb74d']],t);
  shot(lv(V(-4,4.6,20),V(-2,4.2,18.5),ease(t/sc.dur)),V(1.5,1.4,9.5),-0.03,50,0.012,t)}};
function startLine(x){const g=new THREE.Group();[-4.2,4.2].forEach(dz=>{const p=part(0.6,6,0.6,'#ffffff');p.position.set(x,3,9+dz);g.add(p)});
  const bt=ctex(1024,256,gg=>{gg.fillStyle='#1e88e5';gg.fillRect(0,0,1024,256);gg.fillStyle='#fff';gg.font='900 120px P';gg.textAlign='center';gg.textBaseline='middle';gg.fillText('STADTRENNEN',512,134)});
  const ban=new THREE.Mesh(new THREE.BoxGeometry(0.3,2,9),[PL('#fff',{x:{map:bt}}),PL('#fff',{x:{map:bt}}),PL('#1e88e5'),PL('#1e88e5'),PL('#1e88e5'),PL('#1e88e5')]);ban.position.set(x,6.1,9);g.add(ban);
  const line=ctex(64,512,gg=>{for(let i=0;i<2;i++)for(let j=0;j<16;j++){gg.fillStyle=(i+j)%2?'#111':'#fff';gg.fillRect(i*32,j*32,32,32)}});const fl=new THREE.Mesh(new THREE.PlaneGeometry(1,7),new THREE.MeshStandardMaterial({map:line}));fl.rotation.x=-Math.PI/2;fl.position.set(x,0.11,9);g.add(fl);scene.add(g);return g}
function grid(){const cc=['#e53935','#fdd835','#43a047','#8e24aa'];const cars=[];[[-6,7.4],[-6,10.6],[-11,7.4],[-11,10.6]].forEach(([x,z],i)=>cars.push(car(x,z,Math.PI/2,cc[i])));const rig=makeRider(MEB);add(rig);ride(rig,-3.5,9,Math.PI/2,0,0);return {cars,rig}}
S.event={build(){world({traffic:false});lights({target:[20,4,9],size:40});startLine(0);const G=grid();bloom.strength=0;return G},
 update(c,t,sc){ride(c.rig,-3.5,9,Math.PI/2,0,0);const b=wordT(sc,'Berg');const k=ease(prog(t,b-0.6,sc.dur));
  lb([['Kevin2012','–'],['LindaGamer','–'],[MEB.name,'–'],['PizzaLord','–']],MEB.name,'Platz');
  shot(lv(V(-14,4,17),V(-30,9,26),k),lv(V(-2,2,9),V(100,12,9),k),0.02,lerp(50,40,k),0.012,t)}};
S.laugh={build(){world({traffic:false});lights({target:[-3,0,9],size:14});startLine(0);grid();const crowd=crowdAround(6,-3.5,9,3.2,'laugh');bloom.strength=0;return {crowd}},
 update(c,t,sc){c.crowd.forEach((p,i)=>{const u=pose(p);const b=Math.abs(Math.sin(t*9+i));u.upper.rotation.x=-0.15+b*0.25;u.upper.position.y=1+b*0.05;if(i%2===0)u.armR.rotation.set(-1.5,0,0);else{u.armL.rotation.z=-0.5-b*0.3;u.armR.rotation.z=0.5+b*0.3}});
  const tM=wordT(sc,'Mit'),tG=wordT(sc,'Gegen'),tN=wordT(sc,'Niemals');bubbleAt(c.crowd[0],t,[[0.2,9,'LOL']]);bubbleAt(c.crowd[2],t,[[tM,9,'mit dem fahrrad?? XD']]);bubbleAt(c.crowd[4],t,[[tG,9,'gegen autos?']]);bubbleAt(c.crowd[5],t,[[tN,9,'niemals']]);
  chat([[0.2,'Kevin2012','LOL'],[tM,'LindaGamer','mit dem fahrrad?? xD','#f48fb1'],[tG,'chillmaxx','gegen autos lol','#a5d6a7'],[tN,'PizzaLord','niemals','#ffcc80']],t);
  lb([['Kevin2012','–'],['LindaGamer','–'],[MEB.name,'–'],['PizzaLord','–']],MEB.name,'Platz');
  const a=lerp(0.6,-0.5,ease(t/sc.dur));shot(V(-3.5+Math.sin(a)*8,3.4,9+Math.cos(a)*8),V(-3.5,1.9,9),0.04,48,0.02,t)}};
S.start={build(){world({traffic:false});lights({target:[10,0,9],size:30});startLine(0);const G=grid();return G},
 update(c,t,sc){const go=wordT(sc,'Los');const r=Math.max(0,t-go-0.15);bigEl.textContent='LOS!';bigEl.style.opacity=String(Math.max(0,1-Math.abs(t-go-0.3)*2.2));bigEl.style.transform=`scale(${1+0.3*Math.exp(-(t-go)*6)})`;
  c.cars.forEach((o,i)=>{o.position.x=[-6,-6,-11,-11][i]+r*r*9});const x=-3.5+r*2.5;ride(c.rig,x,9,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,'determined');
  lb([['Kevin2012',1],['LindaGamer',2],['PizzaLord',3],[MEB.name,4]],MEB.name,'Platz');
  shot(lv(V(-16,3.5,11),V(-14,3.8,10.5),ease(t/sc.dur)),V(10,1.5,9),0.02,50,0.02+0.02*Math.exp(-r*3),t)}};
S.jam={build(){world({traffic:false});lights({target:[40,4,9],size:30});const cars=jamCars(20,78);const ppl=[];
  [[30,13.8],[44,4.4],[58,13.8]].forEach(([x,z],i)=>{const p=makeR(npc(i+5,{face:'shock'}));p.position.set(x,0.25,z);p.rotation.y=z>9?Math.PI:0;add(p);ppl.push(p)});return {cars,ppl}},
 update(c,t,sc){const s=wordT(sc,'Stau');c.cars.forEach((o,i)=>{o.position.y=rampTop(o.position.x)+(t>0.3?Math.abs(Math.sin(t*20+i))*0.03:0)});
  c.ppl.forEach((p,i)=>{const u=pose(p);u.armL.rotation.x=u.armR.rotation.x=-2.6*Math.max(0,Math.sin(t*7+i))});
  bubbleAt(c.ppl[0],t,[[0.5,9,'HUUUP']]);bubbleAt(c.ppl[1],t,[[s,9,'?!?!']]);bubbleAt(c.ppl[2],t,[[s+0.4,9,'beweg dich!!']]);
  chat([[0.5,'Kevin2012','hä wieso stehen alle'],[s,'LindaGamer','STAU 😭'.replace(' 😭',''),'#f48fb1'],[s+0.5,'PizzaLord','HUUUUP','#ffcc80']],t);
  lb([['Kevin2012',1],['LindaGamer',2],['PizzaLord',3],[MEB.name,4]],MEB.name,'Platz');
  shot(lv(V(14,16,26),V(18,13,22),ease(t/sc.dur)),V(48,1,9),0.03,50,0.012,t)}};
S.bypass={build(){world({traffic:false});lights({target:[40,2,9],size:22});const cars=jamCars(20,78);const rig=makeRider(MEB);add(rig);
  const ppl=[];[[34,13.8],[48,4.4]].forEach(([x,z],i)=>{const p=makeR(npc(i+6,{face:'shock'}));p.position.set(x,0.25,z);p.rotation.y=z>9?Math.PI:0;add(p);ppl.push(p)});return {rig,ppl}},
 update(c,t,sc){const x=24+t*7;ride(c.rig,x,9,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,'smug');const p=c.rig.position;
  c.ppl.forEach(q=>{const u=pose(q);q.rotation.y=Math.atan2(p.x-q.position.x,p.z-q.position.z)});bubbleAt(c.ppl[0],t,[[0.6,9,'hä??']]);bubbleAt(c.ppl[1],t,[[1.4,9,'WIE???']]);
  lb([[MEB.name,1],['Kevin2012',2],['LindaGamer',3],['PizzaLord',4]],MEB.name,'Platz');
  shot(V(p.x-6,p.y+3.4,p.z+2.6),V(p.x+3,p.y+1.0,p.z),-0.05,52,0.02,t)}};
S.hill={build(){world({traffic:false});lights({target:[95,10,9],size:34});jamCars(20,64);const rig=makeRider(MEB);add(rig);return {rig}},
 update(c,t,sc){const x=84+t*9;ride(c.rig,x,9,Math.PI/2,x*1.7,1);setFace(c.rig.userData.ch,'strain');const p=c.rig.position;
  lb([[MEB.name,1],['Kevin2012',2],['LindaGamer',3],['PizzaLord',4]],MEB.name,'Platz');
  shot(V(p.x-10,p.y+5,p.z+16),V(p.x+2,p.y+1,p.z),0.02,48,0.012,t)}};
S.top={build(){const H=world({traffic:false});lights({target:[RX1+10,PLY,9],size:12});const rig=makeRider({...MEB,face:'happy'});add(rig);
  const rays=makeRays();scene.add(rays);const sparks=makeSparks();scene.add(sparks);const conf=makeConfetti();scene.add(conf);const gl=new THREE.PointLight('#ffb300',0,14,1.2);scene.add(gl);return {H,rig,rays,sparks,conf,gl}},
 update(c,t,sc){const fx=c.H.fx;const tg=wordT(sc,'Der');const ig=prog(t,tg,tg+0.5);const x=Math.min(fx+3,fx-5+t*6);const ch=c.rig.userData.ch;
  ride(c.rig,x,9,Math.PI/2,x*1.7,0);if(x>=fx+3){const u=ch.userData;u.upper.rotation.x=0;u.armL.rotation.set(-2.8,0,-0.2);u.armR.rotation.set(-2.8,0,0.2)}
  goldify(ch,ig>0?0.6+0.4*Math.sin(t*6):0);if(ig>0&&!c.bg){c.bg=1;c.rig.userData.bike.traverse(o=>{if(o.isMesh)o.material=ch.userData.gold})}
  ch.updateMatrixWorld(true);const hp=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(hp);
  c.rays.position.set(hp.x+2,hp.y-0.3,hp.z-1);c.rays.lookAt(camera.position);c.rays.rotateZ(t*0.35);c.rays.material.opacity=ig*0.7;c.rays.scale.setScalar(0.35+ig*0.2);
  c.sparks.material.opacity=ig;updSparks(c.sparks,t,hp.x,PLY,hp.z);c.conf.visible=x>fx;updConfetti(c.conf,t,hp.x,hp.y,hp.z);c.gl.position.set(hp.x-2,hp.y+1,hp.z+3);c.gl.intensity=ig*8;bloom.strength=ig*0.45;bloom.threshold=1.0;c.H.tr.rotation.y=t*1.5;
  lb([[MEB.name+' ★',1],['Kevin2012',2],['LindaGamer',3],['PizzaLord',4]],MEB.name+' ★','Platz');
  flashEl.style.background='#fff6d0';flashEl.style.opacity=String(Math.max(0,1-Math.abs(t-tg)*6)*0.9);
  const k=ease(prog(t,0,sc.dur));shot(V(fx+lerp(9,7,k),PLY+lerp(2.4,1.4,k),9+lerp(6,4.5,k)),V(Math.min(x,fx+3),PLY+1.6,9),lerp(0.04,-0.06,k),48,0.012,t)}};
S.ending={build(){world({traffic:false});lights({target:[40,4,9],size:30});jamCars(20,64);const ppl=[];
  [[30,13.8],[44,4.4],[38,13.8]].forEach(([x,z],i)=>{const p=makeR(npc(i+5,{face:'sad'}));p.position.set(x,0.25,z);p.rotation.y=z>9?Math.PI:0;add(p);ppl.push(p)});
  const me=makeR({...MEB,face:'happy'});me.position.set(RX1+13,PLY+0.1,9);me.rotation.y=-Math.PI/2;add(me);goldify(me,0.7);const rays=makeRays();scene.add(rays);rays.material.opacity=0.55;bloom.strength=0.3;return {ppl,me,rays}},
 update(c,t,sc){c.ppl.forEach((p,i)=>{const u=pose(p);u.head.rotation.x=0.2});bubbleAt(c.ppl[0],t,[[0.4,9,'wann gehts weiter??']]);bubbleAt(c.ppl[1],t,[[1.1,9,'hab hunger']]);
  chat([[0.3,'Kevin2012','wann gehts weiter??'],[0.9,'LindaGamer','hab hunger','#f48fb1'],[1.6,'PizzaLord','hätte ich nur ein fahrrad','#ffcc80'],[2.3,MEB.name,'gg','#ffd54a']],t);
  const u=pose(c.me);u.armR.rotation.x=-2.7+Math.sin(t*7)*0.3;const hp=new THREE.Vector3();u.headMesh.getWorldPosition(hp);c.rays.position.set(hp.x+1.5,hp.y,hp.z);c.rays.lookAt(camera.position);c.rays.rotateZ(t*0.3);c.rays.scale.setScalar(0.35);
  const k=ease(prog(t,1.2,sc.dur-0.5));shot(lv(V(30,6.5,17.5),V(60,26,40),k),lv(V(42,1,9),V(RX1+12,PLY,9),k),0.03,lerp(48,40,k),0.01,t);
  fadeEl.style.opacity=String(prog(t,sc.dur-0.7,sc.dur-0.05))}};

// ---------- driver
let TL=null,cur=-1,ctx=null;
window.setup=async(tl)=>{TL=tl;await document.fonts.load('900 40px P');await document.fonts.load('800 20px P');await document.fonts.ready;return true};
function resetScene(){MOVERS.length=0;scene=new THREE.Scene();rpass.scene=scene;bloom.strength=0;bloom.threshold=1.0;flashEl.style.opacity='0';fadeEl.style.opacity='0';vhsEl.style.display='none';renderer.domElement.style.filter='';bigEl.style.opacity='0';chatEl.style.display='none';lbEl.style.display='none';hudChat=hudLb=null}
window.renderAt=(T)=>{
  let i=TL.scenes.findIndex(s=>T>=s.start&&T<s.start+s.dur);if(i<0)i=TL.scenes.length-1;
  const sc=TL.scenes[i];const t=T-sc.start;
  if(i!==cur){resetScene();cur=i;ctx=S[sc.name].build(sc)}
  S[sc.name].update(ctx,t,sc);updMovers(T);
  if(window.DBG){camera.up.set(0,1,0);camera.fov=50;camera.updateProjectionMatrix();camera.position.set(...window.DBG[0]);camera.lookAt(...window.DBG[1])}
  composer.render();
  let w=null;for(const x of sc.words){if(t>=x[1]&&t<x[2])w=x}
  if(w){capEl.textContent=w[0]==='HUSS'?'HUSS!':w[0];const k=prog(t,w[1],w[1]+0.12);capEl.style.transform=`scale(${1+(w[0]==='HUSS'?0.45:0.22)*(1-easeOut(k))}) rotate(${w[0]==='HUSS'?(sc.words.indexOf(w)%2?4:-4):0}deg)`;
    capEl.className=w[0]==='HUSS'?'huss':(sc.name==='top'&&t>=wordT(sc,'Der'))?'gold':''}
  else capEl.textContent='';
  return true;
};
window.__ready=true;
