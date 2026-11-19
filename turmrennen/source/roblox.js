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

// ---------- scenes
const S={};
function hopBetween(me,ka,kb,p,arc=1.3){const a=platTop(ka),b=platTop(kb);const pos=a.clone().lerp(b,p);pos.y+=Math.sin(Math.PI*p)*arc;me.position.copy(pos);me.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)}
S.hook={build(sc){city();lights({target:[0,24,-6],size:16});const T=tower({noShaft:true});const me=makeR(ME);add(me);const drops=makeDrops(18);bloom.strength=0.25;bloom.threshold=1.0;return {T,me,drops,k0:10}},
 update(c,t,sc){const H=sc.huss;let n=-1;for(let i=0;i<H.length;i++)if(t>=H[i])n=i;const me=c.me;const u=pose(me);
  let air=false,dt=n>=0?t-H[n]:9;const pulse=Math.exp(-dt*8);
  if(n<0){hopBetween(me,c.k0,c.k0+1,0);me.rotation.y=Math.atan2(platTop(c.k0+1).x-platTop(c.k0).x,platTop(c.k0+1).z-platTop(c.k0).z)}
  else{const nxt=(H[n+1]??H[n]+0.7);const d=Math.min(0.42,nxt-H[n]-0.05);const p=clamp(dt/d);hopBetween(me,c.k0+n,c.k0+n+1,p,1.1);air=p<1;if(air)jumpPose(me,Math.sin(Math.PI*p)*0.9+0.1);else{u.upper.position.y=1-0.12*Math.exp(-(dt-d)*12);u.legL.rotation.x=0.25*Math.exp(-(dt-d)*10)}}
  setFace(me,n>=0?'strain':'determined');
  me.updateMatrixWorld(true);const hp=new THREE.Vector3();u.headMesh.getWorldPosition(hp);updDrops(c.drops,t,H,hp);
  const radial=V(me.position.x-TW.x,0,me.position.z-TW.z).normalize();const tan=V(-radial.z,0,radial.x);
  const alt=n%2===0;const camPos=me.position.clone().add(radial.clone().multiplyScalar(alt?6.4:4.0)).add(tan.clone().multiplyScalar(alt?2.6:-1.5)).add(V(0,alt?2.2:5.5,0));
  shot(camPos,me.position.clone().add(V(0,alt?1.3:0.2,0)),alt?-0.08:0.1,52-9*pulse,0.01+0.07*pulse,t);
  leaderboard(null);chat([],t);}};
S.rewind={build(sc){city();lights({target:[0,10,-6],size:30});const T=tower();const me=makeR(ME);add(me);bloom.strength=0;vhsEl.style.display='block';
  renderer.domElement.style.filter='saturate(0.55) contrast(1.15) hue-rotate(-8deg)';return {T,me}},
 update(c,t,sc){const k=lerp(20,0,ease(t/(sc.dur*0.85)));const kk=Math.floor(k),f=k-kk;const me=c.me;pose(me);hopBetween(me,kk,Math.min(kk+1,PN),f,0.6);jumpPose(me,0.6);
  $('vbar').style.top=(((t*900)%1400)-100)+'px';
  shot(V(TW.x+24,22-t*6,TW.z+30),V(TW.x,lerp(26,8,ease(t/sc.dur)),TW.z),0.02*Math.sin(t*40),50,0.12,t*7)}};
