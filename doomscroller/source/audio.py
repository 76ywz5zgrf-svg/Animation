import json,wave,numpy as np,sys
base=sys.argv[1];SR=44100
tl=json.load(open(f"{base}/gen/timeline.json"));T=tl["total"];N=int(T*SR)+SR
def rd(fn):
    w=wave.open(fn);sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768;w.close()
    return np.interp(np.arange(int(len(x)*SR/sr))*sr/SR,np.arange(len(x)),x)
voice=np.zeros(N);
for i,s in enumerate(tl["scenes"]):
    x=rd(f"{base}/gen/voice/{i:02d}.wav")
    if s.get("gap"):
        a=int(s["gap"]["at"]*SR);x=np.concatenate([x[:a],np.zeros(int(s["gap"]["len"]*SR)),x[a:]])
    st=int(s["voiceAt"]*SR);voice[st:st+len(x)]+=x[:N-st]
sc={s["name"]:s for s in tl["scenes"]}
t=np.arange(N)/SR;mus=np.zeros(N)
bpm=100;beat=60/bpm
def nf(m):return 440*2**((m-69)/12)
def env(L,a=0.01,r=0.3):
    e=np.ones(L);na=int(a*SR);e[:na]=np.linspace(0,1,na);e*=np.exp(-np.arange(L)/SR/r);return e
def put(buf,at,sig):
    i=int(at*SR);
    if i>=len(buf):return
    sig=sig[:len(buf)-i];buf[i:i+len(sig)]+=sig
tA=sc["alone"]["start"];tG=sc["gold"]["start"]+0.1+sc["gold"]["gap"]["at"]
minor=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]   # Am F C G
major=[[57,61,64],[50,54,57],[52,56,59],[57,61,64]]   # A D E A
def pad(chord,L,vol):
    tt=np.arange(int(L*SR))/SR;s=sum(np.sin(2*np.pi*nf(m)*tt)+0.3*np.sin(2*np.pi*nf(m)*2.003*tt) for m in chord)
    e=np.minimum(1,tt/0.3)*np.minimum(1,(L-tt)/0.3);return s*e*vol/len(chord)
bar=beat*4;b=0.0;k=0
while b<T:
    gold=b>=tG-0.01; tense=tA<=b<tG
    ch=(major if gold else minor)[k%4]
    if not tense: put(mus,b,pad(ch,bar,0.10))
    else: put(mus,b,pad([45,52],bar,0.08))
    for q in range(8):
        tq=b+q*beat/2
        if tq>=T:break
        if not tense:
            m=ch[q%3]+12+(12 if gold and q%2 else 0);L=int(0.25*SR);tt=np.arange(L)/SR
            put(mus,tq,np.sin(2*np.pi*nf(m)*tt)*env(L,0.005,0.12)*0.06)
            L=int(0.05*SR);put(mus,tq+beat/4,np.random.randn(L)*env(L,0.001,0.012)*0.03)
        if q%2==0 and (not tense or q%4==0):
            L=int(0.3*SR);tt=np.arange(L)/SR;f=50+90*np.exp(-tt*30);ph=2*np.pi*np.cumsum(f)/SR
            put(mus,tq,np.sin(ph)*env(L,0.002,0.12)*(0.25 if not tense else 0.18))
    b+=bar;k+=1
# riser before gold + boom + shimmer
L=int(1.2*SR);tt=np.arange(L)/SR;put(mus,tG-1.2,np.random.randn(L)*(tt/1.2)**2*0.08)
L=int(2.5*SR);tt=np.arange(L)/SR;put(mus,tG,np.sin(2*np.pi*(40+40*np.exp(-tt*5))*tt)*env(L,0.002,0.8)*0.5)
for j,m in enumerate([81,85,88,93,97,100]):
    L=int(1.5*SR);tt=np.arange(L)/SR;put(mus,tG+0.1+j*0.07,np.sin(2*np.pi*nf(m)*tt)*env(L,0.002,0.5)*0.05)
# fade end
fe=int((T-1.0)*SR);mus[fe:]*=np.linspace(1,0,N-fe)
# duck music under voice
ve=np.convolve(np.abs(voice),np.ones(4410)/4410,'same');duck=1-0.45*np.clip(ve*12,0,1)
mix=voice*1.0+mus*duck
mix/=max(1,np.abs(mix).max()/0.95)
mix=mix[:int(T*SR)]
w=wave.open(f"{base}/out/audio.wav","w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype(np.int16).tobytes());w.close()
w=wave.open(f"{base}/out/voice_only.wav","w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);v=voice[:int(T*SR)];w.writeframes((v/max(1,np.abs(v).max())*32767*0.95).astype(np.int16).tobytes());w.close()
print("ok",T)
m=mus[:int(T*SR)];m=m/max(1,np.abs(m).max()/0.9)
w=wave.open(f"{base}/out/music_only.wav","w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((m*32767).astype(np.int16).tobytes());w.close()
