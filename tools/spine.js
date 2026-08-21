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

  /* the journey is a web, not a rail — each tool recommends the most relevant next steps.
     The scenario carries forward automatically via localStorage (same origin), no URL needed. */
  var TOOLMETA = {
    'what-can-you-claim.html':{label:'What you can claim', blurb:'Every grant & saving on a hire', prev:'£5,558 unlocked'},
    'jd-matcher.html':        {label:'JD Matcher',         blurb:'Role → closest standards',      prev:'92% match'},
    'status-checker.html':    {label:'Status Checker',     blurb:'Funded? Band? Duration?',       prev:'✅ funded · £15k'},
    'ni-calculator.html':     {label:'NI Savings',         blurb:'0% NI on an under-25',          prev:'£4,558 / yr'},
    'expiry-clock.html':      {label:'Expiry Clock',       blurb:'What expires if unspent',       prev:'£27,500 at risk'},
    'is-levy-working.html':   {label:'Levy health',        blurb:'Honest 2-minute diagnostic',   prev:'Score 6/10'}
  };
  var NEXT = {
    'what-can-you-claim.html':['jd-matcher.html','ni-calculator.html','is-levy-working.html'],
    'jd-matcher.html':        ['status-checker.html','what-can-you-claim.html'],
    'status-checker.html':    ['what-can-you-claim.html','jd-matcher.html'],
    'ni-calculator.html':     ['what-can-you-claim.html','expiry-clock.html'],
    'expiry-clock.html':      ['what-can-you-claim.html','is-levy-working.html'],
    'is-levy-working.html':   ['what-can-you-claim.html','expiry-clock.html']
  };

  /* lead capture endpoint — FormSubmit: no account/key needed. The FIRST submission
     triggers a one-time confirmation email to this address; click it to activate.
     Swap for a Formspree/Web3Forms URL or a different inbox any time. */
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/hello@arthurcurtis.com';

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
  .lead-modal{position:fixed;inset:0;z-index:100;background:rgba(3,9,18,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}\
  .lead-box{position:relative;width:100%;max-width:420px;background:#0a1626;border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 30px 80px rgba(0,0,0,.6)}\
  .lead-box h3{font-size:20px;font-weight:800;margin-bottom:6px}\
  .lead-sub{font-size:14px;color:var(--muted);line-height:1.5}\
  .lead-sum{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}\
  .lead-sum span{font-size:12px;background:rgba(34,211,238,.09);border:1px solid rgba(34,211,238,.28);color:var(--cyan-soft);border-radius:99px;padding:3px 10px}\
  .lead-in{width:100%;margin-top:10px;background:var(--glass);border:1px solid var(--line);border-radius:10px;padding:12px 13px;color:var(--ink);font-family:var(--sans);font-size:14.5px}\
  .lead-in:focus{outline:none;border-color:var(--cyan)}\
  textarea.lead-in{min-height:70px;resize:vertical}\
  .lead-send{width:100%;margin-top:14px;background:linear-gradient(120deg,var(--blue),var(--cyan));color:#02101e;font-weight:700;font-size:15px;border:none;border-radius:10px;padding:12px;cursor:pointer}\
  .lead-send:disabled{opacity:.6;cursor:default}\
  .lead-status{font-size:13px;margin-top:10px;color:var(--muted)}\
  .lead-status.err{color:#e0607a}\
  .lead-fall{font-size:12px;color:var(--muted-2);margin-top:14px}\
  .lead-fall a{color:var(--cyan)}\
  .lead-x{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1}\
  .lead-x:hover{color:var(--ink)}\
  .spine-next{display:none;margin-top:10px}\
  .spine-next.open{display:block;animation:sn-in .22s ease}\
  @keyframes sn-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}\
  .sn-head{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted-2);margin-bottom:8px}\
  .sn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px}\
  .sn-card{display:block;text-decoration:none;background:rgba(16,30,54,.55);border:1px solid var(--line);border-radius:12px;padding:12px 13px;transition:border-color .2s,transform .2s,background .2s}\
  .sn-card:hover{border-color:rgba(34,211,238,.45);transform:translateY(-2px);background:rgba(16,30,54,.78)}\
  .sn-t{font-size:14px;font-weight:700;color:var(--ink);margin-bottom:3px}\
  .sn-b{font-size:12px;color:var(--muted);line-height:1.4}\
  .sn-p{font-family:var(--mono);font-size:11.5px;color:var(--cyan);margin-top:7px}\
  .sn-talk{background:linear-gradient(160deg,rgba(37,99,235,.2),rgba(34,211,238,.08));border-color:rgba(34,211,238,.32)}\
  .sn-talk .sn-t{color:var(--cyan-soft)}\
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
    var cur=(location.pathname.split('/').pop()||'').toLowerCase();
    var inTool = TOOLMETA.hasOwnProperty(cur);
    var recs = NEXT[cur] || Object.keys(TOOLMETA).filter(function(f){return f!==cur;}).slice(0,3);
    var recCards = recs.map(function(f){ var m=TOOLMETA[f]; if(!m) return '';
      return '<a class="sn-card" href="'+f+'"><div class="sn-t">'+m.label+' &rarr;</div><div class="sn-b">'+m.blurb+'</div><div class="sn-p">'+m.prev+'</div></a>'; }).join('');
    recCards += '<a class="sn-card sn-talk" href="../contact.html"><div class="sn-t">Talk to us &rarr;</div><div class="sn-b">Turn this into a funded, provable plan.</div></a>';
    host.innerHTML =
      '<div class="spine-bar">'+
        '<span class="lbl">Your details</span>'+
        '<div class="spine-chips">'+chips+'</div>'+
        '<div class="spine-acts">'+
          (inTool?'<button class="spine-btn primary" data-act="next">Where to next? &rarr;</button>':'')+
          '<button class="spine-btn" data-act="email">Email my results</button>'+
          '<button class="spine-btn" data-act="link">Copy link</button>'+
          (parts.length?'<button class="spine-btn" data-act="clear">Clear</button>':'')+
        '</div>'+
      '</div>'+
      (inTool?'<div class="spine-next"><div class="sn-head">Where to next?</div><div class="sn-cards">'+recCards+'</div></div>':'');
    host.querySelectorAll('.spine-btn').forEach(function(b){
      if(b.getAttribute('data-act')) b.addEventListener('click', function(){ act(b.getAttribute('data-act'), b); });
    });
  }

  function act(a, btn){
    if(a==='link'){
      var url = location.origin + location.pathname + S.toUrl();
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(function(){ flash(btn,'Copied!'); }, function(){ prompt('Copy this link:', url); });
      } else { prompt('Copy this link:', url); }
    } else if(a==='email'){
      openCapture();
    } else if(a==='clear'){
      try{ localStorage.removeItem('ac_scenario'); }catch(e){}
      refresh();
      dispatchEvent(new Event('scenario:change'));
    } else if(a==='next'){
      var p=document.querySelector('.spine-next'); if(p) p.classList.toggle('open');
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
    if(!mount._bound){ mount._bound=true;
      document.addEventListener('click', function(e){ var p=document.querySelector('.spine-next.open'); if(p && !(e.target.closest && e.target.closest('#spine'))) p.classList.remove('open'); });
    }
  }
  function refresh(){ if(HOST) render(HOST); }

  /* ---- lead capture modal ("Email my results") ---- */
  function submitLead(fields){
    var body=Object.assign({ _subject:'New Fundable Lite enquiry — '+(fields.tool||''), _captcha:'false', _template:'table', _replyto:fields.email }, fields);
    return fetch(FORM_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();}).then(function(j){ return !!(j && (j.success==='true'||j.success===true)); })
      .catch(function(){ return false; });
  }
  function openCapture(){
    var lines=summary();
    var host=document.createElement('div'); host.className='lead-modal';
    host.innerHTML='<div class="lead-box">'+
      '<button class="lead-x" aria-label="Close">&times;</button>'+
      '<h3>Get a plan on your numbers</h3>'+
      '<p class="lead-sub">Leave your email and we\'ll come back — usually within two working days. Your details below come with it.</p>'+
      (lines.length?'<div class="lead-sum">'+lines.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>':'')+
      '<input class="lead-in" id="lead-email" type="email" placeholder="Work email *" required>'+
      '<input class="lead-in" id="lead-name" type="text" placeholder="Your name (optional)">'+
      '<textarea class="lead-in" id="lead-msg" placeholder="Anything to add? (optional)"></textarea>'+
      '<input type="text" id="lead-hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">'+
      '<button class="lead-send" id="lead-send">Send &rarr;</button>'+
      '<div class="lead-status" id="lead-status"></div>'+
      '<p class="lead-fall">Prefer to write? <a href="mailto:hello@arthurcurtis.com">hello@arthurcurtis.com</a></p>'+
      '</div>';
    document.body.appendChild(host);
    var close=function(){ host.remove(); };
    host.addEventListener('click',function(e){ if(e.target===host) close(); });
    host.querySelector('.lead-x').addEventListener('click',close);
    var send=host.querySelector('#lead-send'), status=host.querySelector('#lead-status');
    send.addEventListener('click',function(){
      if(host.querySelector('#lead-hp').value){ close(); return; }
      var email=(host.querySelector('#lead-email').value||'').trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ status.textContent='Please enter a valid email.'; status.className='lead-status err'; return; }
      send.disabled=true; send.textContent='Sending…'; status.textContent=''; status.className='lead-status';
      var tool=(document.title||'Fundable Lite').split('—')[0].trim();
      submitLead({ email:email, name:(host.querySelector('#lead-name').value||'').trim()||'(not given)',
        message:(host.querySelector('#lead-msg').value||'').trim()||'(none)', tool:tool,
        your_details:lines.length?lines.join(' · '):'(none entered)', page:location.href
      }).then(function(ok){
        if(ok){ host.querySelector('.lead-box').innerHTML='<button class="lead-x" aria-label="Close">&times;</button><h3>Sent &#10003;</h3><p class="lead-sub">Thanks — we\'ll be in touch shortly. Your details went with it.</p>'; host.querySelector('.lead-x').addEventListener('click',close); }
        else { status.textContent='Something went wrong — please email hello@arthurcurtis.com.'; status.className='lead-status err'; send.disabled=false; send.textContent='Send →'; }
      });
    });
    setTimeout(function(){ var e=host.querySelector('#lead-email'); if(e) e.focus(); },30);
  }

  AC.spine = { mount:mount, refresh:refresh, summary:summary, capture:openCapture };
})();
