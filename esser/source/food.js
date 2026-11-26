import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const W=720,H=1280;
const renderer=new THREE.WebGLRenderer({canvas:document.getElementById('c'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(W,H);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(50,W/H,0.1,600);
let scene=new THREE.Scene();
const composer=new EffectComposer(renderer);
const rpass=new RenderPass(scene,camera);composer.addPass(rpass);
const bloom=new UnrealBloomPass(new THREE.Vector2(W/2,H/2),0,0.5,0.8);composer.addPass(bloom);
composer.addPass(new OutputPass());
const pmrem=new THREE.PMREMGenerator(renderer);
const envTex=pmrem.fromScene(new RoomEnvironment(),0.04).texture;

const capEl=document.getElementById('cap'),flashEl=document.getElementById('flash'),fadeEl=document.getElementById('fade');

// ---------- utils
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const easeOut=t=>1-Math.pow(1-clamp(t),3);
const easeIn=t=>Math.pow(clamp(t),2);
const prog=(t,a,b)=>clamp((t-a)/(b-a));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const matCache={};
function M(color,o={}){return new THREE.MeshStandardMaterial({color,roughness:o.r??0.85,metalness:o.m??0,...(o.extra||{})})}
function box(w,h,d,mat,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=shadow;m.receiveShadow=true;return m}
function ctex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.userData.c=c;t.userData.g=g;return t}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function add(...o){o.forEach(x=>scene.add(x));return o[0]}

// ---------- faces
const faceCache={};
function faceTex(skin,expr){
  const k=skin+expr;if(faceCache[k])return faceCache[k];
  const t=ctex(128,128,(g)=>{
    g.fillStyle=skin;g.fillRect(0,0,128,128);
    g.strokeStyle='#111';g.fillStyle='#111';g.lineCap='round';g.lineWidth=6;
    const eye=(x,y,w=11,h=17)=>{g.beginPath();g.ellipse(x,y,w/2,h/2,0,0,7);g.fill()};
    const brow=(x1,y1,x2,y2)=>{g.lineWidth=5;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.lineWidth=6};
    const arc=(x,y,r,a0,a1)=>{g.beginPath();g.arc(x,y,r,a0,a1);g.stroke()};
    switch(expr){
      case 'neutral':eye(42,60);eye(86,60);brow(32,42,52,44);brow(76,44,96,42);g.beginPath();g.moveTo(54,92);g.lineTo(74,92);g.stroke();break;
      case 'tired':
        g.strokeStyle='rgba(90,40,110,.55)';g.lineWidth=5;arc(42,70,11,0.2,Math.PI-0.2);arc(86,70,11,0.2,Math.PI-0.2);g.strokeStyle='#111';g.lineWidth=6;
        g.beginPath();g.ellipse(42,62,6,5,0,0,7);g.fill();g.beginPath();g.ellipse(86,62,6,5,0,0,7);g.fill();
        brow(31,55,53,55);brow(75,55,97,55);g.beginPath();g.moveTo(54,95);g.lineTo(72,93);g.stroke();break;
      case 'smile':eye(42,60);eye(86,60);brow(32,42,52,40);brow(76,40,96,42);arc(64,82,16,0.3,Math.PI-0.3);break;
      case 'happy':arc(42,64,9,Math.PI+0.3,-0.3);arc(86,64,9,Math.PI+0.3,-0.3);g.fillStyle='#3a1010';g.beginPath();g.arc(64,86,16,0,Math.PI);g.closePath();g.fill();break;
      case 'laugh':arc(42,62,9,Math.PI+0.3,-0.3);arc(86,62,9,Math.PI+0.3,-0.3);brow(32,44,52,40);brow(76,40,96,44);
        g.fillStyle='#4a1010';g.beginPath();g.moveTo(44,82);g.lineTo(84,82);g.quadraticCurveTo(84,112,64,112);g.quadraticCurveTo(44,112,44,82);g.fill();
        g.fillStyle='#e46';g.beginPath();g.ellipse(64,104,10,5,0,0,7);g.fill();g.fillStyle='#fff';g.fillRect(48,82,32,6);break;
      case 'sleep':arc(42,58,9,0.3,Math.PI-0.3);arc(86,58,9,0.3,Math.PI-0.3);g.beginPath();g.ellipse(64,94,5,6,0,0,7);g.fill();break;
      case 'shock':g.fillStyle='#fff';g.beginPath();g.arc(42,60,12,0,7);g.fill();g.stroke();g.beginPath();g.arc(86,60,12,0,7);g.fill();g.stroke();
        g.fillStyle='#111';g.beginPath();g.arc(42,60,4,0,7);g.fill();g.beginPath();g.arc(86,60,4,0,7);g.fill();brow(30,38,52,34);brow(76,34,98,38);
        g.beginPath();g.ellipse(64,96,9,12,0,0,7);g.fill();break;
      case 'smug':g.beginPath();g.ellipse(42,62,7,5,0,0,7);g.fill();g.beginPath();g.ellipse(86,62,7,5,0,0,7);g.fill();brow(30,52,54,54);brow(74,46,98,40);
        g.beginPath();g.moveTo(50,92);g.quadraticCurveTo(70,96,82,84);g.stroke();break;
      case 'determined':eye(42,62);eye(86,62);brow(30,44,54,52);brow(74,52,98,44);g.beginPath();g.moveTo(50,92);g.quadraticCurveTo(64,98,78,92);g.stroke();break;
      case 'sad':eye(42,62);eye(86,62);brow(30,52,52,46);brow(76,46,98,52);arc(64,104,14,Math.PI+0.5,-0.5);break;
      case 'strain':g.lineWidth=7;g.beginPath();g.moveTo(32,52);g.lineTo(50,60);g.lineTo(32,68);g.stroke();g.beginPath();g.moveTo(96,52);g.lineTo(78,60);g.lineTo(96,68);g.stroke();
        brow(28,40,54,50);brow(74,50,100,40);g.fillStyle='#fff';g.fillRect(44,84,40,18);g.strokeStyle='#111';g.lineWidth=4;g.strokeRect(44,84,40,18);g.beginPath();g.moveTo(44,93);g.lineTo(84,93);g.moveTo(54,84);g.lineTo(54,102);g.moveTo(64,84);g.lineTo(64,102);g.moveTo(74,84);g.lineTo(74,102);g.stroke();
        g.fillStyle='rgba(220,40,40,.35)';g.beginPath();g.ellipse(28,82,10,6,0,0,7);g.fill();g.beginPath();g.ellipse(100,82,10,6,0,0,7);g.fill();break;
      case 'annoyed':g.beginPath();g.ellipse(42,62,7,6,0,0,7);g.fill();g.beginPath();g.ellipse(86,62,7,6,0,0,7);g.fill();brow(30,48,54,54);brow(74,54,98,48);g.beginPath();g.moveTo(52,94);g.lineTo(76,94);g.stroke();break;
    }
  });
  faceCache[k]=t;return t;
}
function shirtTex(color,o){
  return ctex(128,128,(g)=>{g.fillStyle=color;g.fillRect(0,0,128,128);
    if(o.hoodie){g.fillStyle='rgba(0,0,0,.18)';rr(g,30,70,68,34,10);g.fill();g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=3;g.beginPath();g.moveTo(54,4);g.lineTo(52,40);g.moveTo(74,4);g.lineTo(76,40);g.stroke()}
    if(o.suit){g.fillStyle='#fff';g.beginPath();g.moveTo(40,0);g.lineTo(88,0);g.lineTo(64,70);g.fill();g.fillStyle=o.tie||'#c62828';g.beginPath();g.moveTo(58,6);g.lineTo(70,6);g.lineTo(74,70);g.lineTo(64,84);g.lineTo(54,70);g.fill();
      g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=3;g.beginPath();g.moveTo(40,0);g.lineTo(64,90);g.lineTo(88,0);g.stroke()}
    if(o.text){g.fillStyle=o.textColor||'#fff';g.font=`900 ${o.textSize||46}px P`;g.textAlign='center';g.textBaseline='middle';g.fillText(o.text,64,66)}
  });
}

// ---------- badge
function drawBadge(g,val,style){
  g.clearRect(0,0,128,128);
  let fill='#fff',txt='#111',ring='#111';
  if(style==='red'){fill='#e53935';txt='#fff';ring='#fff'}
  if(style==='gold'){const gr=g.createRadialGradient(50,40,5,64,64,60);gr.addColorStop(0,'#fff6c0');gr.addColorStop(.5,'#ffcf3a');gr.addColorStop(1,'#d18a00');fill=gr;txt='#5a3300';ring='#fff3b0'}
  g.beginPath();g.arc(64,64,56,0,7);g.fillStyle=fill;g.fill();g.lineWidth=8;g.strokeStyle=ring;g.stroke();
  const s=String(val);g.fillStyle=txt;g.textAlign='center';g.textBaseline='middle';
  g.font=`900 ${s.length>2?48:s==='∞'?92:72}px P`;
  if(s==='∞'){g.font='900 96px sans-serif'}
  g.fillText(s,64,s==='∞'?60:70);
}
function makeBadge(val,style){
  const t=ctex(128,128,g=>drawBadge(g,val,style));
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:t,toneMapped:false,depthWrite:false}));
  sp.scale.set(0.55,0.55,1);sp.userData={val,style,t};sp.renderOrder=5;return sp;
}
function setBadge(ch,val,style){const b=ch.userData.badge;if(!b)return;if(b.userData.val===val&&b.userData.style===style)return;
  b.userData.val=val;b.userData.style=style;drawBadge(b.userData.t.userData.g,val,style);b.userData.t.needsUpdate=true}