S.lazy={build(){city();lights({target:[0,0,4],size:16});tower();
  const couch=(x,z,col,ry=0)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;const s=part(3.2,0.7,1.3,col,{studs:true});s.position.y=0.35;g.add(s);const b=part(3.2,1.1,0.35,col);b.position.set(0,1.05,-0.5);g.add(b);
    [-1.7,1.7].forEach(xx=>{const a=part(0.35,1.0,1.3,col);a.position.set(xx,0.6,0);g.add(a)});scene.add(g);return g};
  const lie=(ch,x,y,z,ry)=>{const pv=new THREE.Group();pv.position.set(x,y,z);pv.rotation.y=ry;ch.rotation.set(-Math.PI/2,0,0);ch.position.set(0,0.28,1.4);pv.add(ch);scene.add(pv)};
  const ppl=[];couch(-3.2,4,'#e53935',0.15);couch(3.6,3,'#1e88e5',-0.3);couch(0.2,-0.5,'#8e24aa',0);
  const a=makeR(npc(0,{face:'sleep'}));lie(a,-3.2,0.72,4,0.15+Math.PI/2);const b=makeR(npc(1,{face:'tired'}));lie(b,3.6,0.72,3,-0.3-Math.PI/2);
  const d=makeR(npc(4,{face:'sleep'}));lie(d,0.2,0.72,-0.5,Math.PI/2);
  const e=makeR(npc(5,{face:'tired'}));e.position.set(-0.5,0,7.2);e.rotation.set(-Math.PI/2,0,1.2);scene.add(e);
  ppl.push(a,b,d,e);bloom.strength=0;return {ppl}},
 update(c,t){c.ppl.forEach((p,i)=>{p.userData.upper.position.y=1+Math.sin(t*2+i)*0.02});bubbleAt(c.ppl[0],t,[[0.4,9,'zzz...']]);bubbleAt(c.ppl[1],t,[[0.8,9,'laufen? nö']]);bubbleAt(c.ppl[3],t,[[1.1,9,'zu müde']]);
  shot(lv(V(-17,5.5,17),V(-13,4.6,15),ease(t/1.9)),V(1,1,3.5),-0.04,50,0.015,t)}};
function houseSet(){const H={};const fl2=part(14,0.5,6,'#f5f5f5',{studs:true});fl2.position.set(0,4.25,-0.5);scene.add(fl2);
  const back=part(14,9,0.4,'#ffe0b2');back.position.set(0,4.5,-3.6);scene.add(back);[-7.2,7.2].forEach(x=>{const s=part(0.4,9,6.4,'#ffcc80');s.position.set(x,4.5,-0.5);scene.add(s)});
  const roof=part(15,0.6,7,'#e53935',{studs:true});roof.position.set(0,9.2,-0.5);scene.add(roof);
  // shaft
  const sh=part(3.2,9,2.8,'#bfe9ff',{glass:true,opacity:0.16});sh.position.set(-4,4.5,-1.6);scene.add(sh);
  const cab=makeCabin();cab.g.position.set(-4,0.1,-1.6);scene.add(cab.g);H.cab=cab;
  // stairs
  H.steps=[];for(let i=0;i<10;i++){const s=part(1.6,0.42*(i+1),0.9,'#90a4ae',{studs:true});s.position.set(2.4+0,0.21*(i+1),2.0-i*0.5);s.scale.set(1,1,1);scene.add(s)}
  const ls=(txt,x,y,z,col)=>{const t=ctex(512,128,g=>{g.fillStyle=col;g.fillRect(0,0,512,128);g.fillStyle='#fff';g.font='900 72px P';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,256,68)});
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2.4,0.6),new THREE.MeshStandardMaterial({map:t}));m.position.set(x,y,z);scene.add(m)};
  ls('AUFZUG',-4,3.4,-3.38,'#1e88e5');ls('TREPPE',2.6,3.4,-3.38,'#43a047');
  const lamp=part(1,0.1,1,'#fffde7',{neon:true,ei:0.6});lamp.position.set(0,8.8,-0.5);scene.add(lamp);
  return H}
function stairPos(i){return V(2.4,0.42*(i+1),2.0-i*0.5)}
S.elevator={build(){city({traffic:true});lights({target:[0,3,0],size:14});const Hh=houseSet();const ppl=[];
  for(let i=0;i<4;i++){const ch=makeR(npc(i+2,{face:i%2?'tired':'smile',name:i===0?'Aufzug_Fan':null}));ch.position.set(-4.6+(i%2)*1.1,0.2,-2.1+Math.floor(i/2)*0.9);ch.scale.setScalar(0.92);Hh.cab.g.add(ch);ch.position.y=0.1;ppl.push(ch)}
  bloom.strength=0;return {Hh,ppl}},
 update(c,t,sc){const y=lerp(0.1,4.6,ease(prog(t,0.3,sc.dur-0.5)));c.Hh.cab.g.position.y=y;c.ppl.forEach((p,i)=>{p.position.set((i%2)*1.0-0.5,0.1,-0.5+Math.floor(i/2)*0.8);p.rotation.y=0})
  ;bubbleAt(c.ppl[0],t,[[wordT(sc,'ersten'),9,'endlich oben']]);bigEl.style.opacity='0';
  shot(lv(V(0,3.6,17),V(-0.5,4.0,15),ease(t/sc.dur)),V(-1.8,3.4,-1.2),0.03,52,0.012,t)}};
