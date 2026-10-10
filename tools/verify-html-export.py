import base64
import json
from html.parser import HTMLParser
from pathlib import Path

import argparse
parser = argparse.ArgumentParser(description='Verify embedded modules, styles, assets and markup without a browser.')
parser.add_argument('html', type=Path)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'dist'
class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.scripts = []
        self.styles = []
        self.active = None
        self.external = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href'):
            if key in attrs and not attrs[key].startswith(('data:', '#')):
                self.external.append((tag, key, attrs[key]))
        if tag in ('script', 'style'):
            self.active = {'attrs': attrs, 'text': ''}
            (self.scripts if tag == 'script' else self.styles).append(self.active)
    def handle_data(self, text):
        if self.active:
            self.active['text'] += text
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.active = None

doc = Document()
doc.feed(args.html.read_text())
assert not doc.external, doc.external
assert len(doc.styles) == len(list(SOURCE.glob('*.css')))
for style in doc.styles:
    assert style['text'].strip() == (SOURCE / style['attrs']['data-source']).read_text().strip()
modules = {s['attrs']['data-railway-module']: s['text'] for s in doc.scripts if 'data-railway-module' in s['attrs']}
assert set(modules) == {p.relative_to(SOURCE).as_posix() for p in SOURCE.rglob('*.js')}
assets = json.loads(next(s['text'] for s in doc.scripts if s['attrs'].get('id') == 'railway-assets'))
for name, data in assets.items():
    assert base64.b64decode(data.split(',', 1)[1], validate=True) == (SOURCE / name).read_bytes()
assert '__seaRailwayAssets["assets/painted-sky.png"]' in modules['painted-sky.js']
assert '__seaRailwayAssets["audio/quiet-tide.wav"]' in modules['music.js']
bootstrap = next(s['text'] for s in doc.scripts if s['attrs'].get('id') == 'railway-bootstrap')
assert sum(s['attrs'].get('type') not in ('text/plain', 'application/json') for s in doc.scripts) == 1
print(f'HTML verified: {len(modules)} complete modules, {len(doc.styles)} exact stylesheets, 2 byte-identical assets, no external file references.')