// ---------- characters
function makeChar(o={}){
  const c={skin:'#f2c79b',shirt:'#2e7d32',pants:'#1f1f24',hair:'#3a2618',hairStyle:'spiky',face:'neutral',seed:1,badge:null,badgeStyle:null,shirtOpts:{},armColor:null,...o};
  const root=new THREE.Group();
  const skinM=M(c.skin),shirtM=M(c.shirt),pantsM=M(c.pants),shoeM=M('#151515');
  const mk=(x)=>{const g=new THREE.Group();g.position.set(x,1,0);const l=box(0.48,0.9,0.5,pantsM);l.position.y=-0.45;g.add(l);const s=box(0.5,0.14,0.58,shoeM);s.position.set(0,-0.93,0.04);g.add(s);root.add(g);return g};
  const legL=mk(-0.25),legR=mk(0.25);
  const upper=new THREE.Group();upper.position.y=1;root.add(upper);
  const front=new THREE.MeshStandardMaterial({map:shirtTex(c.shirt,c.shirtOpts),roughness:.85});
  const torso=box(1,1,0.5,[shirtM,shirtM,shirtM,shirtM,front,shirtM]);torso.position.y=0.5;upper.add(torso);
  const armM=c.armColor?M(c.armColor):shirtM;
  const mkArm=(x)=>{const g=new THREE.Group();g.position.set(x,0.95,0);const s=box(0.46,0.72,0.48,armM);s.position.y=-0.34;g.add(s);const h=box(0.44,0.28,0.46,skinM);h.position.y=-0.84;g.add(h);upper.add(g);return g};
  const armL=mkArm(-0.74),armR=mkArm(0.74);
  const head=new THREE.Group();head.position.y=1.0;upper.add(head);
  const faceMat=new THREE.MeshStandardMaterial({map:faceTex(c.skin,c.face),roughness:.8});
  const headMesh=box(0.86,0.86,0.86,[skinM,skinM,skinM,skinM,faceMat,skinM]);headMesh.position.y=0.47;head.add(headMesh);
  const hairM=M(c.hair,{r:.9});const R=rng(c.seed*977+3);
  const hb=(w,h,d,x,y,z,rx=0,ry=0,rz=0)=>{const b=box(w,h,d,hairM);b.position.set(x,y,z);b.rotation.set(rx,ry,rz);head.add(b);return b};
  if(c.hairStyle!=='bald'&&c.hairStyle!=='cap'){
    hb(0.94,0.2,0.94,0,0.92,0);hb(0.94,0.55,0.16,0,0.66,-0.4);hb(0.16,0.4,0.9,-0.44,0.72,-0.02);hb(0.16,0.4,0.9,0.44,0.72,-0.02);
    if(c.hairStyle==='spiky'){for(let i=0;i<14;i++){const s=0.22+R()*0.2;hb(s,s,s,(R()-.5)*0.85,0.98+R()*0.16,(R()-.5)*0.85,R()*1.5,R()*1.5,R()*1.5)}
      for(let i=0;i<4;i++){hb(0.24,0.24,0.24,-0.3+i*0.2,0.84,0.42,0.6,0.3*i,0.5)}}
    if(c.hairStyle==='curly'){const sm=new THREE.IcosahedronGeometry(0.17,0);for(let i=0;i<20;i++){const m=new THREE.Mesh(sm,hairM);m.castShadow=true;const a=R()*6.28,r=R()*0.42;m.position.set(Math.cos(a)*r,0.98+R()*0.14,Math.sin(a)*r);head.add(m)}
      for(let i=0;i<5;i++){const m=new THREE.Mesh(sm,hairM);m.position.set(-0.36+i*0.18,0.86,0.42);head.add(m)}}
    if(c.hairStyle==='side'){hb(0.94,0.22,0.3,0.05,0.86,0.36,0.25,0,-0.12)}
  }
  if(c.hairStyle==='cap'){const capM=M(c.hair);const cb=box(0.96,0.3,0.96,capM);cb.position.y=0.98;head.add(cb);const br=box(0.9,0.06,0.5,capM);br.position.set(0,0.86,-0.62);head.add(br)}
  let badge=null;if(c.badge!==null){badge=makeBadge(c.badge,c.badgeStyle);badge.position.y=1.55;head.add(badge)}
  root.userData={legL,legR,upper,armL,armR,head,headMesh,faceMat,c,badge,mats:[skinM,shirtM,pantsM,front,faceMat,hairM,armM]};
  return root;
}
function setFace(ch,e){const u=ch.userData;if(u.face===e)return;u.face=e;u.faceMat.map=faceTex(u.skinOverride||u.c.skin,e);u.faceMat.needsUpdate=true}
function pose(ch){const u=ch.userData;[u.legL,u.legR,u.armL,u.armR,u.head,u.upper].forEach(o=>o.rotation.set(0,0,0));u.upper.position.set(0,1,0);return u}
function walk(ch,t,spd=9,amp=0.55){const u=ch.userData,s=Math.sin(t*spd)*amp;u.legL.rotation.x=s;u.legR.rotation.x=-s;u.armL.rotation.x=-s*.8;u.armR.rotation.x=s*.8;u.upper.position.y=1+Math.abs(Math.cos(t*spd))*0.05}
function sit(ch){const u=ch.userData;u.legL.rotation.x=u.legR.rotation.x=-Math.PI/2}
function holdPhone(ch,phone,t=0,lookDown=true){
  const u=ch.userData;u.armR.rotation.set(-1.25,0,-0.32);u.armL.rotation.set(-0.15,0,0.08);
  if(!phone.parent||phone.parent!==u.upper){u.upper.add(phone)}
  phone.position.set(0.42,0.78,0.92);
  if(lookDown)u.head.rotation.x=0.32;
  const hp=new THREE.Vector3();u.headMesh.getWorldPosition(hp);ch.updateMatrixWorld(true);phone.lookAt(hp);
  // thumb scroll wiggle
  u.armR.rotation.x+=Math.sin(t*14)*0.02;
}
function goldify(ch,amt){
  const u=ch.userData;
  if(!u.gold){u.gold=M('#ffc93c',{r:.25,m:1,extra:{emissive:new THREE.Color('#ff9d00'),emissiveIntensity:0,envMap:envTex,envMapIntensity:1.0}});
    u.goldFace=new THREE.MeshStandardMaterial({map:faceTex('#ffd257','happy'),roughness:.35,metalness:.5,envMap:envTex,envMapIntensity:0.8,emissive:new THREE.Color('#ff9d00'),emissiveIntensity:0});
    u.orig=[];ch.traverse(o=>{if(o.isMesh)u.orig.push([o,o.material])})}
  if(amt>0&&!u.isGold){u.isGold=true;for(const [o,m] of u.orig){if(o===u.headMesh){o.material=[u.gold,u.gold,u.gold,u.gold,u.goldFace,u.gold]}else if(o.userData.keep){}else o.material=u.gold}}
  u.gold.emissiveIntensity=amt*0.12;u.goldFace.emissiveIntensity=amt*0.06;
}
function makeCrown(){
  const g=new THREE.Group();const m=M('#ffd040',{r:.2,m:1,extra:{emissive:new THREE.Color('#ffae00'),emissiveIntensity:.3,envMap:envTex,envMapIntensity:1.2}});
  const band=box(0.98,0.22,0.98,m,false);g.add(band);
  for(let i=0;i<4;i++)for(let j=0;j<3;j++){const p=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.3,4),m);const side=[[0,0.45],[0.45,0],[0,-0.45],[-0.45,0]][i];const off=(j-1)*0.32;
    p.position.set(side[0]?side[0]:off,0.24,side[1]?side[1]:off);g.add(p)}
  const gm=new THREE.MeshStandardMaterial({color:'#e0115f',emissive:'#ff1a6a',emissiveIntensity:1.2});
  for(const [x,z] of [[0,0.5],[0.5,0],[0,-0.5],[-0.5,0]]){const j=box(0.14,0.12,0.04,gm,false);j.position.set(x,0,z);j.lookAt(x*3,0,z*3);g.add(j)}
  return g;
}

// ---------- phone + feed
const feedDraw=(g)=>{
  const posts=[['#ff5f6d','#ffc371'],['#2193b0','#6dd5ed'],['#8e2de2','#4a00e0'],['#11998e','#38ef7d']];
  posts.forEach((p,i)=>{const y=i*512;const gr=g.createLinearGradient(0,y,0,y+512);gr.addColorStop(0,p[0]);gr.addColorStop(1,p[1]);g.fillStyle=gr;g.fillRect(0,y,256,512);
    // blocky figure
    g.fillStyle='#f2c79b';g.fillRect(98,y+150,60,60);g.fillStyle=['#e53935','#fff','#ffeb3b','#222'][i];g.fillRect(88,y+212,80,80);
    g.fillStyle='#222';g.fillRect(92,y+292,34,70);g.fillRect(130,y+292,34,70);g.fillRect(98,y+140,60,18);
    g.fillStyle='#111';g.fillRect(112,y+170,8,12);g.fillRect(136,y+170,8,12);
    g.fillStyle='#fff';g.font='900 26px P';g.textAlign='center';g.fillText(['in meiner stadt','POV: 3 Uhr','nur noch 1 Video','wait for it'][i],128,y+90);
    for(let k=0;k<3;k++){g.beginPath();g.arc(226,y+300+k*52,14,0,7);g.fillStyle='rgba(255,255,255,.9)';g.fill()}
    g.fillStyle='rgba(255,255,255,.85)';g.fillRect(16,y+430,150,12);g.fillRect(16,y+452,100,12);
  });
};
const feedCanvasTex=ctex(256,2048,feedDraw);
feedCanvasTex.wrapT=THREE.RepeatWrapping;
function feedTex(){const t=feedCanvasTex.clone();t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,0.25);t.needsUpdate=true;return t}
function scrollFeed(tex,t,period=0.7,phase=0){const k=(t+phase)/period;const i=Math.floor(k),f=k-i;tex.offset.y=-((i+easeOut(prog(f,0.55,0.85)))*0.25)%1}
function makePhone(){
  const g=new THREE.Group();const body=box(0.4,0.78,0.06,M('#141414',{r:.35,m:.3}));body.userData.keep=true;g.add(body);
  const tex=feedTex();const scr=new THREE.Mesh(new THREE.PlaneGeometry(0.36,0.72),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));scr.position.z=0.032;scr.userData.keep=true;g.add(scr);
  g.userData={screen:scr,tex};return g;
}
const batDraw=(g)=>{g.fillStyle='#000';g.fillRect(0,0,128,256);g.strokeStyle='#e53935';g.lineWidth=8;rr(g,24,96,72,40,6);g.stroke();g.fillStyle='#e53935';g.fillRect(98,106,10,20);g.fillRect(32,104,10,24);g.font='900 20px P';g.textAlign='center';g.fillText('0%',64,170)};const batteryTex=ctex(128,256,batDraw);

