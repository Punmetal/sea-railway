// Native PNG encode/decode and desktop ZIP verification. Not browser/WebGL QA.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {RailwayShowcase,SHOWCASE_SHOTS,canvasPng} from '../dist/showcase.js';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'package.json'));
const {createCanvas}=require('@napi-rs/canvas'),{PNG}=require('pngjs');
const source=createCanvas(1920,1080),context=source.getContext('2d'),decoded=[];
const doc={createElement(){const c=createCanvas(1,1);c.toBlob=callback=>callback(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;}};
let archive,restored=false;
const showcase=new RailwayShowcase({canvas:source,capture:async canvas=>{const b=await canvasPng(canvas,doc),png=PNG.sync.read(Buffer.from(await b.arrayBuffer()));assert.equal(png.width,1280);assert.equal(png.height,720);assert(png.data.some((v,i)=>i%4!==3&&v));decoded.push(png);return b;},download:blob=>archive=blob});
await showcase.gallery({shots:SHOWCASE_SHOTS,prepare:()=>42,apply:shot=>{context.fillStyle={day:'#b8e2e9',evening:'#edb3a4',night:'#3c527e'}[shot.time];context.fillRect(0,0,source.width,source.height);context.fillStyle='#a8544c';context.fillRect(300,200,1000,500);},render(){},restore:s=>{assert.equal(s,42);restored=true;},nextFrame:async()=>{}});
assert(restored&&decoded.length===6&&archive);const dir=await mkdtemp(path.join(tmpdir(),'railway-showcase-'));
try{const file=path.join(dir,'gallery.zip');await writeFile(file,Buffer.from(await archive.arrayBuffer()));execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert len(z.namelist())==6; assert all(z.read(n)[:8]==bytes([137,80,78,71,13,10,26,10]) for n in z.namelist()); print("Six valid PNG files and ZIP CRC verified")',file],{stdio:'inherit'});}finally{await rm(dir,{recursive:true,force:true});showcase.dispose();}
console.log('Native Canvas: six real encoded/decoded 1280×720 PNGs through the gallery path; synthetic source pixels, no browser or full scene rendering.');
