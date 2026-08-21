/* ============================================================
   AC Lite — shared top nav ("one house, many doors")
   Rebuilds the .lite-head on every tool page into a unified bar:
   brand + a "Tools" menu (switch between the tools) + a "Menu"
   (back to the main arthurcurtis.com site). Self-contained;
   include after spine.js. Auto-mounts.
   ============================================================ */
(function(){
  var TOOLS=[
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
  .lnav-brand{display:flex;align-items:center;gap:9px;font-weight:700;font-size:15px;color:var(--ink);letter-spacing:-.01em}\
  .lnav-brand .mark{height:26px;width:auto;display:block}\
  .lnav-brand .by{color:var(--muted-2);font-weight:500;font-size:12px}\
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
  @media(max-width:520px){.lnav-brand .bt,.lnav-brand .by{display:none}.lnav-panel{right:0;left:0;min-width:0}}\
  ';

  function here(){ return (location.pathname.split('/').pop()||'').toLowerCase(); }
  function el(tag,cls,html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }

  function build(){
    var head=document.querySelector('.lite-head'); if(!head) return;
    head.classList.add('lnav'); head.innerHTML='';

    var brand=el('a','lnav-brand'); brand.href=SITE;
    brand.innerHTML='<img class="mark" src="../assets/ac-education-mark.svg" alt=""><span class="bt">arthur curtis</span><span class="by">· Fundable Lite</span>';
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

  function mount(){
    if(document.getElementById('lnav-style')===null || !document.getElementById('lnav-style')){
      var st=el('style'); st.id='lnav-style'; st.textContent=STYLE; document.head.appendChild(st);
    }
    build();
  }
  window.ACnav={ mount:mount };
  if(document.readyState!=='loading') mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