// ---------- environment pieces
function skyTex(stops,stars=0){return ctex(8,512,(g)=>{const gr=g.createLinearGradient(0,0,0,512);stops.forEach(([o,c])=>gr.addColorStop(o,c));g.fillStyle=gr;g.fillRect(0,0,8,512);
  if(stars){const R=rng(5);for(let i=0;i<stars;i++){g.fillStyle=`rgba(255,255,255,${0.4+R()*0.6})`;g.fillRect(Math.floor(R()*8),Math.floor(R()*300),1,1)}}})}
const DAY_SKY=[[0,'#3d9be9'],[0.55,'#8cc8f5'],[1,'#e5f3fb']];
const NIGHT_SKY=[[0,'#03061a'],[0.6,'#0d1a45'],[1,'#253a73']];
function windowTex(cols,rows,wall,night,litP=0.15,seed=1,lit=[]){
  const R=rng(seed);const lits=[];
  const mk=(em)=>ctex(cols*64,rows*64,(g,w,h)=>{g.fillStyle=em?'#000':wall;g.fillRect(0,0,w,h);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=c*64+12,y=r*64+12;
      let on=night&&(em?lits[r*cols+c]:(lits[r*cols+c]=R()<litP));
      if(em){if(on){g.fillStyle=on===2?'#5ab0ff':'#ffd27a';g.fillRect(x,y,40,40)}continue}
      g.fillStyle='#f5f5f5';g.fillRect(x-4,y-4,48,48);
      g.fillStyle=night?(on?'#ffd27a':'#141c33'):'#9fd3f2';g.fillRect(x,y,40,40);
      if(!night){g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.moveTo(x,y+40);g.lineTo(x+18,y);g.lineTo(x+28,y);g.lineTo(x+10,y+40);g.fill()}
    }});
  const map=mk(false);let em=null;if(night){lit.forEach(i=>lits[i]=2);em=mk(true)}
  return {map,em};
}
function building(o){
  const {w,h,d,x,z,color='#d9d4c7',night=false,sign=null,seed=1,litP=0.18,lit=[],roof='#7a7a80',rot=0}=o;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  const cols=Math.max(2,Math.round(w/1.6)),rows=Math.max(2,Math.round(h/2));
  const wt=windowTex(cols,rows,color,night,litP,seed,lit);
  const mo={map:wt.map,roughness:.9};if(wt.em){mo.emissiveMap=wt.em;mo.emissive=new THREE.Color('#ffffff');mo.emissiveIntensity=1.4}
  const side=new THREE.MeshStandardMaterial(mo);const top=M(roof);
  const b=box(w,h,d,[side,side,top,top,side,side]);b.position.y=h/2;g.add(b);
  const rf=box(w+0.3,0.4,d+0.3,M(roof));rf.position.y=h+0.2;g.add(rf);
  const door=box(1.6,2.4,0.1,M('#4a3326'));door.position.set(0,1.2,d/2+0.05);g.add(door);
  if(sign){const st=ctex(512,128,(gg)=>{gg.fillStyle='#fff';gg.fillRect(0,0,512,128);gg.strokeStyle='#222';gg.lineWidth=10;gg.strokeRect(5,5,502,118);gg.fillStyle='#222';gg.font='900 84px P';gg.textAlign='center';gg.textBaseline='middle';gg.fillText(sign,256,70)});
    const sm=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w*0.7,6),Math.min(w*0.7,6)/4),new THREE.MeshStandardMaterial({map:st,roughness:.6,emissive:night?'#ffffff':'#000',emissiveMap:night?st:null,emissiveIntensity:night?0.25:0}));
    sm.position.set(0,h-1.3,d/2+0.06);g.add(sm)}
  scene.add(g);return g;
}
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);const tr=box(0.45,1.6,0.45,M('#7a4e2d'));tr.position.y=0.8;g.add(tr);
  const lm=M('#3fa34d');const a=box(1.9,1.5,1.9,lm);a.position.y=2.2;g.add(a);const b=box(1.3,1.0,1.3,lm);b.position.y=3.2;g.add(b);scene.add(g);return g}
function cloud(x,y,z,s=1){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);const m=new THREE.MeshStandardMaterial({color:'#fff',roughness:1,emissive:'#ffffff',emissiveIntensity:.35});
  [[0,0,0,2.2],[1.4,-0.2,0,1.6],[-1.4,-0.3,0,1.4],[0.5,0.7,0,1.5]].forEach(([a,b,c,r])=>{const m2=new THREE.Mesh(new THREE.SphereGeometry(r*0.5,12,8),m);m2.position.set(a,b,c);g.add(m2)});scene.add(g);return g}
function lights(day=true,o={}){
  const hemi=new THREE.HemisphereLight(day?'#cfe8ff':'#3a4a80',day?'#8a7f6a':'#101020',o.hemi??(day?1.4:0.5));scene.add(hemi);
  const sun=new THREE.DirectionalLight(day?'#fff2dd':'#8fa8ff',o.sun??(day?2.2:0.7));sun.position.set(...(o.sunPos||[12,22,14]));sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);const s=o.shadowSize||22;Object.assign(sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:1,far:90});sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.03;
  sun.target.position.set(...(o.target||[0,0,0]));scene.add(sun,sun.target);return {hemi,sun};
}
function street(night){
  const g=new THREE.Mesh(new THREE.PlaneGeometry(300,300),M(night?'#1d3320':'#6cc24a'));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(300,6),M(night?'#2a2b30':'#55575e'));road.rotation.x=-Math.PI/2;road.position.y=0.01;road.receiveShadow=true;scene.add(road);
  for(const z of [-4,4]){const sw=box(300,0.2,2,M(night?'#4a4a50':'#c9c9cc'));sw.position.set(0,0.1,z);sw.castShadow=false;scene.add(sw)}
  const dm=M('#f4f4f4');for(let x=-60;x<60;x+=4){const d=new THREE.Mesh(new THREE.PlaneGeometry(2,0.2),dm);d.rotation.x=-Math.PI/2;d.position.set(x,0.02,0);scene.add(d)}
}
function cityLayout(night){
  street(night);
  const R=rng(11);
  const cols=['#e8c39e','#cf6d4f','#9fc6d9','#f0e1b8','#b7d38d','#d9a3b8','#e2e2e2'];
  building({w:8,h:18,d:7,x:0,z:-10,color:'#c8d0dc',night,sign:'BÜRO',seed:3,litP:0});
  const xs=[-16,-10.5,9.5,15.5,-22,21];
  xs.forEach((x,i)=>building({w:5+R()*1.5,h:7+R()*7,d:6,x,z:-10+R()*1,color:cols[i%cols.length],night,seed:20+i,litP:night?0.01:0,lit:(night&&i===2)?[0,1]:[]}));
  [-7,-3.6,4,7].forEach(x=>tree(x,-6,0.9));
  // back row
  for(let i=0;i<8;i++)building({w:6,h:14+R()*14,d:6,x:-28+i*8,z:-26,color:night?'#4a5070':'#b9c3d1',night,seed:40+i,litP:0});
}
function zzz(x,y,z,seed=1){const t=ctex(128,128,g=>{g.font='900 90px P';g.textAlign='center';g.textBaseline='middle';g.lineWidth=10;g.strokeStyle='#123';g.strokeText('Z',64,66);g.fillStyle='#fff';g.fillText('Z',64,66)});
  const arr=[];for(let i=0;i<3;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false}));s.userData={x,y,z,ph:i/3+seed*0.17};scene.add(s);arr.push(s)}return arr}
function updZ(arr,t,sc=1){arr.forEach(s=>{const k=(t*0.5+s.userData.ph)%1;s.position.set(s.userData.x+Math.sin(k*6)*0.3*sc+k*0.6*sc,s.userData.y+k*1.8*sc,s.userData.z);const z=(0.35+k*0.5)*sc;s.scale.set(z,z,1);s.material.opacity=Math.sin(k*Math.PI)})}