S.stairs={build(){scene.background=skyTex(SKY);city({skip:(x,z)=>Math.abs(x)<26&&z<-20});lights({target:[0,10,0],size:20});const me=makeR(ME);add(me);
  const steps=[];for(let i=0;i<60;i++){const s=part(2.2,0.4,0.8,i%10===9?'#43a047':'#90a4ae',{studs:true});s.position.set(0,0.2+i*0.4,-i*0.7);steps.push(s);scene.add(s);
    const sup=part(2.2,0.2+i*0.4,0.8,'#cfd8dc');sup.position.set(0,(0.2+i*0.4)/2-0.1,-i*0.7);sup.castShadow=false;scene.add(sup)}
  const drops=makeDrops(8);bloom.strength=0;return {me,drops}},
 update(c,t,sc){const me=c.me;pose(me);const s=t*6.5;const i=Math.floor(s),f=s-i;const a=V(0,0.4+i*0.4,-i*0.7),b=V(0,0.4+(i+1)*0.4,-(i+1)*0.7);
  me.position.copy(a.lerp(b,f));me.position.y+=Math.sin(f*Math.PI)*0.12;me.rotation.y=Math.PI;walk(me,t,17,0.9);me.userData.upper.rotation.x=0.18;setFace(me,'strain');
  me.updateMatrixWorld(true);const hp=new THREE.Vector3();me.userData.headMesh.getWorldPosition(hp);updDrops(c.drops,t,[0.3,0.9,1.5,2.1],hp);
  const n=Math.floor(t*6.5);leaderboard([[ME.name,9800+n],['Kevin2012',3],['LindaGamer',1],['Aufzug_Fan',0]],ME.name);
  const day=Math.floor(prog(t,wordT(sc,'Jeden'),sc.dur)*6)%2;scene.background=day?new THREE.Color('#12204a'):skyTex(SKY);
  shot(me.position.clone().add(V(5.5,2.6,2.4)),me.position.clone().add(V(0,1.3,-0.8)),0.04,50,0.02,t)}};
S.neighbor={build(){city();lights({target:[0,3,0],size:14});const Hh=houseSet();Hh.cab.g.position.y=4.6;
  const me=makeR(ME);me.position.copy(stairPos(9));me.position.y+=0.42*1-0.21+0.02;add(me);
  const nb=makeR(npc(4,{name:'Bernd_derNachbar',suit:true,shirt:'#37474f',face:'smug',hair:'long',hairColor:'#8d4a2b'}));nb.position.set(-4,4.5,0.6);add(nb);bloom.strength=0;return {Hh,me,nb}},
 update(c,t,sc){const me=c.me;const u=pose(me);me.position.copy(stairPos(9));me.position.y=4.5;me.position.x=1.6;me.rotation.y=-0.7;u.upper.rotation.x=0.45+Math.sin(t*9)*0.05;u.armL.rotation.x=u.armR.rotation.x=-0.5;setFace(me,'tired');
  const nb=c.nb;const v=pose(nb);nb.position.set(lerp(-4,-2.2,ease(prog(t,0,0.9))),4.5,0.4);nb.rotation.y=0.9;walk(nb,t,7,0.4*(1-prog(t,0.8,1)));if(t>1)v.armR.rotation.x=-1.5;
  bubbleAt(nb,t,[[wordT(sc,'Treppen'),9,'Treppen sind für Noobs lol']]);
  chat([[wordT(sc,'Treppen'),'Bernd_derNachbar','treppen sind für noobs lol','#ffb74d']],t);
  shot(lv(V(-1.2,7.2,11.5),V(-0.8,6.6,9.5),ease(t/sc.dur)),V(-1.0,5.6,0),-0.03,48,0.012,t)}};
