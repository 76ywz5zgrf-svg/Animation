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
  [[RX1+20,3],[RX1+26,16],[RX0+20,18],[RX0+36,1],[RX0+44,17]].forEach(([x,z])=>{const t=rtree(x,z,1);t.position.y=rampTop(x)<0.3?0:Math.max(0,rampTop(x)-0.5)});
  return {fx,tr}}

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
// ================= DOWNTOWN =================
const GAPS=[[-52,-44],[6,14]];
const inGap=(a,b)=>GAPS.some(([g0,g1])=>b>g0&&a<g1);
function facade(x,zFront,face,w,h,type,col,sign,seed){
  const R=rng(seed);const d=type==='tower'?10:8;const g=new THREE.Group();
  const b=part(w,h,d,col,{studs:true});b.position.y=h/2;g.add(b);
  if(type==='tower'){const gm=PL('#7fb8e0',{r:.08,m:.6,x:{envMap:envTex,envMapIntensity:0.7}});
    for(let xx=-w/2+0.6;xx<w/2-0.3;xx+=1.2){const s=mesh(new THREE.BoxGeometry(1.0,h-1.4,0.06),gm,false);s.position.set(xx,h/2+0.5,d/2+0.03);g.add(s)}
    for(let y=3;y<h;y+=3){const s=mesh(new THREE.BoxGeometry(w,0.15,0.1),PL('#cfd8dc'),false);s.position.set(0,y,d/2+0.07);g.add(s)}
    const lob=mesh(new THREE.BoxGeometry(w-1,2.6,0.08),glassMat(),false);lob.position.set(0,1.3,d/2+0.05);g.add(lob)}
  else{const sw=mesh(new THREE.BoxGeometry(w-2.4,2.0,0.08),glassMat(),false);sw.position.set(-0.7,1.4,d/2+0.04);g.add(sw);
    const dr=part(1.2,2.3,0.1,'#4e342e');dr.position.set(w/2-1.1,1.15,d/2+0.05);g.add(dr);
    const wm=glassMat(),sm=PL('#eeeeee');
    for(let y=4.4;y<h-1;y+=2.7)for(let xx=-w/2+1.2;xx<w/2-0.8;xx+=1.8){const wd=mesh(new THREE.BoxGeometry(1.1,1.4,0.08),wm,false);wd.position.set(xx,y,d/2+0.03);g.add(wd);const si=mesh(new THREE.BoxGeometry(1.3,0.12,0.25),sm,false);si.position.set(xx,y-0.8,d/2+0.1);g.add(si)}
    const co=part(w+0.2,0.35,d+0.3,'#eceff1');co.position.y=h+0.15;g.add(co);
    if(sign){const awn=['#e53935','#1e88e5','#43a047','#ff9800','#8e24aa'][Math.floor(R()*5)];
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-0.6,5.4),1.1),new THREE.MeshStandardMaterial({map:signTex(sign,'#ffffff','#222'),roughness:.6}));sg.position.set(0,3.25,d/2+0.06);g.add(sg);
      const at=ctex(64,8,gg=>{for(let i=0;i<8;i++){gg.fillStyle=i%2?'#ffffff':awn;gg.fillRect(i*8,0,8,8)}});at.wrapS=THREE.RepeatWrapping;at.repeat.set(2,1);
      const aw=mesh(new THREE.BoxGeometry(w-0.6,0.12,1.3),new THREE.MeshStandardMaterial({map:at,roughness:.7}),false);aw.position.set(0,2.65,d/2+0.65);aw.rotation.x=0.25;g.add(aw)}}
  if(h>9){if(R()<0.6){const ac=part(1.6,0.9,1.2,'#b0bec5');ac.position.set((R()-.5)*(w-2),h+0.75,(R()-.5)*(d-3));g.add(ac)}
    if(R()<0.3&&type!=='tower'){const wt=mesh(new THREE.CylinderGeometry(0.9,0.9,1.6,14),PL('#8d6e63'));wt.position.set((R()-.5)*(w-3),h+1.9,-1);g.add(wt);const cone=mesh(new THREE.ConeGeometry(1,0.6,14),PL('#6d4c41'));cone.position.set(wt.position.x,h+3,-1);g.add(cone)}}
  g.position.set(x,0,zFront-face*d/2);g.rotation.y=face>0?0:Math.PI;scene.add(g);return g}
function billboard(x,y,z,rot,txt,bg,fg){const g=new THREE.Group();const t=ctex(1024,384,gg=>{gg.fillStyle=bg;gg.fillRect(0,0,1024,384);gg.fillStyle=fg;gg.font='900 120px P';gg.textAlign='center';gg.textBaseline='middle';const L=txt.split('|');L.forEach((l,i)=>gg.fillText(l,512,192+(i-(L.length-1)/2)*130))});
  const p=mesh(new THREE.BoxGeometry(8,3,0.3),[PL('#333'),PL('#333'),PL('#333'),PL('#333'),PL('#fff',{x:{map:t,emissive:new THREE.Color('#fff'),emissiveMap:t,emissiveIntensity:0.25}}),PL('#333')]);p.position.y=2.2;g.add(p);
  [-3,3].forEach(a=>{const l=part(0.25,1.6,0.25,'#555');l.position.set(a,0.8,0);g.add(l)});g.position.set(x,y,z);g.rotation.y=rot;scene.add(g);return g}
function busStop(x,z){const g=new THREE.Group();const r=part(4,0.15,1.6,'#90a4ae');r.position.y=2.6;g.add(r);const back=part(4,2.4,0.08,'#bfe9ff',{glass:true,opacity:0.3});back.position.set(0,1.3,-0.7);g.add(back);
  [-1.9,1.9].forEach(a=>{const p=part(0.12,2.6,0.12,'#546e7a');p.position.set(a,1.3,-0.7);g.add(p)});const s=part(0.6,0.6,0.08,'#fdd835');s.position.set(-2.3,2.4,0.4);g.add(s);g.position.set(x,0,z);scene.add(g);bench(x,z-0.2,0)}
