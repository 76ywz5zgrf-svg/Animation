import json,wave,numpy as np,subprocess,os
os.chdir(os.path.dirname(os.path.abspath(__file__)));SR=44100
tl=json.load(open("timeline.json"));T=tl["total"];N=int(T*SR)+SR
def load(fn):
    raw=subprocess.run(["ffmpeg","-v","error","-i",fn,"-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout
    return np.frombuffer(raw,np.float32).astype(np.float64)
voice=np.zeros(N);sfx=np.zeros(N)
def put(buf,at,sig):
    i=int(at*SR)
    if i>=len(buf):return
    sig=sig[:len(buf)-i];buf[i:i+len(sig)]+=sig
sc={s["name"]:s for s in tl["scenes"]}
if tl.get("elVoice"):
    put(voice,0,load(tl["elVoice"]))
else:
    put(voice,0,load("hook.wav"))
    for i,s in enumerate(tl["scenes"][1:]):
        put(voice,s["voiceAt"],load(f"voice/{i:02d}.wav"))
def wt(s,w):return s["start"]+[x for x in s["words"] if x[0].lower().startswith(w.lower())][0][1]
def env(L,a=0.01,r=0.3):
    e=np.ones(L);na=max(1,int(a*SR));e[:na]=np.linspace(0,1,na);return e*np.exp(-np.arange(L)/SR/r)
tt=lambda d:np.arange(int(d*SR))/SR
# sfx
def honk(at,d=0.35,v=0.12):
    x=tt(d);y=(np.sign(np.sin(2*np.pi*392*x))+np.sign(np.sin(2*np.pi*494*x)))*0.5*np.minimum(1,(d-x)*30)*np.minimum(1,x*60);put(sfx,at,y*v)
n=sc["neighbor"];honk(n["start"]+0.15);honk(n["start"]+0.6)
j=sc["jam"];[honk(j["start"]+o,0.5 if k%2 else 0.3,0.09) for k,o in enumerate([0.3,0.8,1.2,1.9,2.4])]
st=sc["start"];go=wt(st,"Los");x=tt(1.8);f=60+120*(x/1.8)**0.6;put(sfx,go,np.sign(np.sin(2*np.pi*np.cumsum(f)/SR))*0.5*np.minimum(1,x*8)*np.exp(-x*1.2)*0.1)
x=tt(0.6);put(sfx,go,np.random.randn(len(x))*env(len(x),0.001,0.08)*0.4)
e=sc["ending"];honk(e["start"]+0.5,0.6,0.07)
# music
mus=np.zeros(N);beat=60/120;bar=beat*4
tA=wt(sc["jam"],"größte");tG=wt(sc["top"],"Der");tS=sc["rewind"]["start"]
nf=lambda m:440*2**((m-69)/12)
prog=[[60,64,67],[57,60,64],[53,57,60],[55,59,62]];gold=[[60,64,67],[65,69,72],[67,71,74],[60,64,67,72]]
b=tS;k=0
while b<T:
    tense=tA<=b<tG-0.01;isg=b>=tG-0.01;ch=(gold if isg else prog)[k%4]
    for q in range(8):
        tq=b+q*beat/2
        if tq>=T:break
        if not tense:
            m=ch[[0,1,2,1,0,2,1,2][q]]+12+(12 if isg and q%2 else 0);x=tt(0.22);put(mus,tq,np.sign(np.sin(2*np.pi*nf(m)*x))*0.5*env(len(x),0.003,0.08)*0.05)
            if q%2==0:x=tt(0.3);put(mus,tq,np.sin(2*np.pi*nf(ch[0]-24)*x)*env(len(x),0.005,0.25)*0.18)
            x=tt(0.04);put(mus,tq+beat/4,np.random.randn(len(x))*env(len(x),0.001,0.01)*0.03)
        if q%2==0 and (not tense or q%4==0):
            x=tt(0.25);fq=50+100*np.exp(-x*35);put(mus,tq,np.sin(2*np.pi*np.cumsum(fq)/SR)*env(len(x),0.002,0.1)*(0.3 if not tense else 0.22))
        if tense and q%2==1:
            x=tt(0.2);put(mus,tq,np.sin(2*np.pi*nf(45+(q%4==1)*1)*x)*env(len(x),0.005,0.15)*0.12)
    b+=bar;k+=1
x=tt(2.5);put(mus,tG,np.sin(2*np.pi*(40+40*np.exp(-x*5))*x)*env(len(x),0.002,0.8)*0.45)
for j,m in enumerate([84,88,91,96,100]):x=tt(1.4);put(mus,tG+0.05+j*0.07,np.sin(2*np.pi*nf(m)*x)*env(len(x),0.002,0.5)*0.05)
# hook: driving pulse under huss
x=tt(0.15)
for j in range(int(sc['hook']['dur']/0.25)):put(mus,j*0.25,np.sin(2*np.pi*nf(36)*x)*env(len(x),0.003,0.08)*0.12)
fe=int((T-1.0)*SR);mus[fe:]*=np.linspace(1,0,N-fe)
ve=np.convolve(np.abs(voice),np.ones(4410)/4410,'same');duck=1-0.45*np.clip(ve*12,0,1)
mix=voice+(mus+sfx)*duck;mix/=max(1,np.abs(mix).max()/0.95);mix=mix[:int(T*SR)]
def wr(fn,y):
    w=wave.open(fn,"w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype(np.int16).tobytes());w.close()
wr("audio.wav",mix);m2=(mus+sfx)[:int(T*SR)];wr("music_only.wav",m2/max(1,np.abs(m2).max()/0.9))
print("ok",T)
