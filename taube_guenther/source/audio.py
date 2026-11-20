import json,wave,numpy as np,subprocess,os
os.chdir(os.path.dirname(os.path.abspath(__file__)));SR=44100
tl=json.load(open("timeline.json"));T=tl["total"];N=int(T*SR)+SR
def load(fn,ss=None,to=None):
    a=["ffmpeg","-v","error"]+(["-ss",str(ss)] if ss is not None else [])+(["-to",str(to)] if to is not None else [])+["-i",fn,"-f","f32le","-ac","1","-ar",str(SR),"-"]
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,np.float32).astype(np.float64)
voice=np.zeros(N);sfx=np.zeros(N);mus=np.zeros(N)
def put(buf,at,sig):
    i=int(at*SR)
    if i>=len(buf) or i<0:return
    sig=sig[:len(buf)-i];buf[i:i+len(sig)]+=sig
sc={s["name"]:s for s in tl["scenes"]};tt=lambda d:np.arange(int(d*SR))/SR
def env(L,a=0.01,r=0.3):
    e=np.ones(L);na=max(1,int(a*SR));e[:na]=np.linspace(0,1,na);return e*np.exp(-np.arange(L)/SR/r)
def wt(s,w):return s["start"]+[x for x in s["words"] if x[0].lower().startswith(w.lower())][0][1]
put(voice,0,load("../v3/hook.wav"))
for i,s in enumerate(tl["scenes"][1:]):put(voice,s["voiceAt"],load(f"voice/{i:02d}.wav")*(1.15 if s.get("v")=="p" else 1))
# hill huss from Calm Boy recording
segs=[(0.10,0.42),(0.90,1.18),(1.67,1.96)]
for (a,b),h in zip(segs,sc["hill"]["huss"]):
    y=load("../v2/el/voice.mp3",a,b);y*=np.minimum(1,np.arange(len(y))/400)*np.minimum(1,(len(y)-np.arange(len(y)))/800);put(voice,sc["hill"]["start"]+h,y)
# sfx
def honk(at,d=0.35,v=0.1):
    x=tt(d);y=(np.sign(np.sin(2*np.pi*392*x))+np.sign(np.sin(2*np.pi*494*x)))*0.5*np.minimum(1,(d-x)*30)*np.minimum(1,x*60);put(sfx,at,y*v)
def engine(at,d,f0,f1,v=0.08):
    x=tt(d);f=f0+(f1-f0)*(x/d)**0.7;ph=2*np.pi*np.cumsum(f)/SR;y=(np.sign(np.sin(ph))*0.6+np.sin(ph*0.5)*0.4)*np.minimum(1,x*10)*np.minimum(1,(d-x)*4);put(sfx,at,y*v)
def noise(at,d,v,lp=1):
    y=np.random.randn(int(d*SR));
    if lp>1:y=np.convolve(y,np.ones(lp)/lp,'same')
    put(sfx,at,y*np.minimum(1,np.arange(len(y))/400)*np.exp(-np.arange(len(y))/SR/(d/2.5))*v)
def coo(at,v=0.18):
    x=tt(0.55);f=170+40*np.sin(2*np.pi*3*x);ph=2*np.pi*np.cumsum(f)/SR;y=(np.sin(ph)+0.4*np.sin(2*ph))*np.sin(np.pi*x/0.55)*(0.6+0.4*np.sin(2*np.pi*14*x));put(sfx,at,y*v)