function downtown(o={}){scene.background=skyTex(SKY);scene.fog=new THREE.Fog('#cfe6f7',80,260);MOVERS.length=0;
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(400,400),PL('#5aa84f',{r:.7,x:{map:studTex(800,800)}}));grass.rotation.x=-Math.PI/2;grass.receiveShadow=true;scene.add(grass);
  roadX(9,-110,60);GAPS.forEach(([a,b])=>{roadZ((a+b)/2,-70,-0.2);roadZ((a+b)/2,18.2,80);crosswalk((a+b)/2-5.5,9,true);crosswalk((a+b)/2+5.5,9,true)});
  // wide sidewalks
  const segs=[[-110,-52],[-44,6],[14,60]];segs.forEach(([a,b])=>{strip(a,b,-0.2,4.4,'#c9c9cc',0.12,0.24,true);strip(a,b,13.6,18.2,'#c9c9cc',0.12,0.24,true)});
  const names=['PIZZA','KIOSK','FRISEUR','DÖNER','CAFÉ','HANDY','EIS','APOTHEKE','SPORT','BANK','SUPERMARKT','BLUMEN','BURGER','SUSHI'];
  const cols=['#ef9a9a','#90caf9','#fff59d','#a5d6a7','#ffcc80','#b39ddb','#f8bbd0','#bcaaa4','#80cbc4','#e6ee9c','#ffab91','#cfd8dc'];
  [[1,-0.2],[-1,18.2]].forEach(([face,zf],row)=>{let x=-108,i=row*5;const R=rng(77+row*9);
    while(x<58){let w=[6,7,8,9,10][Math.floor(R()*5)];if(inGap(x,x+w)){const g=GAPS.find(([g0,g1])=>x+w>g0&&x<g1);x=g[1]+0.3;continue}
      let type=R()<0.2?'tower':'shop';let h=type==='tower'?20+R()*14:8+R()*12;let sign=type==='shop'?names[i%names.length]:null;
      if(face>0&&x<=-24&&-24<x+w){type='shop';sign='BÄCKEREI';h=9;w=Math.max(w,7)}
      if(face<0&&x>0&&x<30){h=Math.min(h,9);type='shop'}
      if(o.skipBuild&&o.skipBuild(x+w/2,zf)){x+=w+0.3;continue}
      facade(x+w/2,zf,face,w,h,type,cols[i%cols.length],sign,i*13+row);x+=w+0.3;i++}});
  // back rows: skyscrapers north, mid-rise south
  const R=rng(5);for(let x=-100;x<60;x+=13){if(inGap(x-6,x+6))continue;const h=30+R()*24;facade(x,-17,1,11,h,'tower',['#cfd8dc','#b0bec5','#90a4ae','#eceff1'][Math.floor(R()*4)],null,x+500)}
  for(let x=-100;x<50;x+=12){if(inGap(x-5,x+5))continue;facade(x,32,-1,10,10+R()*12,R()<.3?'tower':'shop',cols[Math.floor(R()*cols.length)],null,x+900)}
  billboard(-30,20,-14,0,'STADTRENNEN|SAMSTAG','#1e88e5','#fff');billboard(30,14,24,Math.PI,'PIZZA 2€','#e53935','#fff');billboard(-70,22,-14,0,'GÜNTHER|FAN CLUB','#fdd835','#222');
  for(let x=-104;x<58;x+=12){if(inGap(x-1,x+1))continue;lamp(x,4.0).rotation.y=0;lamp(x+6,14.0).rotation.y=Math.PI;if(o.trees!==false&&!inGap(x+3-2,x+3+2)){rtree(x+3,2.0,0.8);rtree(x+9,16,0.8)}}
  GAPS.forEach(([a,b])=>{trafficLight(a-0.6,4.6,Math.PI/2);trafficLight(b+0.6,13.4,-Math.PI/2)});busStop(-12,2.2);
  // pedestrians
  if(o.peds!==false){const RP=rng(31);for(let i=0;i<16;i++){const p=makeR(npc(i+20,{name:null,face:'smile'}));scene.add(p);const north=i%2===0;const dir=RP()<.5?1:-1;
    MOVERS.push({ped:true,o:p,x0:dir>0?-100:56,x1:dir>0?56:-100,z:north?0.6+RP()*1.0:14.4+RP()*2.6,v:1.3+RP()*0.8,ph:RP()*100,y:0.24})}}
  if(o.traffic){const cc=['#e53935','#1e88e5','#fdd835','#ffffff','#43a047','#212121','#ff9800'];const RT=rng(9);for(let i=0;i<10;i++){const lane=i%2;const c=car(0,lane?11.4:6.6,lane?-Math.PI/2:Math.PI/2,cc[i%7]);MOVERS.push({o:c,x0:lane?58:-104,x1:lane?-104:58,z:lane?11.4:6.6,v:7+RT()*5,ph:i*2.3})}}
}
function updMovers2(T){MOVERS.forEach(m=>{const span=Math.abs(m.x1-m.x0);const p=((T*m.v+m.ph*10)%span);const dir=Math.sign(m.x1-m.x0);m.o.position.x=m.x0+dir*p;
  if(m.ped){m.o.position.z=m.z;m.o.position.y=m.y;m.o.rotation.y=dir>0?Math.PI/2:-Math.PI/2;pose(m.o);walk(m.o,T*1.3+m.ph,7,0.5)}})}

// ================= GÜNTHER (realistic pigeon with human legs) =================
const featherT=ctex(256,256,g=>{const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#a3aebd');gr.addColorStop(1,'#7b8697');g.fillStyle=gr;g.fillRect(0,0,256,256);
  const R=rng(4);for(let y=0;y<280;y+=14)for(let x=(y/14%2)*10;x<270;x+=20){g.strokeStyle=`rgba(60,70,85,${0.18+R()*0.12})`;g.lineWidth=1.6;g.beginPath();g.arc(x,y,10,0.15*Math.PI,0.85*Math.PI);g.stroke();
    g.strokeStyle='rgba(255,255,255,.12)';g.beginPath();g.arc(x,y-2,9,0.2*Math.PI,0.8*Math.PI);g.stroke()}
  for(let i=0;i<900;i++){g.fillStyle=`rgba(${R()<.5?255:30},${R()<.5?255:30},${R()<.5?255:40},0.05)`;g.fillRect(R()*256,R()*256,2,2)}});
const neckT=ctex(256,256,g=>{const gr=g.createLinearGradient(0,0,256,0);gr.addColorStop(0,'#3f9a7a');gr.addColorStop(.35,'#7a4fa8');gr.addColorStop(.65,'#3f9a7a');gr.addColorStop(1,'#7a4fa8');g.fillStyle=gr;g.fillRect(0,0,256,256);
  const v=g.createLinearGradient(0,0,0,256);v.addColorStop(0,'rgba(110,120,135,1)');v.addColorStop(.35,'rgba(110,120,135,0)');v.addColorStop(.75,'rgba(110,120,135,0)');v.addColorStop(1,'rgba(150,158,170,1)');g.fillStyle=v;g.fillRect(0,0,256,256);
  const R=rng(8);for(let i=0;i<500;i++){g.fillStyle=`rgba(255,255,255,${R()*0.08})`;g.fillRect(R()*256,R()*256,3,1)}});
const wingT=ctex(256,256,g=>{g.drawImage(featherT.userData.c,0,0);g.fillStyle='rgba(25,25,30,.85)';g.beginPath();g.ellipse(128,150,120,14,0.05,0,7);g.fill();g.beginPath();g.ellipse(128,196,120,14,0.05,0,7);g.fill()});
const tailT=ctex(64,256,g=>{g.fillStyle='#6f7a8a';g.fillRect(0,0,64,256);g.fillStyle='#1c1f24';g.fillRect(0,0,64,46)});
const skinT=ctex(128,128,g=>{g.fillStyle='#e7b394';g.fillRect(0,0,128,128);const R=rng(3);for(let i=0;i<260;i++){g.strokeStyle=`rgba(70,45,30,${0.25+R()*0.3})`;g.lineWidth=1;const x=R()*128,y=R()*128;g.beginPath();g.moveTo(x,y);g.lineTo(x+R()*3-1.5,y+4+R()*3);g.stroke()}
  for(let i=0;i<40;i++){g.fillStyle='rgba(200,110,90,.12)';g.beginPath();g.arc(R()*128,R()*128,6+R()*8,0,7);g.fill()}});
