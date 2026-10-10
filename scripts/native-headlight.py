"""Isolated native raster QA of the real headlight cone geometry and shader."""
def render(data,api):
    import ctypes as C
    import numpy as np
    from PIL import Image
    P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
    for name,result,args in [('glUniform3f',None,[I,F,F,F]),('glUniformMatrix4fv',None,[I,I,B,P]),('glEnable',None,[U]),('glCullFace',None,[U]),('glBlendFunc',None,[U,U]),('glClearColor',None,[F,F,F,F]),('glClear',None,[U]),('glDrawElements',None,[U,I,U,P])]:api[name]=api['api'](api['g'],name,result,args)
    def call(name,*args):return api[name](*args)
    case=next(c for c in data['programs'] if c['name']=='headlight-volume');fragment=case['fragment'].replace('#define TONE_MAPPING\n','').replace('return sRGBTransferOETF(c);','return c;');p=api['program'](fragment,case['vertex']);call('glUseProgram',p)
    width,height=640,480;tex=U();call('glGenTextures',1,C.byref(tex));call('glBindTexture',0x0DE1,tex);call('glTexImage2D',0x0DE1,0,0x881A,width,height,0,0x1908,0x1406,None)
    for n in [0x2801,0x2800]:call('glTexParameteri',0x0DE1,n,0x2601)
    fbo=U();call('glGenFramebuffers',1,C.byref(fbo));call('glBindFramebuffer',0x8D40,fbo);call('glFramebufferTexture2D',0x8D40,0x8CE0,0x0DE1,tex,0);assert call('glCheckFramebufferStatus',0x8D40)==0x8CD5
    call('glViewport',0,0,width,height);call('glEnable',0x0B44);call('glCullFace',0x0404);call('glEnable',0x0BE2);call('glBlendFunc',0x0302,1)
    head=data['headlightPreview'];model=np.array(head['model'],dtype=np.float32).reshape(4,4,order='F');view=np.array(head['view'],dtype=np.float32).reshape(4,4,order='F')
    def uniform(name,value):
        loc=call('glGetUniformLocation',p,name.encode());a=np.array(value,dtype=np.float32).flatten()
        if loc<0:return
        if a.size==16:call('glUniformMatrix4fv',loc,1,0,a.ctypes.data)
        elif a.size==3:call('glUniform3f',loc,*a)
        else:call('glUniform1f',loc,a[0])
    for name,value in {'modelMatrix':head['model'],'modelViewMatrix':(view@model).flatten(order='F'),'projectionMatrix':head['projection'],'cameraPosition':head['eye'],'uBeamInverse':head['inverse'],'uBeamMatrix':head['model'],'uBeamColor':head['color'],'toneMappingExposure':1.125}.items():uniform(name,value)
    positions=np.array(head['positions'],dtype=np.float32);buffer=U();call('glGenBuffers',1,C.byref(buffer));call('glBindBuffer',0x8892,buffer);call('glBufferData',0x8892,positions.nbytes,positions.ctypes.data,0x88E4)
    loc=call('glGetAttribLocation',p,b'position');call('glEnableVertexAttribArray',loc);call('glVertexAttribPointer',loc,3,0x1406,0,0,None)
    indices=np.array(head['indices'],dtype=np.uint16);ib=U();call('glGenBuffers',1,C.byref(ib));call('glBindBuffer',0x8893,ib);call('glBufferData',0x8893,indices.nbytes,indices.ctypes.data,0x88E4)
    def frame(strength,air=1,reflection=0):
        call('glClearColor',.04,.075,.13,1);call('glClear',0x4000);uniform('uBeamStrength',strength);uniform('uBeamAir',air);uniform('uBeamReflection',reflection);call('glDrawElements',0x0004,len(indices),0x1403,None)
        pixels=np.empty((height,width,4),dtype=np.float32);call('glReadPixels',0,0,width,height,0x1908,0x1406,pixels.ctypes.data);assert call('glGetError')==0;return pixels
    day=frame(0);assert np.array_equal(day,frame(1,reflection=1)),'Volume is absent in the water reflection.';evening=frame(.55);night=frame(1);mist=frame(1,1.4);assert np.array_equal(night,frame(1)),'Frozen beam pixels are stable.'
    def light(a):return np.maximum(0,a[:,:,:3]-day[:,:,:3]).sum()
    assert light(night)>light(evening)>1000;assert light(mist)>light(night);assert np.count_nonzero(np.any(night[:,:,:3]!=day[:,:,:3],axis=2))>5000,'Beam must have visible volume.'
    for view_case in head.get('views',[]):
        view=np.asarray(view_case['view'],dtype=np.float32).reshape(4,4,order='F')
        for name,value in {'modelViewMatrix':(view@model).flatten(order='F'),'projectionMatrix':view_case['projection'],'cameraPosition':view_case['eye']}.items():uniform(name,value)
        assert light(frame(1))>100,view_case['name']+' view should see a soft beam.'
    a=np.array([[.59719,.35458,.04823],[.076,.90834,.01566],[.0284,.13383,.83777]]);b=np.array([[1.60475,-.53108,-.07367],[-.10208,1.10813,-.00605],[-.00327,-.07276,1.07602]])
    v=(night[:,:,:3]*1.125/.6)@a.T;v=(v*(v+.0245786)-.000090537)/(v*(.983729*v+.432951)+.238081);v=np.clip(v@b.T,0,1);v=np.where(v<=.0031308,v*12.92,1.055*v**(1/2.4)-.055)
    Image.fromarray(np.rint(v[::-1]*255).astype(np.uint8)).save('/tmp/railway-headlight-qa.png');print('Actual headlight cone raster: visible warm volume, dusk/night strength, mist density and frozen repeat passed. /tmp/railway-headlight-qa.png')
