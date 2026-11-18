import json,sys,re
base=sys.argv[1];audio_len=float(sys.argv[2])
W=json.load(open(f"{base}/el/words.json"))
L=json.load(open(f"{base}/gen/script.json"))
counts=[7,4,3,8,9,8,10,9,9,6,7,8,4,4,9,10]
assert sum(counts)==len(W),(sum(counts),len(W))
norm=lambda s:re.sub(r"[^a-zäöüß0-9]","",s.lower()).replace("lär","leer")
lines=[];i=0
for li,(l,c) in enumerate(zip(L,counts)):
    ws=W[i:i+c];i+=c
    target=l["text"].replace(":","").split()
    out=[];k=0
    for w,s,e in ws:
        # whisper word may cover 1..2 script words
        t1=target[k] if k<len(target) else w
        if k+1<len(target) and norm(w)==norm(target[k]+target[k+1]) :
            mid=s+(e-s)*len(target[k])/(len(target[k])+len(target[k+1]))
            out+= [[target[k],s],[target[k+1],mid]];k+=2
        else:
            out.append([t1,s]);k+=1
    lines.append({"scene":l["scene"],"text":l["text"],"words":out,"s":ws[0][1],"e":ws[-1][2]})
scenes=[];
for j,l in enumerate(lines):
    st=0 if j==0 else max(lines[j-1]["e"]+0.05,l["s"]-0.22)
    l["st"]=st
for j,l in enumerate(lines):
    en=lines[j+1]["st"] if j+1<len(lines) else audio_len+1.6
    dur=en-l["st"];words=[]
    for q,(w,s) in enumerate(l["words"]):
        e=l["words"][q+1][1] if q+1<len(l["words"]) else min(l["e"]+0.35,en)
        words.append([w.strip(".,?!:„“\""),round(s-l["st"],3),round(e-l["st"],3)])
    sc={"name":l["scene"],"start":round(l["st"],3),"dur":round(dur,3),"voiceAt":0,"words":words,"gap":None,"text":l["text"]}
    if l["scene"]=="gold":
        ich=[x for x in W if x[0].startswith("Ich.")][0]
        sc["gap"]={"at":round(ich[2]-l["st"]-0.05,3),"len":0}
    scenes.append(sc)
tot=round(scenes[-1]["start"]+scenes[-1]["dur"],3)
json.dump({"total":tot,"scenes":scenes},open(f"{base}/gen/timeline.json","w"),ensure_ascii=False,indent=1)
for s in scenes: print(f'{s["start"]:6.2f} {s["dur"]:5.2f} {s["name"]:11s}',' '.join(w[0] for w in s["words"]))
print("total",tot)