function makePigeon(name='Günther_dieTaube'){
  const root=new THREE.Group();const body=new THREE.Group();body.position.y=1.32;root.add(body);
  const fm=new THREE.MeshPhysicalMaterial({map:featherT,roughness:.82,sheen:0.6,sheenColor:new THREE.Color('#c8d0dc'),sheenRoughness:0.6});
  const torso=mesh(new THREE.SphereGeometry(0.5,40,28),fm);torso.scale.set(0.78,0.74,1.12);body.add(torso);
  const belly=mesh(new THREE.SphereGeometry(0.5,32,24),new THREE.MeshPhysicalMaterial({color:'#9aa4b2',roughness:.85,sheen:.5,sheenColor:new THREE.Color('#dfe5ee')}));belly.scale.set(0.68,0.62,0.9);belly.position.set(0,-0.08,0.12);body.add(belly);
  const nm=new THREE.MeshPhysicalMaterial({map:neckT,roughness:.38,metalness:.25,iridescence:1.0,iridescenceIOR:1.6,clearcoat:.4,clearcoatRoughness:.4});
  const neck=mesh(new THREE.SphereGeometry(0.3,32,24),nm);neck.scale.set(0.95,1.25,0.95);neck.position.set(0,0.36,0.36);body.add(neck);
  const headG=new THREE.Group();headG.position.set(0,0.66,0.46);body.add(headG);
  const hm=new THREE.MeshPhysicalMaterial({color:'#7c8798',roughness:.8,sheen:.5,sheenColor:new THREE.Color('#cfd6e0')});
  const head=mesh(new THREE.SphereGeometry(0.22,32,24),hm);head.scale.set(0.95,0.95,1.05);headG.add(head);
  const bk=new THREE.MeshStandardMaterial({color:'#2f2f33',roughness:.45});
  const upper=mesh(new THREE.ConeGeometry(0.055,0.2,16),bk);upper.rotation.x=Math.PI/2;upper.position.set(0,-0.01,0.29);headG.add(upper);
  const lowerG=new THREE.Group();lowerG.position.set(0,-0.04,0.2);headG.add(lowerG);const lower=mesh(new THREE.ConeGeometry(0.04,0.15,12),bk);lower.rotation.x=Math.PI/2;lower.position.set(0,0,0.07);lowerG.add(lower);
  const cere=mesh(new THREE.SphereGeometry(0.05,16,12),new THREE.MeshStandardMaterial({color:'#f1efe9',roughness:.9}));cere.scale.set(1,0.7,1.4);cere.position.set(0,0.04,0.21);headG.add(cere);
  const eyes=[];[-1,1].forEach(s=>{const e=new THREE.Group();e.position.set(s*0.155,0.05,0.1);headG.add(e);
    const ring=mesh(new THREE.SphereGeometry(0.058,20,16),new THREE.MeshStandardMaterial({color:'#e8e2d6',roughness:.6}));e.add(ring);
    const iris=mesh(new THREE.SphereGeometry(0.047,20,16),new THREE.MeshPhysicalMaterial({color:'#ff7f11',roughness:.15,clearcoat:1}));iris.position.x=s*0.018;e.add(iris);
    const pup=mesh(new THREE.SphereGeometry(0.02,12,10),new THREE.MeshStandardMaterial({color:'#050505',roughness:.1}));pup.position.set(s*0.05,s>0?0.012:-0.008,s>0?0.012:-0.01);e.add(pup);e.userData.pup=pup;eyes.push(e)});
  const wm=new THREE.MeshPhysicalMaterial({map:wingT,roughness:.8,sheen:.5,sheenColor:new THREE.Color('#d0d6df')});
  [-1,1].forEach(s=>{const w=mesh(new THREE.SphereGeometry(0.5,32,20),wm);w.scale.set(0.16,0.5,1.0);w.position.set(s*0.34,0.04,-0.12);w.rotation.set(-0.12,s*0.08,0);body.add(w)});
  const tail=mesh(new THREE.BoxGeometry(0.42,0.05,0.62),[PL('#6f7a8a'),PL('#6f7a8a'),new THREE.MeshStandardMaterial({map:tailT,roughness:.8}),PL('#6f7a8a'),PL('#6f7a8a'),PL('#1c1f24')]);tail.position.set(0,0.0,-0.78);tail.rotation.x=-0.28;body.add(tail);
  // HUMAN legs + feet
  const sk=new THREE.MeshPhysicalMaterial({map:skinT,roughness:.55,sheen:.3,sheenColor:new THREE.Color('#ffd2bd')});
  const legs=[];[-1,1].forEach(s=>{const hip=new THREE.Group();hip.position.set(s*0.16,1.1,0.02);root.add(hip);
    const th=mesh(new THREE.CapsuleGeometry(0.095,0.4,8,16),sk);th.position.y=-0.25;hip.add(th);
    const knee=new THREE.Group();knee.position.y=-0.5;hip.add(knee);const kc=mesh(new THREE.SphereGeometry(0.1,16,12),sk);knee.add(kc);
    const sh=mesh(new THREE.CapsuleGeometry(0.08,0.38,8,16),sk);sh.position.y=-0.24;knee.add(sh);
    const ankle=new THREE.Group();ankle.position.y=-0.5;knee.add(ankle);
    const foot=mesh(new RoundedBoxGeometry(0.2,0.09,0.34,3,0.04),sk);foot.position.set(0,-0.03,0.09);ankle.add(foot);
    const heel=mesh(new THREE.SphereGeometry(0.07,14,10),sk);heel.position.set(0,-0.02,-0.05);ankle.add(heel);
    for(let k=0;k<5;k++){const big=(s>0?k===0:k===4);const r=big?0.038:0.026-Math.abs(k-(s>0?0:4))*0.001;const toe=mesh(new THREE.SphereGeometry(r,12,10),sk);toe.scale.set(1,0.85,1.3);
      toe.position.set(s*(-0.075+k*0.037)*(1),-0.045,0.27-Math.abs(k-(s>0?0:4))*0.012);ankle.add(toe);const nail=mesh(new THREE.SphereGeometry(r*0.55,8,6),new THREE.MeshStandardMaterial({color:'#f6e3d8',roughness:.3}));nail.scale.set(1,0.4,1);nail.position.set(toe.position.x,toe.position.y+r*0.7,toe.position.z+r*0.5);ankle.add(nail)}
    legs.push({hip,knee,ankle})});
  const shorts=mesh(new THREE.CylinderGeometry(0.36,0.3,0.22,24),new THREE.MeshStandardMaterial({color:'#e53935',roughness:.7}));shorts.position.set(0,1.08,0.02);root.add(shorts);
  const tag=makeTag(name);tag.position.y=2.25;root.add(tag);
  root.userData={body,headG,lowerG,legs,eyes,tag,isPigeon:true};root.traverse(o=>{if(o.isMesh){o.castShadow=true}});return root}
function pigeonPose(p,t,o={}){const u=p.userData;const walkS=o.walk||0;const ph=t*walkS*6;
  u.legs.forEach((l,i)=>{const s=i?1:-1;const a=Math.sin(ph+(i?Math.PI:0));l.hip.rotation.x=walkS?a*0.5:0;l.knee.rotation.x=walkS?Math.max(0,-Math.cos(ph+(i?Math.PI:0)))*0.9:0.05;l.ankle.rotation.x=walkS?-a*0.2:0;l.hip.rotation.z=s*0.04});
  const bob=walkS?((ph/(Math.PI))%1):0;u.headG.position.z=0.46+(walkS?(bob<0.3?bob/0.3*0.14:0.14-((bob-0.3)/0.7)*0.14):0)+(o.lean||0);
  u.body.position.y=1.32+(walkS?Math.abs(Math.sin(ph))*0.03:0)+(o.jump||0);u.body.rotation.x=o.tilt||0;
  u.headG.rotation.z=o.derp??Math.sin(t*1.3)*0.25;u.headG.rotation.y=o.look??Math.sin(t*0.9)*0.3;
  u.lowerG.rotation.x=o.talk?Math.max(0,Math.sin(t*22))*0.45:0;
  u.eyes[0].userData.pup.position.y=-0.008+Math.sin(t*3)*0.006}
function talkPigeon(p,t,sc){return t>0.15&&t<sc.dur-0.2}

// ================= Kevin's sports car =================
function sportCar(col='#e53935',driver=true){const g=new THREE.Group();const pm=PL(col,{r:.22,m:.35,x:{envMap:envTex,envMapIntensity:0.6}});
  const b=mesh(rbox(2.1,0.55,4.6,0.22),pm);b.position.y=0.55;g.add(b);const hood=mesh(rbox(2.0,0.3,1.6,0.12),pm);hood.position.set(0,0.82,1.35);hood.rotation.x=0.12;g.add(hood);
  const st=ctex(64,256,gg=>{gg.fillStyle=col;gg.fillRect(0,0,64,256);gg.fillStyle='#fff';gg.fillRect(16,0,10,256);gg.fillRect(38,0,10,256)});const strip=mesh(new THREE.BoxGeometry(0.7,0.02,4.5),new THREE.MeshStandardMaterial({map:st}),false);strip.position.set(0,0.835,0);g.add(strip);
  const ws=mesh(new THREE.BoxGeometry(1.9,0.55,0.06),PL('#9fd7ff',{r:.1,x:{transparent:true,opacity:0.45}}),false);ws.position.set(0,1.1,0.45);ws.rotation.x=-0.5;g.add(ws);
  const seat=part(1.6,0.5,0.4,'#212121');seat.position.set(0,0.95,-0.6);g.add(seat);
  const sp=part(2.0,0.08,0.5,'#111');sp.position.set(0,1.25,-2.15);g.add(sp);[-0.8,0.8].forEach(a=>{const p=part(0.08,0.4,0.08,'#111');p.position.set(a,1.03,-2.1);g.add(p)});
  const wm=PL('#111',{r:.8}),rim=PL('#cfd8dc',{r:.2,m:.8});[[-1.05,1.4],[1.05,1.4],[-1.05,-1.45],[1.05,-1.45]].forEach(([a,c])=>{const w=mesh(new THREE.CylinderGeometry(0.42,0.42,0.34,20),wm);w.rotation.z=Math.PI/2;w.position.set(a,0.42,c);g.add(w);const r=mesh(new THREE.CylinderGeometry(0.24,0.24,0.36,12),rim);r.rotation.z=Math.PI/2;r.position.copy(w.position);g.add(r)});
  const hl=PL('#fffde7',{x:{emissive:new THREE.Color('#fff8d0'),emissiveIntensity:0.9}});[-0.7,0.7].forEach(a=>{const h=mesh(new THREE.BoxGeometry(0.45,0.12,0.05),hl,false);h.position.set(a,0.72,2.31);g.add(h)});
  const tl=PL('#ff1744',{x:{emissive:new THREE.Color('#ff1744'),emissiveIntensity:0.8}});[-0.7,0.7].forEach(a=>{const h=mesh(new THREE.BoxGeometry(0.45,0.12,0.05),tl,false);h.position.set(a,0.72,-2.31);g.add(h)});
  let kev=null;if(driver){kev=makeR(npc(0,{name:'Kevin2012',face:'smug',hair:'cap',capColor:'#111',shirt:'#e53935'}));sit(kev);kev.position.set(-0.38,0.45,-0.55);kev.userData.armL.rotation.x=kev.userData.armR.rotation.x=-1.3;g.add(kev);
    const sg=mesh(new THREE.BoxGeometry(0.5,0.1,0.05),PL('#050505',{r:.1,m:.6}),false);sg.position.set(0,0.38,0.32);kev.userData.head.add(sg);
    const wheel=mesh(new THREE.TorusGeometry(0.18,0.03,8,16),PL('#111'),false);wheel.position.set(-0.38,1.15,0.15);wheel.rotation.x=-0.6;g.add(wheel)}
  g.userData={kev};scene.add(g);return g}
