import json,subprocess,numpy as np,re
from faster_whisper import WhisperModel
L=json.load(open("timing_raw.json"))
m=WhisperModel("small",device="cpu",compute_type="int8")
def load(fn):
    raw=subprocess.run(["ffmpeg","-v","error","-i",fn,"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True).stdout
    return np.frombuffer(raw,np.float32).copy()
for i,l in enumerate(L):
    segs,_=m.transcribe(load(f"voice/{i:02d}.wav"),language="de",word_timestamps=True,initial_prompt=l["text"])
    ws=[w for s in segs for w in s.words];target=l["text"].replace(":","").split()
    if len(ws)==len(target): l["words"]=[[t,round(w.start,3)] for t,w in zip(target,ws)]
    else:
        tot=sum(len(t)+2 for t in target);acc=0;arr=[]
        for t in target: arr.append([t,round(acc/tot*l["dur"],3)]);acc+=len(t)+2
        l["words"]=arr
    print(i,len(ws),len(target))
json.dump(L,open("timing.json","w"),ensure_ascii=False,indent=1)