// room with bed
function room(o={}){
  const {night=false}=o;
  const R={};
  const floorT=ctex(256,256,g=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#b98552':'#c4915e';g.fillRect(0,i*32,256,32);g.fillStyle='rgba(0,0,0,.15)';g.fillRect(0,i*32+30,256,2)}});
  floorT.wrapS=floorT.wrapT=THREE.RepeatWrapping;floorT.repeat.set(4,4);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshStandardMaterial({map:floorT,roughness:.8}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
  const wallM=M(o.wall||'#e9e3f2');
  const back=box(16,8,0.3,wallM);back.position.set(0,4,-3.3);scene.add(back);
  const left=box(0.3,8,16,wallM);left.position.set(-4.2,4,0);scene.add(left);
  const right=box(0.3,8,16,wallM);right.position.set(5.5,4,0);scene.add(right);
  const rug=new THREE.Mesh(new THREE.PlaneGeometry(4,3),M('#5c6bc0'));rug.rotation.x=-Math.PI/2;rug.position.set(1.8,0.015,1.8);rug.receiveShadow=true;scene.add(rug);
  // window in back wall
  const winSky=new THREE.MeshBasicMaterial({color:'#8cc8f5',toneMapped:false});
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2.2),winSky);ws.position.set(-1.6,4.4,-3.13);scene.add(ws);
  const fm=M('#ffffff');[[0,1.15,2.9,0.16],[0,-1.15,2.9,0.16],[-1.37,0,0.16,2.4],[1.37,0,0.16,2.4],[0,0,0.1,2.3],[0,0,2.7,0.1]].forEach(([x,y,w,h])=>{const b=box(w,h,0.16,fm);b.position.set(-1.6+x,4.4+y,-3.08);scene.add(b)});
  // sun/moon disc in window
  const orb=new THREE.Mesh(new THREE.CircleGeometry(0.32,24),new THREE.MeshBasicMaterial({color:'#fff7c2',toneMapped:false}));orb.position.set(-2.2,4.9,-3.12);scene.add(orb);
  // bed: head at -z
  const bed=new THREE.Group();scene.add(bed);
  const frame=box(2.4,0.5,4.4,M('#6d4c41'));frame.position.set(0,0.35,-0.8);bed.add(frame);
  const head=box(2.5,1.8,0.25,M('#5d4037'));head.position.set(0,0.9,-3.0);bed.add(head);
  const matt=box(2.2,0.35,4.2,M('#fafafa'));matt.position.set(0,0.75,-0.8);bed.add(matt);
  const pil=box(1.5,0.16,0.9,M('#ffffff'));pil.position.set(0,0.98,-2.35);bed.add(pil);
  const blanket=box(2.3,0.22,2.75,M(o.blanket||'#ef6c7a'));blanket.position.set(0,1.42,-0.05);bed.add(blanket);
  const bfold=box(2.3,0.26,0.4,M('#ffffff'));bfold.position.set(0,1.45,-1.42);bed.add(bfold);
  // nightstand + lamp
  const ns=box(1,1,1,M('#8d6e63'));ns.position.set(-2,0.5,-2.5);scene.add(ns);
  const lp=box(0.15,0.6,0.15,M('#333'));lp.position.set(-2,1.3,-2.5);scene.add(lp);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,0.45,12),new THREE.MeshStandardMaterial({color:'#fff3d6',emissive:'#ffcf80',emissiveIntensity:night?0.0:0}));shade.position.set(-2,1.75,-2.5);scene.add(shade);
  // energy cans + pizza box lol
  const can=box(0.18,0.32,0.18,M('#1e88e5',{r:.3,m:.6}));can.position.set(-1.8,1.16,-2.25);scene.add(can);
  const can2=box(0.18,0.32,0.18,M('#43a047',{r:.3,m:.6}));can2.position.set(1.2,0.16,1.6);can2.rotation.z=Math.PI/2;scene.add(can2);
  const pz=box(1,0.12,1,M('#d7b47a'));pz.position.set(2.2,0.06,0.2);pz.rotation.y=0.4;scene.add(pz);
  // poster on wall
  const pt=ctex(256,340,g=>{g.fillStyle='#111';g.fillRect(0,0,256,340);g.fillStyle='#ff2d6f';g.font='900 54px P';g.textAlign='center';g.fillText('PIZZA',128,130);g.fillStyle='#fff';g.fillText('IST',128,190);g.fillStyle='#ffd54a';g.fillText('LEBEN',128,250)});
  const po=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2),new THREE.MeshStandardMaterial({map:pt}));po.position.set(1.8,4.3,-3.14);scene.add(po);
  // door on right wall
  const door=box(0.12,3.2,1.6,M('#795548'));door.position.set(5.34,1.6,1.2);scene.add(door);
  R.winSky=winSky;R.orb=orb;R.shade=shade;R.blanket=blanket;R.door=door;
  return R;
}
function lieInBed(ch){pose(ch);ch.rotation.set(-Math.PI/2,0,0);ch.position.set(0,1.18,0.27);if(ch.userData.badge)ch.userData.badge.position.set(0,1.1,0.95)}

// ---------- arena
function arena(o={}){
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(80,80),M('#1a1726'));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
  const stage=box(16,1.2,7,M('#2d2a40'));stage.position.set(0,0.6,-1.5);scene.add(stage);
  const edge=box(16.1,0.12,0.12,new THREE.MeshStandardMaterial({color:'#ff2d9a',emissive:'#ff2d9a',emissiveIntensity:2}));edge.position.set(0,1.18,2.0);scene.add(edge);
  const backT=ctex(1024,512,(g)=>{const gr=g.createLinearGradient(0,0,1024,512);gr.addColorStop(0,'#240b4a');gr.addColorStop(1,'#071a40');g.fillStyle=gr;g.fillRect(0,0,1024,512);
    g.strokeStyle='rgba(120,90,255,.25)';g.lineWidth=2;for(let i=0;i<1024;i+=48){g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.stroke()}for(let i=0;i<512;i+=48){g.beginPath();g.moveTo(0,i);g.lineTo(1024,i);g.stroke()}
    g.textAlign='center';g.font='900 120px P';g.shadowColor='#ff2d9a';g.shadowBlur=30;g.fillStyle='#ffe3f3';g.fillText('PIZZA',512,240);
    g.shadowColor='#2de1ff';g.font='900 80px P';g.fillStyle='#d8fbff';g.fillText('WETTESSEN',512,350);
    g.shadowBlur=0;g.font='900 34px P';g.fillStyle='#ffd54a';g.fillText('WER ISST AM MEISTEN?',512,430)});
  const back=new THREE.Mesh(new THREE.PlaneGeometry(20,10),new THREE.MeshStandardMaterial({map:backT,emissive:'#ffffff',emissiveMap:backT,emissiveIntensity:0.8}));back.position.set(0,6,-5);scene.add(back);
  // trusses
  const tm=M('#555',{m:.6,r:.4});[-10,10].forEach(x=>{const p=box(0.4,12,0.4,tm);p.position.set(x,6,-4.5);scene.add(p)});const tb=box(20.4,0.4,0.4,tm);tb.position.set(0,12,-4.5);scene.add(tb);
  // crowd
  const crowd=[];const R=rng(77);const cols=['#e53935','#1e88e5','#43a047','#fdd835','#8e24aa','#fb8c00','#00acc1','#eee'];
  if(o.crowd!==false)for(let r=0;r<3;r++)for(let i=0;i<9;i++){const ch=makeChar({shirt:cols[Math.floor(R()*8)],hair:['#222','#5a3a1a','#d9a441','#111'][Math.floor(R()*4)],hairStyle:R()<.5?'spiky':'curly',seed:r*20+i,face:'smile'});
    ch.position.set(-9+i*2.2+(r%2)*1.1+(R()-.5)*.5,0,4.5+r*2.1);ch.rotation.y=Math.PI;scene.add(ch);crowd.push(ch)}
  // chairs
  const chairs=[];const cm=M('#c62828');[-5,-2.5,0,2.5,5].forEach(x=>{const g=new THREE.Group();g.position.set(x,1.2,-1.5);const s=box(1.2,0.18,1.1,cm);s.position.y=0.9;g.add(s);const bk=box(1.2,1.4,0.16,cm);bk.position.set(0,1.6,-0.5);g.add(bk);
    [[-.5,-.45],[.5,-.45],[-.5,.45],[.5,.45]].forEach(([a,b])=>{const l=box(0.12,0.9,0.12,M('#222'));l.position.set(a,0.45,b);g.add(l)});scene.add(g);chairs.push(g)});
  const amb=new THREE.HemisphereLight('#6a5acd','#120a20',o.amb??0.7);scene.add(amb);
  const key=new THREE.DirectionalLight('#ffffff',o.key??1.2);key.position.set(4,14,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-14,right:14,top:14,bottom:-14});key.shadow.normalBias=0.03;scene.add(key);
  const spots=[];
  const coneM=(c)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  [['#ff2d9a',-7],['#2de1ff',7],['#ffffff',0]].forEach(([c,x],i)=>{const cone=new THREE.Mesh(new THREE.ConeGeometry(1.8,13,24,1,true),coneM(c));cone.position.set(x*1.2,6.5,-4.2);scene.add(cone);spots.push(cone)});
  return {crowd,chairs,spots,amb,key,back,edge};
}
function seatAt(ch,chair){pose(ch);sit(ch);ch.position.set(chair.position.x,chair.position.y+0.0,chair.position.z+0.05);ch.rotation.set(0,0,0)}

// ---------- rays + sparkles
function makeRays(){
  const t=ctex(512,512,(g)=>{const c=256;for(let i=0;i<24;i++){const a=i/24*Math.PI*2;g.beginPath();g.moveTo(c,c);g.arc(c,c,256,a,a+Math.PI/24);g.closePath();
    const gr=g.createRadialGradient(c,c,10,c,c,256);gr.addColorStop(0,'rgba(255,215,110,.55)');gr.addColorStop(1,'rgba(255,170,0,0)');g.fillStyle=gr;g.fill()}
    const gr=g.createRadialGradient(c,c,0,c,c,140);gr.addColorStop(0,'rgba(255,230,150,.45)');gr.addColorStop(1,'rgba(255,200,60,0)');g.fillStyle=gr;g.fillRect(0,0,512,512)});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(16,16),new THREE.MeshBasicMaterial({map:t,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));
  return m;
}
const sparkT=ctex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,230,1)');gr.addColorStop(.25,'rgba(255,210,80,.9)');gr.addColorStop(1,'rgba(255,170,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
  g.fillStyle='rgba(255,255,240,.9)';g.fillRect(30,2,4,60);g.fillRect(2,30,60,4)});
function makeSparks(n=160,seed=3){const R=rng(seed);const pos=new Float32Array(n*3);const data=[];for(let i=0;i<n;i++)data.push({a:R()*6.28,r:0.8+R()*2.6,y:R()*5,s:0.4+R()*1.2,ph:R()});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({map:sparkT,size:0.35,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));p.userData={data};return p}
function updSparks(p,t,cx,cy,cz){const a=p.geometry.attributes.position.array;p.userData.data.forEach((d,i)=>{const k=(t*0.25*d.s+d.ph)%1;const ang=d.a+t*d.s*0.8;a[i*3]=cx+Math.cos(ang)*d.r*(0.6+k*0.6);a[i*3+1]=cy+k*6-0.5;a[i*3+2]=cz+Math.sin(ang)*d.r*(0.6+k*0.6)});p.geometry.attributes.position.needsUpdate=true}

// ---------- camera
function shot(pos,look,roll=0,fov=50,shake=0.02,t=0){
  camera.fov=fov;camera.updateProjectionMatrix();
  const n=(f,p)=>Math.sin(t*f+p)*shake;
  camera.position.set(pos.x+n(1.3,0),pos.y+n(1.7,1),pos.z+n(1.1,2));
  camera.up.set(0,1,0);camera.lookAt(look.x+n(0.9,3),look.y+n(1.2,4),look.z);camera.rotateZ(roll+n(0.7,5)*0.3);
}
const lv=(a,b,t)=>a.clone().lerp(b,t);