function onRoad(o,x,z,dir,extraYaw=0){o.position.set(x,rampTop(x)-0.12+0.12,z);o.rotation.set(0,dir+extraYaw,0);if(x>RX0&&x<RX1)o.rotateOnWorldAxis(new THREE.Vector3(0,0,1),0.26*Math.sign(Math.sin(dir)))}
const smokeT=ctex(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(235,235,235,.9)');gr.addColorStop(1,'rgba(235,235,235,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)});
function makeSmoke(n=60){const arr=[];for(let i=0;i<n;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeT,transparent:true,depthWrite:false}));s.visible=false;scene.add(s);arr.push(s)}return arr}
function updSmoke(arr,t,src,amt,dirX=-1){arr.forEach((s,i)=>{const life=1.2;const born=(i/arr.length)*life;const k=((t-born)%life+life)%life/life;s.visible=amt>0&&t>born;if(!s.visible)return;
  s.position.set(src.x+dirX*k*3+Math.sin(i*7)*0.4,src.y+0.3+k*1.4,src.z+Math.cos(i*5)*k*1.2);const sc=0.6+k*2.6;s.scale.set(sc,sc,1);s.material.opacity=(1-k)*0.7*amt})}
function speed(a){const el=$('speed');el.style.opacity=String(a);el.style.transform=`rotate(${Math.random()*6}deg) scale(1.1)`}
function card(show,k=1){const el=$('card');el.style.display=show?'block':'none';if(show){el.style.transform=`translateX(${(1-easeOut(k))*-420}px)`;el.querySelectorAll('i').forEach((b,i)=>b.style.width=(easeOut(clamp(k*1.4-i*0.15))*[96,90,99][i])+'%')}}
function podium(x,y,z){const g=new THREE.Group();[[0,2.2,'1','#fdd835'],[-2.4,1.5,'2','#cfd8dc'],[2.4,1.0,'3','#ffab91']].forEach(([dx,h,n,c])=>{const t=signTex(n,c,'#222');const b=mesh(new THREE.BoxGeometry(2.3,h,2.3),[PL(c),PL(c),PL(c,{x:{map:studTex(4,4)}}),PL(c),PL('#fff',{x:{map:t}}),PL(c)]);b.position.set(dx,h/2,0);g.add(b)});g.position.set(x,y,z);scene.add(g);return g}

function startLine(x){const g=new THREE.Group();[-4.2,4.2].forEach(dz=>{const p=part(0.6,6,0.6,'#ffffff');p.position.set(x,3,9+dz);g.add(p)});
  const bt=ctex(1024,256,gg=>{gg.fillStyle='#1e88e5';gg.fillRect(0,0,1024,256);gg.fillStyle='#fff';gg.font='900 120px P';gg.textAlign='center';gg.textBaseline='middle';gg.fillText('STADTRENNEN',512,134)});
  const ban=new THREE.Mesh(new THREE.BoxGeometry(0.3,2,9),[PL('#fff',{x:{map:bt}}),PL('#fff',{x:{map:bt}}),PL('#1e88e5'),PL('#1e88e5'),PL('#1e88e5'),PL('#1e88e5')]);ban.position.set(x,6.1,9);g.add(ban);
  const line=ctex(64,512,gg=>{for(let i=0;i<2;i++)for(let j=0;j<16;j++){gg.fillStyle=(i+j)%2?'#111':'#fff';gg.fillRect(i*32,j*32,32,32)}});const fl=new THREE.Mesh(new THREE.PlaneGeometry(1,7),new THREE.MeshStandardMaterial({map:line}));fl.rotation.x=-Math.PI/2;fl.position.set(x,0.11,9);g.add(fl);scene.add(g);return g}
// ================= SCENES (v4) =================
const S={};const MEB={...ME,name:'xX_Radler_Xx'};
function world(o={}){downtown(o);return hill()}
function gbScene(setup){return{build(sc){const c=setup();c.pg.userData.tag.visible=false;bloom.strength=0;return c},
  update(c,t,sc){pigeonPose(c.pg,t,{talk:talkPigeon(c.pg,t,sc),derp:0.35*Math.sin(t*3),look:0.2,lean:0.04*Math.sin(t*20)});
    const p=c.pg.position;const k=easeOut(prog(t,0,0.25));const hp=new THREE.Vector3();c.pg.userData.headG.getWorldPosition(hp);
    const ry=c.pg.rotation.y;const fw=V(Math.sin(ry),0,Math.cos(ry)),sd=V(Math.cos(ry),0,-Math.sin(ry));const dirv=fw.clone().multiplyScalar(0.75).add(sd.multiplyScalar(c.side||0.85)).add(V(0,0.18,0)).normalize();shot(hp.clone().add(dirv.clone().multiplyScalar(lerp(2.6,1.55,k))),hp.clone().add(V(0,-0.03,0)),0.12*Math.sin(t*2)+0.1,lerp(45,38,k),0.006+0.02*Math.exp(-t*6),t);
    speed(0)}}}
// hook (same as before, huss on the mountain road)
S.hook={build(){world({peds:false});lights({target:[90,10,9],size:18});const rig=makeRider(MEB);add(rig);const drops=makeDrops(18);return {rig,drops}},
 update(c,t,sc){const H=sc.huss;let n=-1;for(let i=0;i<H.length;i++)if(t>=H[i])n=i;const dt=n>=0?t-H[n]:9;const pulse=Math.exp(-dt*8);
  const x=86+Math.max(0,n)*1.4+(n>=0?easeOut(dt/0.3)*1.4:0)+t*0.25;const ang=x*1.6;ride(c.rig,x,10.2,Math.PI/2,ang,1);const ch=c.rig.userData.ch;
  ch.userData.upper.rotation.x=0.35+0.25*pulse;ch.userData.upper.rotation.z=Math.sin(ang)*0.12;setFace(ch,n>=0?'strain':'determined');
  c.rig.updateMatrixWorld(true);const hp=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(hp);updDrops(c.drops,t,H,hp);
  const alt=n%2===0;const p=c.rig.position;speed(0.25*pulse);
  if(alt)shot(V(p.x-2.5,p.y+3.0,p.z+8.5),V(p.x+0.5,p.y+1.3,p.z),-0.06,52-9*pulse,0.01+0.07*pulse,t);
  else shot(V(p.x+5.5,p.y+2.6,p.z+2.2),V(p.x,p.y+1.5,p.z),0.08,50-9*pulse,0.01+0.07*pulse,t)}};
S.rewind={build(){world();lights({target:[20,6,9],size:50});const rig=makeRider(MEB);add(rig);vhsEl.style.display='block';renderer.domElement.style.filter='saturate(0.55) contrast(1.15) hue-rotate(-8deg)';return {rig}},
 update(c,t,sc){const x=lerp(95,-30,ease(t/(sc.dur*0.9)));ride(c.rig,x,10.2,Math.PI/2,x*1.6,0);$('vbar').style.top=(((t*900)%1400)-100)+'px';
  shot(V(lerp(100,-10,ease(t/sc.dur)),40,9),V(lerp(80,-40,ease(t/sc.dur)),0,9),0.02*Math.sin(t*40),55,0.1,t*7)}};
S.cars={build(){world({traffic:true});lights({target:[-4,0,9],size:22});return {}},
 update(c,t){shot(lv(V(-14,4.8,16.8),V(-10,4.2,16),ease(t/2.8)),V(8,1.5,6),-0.04,52,0.015,t)}};
