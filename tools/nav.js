/* ============================================================
   AC Lite — shared top nav ("one house, many doors")
   Rebuilds the .lite-head on every tool page into a unified bar:
   brand + a "Tools" menu (switch between the tools) + a "Menu"
   (back to the main arthurcurtis.com site). Self-contained;
   include after spine.js. Auto-mounts.
   ============================================================ */
(function(){
  var TOOLS=[
    ['first-cohort.html','Build your first cohort'],
    ['what-can-you-claim.html','What can you claim?'],
    ['expiry-clock.html','Levy Expiry Clock'],
    ['ni-calculator.html','NI Savings Calculator'],
    ['status-checker.html','Standard Status Checker'],
    ['jd-matcher.html','JD Matcher'],
    ['is-levy-working.html','Is your levy working?']
  ];
  var SITE='https://acgroup21.github.io/arthur-curtis-site/';
  var SITE_LINKS=[
    ['','Home'],['approach.html','Approach'],['employers.html','For employers'],
    ['about.html','About'],['contact.html','Contact']
  ];

  var STYLE='\
  .lnav{position:relative;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:26px}\
  .lnav-brand{display:flex;align-items:center;gap:11px;text-decoration:none}\
  .lnav-brand .fi{height:28px;width:auto;display:block;flex:0 0 auto}\
  .lnav-brand .fw{height:16px;width:auto;display:block}\
  .lnav-right{display:flex;gap:8px}\
  .lnav-btn{font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--ink);border-radius:9px;padding:8px 13px;display:flex;align-items:center;gap:7px}\
  .lnav-btn:hover{border-color:var(--cyan);color:var(--cyan)}\
  .lnav-btn .cx{font-size:10px;opacity:.7}\
  .lnav-panel{position:absolute;top:calc(100% + 8px);right:0;z-index:40;min-width:230px;background:#0a1626;border:1px solid var(--line);border-radius:12px;padding:7px;display:none;box-shadow:0 22px 55px rgba(0,0,0,.55)}\
  .lnav-panel.open{display:block}\
  .lnav-panel .ph{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-2);padding:6px 12px 3px}\
  .lnav-panel a{display:block;padding:9px 12px;border-radius:8px;font-size:14px;color:var(--ink);text-decoration:none}\
  .lnav-panel a:hover{background:rgba(34,211,238,.09);color:var(--cyan)}\
  .lnav-panel a.on{color:var(--cyan);background:rgba(34,211,238,.07)}\
  .lnav-panel a.on::after{content:" ·";color:var(--cyan)}\
  @media(max-width:520px){.lnav-brand .by{display:none}.lnav-panel{right:0;left:0;min-width:0}}\
  .lite-foot{margin-top:48px;padding:24px 22px;border-top:1px solid var(--line);border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(180deg,#0a1a30,#060f1d)}\
  .lite-foot .ff-brand{display:flex;align-items:center;gap:14px;flex-wrap:wrap}\
  .lite-foot .ff-logo{height:24px;width:auto;display:block}\
  .lite-foot .ff-by{display:flex;align-items:center;gap:8px;color:var(--muted-2);padding-left:14px;border-left:1px solid var(--line)}\
  .lite-foot .ff-by .acd-mark{height:16px;width:auto;display:block;flex:none}\
  .lite-foot .ff-by .acd-txt{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.11em;text-transform:uppercase;line-height:1.35}\
  .lite-foot .ff-by .acd-txt strong{color:#fff;font-weight:600;letter-spacing:.07em}\
  .lite-foot .ff-by .acd-txt .acd-blue{color:#3B9EFF}\
  .lite-foot .ff-links a{font-size:12.5px;color:var(--muted);text-decoration:none}\
  .lite-foot .ff-links a:hover{color:var(--cyan)}\
  ';

  function here(){ return (window.__acTool || location.pathname.split('/').pop()||'').toLowerCase(); }
  function el(tag,cls,html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  function build(){
    var head=document.querySelector('.lite-head'); if(!head) return;
    head.classList.add('lnav'); head.innerHTML='';

    var brand=el('a','lnav-brand'); brand.href=SITE;
    brand.innerHTML='<img class="fw" src="../assets/fundable-wordmark.svg" alt="Fundable">';
    head.appendChild(brand);

    var right=el('div','lnav-right',
      '<button class="lnav-btn" data-m="tools">Tools <span class="cx">▾</span></button>'+
      '<button class="lnav-btn" data-m="site">Menu <span class="cx">▾</span></button>');
    head.appendChild(right);

    var cur=here();
    var tools=el('div','lnav-panel'); tools.setAttribute('data-p','tools');
    tools.innerHTML='<div class="ph">The tools</div>'+TOOLS.map(function(t){
      return '<a href="'+t[0]+'"'+(t[0].toLowerCase()===cur?' class="on"':'')+'>'+t[1]+'</a>';
    }).join('');
    head.appendChild(tools);

    var site=el('div','lnav-panel'); site.setAttribute('data-p','site');
    site.innerHTML='<div class="ph">arthurcurtis.com</div>'+SITE_LINKS.map(function(s){
      return '<a href="'+SITE+s[0]+'">'+s[1]+'</a>';
    }).join('');
    head.appendChild(site);

    right.querySelectorAll('.lnav-btn').forEach(function(b){
      b.addEventListener('click',function(e){ e.stopPropagation(); toggle(b.getAttribute('data-m')); });
    });
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeAll(); });
  }
  function toggle(name){
    var p=document.querySelector('.lnav-panel[data-p="'+name+'"]');
    var was=p.classList.contains('open'); closeAll(); if(!was) p.classList.add('open');
  }
  function closeAll(){ document.querySelectorAll('.lnav-panel').forEach(function(p){ p.classList.remove('open'); }); }

  function buildFooter(){
    if(document.querySelector('.lite-foot')) return;
    var app=document.querySelector('.app'); if(!app) return;
    var f=el('footer','lite-foot');
    f.innerHTML='<div class="ff-brand"><img class="ff-logo" src="../assets/fundable-logo.svg" alt="Fundable"><span class="ff-by"><img class="acd-mark" src="../assets/ac-a-logo-white.svg" alt="AC Digital"><span class="acd-txt">Built&nbsp;by <strong>AC&nbsp;<span class="acd-blue">Digital</span></strong></span></span></div>'+
      '<div class="ff-links"><a href="'+SITE+'">arthurcurtis.com &rarr;</a></div>';
    app.appendChild(f);
  }

  function mount(){
    if(document.getElementById('lnav-style')===null || !document.getElementById('lnav-style')){
      var st=el('style'); st.id='lnav-style'; st.textContent=STYLE; document.head.appendChild(st);
    }
    build();
    buildFooter();
  }
  window.ACnav={ mount:mount };
  if(document.readyState!=='loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
