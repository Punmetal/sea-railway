"""Actual character surface/material preview with native GLES, no browser."""
def render(data,api):
    import ctypes as C
    import numpy as np
    from PIL import Image, ImageDraw
    g=api['g'];P=C.c_void_p;I=C.c_int;U=C.c_uint;F=C.c_float;B=C.c_ubyte
    signatures=[('glUniform3f',None,[I,F,F,F]),('glUniform2fv',None,[I,I,P]),('glUniform4fv',None,[I,I,P]),('glUniformMatrix4fv',None,[I,I,B,P]),('glUniformMatrix3fv',None,[I,I,B,P]),('glGenRenderbuffers',None,[I,C.POINTER(U)]),('glBindRenderbuffer',None,[U,U]),('glRenderbufferStorage',None,[U,U,I,I]),('glFramebufferRenderbuffer',None,[U,U,U,U]),('glEnable',None,[U]),('glDisable',None,[U]),('glDepthMask',None,[B]),('glBlendFunc',None,[U,U]),('glClearColor',None,[F,F,F,F]),('glClear',None,[U]),('glGenVertexArrays',None,[I,C.POINTER(U)]),('glBindVertexArray',None,[U])]
    for n,r,args in signatures:api[n]=api['api'](g,n,r,args)
    def call(n,*args):return api[n](*args)
    programs=[api['program'](case['fragment'],case['vertex']) for case in data['programs']]
    width,height=960,720;tex=U();call('glGenTextures',1,C.byref(tex));call('glBindTexture',0x0DE1,tex);call('glTexImage2D',0x0DE1,0,0x8058,width,height,0,0x1908,0x1401,None)
    for n,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:call('glTexParameteri',0x0DE1,n,v)
    fbo=U();call('glGenFramebuffers',1,C.byref(fbo));call('glBindFramebuffer',0x8D40,fbo);call('glFramebufferTexture2D',0x8D40,0x8CE0,0x0DE1,tex,0)
    depth=U();call('glGenRenderbuffers',1,C.byref(depth));call('glBindRenderbuffer',0x8D41,depth);call('glRenderbufferStorage',0x8D41,0x81A6,width,height);call('glFramebufferRenderbuffer',0x8D40,0x8D00,0x8D41,depth);assert call('glCheckFramebufferStatus',0x8D40)==0x8CD5
    call('glEnable',0x0B71);call('glBlendFunc',0x0302,0x0303)
    keep=[]
    for m in data['meshes']:
        p=programs[m['program']];vao=U();call('glGenVertexArrays',1,C.byref(vao));call('glBindVertexArray',vao);m['vao']=vao
        for field,name,size in [('positions','position',3),('normals','normal',3),('uv','uv',2)]:
            loc=call('glGetAttribLocation',p,name.encode())
            if loc<0:continue
            arr=np.asarray(m[field],dtype=np.float32);buf=U();call('glGenBuffers',1,C.byref(buf));call('glBindBuffer',0x8892,buf);call('glBufferData',0x8892,arr.nbytes,arr.ctypes.data,0x88E4);keep.extend([arr,buf]);call('glEnableVertexAttribArray',loc);call('glVertexAttribPointer',loc,size,0x1406,0,0,None)
    def uniform(p,n,value):
        loc=call('glGetUniformLocation',p,n.encode())
        if loc<0:return
        a=np.asarray(value,dtype=np.float32).flatten()
        if n in ['isOrthographic','receiveShadow']:call('glUniform1i',loc,int(a[0]))
        elif a.size==16:call('glUniformMatrix4fv',loc,1,0,a.ctypes.data)
        elif a.size==9:call('glUniformMatrix3fv',loc,1,0,a.ctypes.data)
        elif a.size==8:call('glUniform4fv',loc,2,a.ctypes.data)
        elif a.size==4:call('glUniform2fv',loc,2,a.ctypes.data)
        elif a.size==3:call('glUniform3f',loc,*a)
        elif a.size==1:call('glUniform1f',loc,a[0])
    images=[];label=data.get('previewName','characters')
    for v in data['views']:
        w=504 if v['name']=='child' else width;call('glViewport',0,0,w,height);call('glDepthMask',1);call('glClearColor',.78,.86,.86,1);call('glClear',0x4000|0x0100)
        view=np.array(v['view'],dtype=np.float32).reshape(4,4,order='F');sun=view[:3,:3]@np.array([1,.7,.4]);sun/=np.linalg.norm(sun);sky=view[:3,:3]@np.array([0,1,0]);eye=np.array(v['eye'])
        meshes=[m for m in data['meshes'] if v['name']!='child' or m['scope']=='child']
        def distance(m):
            model=np.array(m['model']).reshape(4,4,order='F');vertices=np.asarray(m['positions']).reshape(-1,3);c=model@np.append((vertices.min(0)+vertices.max(0))/2,1);return np.linalg.norm(eye-c[:3])
        ordered=[m for m in meshes if not m['transparent']]+sorted([m for m in meshes if m['transparent']],key=distance,reverse=True)
        for m in ordered:
            p=programs[m['program']];call('glUseProgram',p);model=np.array(m['model'],dtype=np.float32).reshape(4,4,order='F');mv=view@model;normal=np.linalg.inv(mv[:3,:3]).T
            values={'modelMatrix':m['model'],'modelViewMatrix':mv.flatten(order='F'),'viewMatrix':v['view'],'projectionMatrix':v['projection'],'normalMatrix':normal.flatten(order='F'),'cameraPosition':v['eye'],'diffuse':m['color'],'roughness':m['roughness'],'metalness':0,'opacity':m['opacity'],'emissive':[0,0,0],'toneMappingExposure':1.0,'isOrthographic':0,'receiveShadow':0,'ambientLightColor':[.04,.04,.04],'hemisphereLights[0].direction':sky,'hemisphereLights[0].skyColor':[1.05,1.14,1.16],'hemisphereLights[0].groundColor':[.45,.37,.28],'directionalLights[0].direction':sun,'directionalLights[0].color':[2.2,2.05,1.75],'directionalLights[1].direction':-sun,'directionalLights[1].color':[.18,.25,.28],'directionalLights[2].direction':sun,'directionalLights[2].color':[.1,.1,.1],'uPaintTop':[.05,.3,.6],'uPaintHorizon':[.5,.75,.8],'uPaintSea':[.05,.32,.45],'uPaintNight':0,'uPaintRain':0,'uPaintMist':0,'uStationShelters':np.array([[1e6,0,1e6,0]]*2).flatten(),'uStationRoofHalf':[0,0,0,0],'uCloakTime':0,'uCloakSway':0}
            for n,a in values.items():uniform(p,n,a)
            call('glDepthMask',0 if m['transparent'] else 1);call('glEnable' if m['transparent'] else 'glDisable',0x0BE2);call('glDisable' if m['side']==2 else 'glEnable',0x0B44)
            call('glBindVertexArray',m['vao']);call('glDrawArrays',0x0004,0,len(m['positions'])//3)
        pixels=np.empty((height,w,4),dtype=np.uint8);call('glReadPixels',0,0,w,height,0x1908,0x1401,pixels.ctypes.data);assert call('glGetError')==0;im=Image.fromarray(pixels[::-1]);ImageDraw.Draw(im).text((14,14),v['name']+' - actual geometry / cutaway fixture',fill='#24344a');im.save('/tmp/railway-'+label+'-'+v['name']+'.png');images.append(im)
    sheet=Image.new('RGB',(sum(im.width for im in images),height),'#d2dde0');x=0
    for im in images:sheet.paste(im,(x,0));x+=im.width
    output='/tmp/railway-'+label+'-qa.png';sheet.save(output);print('Actual component shaders and buffers rendered:',output)
