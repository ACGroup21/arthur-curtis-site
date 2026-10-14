/* ============================================================
   AC Lite — scenario spine (shared "Your details" data card)
   One scenario, carried across every lite tool + shareable. A fixed,
   predetermined grid: every output the scenario can hold has its own
   cell, in an "awaiting" state until confirmed (an input set / a tool
   finished), then it fills in — with a confirmed/total progress bar.
   Depends on engine.js (window.AC). Include AFTER engine.js, BEFORE the
   page's own script. Call AC.spine.mount() once the DOM is ready; apps
   call AC.spine.refresh() after they write to the scenario.
   ============================================================ */
(function(){
  if(!window.AC){ return; }
  var S = AC.scenario;

  /* the journey is a web — each tool recommends the most relevant next steps.
     The scenario carries forward automatically via localStorage (same origin). */
  var TOOLMETA = {
    'first-cohort.html':      {label:'Build your first cohort', blurb:'Turn levy into a starter cohort', prev:'~40% of pool'},
    'what-can-you-claim.html':{label:'What you can claim', blurb:'Every grant & saving on a hire', prev:'£5,558 unlocked'},
    'jd-matcher.html':        {label:'JD Matcher',         blurb:'Role → closest standards',      prev:'92% match'},
    'status-checker.html':    {label:'Status Checker',     blurb:'Funded? Band? Duration?',       prev:'✅ funded · £15k'},
    'ni-calculator.html':     {label:'NI Savings',         blurb:'0% NI on an under-25',          prev:'£4,558 / yr'},
    'expiry-clock.html':      {label:'Expiry Clock',       blurb:'What expires if unspent',       prev:'£27,500 at risk'},
    'is-levy-working.html':   {label:'Levy health',        blurb:'Honest 2-minute diagnostic',   prev:'Score 6/10'}
  };
  var NEXT = {
    'first-cohort.html':      ['what-can-you-claim.html','jd-matcher.html','is-levy-working.html'],
    'what-can-you-claim.html':['jd-matcher.html','ni-calculator.html','is-levy-working.html'],
    'jd-matcher.html':        ['status-checker.html','what-can-you-claim.html'],
    'status-checker.html':    ['what-can-you-claim.html','jd-matcher.html'],
    'ni-calculator.html':     ['what-can-you-claim.html','expiry-clock.html'],
    'expiry-clock.html':      ['what-can-you-claim.html','is-levy-working.html'],
    'is-levy-working.html':   ['what-can-you-claim.html','expiry-clock.html']
  };

  /* lead capture endpoint — FormSubmit: no account/key needed. The FIRST submission
     triggers a one-time confirmation email to this address; click it to activate. */
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/hello@arthurcurtis.com';

  /* read a shared ?s= link into localStorage as early as possible */
  try { S.fromUrl(); } catch(e){}

  function money(v){ try { return '£' + AC.fmt(Math.round(v)); } catch(e){ return '£' + v; } }

  /* ---- the predetermined cells — the maximum set the scenario can hold ----
     read(s) returns a formatted value when confirmed, else null (awaiting).
     'key' cells read in cyan; the final 'sentence' cell spans full width. */
  var CELLS = [
    {id:'payBill',      k:'Annual pay bill',    key:true, read:function(s){ return s.payBill!=null ? money(s.payBill) : null; }},
    {id:'levyPayer',    k:'Levy status',        read:function(s){ return s.levyPayer===true?'Levy payer':(s.levyPayer===false?'Non-levy':null); }},
    {id:'ageBand',      k:'Apprentice age',     read:function(s){ return (s.ageBand!=null&&s.ageBand!=='') ? String(s.ageBand) : null; }},
    {id:'salary',       k:'Apprentice salary',  read:function(s){ return s.salary!=null ? money(s.salary) : null; }},
    {id:'pot',          k:'Levy pot',           key:true, read:function(s){ if(s.payBill==null) return null; try{ var p=AC.levy(s.payBill); return (p&&p.pot!=null)? money(p.pot) : null; }catch(e){ return null; } }},
    {id:'cohort',       k:'First cohort',       key:true, read:function(s){ var c=s.cohort; return (c&&c.people)? c.people+(c.people==1?' person':' people') : null; }},
    {id:'cohortCost',   k:'Cohort cost',        read:function(s){ var c=s.cohort; return (c&&c.cost!=null)? money(c.cost) : null; }},
    {id:'claimable',    k:'Claimable / hire',   read:function(s){ return s.claimable!=null ? money(s.claimable) : null; }},
    {id:'niSaving',     k:'NI saving / yr',     read:function(s){ return s.niSaving!=null ? money(s.niSaving) : null; }},
    {id:'bestStandard', k:'Best-fit standard',  read:function(s){ return s.bestStandard || null; }},
    {id:'fundingStatus',k:'Funding status',     read:function(s){ return s.fundingStatus || null; }},
    {id:'atRisk',       k:'At risk if unspent', read:function(s){ return s.atRisk!=null ? money(s.atRisk) : null; }},
    {id:'health',       k:'Levy health', kind:'sentence', lead:'Overall, right now, your levy is working at',
                        read:function(s){ return s.health || null; }}
  ];

  var STYLE = '\
  #spine{position:relative;z-index:5;margin:0 0 20px}\
  .dcard{background:linear-gradient(180deg,rgba(14,26,46,.75),rgba(8,16,30,.6));border:1px solid var(--line);border-radius:16px;overflow:hidden}\
  .dc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:14px 16px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}\
  .dc-title{display:flex;flex-direction:column;gap:3px}\
  .dc-eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);display:inline-flex;align-items:center;gap:7px}\
  .dc-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);box-shadow:0 0 8px var(--cyan)}\
  .dc-sub{font-size:12px;color:var(--muted-2)}\
  .dc-prog{display:flex;flex-direction:column;align-items:flex-end;gap:5px}\
  .dc-count{font-family:var(--mono);font-size:11px;color:var(--muted-2);white-space:nowrap}\
  .dc-count b{color:var(--cyan);font-weight:700}\
  .dc-bar{width:92px;height:4px;border-radius:3px;background:rgba(120,160,220,.16);overflow:hidden}\
  .dc-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));border-radius:3px;transition:width .5s cubic-bezier(.2,.7,.2,1)}\
  .dc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line)}\
  .dc-cell{background:#0c1526;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:0;position:relative;transition:background .25s}\
  .dc-k{font-family:var(--mono);font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
  .dc-v{font-family:var(--mono);font-size:15px;font-weight:700;color:var(--ink);letter-spacing:-.01em;line-height:1.25;overflow-wrap:break-word}\
  .dc-cell.key .dc-v{color:var(--cyan)}\
  .dc-cell.pending{background:repeating-linear-gradient(135deg,rgba(10,18,32,.6),rgba(10,18,32,.6) 7px,rgba(13,22,38,.6) 7px,rgba(13,22,38,.6) 14px)}\
  .dc-cell.pending .dc-k{color:var(--muted-2);opacity:.75}\
  .dc-cell.pending .dc-v{color:var(--muted-2);font-weight:600;opacity:.5;letter-spacing:.3em}\
  @keyframes dc-confirm{0%{box-shadow:inset 0 0 0 2px var(--cyan)}100%{box-shadow:inset 0 0 0 0 rgba(0,184,192,0)}}\
  .dc-cell.just{animation:dc-confirm 1s ease-out}\
  .dc-sentence{grid-column:1 / -1;flex-direction:row;align-items:center;justify-content:space-between;gap:18px;padding:16px 16px}\
  .dcs-text{font-family:var(--sans);font-size:14.5px;font-weight:500;color:var(--ink);line-height:1.4}\
  .dcs-readout{font-family:var(--mono);font-size:20px;font-weight:800;letter-spacing:-.01em;color:#02101e;background:linear-gradient(120deg,var(--blue),var(--cyan));border-radius:11px;padding:7px 17px;white-space:nowrap;box-shadow:0 0 22px rgba(0,184,192,.28);flex:0 0 auto}\
  .dc-sentence.pending .dcs-text{color:var(--muted-2)}\
  .dc-sentence.pending .dcs-readout{background:none;color:var(--muted-2);border:1px dashed var(--line);box-shadow:none;font-weight:700;opacity:.7}\
  @keyframes dcs-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}\
  @keyframes dcs-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}\
  .dc-sentence.just-confirm .dcs-text{animation:dcs-in .5s cubic-bezier(.2,.7,.2,1) both}\
  .dc-sentence.just-confirm .dcs-readout{animation:dcs-pop .6s cubic-bezier(.2,.9,.3,1.5) .12s both}\
  .dc-foot{display:flex;gap:7px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--line);background:rgba(4,9,18,.3)}\
  .spine-btn{font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--muted);border-radius:8px;padding:6px 11px;transition:border-color .15s,color .15s}\
  .spine-btn:hover{border-color:var(--cyan);color:var(--cyan)}\
  .spine-btn.primary{background:linear-gradient(120deg,var(--blue),var(--cyan));color:#02101e;border-color:transparent}\
  @media(prefers-reduced-motion:reduce){.dc-cell.just,.dc-sentence.just-confirm .dcs-text,.dc-sentence.just-confirm .dcs-readout{animation:none}}\
  @media(max-width:620px){.dc-grid{grid-template-columns:repeat(2,1fr)}}\
  @media(max-width:460px){.dc-sentence{flex-direction:column;align-items:flex-start;gap:11px}}\
  @media(max-width:360px){.dc-grid{grid-template-columns:1fr}}\
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
  .spine-next{display:none;margin-top:12px}\
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

  function dcEsc(x){ return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* list of confirmed "Label: value" lines — feeds lead capture + email */
  function summary(){
    var s=S.get(), out=[];
    CELLS.forEach(function(c){ var v=c.read(s); if(v!=null) out.push(c.k+': '+v); });
    return out;
  }

  function cellHTML(c, v){
    var on = v!=null;
    if(c.kind==='sentence'){
      var scls='dc-cell dc-sentence'+(on?'':' pending');
      var txt=on?c.lead:'Finish the levy health check to see how your levy is working';
      var rd =on?v:'— / 10';
      return '<div class="'+scls+'" data-id="'+c.id+'"><span class="dcs-text">'+dcEsc(txt)+'</span><span class="dcs-readout">'+dcEsc(rd)+'</span></div>';
    }
    var cls='dc-cell'+(c.key&&on?' key':'')+(on?'':' pending');
    return '<div class="'+cls+'" data-id="'+c.id+'"><span class="dc-k">'+c.k+'</span><span class="dc-v">'+(on?dcEsc(v):'—')+'</span></div>';
  }

  var prevFilled=null;
  function render(host){
    var s=S.get();
    var cur=(window.__acTool || location.pathname.split('/').pop()||'').toLowerCase();
    var inTool = TOOLMETA.hasOwnProperty(cur);
    var vals=CELLS.map(function(c){ return {c:c, v:c.read(s)}; });
    var filled=vals.filter(function(x){ return x.v!=null; });
    var onCount=filled.length, total=CELLS.length, pct=Math.round(onCount/total*100);

    var recs = NEXT[cur] || Object.keys(TOOLMETA).filter(function(f){return f!==cur;}).slice(0,3);
    var recCards = recs.map(function(f){ var m=TOOLMETA[f]; if(!m) return '';
      return '<a class="sn-card" href="'+f+'"><div class="sn-t">'+m.label+' &rarr;</div><div class="sn-b">'+m.blurb+'</div><div class="sn-p">'+m.prev+'</div></a>'; }).join('');
    recCards += '<a class="sn-card sn-talk" href="../contact.html"><div class="sn-t">Talk to us &rarr;</div><div class="sn-b">Turn this into a funded, provable plan.</div></a>';

    host.innerHTML =
      '<div class="dcard">'+
        '<div class="dc-head">'+
          '<div class="dc-title"><span class="dc-eyebrow"><span class="dc-dot"></span>Your details</span>'+
            '<span class="dc-sub">Carried across your tools — fills in as you go</span></div>'+
          '<div class="dc-prog"><span class="dc-count"><b>'+onCount+'</b> / '+total+' confirmed</span>'+
            '<span class="dc-bar"><i style="width:'+pct+'%"></i></span></div>'+
        '</div>'+
        '<div class="dc-grid">'+vals.map(function(x){ return cellHTML(x.c, x.v); }).join('')+'</div>'+
        '<div class="dc-foot">'+
          (inTool?'<button class="spine-btn primary" data-act="next">Where to next? &rarr;</button>':'')+
          '<button class="spine-btn" data-act="email">Email my results</button>'+
          '<button class="spine-btn" data-act="link">Copy link</button>'+
          (onCount?'<button class="spine-btn" data-act="clear">Clear</button>':'')+
        '</div>'+
      '</div>'+
      (inTool?'<div class="spine-next"><div class="sn-head">Where to next?</div><div class="sn-cards">'+recCards+'</div></div>':'');

    host.querySelectorAll('.spine-btn').forEach(function(b){
      if(b.getAttribute('data-act')) b.addEventListener('click', function(){ act(b.getAttribute('data-act'), b); });
    });

    /* flash cells that just moved from awaiting to confirmed */
    var nowFilled=filled.map(function(x){ return x.c.id; });
    if(prevFilled){
      nowFilled.forEach(function(id){ if(prevFilled.indexOf(id)<0){ var el=host.querySelector('[data-id="'+id+'"]'); if(el) el.classList.add(el.classList.contains('dc-sentence')?'just-confirm':'just'); } });
    }
    prevFilled=nowFilled;
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
      prevFilled=null; refresh();
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
      (lines.length?'<div class="lead-sum">'+lines.map(function(t){return '<span>'+dcEsc(t)+'</span>';}).join('')+'</div>':'')+
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
