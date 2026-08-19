/* ============================================================
   AC Lite — shared engine (100% client-side, no backend)
   Every lite app draws from this: funding constants, math, and
   the shared scenario (localStorage + shareable URL).
   NOTE: constants are a working set for the sandbox — re-verify
   every figure against gov.uk before anything is published.
   ============================================================ */
window.AC = (function(){

  /* --- dated funding rulebook (subset) --- */
  var RULES = {
    updated: '2026-07-02',
    levyRate: 0.005,          // 0.5% of pay bill
    allowance: 15000,         // annual levy allowance
    topUp: 0.10,              // 10% government top-up
    expiryMonths: 12,         // funds expire 12 months after they land (from Aug 2026, rolling, oldest-first)
    expiryMonthsPrev: 24,     // funds banked before Aug 2026 keep the previous 24-month clock
    expiryChanged: 'August 2026',
    avgApprenticeCost: 9000,  // indicative average band (for headline maths only)
    ni: { employerRate: 0.15, ust: 50270, secondaryThreshold: 5000, underAge: 25 },
    l7: { fundedMaxAge: 21, careLeaverEhcpMaxAge: 24, changeDate: 'Jan 2026' },
    coInvest: { govNonLevy: 0.95, employer: 0.05, fullFundedAges: '16–21' },
    incentive: 1000,          // £1,000 employer incentive (16–18, or 19–24 care leaver/EHCP)
    hiringPayment: 2000,      // £2,000 hiring payment — non-levy, NEW 16–24 apprentice
    hiringPaymentFrom: '1 October 2026',
    careLeaverBursary: 3000,  // paid to the APPRENTICE (care leaver, under 25), NOT the employer
    learningSupportMonthly: 150,
    verifiedOn: '16 August 2026'  // gov.uk verification date — shown in-app for trust
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
         smallEmployer, levyPayer, level7, newHire}
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

    var full = !!c.smallEmployer && (is1618 || (is1924 && clEhcp));
    out.push({ key:'fund100', name:'100% training funded', who:'funding', kind:'funding',
      eligible: full,
      cond:'Employer under 50 staff + apprentice 16–18 (or 19–24 care leaver/EHCP).',
      src:'https://www.gov.uk/guidance/apprenticeship-funding-rules' });

    if(!c.levyPayer){
      out.push({ key:'coinv', name:'95% co-investment', who:'funding', kind:'funding',
        eligible: !full,
        cond:'Non-levy — government pays 95%, you pay 5% (when not 100% funded).',
        src:'https://www.apprenticeships.gov.uk/employers/funding-an-apprenticeship-non-levy' });
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

  return {
    RULES: RULES, levy: levy, niSaving: niSaving, ageFlags: ageFlags, assess: assess,
    fmt: fmt, fmtMoney: fmtMoney, scenario: scenario
  };
})();