// ---------- characters used often
const ME={skin:'#f2c79b',shirt:'#6f7480',pants:'#2c2f3a',hair:'#1c1410',hairStyle:'spiky',face:'tired',seed:7,shirtOpts:{hoodie:true}};
const worker=(i,o={})=>({skin:['#f2c79b','#c68a5a','#ffdbb5','#8d5a3b'][i%4],shirt:['#2f3b55','#37474f','#263238','#4e342e'][i%4],pants:'#20232c',hair:['#3a2618','#111','#d9a441','#6b3a1e'][i%4],hairStyle:['side','spiky','curly','side'][i%4],seed:i+30,face:'neutral',shirtOpts:{suit:true,tie:['#c62828','#1565c0','#2e7d32','#f9a825'][i%4]},...o});
function briefcase(ch){const b=box(0.6,0.45,0.18,M('#5d4037'));b.position.set(0,-1.15,0);ch.userData.armR.add(b);return b}

const wordT=(sc,w)=>{const x=sc.words.find(x=>x[0].toLowerCase().startsWith(w.toLowerCase()));return x?x[1]:0};
// ---------- scenes (Der ultimative Esser)
const S={};
const MEe={...ME,face:'happy',shirt:'#e53935',shirtOpts:{hoodie:true,text:'PIZZA',textSize:28}};
function makeBed(col='#ef6c7a',frameCol='#6d4c41'){const bed=new THREE.Group();
  const frame=box(2.4,0.5,4.4,M(frameCol));frame.position.set(0,0.35,-0.8);bed.add(frame);const head=box(2.5,1.8,0.25,M(frameCol));head.position.set(0,0.9,-3.0);bed.add(head);
  const matt=box(2.2,0.35,4.2,M('#fafafa'));matt.position.set(0,0.75,-0.8);bed.add(matt);const pil=box(1.5,0.16,0.9,M('#ffffff'));pil.position.set(0,0.98,-2.35);bed.add(pil);
  const bl=box(2.3,0.22,2.75,M(col));bl.position.set(0,1.42,-0.05);bed.add(bl);return bed}
function lieOn(ch,bed){pose(ch);ch.rotation.set(-Math.PI/2,0,0);ch.position.set(bed.position.x,bed.position.y+1.18,bed.position.z+0.27);if(ch.userData.badge)ch.userData.badge.position.set(0,1.1,0.95)}
function textSprite(txt,col='#fff',stroke='#000',size=0.9){const t=ctex(512,160,g=>{g.font='900 96px P';g.textAlign='center';g.textBaseline='middle';g.lineWidth=16;g.strokeStyle=stroke;g.strokeText(txt,256,84);g.fillStyle=col;g.fillText(txt,256,84)});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,toneMapped:false,depthWrite:false,depthTest:false}));s.scale.set(size*3.2,size,1);s.renderOrder=9;scene.add(s);return s}
function headPos(ch){ch.updateMatrixWorld(true);const v=new THREE.Vector3();ch.userData.headMesh.getWorldPosition(v);return v}
const pizzaT=ctex(256,256,g=>{g.fillStyle='#c98b3c';g.beginPath();g.arc(128,128,126,0,7);g.fill();g.fillStyle='#d9a14f';g.beginPath();g.arc(128,128,116,0,7);g.fill();g.fillStyle='#c0392b';g.beginPath();g.arc(128,128,104,0,7);g.fill();
  g.fillStyle='#ffd257';g.beginPath();g.arc(128,128,98,0,7);g.fill();const R=rng(3);for(let i=0;i<40;i++){g.fillStyle='rgba(255,240,170,.6)';g.beginPath();g.arc(40+R()*176,40+R()*176,4+R()*8,0,7);g.fill()}
  [[90,80],[160,90],[120,140],[75,160],[170,165],[128,60],[60,115],[195,125]].forEach(([x,y])=>{g.fillStyle='#b71c1c';g.beginPath();g.arc(x,y,15,0,7);g.fill();g.fillStyle='rgba(0,0,0,.15)';g.beginPath();g.arc(x+3,y+3,10,0,7);g.fill()});
  for(let i=0;i<10;i++){g.fillStyle='#2e7d32';g.beginPath();g.ellipse(50+R()*156,50+R()*156,6,3,R()*3,0,7);g.fill()}});
const boxT=ctex(256,256,g=>{g.fillStyle='#d7b47a';g.fillRect(0,0,256,256);g.strokeStyle='rgba(0,0,0,.15)';g.lineWidth=6;g.strokeRect(8,8,240,240);g.fillStyle='#c62828';g.font='900 64px P';g.textAlign='center';g.textBaseline='middle';g.fillText('PIZZA',128,128)});
function makePizza(r=0.5){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,0.06,32),[M('#c98b3c'),new THREE.MeshStandardMaterial({map:pizzaT,roughness:.7}),M('#c98b3c')]);m.castShadow=true;return m}
function makeSlice(){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.05,8,1,false,-Math.PI/8,Math.PI/4),[M('#c98b3c'),new THREE.MeshStandardMaterial({map:pizzaT}),M('#c98b3c')]);m.castShadow=true;return m}
function boxStack(n,x,y,z,ry=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;const mats=[M('#c9a46a'),M('#c9a46a'),new THREE.MeshStandardMaterial({map:boxT,roughness:.9}),M('#c9a46a'),M('#c9a46a'),M('#c9a46a')];
  for(let i=0;i<n;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.13,1.0),mats);b.position.y=0.065+i*0.135;b.rotation.y=(i*0.37)%0.3-0.15;b.castShadow=true;b.receiveShadow=true;g.add(b)}scene.add(g);
  g.userData.set=k=>{g.children.forEach((b,i)=>b.visible=i<k)};return g}
function holdSlice(ch){const u=ch.userData;if(!u.slice){u.slice=makeSlice();u.slice.position.set(0,-1.0,0.15);u.slice.rotation.set(Math.PI/2,0,Math.PI/2);u.armR.add(u.slice)}return u.slice}
function eat(ch,t,spd=6,seated=true){const u=ch.userData;holdSlice(ch);const k=Math.max(0,Math.sin(t*spd));u.armR.rotation.set(-0.6-k*1.6,0,-0.35*k);u.head.rotation.x=-0.1+0.1*k;u.upper.rotation.x=0.05*k}
function tint(ch,col,k){const u=ch.userData;if(!u.skinMats){u.skinMats=[];u.headMesh.material.forEach(m=>{if(!u.skinMats.includes(m))u.skinMats.push(m)});u.base=u.skinMats.map(m=>m.color.clone())}
  u.skinMats.forEach((m,i)=>{m.color.copy(u.base[i]).lerp(new THREE.Color(col),k)})}
function table(x,z,y=0,w=2.0){const g=new THREE.Group();g.position.set(x,y,z);const top=box(w,0.12,1.1,M('#ffffff'));top.position.y=1.3;g.add(top);
  const cl=ctex(64,64,gg=>{for(let i=0;i<8;i++)for(let j=0;j<8;j++){gg.fillStyle=(i+j)%2?'#e53935':'#ffffff';gg.fillRect(i*8,j*8,8,8)}});cl.wrapS=cl.wrapT=THREE.RepeatWrapping;cl.repeat.set(3,2);top.material=new THREE.MeshStandardMaterial({map:cl,roughness:.8});
  [[-w/2+0.1,-0.45],[w/2-0.1,-0.45],[-w/2+0.1,0.45],[w/2-0.1,0.45]].forEach(([a,b])=>{const l=box(0.08,1.3,0.08,M('#333'));l.position.set(a,0.65,b);g.add(l)});scene.add(g);return g}
function saladBowl(){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.SphereGeometry(0.35,20,10,0,Math.PI*2,Math.PI/2,Math.PI/2),M('#fafafa'));b.position.y=0.3;g.add(b);
  const R=rng(5);for(let i=0;i<10;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(0.1+R()*0.06,8,6),M(['#7cb342','#558b2f','#9ccc65','#e53935'][i%4]));l.position.set((R()-.5)*0.4,0.32+R()*0.08,(R()-.5)*0.4);l.scale.y=0.5;g.add(l)}return g}
function fire(n=80){const geo=new THREE.BufferGeometry();const pos=new Float32Array(n*3);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({map:sparkT,size:0.5,color:'#ff5722',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));p.frustumCulled=false;scene.add(p);p.userData={n};return p}
function updFire(p,t,o,dir){const a=p.geometry.attributes.position.array;for(let i=0;i<p.userData.n;i++){const k=((t*1.6+i/p.userData.n))%1;a[i*3]=o.x+dir.x*k*3+Math.sin(i*7+t*9)*0.25*k;a[i*3+1]=o.y+dir.y*k*3+Math.cos(i*5+t*7)*0.25*k+k*0.4;a[i*3+2]=o.z+dir.z*k*3}p.geometry.attributes.position.needsUpdate=true}
const LUNCH_SKY=[[0,'#3d9be9'],[0.55,'#8cc8f5'],[1,'#e5f3fb']];

S.city_day={build(){scene.background=skyTex(DAY_SKY);scene.fog=new THREE.Fog('#cfe6f7',40,120);lights(true,{shadowSize:26,target:[0,0,-4]});cityLayout(false);cloud(-12,22,-30,2);cloud(10,25,-40,2.4);
  const ws=[];for(let i=0;i<9;i++){const ch=makeChar(worker(i,{badge:0,face:'neutral'}));const dir=i%2?1:-1;ch.userData.dir=dir;ch.userData.x0=dir*(4+i*2.4);ch.userData.z=i%3===0?-4:4.2-((i%3)*0.9);ch.rotation.y=-dir*Math.PI/2;
    const bw=saladBowl();bw.scale.setScalar(0.8);bw.position.set(0,-0.95,0.3);ch.userData.armR.add(bw);add(ch);ws.push(ch)}return {ws}},
 update(c,t){c.ws.forEach((w,i)=>{pose(w);walk(w,t+i*0.4,9);w.userData.armR.rotation.x=-0.8;w.position.set(w.userData.x0-w.userData.dir*t*2.3,0,w.userData.z)});shot(lv(V(-2,3,22),V(0,4.5,14),ease(t/2.5)),V(0,6.5,-6),-0.06,55,0.03,t)}};