function crowdAround(n,cx,cz,r0=3.2,face='laugh'){const arr=[];for(let i=0;i<n;i++){const a=-1.2+i/(n-1)*2.4;const r=r0+(i%2)*1.1;const ch=makeR(npc(i,{face}));ch.position.set(cx+Math.sin(a)*r,0,cz+Math.cos(a)*r);ch.rotation.y=Math.atan2(cx-ch.position.x,cz-ch.position.z);add(ch);arr.push(ch)}return arr}
S.tower={build(){city();lights({target:[0,16,-6],size:24});const T=tower();
  const crowd=[];for(let i=0;i<12;i++){const ch=makeR(npc(i));ch.position.set(-7+i*1.3+(i%2)*0.3,0,6+(i%3)*1.4);ch.rotation.y=Math.PI+(i%2?0.2:-0.2);add(ch);crowd.push(ch)}
  const me=makeR(ME);me.position.set(3.2,0,4);me.rotation.y=Math.PI;add(me);bloom.strength=0.2;bloom.threshold=1.0;return {T,crowd,me}},
 update(c,t,sc){c.crowd.forEach((ch,i)=>{const u=pose(ch);u.head.rotation.x=-0.3;if(i%3===0)u.armR.rotation.x=-2.6});pose(c.me).head.rotation.x=-0.3;
  c.T.trophy.rotation.y=t;leaderboard([['Kevin2012',0],['LindaGamer',0],[ME.name,0],['Aufzug_Fan',0]],ME.name);
  const k=ease(prog(t,0.1,sc.dur-0.2));shot(V(lerp(6,4,k),lerp(3,12,k),lerp(20,26,k)),V(TW.x,lerp(4,30,k),TW.z),0.03,lerp(50,46,k),0.015,t)}};
S.laugh={build(){city();lights({target:[0,0,4],size:14});tower();const me=makeR({...ME,face:'sad'});me.position.set(0,0,5);add(me);const crowd=crowdAround(6,0,5);bloom.strength=0;return {me,crowd}},
 update(c,t,sc){pose(c.me);c.crowd.forEach((p,i)=>{const u=pose(p);const b=Math.abs(Math.sin(t*9+i));u.upper.rotation.x=-0.15+b*0.25;u.upper.position.y=1+b*0.05;if(i%2===0)u.armR.rotation.set(-1.5,0,0);else{u.armL.rotation.z=-0.5-b*0.3;u.armR.rotation.z=0.5+b*0.3}});
  const tD=wordT(sc,'Der');const tG=wordT(sc,'Gegen');const tN=wordT(sc,'Niemals');
  bubbleAt(c.crowd[0],t,[[0.2,9,'LOL']]);bubbleAt(c.crowd[2],t,[[tD,9,'der?? XD']]);bubbleAt(c.crowd[4],t,[[tG,9,'gegen den aufzug?']]);bubbleAt(c.crowd[5],t,[[tN,9,'niemals 💀'.replace('💀','')]]);
  chat([[0.2,'Kevin2012','LOL'],[tD-0.1,'LindaGamer','der?? xD','#f48fb1'],[tG,'chillmaxx','gegen den aufzug??','#a5d6a7'],[tN,'PizzaLord','niemals','#ffcc80']],t);
  leaderboard([['Kevin2012',0],['LindaGamer',0],[ME.name,0],['Aufzug_Fan',0]],ME.name);
  const a=lerp(0.7,-0.4,ease(t/sc.dur));shot(V(Math.sin(a)*8,3.4,5+Math.cos(a)*8),V(0,1.9,5),0.04,48,0.02,t)}};
S.start={build(){city();lights({target:[0,4,-2],size:20});const T=tower();const crowd=[];for(let i=0;i<10;i++){const ch=makeR(npc(i));ch.position.set(-4+i*1.0,0,7+(i%3)*1.2);ch.rotation.y=Math.PI;add(ch);crowd.push(ch)}
  const me=makeR(ME);me.position.set(4.5,0,6);me.rotation.y=Math.PI;add(me);bloom.strength=0;return {T,crowd,me}},
 update(c,t,sc){const go=wordT(sc,'Startschuss');const r=Math.max(0,t-go-0.2);
  bigEl.textContent='LOS!';bigEl.style.opacity=String(Math.max(0,1-Math.abs(t-go-0.35)*2.2));bigEl.style.transform=`scale(${1+0.3*Math.exp(-(t-go)*6)})`;
  const door=V(TW.x+2,0,c.T.shaftZ+1.6);c.crowd.forEach((ch,i)=>{const u=pose(ch);if(r>0){const st=V(-4+i*1.0,0,7+(i%3)*1.2);const p=Math.min(1,r*3.2/st.distanceTo(door));ch.position.copy(st.lerp(door,p));ch.position.x+=(i%3-1)*0.5*p;ch.rotation.y=Math.atan2(door.x-ch.position.x,door.z-ch.position.z);walk(ch,t+i,13,0.9*(p<1?1:0.2))}});
  const me=c.me;pose(me);if(r>0){const a=V(4.5,0,6),b=platTop(0).clone();b.y=0;const p=Math.min(1,r*4/a.distanceTo(b));me.position.copy(a.lerp(b,p));me.rotation.y=Math.atan2(platTop(0).x-me.position.x,platTop(0).z-me.position.z);walk(me,t,14,0.9);setFace(me,'determined')}
  c.T.cab.g.position.y=0.1;
  shot(lv(V(2,5,20),V(3,6,16),ease(t/sc.dur)),V(2,2,0),-0.04,50,0.02,t)}};
