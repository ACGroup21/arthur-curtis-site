/* ============================================================
   AC Lite — shared engine (100% client-side, no backend)
   Every lite app draws from this: funding constants, math, and
   the shared scenario (localStorage + shareable URL).
   NOTE: the inline RULES below is the OFFLINE FALLBACK. At runtime it is
   refreshed from the canonical funding-rules.json (ACGroup21/ac-funding-data) —
   edit funding figures THERE, not here; keep this fallback roughly in sync.
   ============================================================ */
window.AC = (function(){

  var RULES_2627 = 'https://www.gov.uk/government/publications/apprenticeship-funding-rules-and-assessment-plan-guidance-2026-to-2027';

  /* --- dated funding rulebook (subset) --- */
  var RULES = {
    updated: '2026-08-26',
    levyRate: 0.005,          // 0.5% of pay bill
    allowance: 15000,         // annual levy allowance
    topUp: 0,                 // REMOVED on new funds from Aug 2026
    topUpBefore: 0.10,        // what funds banked before the boundary received
    expiryMonths: 12,         // funds expire 12 months after they land (from Aug 2026, rolling, oldest-first)
    expiryMonthsPrev: 24,     // funds banked before Aug 2026 keep the previous 24-month clock
    expiryChanged: 'August 2026',
    avgApprenticeCost: 9000,  // indicative average band (for headline maths only)
    ni: { employerRate: 0.15, ust: 50270, secondaryThreshold: 5000, underAge: 25 },
    l7: { fundedMaxAge: 21, careLeaverEhcpMaxAge: 24, changeDate: 'Jan 2026' },
    /* From Aug 2026 the employer share depends on WHO you are and HOW OLD the
       apprentice is - one number cannot express it. 25% is the levy-short rate;
       a non-levy employer pays 5%. Fully funded runs to 24, for everyone. */
    coInvest: { govNonLevy: 0.95, employer: 0.05, employerNonLevyFrom: 0.05,
                employerLevyShortFrom: 0.25, fullyFundedToAge: 24,
                fullyFundedToAgeBefore: 21 },
    incentive: 1000,          // £1,000 employer incentive (16–18, or 19–24 care leaver/EHCP)
    hiringPayment: 2000,      // £2,000 hiring payment — non-levy, NEW 16–24 apprentice
    hiringPaymentFrom: '1 October 2026',
    careLeaverBursary: 3000,  // paid to the APPRENTICE (care leaver, under 25), NOT the employer
    learningSupportMonthly: 150,
    verifiedOn: '26 August 2026'  // gov.uk verification date — shown in-app for trust
  };

  function levy(payBill){
    var pot = Math.max(0, payBill * RULES.levyRate - RULES.allowance);
    var funds = pot * (1 + RULES.topUp);
    return {
      pot: pot,
      funds: funds,                       // pot + 10% top-up
      monthly: funds / 12,                // accrues monthly
      annual: funds,                      // per year
      apprentices: Math.floor(funds / RULES.avgApprenticeCost)
    };
  }

  /* employer NI saved on an under-25 apprentice (0% up to the UST) */
  function niSaving(salary){
    var r = RULES.ni;
    var band = Math.min(salary, r.ust);
    return Math.max(0, (band - r.secondaryThreshold) * r.employerRate);
  }

  /* age → funding flags (drives NI + L7 gate) */
  function ageFlags(age){
    return {
      niExempt: age < RULES.ni.underAge,             // under 25
      l7Funded: age <= RULES.l7.fundedMaxAge,        // 16–21
      incentiveBand: age <= 18                       // headline eligibility hint
    };
  }

  /* ---- assess every lever for one hire — the core of "What can you claim?" ----
     c: {ageBand:'16-18'|'19-21'|'22-24'|'25+', salary, careLeaver, ehcp,
         levyPayer, level7, newHire}  - employer size no longer affects funding
     Returns a list of levers with eligibility, value, the condition, and source. */
  function assess(c){
    c = c || {};
    var b = c.ageBand || '22-24';
    var under25 = b !== '25+';
    var is1618  = b === '16-18';
    var is1924  = (b === '19-21' || b === '22-24');
    var age1624 = is1618 || is1924;
    var l7ok    = (b === '16-18' || b === '19-21');   // 16–21
    var clEhcp  = !!(c.careLeaver || c.ehcp);
    var out = [];

    out.push({ key:'ni', name:'Employer NI relief', who:'employer', kind:'saving', unit:'/year',
      eligible: under25,
      value: under25 ? niSaving(c.salary || 0) : 0,
      cond:'Apprentice under 25 — 0% employer NI up to £50,270.',
      src:'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027' });

    var inc = is1618 || (is1924 && clEhcp);
    out.push({ key:'inc1000', name:'£1,000 employer incentive', who:'employer', kind:'oneoff',
      eligible: inc, value: inc ? RULES.incentive : 0,
      cond:'Apprentice 16–18, or 19–24 and a care leaver / has an EHCP.',
      src:'https://www.gov.uk/employing-an-apprentice/get-funding' });

    var hire = (!c.levyPayer) && age1624 && !!c.newHire;
    out.push({ key:'hire2000', name:'£2,000 hiring payment', who:'employer', kind:'oneoff', from:RULES.hiringPaymentFrom,
      eligible: hire, value: hire ? RULES.hiringPayment : 0,
      cond:'Non-levy employer, NEW apprentice 16–24, start on/after 1 Oct 2026.',
      src:'https://www.gov.uk/government/news/new-apprenticeship-funding-to-transform-investment-in-skills' });

    /* Funding rules 2026-27 r.214: for starts from 1 Aug 2026 the government funds
       the whole band for ANY apprentice aged 16-24 at the start - non-levy (214.1)
       and levy payers whose account is short (214.2) alike. No employer-size test
       and no care-leaver/EHCP condition: those belonged to the superseded rule. */
    var full = age1624;
    out.push({ key:'fund100', name:'100% training funded', who:'funding', kind:'funding',
      eligible: full,
      cond:'Apprentice aged 16–24 at the start of training — whatever your size, and whether or not you pay the levy.',
      src:RULES_2627 });

    /* Only a 25+ apprentice carries co-investment at all, and the rate turns on
       whether you are a levy payer - 25% is NOT the non-levy rate. */
    if(!c.levyPayer){
      out.push({ key:'coinv', name:'95% government funding', who:'funding', kind:'funding',
        eligible: !full,
        cond:'Non-levy and the apprentice is 25+ — government pays 95%, you pay 5% (r.213.2).',
        src:RULES_2627 });
    } else {
      out.push({ key:'coinvlevy', name:'75% government funding if your account runs dry', who:'funding', kind:'funding',
        eligible: !full,
        cond:'Levy payer with insufficient funds and the apprentice is 25+ — government pays 75%, you pay 25% (r.213.1). With funds in your account, the band is paid from it.',
        src:RULES_2627 });
    }

    if(c.level7){
      out.push({ key:'l7', name:'Level 7 funding', who:'funding', kind:'gate',
        eligible: l7ok || (under25 && clEhcp),
        cond:'From Jan 2026, L7 is levy-funded for 16–21 only (or under-25 care leaver/EHCP); otherwise self-funded.',
        src:'https://www.gov.uk/government/publications/apprenticeship-funding/apprenticeship-funding' });
    }

    var burs = !!c.careLeaver && under25;
    out.push({ key:'bursary', name:'£3,000 care leaver bursary', who:'apprentice', kind:'oneoff',
      eligible: burs, value: burs ? RULES.careLeaverBursary : 0,
      cond:'Paid to the apprentice (care leaver, under 25) — not the employer.',
      src:'https://www.gov.uk/government/publications/apprenticeships-bursary-for-care-leavers/apprenticeships-care-leavers-bursary-policy-summary' });

    return out;
  }

  function fmt(n){ return Math.round(n).toLocaleString('en-GB'); }
  function fmtMoney(n){ return '£' + fmt(n); }

  /* --- shared scenario: one input set across every lite app --- */
  var KEY = 'ac_scenario';
  var scenario = {
    get: function(){ try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } },
    set: function(patch){
      var s = Object.assign(this.get(), patch);
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){}
      return s;
    },
    /* encode/read via URL so a result is shareable */
    toUrl: function(){ var s = this.get(); return '?s=' + encodeURIComponent(JSON.stringify(s)); },
    fromUrl: function(){
      var m = /[?&]s=([^&]+)/.exec(location.search);
      if(!m) return null;
      try { var s = JSON.parse(decodeURIComponent(m[1])); this.set(s); return s; } catch(e){ return null; }
    }
  };

  /* ---- canonical funding rulebook -------------------------------------------
     Fetch the single source of truth and map it into AC.RULES. The inline RULES
     above is the OFFLINE FALLBACK: tools render instantly on it, then this
     refreshes AC.RULES in place and fires 'ac:rules'. Constants only, no logic.
     Safe before the repo exists — a 404/failure just keeps the baked values.
     Source: ACGroup21/ac-funding-data → funding-rules.json */
  var RULES_URL = 'https://raw.githubusercontent.com/ACGroup21/ACGroup21-ac-funding-data/main/funding-rules.json';
  RULES.__source = 'baked';

  function pick(o, path){ return path.split('.').reduce(function(a,k){ return (a==null ? a : a[k]); }, o); }

  /* canonical JSON → a patch in AC.RULES' own shape (missing paths stay undefined) */
  function adapt(c){
    return {
      levyRate: pick(c,'levy.rate.value'),
      allowance: pick(c,'levy.allowance.value'),
      topUp: pick(c,'levy.topUp.value'),
      topUpBefore: pick(c,'levy.topUp.valueBefore'),
      expiryMonths: pick(c,'expiry.monthsFrom.value'),
      expiryMonthsPrev: pick(c,'expiry.monthsBefore.value'),
      expiryChanged: pick(c,'expiry.changed'),
      avgApprenticeCost: pick(c,'headline.avgApprenticeCost'),
      incentive: pick(c,'incentives.employerPayment.value'),
      hiringPayment: pick(c,'incentives.hiringPayment.value'),
      hiringPaymentFrom: pick(c,'incentives.hiringPayment.from'),
      careLeaverBursary: pick(c,'incentives.careLeaverBursary.value'),
      learningSupportMonthly: pick(c,'incentives.learningSupportMonthly.value'),
      ni: { employerRate: pick(c,'ni.employerRate.value'), ust: pick(c,'ni.apprenticeUpperThreshold.value'),
            secondaryThreshold: pick(c,'ni.secondaryThreshold.value'), underAge: pick(c,'ni.exemptUnderAge') },
      l7: { fundedMaxAge: pick(c,'level7.fundedMaxAge'), careLeaverEhcpMaxAge: pick(c,'level7.careLeaverEhcpMaxAge'),
            changeDate: pick(c,'level7.changed') },
      coInvest: { govNonLevy: pick(c,'coInvest.govNonLevy.value'), employer: pick(c,'coInvest.employerBefore.value'),
                  employerNonLevyFrom: pick(c,'coInvest.employerNonLevyFrom.value'),
                  employerLevyShortFrom: pick(c,'coInvest.employerFrom.value'),
                  fullyFundedToAge: pick(c,'coInvest.fullyFundedToAge.value'),
                  fullyFundedToAgeBefore: pick(c,'coInvest.fullyFundedToAge.valueBefore') },
      __version: pick(c,'meta.version'), __asOf: pick(c,'meta.asOf'), __canonical: c
    };
  }

  /* assign only defined values; deep-merge the nested groups so baked keys survive */
  function applyPatch(p){
    ['ni','l7','coInvest'].forEach(function(k){
      if(p[k]) Object.keys(p[k]).forEach(function(kk){ if(p[k][kk] !== undefined) RULES[k][kk] = p[k][kk]; });
    });
    Object.keys(p).forEach(function(k){
      if(k==='ni' || k==='l7' || k==='coInvest') return;
      if(p[k] !== undefined) RULES[k] = p[k];
    });
  }

  var rulesReady = (typeof fetch === 'function')
    ? fetch(RULES_URL).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(c){
          var p = adapt(c);
          if(!(isFinite(p.levyRate) && isFinite(p.allowance) && isFinite(p.topUp)))
            throw new Error('canonical missing core values');
          /* dev parity: surface any figure that differs from the baked fallback */
          try{
            var diffs = [];
            ['levyRate','allowance','topUp','incentive','hiringPayment','careLeaverBursary'].forEach(function(k){
              if(p[k] !== undefined && p[k] !== RULES[k]) diffs.push(k+': baked '+RULES[k]+' → canonical '+p[k]);
            });
            if(diffs.length && typeof console!=='undefined' && console.debug) console.debug('[AC] rulebook diffs — '+diffs.join(' | '));
          }catch(e){}
          applyPatch(p); RULES.__source = 'canonical';
          try{ window.dispatchEvent(new CustomEvent('ac:rules', {detail:{source:'canonical', version:RULES.__version}})); }catch(e){}
          try{ autoWireWhenReady(); }catch(e){}
          return RULES;
        })
        .catch(function(err){
          RULES.__source = 'baked';
          try{ if(typeof console!=='undefined' && console.warn) console.warn('[AC] funding rules: baked fallback — '+(err && err.message)); }catch(e){}
          try{ window.dispatchEvent(new CustomEvent('ac:rules', {detail:{source:'baked'}})); }catch(e){}
          return RULES;
        })
    : Promise.resolve(RULES);

  /* ---- source-trace: tag any figure with data-trace="canonical.path" (+ data-label,
     optional data-note / data-indicative) and it becomes clickable to its gov.uk
     source, read LIVE from the canonical rulebook. One shared popover, repositioned.
     Auto-wires static tags once the canonical loads; call AC.wireTrace(root) after a
     dynamic re-render. CSS is injected so no extra stylesheet cache to bust. ---- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  var _MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso){ if(!iso) return ''; var p=String(iso).split('-'); if(p.length<3) return iso; return (+p[2])+' '+_MON[(+p[1])-1]+' '+p[0]; }
  function injectTraceCSS(){
    if(document.getElementById('ac-trace-css')) return;
    var s=document.createElement('style'); s.id='ac-trace-css';
    s.textContent=".ac-trace{border-bottom:1.5px dotted rgba(34,211,238,.55);cursor:pointer;color:var(--cyan,#22d3ee);transition:color .15s,border-color .15s;white-space:nowrap}.ac-trace:hover{color:var(--cyan-soft,#67e8f9);border-bottom-color:var(--cyan,#22d3ee)}.ac-trace:focus-visible{outline:2px solid var(--cyan,#22d3ee);outline-offset:2px;border-radius:3px}.ac-tpop{position:fixed;z-index:9999;width:min(250px,86vw);background:var(--navy,#0B1B3A);border:1px solid var(--line,rgba(120,160,210,.14));border-radius:12px;padding:13px 15px;box-shadow:0 20px 50px rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .16s;display:flex;flex-direction:column;gap:5px;text-align:left;font-family:'Inter',system-ui,sans-serif}.ac-tpop.on{opacity:1;pointer-events:auto}.ac-tk{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--cyan,#22d3ee);font-weight:600}.ac-tc{font-size:12px;color:var(--ink,#eaf2fb);opacity:.86;line-height:1.45}.ac-tpop a{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--cyan,#22d3ee);text-decoration:none;font-weight:500}.ac-tpop a:hover{text-decoration:underline}.ac-tv{font-size:10.5px;color:var(--muted,#8ba0b6);display:flex;align-items:center;gap:6px;margin-top:2px}.ac-tv.ok::before{content:'';width:6px;height:6px;border-radius:50%;background:#39d07f;flex:none}";
    (document.head||document.documentElement).appendChild(s);
  }
  var _tpop=null;
  function ensurePop(){
    if(_tpop) return _tpop;
    _tpop=document.createElement('div'); _tpop.className='ac-tpop'; _tpop.setAttribute('role','tooltip');
    document.body.appendChild(_tpop);
    document.addEventListener('click',function(e){ if(_tpop.classList.contains('on') && !(e.target.closest && (e.target.closest('.ac-tpop')||e.target.closest('[data-trace]')))) hidePop(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') hidePop(); });
    window.addEventListener('scroll',hidePop,true); window.addEventListener('resize',hidePop);
    return _tpop;
  }
  function hidePop(){ if(_tpop) _tpop.classList.remove('on'); }
  function showPop(el){
    var leaf = RULES.__canonical ? pick(RULES.__canonical, el.getAttribute('data-trace')) : null;
    var src = leaf && leaf.source;
    var note = el.getAttribute('data-note') || (leaf && leaf.note) || '';
    var asOf = (RULES.__canonical && RULES.__canonical.meta && RULES.__canonical.meta.asOf) || RULES.__asOf;
    var indicative = el.hasAttribute('data-indicative') || !src;
    var pop=ensurePop();
    pop.innerHTML='<span class="ac-tk">'+esc(el.getAttribute('data-label')||'Source')+'</span>'+
      (note?'<span class="ac-tc">'+esc(note)+'</span>':'')+
      (src?'<a href="'+esc(src)+'" target="_blank" rel="noopener">gov.uk &rarr;</a>':'')+
      '<span class="ac-tv'+(indicative?'':' ok')+'">'+(indicative?'Indicative — not a funding rule':'Verified '+esc(fmtDate(asOf)))+'</span>';
    var r=el.getBoundingClientRect();
    pop.style.visibility='hidden'; pop.classList.add('on');
    var pw=pop.offsetWidth, ph=pop.offsetHeight;
    pop.style.left=Math.min(Math.max(8, r.left+r.width/2-pw/2), window.innerWidth-pw-8)+'px';
    var top=r.top-ph-10; pop.style.top=(top<8 ? r.bottom+10 : top)+'px'; pop.style.visibility='';
  }
  function wireTrace(root){
    injectTraceCSS(); root=root||document; var els=root.querySelectorAll('[data-trace]');
    for(var i=0;i<els.length;i++){ (function(el){
      if(el.__traced) return; el.__traced=true;
      el.classList.add('ac-trace'); el.setAttribute('role','button'); el.setAttribute('tabindex','0');
      el.addEventListener('click',function(e){ e.stopPropagation(); showPop(el); });
      el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); showPop(el); } });
    })(els[i]); }
  }
  function autoWireWhenReady(){ function go(){ try{ wireTrace(document); }catch(e){} } if(document.readyState!=='loading') go(); else document.addEventListener('DOMContentLoaded',go); }

  return {
    RULES: RULES, RULES_URL: RULES_URL, rulesReady: rulesReady, wireTrace: wireTrace,
    levy: levy, niSaving: niSaving, ageFlags: ageFlags, assess: assess,
    fmt: fmt, fmtMoney: fmtMoney, scenario: scenario
  };
})();
