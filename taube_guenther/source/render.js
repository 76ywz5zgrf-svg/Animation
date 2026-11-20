const {chromium}=require('/opt/node22/lib/node_modules/playwright');const {spawn}=require('child_process');const fs=require('fs');
(async()=>{
 const [,,mode,out,...rest]=process.argv;
 const tl=JSON.parse(fs.readFileSync(__dirname+'/timeline.json'));
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:720,height:1280}});
 p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('PAGE',m.type(),m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.goto('http://127.0.0.1:8765/index4.html');await p.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
 await p.evaluate(tl=>window.setup(tl),tl);
 if(mode==='test'){
   const times=rest.length?rest.map(Number):tl.scenes.flatMap(s=>[s.start+s.dur*0.35,s.start+s.dur*0.85]);
   fs.mkdirSync(out,{recursive:true});
   for(const t of times){const t0=Date.now();await p.evaluate(t=>window.renderAt(t),t);await p.screenshot({path:`${out}/t${t.toFixed(2).padStart(6,'0')}.jpg`,type:'jpeg',quality:85});console.log(t.toFixed(2),Date.now()-t0,'ms')}
 } else {
   const fps=30,N=Math.round(tl.total*fps);const s0=+(rest[0]||0),s1=+(rest[1]||N);
   const ff=spawn('ffmpeg',['-y','-v','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',out],{stdio:['pipe','inherit','inherit']});
   const T0=Date.now();
   for(let f=s0;f<s1;f++){await p.evaluate(t=>window.renderAt(t),f/fps);const buf=await p.screenshot({type:'jpeg',quality:93});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));
     if(f%60===0)console.log('frame',f,'/',s1,((Date.now()-T0)/1000).toFixed(0)+'s')}
   ff.stdin.end();await new Promise(r=>ff.on('close',r));
 }
 await b.close();
})();
