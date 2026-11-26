import json,wave,numpy as np,subprocess,os
os.chdir(os.path.dirname(os.path.abspath(__file__)));SR=44100
tl=json.load(open("timeline.json"));T=tl["total"];N=int(T*SR)+SR
def load(fn):return np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",fn,"-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32).astype(np.float64)
voice=np.zeros(N);sfx=np.zeros(N);mus=np.zeros(N)
def put(buf,at,sig):
    i=int(at*SR)
    if i>=len(buf) or i<0:return
    sig=sig[:len(buf)-i];buf[i:i+len(sig)]+=sig
tt=lambda d:np.arange(int(d*SR))/SR
def env(L,a=0.01,r=0.3):
    e=np.ones(L);na=max(1,int(a*SR));e[:na]=np.linspace(0,1,na);return e*np.exp(-np.arange(L)/SR/r)
sc={s["name"]:s for s in tl["scenes"]}
def wt(s,w):return s["start"]+[x for x in s["words"] if x[0].lower().startswith(w.lower())][0][1]
if tl.get("elVoice"):put(voice,0,load(tl["elVoice"]))
else:
    for i,s in enumerate(tl["scenes"]):
        x=load(f"voice/{i:02d}.wav")
        if s.get("gap"):a=int(s["gap"]["at"]*SR);x=np.concatenate([x[:a],np.zeros(int(s["gap"]["len"]*SR)),x[a:]])
        put(voice,s["voiceAt"],x)
def lp(y,k):return np.convolve(y,np.ones(k)/k,'same')
d1=sc["drop1"];x=tt(0.3);put(sfx,wt(d1,"twists"),lp(np.random.randn(len(x)),8)*np.exp(-x*12)*0.3)
d2=sc["drop2"];x=tt(0.6);put(sfx,wt(d2,"slips"),np.sin(2*np.pi*np.cumsum(900*np.exp(-x*3)+150)/SR)*np.sin(np.pi*x/0.6)*0.08);x=tt(0.3);put(sfx,wt(d2,"slips")+0.5,lp(np.random.randn(len(x)),10)*np.exp(-x*10)*0.35)
ch=sc["chaos"]
for w_ in ("robot","moonwalk","backflip"):x=tt(0.9);put(sfx,wt(ch,w_),lp(np.random.randn(len(x)),6)*np.sin(np.pi*x/0.9)*0.14)
nf=lambda m:440*2**((m-69)/12)
def pad(ch_,at,L,vol):
    x=tt(L);y=sum(np.sin(2*np.pi*nf(m)*x)+0.25*np.sin(2*np.pi*nf(m)*2.002*x) for m in ch_)/len(ch_);y*=np.minimum(1,x/0.4)*np.minimum(1,(L-x)/0.4);put(mus,at,y*vol)
beat=60/118;bar=beat*4;tA=sc["alone"]["start"];tG=sc["gold"]["start"]+sc["gold"]["gap"]["at"]+0.2
P1=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];PG=[[57,61,64],[50,54,57],[52,56,59],[57,61,64]]
b=0;k=0
while b<T:
    gold=b>=tG-0.01;tense=tA<=b<tG-0.01
    if tense:pad([45,52],b,bar,0.06)
    else:pad((PG if gold else P1)[k%4],b,bar,0.07)
    for q in range(4):
        tq=b+q*beat
        if tq>=T:break
        if not tense or q==0:
            x=tt(0.25);fq=50+100*np.exp(-x*35);put(mus,tq,np.sin(2*np.pi*np.cumsum(fq)/SR)*env(len(x),0.002,0.1)*(0.26 if not tense else 0.2))
        if not tense:x=tt(0.4);put(mus,tq,np.sin(2*np.pi*nf((PG if gold else P1)[k%4][0]-24)*x)*env(len(x),0.01,0.25)*0.11)
    b+=bar;k+=1
x=tt(1.2);put(mus,tG-1.2,lp(np.random.randn(len(x)),8)*(x/1.2)**2*0.1)
x=tt(2.5);put(mus,tG,np.sin(2*np.pi*(40+40*np.exp(-x*5))*x)*env(len(x),0.002,0.8)*0.45)
fe=int((T-1.0)*SR);mus[fe:]*=np.linspace(1,0,N-fe)
ve=np.convolve(np.abs(voice),np.ones(4410)/4410,'same');duck=1-0.45*np.clip(ve*12,0,1)
mix=voice+(mus+sfx)*duck;mix/=max(1,np.abs(mix).max()/0.95);mix=mix[:int(T*SR)]
def wr(fn,y):
    w=wave.open(fn,"w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((y*32767).astype(np.int16).tobytes());w.close()
wr("audio.wav",mix);m2=(mus+sfx)[:int(T*SR)];wr("music_only.wav",m2/max(1,np.abs(m2).max()/0.9));print("ok",T)
