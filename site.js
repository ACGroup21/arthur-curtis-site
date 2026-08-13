/* ============================================================
   Arthur Curtis — shared site engine (inner pages)
   Fixed background substrate (flowing gradient + drifting star-field,
   max presence, scroll parallax, reduced-motion aware) + nav state +
   reveal-on-scroll. No calculator / no blueprint reveal (home only).
   ============================================================ */
(function(){
  var rand=function(a,b){return a+Math.random()*(b-a);};
  var RMon=function(){return matchMedia('(prefers-reduced-motion: reduce)').matches;};

  /* ---- nav: scrolled state + active link ---- */
  var nav=document.getElementById('nav');
  if(nav){
    addEventListener('scroll',function(){nav.classList.toggle('scrolled',scrollY>30);});
    var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    nav.querySelectorAll('.links a').forEach(function(a){
      var href=(a.getAttribute('href')||'').toLowerCase();
      if(href===here) a.classList.add('active');
    });
  }

  /* ---- reveal on scroll ---- */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:.14});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});

  /* ---- background substrate ---- */
  var bgc=document.getElementById('bgCanvas');
  if(!bgc) return;
  var bx=bgc.getContext('2d');
  var VW,VH,DPR,blobs=[],amb=[],FH=0,ambGain=0,pageStart=performance.now();

  function sizeBg(){
    DPR=Math.min(2,devicePixelRatio||1);VW=innerWidth;VH=innerHeight;
    bgc.width=VW*DPR;bgc.height=VH*DPR;bx.setTransform(DPR,0,0,DPR,0,0);
    blobs=[];var cols=['#1b3a6b','#1d4ed8','#0e7490','#155e75'];
    for(var i=0;i<4;i++)blobs.push({x:rand(0,VW),y:rand(0,VH),vx:rand(-.20,.20),vy:rand(-.16,.16),r:rand(VW*.28,VW*.5),c:cols[i]});
    buildAmbient();
  }
  function buildAmbient(){
    FH=Math.max(document.body.scrollHeight,VH*2);
    var n=Math.round(VW*FH/95000);
    amb=[];
    for(var i=0;i<n;i++)amb.push({x:rand(0,VW),wy:rand(0,FH),vy:rand(.05,.22),
      sway:rand(0,6.28),sw:rand(.15,.5),r:rand(.6,1.7),o:rand(.25,.75),br:Math.random()<.12,tw:rand(.6,1.6)});
  }
  function drawBg(now){
    var g=bx.createLinearGradient(0,0,VW,VH);
    g.addColorStop(0,'#06121f');g.addColorStop(.55,'#081a30');g.addColorStop(1,'#05101f');
    bx.fillStyle=g;bx.fillRect(0,0,VW,VH);
    bx.globalCompositeOperation='lighter';
    for(var i=0;i<blobs.length;i++){var b=blobs[i];
      b.x+=b.vx;b.y+=b.vy;if(b.x<-b.r||b.x>VW+b.r)b.vx*=-1;if(b.y<-b.r||b.y>VH+b.r)b.vy*=-1;
      var rg=bx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
      rg.addColorStop(0,b.c+'55');rg.addColorStop(1,b.c+'00');
      bx.fillStyle=rg;bx.beginPath();bx.arc(b.x,b.y,b.r,0,7);bx.fill();}
    var reduced=RMon();
    var target=reduced?0.5:1;
    var gate=reduced?1:Math.min(1,Math.max(0,(now-pageStart-500)/1100));
    ambGain+=((target*gate)-ambGain)*0.05;
    if(ambGain>0.005){
      var sy=scrollY,drift=reduced?0:(now-pageStart)*0.012,span=VH+140;
      for(var j=0;j<amb.length;j++){var p=amb[j];
        var vy=((p.wy - sy*0.18 + drift*p.vy*8) % span + span) % span - 70;
        var x=p.x+Math.sin(p.sway+drift*0.02*p.sw)*10;
        var edge=Math.min(1,Math.min(vy+70,span-70-vy)/70);
        var tw=reduced?1:(0.72+0.28*Math.sin(now*0.0016*p.tw+p.sway));
        var a=p.o*ambGain*Math.max(0,edge)*0.5*tw;if(a<=0.004)continue;
        bx.fillStyle=(p.br?'rgba(200,248,255,':'rgba(103,232,249,')+a.toFixed(3)+')';
        bx.beginPath();bx.arc(x,vy,p.r,0,7);bx.fill();}
    }
    bx.globalCompositeOperation='source-over';
    requestAnimationFrame(drawBg);
  }
  addEventListener('resize',sizeBg);
  sizeBg();requestAnimationFrame(drawBg);
})();
