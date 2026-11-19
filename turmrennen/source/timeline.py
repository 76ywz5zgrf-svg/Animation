import json
L=json.load(open("timing.json"))
ON=[(0.20,0.50),(1.19,1.38),(2.16,2.36),(3.08,3.27),(4.00,4.16),(4.41,4.56),(4.79,4.93),(5.12,5.27),(5.46,5.66)]
HUSS=[round(a-0.05,3) for a,b in ON];HD=round(ON[-1][1]-0.05+0.35,3)
scenes=[{"name":"hook","start":0,"dur":HD,"words":[["HUSS",h,min(ON[j][1]-0.05+0.12,(HUSS+[HD])[j+1]-0.02)] for j,h in enumerate(HUSS)],"huss":HUSS,"text":"Huss!"}]
POST={"blackout":0.5,"top":1.6,"ending":1.4,"tower":0.3,"laugh":0.3,"climb":0.4}
t=HD
for l in L:
    pre=0.12;post=POST.get(l["scene"],0.22);dur=pre+l["dur"]+post;ws=l["words"];words=[]
    for i,(w,s) in enumerate(ws):
        e=ws[i+1][1] if i+1<len(ws) else l["dur"]+post*0.7
        words.append([w.strip(".,?!:"),round(pre+s,3),round(pre+e,3)])
    scenes.append({"name":l["scene"],"start":round(t,3),"dur":round(dur,3),"voiceAt":round(t+pre,3),"words":words,"text":l["text"]});t+=dur
json.dump({"total":round(t,3),"scenes":scenes},open("timeline.json","w"),ensure_ascii=False,indent=1)
for s in scenes:print(f'{s["start"]:6.2f} {s["dur"]:5.2f} {s["name"]}')
print("total",round(t,2))
