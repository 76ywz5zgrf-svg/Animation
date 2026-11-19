import json,re,subprocess,numpy as np
W=json.load(open("el/words.json"));L=json.load(open("script.json"))
SR=16000;x=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","el/voice.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32)
first=[w for w in W if not w[0].lower().startswith("huss")][0][1]
hop=160;e=np.array([np.sqrt(np.mean(x[i:i+400]**2)) for i in range(0,int((first-0.05)*SR),hop)])
thr=max(0.02,e.max()*0.18);on=e>thr;H=[];i=0
while i<len(on):
    if on[i]:
        j=i
        while j<len(on) and on[j:j+6].any():j+=1
        H.append((i*hop/SR,j*hop/SR));i=j
    else:i+=1
print("huss",[(round(a,2),round(b,2)) for a,b in H])
ws=[w for w in W if not w[0].lower().startswith("huss")]
counts=[6,6,8,8,8,10,7,5,3,6,10,7];assert sum(counts)==len(ws),(sum(counts),len(ws))
norm=lambda s:re.sub(r"[^a-zäöüß0-9]","",s.lower())
lines=[];k0=0
for l,c in zip(L,counts):
    seg=ws[k0:k0+c];k0+=c;target=l["text"].replace(":","").split();out=[];k=0
    for w,s,e2 in seg:
        if k+1<len(target) and norm(w)==norm(target[k]+target[k+1]):
            mid=s+(e2-s)*len(target[k])/(len(target[k])+len(target[k+1]));out+=[[target[k],s],[target[k+1],mid]];k+=2
        else:out.append([target[k] if k<len(target) else w,s]);k+=1
    lines.append({"scene":l["scene"],"text":l["text"],"words":out,"s":seg[0][1],"e":seg[-1][2]})
for j,l in enumerate(lines):l["st"]=max(lines[j-1]["e"]+0.05,l["s"]-0.2) if j else l["s"]-0.2
hookdur=lines[0]["st"]
scenes=[{"name":"hook","start":0,"dur":round(hookdur,3),"words":[["HUSS",round(a,3),round(min(b+0.12,(H[i+1][0] if i+1<len(H) else hookdur)-0.02),3)] for i,(a,b) in enumerate(H)],"huss":[round(a,3) for a,b in H],"text":"Huss"}]
T=41.56+1.5
for j,l in enumerate(lines):
    en=lines[j+1]["st"] if j+1<len(lines) else T
    words=[];
    for q,(w,s) in enumerate(l["words"]):
        e2=l["words"][q+1][1] if q+1<len(l["words"]) else min(l["e"]+0.35,en)
        words.append([w.strip(".,?!:„“"),round(s-l["st"],3),round(e2-l["st"],3)])
    scenes.append({"name":l["scene"],"start":round(l["st"],3),"dur":round(en-l["st"],3),"voiceAt":0,"words":words,"text":l["text"]})
json.dump({"total":round(T,3),"scenes":scenes,"elVoice":"el/voice.mp3"},open("timeline.json","w"),ensure_ascii=False,indent=1)
for s in scenes:print(f'{s["start"]:6.2f} {s["dur"]:5.2f} {s["name"]:9s}',' '.join(w[0] for w in s["words"]))