S.blackout={build(){city();lights({target:[2,10,-1],size:12});const T=tower();const ppl=[];
  for(let i=0;i<6;i++){const ch=makeR(npc(i,{face:'smile',name:null}));ch.scale.setScalar(0.8);ch.position.set(-0.8+(i%3)*0.8,0.1,-0.5+Math.floor(i/3)*0.8);T.cab.g.add(ch);ppl.push(ch)}
  bloom.strength=0.3;bloom.threshold=1.0;return {T,ppl}},
 update(c,t,sc){const off=wordT(sc,'Stromausfall');const cab=c.T.cab;const dead=t>=off;
  const y=dead?12+Math.exp(-(t-off)*10)*Math.sin((t-off)*40)*0.15:lerp(8,12,t/Math.max(0.1,off));cab.g.position.y=y;
  cab.light.intensity=dead?0:4;cab.panel.material.color.set(dead?'#222':'#fffbe6');cab.alarm.intensity=dead?(Math.sin((t-off)*10)>0?8:0):0;
  c.ppl.forEach((p,i)=>{pose(p);setFace(p,dead?'shock':'smile');if(dead)p.userData.armL.rotation.x=p.userData.armR.rotation.x=-2.6*Math.max(0,Math.sin(t*8+i))});
  if(dead){bubbleAt(c.ppl[0],t,[[off+0.2,9,'???']]);bubbleAt(c.ppl[4],t,[[off+0.5,9,'lag??']])}
  chat(dead?[[off+0.15,'Kevin2012','????'],[off+0.4,'LindaGamer','lag??','#f48fb1'],[off+0.7,'Aufzug_Fan','HILFE','#ffcc80']]:[],t);
  const cp=cab.g.position;shot(V(cp.x+3.4,cp.y+2.2,cp.z+6),V(cp.x,cp.y+1.5,cp.z),0.05,46,0.01+(dead?0.08*Math.exp(-(t-off)*4):0),t)}};
S.climb={build(){city();lights({target:[0,14,-6],size:24});const T=tower();T.cab.g.position.y=12;T.cab.light.intensity=0;T.cab.panel.material.color.set('#222');
  for(let i=0;i<6;i++){const ch=makeR(npc(i,{face:'shock',name:null}));ch.scale.setScalar(0.8);ch.position.set(-0.8+(i%3)*0.8,0.1,-0.5+Math.floor(i/3)*0.8);T.cab.g.add(ch)}
  const me=makeR(ME);add(me);bloom.strength=0;return {T,me}},
 update(c,t,sc){const s=t*3.2;const k=Math.floor(s),f=s-k;const me=c.me;pose(me);const kk=Math.min(k,PN-1);hopBetween(me,kk,Math.min(kk+1,PN-1),Math.min(1,f*1.6),1.1);if(f*1.6<1)jumpPose(me,0.8);setFace(me,'strain');
  c.T.cab.alarm.intensity=Math.sin(t*10)>0?8:0;
  leaderboard([[ME.name,kk+1],['Kevin2012',0],['LindaGamer',0],['Aufzug_Fan',0]],ME.name);
  const mp=me.position;shot(V(TW.x+16,mp.y+3,TW.z+20),V(TW.x+1,mp.y+0.5,TW.z+1),0.02,46,0.015,t)}};
