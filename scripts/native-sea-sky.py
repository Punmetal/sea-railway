"""Focused native pixels from the actual sky and reflection GLSL functions."""
def render(data,api):
    import ctypes as C
    import numpy as np
    from PIL import Image
    P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
    for name,result,args in [('glUniform3f',None,[I,F,F,F]),('glUniformMatrix4fv',None,[I,I,B,P]),('glEnable',None,[U]),('glDisable',None,[U]),('glCullFace',None,[U]),('glClearColor',None,[F,F,F,F]),('glClear',None,[U]),('glDrawElements',None,[U,I,U,P]),('glGenVertexArrays',None,[I,C.POINTER(U)]),('glBindVertexArray',None,[U])]:api[name]=api['api'](api['g'],name,result,args)
    def call(name,*args):return api[name](*args)
    programs={c['name']:api['program'](c['fragment'],c['vertex']) for c in data['programs'] if c['name'] in ['painted-sky-aurora','reflection-sample']}
    width,height=640,480
    def texture(pixels):
        pixels=np.asarray(pixels,dtype=np.float32);h,w=pixels.shape[:2];t=U();call('glGenTextures',1,C.byref(t));call('glBindTexture',0x0DE1,t);call('glTexImage2D',0x0DE1,0,0x8814,w,h,0,0x1908,0x1406,pixels.ctypes.data)
        for n,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:call('glTexParameteri',0x0DE1,n,v)
        return t
    output=U();call('glGenTextures',1,C.byref(output));call('glBindTexture',0x0DE1,output);call('glTexImage2D',0x0DE1,0,0x8058,width,height,0,0x1908,0x1401,None)
    for n in [0x2801,0x2800]:call('glTexParameteri',0x0DE1,n,0x2601)
    fbo=U();call('glGenFramebuffers',1,C.byref(fbo));call('glBindFramebuffer',0x8D40,fbo);call('glFramebufferTexture2D',0x8D40,0x8CE0,0x0DE1,output,0);assert call('glCheckFramebufferStatus',0x8D40)==0x8CD5;call('glViewport',0,0,width,height)
    def uniform(p,name,value):
        loc=call('glGetUniformLocation',p,name.encode());a=np.asarray(value,dtype=np.float32).flatten()
        if loc<0:return
        if name in ['uPaintedSky','uReference','tReflectionDepth']:call('glUniform1i',loc,int(a[0]))
        elif a.size==16:call('glUniformMatrix4fv',loc,1,0,a.ctypes.data)
        elif a.size==3:call('glUniform3f',loc,*a)
        else:call('glUniform1f',loc,a[0])
    buffers=[]
    def attribute(p,name,array,size):
        loc=call('glGetAttribLocation',p,name.encode())
        if loc<0:return
        array=np.asarray(array,dtype=np.float32);buffer=U();call('glGenBuffers',1,C.byref(buffer));call('glBindBuffer',0x8892,buffer);call('glBufferData',0x8892,array.nbytes,array.ctypes.data,0x88E4);call('glEnableVertexAttribArray',loc);call('glVertexAttribPointer',loc,size,0x1406,0,0,None);buffers.extend([buffer,array])
    def pixels():
        result=np.empty((height,width,4),dtype=np.uint8);call('glReadPixels',0,0,width,height,0x1908,0x1401,result.ctypes.data);assert call('glGetError')==0;return result
    sky=data['skyPreview'];p=programs['painted-sky-aurora'];call('glUseProgram',p);vao=U();call('glGenVertexArrays',1,C.byref(vao));call('glBindVertexArray',vao);attribute(p,'position',sky['positions'],3)
    indices=np.asarray(sky['indices'],dtype=np.uint16);ib=U();call('glGenBuffers',1,C.byref(ib));call('glBindBuffer',0x8893,ib);call('glBufferData',0x8893,indices.nbytes,indices.ctypes.data,0x88E4)
    identity=np.eye(4,dtype=np.float32).flatten(order='F')
    colours={'uTop':[.0033,.008,.041],'uHorizon':[.045,.084,.209],'uWarm':[.138,.195,.323],'uCloud':[.097,.125,.223],'uCloudShadow':[.05,.061,.107],'uSun':[.604,.738,1.]}
    for name,value in {**colours,'modelViewMatrix':sky['view'],'projectionMatrix':sky['projection'],'toneMappingExposure':1.125,'uReady':0,'uPaintedSky':0,'uSunY':.24}.items():uniform(p,name,value)
    black=texture(np.zeros((1,1,4),dtype=np.float32));call('glActiveTexture',0x84C0);call('glBindTexture',0x0DE1,black);call('glEnable',0x0B44);call('glCullFace',0x0404)
    def sky_frame(aurora,night=1,time=0,overcast=0):
        for name,value in {'uAurora':aurora,'uNight':night,'uTime':time,'uOvercast':overcast,'uMist':0}.items():uniform(p,name,value)
        call('glClearColor',0,0,0,1);call('glClear',0x4000);call('glDrawElements',0x0004,len(indices),0x1403,None);return pixels()
    plain=sky_frame(0);night=sky_frame(1);assert np.array_equal(night,sky_frame(1));assert np.array_equal(sky_frame(0,0),sky_frame(1,0)),'Aurora must disappear in daylight.'
    delta=np.maximum(0,night[:,:,:3].astype(int)-plain[:,:,:3].astype(int));assert np.count_nonzero(np.any(delta>4,axis=2))>4000,'Aurora curtains must be visibly present.'
    assert np.count_nonzero(night!=sky_frame(1,time=25))>4000,'Curtains drift with the shared clock.'
    cloudy=sky_frame(1,overcast=1);cloud_base=sky_frame(0,overcast=1);assert np.maximum(0,cloudy[:,:,:3].astype(int)-cloud_base[:,:,:3].astype(int)).mean()<delta.mean()*.5,'Clouds soften the aurora.'
    Image.fromarray(night[::-1]).save('/tmp/railway-aurora-qa.png')
    # Synthetic object silhouettes exercise actual fade/ripple GLSL independently
    # of scene composition: a broad house reflection and a narrow lamp post.
    p=programs['reflection-sample'];call('glUseProgram',p);call('glDisable',0x0B44);vao2=U();call('glGenVertexArrays',1,C.byref(vao2));call('glBindVertexArray',vao2)
    attribute(p,'position',[-1,-1,0,1,-1,0,-1,1,0,1,1,0],3);attribute(p,'uv',[0,0,1,0,0,1,1,1],2)
    image=np.zeros((height,width,4),dtype=np.float32);image[:430,240:340,:]=[.74,.67,.43,1];image[:440,470:476,:]=[.68,.73,.81,1];image[70:80,240:340,:3]=[.40,.29,.20];reference=texture(image);depth=texture(np.full((1,1,4),.5,dtype=np.float32))
    call('glActiveTexture',0x84C0);call('glBindTexture',0x0DE1,reference);call('glActiveTexture',0x84C1);call('glBindTexture',0x0DE1,depth)
    world=np.eye(4,dtype=np.float32);world[1,1]=12;world[1,3]=12.018
    for name,value in {'uReference':0,'tReflectionDepth':1,'uReflectionInverseProjection':identity,'uReflectionWorld':world.flatten(order='F')}.items():uniform(p,name,value)
    def reflection_frame(ripple=1,fade=1,time=0,footprint=.1):
        for name,value in {'uRipple':ripple,'uFade':fade,'uTime':time,'uFootprint':footprint}.items():uniform(p,name,value)
        call('glDrawArrays',0x0005,0,4);return pixels()
    rigid=reflection_frame(0,0);soft=reflection_frame();assert np.array_equal(soft,reflection_frame()),'Frozen reflection must not flicker.'
    assert soft[30,290,0]>soft[360,290,0]+65,'The reflected tip must fade towards water colour.'
    assert np.count_nonzero(soft!=reflection_frame(time=19))>100,'Reflected edges move gently with waves.'
    assert np.array_equal(reflection_frame(footprint=3),reflection_frame(0,footprint=3)),'Subpixel ripples fade at the horizon.'
    Image.fromarray(np.concatenate([rigid[::-1],soft[::-1]],axis=1)).save('/tmp/railway-reflection-qa.png')
    print('Native sky/reflection pixels: visible night-only aurora, slow drift, cloud occlusion, frozen repeats, object-tip fade and distant ripple filtering passed. /tmp/railway-aurora-qa.png /tmp/railway-reflection-qa.png')
