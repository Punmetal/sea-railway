"""Native component pixels for lamp occlusion and reflected snow; no browser."""
def render(data,api):
    import ctypes as C
    import numpy as np
    from PIL import Image
    P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
    for name,result,args in [('glUniform3f',None,[I,F,F,F]),('glUniformMatrix4fv',None,[I,I,B,P]),('glEnable',None,[U]),('glDisable',None,[U]),('glBlendFunc',None,[U,U]),('glClearColor',None,[F,F,F,F]),('glClear',None,[U]),('glGenVertexArrays',None,[I,C.POINTER(U)]),('glBindVertexArray',None,[U])]:api[name]=api['api'](api['g'],name,result,args)
    def call(name,*args):return api[name](*args)
    width,height=256,128
    def texture(array):
        array=np.asarray(array,dtype=np.float32);h,w=array.shape[:2];t=U();call('glGenTextures',1,C.byref(t));call('glBindTexture',0x0DE1,t);call('glTexImage2D',0x0DE1,0,0x8814,w,h,0,0x1908,0x1406,array.ctypes.data)
        for key,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:call('glTexParameteri',0x0DE1,key,value)
        return t
    output=U();call('glGenTextures',1,C.byref(output));call('glBindTexture',0x0DE1,output);call('glTexImage2D',0x0DE1,0,0x8058,width,height,0,0x1908,0x1401,None)
    for key in [0x2801,0x2800]:call('glTexParameteri',0x0DE1,key,0x2600)
    fbo=U();call('glGenFramebuffers',1,C.byref(fbo));call('glBindFramebuffer',0x8D40,fbo);call('glFramebufferTexture2D',0x8D40,0x8CE0,0x0DE1,output,0);assert call('glCheckFramebufferStatus',0x8D40)==0x8CD5;call('glViewport',0,0,width,height);call('glDisable',0x0B44);call('glDisable',0x0BE2)
    def uniform(p,name,value):
        loc=call('glGetUniformLocation',p,name.encode());a=np.asarray(value,dtype=np.float32).flatten()
        if loc<0:return
        if name=='uShadow':call('glUniform1i',loc,int(a[0]))
        elif a.size==16:call('glUniformMatrix4fv',loc,1,0,a.ctypes.data)
        elif a.size==3:call('glUniform3f',loc,*a)
        elif a.size==2:call('glUniform2f',loc,*a)
        else:call('glUniform1f',loc,a[0])
    buffers=[]
    def attribute(p,name,array,size):
        loc=call('glGetAttribLocation',p,name.encode())
        if loc<0:return
        array=np.asarray(array,dtype=np.float32);buffer=U();call('glGenBuffers',1,C.byref(buffer));call('glBindBuffer',0x8892,buffer);call('glBufferData',0x8892,array.nbytes,array.ctypes.data,0x88E4);call('glEnableVertexAttribArray',loc);call('glVertexAttribPointer',loc,size,0x1406,0,0,None);buffers.extend([buffer,array])
    def pixels():
        result=np.empty((height,width,4),dtype=np.uint8);call('glReadPixels',0,0,width,height,0x1908,0x1401,result.ctypes.data);assert call('glGetError')==0;return result
    case=next(c for c in data['programs'] if c['name']=='lamp-occlusion-sample');p=api['program'](case['fragment'],case['vertex']);call('glUseProgram',p);vao=U();call('glGenVertexArrays',1,C.byref(vao));call('glBindVertexArray',vao)
    attribute(p,'position',[-1,-1,0,1,-1,0,-1,1,0,1,1,0],3);attribute(p,'uv',[0,0,1,0,0,1,1,1],2)
    shadow=np.zeros((64,64,4),dtype=np.float32);shadow[:,:,:]=[.3/(255/256),0,0,0];shadow[:,32:,:]=1
    packed=texture(shadow);call('glActiveTexture',0x84C0);call('glBindTexture',0x0DE1,packed);uniform(p,'uShadow',0)
    def visibility(depth,ready=1):
        uniform(p,'uTestDepth',depth);uniform(p,'uTestReady',ready);call('glDrawArrays',0x0005,0,4);return pixels()
    behind=visibility(.8);ahead=visibility(.2);assert ahead[30:90,20:100,:3].min()==255;assert behind[30:90,20:100,:3].max()==0,'Geometry blocks light beyond its packed shadow depth.';assert behind[30:90,150:230,:3].min()==255;assert visibility(.8,0)[:,:,:3].min()==255
    assert np.array_equal(behind,visibility(.8)),'Frozen light occlusion is stable.'
    case=next(c for c in data['programs'] if c['name']=='ridge-wash-sample');p=api['program'](case['fragment'],case['vertex']);call('glUseProgram',p);vao=U();call('glGenVertexArrays',1,C.byref(vao));call('glBindVertexArray',vao)
    attribute(p,'position',[-1,-1,0,1,-1,0,-1,1,0,1,1,0],3);attribute(p,'uv',[0,0,1,0,0,1,1,1],2)
    for sea,ridge in [([.16,.38,.47],[.25,.50,.57]),([.16,.15,.28],[.52,.34,.31]),([.025,.055,.14],[.03,.065,.17])]:
        uniform(p,'uTestSea',sea);uniform(p,'uTestRidge',ridge);uniform(p,'uTestSoft',0);call('glDrawArrays',0x0005,0,4);hard=pixels();uniform(p,'uTestSoft',1);call('glDrawArrays',0x0005,0,4);soft=pixels();base=np.asarray(sea)*255
        assert np.abs(soft[:,:,:3]-base).mean()<np.abs(hard[:,:,:3]-base).mean()*.16,'Ridge contrast blends into the current water palette.'
        assert np.linalg.norm(soft[-5:,:,:3].mean(axis=(0,1))-np.rint(base))<=np.linalg.norm(soft[:5,:,:3].mean(axis=(0,1))-np.rint(base)),'Mountain reflection tips fade gradually within 8-bit quantization.'
    case=next(c for c in data['programs'] if c['name']=='snow-reflection');p=api['program'](case['fragment'],case['vertex']);call('glUseProgram',p);vao=U();call('glGenVertexArrays',1,C.byref(vao));call('glBindVertexArray',vao)
    positions=[[x,y,-12] for y in [1.5,2.5,3.5,4.5,5.5] for x in np.linspace(-6,6,13)];attribute(p,'position',positions,3);attribute(p,'aSeed',np.full(len(positions),.45),1)
    # Real perspective/view matrices (camera at y=4, z=12, facing -Z).
    view=np.eye(4,dtype=np.float32);view[:3,3]=[0,-4,-12];f=1/np.tan(np.deg2rad(48)/2);projection=np.zeros((4,4),dtype=np.float32);projection[0,0]=f/2;projection[1,1]=f;projection[2,2]=-(100+.08)/(100-.08);projection[2,3]=-2*100*.08/(100-.08);projection[3,2]=-1
    for name,value in {'viewMatrix':view.flatten(order='F'),'projectionMatrix':projection.flatten(order='F'),'uCentre':[0,4,12],'uTint':[.76,.82,.9],'uCars[0]':[10000,0,0],'uCars[1]':[10000,0,0],'uYaws':[0,0],'uStationCount':0,'uSnow':1,'uTime':0,'toneMappingExposure':1.125}.items():uniform(p,name,value)
    call('glEnable',0x0BE2);call('glBlendFunc',0x0302,0x0303)
    def snow_frame(reflected,scale=1,amount=1):
        call('glClearColor',.06,.09,.15,1);call('glClear',0x4000);uniform(p,'uSnow',amount);uniform(p,'uSnowReflection',reflected);uniform(p,'uPixelRatio',scale);call('glDrawArrays',0,0,len(positions));return pixels()
    plain=snow_frame(0,amount=0);falling=snow_frame(0);reflected=snow_frame(1);assert np.array_equal(reflected,snow_frame(1))
    def energy(image):return np.maximum(0,image[:,:,:3].astype(float)-plain[:,:,:3]).sum()
    assert energy(falling)>500,'Falling flakes remain visible.';assert 0<energy(reflected)<energy(falling)*.12,'Reflected flakes are smaller, dimmer and softer.'
    scaled=snow_frame(1,1024/3840);assert energy(scaled)<=energy(reflected),'A lower resolution reflection cannot inflate a flake.'
    Image.fromarray(np.concatenate([falling,reflected],axis=1)[::-1]).resize((1024,256)).save('/tmp/railway-snow-reflection-qa.png')
    print('Native polish pixels: packed-depth lamp occlusion, frozen repeat, reduced reflected snow footprint/brightness and reflection-target scaling passed.')