S.salad={build(){scene.background=skyTex(DAY_SKY);lights(true,{shadowSize:14,target:[0,0,0]});const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200),M('#cfcfcf'));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  building({w:9,h:8,d:7,x:0,z:-9,color:'#a5d6a7',sign:'SALATBAR',seed:4});tree(-7,-5);tree(7,-5);
  const ppl=[];[[-2.6,0],[2.6,0]].forEach(([x,z],k)=>{table(x,z);for(let s=0;s<2;s++){const ch=makeChar(worker(k*2+s,{badge:0,face:'tired'}));ch.position.set(x+(s?0.55:-0.55),0,z+(s?-1.0:1.0));ch.rotation.y=s?0:Math.PI;sit(ch);ch.position.y=0.05;add(ch);
    const bw=saladBowl();bw.position.set(x+(s?0.55:-0.55),1.36,z+(s?-0.3:0.3));scene.add(bw);ppl.push(ch)}});return {ppl}},
 update(c,t,sc){c.ppl.forEach((p,i)=>{const u=pose(p);sit(p);const k=Math.max(0,Math.sin(t*4+i));u.armR.rotation.x=-0.7-k*0.9;u.head.rotation.x=0.2});
  shot(lv(V(-6,6.2,10),V(-4.5,5.4,8.4),ease(t/sc.dur)),V(0,1.2,0),-0.04,50,0.012,t)}};
function homeBed(o={}){const r=room(o);const bed={position:new THREE.Vector3(0,0,0)};const me=makeChar({...MEe,badge:o.badge??3});lieOn(me,bed);add(me);
  const st=boxStack(14,2.0,0,-1.6,0.3);st.userData.set(o.boxes??4);const st2=boxStack(14,2.0,0,0.2,-0.2);st2.userData.set(0);return {r,me,bed,st,st2}}
function eatLying(me,t){const u=me.userData;holdSlice(me);const k=Math.max(0,Math.sin(t*5));u.armR.rotation.set(-1.6-k*0.9,0,-0.35);u.slice.rotation.set(Math.PI/2,0,Math.PI/2)}
function dn(c,night){c.r.winSky.color.set(night?'#0b1640':'#8cc8f5');c.r.orb.material.color.set(night?'#e8eeff':'#fff2a8');c.L.hemi.intensity=night?0.35:1.3;c.L.sun.intensity=night?0.25:1.8;scene.background=new THREE.Color(night?'#05060c':'#cfd8e6')}
S.bed_close={build(){const c=homeBed({badge:3,boxes:4});c.L=lights(true,{sunPos:[-6,12,6],shadowSize:8});dn(c,false);return c},
 update(c,t){lieOn(c.me,c.bed);eatLying(c.me,t);shot(lv(V(-2.2,3.9,-0.3),V(-1.6,3.3,-0.9),ease(t/2.1)),V(0.0,1.9,-2.0),-0.12,50,0.006,t)}};
S.bed_cycle={build(){const c=homeBed({badge:3,boxes:4});c.L=lights(true,{sunPos:[-6,12,6],shadowSize:8});c.lab=textSprite('FRÜHSTÜCK','#ffd54a','#000',0.7);return c},
 update(c,t,sc){lieOn(c.me,c.bed);eatLying(c.me,t*1.6);const f=wordT(sc,'Frühstück'),m=wordT(sc,'Mittag'),a=wordT(sc,'Abendessen');const ph=t>=a?2:t>=m?1:0;
  c.r.winSky.color.set(['#ffc48a','#8cc8f5','#0b1640'][ph]);c.L.hemi.intensity=[1.1,1.3,0.4][ph];c.L.sun.intensity=[1.2,1.8,0.3][ph];scene.background=new THREE.Color(ph===2?'#05060c':'#cfd8e6');
  const n=4+Math.floor(t*4);c.st.userData.set(Math.min(14,n));c.st2.userData.set(Math.max(0,n-14));setBadge(c.me,3+Math.floor(t*4),null);
  c.lab.visible=t>=f;c.lab.material.map.userData.g.clearRect(0,0,512,160);const g=c.lab.material.map.userData.g;g.font='900 80px P';g.textAlign='center';g.textBaseline='middle';g.lineWidth=14;g.strokeStyle='#000';const txt=['FRÜHSTÜCK','MITTAG','ABENDESSEN'][ph];g.strokeText(txt,256,84);g.fillStyle='#ffd54a';g.fillText(txt,256,84);c.lab.material.map.needsUpdate=true;c.lab.position.set(-1.6,5.8,-2.8);
  shot(lv(V(3.6,4.6,4.2),V(3.0,4.2,3.0),ease(t/3)),V(0.2,2.4,-1.4),-0.05,52,0.015,t)}};
S.neighbor={build(){const c=homeBed({badge:16,boxes:14});c.st2.userData.set(6);c.L=lights(true,{sunPos:[6,12,8],shadowSize:9});dn(c,false);c.r.door.rotation.y=-1.2;c.r.door.position.set(4.7,1.6,0.6);
  const nb=makeChar(worker(1,{badge:0,face:'annoyed',shirt:'#43a047',shirtOpts:{text:'FIT',textSize:44}}));nb.position.set(3.4,0,1.6);nb.rotation.y=-1.75;add(nb);const bw=saladBowl();bw.position.set(0,-0.95,0.3);nb.userData.armR.add(bw);c.nb=nb;return c},
 update(c,t){lieOn(c.me,c.bed);eatLying(c.me,t);const u=pose(c.nb);u.armL.rotation.set(-1.45,0,0.1+Math.sin(t*6)*0.05);u.armR.rotation.x=-0.7;if(t>1.2)setFace(c.nb,'smug');
  shot(lv(V(-1.8,4.6,6.5),V(-1.0,4.2,5.4),ease(t/2.6)),V(1.4,1.9,-0.5),0.04,52,0.015,t)}};
S.poster={build(){scene.background=skyTex(DAY_SKY);scene.fog=new THREE.Fog('#cfe6f7',40,120);lights(true,{target:[0,0,-4]});
  const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200),M('#bdbdbd'));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  building({w:7,h:12,d:6,x:-9,z:-12,color:'#cf6d4f',seed:2});building({w:7,h:15,d:6,x:9,z:-12,color:'#9fc6d9',seed:4});building({w:8,h:18,d:7,x:0,z:-16,color:'#c8d0dc',sign:'BÜRO',seed:3});tree(-5,-5);tree(5.5,-6);
  const pt=ctex(600,800,(g2)=>{const gr=g2.createLinearGradient(0,0,0,800);gr.addColorStop(0,'#b71c1c');gr.addColorStop(1,'#4a0d0d');g2.fillStyle=gr;g2.fillRect(0,0,600,800);
    g2.drawImage(pizzaT.userData.c,190,40,220,220);g2.textAlign='center';g2.fillStyle='#ffd54a';g2.font='900 54px P';g2.fillText('DAS GROSSE',300,340);g2.shadowColor='#ff9800';g2.shadowBlur=25;g2.fillStyle='#fff';g2.font='900 120px P';g2.fillText('PIZZA',300,460);
    g2.font='900 76px P';g2.fillStyle='#ffe0b2';g2.fillText('WETTESSEN',300,550);g2.shadowBlur=0;g2.fillStyle='#fff';g2.font='900 38px P';g2.fillText('Wer isst am meisten?',300,650);g2.fillStyle='#ffd54a';g2.font='900 30px P';g2.fillText('SAMSTAG · STADTHALLE',300,710)});
  const board=new THREE.Group();board.position.set(0,0,-2.5);scene.add(board);
  const pm=new THREE.Mesh(new THREE.BoxGeometry(4.5,6,0.2),[M('#333'),M('#333'),M('#333'),M('#333'),new THREE.MeshStandardMaterial({map:pt,emissive:'#fff',emissiveMap:pt,emissiveIntensity:0.25}),M('#333')]);pm.position.y=4.6;pm.castShadow=true;board.add(pm);
  [-1.8,1.8].forEach(x=>{const l=box(0.25,1.8,0.25,M('#333'));l.position.set(x,0.9,0);board.add(l)});
  const ppl=[];[[-2.4,1.5,'#e53935',0],[0.3,2.2,'#1e88e5',1],[2.6,1.4,'#43a047',2]].forEach(([x,z,s,i])=>{const ch=makeChar({...worker(i),shirt:s,shirtOpts:{},badge:0});ch.position.set(x,0,z);ch.rotation.y=Math.PI+(x>0?-0.2:0.2);add(ch);ppl.push(ch)});
  bloom.strength=0.35;bloom.threshold=1.0;return {ppl}},
 update(c,t,sc){c.ppl.forEach((p,i)=>{const u=pose(p);u.head.rotation.x=-0.15;u.head.rotation.y=Math.sin(t*2+i)*0.2});
  shot(lv(V(-1,3,13),V(0,4.4,3.2),ease(prog(t,0.2,sc.dur))),lv(V(0,3.5,-2.5),V(0,4.6,-2.5),ease(t/sc.dur)),lerp(-0.08,0.03,t/sc.dur),50,0.02,t)}};
S.laugh={build(){scene.background=skyTex(DAY_SKY);lights(true,{target:[0,0,0]});const g=new THREE.Mesh(new THREE.PlaneGeometry(200,200),M('#c8c8c8'));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
  building({w:8,h:18,d:7,x:-4,z:-14,color:'#c8d0dc',sign:'BÜRO',seed:3});building({w:6,h:12,d:6,x:6,z:-12,color:'#e8c39e',seed:5});tree(-8,-6);tree(8,-5);
  const me=makeChar({...MEe,badge:20,face:'smile'});add(me);const pz=boxStack(3,0,0,0);me.userData.armR.add(pz);pz.position.set(0,-1.0,0.6);pz.scale.setScalar(0.8);
  const ppl=[];[[-2.6,1.5],[-1.6,-2.2],[1.8,-2.3],[2.8,1.0],[0.2,-3.2]].forEach(([x,z],i)=>{const ch=makeChar(worker(i,{badge:0,face:'laugh'}));ch.position.set(x,0,z);ch.rotation.y=Math.atan2(-x,-z);add(ch);ppl.push(ch)});return {me,ppl}},
 update(c,t){const u=pose(c.me);u.armR.rotation.x=-1.4;u.armL.rotation.x=-1.4;
  c.ppl.forEach((p,i)=>{const v=pose(p);const b=Math.abs(Math.sin(t*9+i));v.upper.rotation.x=-0.15+b*0.25;v.upper.position.y=1+b*0.04;v.head.rotation.x=-0.2;if(i%2===0){v.armR.rotation.set(-1.5,0,0.2)}else{v.armL.rotation.set(-0.3,0,0.4+b*0.2);v.armR.rotation.set(-0.3,0,-0.4-b*0.2)}});
  const a=lerp(0.7,-0.3,ease(t/3.4));shot(V(Math.sin(a)*7.5,3.2+t*0.1,Math.cos(a)*7.5),V(0,1.9,0),0.04,48,0.02,t)}};
