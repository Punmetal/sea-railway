import assert from 'node:assert/strict';
import {RenderBenchmark,summarizeFrames} from '../dist/render-benchmark.js';
assert.equal(summarizeFrames([]),null);
assert.throws(()=>summarizeFrames([{ms:0,calls:1}]),/Invalid/);
const result=summarizeFrames(Array.from({length:100},(_,i)=>({ms:i?10:100,calls:13})));
assert(Math.abs(result.averageFPS-1000/10.9)<1e-8);assert.equal(result.onePercentLowFPS,10);assert.equal(result.averageDrawCalls,13);assert.equal(result.gpuMemoryBytes,null);
let time=0,restored=0,shown=true,completed=null;
const info={autoReset:true,render:{calls:0},memory:{textures:12,geometries:8},reset(){this.render.calls=0;}};
const benchmark=new RenderBenchmark({renderer:{info},status:{requested:'webgpu',backend:'webgl2',reason:'scene-migration-incomplete'},scenarios:[{name:'day'},{name:'snow'}],prepare:()=>({camera:'saved'}),apply:()=>{},advance:()=>{info.render.calls=20;},restore:s=>{assert.equal(s.camera,'saved');restored++;},now:()=>time,visible:()=>shown,warmupMS:20,sampleMS:30,onComplete:r=>completed=r});
assert(benchmark.start());assert.equal(info.autoReset,false);assert.equal(benchmark.start(),false);
for(let i=0;i<20&&benchmark.active;i++){time+=10;benchmark.beforeFrame();info.render.calls+=2;benchmark.afterFrame();}
assert.equal(restored,1);assert.equal(info.autoReset,true);assert.equal(completed.backend,'webgl2','Fallback results must not be labeled WebGPU');assert.equal(completed.results.length,2);assert.equal(completed.results[0].averageDrawCalls,22);assert.equal(completed.results[0].frames,3);
benchmark.start();shown=false;benchmark.beforeFrame();assert.equal(benchmark.active,false);assert.equal(info.autoReset,true);assert.equal(restored,2);
shown=true;info.render.drawCalls=33;completed=null;benchmark.start();
for(let i=0;i<20&&benchmark.active;i++){time+=10;benchmark.beforeFrame();info.render.drawCalls=33;benchmark.afterFrame();}
assert.equal(completed.results[0].averageDrawCalls,33,'WebGPURenderer render.calls counts render invocations; use render.drawCalls');
const fail=new RenderBenchmark({renderer:{info},status:{},scenarios:[{name:'day'}],prepare:()=>({camera:'saved'}),apply(){throw Error('Shader failed');},advance(){},restore(){restored++;},now:()=>time});
assert.throws(()=>fail.start(),/Shader failed/);assert.equal(fail.active,false);assert.equal(info.autoReset,true);
console.log('Frame statistics, all-pass draw accumulation, fallback labels, state restore and hidden-tab rejection pass (CPU tests).');
