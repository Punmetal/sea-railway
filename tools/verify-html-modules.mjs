// Parses and links the actual exported module graph without executing the game.
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(process.argv[2],'utf8'),context=vm.createContext({}),modules=new Map();
for(const match of html.matchAll(/<script type="text\/plain" data-railway-module="([^"]+)">([\s\S]*?)<\/script>/g))modules.set(match[1],new vm.SourceTextModule(match[2],{context,identifier:match[1]}));
let edges=0;
const resolve=specifier=>{edges++;const name=specifier==='three'?'vendor/three.module.js':specifier.replace(/^sea-railway\//,'');const mod=modules.get(name);if(!mod)throw Error('Missing module: '+specifier);return mod;};
await modules.get('main.js').link(resolve);
for(const mod of modules.values())if(mod.status==='unlinked')await mod.link(resolve);
const bootstrap=html.match(/<script id="railway-bootstrap">([\s\S]*?)<\/script>/)?.[1];if(!bootstrap)throw Error('Bootstrap missing');new vm.Script(bootstrap);
console.log(`Parsed ${modules.size} embedded modules and bootstrap; main graph linked with ${edges} imports and matching exports.`);