S.top={build(sc){city();lights({target:[0,34,-6],size:12});const T=tower();const me=makeR({...ME,face:'happy'});add(me);
  const rays=makeRays();scene.add(rays);const sparks=makeSparks();scene.add(sparks);const conf=makeConfetti();scene.add(conf);
  const gl=new THREE.PointLight('#ffb300',0,14,1.2);scene.add(gl);return {T,me,rays,sparks,conf,gl}},
 update(c,t,sc){const me=c.me;const u=pose(me);const tg=wordT(sc,'Der');const ig=prog(t,tg,tg+0.5);
  const land=0.5;if(t<land){hopBetween(me,PN-1,PN,t/land,1.4);jumpPose(me,0.8)}else{const p=platTop(PN);me.position.set(p.x,p.y+(ig>0?Math.sin(t*2.2)*0.08+0.3*easeOut(ig):0),p.z);me.rotation.y=0.3;}
  if(t>=land){if(ig>0){u.armL.rotation.set(-2.8,0,-0.2);u.armR.rotation.set(-2.8,0,0.2)}else{u.armR.rotation.x=-2.6*Math.max(0,Math.sin((t-land)*6))}}
  setFace(me,t<tg?'happy':'happy');goldify(me,ig>0?0.6+0.4*Math.sin(t*6):0);
  me.updateMatrixWorld(true);const hp=new THREE.Vector3();u.headMesh.getWorldPosition(hp);
  c.rays.position.set(hp.x,hp.y-0.3,hp.z-3);c.rays.lookAt(camera.position);c.rays.rotateZ(t*0.35);c.rays.material.opacity=ig*0.7;c.rays.scale.setScalar(0.35+ig*0.2);
  c.sparks.material.opacity=ig;updSparks(c.sparks,t,hp.x,me.position.y,hp.z);c.conf.visible=t>land;updConfetti(c.conf,t,hp.x,hp.y,hp.z);c.gl.position.set(hp.x+1,hp.y+1,hp.z+3);c.gl.intensity=ig*8;
  bloom.strength=ig*0.45;bloom.threshold=1.0;c.T.trophy.rotation.y=t*1.5;
  leaderboard([[ME.name+' ★','21'],['Kevin2012',0],['LindaGamer',0],['Aufzug_Fan',0]],ME.name+' ★');
  flashEl.style.background='#fff6d0';flashEl.style.opacity=String(Math.max(0,1-Math.abs(t-tg)*6)*0.9);
  const p=platTop(PN);const k=ease(prog(t,0,sc.dur));shot(V(p.x+lerp(5,3.2,k),p.y+lerp(2.6,1.4,k),p.z+lerp(7,5,k)),V(p.x,p.y+1.6,p.z),lerp(0.04,-0.06,k),48,0.012,t)}};
S.ending={build(){city();lights({target:[2,12,-1],size:14});const T=tower();T.cab.g.position.y=12;T.cab.light.intensity=0;T.cab.panel.material.color.set('#222');
  const ppl=[];for(let i=0;i<6;i++){const ch=makeR(npc(i,{face:'sad',name:null}));ch.scale.setScalar(0.8);ch.position.set(-0.8+(i%3)*0.8,0.1,-0.5+Math.floor(i/3)*0.8);T.cab.g.add(ch);ppl.push(ch)}
  const me=makeR({...ME,face:'happy'});const p=platTop(PN);me.position.copy(p);me.rotation.y=0.6;add(me);goldify(me,0.7);const rays=makeRays();scene.add(rays);rays.material.opacity=0.55;
  bloom.strength=0.3;bloom.threshold=1.0;return {T,ppl,me,rays}},
 update(c,t,sc){c.ppl.forEach((p,i)=>{const u=pose(p);if(i%2)u.armR.rotation.x=-2.6+Math.sin(t*6+i)*0.3});c.T.cab.alarm.intensity=Math.sin(t*10)>0?6:0;
  bubbleAt(c.ppl[0],t,[[0.4,9,'hilfe']]);bubbleAt(c.ppl[4],t,[[1.0,9,'kann uns wer holen??']]);
  chat([[0.3,'Kevin2012','hilfe'],[0.9,'LindaGamer','kann uns wer holen??','#f48fb1'],[1.5,'Aufzug_Fan','ich hab hunger','#ffcc80'],[2.2,ME.name,'gg','#ffd54a']],t);
  const u=pose(c.me);u.armR.rotation.x=-2.7+Math.sin(t*7)*0.3;const hp=new THREE.Vector3();u.headMesh.getWorldPosition(hp);c.rays.position.set(hp.x,hp.y,hp.z-2);c.rays.lookAt(camera.position);c.rays.rotateZ(t*0.3);c.rays.scale.setScalar(0.35);
  const cp=c.T.cab.g.position;const k=ease(prog(t,1.3,sc.dur-0.6));
  shot(lv(V(cp.x+3.2,cp.y+1.8,cp.z+6),V(cp.x+9,cp.y+8,cp.z+22),k),lv(V(cp.x,cp.y+1.5,cp.z),V(TW.x,TW.h-2,TW.z),k),0.04,lerp(46,52,k),0.01,t);
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
