"""Optional native GLES 3 photo shader QA. No browser or application server."""
import ctypes as C, json, sys, subprocess
import numpy as np
from pathlib import Path

if len(sys.argv)>1:
    data=json.loads(Path(sys.argv[1]).read_text())
else:
    source="""
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('./dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {PHOTO_VERTEX,PHOTO_FRAGMENT,PHOTO_BLUR}=await import('./dist/photo-effects.js');
console.log(JSON.stringify({vertex:PHOTO_VERTEX,fragment:PHOTO_FRAGMENT,blur:PHOTO_BLUR}));
"""
    data=json.loads(subprocess.run(['node','--input-type=module','-'],input=source,text=True,cwd=Path(__file__).resolve().parents[1],check=True,capture_output=True).stdout)
e=C.CDLL('libEGL.so.1')
try:g=C.CDLL('libGLESv2.so.2')
except OSError:g=C.CDLL('libGL.so.1')
def api(lib,name,result,args):
    f=getattr(lib,name);f.restype=result;f.argtypes=args;return f
P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
getproc=api(e,'eglGetProcAddress',P,[C.c_char_p])
platform=C.CFUNCTYPE(P,U,P,C.POINTER(I))(getproc(b'eglGetPlatformDisplayEXT'))
display=platform(0x31DD,None,None)
major=I();minor=I();assert api(e,'eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(display,C.byref(major),C.byref(minor))
assert api(e,'eglBindAPI',U,[U])(0x30A0)
attributes=(I*13)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
config=P();count=I();assert api(e,'eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attributes,C.byref(config),1,C.byref(count)) and count.value
W,H=256,128
surface=api(e,'eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,config,(I*5)(0x3057,W,0x3056,H,0x3038))
context=api(e,'eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,config,None,(I*3)(0x3098,3,0x3038))
assert surface and context and api(e,'eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
for name,result,args in [
 ('glCreateShader',U,[U]),('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]),('glCompileShader',None,[U]),('glGetShaderiv',None,[U,U,C.POINTER(I)]),('glGetShaderInfoLog',None,[U,I,C.POINTER(I),P]),
 ('glCreateProgram',U,[]),('glAttachShader',None,[U,U]),('glLinkProgram',None,[U]),('glGetProgramiv',None,[U,U,C.POINTER(I)]),('glGetProgramInfoLog',None,[U,I,C.POINTER(I),P]),('glUseProgram',None,[U]),
 ('glGetUniformLocation',I,[U,C.c_char_p]),('glUniform1f',None,[I,F]),('glUniform1i',None,[I,I]),('glUniform2f',None,[I,F,F]),('glUniform4f',None,[I,F,F,F,F]),
 ('glGenBuffers',None,[I,C.POINTER(U)]),('glBindBuffer',None,[U,U]),('glBufferData',None,[U,C.c_size_t,P,U]),('glGetAttribLocation',I,[U,C.c_char_p]),('glEnableVertexAttribArray',None,[U]),('glVertexAttribPointer',None,[U,I,U,B,I,P]),
 ('glGenTextures',None,[I,C.POINTER(U)]),('glBindTexture',None,[U,U]),('glTexParameteri',None,[U,U,I]),('glTexImage2D',None,[U,I,I,I,I,I,U,U,P]),('glActiveTexture',None,[U]),
 ('glGenFramebuffers',None,[I,C.POINTER(U)]),('glBindFramebuffer',None,[U,U]),('glFramebufferTexture2D',None,[U,U,U,U,I]),('glCheckFramebufferStatus',U,[U]),
 ('glViewport',None,[I,I,I,I]),('glDrawArrays',None,[U,I,I]),('glReadPixels',None,[I,I,I,I,U,U,P]),('glGetError',U,[]),('glGetString',C.c_char_p,[U])]:
    globals()[name]=api(g,name,result,args)

def shader(source,kind):
    sh=glCreateShader(kind);raw=source.encode();c=C.c_char_p(raw);glShaderSource(sh,1,C.byref(c),None);glCompileShader(sh);ok=I();glGetShaderiv(sh,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(12000);glGetShaderInfoLog(sh,len(log),None,log);raise AssertionError(log.value.decode())
    return sh
vertex='#version 300 es\nprecision highp float;\nin vec3 position;in vec2 uv;\n'+data['vertex'].replace('varying','out')
def program(fragment,vertex_source=None):
    vs=vertex if vertex_source is None else "#version 300 es\nprecision highp float;\nin vec3 position;in vec2 uv;\n"+vertex_source.replace("varying","out").replace("attribute","in")
    frag='#version 300 es\nprecision highp float;precision highp int;\nout vec4 fragColor;\n'+fragment.replace('varying','in').replace('texture2D','texture').replace('gl_FragColor','fragColor')
    p=glCreateProgram();glAttachShader(p,shader(vs,0x8B31));glAttachShader(p,shader(frag,0x8B30));glLinkProgram(p);ok=I();glGetProgramiv(p,0x8B82,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(12000);glGetProgramInfoLog(p,len(log),None,log);raise AssertionError(log.value.decode())
    return p
if 'programs' in data:
    for case in data['programs']:
        try:program(case['fragment'],case['vertex'])
        except AssertionError as error:raise AssertionError(case['name']+': '+str(error))
    print(json.dumps({'programs':len(data['programs']),'checks':[case['name'] for case in data['programs']],'note':'Native GLES compile/link; full browser scene not tested.'}))
    if data.get('characterPreview'):
        import importlib.util
        spec=importlib.util.spec_from_file_location('native_characters',Path(__file__).with_name('native-characters.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.render(data,globals())
    if data.get('polishPreview'):
        import importlib.util
        spec=importlib.util.spec_from_file_location('native_render_polish',Path(__file__).with_name('native-render-polish.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.render(data,globals())
    if data.get('skyPreview'):
        import importlib.util
        spec=importlib.util.spec_from_file_location('native_sea_sky',Path(__file__).with_name('native-sea-sky.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.render(data,globals())
    if data.get('headlightPreview'):
        import importlib.util
        spec=importlib.util.spec_from_file_location('native_headlight',Path(__file__).with_name('native-headlight.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.render(data,globals())
    if data.get('preview'):
        import importlib.util
        spec=importlib.util.spec_from_file_location('native_foliage',Path(__file__).with_name('native-foliage.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);module.render(data,globals())
    sys.exit(0)
post=program(data['fragment']);blur=program(data['blur'])
verts=np.array([[-1,-1,0,0,0],[1,-1,0,1,0],[-1,1,0,0,1],[1,1,0,1,1]],dtype=np.float32)
buffer=U();glGenBuffers(1,C.byref(buffer));glBindBuffer(0x8892,buffer);glBufferData(0x8892,verts.nbytes,verts.ctypes.data,0x88E4)
def bind_vertices(p):
    glUseProgram(p)
    for name,size,offset in [('position',3,0),('uv',2,12)]:
        loc=glGetAttribLocation(p,name.encode());glEnableVertexAttribArray(loc);glVertexAttribPointer(loc,size,0x1406,0,20,P(offset))
def texture(pixels=None,internal=0x8814):
    t=U();glGenTextures(1,C.byref(t));glBindTexture(0x0DE1,t)
    for name,value in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:glTexParameteri(0x0DE1,name,value)
    glTexImage2D(0x0DE1,0,internal,W,H,0,0x1908,0x1406,None if pixels is None else pixels.ctypes.data);return t.value
pixels=np.zeros((H,W,4),dtype=np.float32);pixels[:,:,3]=1
for i,color in enumerate([[.015,.015,.015],[.06,.06,.06],[.18,.18,.18],[.40,.40,.40],[.04,.15,.40],[1.5,.5,.12],[.2,.08,.24],[3.,3.,3.]]):pixels[:,i*32:(i+1)*32,:3]=color
world=texture(pixels);bloom=texture(np.zeros_like(pixels))
def uniform(p,name,*values):
    loc=glGetUniformLocation(p,name.encode())
    if name in ['uImage','uBloom','uFilter']:glUniform1i(loc,int(values[0]))
    elif len(values)==1:glUniform1f(loc,values[0])
    elif len(values)==2:glUniform2f(loc,*values)
    elif len(values)==4:glUniform4f(loc,*values)
def draw(filter=0,**settings):
    glBindFramebuffer(0x8D40,0);glViewport(0,0,W,H);bind_vertices(post)
    glActiveTexture(0x84C0);glBindTexture(0x0DE1,world);glActiveTexture(0x84C1);glBindTexture(0x0DE1,bloom)
    defaults={'uImage':0,'uBloom':1,'uPhotoToneExposure':1,'uSceneExposure':1.125,'uFilter':filter,'uStrength':1,'uExposure':0,'uContrast':0,'uSaturation':0,'uTemperature':0,'uGlow':0,'uWorldGlow':0,'uAntialias':0,'uSharpness':0,'uTexel':(1/W,1/H),'uGrain':0,'uVignette':0,'uCompare':0,'uCrop':(0,0,1,1),'uResolution':(W,H)};defaults.update(settings)
    for key,value in defaults.items():uniform(post,key,*(value if isinstance(value,tuple) else (value,)))
    glDrawArrays(0x0005,0,4);out=np.empty((H,W,4),dtype=np.uint8);glReadPixels(0,0,W,H,0x1908,0x1401,out.ctypes.data);assert glGetError()==0;return out[:,:,:3].copy()
original=draw();images=[draw(i) for i in range(8)]
a=np.array([[.59719,.35458,.04823],[.076,.90834,.01566],[.0284,.13383,.83777]])
b=np.array([[1.60475,-.53108,-.07367],[-.10208,1.10813,-.00605],[-.00327,-.07276,1.07602]])
v=(pixels[:,:,:3]*1.125/.6)@a.T;v=(v*(v+.0245786)-.000090537)/(v*(.983729*v+.432951)+.238081);v=np.clip(v@b.T,0,1);reference=np.where(v<=.0031308,v*12.92,1.055*v**(1/2.4)-.055)*255
assert np.max(abs(original.astype(float)-reference))<2,'Original matches the game ACES/sRGB without double exposure.'
for i,image in enumerate(images[1:],1):assert np.mean(abs(image.astype(float)-original))>.8,(i,'Preset must visibly differ from Original.')
assert np.max(np.ptp(images[7].astype(int),axis=2))<=1,'Black & White remains neutral.'
assert images[1][64,80,0]>original[64,80,0] and images[1][64,80,2]<original[64,80,2]
assert images[5][64,144,2]/max(1,int(images[5][64,144,0]))>original[64,144,2]/max(1,int(original[64,144,0]))
assert images[5][64,176,0]>=original[64,176,0]*.97,'Moonlit keeps warm lamp red.'
assert np.array_equal(draw(3,uStrength=0,uGrain=1,uVignette=1,uGlow=1,uExposure=1),original)
assert np.array_equal(draw(5,uCompare=1,uGrain=1,uVignette=1,uGlow=1,uExposure=1),original)
assert draw(uExposure=1)[64,48,0]>original[64,48,0]
assert draw(uTemperature=-1)[64,80,2]>draw(uTemperature=1)[64,80,2]
assert np.max(np.ptp(draw(uSaturation=-1).astype(int),axis=2))<=1
noisy=draw(3,uGrain=1);assert np.array_equal(noisy,draw(3,uGrain=1)),'Frozen grain must be stable.'
assert np.std(noisy[:,70:90].astype(float)-images[3][:,70:90].astype(float))>1
# Crop-relative vignette: its centre follows a moved portrait frame.
constant=np.ones_like(pixels)*.3;constant[:,:,3]=1;glActiveTexture(0x84C0);glBindTexture(0x0DE1,world);glTexImage2D(0x0DE1,0,0x8814,W,H,0,0x1908,0x1406,constant.ctypes.data)
shade=draw(uVignette=1,uCrop=(.5,0,.28125,1));assert shade[64,164,0]>shade[64,129,0]+10
# Two real RGBA16F blur passes produce a gradual halo outside a bright patch.
light=np.zeros_like(pixels);light[60:68,124:132,:3]=4;light[:,:,3]=1
glActiveTexture(0x84C0);glBindTexture(0x0DE1,world);glTexImage2D(0x0DE1,0,0x8814,W,H,0,0x1908,0x1406,light.ctypes.data)
tex_a=texture(internal=0x881A);tex_b=texture(internal=0x881A);fbo=U();glGenFramebuffers(1,C.byref(fbo))
for source,target,step,extract in [(world,tex_a,(1/W,0),1),(tex_a,tex_b,(0,1/H),0)]:
    glBindFramebuffer(0x8D40,fbo);glFramebufferTexture2D(0x8D40,0x8CE0,0x0DE1,target,0);assert glCheckFramebufferStatus(0x8D40)==0x8CD5
    bind_vertices(blur);glActiveTexture(0x84C0);glBindTexture(0x0DE1,source)
    for key,val in [('uImage',0),('uStep',step),('uExtract',extract),('uThreshold',(1.15,3.0))]:uniform(blur,key,*(val if isinstance(val,tuple) else (val,)))
    glDrawArrays(0x0005,0,4)
bloom=tex_b;glowing=draw(uGlow=1);plain=draw();assert glowing[64,133,0]>plain[64,133,0]+5,'Blur must glow beyond the light source.';assert glowing[64,133,0]>glowing[64,138,0]
baseline=draw(uWorldGlow=.8);assert baseline[64,133,0]>plain[64,133,0]+4,'World bloom halos appear without a photo preset.'
assert np.array_equal(draw(5,uWorldGlow=.8,uCompare=1,uGlow=1),baseline),'Original comparison preserves the world glow.'
assert np.array_equal(draw(3,uWorldGlow=.8,uStrength=0,uGlow=1),baseline),'Zero photo intensity preserves the world glow.'

# Raster pixels verify the final edge resolve, independent of geometry MSAA.
y,x=np.mgrid[0:H,0:W];edges=np.full_like(pixels,.025);edges[:,:,3]=1
wire=(x>y*.66+30)&(x<y*.66+33)
roof=(x>125)&(y>x*.42-10)
edges[np.logical_or(wire,roof),:3]=.60
glActiveTexture(0x84C0);glBindTexture(0x0DE1,world);glTexImage2D(0x0DE1,0,0x8814,W,H,0,0x1908,0x1406,edges.ctypes.data)
rigid=draw();smooth=draw(uAntialias=1,uSharpness=.12)
assert np.array_equal(smooth,draw(uAntialias=1,uSharpness=.12)),'Edge resolve must be stable in a frozen frame.'
assert np.array_equal(smooth,draw(3,uAntialias=1,uSharpness=.12,uStrength=0,uGlow=1,uExposure=1))
assert np.array_equal(smooth,draw(5,uAntialias=1,uSharpness=.12,uCompare=1,uGlow=1,uExposure=1))
lo=int(rigid[10,10,0]);hi=int(rigid[100,200,0])
partial=lambda image:np.count_nonzero((image[:,:,0]>lo+5)&(image[:,:,0]<hi-5))
assert partial(smooth)>partial(rigid)+60,'Diagonal edges need smooth fractional coverage.'
assert np.array_equal(smooth[3:20,3:20],rigid[3:20,3:20]),'Flat colour is not blurred or tinted.'
for row in range(20,100):
    centre=int(row*.66+31.5);assert smooth[row,centre-1:centre+2,0].max()>lo+(hi-lo)*.65,'Thin rails/window bars remain visible.'
assert smooth.min()>=rigid.min() and smooth.max()<=rigid.max(),'Sharpening does not produce bright/dark edge halos.'
from PIL import Image
Image.fromarray(np.concatenate([rigid,smooth],axis=1)[::-1]).resize((1024,256),Image.Resampling.NEAREST).save('/tmp/railway-aa-qa.png')
# Mild low-contrast texture sharpening must increase detail without overshoot.
detail=np.ones_like(pixels)*(.20);detail[:,:,:3]+=(np.sin(x*.75)*.015+np.sin(y*.31)*.007)[:,:,None];detail[:,:,3]=1
glActiveTexture(0x84C0);glBindTexture(0x0DE1,world);glTexImage2D(0x0DE1,0,0x8814,W,H,0,0x1908,0x1406,detail.ctypes.data)
plain_detail=draw(uAntialias=1);sharp_detail=draw(uAntialias=1,uSharpness=.12)
assert sharp_detail[10:-10,10:-10].std()>plain_detail[10:-10,10:-10].std(),'Fine painted texture contrast is gently restored.'
assert sharp_detail.min()>=plain_detail.min()-1 and sharp_detail.max()<=plain_detail.max()+1
print(json.dumps({'renderer':glGetString(0x1F01).decode(),'programs':2,'checks':['ACES/sRGB reference','8 distinct filters','warm tones','cool water/warm lamps','neutral monochrome','zero intensity','Original compare','exposure/temperature/saturation','stable grain','crop-relative vignette','RGBA16F bloom halo','world bloom preserved in compare and zero intensity','diagonal edge resolve','thin-line visibility','halo-free texture sharpening','AA retained in Original comparison'],'note':'Native GLES pixel test; browser UI and PNG download not exercised.'}))