S.bakery={build(){world({traffic:false});lights({target:[-28,0,6],size:16});const cr=car(-35,6.6,Math.PI/2,'#43a047');const np=makeR(npc(3,{face:'smile',name:'Aufzug_Fan'}));add(np);np.visible=false;return {cr,np}},
 update(c,t,sc){const p=ease(prog(t,0.05,0.9));c.cr.position.x=lerp(-35,-25,p);const ex=prog(t,0.95,sc.dur);c.np.visible=t>0.95;
  if(t>0.95){pose(c.np);c.np.position.set(-24.6,0.24,lerp(5.2,1.0,ex));c.np.rotation.y=Math.PI;walk(c.np,t,9,0.6)}bubbleAt(c.np,t,[[1.0,9,'5 meter lol']]);
  shot(lv(V(-31,5,16.6),V(-30,4.6,16),ease(t/sc.dur)),V(-27,2.2,2),0.03,50,0.012,t)}};
S.pigeon={build(){world({traffic:true,trees:false});lights({target:[-16,0,3],size:14});const pg=makePigeon();add(pg);return {pg}},
 update(c,t,sc){const x=-20-t*0.9;c.pg.position.set(x,0.24,2.8);c.pg.rotation.y=-Math.PI/2-0.25;pigeonPose(c.pg,t,{walk:1.0,derp:0.2*Math.sin(t*2)});
  const k=ease(prog(t,0,sc.dur));const p=c.pg.position;shot(V(p.x-lerp(5,2.6,k),lerp(0.7,1.6,k),p.z+lerp(2.6,2.2,k)),V(p.x-0.2,lerp(0.6,1.7,k),p.z),0.06,lerp(46,40,k),0.008,t)}};
S.gb1=gbScene(()=>{world({traffic:true,trees:false});lights({target:[-16,0,3],size:14});const pg=makePigeon();add(pg);pg.position.set(-21,0.24,2.8);pg.rotation.y=Math.PI/2+0.9;return {pg,dir:V(0.5,0.1,1).normalize()}});
S.bike={build(){world({traffic:false});lights({target:[0,0,7],size:20});const rig=makeRider(MEB);add(rig);const rain=weather('rain');const snow=weather('snow',700,7);return {rig,rain,snow}},
 update(c,t,sc){const x=-24+t*4.4;ride(c.rig,x,6.6,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,'determined');
  const r=wordT(sc,'Regen'),s=wordT(sc,'Schnee'),im=wordT(sc,'Immer');const mode=t>=im?'sun':t>=s?'snow':t>=r?'rain':'sun';
  const p=c.rig.position;c.rain.visible=mode==='rain';c.snow.visible=mode==='snow';updWeather(c.rain,t,p);updWeather(c.snow,t,p);
  scene.background=mode==='rain'?new THREE.Color('#6d7b8a'):mode==='snow'?new THREE.Color('#c9d6e3'):skyTex(SKY);
  const cut=Math.floor(t/1.3)%2;if(cut)shot(V(p.x+5,p.y+1.2,p.z-2.5),V(p.x,p.y+1.5,p.z),0.05,46,0.015,t);else shot(V(p.x+1.5,p.y+2.6,p.z+7),V(p.x+0.8,p.y+1.3,p.z),-0.03,50,0.015,t)}};
S.neighbor={build(){world({traffic:false});lights({target:[0,0,9],size:16});const cr=car(3,11.4,-Math.PI/2,'#212121');
  const nb=makeR(npc(4,{name:'Bernd_derNachbar',suit:true,shirt:'#37474f',face:'laugh',hair:'long',hairColor:'#8d4a2b'}));nb.position.set(3.5,0.24,14.3);nb.rotation.y=Math.PI*0.9;add(nb);
  const rig=makeRider(MEB);add(rig);return {cr,nb,rig}},
 update(c,t,sc){const x=-6+t*3.2;ride(c.rig,x,6.6,Math.PI/2,x*1.7,0);setFace(c.rig.userData.ch,t>1.4?'sad':'determined');
  const u=pose(c.nb);const b=Math.abs(Math.sin(t*9));u.upper.rotation.x=-0.1+b*0.15;u.armR.rotation.x=-1.4;
  const f=wordT(sc,'Fahrräder');bubbleAt(c.nb,t,[[0.1,f,'HUP HUP'],[f,9,'Fahrräder sind für Babys']]);chat([[f,'Bernd_derNachbar','fahrräder sind für babys lol','#ffb74d']],t);
  shot(lv(V(-5,4.2,17),V(-3,4,16.4),ease(t/sc.dur)),V(1.5,1.4,9.5),-0.03,50,0.012,t)}};
function trophyStand(x,z){const p=part(1.4,1.2,1.4,'#263238');p.position.set(x,0.84,z);scene.add(p);const tr=makeTrophy();tr.position.set(x,1.44,z);tr.scale.setScalar(1.2);scene.add(tr);return tr}
function myGrid(){const kev=sportCar('#e53935');onRoad(kev,-5,7.2,Math.PI/2);const cc=['#fdd835','#43a047','#8e24aa'];const cars=[[-12,7.2],[-12,10.8],[-18,7.2]].map(([x,z],i)=>car(x,z,Math.PI/2,cc[i]));
  const rig=makeRider(MEB);add(rig);ride(rig,-3.2,10.6,Math.PI/2,0,0);return {kev,cars,rig}}
S.event={build(){world({traffic:false});lights({target:[0,0,9],size:30});startLine(0);const G=myGrid();G.tr=trophyStand(3,15.8);const sp=makeSparks(60);sp.material.opacity=0.8;scene.add(sp);G.sp=sp;return G},
 update(c,t,sc){ride(c.rig,-3.2,10.6,Math.PI/2,0,0);c.tr.rotation.y=t*1.2;updSparks(c.sp,t,3,1.2,15.8);const s=wordT(sc,'Sieger');
  lb([['Kevin2012','–'],['LindaGamer','–'],[MEB.name,'–'],['PizzaLord','–']],MEB.name,'Platz');
  if(t<s)shot(lv(V(-12,3.2,16),V(-16,7,16.5),ease(t/s)),V(0,3,9),0.03,50,0.012,t);
  else{const k=ease(prog(t,s,sc.dur));shot(V(3+lerp(2.4,1.8,k),lerp(2.0,2.6,k),15.8+lerp(1.4,1.0,k)),V(3,2.4,15.8),-0.05,lerp(42,36,k),0.008,t)}}};
S.rival={build(){world({traffic:false});lights({target:[-5,0,7],size:14});startLine(0);const G=myGrid();G.smoke=makeSmoke(40);return G},
 update(c,t,sc){const k=c.kev;const rev=Math.max(0,Math.sin(t*14));onRoad(k,-5,7.2,Math.PI/2);k.position.y+=rev*0.04;k.rotation.z=Math.sin(t*28)*0.012;
  const kv=k.userData.kev;setFace(kv,'smug');kv.userData.head.rotation.y=Math.sin(t*0.8)*0.3;updSmoke(c.smoke,t,V(-7.4,0.3,7.2),1,-1);
  card(true,prog(t,wordT(sc,'Kevin')-0.1,wordT(sc,'Kevin')+0.6));
  const a=lerp(-0.9,0.5,ease(t/sc.dur));shot(V(-5+Math.sin(a+Math.PI/2)*5.2,1.2+t*0.2,7.2+Math.cos(a+Math.PI/2)*5.2-1),V(-5,1.0,7.2),0.06,46,0.02,t)}};
S.laugh={build(){world({traffic:false});lights({target:[-3,0,10],size:14});startLine(0);myGrid();const crowd=crowdAround(6,-3.2,10.6,3.0,'laugh');return {crowd}},
 update(c,t,sc){c.crowd.forEach((p,i)=>{const u=pose(p);const b=Math.abs(Math.sin(t*9+i));u.upper.rotation.x=-0.15+b*0.25;u.upper.position.y=1+b*0.05;if(i%2===0)u.armR.rotation.set(-1.5,0,0);else{u.armL.rotation.z=-0.5-b*0.3;u.armR.rotation.z=0.5+b*0.3}});
  const tM=wordT(sc,'Mit'),tN=wordT(sc,'Niemals');bubbleAt(c.crowd[0],t,[[0.1,9,'LOL']]);bubbleAt(c.crowd[2],t,[[tM,9,'mit dem fahrrad?? XD']]);bubbleAt(c.crowd[5],t,[[tN,9,'niemals']]);
  chat([[0.1,'Kevin2012','LOL'],[tM,'LindaGamer','mit dem fahrrad?? xD','#f48fb1'],[tN,'PizzaLord','niemals','#ffcc80']],t);
  const a=lerp(0.6,-0.5,ease(t/sc.dur));shot(V(-3.2+Math.sin(a)*7.5,3.4,10.6+Math.cos(a)*6),V(-3.2,1.9,10.6),0.04,50,0.02,t)}};
