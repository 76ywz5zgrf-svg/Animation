import json,sys
base=sys.argv[1]
ON=[(0.20,0.50),(1.19,1.38),(2.16,2.36),(3.08,3.27),(4.00,4.16),(4.41,4.56),(4.79,4.93),(5.12,5.27),(5.46,5.66)]
HUSS=[round(a-0.05,3) for a,b in ON];D=round(ON[-1][1]-0.05+0.45,3)
tl=json.load(open(f"{base}/gen/timeline_el_base.json"))
sc=tl["scenes"];i=[k for k,s in enumerate(sc) if s["name"]=="gold"][0]
at=sc[i]["start"]
words=[["HUSS",h,min(ON[j][1]-0.05+0.12,(HUSS+[D])[j+1]-0.02)] for j,h in enumerate(HUSS)]
g={"name":"grind","start":at,"dur":D,"voiceAt":0,"words":words,"gap":None,"text":"Huss! Huss! Huss!","huss":HUSS,"hussFile":"el/huss.mp3","hussOffset":0.05}
for s in sc[i:]: s["start"]=round(s["start"]+D,3)
sc.insert(i,g);tl["total"]=round(tl["total"]+D,3);tl["insert"]={"at":at,"len":D}
json.dump(tl,open(f"{base}/gen/timeline.json","w"),ensure_ascii=False,indent=1);print(at,tl["total"])
