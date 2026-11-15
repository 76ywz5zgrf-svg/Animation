import json, sys, subprocess, numpy as np
def load(p):
    b=subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar","16000","-"],capture_output=True).stdout
    return np.frombuffer(b,np.float32)
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for k in (sys.argv[1:] or "n1 n2 t1 n3 t2 n4 m1 n5 l1 m2 n6 l2 n7".split()):
    segs, _ = m.transcribe(load(f"voice/{k}.wav"), language="de", word_timestamps=True)
    out[k] = [(w.word.strip(), round(w.start,2), round(w.end,2)) for s in segs for w in s.words]
    print(k, " ".join(w[0] for w in out[k]), flush=True)
old=json.load(open("words.json")) if len(sys.argv)>1 else {}; old.update(out); out=old; json.dump(out, open("words.json","w"), ensure_ascii=False)
