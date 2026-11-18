import json, subprocess, wave, sys, os
base=sys.argv[1]
lines=json.load(open(f"{base}/gen/script.json"))
os.makedirs(f"{base}/gen/voice",exist_ok=True)
out=[]
for i,l in enumerate(lines):
    fn=f"{base}/gen/voice/{i:02d}.wav"
    subprocess.run(["python3","-m","piper","-m",f"{base}/tts/de_DE-thorsten-high.onnx","--length-scale","0.88","--sentence-silence","0.12","-f",fn],input=l["text"].encode(),check=True,capture_output=True)
    w=wave.open(fn); d=w.getnframes()/w.getframerate(); w.close()
    out.append({**l,"dur":round(d,3)})
    print(i,round(d,2),l["text"])
json.dump(out,open(f"{base}/gen/timing_raw.json","w"),ensure_ascii=False,indent=1)
print("total",sum(o["dur"] for o in out))