// eating arena
function eatArena(o){return{build(sc){scene.background=new THREE.Color('#07040f');const a=arena({amb:o.amb,key:o.key});
  const cols=['#43a047','#fb8c00','#111','#1e88e5','#e53935'];const tables=a.chairs.map((chair,i)=>{chair.rotation.y=0;const tb=table(chair.position.x,chair.position.z+1.0,1.2,2.0);return tb});
  const others=[0,1,3].map((k,i)=>{const ch=makeChar({shirt:cols[k],hairStyle:['curly','spiky','side'][i],hair:['#d9a441','#222','#6b3a1e'][i],seed:50+i,badge:0,face:'happy'});add(ch);seatAt(ch,a.chairs[k]);return ch});
  const champ=makeChar({skin:'#c68a5a',shirt:'#111',pants:'#111',hair:'#e53935',hairStyle:'cap',face:'smug',badge:0,seed:3,shirtOpts:{text:'#1',textColor:'#ffd54a',textSize:60}});add(champ);seatAt(champ,a.chairs[2]);
  const me=makeChar({...MEe,badge:0});add(me);seatAt(me,a.chairs[4]);
  const all=[others[0],others[1],champ,others[2],me];const pizzas=a.chairs.map(ch=>{const p=makePizza(0.45);p.position.set(ch.position.x,2.59,ch.position.z+1.0);scene.add(p);return p});
  const stacks=a.chairs.map((ch,i)=>{const s=boxStack(30,ch.position.x+0.62,2.56,ch.position.z+1.05,0.1);s.scale.setScalar(0.55);s.userData.set(0);return s});
  const c={a,tables,others,champ,me,all,pizzas,stacks};bloom.strength=o.bloom??0.6;bloom.threshold=1.0;o.build&&o.build(c,sc);return c},
 update(c,t,sc){c.all.forEach((ch,i)=>{if(ch.userData.custom||!ch.visible)return;pose(ch);sit(ch);eat(ch,t+i*0.7,5+i*0.4)});
  c.a.crowd.forEach((ch,i)=>{const u=pose(ch);const b=Math.max(0,Math.sin(t*7+i*1.3))*(o.cheer??1);u.armL.rotation.x=-2.6*b;u.armR.rotation.x=-2.6*Math.max(0,Math.sin(t*7+i*1.3+1))*(o.cheer??1)});
  c.a.spots.forEach((s,i)=>{s.rotation.z=Math.sin(t*1.2+i*2)*0.35});o.update(c,t,sc)}}}
function counts(c,vals){c.all.forEach((ch,i)=>{const v=vals[i];if(v==null)return;if(typeof v==='number'){setBadge(ch,v,null);c.stacks[i].userData.set(Math.min(30,v))}else setBadge(ch,v,'red')})}
S.arena=eatArena({update(c,t){counts(c,[0,0,0,0,0].map(()=>Math.floor(t*0.6)));shot(lv(V(-3,8.5,17),V(0.5,6.5,12),ease(t/3.2)),V(0,2.6,-1.5),-0.04,50,0.03,t)}});
S.champion=eatArena({update(c,t){const h=Math.min(18,Math.floor(t*6));counts(c,[Math.floor(h*0.4),Math.floor(h*0.4),h,Math.floor(h*0.4),Math.floor(h*0.4)]);setBadge(c.champ,h,h>=18?'gold':null);
  const p=c.champ.position;shot(lv(V(p.x-1.2,p.y+2.6,p.z+5.4),V(p.x-0.5,p.y+2.6,p.z+3.6),ease(t/3.4)),V(p.x,p.y+2.4,p.z),0.08,42,0.012,t)}});
S.drop1=eatArena({build(c){c.others[0].userData.custom=true},
 update(c,t,sc){const g=c.others[0];const gr=wordT(sc,'grün');const k=prog(t,gr-0.3,gr+0.4);pose(g);sit(g);if(k<1)eat(g,t,6);
  tint(g,'#4caf50',k*0.85);setFace(g,k>0.3?'sad':'happy');const out=easeIn(prog(t,wordT(sc,'Raus')-0.2,wordT(sc,'Raus')+0.4));g.rotation.z=out*1.4;g.position.x=c.a.chairs[0].position.x-out*0.6;g.position.y=1.2-out*0.3;
  counts(c,[k>0.5?'X':5,5,9,5,6]);
  const p=c.a.chairs[0].position;shot(lv(V(p.x+1.4,p.y+3.0,p.z+5.4),V(p.x+0.8,p.y+2.8,p.z+4.4),ease(t/sc.dur)),V(p.x-0.3,p.y+2.2,p.z),-0.06,46,0.015,t)}});
S.drop2=eatArena({build(c){c.others[0].visible=false;c.stacks[0].visible=false;c.champ.userData.custom=true;c.fire=fire(90);c.hot=textSprite('EXTRA SCHARF','#fff','#d50000',0.7);
  const hp=makePizza(0.45);hp.material[1]=new THREE.MeshStandardMaterial({map:pizzaT,color:'#ff6e40',emissive:'#ff3d00',emissiveIntensity:0.25});c.pizzas[2].material=hp.material},
 update(c,t,sc){const ch=c.champ;const e=wordT(sc,'Extra'),gb=wordT(sc,'gibt');pose(ch);sit(ch);const burn=prog(t,e+0.5,e+1.2);if(t<gb)eat(ch,t,7);
  tint(ch,'#ff1744',burn*0.8);setFace(ch,burn>0.2?'shock':'smug');c.hot.visible=t>e&&t<gb;c.hot.position.set(c.champ.position.x,6,c.champ.position.z+1);
  const hp=headPos(ch);c.fire.material.opacity=burn>0?Math.min(1,burn*2):0;updFire(c.fire,t,hp.clone().add(V(0,0,0.5)),V(0,0.1,1).normalize());
  const out=easeOut(prog(t,gb,gb+0.4));if(out>0){ch.userData.armL.rotation.x=ch.userData.armR.rotation.x=-2.8*out;ch.position.y=1.2+out*0.4}
  counts(c,[null,'X',out>0.5?'X':18,'X',12]);
  const p=c.champ.position;shot(lv(V(p.x+2.5,p.y+3.0,p.z+6.5),V(p.x+1.8,p.y+2.8,p.z+5),ease(t/sc.dur)),V(p.x+0.3,p.y+2.4,p.z),0.05,48,0.012+burn*0.02,t)}});
S.alone=eatArena({amb:0.25,key:0.25,bloom:0.3,cheer:0,build(c){c.others.forEach(o=>o.visible=false);c.champ.visible=false;[0,1,2,3].forEach(i=>{c.stacks[i].visible=false;c.pizzas[i].visible=false});c.a.spots.forEach(s=>s.visible=false);
  const sp=new THREE.SpotLight('#fff3d0',45,30,0.3,0.5,1.5);sp.position.set(5,14,4);sp.target=c.me;sp.castShadow=true;scene.add(sp);c.a.back.material.emissiveIntensity=0.15;c.a.crowd.forEach(ch=>setFace(ch,'shock'))},
 update(c,t){counts(c,[null,null,null,null,16+Math.floor(t*2)]);const p=c.me.position;shot(lv(V(p.x-2,p.y+3,p.z+9),V(p.x-0.6,p.y+2.6,p.z+4.4),ease(t/1.8)),V(p.x,p.y+2,p.z),-0.03,46,0.01,t)}});
S.chaos=eatArena({amb:0.45,key:0.6,bloom:0.4,cheer:1,build(c){c.others.forEach(o=>o.visible=false);c.champ.visible=false;[0,1,2,3].forEach(i=>{c.stacks[i].visible=false;c.pizzas[i].visible=false});c.a.spots.forEach(s=>s.visible=false);
  c.big=textSprite('20','#ffd54a','#000',1.6)},
 update(c,t,sc){const z=wordT(sc,'zwanzig'),d=wordT(sc,'Dreißig'),v=wordT(sc,'Vierzig'),l=wordT(sc,'Lecker');const n=t>=v?40:t>=d?30:t>=z?20:16;const st=t>=v?v:t>=d?d:z;
  counts(c,[null,null,null,null,n]);c.stacks[4].userData.set(30);c.stacks[4].scale.setScalar(0.55*(n/30>1?1+(n-30)/22:Math.max(0.6,n/30)));
  c.big.visible=t>=z&&t<l;const g=c.big.material.map.userData.g;g.clearRect(0,0,512,160);g.font='900 120px P';g.textAlign='center';g.textBaseline='middle';g.lineWidth=18;g.strokeStyle='#000';g.strokeText(String(n),256,84);g.fillStyle='#ffd54a';g.fillText(String(n),256,84);c.big.material.map.needsUpdate=true;
  const k=easeOut(prog(t,st,st+0.2));c.big.scale.set(1.6*3.2*(1.4-0.4*k),1.6*(1.4-0.4*k),1);c.big.position.set(5,6.2,-0.5);
  if(t>=l){const u=pose(c.me);sit(c.me);u.armL.rotation.x=-0.3;u.armR.rotation.set(-1.6,0,0.6);setFace(c.me,'happy')}
  const p=c.me.position;if(t<l)shot(V(p.x-3.2,p.y+3.4,p.z+6.5),V(p.x+0.4,p.y+2.6,p.z+0.5),-0.05,50,0.02,t);else{const hp=headPos(c.me);shot(hp.clone().add(V(-1.6,0.9,4.2)),hp.clone().add(V(0,-0.3,0)),0.05,46,0.006,t)}}});