S.countdown={build(){world({traffic:false});lights({target:[-3,0,9],size:16});startLine(0);const G=myGrid();G.pg=makePigeon();add(G.pg);G.pg.position.set(2,0.24,15.2);G.pg.rotation.y=-Math.PI*0.75;G.smoke=makeSmoke(40);return G},
 update(c,t,sc){const d3=wordT(sc,'Drei'),d2=wordT(sc,'Zwei'),d1=wordT(sc,'Eins');const cur=t>=d1?1:t>=d2?2:3;const st=cur===1?d1:cur===2?d2:d3;
  bigEl.textContent=String(cur);bigEl.style.opacity=String(Math.max(0,1-(t-st)*1.2));bigEl.style.transform=`scale(${1+0.5*Math.exp(-(t-st)*7)})`;bigEl.style.color=cur===1?'#ffd54a':'#fff';
  ride(c.rig,-3.2,10.6,Math.PI/2,0,0);setFace(c.rig.userData.ch,'determined');pigeonPose(c.pg,t,{derp:0.4*Math.sin(t*4)});onRoad(c.kev,-5,7.2,Math.PI/2);c.kev.position.y+=Math.max(0,Math.sin(t*16))*0.05;updSmoke(c.smoke,t,V(-7.4,0.3,7.2),1,-1);
  const k=easeOut(prog(t,st,st+0.4));
  if(cur===3){const hp=new THREE.Vector3();c.rig.userData.ch.userData.headMesh.getWorldPosition(hp);shot(hp.clone().add(V(lerp(3.2,2.0,k),0.1,0.4)),hp,0.05,40,0.01,t)}
  else if(cur===2){const hp=new THREE.Vector3();c.kev.userData.kev.userData.headMesh.getWorldPosition(hp);shot(hp.clone().add(V(lerp(3.2,2.0,k),0.2,-0.8)),hp,-0.05,40,0.01,t)}
  else{const hp=new THREE.Vector3();c.pg.userData.headG.getWorldPosition(hp);shot(hp.clone().add(V(-1.2,0.1,lerp(-2.6,-1.6,k))),hp,0.1,40,0.01,t)}}};
S.start={build(){world({traffic:false});lights({target:[10,0,9],size:30});startLine(0);const G=myGrid();G.smoke=makeSmoke(60);return G},
 update(c,t,sc){const r=Math.max(0,t-0.05);bigEl.textContent='LOS!';bigEl.style.color='#fff';bigEl.style.opacity=String(Math.max(0,1-r*1.6));bigEl.style.transform=`scale(${1+0.4*Math.exp(-r*6)})`;
  const kx=-5+r*r*14;onRoad(c.kev,kx,7.2,Math.PI/2);c.kev.rotation.z=Math.sin(t*30)*0.02;updSmoke(c.smoke,t,V(-7,0.3,7.2),Math.max(0,1-r*0.8),-1);
  c.cars.forEach((o,i)=>{o.position.x=[-12,-12,-18][i]+r*r*8});const x=-3.2+r*2.4;ride(c.rig,x,10.6,Math.PI/2,x*2,0);setFace(c.rig.userData.ch,'shock');
  speed(0.5*Math.exp(-r*2));lb([['Kevin2012',1],['PizzaLord',2],['LindaGamer',3],[MEB.name,4]],MEB.name,'Platz');
  shot(V(-9,1.4,8.8),V(4,1.2,8.6),0.03,52,0.05*Math.exp(-r*2)+0.01,t)}};
S.chase={build(){world({traffic:false});lights({target:[20,0,9],size:40});const kev=sportCar('#e53935');const rig=makeRider(MEB);add(rig);return {kev,rig}},
 update(c,t,sc){const x=4+t*5;ride(c.rig,x,10.2,Math.PI/2,x*2,0.3);setFace(c.rig.userData.ch,'strain');onRoad(c.kev,x+14+t*t*9,7.2,Math.PI/2);speed(0.35);
  lb([['Kevin2012',1],['PizzaLord',2],['LindaGamer',3],[MEB.name,4]],MEB.name,'Platz');const p=c.rig.position;
  shot(V(p.x-4.5,2.6,p.z+0.8),V(p.x+18,1.0,8.6),-0.03,48,0.02,t)}};
function stuckJam(){const cc=['#e53935','#1e88e5','#fdd835','#ffffff','#43a047','#212121','#ff9800','#8e24aa'];const arr=[];let i=0;
  for(let x=-42;x<2;x+=5.4){[7.2,10.8].forEach(z=>{if(x>-4&&z===7.2)return;const c=car(x+(z>9?1.6:0),z,Math.PI/2,cc[(i++)%cc.length]);arr.push(c)})}return arr}
S.jam={build(){world({traffic:false});lights({target:[-16,0,9],size:34});const cars=stuckJam();const kev=sportCar('#e53935');onRoad(kev,-1,7.2,Math.PI/2);const pg=makePigeon();add(pg);pg.position.set(10,0.12,9);pg.rotation.y=-Math.PI/2;return {cars,kev,pg}},
 update(c,t,sc){c.cars.forEach((o,i)=>{o.position.y=Math.abs(Math.sin(t*20+i))*0.02});pigeonPose(c.pg,t,{});
  chat([[0.4,'Kevin2012','hä wieso stehen alle'],[1.0,'LindaGamer','STAU','#f48fb1'],[1.5,'PizzaLord','HUUUUP','#ffcc80']],t);lb([['Kevin2012',1],['PizzaLord',2],['LindaGamer',3],[MEB.name,4]],MEB.name,'Platz');
  shot(lv(V(-46,26,9),V(-34,22,9),ease(t/sc.dur)),V(0,0,9),0,52,0.01,t)}};
S.cause={build(){world({traffic:false});lights({target:[6,0,9],size:20});stuckJam();const kev=sportCar('#e53935');onRoad(kev,-1,7.2,Math.PI/2);const pg=makePigeon();add(pg);pg.position.set(10,0.12,9);pg.rotation.y=-Math.PI/2;return {kev,pg}},
 update(c,t,sc){pigeonPose(c.pg,t,{derp:0.3*Math.sin(t*3)});setFace(c.kev.userData.kev,'shock');const k=ease(prog(t,0,sc.dur));
  shot(lv(V(10.5,16,24),V(13.5,2.0,12.5),k),lv(V(8,0,9),V(10,1.5,9),k),0.05*k,lerp(50,42,k),0.01,t)}};
S.gb2=gbScene(()=>{world({traffic:false});lights({target:[6,0,9],size:20});stuckJam();const kev=sportCar('#e53935');onRoad(kev,-1,7.2,Math.PI/2);const pg=makePigeon();add(pg);pg.position.set(10,0.12,9);pg.rotation.y=-Math.PI/2;return {pg,dir:V(-1,0.08,0.45).normalize()}});
S.bypass={build(){world({traffic:false});lights({target:[-20,0,9],size:26});const cars=stuckJam();const rig=makeRider(MEB);add(rig);const ppl=[];
  [[-30,13.8],[-14,2.6]].forEach(([x,z],i)=>{const p=makeR(npc(i+6,{face:'shock'}));p.position.set(x,0.24,z);p.rotation.y=z>9?Math.PI:0;add(p);ppl.push(p)});return {rig,ppl,cars}},
 update(c,t,sc){const x=-40+t*5.5;ride(c.rig,x,9,Math.PI/2,x*1.7,0);c.rig.rotation.z=Math.sin(t*3)*0.05;setFace(c.rig.userData.ch,'determined');const p=c.rig.position;speed(0.25);
  c.ppl.forEach(q=>{pose(q);q.rotation.y=Math.atan2(p.x-q.position.x,p.z-q.position.z)});bubbleAt(c.ppl[0],t,[[0.5,9,'hä??']]);bubbleAt(c.ppl[1],t,[[1.3,9,'WIE???']]);
  lb([['Kevin2012',1],['PizzaLord',2],[MEB.name,3],['LindaGamer',4]],MEB.name,'Platz');
  const cut=t>1.4;if(cut)shot(V(p.x+5,1.3,9.1),V(p.x,1.2,9),0.05,46,0.02,t);else shot(V(p.x-5,2.6,p.z+0.9),V(p.x+3,1.0,p.z),-0.05,52,0.02,t)}};
