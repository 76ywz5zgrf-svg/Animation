import json,subprocess,numpy as np,wave
SR=44100
def load(fn):return np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",fn,"-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32).astype(np.float64)
N=load("el/narr.mp3");P=load("el/pigeon.mp3")[:int(1.62*SR)];P*=np.minimum(1,(len(P)-np.arange(len(P)))/2000)
W=json.load(open("el/narr_words.json"));L=[l for l in json.load(open("script.json")) if l["v"]=="n"]
huss=[w for w in W[:9]];ws=W[9:]
counts=[6,8,4,10,9,8,11,6,6,3,1,8,7,4,7,4,9,8,9,7,6,6];assert sum(counts)==len(ws),(sum(counts),len(ws))
lines=[];k=0
for l,c in zip(L[1:] if L[0]["scene"]=="hook" else L,counts):
    seg=ws[k:k+c];k+=c;tgt=l["text"].replace(":","").split()
    if l["scene"]=="hill":tgt=tgt+["HUSS","HUSS","HUSS"]
    words=[[tgt[i] if len(tgt)==c else seg[i][0],seg[i][1],seg[i][2]] for i in range(c)]
    lines.append({"scene":l["scene"],"text":l["text"],"words":words,"s":seg[0][1],"e":seg[-1][2]})
GB_AFTER={"pigeon":"gb1","cause":"gb2","twist":"gb3","ending":"gb4"}
HOOK_END=3.3;GBD=0.15+1.62+0.3
# build output audio + mapping
out=[N[:int(HOOK_END*SR)]];t_out=HOOK_END;scenes=[{"name":"hook","start":0,"dur":HOOK_END,"words":[["HUSS",round(h[1]+0.02,3),round(min(h[2]+0.1,HOOK_END),3)] for h in huss[:4]],"huss":[round(h[1]+0.02,3) for h in huss[:4]],"text":"Huss"}]
src=lines[0]["s"]-0.25
for j,l in enumerate(lines):
    nxt=lines[j+1]["s"] if j+1<len(lines) else len(N)/SR
    end=(l["e"]+nxt)/2 if j+1<len(lines) else len(N)/SR
    if j+1<len(lines) and l["scene"] not in GB_AFTER: end=nxt-0.18
    a=src;seg=N[int(a*SR):int(end*SR)];start=t_out;out.append(seg);t_out+=len(seg)/SR
    dur=t_out-start;words=[]
    for q,(w,s,e) in enumerate(l["words"]):
        e2=l["words"][q+1][1] if q+1<len(l["words"]) else min(e+0.35,end)
        words.append([w.strip(".,?!:„“"),round(s-a,3),round(min(e2,end)-a,3) if w!="HUSS" else round(min(e+0.12,end)-a,3)])
    sc={"name":l["scene"],"start":round(start,3),"dur":round(dur,3),"words":words,"text":l["text"],"v":"n"}
    if l["scene"]=="hill":sc["huss"]=[x[1] for x in words if x[0]=="HUSS"]
    if l["scene"]=="ending":
        pad=np.zeros(int(0.2*SR));out.append(pad);t_out+=0.2;sc["dur"]=round(t_out-start,3)
    scenes.append(sc)
    if l["scene"] in GB_AFTER:
        g=np.concatenate([np.zeros(int(0.15*SR)),P,np.zeros(int(0.3*SR))]);
        if l["scene"]=="ending":g=np.concatenate([g,np.zeros(int(1.0*SR))])
        scenes.append({"name":GB_AFTER[l["scene"]],"start":round(t_out,3),"dur":round(len(g)/SR,3),"words":[["GOOD BOY",0.15,round(len(g)/SR,3)]],"text":"Good Boy","v":"p"})
        out.append(g);t_out+=len(g)/SR
    src=end if l["scene"] in GB_AFTER or j+1>=len(lines) else end
voice=np.concatenate(out)
w=wave.open("el/voice_built.wav","w");w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(voice,-1,1)*32767).astype(np.int16).tobytes());w.close()
json.dump({"total":round(t_out,3),"scenes":scenes,"elVoice":"el/voice_built.wav"},open("timeline.json","w"),ensure_ascii=False,indent=1)
for s in scenes:print(f'{s["start"]:6.2f} {s["dur"]:5.2f} {s["name"]:9s}',' '.join(w[0] for w in s["words"]))
print("total",round(t_out,2))