S.gold=eatArena({amb:0.2,key:0.2,bloom:0,cheer:0,build(c){c.others.forEach(o=>o.visible=false);c.champ.visible=false;[0,1,2,3].forEach(i=>{c.stacks[i].visible=false;c.pizzas[i].visible=false});c.a.spots.forEach(s=>s.visible=false);c.me.userData.custom=true;
  c.rays=makeRays();scene.add(c.rays);c.sparks=makeSparks();scene.add(c.sparks);c.crown=makeCrown();scene.add(c.crown);c.gl=new THREE.PointLight('#ffb300',0,18,1.2);scene.add(c.gl);c.a.back.material.emissiveIntensity=0.1;
  c.a.crowd.forEach(ch=>{setFace(ch,'shock');if(Math.abs(ch.position.x-5)<3.2)ch.visible=false});c.gp=makePizza(1.1);scene.add(c.gp);c.gp.visible=false},
 update(c,t,sc){const g0=(sc.gap?sc.gap.at:0.5)+0.1;const ig=prog(t,g0,g0+0.5);const me=c.me;const u=pose(me);const st=ease(prog(t,0.2,g0+0.2));const lift=easeOut(prog(t,g0,g0+1.4))*0.9+Math.sin(t*2.2)*0.06*ig;
  u.legL.rotation.x=u.legR.rotation.x=lerp(-Math.PI/2,0,st);const ch=c.a.chairs[4];me.position.set(ch.position.x,ch.position.y+lift,ch.position.z-0.0+st*2.3);
  u.armL.rotation.set(-2.8*ease(prog(t,g0+0.3,g0+1)),0,-0.3);u.armR.rotation.set(-2.8*ease(prog(t,g0+0.3,g0+1)),0,0.3);setFace(me,ig>0?'happy':'smile');goldify(me,ig>0?ig*(0.8+0.2*Math.sin(t*6)):0);
  setBadge(me,ig>0.2?'∞':40+Math.floor(t*10),ig>0.2?'gold':null);const hp=headPos(me);
  c.gp.visible=ig>0;c.gp.position.set(hp.x,hp.y+1.7,hp.z);c.gp.rotation.set(Math.PI/2*0.85,t*1.5,0);if(ig>0&&!c.gm){c.gm=1;c.gp.material=[me.userData.gold,new THREE.MeshStandardMaterial({map:pizzaT,metalness:.8,roughness:.3,color:'#ffd54a',emissive:'#ff9800',emissiveIntensity:0.25}),me.userData.gold]}
  const cd=easeOut(prog(t,g0+0.9,g0+1.8));c.crown.position.set(hp.x,hp.y+lerp(4,0.62,cd),hp.z);c.crown.rotation.y=(1-cd)*4;c.crown.visible=cd>0;
  c.rays.position.set(hp.x,hp.y-0.3,hp.z-3.0);c.rays.rotation.z=t*0.35;c.rays.material.opacity=ig*0.75;c.rays.scale.setScalar(0.3+ig*0.25);c.sparks.material.opacity=ig;updSparks(c.sparks,t,hp.x,me.position.y,hp.z);
  c.gl.position.set(hp.x+1,hp.y+1,hp.z+3);c.gl.intensity=ig*8;bloom.strength=ig*0.5;bloom.threshold=1.0;
  c.a.crowd.forEach((p,i)=>{const uu=p.userData;if(ig>0.5){uu.armL.rotation.x=-2.8;uu.armR.rotation.x=-2.8+Math.sin(t*9+i)*0.3}});
  const p=me.position;const k=ease(prog(t,0,sc.dur));shot(lv(V(p.x-1.8,2.6,p.z+7.0),V(p.x-0.8,2.2,p.z+5.2),k),V(p.x,3.4+lift*0.8,p.z),lerp(0.0,-0.08,k),lerp(48,52,ig),0.01+0.04*Math.max(0,1-Math.abs(t-g0)*3),t);
  flashEl.style.background='#fff6d0';flashEl.style.opacity=String(Math.max(0,1-Math.abs(t-g0)*7)*0.95)}});
S.bow={build(){scene.background=new THREE.Color('#0c0716');const a=arena({crowd:false,amb:0.5,key:0.6});a.chairs.forEach(ch=>ch.visible=false);a.spots.forEach(s=>s.visible=false);
  const me=makeChar({...MEe,badge:'∞',badgeStyle:'gold',face:'happy'});me.position.set(0,1.2,-0.6);add(me);goldify(me,1);const crown=makeCrown();me.userData.head.add(crown);crown.position.y=1.0;
  const gp=makePizza(1.1);gp.material=[me.userData.gold,new THREE.MeshStandardMaterial({map:pizzaT,metalness:.8,roughness:.3,color:'#ffd54a',emissive:'#ff9800',emissiveIntensity:0.25}),me.userData.gold];scene.add(gp);
  const rays=makeRays();scene.add(rays);rays.material.opacity=0.6;rays.scale.setScalar(0.5);const sparks=makeSparks();sparks.material.opacity=0.8;scene.add(sparks);const gl=new THREE.PointLight('#ffb300',12,18,1.2);gl.position.set(0,4,2.5);scene.add(gl);
  const ppl=[];for(let r=0;r<3;r++)for(let i=0;i<6;i++){const ch=makeChar(worker(i+r,{badge:r===0?0:null,face:'shock',seed:i*7+r}));ch.position.set(-6+i*2.4+(r%2)*1.2,0,4.5+r*2.2);ch.rotation.y=Math.PI;add(ch);ppl.push(ch);if(i%2){const bw=saladBowl();bw.position.set(0,-0.95,0.3);ch.userData.armR.add(bw)}}
  bloom.strength=0.6;bloom.threshold=1.0;return {me,rays,sparks,ppl,gp}},
 update(c,t){const u=pose(c.me);c.me.position.y=1.5+Math.sin(t*2)*0.06;goldify(c.me,0.85+0.15*Math.sin(t*5));u.armL.rotation.x=u.armR.rotation.x=-2.8;const hp=headPos(c.me);c.gp.position.set(hp.x,hp.y+1.7,hp.z);c.gp.rotation.set(Math.PI/2*0.85,t*1.5,0);
  c.rays.position.set(0,3.6,-3.5);c.rays.rotation.z=t*0.35;updSparks(c.sparks,t,0,1.4,-0.6);
  c.ppl.forEach((p,i)=>{const uu=pose(p);const b=ease(prog(t,0.6+(i%6)*0.08,1.4+(i%6)*0.08));uu.upper.rotation.x=b*1.0;uu.head.rotation.x=b*0.3;uu.armL.rotation.x=-b*0.6;uu.armR.rotation.x=-0.8});
  shot(lv(V(1.6,4.8,10.5),V(0.5,4.3,8.6),ease(t/3.3)),V(0,3.2,-0.6),0.05,50,0.015,t)}};
S.ending={build(){const c=homeBed({badge:'∞',boxes:14});c.st2.userData.set(14);setBadge(c.me,'∞','gold');c.L=lights(true,{sunPos:[-6,12,6],shadowSize:8});goldify(c.me,0.4);const crown=makeCrown();c.me.userData.head.add(crown);crown.position.y=1.0;
  const dl=makeChar(worker(3,{shirt:'#d50000',shirtOpts:{text:'PIZZA',textSize:30},hairStyle:'cap',hair:'#d50000',face:'smile',badge:null}));dl.position.set(3.6,0,1.4);dl.rotation.y=-1.6;add(dl);const bx=boxStack(3,0,0,0);dl.userData.armR.add(bx);bx.position.set(0,-1.0,0.6);bx.scale.setScalar(0.8);
  c.r.door.rotation.y=-1.2;c.r.door.position.set(4.7,1.6,0.6);c.dl=dl;bloom.strength=0.3;bloom.threshold=1.2;return c},
 update(c,t,sc){lieOn(c.me,c.bed);eatLying(c.me,t);goldify(c.me,0.4+0.15*Math.sin(t*4));const day=prog(t,0.3,2.0);c.r.winSky.color.set(new THREE.Color('#0b1640').lerp(new THREE.Color('#ffb58a'),day));c.L.hemi.intensity=lerp(0.3,1.0,day);c.L.sun.intensity=lerp(0.2,1.4,day);scene.background=new THREE.Color('#05060c');
  const b=wordT(sc,'Bestell');c.dl.visible=t>b;const u=pose(c.dl);u.armR.rotation.x=-1.4;u.armL.rotation.x=-1.4;c.dl.position.x=lerp(5,3.4,easeOut(prog(t,b,b+0.6)));if(t<b+0.6)walk(c.dl,t,9,0.5);
  shot(lv(V(2.4,3.9,-0.3),V(4.6,6.0,6.0),ease(prog(t,0.2,sc.dur))),lv(V(0.1,1.7,-2.2),V(1.2,2.0,-0.6),ease(t/sc.dur)),0.15*(1-ease(t/sc.dur)),46,0.008,t);
  fadeEl.style.opacity=String(prog(t,sc.dur-0.7,sc.dur-0.05))}};

// ---------- driver
let TL=null,cur=-1,ctx=null;
window.setup=async(tl)=>{TL=tl;await document.fonts.load('900 40px P');await document.fonts.ready;feedDraw(feedCanvasTex.userData.g);feedCanvasTex.needsUpdate=true;batteryTex.userData.g.clearRect(0,0,128,256);batDraw(batteryTex.userData.g);batteryTex.needsUpdate=true;return true};
function resetScene(){scene=new THREE.Scene();rpass.scene=scene;bloom.strength=0;bloom.threshold=0.8;flashEl.style.opacity='0';fadeEl.style.opacity='0';renderer.toneMappingExposure=1.05}
window.renderAt=(T)=>{
  let i=TL.scenes.findIndex(s=>T>=s.start&&T<s.start+s.dur);if(i<0)i=TL.scenes.length-1;
  const sc=TL.scenes[i];const t=T-sc.start;
  if(i!==cur){resetScene();cur=i;ctx=S[sc.name].build(sc)}
  S[sc.name].update(ctx,t,sc);
  if(window.DBG){camera.up.set(0,1,0);camera.fov=50;camera.updateProjectionMatrix();camera.position.set(...window.DBG[0]);camera.lookAt(...window.DBG[1]);}
  composer.render();
  // caption
  let w=null;for(const x of sc.words){if(t>=x[1]&&t<x[2]){w=x}}
  if(w){capEl.textContent=w[0];const k=prog(t,w[1],w[1]+0.12);capEl.style.transform=`scale(${1+0.22*(1-easeOut(k))})`;
    capEl.className=(sc.name==='gold'&&w[0]!=='Ich')?'gold':''}
  else capEl.textContent='';
  return true;
};
window.__ready=true;