S.door={build(){world({traffic:false});lights({target:[-10,0,9],size:20});const cars=stuckJam();const dc=car(-8,10.8,Math.PI/2,'#1e88e5');
  const hinge=new THREE.Group();hinge.position.set(0.97,0.85,0.75);dc.add(hinge);const door=part(0.08,0.75,1.2,'#1e88e5');door.position.set(0,0,-0.6);hinge.add(door);
  const drv=makeR(npc(9,{face:'shock',name:'Tobi_TV'}));drv.scale.setScalar(0.8);drv.position.set(9.6,0.24,12.6);add(drv);const rig=makeRider(MEB);add(rig);return {hinge,rig,drv,dc}},
 update(c,t,sc){const tu=wordT(sc,'Tür');const slow=t>tu&&t<tu+0.9;const tt2=t<tu?t:tu+(Math.min(t,tu+0.9)-tu)*0.3+Math.max(0,t-tu-0.9);
  const x=-15+tt2*5.5;const dz=t>tu?Math.sin(clamp((tt2-tu)/0.7)*Math.PI)*-0.75:0;ride(c.rig,x,9+dz,Math.PI/2,x*1.7,0);c.rig.rotation.z=dz*0.35;setFace(c.rig.userData.ch,t>tu?'shock':'determined');
  c.hinge.rotation.y=-1.0*easeOut(prog(t,tu-0.15,tu+0.1));c.drv.position.set(-8.4,0.24,10.1);c.drv.visible=false;
  renderer.domElement.style.filter=slow?'saturate(1.3) contrast(1.1)':'';speed(slow?0:0.3);
  const p=c.rig.position;shot(V(-7.5+1.5,1.25,8.9),V(p.x,1.3,p.z),0.08,slow?38:46,slow?0.003:0.02,t)}};
S.sidewalk={build(){world({traffic:false,peds:false,trees:false});lights({target:[24,0,6],size:26});const kev=sportCar('#e53935');const rig=makeRider(MEB);add(rig);const pg=makePigeon();add(pg);pg.position.set(10,0.12,9);pg.rotation.y=-Math.PI/2;
  const ppl=[];[[22,2.2],[30,1.4],[38,2.6]].forEach(([x,z],i)=>{const p=makeR(npc(i+11,{face:'shock',name:null}));p.position.set(x,0.24,z);add(p);ppl.push(p)});return {kev,rig,ppl,pg}},
 update(c,t,sc){const x=18+t*5;ride(c.rig,x,9.6,Math.PI/2,x*2,0.3);setFace(c.rig.userData.ch,'shock');const kx=4+t*9.2;onRoad(c.kev,kx,2.2,Math.PI/2);c.kev.position.y=0.24+Math.abs(Math.sin(t*12))*0.06;
  pigeonPose(c.pg,t,{});c.ppl.forEach((p,i)=>{const u=pose(p);const near=Math.abs(kx-p.position.x)<5;p.position.y=0.24+(near?Math.abs(Math.sin(t*10))*0.6:0);if(near){u.armL.rotation.x=u.armR.rotation.x=-2.8;p.position.z=Math.max(p.position.z-0.02,-0.0+0.4)}});
  bubbleAt(c.ppl[0],t,[[0.2,9,'EY!!']]);bubbleAt(c.ppl[1],t,[[1.0,9,'mein eis!!']]);speed(0.5);
  lb([[MEB.name,1],['Kevin2012',2],['PizzaLord',3],['LindaGamer',4]],MEB.name,'Platz');const p=c.rig.position;
  shot(V(p.x+7,2.8,5.6),V(p.x-5,1.0,5.2),0.04,52,0.025,t)}};
S.hill={build(){world({traffic:false,peds:false});lights({target:[85,8,9],size:24});const rig=makeRider(MEB);add(rig);const kev=sportCar('#e53935');const drops=makeDrops(12);return {rig,kev,drops}},
 update(c,t,sc){const H=sc.huss;let n=-1;for(let i=0;i<H.length;i++)if(t>=H[i])n=i;const dt=n>=0?t-H[n]:9;const pulse=n>=0?Math.exp(-dt*8):0;
  const x=70+t*3.6+(n>=0?(n+easeOut(dt/0.3))*0.8:0);ride(c.rig,x,7.6,Math.PI/2,x*1.6,1);const ch=c.rig.userData.ch;setFace(ch,'strain');ch.userData.upper.rotation.x=0.4+0.25*pulse;
  onRoad(c.kev,x-11+t*1.8,10.8,Math.PI/2);c.rig.updateMatrixWorld(true);const hp=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(hp);updDrops(c.drops,t,H.length?H:[9],hp);speed(0.2+0.3*pulse);
  const p=c.rig.position;lb([[MEB.name,1],['Kevin2012',2],['PizzaLord',3],['LindaGamer',4]],MEB.name,'Platz');
  if(n<0)shot(V(p.x+8,p.y+2.6,p.z-4),V(p.x-4,p.y+1.2,9),0.05,50,0.015,t);
  else if(n%2===0)shot(V(p.x+3.5,p.y+1.0,p.z-1.8),V(p.x,p.y+1.5,p.z),0.1,44-9*pulse,0.01+0.06*pulse,t);else shot(V(p.x-2,p.y+2.8,p.z-6),V(p.x+0.5,p.y+1.3,p.z),-0.08,48-9*pulse,0.01+0.06*pulse,t)}};
S.duel={build(){world({traffic:false,peds:false});lights({target:[110,PLY-4,9],size:20});const rig=makeRider(MEB);add(rig);const kev=sportCar('#e53935');return {rig,kev}},
 update(c,t,sc){const x=100+t*4.4;ride(c.rig,x,7.6,Math.PI/2,x*1.8,1);setFace(c.rig.userData.ch,'strain');const kx=x-6+Math.min(6,t*2.6);onRoad(c.kev,kx,10.8,Math.PI/2);setFace(c.kev.userData.kev,'smug');
  const z10=wordT(sc,'Zehn'),z5=wordT(sc,'Fünf');const cur=t>=z5?'5 m':t>=z10?'10 m':null;const st=t>=z5?z5:z10;
  if(cur){bigEl.textContent=cur;bigEl.style.color='#fff';bigEl.style.opacity=String(Math.max(0,1-(t-st)*0.9));bigEl.style.transform=`scale(${1+0.4*Math.exp(-(t-st)*7)})`}
  speed(0.45);const p=c.rig.position;lb([[MEB.name,1],['Kevin2012',2],['PizzaLord',3],['LindaGamer',4]],MEB.name,'Platz');
  shot(V(p.x+8,p.y+2.6+2.2,9.2),V(p.x,p.y+1.2,9.2),Math.sin(t*2)*0.04,46,0.02,t)}};
S.twist={build(){const H=world({traffic:false,peds:false});lights({target:[RX1+8,PLY,9],size:16});const rig=makeRider(MEB);add(rig);const kev=sportCar('#e53935');const pg=makePigeon();add(pg);const smoke=makeSmoke(50);return {H,rig,kev,pg,smoke}},
 update(c,t,sc){const sl=t>0.5&&t<1.6;const tt2=t<0.5?t:0.5+(Math.min(t,1.6)-0.5)*0.35+Math.max(0,t-1.6);
  const x=RX1-1+tt2*4.6;ride(c.rig,x,7.6,Math.PI/2,x*1.8,0);setFace(c.rig.userData.ch,'shock');
  const jt=prog(tt2,0.25,0.75);const pz=lerp(1.5,10.8,easeOut(jt));const kxBase=RX1+1+Math.min(tt2,0.7)*7;const brake=prog(tt2,0.6,1.1);
  const kx=kxBase+(tt2>0.7?(1-Math.pow(1-clamp((tt2-0.7)/0.6),2))*2.5:0);onRoad(c.kev,kx,10.8,Math.PI/2,brake*0.7*Math.sin(clamp(brake)*Math.PI*0.9));setFace(c.kev.userData.kev,brake>0?'shock':'smug');
  c.pg.position.set(kx+4.2,PLY+0.12+Math.sin(Math.PI*jt)*1.6,pz);c.pg.rotation.y=Math.PI/2+0.4;pigeonPose(c.pg,t,{walk:jt<1?2:0,derp:0.4});
  updSmoke(c.smoke,t,V(kx-1.5,PLY+0.1,10.8),brake>0&&brake<1?1:0,-1);renderer.domElement.style.filter=sl?'saturate(1.3) contrast(1.1)':'';speed(sl?0:0.3);
  shot(V(RX1+4,PLY+3.2,20),V(RX1+8,PLY+1.0,8),0.04,sl?46:52,sl?0.003:0.015,t)}};