n=sc["neighbor"];honk(n["start"]+0.15);honk(n["start"]+0.55)
r=sc["rival"];[engine(r["start"]+o,0.45,60,140,0.07) for o in (0.3,1.2,2.2)]
cd=sc["countdown"];[ (put(sfx,wt(cd,w),np.sin(2*np.pi*(880 if w!='Eins' else 1320)*tt(0.25))*env(int(0.25*SR),0.002,0.12)*0.18)) for w in ("Drei","Zwei","Eins")]
st=sc["start"];noise(st["start"],0.5,0.4);engine(st["start"],2.0,80,260,0.1);noise(st["start"]+0.1,1.2,0.12,20)
ch=sc["chase"];engine(ch["start"],2.0,240,180,0.05)
for s,offs in (("jam",[0.2,0.6,1.0,1.5]),("cause",[0.3,0.9]),("bypass",[0.4,1.6]),("gb2",[0.05])):[honk(sc[s]["start"]+o,0.45 if k%2 else 0.3,0.08) for k,o in enumerate(offs)]
d=sc["door"];tu=wt(d,"Tür");x=tt(1.0);put(sfx,tu-0.1,np.sin(2*np.pi*np.cumsum(900*np.exp(-x*3)+100)/SR)*np.sin(np.pi*x/1.0)*0.08);noise(tu-0.15,0.15,0.3)
sw=sc["sidewalk"];engine(sw["start"],2.6,200,280,0.07);honk(sw["start"]+0.3,0.3,0.08)
tw=sc["twist"];noise(tw["start"]+0.6,1.4,0.22,6);engine(tw["start"],0.7,260,280,0.06)
for g in ("gb1","gb2","gb3","gb4"):coo(sc[g]["start"]+sc[g]["dur"]-0.55)
coo(sc["pigeon"]["start"]+0.3,0.12)
e=sc["ending"];[noise(e["start"]+o,0.6,0.05,3) for o in (0.1,0.5,0.9,1.3)]
# music 128bpm
beat=60/128;bar=beat*4;nf=lambda m:440*2**((m-69)/12)
tTense=sc["countdown"]["start"];tG=wt(sc["top"],"Erster");tS=sc["rewind"]["start"]
P1=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];P2=[[57,60,64],[57,60,64],[53,57,60],[52,56,59]];PG=[[60,64,67],[65,69,72],[67,71,74],[60,64,67,72]]
b=tS;k=0
while b<T:
    gold=b>=tG-0.01;tense=tTense<=b<tG-0.01;chs=(PG if gold else P2 if tense else P1)[k%4]
    for q in range(8):
        tq=b+q*beat/2
        if tq>=T:break
        m=chs[[0,1,2,1,0,2,1,2][q]]+12+(12 if gold and q%2 else 0);x=tt(0.2);put(mus,tq,np.sign(np.sin(2*np.pi*nf(m)*x))*0.5*env(len(x),0.003,0.07)*0.045)
        if q%2==0 or tense:x=tt(0.25);put(mus,tq,np.sign(np.sin(2*np.pi*nf(chs[0]-24)*x))*0.5*env(len(x),0.004,0.12)*(0.12 if tense else 0.1))
        if q%2==0:x=tt(0.25);fq=50+110*np.exp(-x*35);put(mus,tq,np.sin(2*np.pi*np.cumsum(fq)/SR)*env(len(x),0.002,0.1)*0.32)
        if q%4==2:x=tt(0.15);put(mus,tq,np.random.randn(len(x))*env(len(x),0.001,0.05)*(0.12 if tense else 0.08))
        x=tt(0.04);put(mus,tq+beat/4,np.random.randn(len(x))*env(len(x),0.001,0.01)*0.03)
    b+=bar;k+=1
x=tt(2.5);put(mus,tG,np.sin(2*np.pi*(40+40*np.exp(-x*5))*x)*env(len(x),0.002,0.8)*0.45)
for j,m in enumerate([84,88,91,96,100]):x=tt(1.4);put(mus,tG+0.05+j*0.07,np.sin(2*np.pi*nf(m)*x)*env(len(x),0.002,0.5)*0.05)
x=tt(0.15)
for j in range(int(sc["hook"]["dur"]/0.25)):put(mus,j*0.25,np.sin(2*np.pi*nf(36)*x)*env(len(x),0.003,0.08)*0.12)
fe=int((T-1.0)*SR);mus[fe:]*=np.linspace(1,0,N-fe)
ve=np.convolve(np.abs(voice),np.ones(4410)/4410,'same');duck=1-0.45*np.clip(ve*12,0,1)
mix=voice+(mus+sfx)*duck;mix/=max(1,np.abs(mix).max()/0.95);mix=mix[:int(T*SR)]
def wr(fn,y):
    w=wave.open(fn,"w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype(np.int16).tobytes());w.close()
wr("audio.wav",mix);m2=(mus+sfx)[:int(T*SR)];wr("music_only.wav",m2/max(1,np.abs(m2).max()/0.9));print("ok",T)
