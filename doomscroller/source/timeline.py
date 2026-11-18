import json, sys
base=sys.argv[1]
L=json.load(open(f"{base}/gen/timing.json"))
PRE={"city_day":0.4}
POST={"gold":2.6,"alone":0.5,"ending":1.6,"poster":0.3,"laugh":0.3,"drop1":0.3,"drop2":0.4,"champion":0.2}
t=0; scenes=[]
for l in L:
    pre=PRE.get(l["scene"],0.1); post=POST.get(l["scene"],0.25)
    words=[]
    ws=[list(x) for x in l["words"]]
    gap=None
    if l["scene"]=="gold":
        g=1.1; at=ws[1][1]-0.04; gap={"at":round(at,3),"len":g}
        for x in ws[1:]: x[1]+=g
        l=dict(l,dur=l["dur"]+g)
    dur=pre+l["dur"]+post
    for i,(w,s) in enumerate(ws):
        e = ws[i+1][1] if i+1<len(ws) else l["dur"]+post*0.7
        words.append([w.strip(".,?!:"), round(pre+s,3), round(pre+e,3)])
    scenes.append({"name":l["scene"],"start":round(t,3),"dur":round(dur,3),"voiceAt":round(t+pre,3),"words":words,"gap":gap,"text":l["text"]})
    t+=dur
json.dump({"total":round(t,3),"scenes":scenes},open(f"{base}/gen/timeline.json","w"),ensure_ascii=False,indent=1)
print("total",round(t,2))
for s in scenes: print(f'{s["start"]:6.2f} {s["dur"]:5.2f} {s["name"]}')