S.gb3=gbScene(()=>{world({traffic:false,peds:false});lights({target:[RX1+8,PLY,9],size:16});const kev=sportCar('#e53935');onRoad(kev,RX1+3.5,10.8,Math.PI/2,0.5);setFace(kev.userData.kev,'shock');
  const pg=makePigeon();add(pg);pg.position.set(RX1+7.7,PLY+0.12,10.8);pg.rotation.y=-Math.PI/2+0.3;return {pg,dir:V(0.6,0.12,0.9).normalize()}});
S.top={build(){const H=world({traffic:false,peds:false});lights({target:[RX1+10,PLY,9],size:14});const rig=makeRider({...MEB,face:'happy'});add(rig);const kev=sportCar('#e53935');onRoad(kev,RX1+3.5,10.8,Math.PI/2,0.5);setFace(kev.userData.kev,'sad');
  const pg=makePigeon();add(pg);pg.position.set(RX1+7.7,PLY+0.12,10.8);pg.rotation.y=-Math.PI/2+0.3;
  const rays=makeRays();scene.add(rays);const sparks=makeSparks();scene.add(sparks);const conf=makeConfetti();scene.add(conf);const gl=new THREE.PointLight('#ffb300',0,14,1.2);scene.add(gl);return {H,rig,rays,sparks,conf,gl,pg}},
 update(c,t,sc){const fx=c.H.fx;const tg=wordT(sc,'Erster');const ig=prog(t,tg,tg+0.4);const x=Math.min(fx+3,fx-3+t*6);const ch=c.rig.userData.ch;pigeonPose(c.pg,t,{});
  ride(c.rig,x,7.6,Math.PI/2,x*1.7,0);if(x>=fx+3){const u=ch.userData;u.upper.rotation.x=0;u.armL.rotation.set(-2.8,0,-0.2);u.armR.rotation.set(-2.8,0,0.2)}
  goldify(ch,ig>0?0.6+0.4*Math.sin(t*6):0);if(ig>0&&!c.bg){c.bg=1;c.rig.userData.bike.traverse(o=>{if(o.isMesh)o.material=ch.userData.gold})}
  ch.updateMatrixWorld(true);const hp=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(hp);
  c.rays.position.set(hp.x+2,hp.y-0.3,hp.z-1);c.rays.lookAt(camera.position);c.rays.rotateZ(t*0.35);c.rays.material.opacity=ig*0.7;c.rays.scale.setScalar(0.35+ig*0.2);
  c.sparks.material.opacity=ig;updSparks(c.sparks,t,hp.x,PLY,hp.z);c.conf.visible=x>fx;updConfetti(c.conf,t,hp.x,hp.y,hp.z);c.gl.position.set(hp.x-2,hp.y+1,hp.z+3);c.gl.intensity=ig*8;bloom.strength=ig*0.45;bloom.threshold=1.0;c.H.tr.rotation.y=t*1.5;
  lb([[MEB.name+' ★',1],['Kevin2012',2],['PizzaLord',3],['LindaGamer',4]],MEB.name+' ★','Platz');flashEl.style.background='#fff6d0';flashEl.style.opacity=String(Math.max(0,1-Math.abs(t-tg)*6)*0.9);
  const k=ease(prog(t,0,sc.dur));shot(V(fx+lerp(9,7,k),PLY+lerp(2.4,1.4,k),7.6+lerp(-6,-4.5,k)),V(Math.min(x,fx+3),PLY+1.6,7.6),lerp(0.04,-0.06,k),48,0.012,t)}};
function ceremony(){const H=world({traffic:false,peds:false});H.tr.visible=false;lights({target:[RX1+20,PLY,14],size:12});const pod=podium(RX1+20,PLY,15);
  const pg=makePigeon();add(pg);pg.position.set(RX1+20,PLY+2.2,15);pg.rotation.y=0.2;const tr=makeTrophy();tr.scale.setScalar(0.55);tr.position.set(0,2.05,0.42);pg.userData.headG.add(tr);tr.position.set(0,0.2,0);
  const me=makeR({...MEB,face:'sad'});me.position.set(RX1+17.6,PLY+1.5,15);me.rotation.y=0.3;add(me);goldify(me,0.6);
  const kv=makeR(npc(0,{name:'Kevin2012',face:'sad',hair:'cap',capColor:'#111',shirt:'#e53935'}));kv.position.set(RX1+22.4,PLY+1.0,15);kv.rotation.y=-0.3;add(kv);
  const conf=makeConfetti();scene.add(conf);const crowd=[];for(let i=0;i<6;i++){const ch=makeR(npc(i+3,{face:'laugh',name:null}));ch.position.set(RX1+15+i*2,PLY,21.5);ch.rotation.y=Math.PI;add(ch);crowd.push(ch)}
  return {pg,me,kv,conf,crowd,tr}}
S.ending={build(){return ceremony()},update(c,t,sc){pigeonPose(c.pg,t,{derp:0.25*Math.sin(t*2)});updConfetti(c.conf,t,RX1+20,PLY+4,15);c.crowd.forEach((p,i)=>{const u=pose(p);u.armL.rotation.x=u.armR.rotation.x=-2.7+Math.sin(t*8+i)*0.3});
  const u=pose(c.me);u.head.rotation.y=0.6;chat([[0.4,MEB.name,'???','#ffd54a'],[1.0,'Kevin2012','die taube??','#8fd3ff'],[1.6,'LindaGamer','GÜNTHER!!!','#f48fb1']],t);
  const k=ease(prog(t,0,sc.dur));shot(V(RX1+20+lerp(-2,0,k),PLY+lerp(3.6,4.0,k),15+lerp(7.5,5.2,k)),V(RX1+20,PLY+3.0,15),0.03,46,0.01,t)}};
S.gb4=gbScene(()=>{const c=ceremony();c.dir=V(0.25,0.1,1).normalize();return c});
const _gb4u=S.gb4.update;S.gb4.update=(c,t,sc)=>{_gb4u(c,t,sc);updConfetti(c.conf,t,RX1+20,PLY+4,15);fadeEl.style.opacity=String(prog(t,sc.dur-0.7,sc.dur-0.05))};

// ---------- driver
let TL=null,cur=-1,ctx=null;
window.setup=async(tl)=>{TL=tl;await document.fonts.load('900 40px P');await document.fonts.load('800 20px P');await document.fonts.ready;return true};
function resetScene(){MOVERS.length=0;scene=new THREE.Scene();rpass.scene=scene;bloom.strength=0;bloom.threshold=1.0;flashEl.style.opacity='0';fadeEl.style.opacity='0';vhsEl.style.display='none';renderer.domElement.style.filter='';bigEl.style.opacity='0';bigEl.style.color='#fff';chatEl.style.display='none';$('speed').style.opacity='0';$('card').style.display='none';lbEl.style.display='none';hudChat=hudLb=null}
window.renderAt=(T)=>{
  let i=TL.scenes.findIndex(s=>T>=s.start&&T<s.start+s.dur);if(i<0)i=TL.scenes.length-1;
  const sc=TL.scenes[i];const t=T-sc.start;
  if(i!==cur){resetScene();cur=i;ctx=S[sc.name].build(sc)}
  S[sc.name].update(ctx,t,sc);updMovers2(T);
  if(window.DBG){camera.up.set(0,1,0);camera.fov=50;camera.updateProjectionMatrix();camera.position.set(...window.DBG[0]);camera.lookAt(...window.DBG[1])}
  composer.render();
  let w=null;for(const x of sc.words){if(t>=x[1]&&t<x[2])w=x}
  if(w){capEl.textContent=w[0]==='HUSS'?'HUSS!':w[0]==='GOOD BOY'?'GOOD BOY!':w[0];const k=prog(t,w[1],w[1]+0.12);capEl.style.transform=`scale(${1+(w[0]==='HUSS'||w[0]==='GOOD BOY'?0.45:0.22)*(1-easeOut(k))}) rotate(${w[0]==='HUSS'?(sc.words.indexOf(w)%2?4:-4):w[0]==='GOOD BOY'?Math.sin(t*9)*5:0}deg)`;
    capEl.className=w[0]==='HUSS'?'huss':w[0]==='GOOD BOY'?'gb':(sc.name==='top'&&t>=wordT(sc,'Erster'))?'gold':''}
  else capEl.textContent='';
  return true;
};
window.__ready=true;
