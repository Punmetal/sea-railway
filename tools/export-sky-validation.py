"""Self-contained actual-GPU sky test; useful where local HTTP sockets are blocked."""
import base64
import json
import posixpath
import re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'dist'
html=(source/'webgpu/sky-validation.html').read_text()
html=re.sub(r'<script type="importmap">.*?</script>','',html,flags=re.S)
modules={}
specifier=re.compile(r'(\bfrom\s*|\bimport\s*)([\'\"])([^\'\"\n]+)\2')
sky_url='data:image/png;base64,'+base64.b64encode((source/'assets/painted-sky.png').read_bytes()).decode()
for path in sorted(source.rglob('*.js')):
    name=path.relative_to(source).as_posix()
    def rewrite(match):
        prefix,quote,target=match.groups()
        if target.startswith('.'):
            target='sea-railway/'+posixpath.normpath(posixpath.join(posixpath.dirname(name),target))
        return prefix+quote+target+quote
    modules[name]=specifier.sub(rewrite,path.read_text()).replace("'./assets/painted-sky.png'",json.dumps(sky_url))
payload=json.dumps(modules).replace('<','\\u003c')
bootstrap="""<script type="application/json" id="modules">PAYLOAD</script><script>
const sources=JSON.parse(document.querySelector('#modules').textContent),imports={},urls=[];
for(const [name,code] of Object.entries(sources)){const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));urls.push(url);imports['sea-railway/'+name]=url;}
imports.three=imports['sea-railway/vendor/three.module.js'];
const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
const script=document.createElement('script');script.type='module';script.textContent="import 'sea-railway/webgpu/sky-validation.js';";document.body.append(script);
addEventListener('pagehide',()=>urls.forEach(URL.revokeObjectURL));
</script>""".replace('PAYLOAD',payload)
out=root/'Sea-Railway-sky-validation.html'
out.write_text(html.replace('<script type="module" src="./sky-validation.js"></script>',bootstrap))
print(out)
