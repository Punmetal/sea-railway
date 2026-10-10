"""Render the actual game's leaf and branch buffers in native GLES for visual QA."""
def render(data,api):
    import ctypes as C
    import numpy as np
    from PIL import Image
    g=api['g'];P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
    def fn(name,result,args):return api['api'](g,name,result,args)
    functions=[('glUniform3f',None,[I,F,F,F]),('glUniform2fv',None,[I,I,P]),('glUniform4fv',None,[I,I,P]),('glUniformMatrix4fv',None,[I,I,B,P]),('glUniformMatrix3fv',None,[I,I,B,P]),('glVertexAttribDivisor',None,[U,U]),('glDrawElementsInstanced',None,[U,I,U,P,I]),('glDrawArrays',None,[U,I,I]),('glGenRenderbuffers',None,[I,C.POINTER(U)]),('glBindRenderbuffer',None,[U,U]),('glRenderbufferStorage',None,[U,U,I,I]),('glFramebufferRenderbuffer',None,[U,U,U,U]),('glEnable',None,[U]),('glClearColor',None,[F,F,F,F]),('glClear',None,[U])]
    for name,result,args in functions:api[name]=fn(name,result,args)
    def call(name,*args):return api[name](*args)
    programs={case['name']:api['program'](case['fragment'],case['vertex']) for case in data['programs']}
    width,height=640,480;tex=U();call('glGenTextures',1,C.byref(tex));call('glBindTexture',0x0DE1,tex);call('glTexImage2D',0x0DE1,0,0x8058,width,height,0,0x1908,0x1401,None)
    for n,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:call('glTexParameteri',0x0DE1,n,v)
    fbo=U();call('glGenFramebuffers',1,C.byref(fbo));call('glBindFramebuffer',0x8D40,fbo);call('glFramebufferTexture2D',0x8D40,0x8CE0,0x0DE1,tex,0)
    depth=U();call('glGenRenderbuffers',1,C.byref(depth));call('glBindRenderbuffer',0x8D41,depth);call('glRenderbufferStorage',0x8D41,0x81A5,width,height);call('glFramebufferRenderbuffer',0x8D40,0x8D00,0x8D41,depth);assert call('glCheckFramebufferStatus',0x8D40)==0x8CD5
    call('glViewport',0,0,width,height);call('glEnable',0x0B71)
    # The shader declares a shadow sampler even when receiveShadow is false.
    white=U();call('glGenTextures',1,C.byref(white));call('glBindTexture',0x0DE1,white);pixel=np.full(4,255,dtype=np.uint8);call('glTexImage2D',0x0DE1,0,0x8058,1,1,0,0x1908,0x1401,pixel.ctypes.data)
    for n in [0x2801,0x2800]:call('glTexParameteri',0x0DE1,n,0x2600)
    def uniform(program,name,value):
        loc=call('glGetUniformLocation',program,name.encode());values=np.asarray(value,dtype=np.float32).flatten()
        if loc<0:return
        if name in ['receiveShadow','isOrthographic','directionalShadowMap[0]']:call('glUniform1i',loc,int(values[0]))
        elif values.size==16:call('glUniformMatrix4fv',loc,1,0,values.ctypes.data)
        elif values.size==9:call('glUniformMatrix3fv',loc,1,0,values.ctypes.data)
        elif values.size==8:call('glUniform4fv',loc,2,values.ctypes.data)
        elif values.size==4:call('glUniform2fv',loc,2,values.ctypes.data)
        elif values.size==3:call('glUniform3f',loc,*values)
        elif values.size==1:call('glUniform1f',loc,values[0])
    view=np.array(data['camera']['view'],dtype=np.float32).reshape(4,4,order='F');model=np.eye(4,dtype=np.float32);model[0,3]=-35;model[2,3]=-18;mv=view@model
    light=view[:3,:3]@np.array([-.68,.6,-.72]);light/=np.linalg.norm(light);sky=view[:3,:3]@np.array([0,1,0])
    def configure(p,color,time=0):
        call('glUseProgram',p)
        settings={'modelMatrix':model.flatten(order='F'),'modelViewMatrix':mv.flatten(order='F'),'projectionMatrix':data['camera']['projection'],'viewMatrix':data['camera']['view'],'normalMatrix':view[:3,:3].flatten(order='F'),'cameraPosition':data['camera']['position'],'diffuse':color,'roughness':.93,'metalness':0,'emissive':[0,0,0],'opacity':1,'toneMappingExposure':1.02,'isOrthographic':0,'receiveShadow':0,'directionalShadowMap[0]':0,'ambientLightColor':[.10,.12,.10],'hemisphereLights[0].direction':sky,'hemisphereLights[0].skyColor':[.65,.72,.70],'hemisphereLights[0].groundColor':[.25,.34,.28],'directionalLights[0].direction':light,'directionalLights[0].color':[2.3,2.2,1.9],'directionalLights[1].direction':-light,'directionalLights[1].color':[.12,.18,.22],'directionalLights[2].direction':light,'directionalLights[2].color':[.1,.1,.1],'pointLights[0].color':[0,0,0],'fogDensity':0,'fogColor':[.7,.85,.9],'uLeafTime':time,'uLeafSnow':0,'uLeafSun':[1,.95,.78],'uLeafNight':0,'uPaintTop':[.05,.31,.56],'uPaintHorizon':[.5,.76,.8],'uPaintSea':[.054,.327,.456],'uPaintNight':0,'uPaintRain':0,'uPaintMist':0,'uStationShelters':np.array([[1e6,0,1e6,0]]*2).flatten(),'uStationRoofHalf':[0,0,0,0]}
        for name,value in settings.items():uniform(p,name,value)
    keep=[]
    def attribute(p,name,array,size,divisor=0,stride=0,offset=0):
        loc=call('glGetAttribLocation',p,name.encode())
        if loc<0:return
        arr=np.array(array,dtype=np.float32);buf=U();call('glGenBuffers',1,C.byref(buf));call('glBindBuffer',0x8892,buf);call('glBufferData',0x8892,arr.nbytes,arr.ctypes.data,0x88E4);keep.extend([buf,arr]);call('glEnableVertexAttribArray',loc)
        if size==16:
            for col in range(4):call('glEnableVertexAttribArray',loc+col);call('glVertexAttribPointer',loc+col,4,0x1406,0,64,P(col*16));call('glVertexAttribDivisor',loc+col,1)
        else:call('glVertexAttribPointer',loc,size,0x1406,0,stride,P(offset));call('glVertexAttribDivisor',loc,divisor)
    b=data['bark'];p=programs['tree-bark'];configure(p,b['color'])
    for key,name,size in [('positions','position',3),('normals','normal',3),('uv','uv',2)]:attribute(p,name,b[key],size)
    leaf=data['leaf'];lp=programs['leaf-lit'];configure(lp,[1,1,1])
    for key,name,size in [('positions','position',3),('normals','normal',3),('uv','uv',2),('matrices','instanceMatrix',16),('colors','instanceColor',3)]:attribute(lp,name,leaf[key],size,1 if key in ['matrices','colors'] else 0)
    indices=np.array(leaf['indices'],dtype=np.uint16);ib=U();call('glGenBuffers',1,C.byref(ib));call('glBindBuffer',0x8893,ib);call('glBufferData',0x8893,indices.nbytes,indices.ctypes.data,0x88E4)
    # VAOs keep each material's geometry/instancing attributes separate.
    vaogen=fn('glGenVertexArrays',None,[I,C.POINTER(U)]);vaobind=fn('glBindVertexArray',None,[U]);vaos=[]
    for program,geo,is_leaf in [(p,b,False),(lp,leaf,True)]:
        vao=U();vaogen(1,C.byref(vao));vaobind(vao);vaos.append(vao)
        for key,name,size in [('positions','position',3),('normals','normal',3),('uv','uv',2)]:attribute(program,name,geo[key],size)
        if is_leaf:
            attribute(program,'instanceMatrix',geo['matrices'],16);attribute(program,'instanceColor',geo['colors'],3,1);call('glBindBuffer',0x8893,ib)
    def image(time):
        call('glClearColor',.72,.87,.91,1);call('glClear',0x4000|0x0100);configure(p,b['color'],time);vaobind(vaos[0]);call('glDrawArrays',0x0004,0,len(b['positions'])//3)
        configure(lp,[1,1,1],time);vaobind(vaos[1]);call('glDrawElementsInstanced',0x0004,len(indices),0x1403,None,leaf['count'])
        result=np.empty((height,width,4),dtype=np.uint8);call('glReadPixels',0,0,width,height,0x1908,0x1401,result.ctypes.data);assert call('glGetError')==0;return result
    first=image(0);second=image(18);again=image(18);assert np.array_equal(second,again),'Frozen leaf positions must remain identical.'
    assert np.count_nonzero(first!=second)>100,'Wind must alter real rendered leaf geometry.'
    Image.fromarray(first[::-1]).save('/tmp/railway-foliage-qa.png')
    print('Actual 4200-leaf/branch buffers rendered; visible wind and exact frozen repeat passed. /tmp/railway-foliage-qa.png')
