/* ============================================================
   Reading Comfort — site-wide sensory accessibility control.
   A floating control that lets anyone lay a calming colour tint
   over the page (Meares-Irlen / visual-stress support) and cut
   motion. Self-contained, no deps, saves to localStorage.
   Load once per page: <script src="comfort.js?v=1"></script>
   ============================================================ */
(function(){
  if(window.__acComfort) return;           // guard: only one instance per page
  window.__acComfort = true;

  var LS = 'ac_comfort';
  var TINTS = [
    {k:'none',   name:'None',      c:'transparent'},
    {k:'peach',  name:'Peach',     c:'#ffd9b0'},
    {k:'rose',   name:'Rose',      c:'#ffc6d3'},
    {k:'yellow', name:'Cream',     c:'#fff3b0'},
    {k:'green',  name:'Sage',      c:'#c6f0c2'},
    {k:'aqua',   name:'Aqua',      c:'#b6efff'},
    {k:'blue',   name:'Sky',       c:'#bcd4ff'},
    {k:'turq',   name:'Turquoise', c:'#a9f0e0'},
    {k:'purple', name:'Lilac',     c:'#e0d0ff'},
    {k:'grey',   name:'Grey',      c:'#d8dde6'}
  ];

  var state = load();
  function load(){
    try{ var s=JSON.parse(localStorage.getItem(LS)||'{}'); return {tint:s.tint||'none', strength:(s.strength==null?55:+s.strength), motion:!!s.motion}; }
    catch(e){ return {tint:'none', strength:55, motion:false}; }
  }
  function save(){ try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }

  /* ---- styles ---- */
  var css = document.createElement('style'); css.id='ac-comfort-css';
  css.textContent = [
    '#ac-veil{position:fixed;inset:0;pointer-events:none;z-index:9990;mix-blend-mode:screen;opacity:0;transition:opacity .35s ease,background-color .35s ease;background:transparent}',
    '#ac-cbtn{position:fixed;left:18px;bottom:18px;z-index:9998;width:46px;height:46px;border-radius:50%;border:1px solid rgba(150,180,220,.28);',
      'background:rgba(14,26,46,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#dbe7f5;cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(2,10,26,.5);transition:transform .25s cubic-bezier(.2,.7,.2,1),border-color .25s,box-shadow .25s}',
    '#ac-cbtn:hover{transform:translateY(-3px) scale(1.04);border-color:rgba(34,211,238,.55);box-shadow:0 16px 38px rgba(2,10,26,.6)}',
    '#ac-cbtn:focus-visible{outline:2px solid #22d3ee;outline-offset:3px}',
    '#ac-cbtn svg{width:22px;height:22px;display:block}',
    '#ac-cbtn .ac-cbtn-dot{position:absolute;top:8px;right:8px;width:9px;height:9px;border-radius:50%;background:#39d07f;box-shadow:0 0 8px #39d07f;opacity:0;transition:opacity .25s}',
    '#ac-cbtn.on-active .ac-cbtn-dot{opacity:1}',
    '#ac-panel{position:fixed;left:18px;bottom:74px;z-index:9999;width:278px;max-width:calc(100vw - 36px);',
      'background:rgba(12,22,40,.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(150,180,220,.22);',
      'border-radius:18px;padding:17px 17px 15px;box-shadow:0 26px 60px rgba(2,8,22,.66);color:#e7eef8;',
      'font-family:Inter,system-ui,sans-serif;opacity:0;transform:translateY(10px) scale(.98);transform-origin:bottom left;pointer-events:none;transition:opacity .28s ease,transform .28s cubic-bezier(.2,.7,.2,1)}',
    '#ac-panel.open{opacity:1;transform:none;pointer-events:auto}',
    '#ac-panel h4{font-size:14.5px;font-weight:700;margin:0 0 2px;letter-spacing:-.01em}',
    '#ac-panel .ac-sub{font-size:11.5px;color:#93a6bf;margin:0 0 14px}',
    '#ac-panel .ac-lab{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#8ca0ba;margin:0 0 8px}',
    '.ac-sw{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:15px}',
    '.ac-sw button{aspect-ratio:1;border-radius:10px;border:1.5px solid rgba(150,180,220,.2);cursor:pointer;position:relative;padding:0;transition:transform .18s,border-color .18s;overflow:hidden}',
    '.ac-sw button:hover{transform:scale(1.08)}',
    '.ac-sw button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}',
    '.ac-sw button[aria-pressed="true"]{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.35)}',
    '.ac-sw button.none-sw{background:rgba(30,44,68,.6)}',
    '.ac-sw button.none-sw::after{content:"";position:absolute;left:14%;top:50%;width:72%;height:1.5px;background:#e0607a;transform:rotate(-45deg)}',
    '.ac-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}',
    '.ac-row .ac-rl{font-size:13px;font-weight:600;color:#dbe7f5}',
    '.ac-row .ac-rd{font-size:11px;color:#8ca0ba;margin-top:1px}',
    '#ac-str{width:100%;accent-color:#22d3ee;cursor:pointer;margin:0 0 4px}',
    '.ac-strwrap{margin-bottom:14px;transition:opacity .25s}',
    '.ac-strwrap.dim{opacity:.4;pointer-events:none}',
    /* toggle switch */
    '.ac-tog{position:relative;width:40px;height:23px;border-radius:99px;border:1px solid rgba(150,180,220,.3);background:rgba(30,44,68,.7);cursor:pointer;flex:none;transition:background .22s,border-color .22s;padding:0}',
    '.ac-tog::after{content:"";position:absolute;top:2px;left:2px;width:17px;height:17px;border-radius:50%;background:#c3d2e6;transition:transform .22s cubic-bezier(.2,.7,.2,1)}',
    '.ac-tog[aria-pressed="true"]{background:rgba(34,211,238,.32);border-color:#22d3ee}',
    '.ac-tog[aria-pressed="true"]::after{transform:translateX(17px);background:#22d3ee}',
    '.ac-tog:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}',
    '.ac-foot{display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding-top:11px;border-top:1px solid rgba(150,180,220,.14)}',
    '.ac-foot .ac-note{font-size:10.5px;color:#7f93ad}',
    '.ac-reset{background:none;border:none;color:#22d3ee;font-size:11.5px;font-weight:600;cursor:pointer;padding:2px 4px;font-family:inherit}',
    '.ac-reset:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}',
    /* reduce-motion enforcement */
    'body.ac-rm #bgCanvas{opacity:0!important}',
    'body.ac-rm .grain{opacity:.15!important}',
    'body.ac-rm .reveal{opacity:1!important;transform:none!important}',
    'body.ac-rm *,body.ac-rm *::before,body.ac-rm *::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:0s!important;scroll-behavior:auto!important}',
    '@media (max-width:520px){#ac-cbtn{left:14px;bottom:14px}#ac-panel{left:14px;bottom:70px}}',
    /* appearance segmented control */
    '.ac-seg{display:flex;gap:5px;margin-bottom:15px;background:rgba(30,44,68,.5);border:1px solid rgba(150,180,220,.18);border-radius:11px;padding:4px}',
    '.ac-seg button{flex:1;padding:9px 0;border:none;border-radius:8px;background:none;color:#9fb2cc;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,color .2s;display:flex;align-items:center;justify-content:center;gap:6px}',
    '.ac-seg button[aria-pressed="true"]{background:rgba(34,211,238,.16);color:#e7eef8}',
    '.ac-seg button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}'
  ].join('');
  document.head.appendChild(css);

  /* ---- elements ---- */
  var veil = document.createElement('div'); veil.id='ac-veil';
  var btn = document.createElement('button'); btn.id='ac-cbtn';
  btn.setAttribute('aria-label','Reading comfort'); btn.setAttribute('aria-expanded','false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" stroke-width="1.6"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" opacity=".85"/></svg><span class="ac-cbtn-dot"></span>';

  var panel = document.createElement('div'); panel.id='ac-panel';
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-label','Reading comfort settings');
  var swHTML = TINTS.map(function(t){
    var bg = t.k==='none' ? '' : 'background:'+t.c+';';
    var cls = t.k==='none' ? 'none-sw' : '';
    return '<button class="'+cls+'" data-tint="'+t.k+'" style="'+bg+'" title="'+t.name+'" aria-label="'+t.name+' tint" aria-pressed="false"></button>';
  }).join('');
  var themeable=(function(){try{for(var i=0;i<document.styleSheets.length;i++){var r;try{r=document.styleSheets[i].cssRules;}catch(e){continue;}if(!r)continue;for(var j=0;j<r.length;j++){if(r[j].selectorText&&r[j].selectorText.indexOf('[data-theme="light"]')>-1)return true;}}}catch(e){}return false;})();
  panel.innerHTML =
    '<h4>Reading comfort</h4>'+
    '<p class="ac-sub">Ease visual stress — '+(themeable?'switch appearance, ':'')+'lay a calm colour over the page, or cut motion.</p>'+
    (themeable?'<div class="ac-lab">Appearance</div><div class="ac-seg" id="ac-theme-seg" role="group" aria-label="Appearance"><button type="button" data-tv="dark" aria-pressed="true">Dark</button><button type="button" data-tv="light" aria-pressed="false">Light</button></div>':'')+
    '<div class="ac-lab">Colour tint</div>'+
    '<div class="ac-sw">'+swHTML+'</div>'+
    '<div class="ac-strwrap"><div class="ac-lab">Tint strength</div><input type="range" id="ac-str" min="0" max="100" step="1" aria-label="Tint strength"></div>'+
    '<div class="ac-row"><div><div class="ac-rl">Reduce motion</div><div class="ac-rd">Stop the moving background</div></div>'+
      '<button class="ac-tog" id="ac-mot" role="switch" aria-checked="false" aria-label="Reduce motion"></button></div>'+
    '<div class="ac-foot"><span class="ac-note">Saved on this device</span><button class="ac-reset" id="ac-reset">Reset</button></div>';

  function mount(){
    document.body.appendChild(veil);
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    apply();
    wire();
  }

  /* ---- apply state to page ---- */
  function tintColour(k){ for(var i=0;i<TINTS.length;i++){ if(TINTS[i].k===k) return TINTS[i].c; } return 'transparent'; }
  function apply(){
    var isNone = state.tint==='none';
    veil.style.background = isNone ? 'transparent' : tintColour(state.tint);
    veil.style.opacity = isNone ? 0 : (state.strength/100 * 0.34).toFixed(3);
    document.body.classList.toggle('ac-rm', state.motion);
    btn.classList.toggle('on-active', (!isNone)||state.motion);
    // reflect controls
    [].forEach.call(panel.querySelectorAll('.ac-sw button'), function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-tint')===state.tint ? 'true':'false');
    });
    var str = panel.querySelector('#ac-str'); if(str) str.value = state.strength;
    panel.querySelector('.ac-strwrap').classList.toggle('dim', isNone);
    var mot = panel.querySelector('#ac-mot'); if(mot){ mot.setAttribute('aria-pressed', state.motion?'true':'false'); mot.setAttribute('aria-checked', state.motion?'true':'false'); }
    var curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    [].forEach.call(panel.querySelectorAll('#ac-theme-seg button'), function(b){
      b.setAttribute('aria-pressed', b.getAttribute('data-tv')===curTheme ? 'true':'false');
    });
  }
  function setTheme(t){
    document.documentElement.setAttribute('data-theme', t);
    try{ localStorage.setItem('ac_theme', t); }catch(e){}
    apply();
  }

  /* ---- interactions ---- */
  var open=false;
  function setOpen(v){ open=v; panel.classList.toggle('open',v); btn.setAttribute('aria-expanded',v?'true':'false'); if(v){ var f=panel.querySelector('.ac-sw button[aria-pressed="true"]')||panel.querySelector('.ac-sw button'); if(f) f.focus(); } }
  function wire(){
    btn.addEventListener('click', function(e){ e.stopPropagation(); setOpen(!open); });
    panel.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('click', function(){ if(open) setOpen(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'&&open){ setOpen(false); btn.focus(); } });
    [].forEach.call(panel.querySelectorAll('.ac-sw button'), function(b){
      b.addEventListener('click', function(){ state.tint=b.getAttribute('data-tint'); if(state.tint!=='none'&&state.strength===0) state.strength=55; save(); apply(); });
    });
    panel.querySelector('#ac-str').addEventListener('input', function(){ state.strength=+this.value; save(); apply(); });
    var mot=panel.querySelector('#ac-mot');
    mot.addEventListener('click', function(){ state.motion=!state.motion; save(); apply(); });
    panel.querySelector('#ac-reset').addEventListener('click', function(){ state={tint:'none',strength:55,motion:false}; save(); apply(); });
    [].forEach.call(panel.querySelectorAll('#ac-theme-seg button'), function(b){
      b.addEventListener('click', function(){ setTheme(b.getAttribute('data-tv')); });
    });
  }

  if(document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
