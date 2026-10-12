// Actual rendered-frame measurements. Mocked CPU timing is never presented as FPS.
export function summarizeFrames(samples){
 if(!samples.length)return null;
 const intervals=samples.map(s=>s.ms).filter(ms=>Number.isFinite(ms)&&ms>0);
 if(intervals.length!==samples.length)throw Error('Invalid frame interval');
 const sorted=[...intervals].sort((a,b)=>b-a),tail=sorted.slice(0,Math.max(1,Math.ceil(sorted.length*.01))),average=a=>a.reduce((sum,v)=>sum+v,0)/a.length;
 return {frames:samples.length,averageFPS:1000/average(intervals),onePercentLowFPS:1000/average(tail),averageFrameTimeMS:average(intervals),p99FrameTimeMS:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.01)-1)],averageDrawCalls:average(samples.map(s=>s.calls)),minDrawCalls:Math.min(...samples.map(s=>s.calls)),maxDrawCalls:Math.max(...samples.map(s=>s.calls)),gpuMemoryBytes:null,gpuFrameTimeMS:null};
}
export class RenderBenchmark{
 constructor({renderer,status,scenarios,prepare,apply,advance,restore,metadata=()=>({}),visible=()=>!globalThis.document?.hidden,now=()=>performance.now(),onStatus=()=>{},onComplete=()=>{},warmupMS=3000,sampleMS=10000}){
  Object.assign(this,{renderer,status,scenarios,prepare,apply,advance,restore,metadata,visible,now,onStatus,onComplete,warmupMS,sampleMS});this.active=false;this.results=[];this.index=-1;this.issues=[];
 }
 start(){if(this.active)return false;this.saved=this.prepare();this.oldReset=this.renderer.info?.autoReset;if(this.renderer.info)this.renderer.info.autoReset=false;this.active=true;this.results=[];this.issues=[];try{this.meta=this.metadata();this.index=-1;this.next();return true;}catch(error){this.abort(String(error?.message??error));throw error;}}
 next(){this.index++;if(this.index>=this.scenarios.length){this.finish();return;}this.apply(this.scenarios[this.index]);this.samples=[];this.previous=null;this.windowStart=this.now();this.measuring=false;this.frame=0;this.onStatus(`${this.index+1}/${this.scenarios.length} · ${this.scenarios[this.index].name} · warming up`);}
 beforeFrame(){if(!this.active)return;if(!this.visible()){this.abort('Document was hidden: run discarded');return;}this.renderer.info?.reset?.();try{this.advance(this.scenarios[this.index],this.frame++);}catch(error){this.abort(String(error?.message??error));}}
 afterFrame(){
  if(!this.active)return;const stamp=this.now();
  if(!this.measuring){if(stamp-this.windowStart>=this.warmupMS){this.measuring=true;this.windowStart=stamp;this.previous=stamp;this.onStatus(`${this.index+1}/${this.scenarios.length} · ${this.scenarios[this.index].name} · measuring`);}return;}
  if(this.previous!==null)this.samples.push({ms:stamp-this.previous,calls:this.renderer.info?.render?.drawCalls??this.renderer.info?.render?.calls??0});this.previous=stamp;
  if(stamp-this.windowStart>=this.sampleMS){this.results.push({scenario:this.scenarios[this.index].name,...summarizeFrames(this.samples),resources:{textures:this.renderer.info?.memory?.textures??null,geometries:this.renderer.info?.memory?.geometries??null}});try{this.next();}catch(error){this.abort(String(error?.message??error));}}
 }
 finish(){const report={schema:1,date:new Date().toISOString(),scope:'complete v31 scene',requested:this.status.requested,backend:this.status.backend,fallbackReason:this.status.reason,method:'rendered-frame completion intervals; all renderer.info draws accumulated per frame including reflections, shadows and postprocess; no GPU timestamps',warmupMS:this.warmupMS,sampleMS:this.sampleMS,metadata:this.meta,results:this.results,issues:this.issues,visualAccuracy:'Requires captured image review',stability:this.issues.length?'failed':'no harness error observed during sample',gpuMemory:'not available'};this.stop();this.onComplete(report);}
 abort(message){if(!this.active)return;this.issues.push(message);this.stop();this.onStatus('Aborted · '+message);}
 stop(){if(!this.active)return;this.active=false;if(this.renderer.info)this.renderer.info.autoReset=this.oldReset;this.restore(this.saved);}
}
export function installBenchmarkPanel(options){
 const doc=globalThis.document,panel=doc.createElement('section');panel.id='render-benchmark';panel.style.cssText='position:fixed;bottom:12px;left:12px;z-index:10000;background:#142435ed;color:#f1f5ff;border:1px solid #8099ac;padding:12px;border-radius:12px;max-width:480px;font:12px system-ui';
 const label=doc.createElement('p');label.textContent=`Renderer: ${options.status.backend} · ${options.status.reason}`;
 const start=doc.createElement('button');start.textContent='Run 7 scenarios';const stop=doc.createElement('button');stop.textContent='Stop benchmark';const output=doc.createElement('pre');output.style.whiteSpace='pre-wrap';output.textContent='3s warmup + 10s sample per scenario. Adaptive resolution is locked. Keep this tab visible.';panel.append(label,start,stop,output);doc.body.appendChild(panel);
 const bench=new RenderBenchmark({...options,onStatus:text=>output.textContent=text,onComplete:report=>{
  output.textContent=report.results.map(r=>`${r.scenario}: ${r.averageFPS.toFixed(1)} FPS · 1% ${r.onePercentLowFPS.toFixed(1)} · ${r.averageFrameTimeMS.toFixed(2)} ms · ${r.averageDrawCalls.toFixed(0)} draws`).join('\n');
  const a=doc.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));a.href=url;a.download='Sea-Railway-benchmark-'+report.backend+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }});start.onclick=()=>{try{bench.start();}catch(e){output.textContent='Could not start: '+e.message;}};stop.onclick=()=>bench.abort('Cancelled');return bench;
}
