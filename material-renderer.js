'use strict';
(() => {
const state={x:0,y:0,strength:.85,density:.5,palette:1,material:0};
const vertex=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=vec2(a_position.x*.5+.5,.5-a_position.y*.5);gl_Position=vec4(a_position,0.,1.);}`;
const fragment=`
precision highp float;
varying vec2 v_uv;uniform sampler2D u_image;uniform sampler2D u_facets;uniform vec2 u_tilt;uniform float u_kind;uniform float u_palette;uniform float u_strength;uniform float u_density;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 spectrum(float phase){
 vec3 c=.5+.5*cos(6.283185*(phase+vec3(0.,.67,.33)));
 c=mix(vec3(1.),c,.70);
 if(u_palette<.5)c=mix(c,vec3(1.),.43);
 if(u_palette>1.5)c=mix(vec3(.46,.78,1.),vec3(.86,.43,.99),.5+.5*sin(phase*6.283185));
 return c;
}
void main(){
 vec4 art=texture2D(u_image,v_uv);if(art.a<.005){gl_FragColor=vec4(0.);return;}
 vec2 p=v_uv-.5;vec2 light=u_tilt;
 float lum=dot(art.rgb,vec3(.2126,.7152,.0722));
 float chroma=max(art.r,max(art.g,art.b))-min(art.r,min(art.g,art.b));
 float paper=smoothstep(.62,.98,lum)*(1.-smoothstep(.10,.42,chroma)*.90);
 float sweep=dot(p,normalize(vec2(.8,-.6)+light*.25)) + dot(light,vec2(.38,.22));
 float gleam=exp(-pow((sweep-.12)*8.,2.));
 vec3 material=vec3(1.);float cover=1.;
 if(u_kind<.5){
  float phase=p.x*.52-p.y*.70+light.x*.22-light.y*.18;
  vec3 color=spectrum(phase+.11*sin(p.y*5.+light.x));
  float band=.62+.38*sin(sweep*5.+1.);
  material=mix(vec3(.88,.92,.96),color,band*.90);
  material=mix(material,vec3(1.),gleam*.64);
 }else if(u_kind<1.5){
  vec2 center=vec2(.01,-.02)+light*.028;vec2 d=p-center;
  float angle=atan(d.y,d.x);float r=length(d);
  float turn=light.x*1.4-light.y*.9;
  float ray=.5+.5*cos(angle*4.-turn*3.);
  float thin=pow(.5+.5*cos(angle*(44.+u_density*50.)-turn),34.)*.035;
  vec3 color=spectrum(angle/PI*1.6+turn*.24+r*.3);
  float rainbow=pow(ray,1.9)*.82;
  material=mix(vec3(.74,.80,.88),color,rainbow);
  float white=pow(.5+.5*cos(angle*4.-turn*3.+1.05),10.);
  material=mix(material,vec3(1.),white*.92)+thin;
  material=mix(material,vec3(.98),exp(-r*75.));
 }else if(u_kind<2.5){
  vec3 facet=texture2D(u_facets,v_uv).rgb;
  vec2 normal=(facet.rg-.5)*2.;
  vec3 n=normalize(vec3(normal*1.6,1.));vec3 l=normalize(vec3(light*1.9+vec2(.35,-.2),1.));
  float reflection=max(dot(n,l),0.);float flash=pow(reflection,22.);
  vec3 color=spectrum(facet.b+dot(normal,light)*.34+light.x*.1);
  material=mix(vec3(.71,.77,.84),color,.30+reflection*.52);
  material*=.80+reflection*.20;
  material=mix(material,vec3(1.),flash*.90);
  material=mix(material,vec3(1.),gleam*.12);
 }else{
  float density=7.+u_density*7.;vec2 grid=v_uv*density;vec2 cell=floor(grid);
  float seed=hash(cell);vec2 q=fract(grid)-.5;
  q-=vec2(hash(cell+4.)-.5,hash(cell+9.)-.5)*.30;
  float radius=.23+seed*.13;
  float star=pow(abs(q.x)/radius,.55)+pow(abs(q.y)/radius,.55);
  float shape=1.-smoothstep(.93,1.07,star);
  shape*=step(.17,seed);
  float reveal=.5+.5*sin(dot(cell,vec2(.71,.41))+light.x*4.2-light.y*3.1);
  float bright=pow(reveal,5.);
  vec3 color=spectrum(seed+light.x*.11-light.y*.14);
  vec3 base=mix(vec3(.92,.94,.97),spectrum(sweep*.6+.34),.24);
  base=mix(base,vec3(1.),gleam*.45);
  vec3 starColor=mix(color*.85,vec3(1.),pow(reveal,16.)*.90);
  material=mix(base,starColor,shape*(.30+bright*.70));
  float pin=exp(-dot(q,q)*550.);material+=vec3(pin*bright*.35);
 }
 vec3 result=mix(art.rgb,clamp(material,0.,1.),paper*u_strength*cover);
 gl_FragColor=vec4(result,art.a);
}`;
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function makeFacets(density){
 const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');const n=Math.round(5+density*9),rand=seeded(14911),points=[];
 for(let y=0;y<=n;y++){points[y]=[];for(let x=0;x<=n;x++)points[y][x]=[(x+(x>0&&x<n?(rand()-.5)*.78:0))*512/n,(y+(y>0&&y<n?(rand()-.5)*.78:0))*512/n];}
 function triangle(a,b,d){ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...d);ctx.closePath();ctx.fillStyle='rgb('+[rand(),rand(),rand()].map(v=>Math.round(v*255)).join(',')+')';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1.4;ctx.fill();ctx.stroke();}
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=points[y][x],b=points[y][x+1],c=points[y+1][x],d=points[y+1][x+1];if(rand()>.5){triangle(a,b,d);triangle(a,c,d);}else{triangle(a,b,c);triangle(b,c,d);}}
 return c;
}
function createView(card,im,facets){
 const canvas=card.querySelector('canvas');const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');
 canvas.width=canvas.height=Math.min(768,Math.round(256*Math.min(devicePixelRatio||1,2.5)));
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 function texture(source,slot,name,nearest=false){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+slot);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,nearest?gl.NEAREST:gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(program,name),slot);return t;}
 texture(im,0,'u_image');const facetTexture=texture(facets,1,'u_facets',true);
 const uniforms=Object.fromEntries(['u_tilt','u_kind','u_palette','u_strength','u_density'].map(name=>[name,gl.getUniformLocation(program,name)]));
 gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(uniforms.u_kind,Number(card.dataset.kind));
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();card.dataset.ready='false';document.getElementById('materialError').hidden=false;});
 const view={gl,program,uniforms,card,render(){gl.useProgram(program);gl.uniform2f(uniforms.u_tilt,state.x,state.y);gl.uniform1f(uniforms.u_kind,state.material);gl.uniform1f(uniforms.u_palette,state.palette);gl.uniform1f(uniforms.u_strength,state.strength);gl.uniform1f(uniforms.u_density,state.density);gl.drawArrays(gl.TRIANGLES,0,6);},facets(source){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,facetTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);}};
 view.render();card.dataset.ready='true';return view;
}

let view,lastDensity=-1,lastSignature='';
const front=document.getElementById('front');front.dataset.kind='0';
const canvas=document.createElement('canvas');canvas.id='materialCanvas';canvas.className='material-canvas';canvas.setAttribute('aria-hidden','true');front.appendChild(canvas);
const image=front.querySelector('img');
image.decode().then(()=>{
 const texture=document.createElement('canvas');texture.width=texture.height=768;texture.getContext('2d').drawImage(image,0,0,768,768);
 view=createView(front,texture,makeFacets(state.density));lastDensity=state.density;
 document.body.classList.add('material-ready');
}).catch(error=>{console.error(error);document.getElementById('materialError').hidden=false;});
window.mikoMaterial={render(input){
 Object.assign(state,{x:input.lightX,y:input.lightY,strength:input.laser,density:input.density,palette:input.palette,material:input.material});
 if(!view)return;
 if(state.density!==lastDensity){view.facets(makeFacets(state.density));lastDensity=state.density;}
 const signature=[state.x,state.y,state.strength,state.density,state.palette,state.material].join(',');
 if(signature!==lastSignature){view.render();lastSignature=signature;}
}};
})();
