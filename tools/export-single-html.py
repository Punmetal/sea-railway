"""Build an editable Sea Railway HTML. Requires Python 3; no build dependencies."""
import argparse
import base64
import json
import posixpath
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--version', default='v31')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'dist'
OUT = args.output or ROOT / f'Sea-Railway-{args.version}.html'
if not (SOURCE / 'audio/quiet-tide.wav').is_file():
    parser.error('Missing dist/audio/quiet-tide.wav. Extract the Audio ZIP into the same project folder first.')

html = (SOURCE / 'index.html').read_text()
for css in re.findall(r'<link rel="stylesheet" href="/([^"]+)">', html):
    text = (SOURCE / css).read_text()
    assert not re.search(r'</style', text, re.I)
    html = html.replace(f'<link rel="stylesheet" href="/{css}">',
                        f'<style data-source="{css}">\n{text}\n</style>')
html = re.sub(r'<script type="importmap">.*?</script>', '', html, flags=re.S)

assets = {}
for name, mime in [('assets/painted-sky.png', 'image/png'),
                   ('audio/quiet-tide.wav', 'audio/wav')]:
    assets[name] = f'data:{mime};base64,' + base64.b64encode((SOURCE / name).read_bytes()).decode()

modules = {}
# The authored modules and Three.js dependencies use static import/export declarations.
specifier = re.compile(r'(\bfrom\s*|\bimport\s*)([\'\"])([^\'\"\n]+)\2')
for path in sorted(SOURCE.rglob('*.js')):
    name = path.relative_to(SOURCE).as_posix()
    code = path.read_text()
    assert not re.search(r'</script', code, re.I), name
    assert not re.search(r'\bimport\s*\(|\bimport\.meta', code), name
    def rewrite(match):
        prefix, quote, target = match.groups()
        if target.startswith('.'):
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
            assert (SOURCE / resolved).is_file(), (name, target)
            target = 'sea-railway/' + resolved
        else:
            assert target == 'three', (name, target)
        return prefix + quote + target + quote
    code = specifier.sub(rewrite, code)
    code = code.replace("'./assets/painted-sky.png'", 'globalThis.__seaRailwayAssets["assets/painted-sky.png"]')
    code = code.replace("'/audio/quiet-tide.wav'", 'globalThis.__seaRailwayAssets["audio/quiet-tide.wav"]')
    modules[name] = code

bootstrap = '''
// Every source module below is editable. Modules are loaded from memory so no
// web server, CDN, separate image or audio folder is needed for this export.
(async () => {
  const urls = [];
  try {
    globalThis.__seaRailwayAssets = JSON.parse(document.getElementById('railway-assets').textContent);
    const imports = {};
    for (const source of document.querySelectorAll('script[data-railway-module]')) {
      const url = URL.createObjectURL(new Blob([source.textContent], {type:'text/javascript'}));
      urls.push(url);
      imports['sea-railway/' + source.dataset.railwayModule] = url;
    }
    imports.three = imports['sea-railway/vendor/three.module.js'];
    const map = document.createElement('script');
    map.type = 'importmap';
    map.textContent = JSON.stringify({imports});
    document.head.appendChild(map);
    await import('sea-railway/main.js');
  } catch (error) {
    console.error('Sea Railway could not start', error);
    document.getElementById('loading').hidden = true;
    const panel = document.getElementById('error');
    panel.hidden = false;
    const message = document.createElement('p');
    message.textContent = 'เปิดไฟล์ด้วย Chrome หรือ Edge รุ่นใหม่ที่รองรับ WebGL 2 — ' + error.message;
    panel.appendChild(message);
  }
  addEventListener('pagehide', event => {
    if (!event.persisted) urls.forEach(url => URL.revokeObjectURL(url));
  });
})();
'''
try:
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, stderr=subprocess.DEVNULL).strip()
except (OSError, subprocess.CalledProcessError):
    revision = ROOT / 'SOURCE-REVISION.txt'
    head = revision.read_text().strip() if revision.is_file() else 'not supplied'

notes = f'''<!--
Sea Railway — standalone editable HTML, {args.version}
Source commit: {head}
Open the downloaded file in a recent Chrome or Edge with WebGL 2 enabled.
No network assets are required. Begin a journey and choose sound to enable browser audio.
To edit: search for data-source (CSS) or data-railway-module (JavaScript).
The asset JSON contains the original PNG and WAV as base64 data URLs.
Original Three.js license headers are preserved in the embedded module.
Audio license:
{(SOURCE / 'audio/LICENSE.txt').read_text()}
-->\n'''
blocks = [notes, '<script type="application/json" id="railway-assets">' + json.dumps(assets) + '</script>']
for name, code in modules.items():
    blocks.append(f'<script type="text/plain" data-railway-module="{name}">\n{code}\n</script>')
blocks.append('<script id="railway-bootstrap">' + bootstrap + '</script>')
html = html.replace('<script type="module" src="/main.js"></script>', '\n'.join(blocks))
OUT.write_text(html)
print(json.dumps({'file':str(OUT), 'size_MiB':round(OUT.stat().st_size / 1024**2, 2), 'modules':len(modules), 'source_commit':head}))
