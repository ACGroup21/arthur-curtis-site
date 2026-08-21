/* ============================================================
   AC — living-gradient atmosphere (shared across every page)
   Self-injects a fixed #bgCanvas behind the page and runs the
   approved navy -> teal -> cyan drifting cloud, anchored to the
   document so it stays continuous as you scroll. Opaque (covers
   whatever body background the page sets). Include once per page;
   give real content position:relative;z-index:1 to sit above it.
   ============================================================ */
(function(){
  var VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  var FS=[
    'precision highp float;',
    'uniform vec2 iResolution;uniform float iTime,uScroll,uHero,uDoc;',
    'float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
    'float a=hash(i),b=hash(i+vec2(1.0,0.0)),c=hash(i+vec2(0.0,1.0)),d=hash(i+vec2(1.0,1.0));',
    'return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
    'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.02;a*=0.5;}return v;}',
    'void main(){vec2 fc=gl_FragCoord.xy;float xN=fc.x/iResolution.x;',
    'float docY=uScroll+(iResolution.y-fc.y);',
    'float ny=docY/max(uDoc,1.0);',
    'float ar=iResolution.x/iResolution.y;',
    'vec2 sp=vec2((xN-0.5)*ar*1.7, docY/max(uHero,1.0)*1.05 - iTime*0.045);',
    'float warp=fbm(sp+iTime*0.02);',
    'float n=fbm(sp*1.5+vec2(warp,warp*0.6));',
    'n=smoothstep(0.16,0.96,n);',
    'float pres=mix(0.14,1.0,smoothstep(0.02,0.5,ny));',
    'float smoke=n*pres;',
    'vec3 navy=vec3(0.02,0.06,0.15),teal=vec3(0.03,0.42,0.60),cyan=vec3(0.50,0.86,0.96);',
    'vec3 col=mix(navy,teal,smoke);',
    'col=mix(col,cyan,smoothstep(0.62,1.0,smoke)*0.5*pres);',
    'gl_FragColor=vec4(col,1.0);}'
  ].join('\n');

  function init(){
    var cvs=document.getElementById('bgCanvas');
    if(!cvs){
      cvs=document.createElement('canvas'); cvs.id='bgCanvas';
      cvs.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
      document.body.insertBefore(cvs, document.body.firstChild);
    }
    var gl=null;
    try{ gl=cvs.getContext('webgl',{antialias:true,alpha:false})||cvs.getContext('experimental-webgl'); }catch(e){}
    if(!gl){ cvs.style.background='radial-gradient(60% 55% at 58% 40%,#1f7fb0,#0c355c 55%,#06162e 100%)'; return; }
    function sh(ty,src){ var s=gl.createShader(ty); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.error(gl.getShaderInfoLog(s)); return null; } return s; }
    var vs=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,FS); if(!vs||!fs) return;
    var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){ console.error(gl.getProgramInfoLog(pr)); return; }
    gl.useProgram(pr);
    var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    var lo=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(lo); gl.vertexAttribPointer(lo,2,gl.FLOAT,false,0,0);
    var uR=gl.getUniformLocation(pr,'iResolution'),uT=gl.getUniformLocation(pr,'iTime'),uS=gl.getUniformLocation(pr,'uScroll'),uH=gl.getUniformLocation(pr,'uHero'),uD=gl.getUniformLocation(pr,'uDoc');
    var DPR=Math.min(1.5,devicePixelRatio||1);
    var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(t){ gl.uniform2f(uR,cvs.width,cvs.height); gl.uniform1f(uT,t); gl.uniform1f(uS,(scrollY||0)*DPR); gl.uniform1f(uH,innerHeight*DPR); gl.uniform1f(uD,Math.max(document.body.scrollHeight,innerHeight*2)*DPR); gl.drawArrays(gl.TRIANGLES,0,3); }
    function rs(){ cvs.width=Math.floor(innerWidth*DPR); cvs.height=Math.floor(innerHeight*DPR); gl.viewport(0,0,cvs.width,cvs.height); if(reduced)draw(6.0); }
    addEventListener('resize',rs); rs();
    addEventListener('load',function(){ setTimeout(rs,60); });
    if(reduced) addEventListener('scroll',function(){ draw(6.0); },{passive:true});
    if(!reduced){ var t0=performance.now(); (function fr(){ draw((performance.now()-t0)/1000); requestAnimationFrame(fr); })(); }
  }

  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
