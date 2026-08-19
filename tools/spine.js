/* ============================================================
   AC Lite — scenario spine (shared "your details" bar)
   One set of details, carried across every lite tool + shareable.
   Depends on engine.js (window.AC.scenario). Include AFTER engine.js,
   BEFORE the page's own script. Call AC.spine.mount() once the DOM
   has a <div id="spine"></div> (or it inserts itself at the top of .app).
   Apps call AC.spine.refresh() after they write to the scenario.
   ============================================================ */
(function(){
  if(!window.AC){ return; }
  var S = AC.scenario;

  /* read a shared ?s= link into localStorage as early as possible */
  try { S.fromUrl(); } catch(e){}

  /* how each scenario field renders as a chip (order matters) */
  var FIELDS = [
    {k:'payBill',   chip:function(v){ return 'Pay bill £'+AC.fmt(v); }},
    {k:'salary',    chip:function(v){ return 'Salary £'+AC.fmt(v); }},
    {k:'ageBand',   chip:function(v){ return 'Age '+v; }},
    {k:'careLeaver',chip:function(v){ return v?'Care leaver':null; }},
    {k:'ehcp',      chip:function(v){ return v?'EHC plan':null; }},
    {k:'smallEmployer',chip:function(v){ return v?'Under 50 staff':null; }},
    {k:'levyPayer', chip:function(v){ return v?'Levy payer':null; }},
    {k:'newHire',   chip:function(v){ return v?'New hire':null; }},
    {k:'level7',    chip:function(v){ return v?'Level 7':null; }}
  ];

  var STYLE = '\
  #spine{position:relative;z-index:5;margin:0 0 18px}\
  .spine-bar{background:linear-gradient(180deg,rgba(16,30,54,.6),rgba(8,18,34,.5));border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;backdrop-filter:blur(6px)}\
  .spine-bar .lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--cyan);white-space:nowrap}\
  .spine-chips{display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:120px}\
  .spine-chip{font-size:12.5px;background:rgba(34,211,238,.09);border:1px solid rgba(34,211,238,.28);color:var(--cyan-soft);border-radius:99px;padding:3px 11px;white-space:nowrap}\
  .spine-empty{font-size:12.5px;color:var(--muted-2)}\
  .spine-acts{display:flex;gap:6px;flex-wrap:wrap}\
  .spine-btn{font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);border-radius:8px;padding:6px 10px;transition:border-color .15s,color .15s}\
  .spine-btn:hover{border-color:var(--cyan);color:var(--cyan)}\
  .spine-btn.primary{background:linear-gradient(120deg,var(--blue),var(--cyan));color:#02101e;border-color:transparent}\
  ';

  function injectStyle(){
    if(document.getElementById('spine-style')) return;
    var st=document.createElement('style'); st.id='spine-style'; st.textContent=STYLE;
    document.head.appendChild(st);
  }

  function summary(){
    var s=S.get(), parts=[];
    FIELDS.forEach(function(f){
      if(s[f.k]===undefined||s[f.k]===null||s[f.k]==='') return;
      var t=f.chip(s[f.k]); if(t) parts.push(t);
    });
    return parts;
  }

  function render(host){
    var parts=summary();
    var chips = parts.length
      ? parts.map(function(t){return '<span class="spine-chip">'+t+'</span>';}).join('')
      : '<span class="spine-empty">No details yet — they\'ll carry across as you use the tools.</span>';
    host.innerHTML =
      '<div class="spine-bar">'+
        '<span class="lbl">Your details</span>'+
        '<div class="spine-chips">'+chips+'</div>'+
        '<div class="spine-acts">'+
          '<button class="spine-btn" data-act="link">Copy link</button>'+
          '<button class="spine-btn primary" data-act="email">Email my results</button>'+
          (parts.length?'<button class="spine-btn" data-act="clear">Clear</button>':'')+
        '</div>'+
      '</div>';
    host.querySelectorAll('.spine-btn').forEach(function(b){
      b.addEventListener('click', function(){ act(b.getAttribute('data-act'), b); });
    });
  }

  function act(a, btn){
    if(a==='link'){
      var url = location.origin + location.pathname + S.toUrl();
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(function(){ flash(btn,'Copied!'); }, function(){ prompt('Copy this link:', url); });
      } else { prompt('Copy this link:', url); }
    } else if(a==='email'){
      var s=S.get(), lines=summary();
      var tool=(document.title||'Arthur Curtis lite tool').split('—')[0].trim();
      var body='Hi Arthur Curtis team,%0D%0A%0D%0AI used the "'+tool+'" tool. My details:%0D%0A- '+
        (lines.length?lines.join('%0D%0A- '):'(none entered)')+
        '%0D%0A%0D%0APlease come back with a plan on my real numbers.%0D%0A';
      window.location.href='mailto:hello@arthurcurtis.com?subject='+encodeURIComponent('Levy enquiry — '+tool)+'&body='+body;
    } else if(a==='clear'){
      try{ localStorage.removeItem('ac_scenario'); }catch(e){}
      refresh();
      dispatchEvent(new Event('scenario:change'));
    }
  }

  function flash(btn,txt){ var o=btn.textContent; btn.textContent=txt; setTimeout(function(){ btn.textContent=o; },1400); }

  var HOST=null;
  function mount(){
    injectStyle();
    HOST=document.getElementById('spine');
    if(!HOST){
      HOST=document.createElement('div'); HOST.id='spine';
      var app=document.querySelector('.app'), head=document.querySelector('.lite-head');
      if(head && head.parentNode){ head.parentNode.insertBefore(HOST, head.nextSibling); }
      else if(app){ app.insertBefore(HOST, app.firstChild); }
      else { document.body.insertBefore(HOST, document.body.firstChild); }
    }
    render(HOST);
  }
  function refresh(){ if(HOST) render(HOST); }

  AC.spine = { mount:mount, refresh:refresh, summary:summary };
})();
