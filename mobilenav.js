/* ============================================================
   Mobile navigation — slide-in drawer.
   The site's top nav hides its links at <=820px with nothing to
   replace them, so mobile visitors can't navigate. This injects
   a hamburger + right-hand drawer that mirrors the existing nav
   links (read live from .links, so it never drifts). Fully
   self-styled (works on the homepage's inline-CSS regime AND the
   styles.css pages), keyboard-accessible, scroll-locking.
   Load on main pages: <script src="mobilenav.js?v=1"></script>
   ============================================================ */
(function(){
  if(window.__acMnav) return;
  var nav = document.getElementById('nav');
  if(!nav) return;                         // only main pages have the primary nav
  var links = nav.querySelector('.links');
  if(!links) return;
  window.__acMnav = true;

  /* ---- styles (explicit colours — no dependency on page tokens) ---- */
  var css = document.createElement('style'); css.id='ac-mnav-css';
  css.textContent = [
    '#ac-burger{display:none;flex-direction:column;justify-content:center;gap:5px;width:44px;height:44px;padding:0;background:none;border:none;cursor:pointer;position:relative;z-index:60}',
    '#ac-burger span{display:block;width:24px;height:2px;border-radius:2px;background:#e7eef8;transition:transform .32s cubic-bezier(.2,.7,.2,1),opacity .2s}',
    '#ac-burger[aria-expanded="true"] span:nth-child(1){transform:translateY(7px) rotate(45deg)}',
    '#ac-burger[aria-expanded="true"] span:nth-child(2){opacity:0}',
    '#ac-burger[aria-expanded="true"] span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}',
    '#ac-burger:focus-visible,#ac-drawer-close:focus-visible{outline:2px solid #22d3ee;outline-offset:3px;border-radius:4px}',
    '#ac-nav-backdrop{position:fixed;inset:0;z-index:70;background:rgba(3,9,20,.58);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s}',
    '#ac-nav-backdrop.open{opacity:1;pointer-events:auto}',
    '#ac-drawer{position:fixed;top:0;right:0;height:100vh;height:100dvh;width:min(84vw,320px);z-index:71;',
      'background:linear-gradient(180deg,rgba(10,20,38,.985),rgba(6,13,26,.985));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
      'border-left:1px solid rgba(150,180,220,.18);box-shadow:-24px 0 64px rgba(2,8,22,.62);',
      'transform:translateX(105%);transition:transform .36s cubic-bezier(.2,.7,.2,1);display:flex;flex-direction:column;padding:18px 20px 26px;box-sizing:border-box}',
    '#ac-drawer.open{transform:none}',
    '#ac-drawer-close{align-self:flex-end;background:none;border:none;color:#9fb2cc;font-size:30px;line-height:1;cursor:pointer;padding:0 6px 2px;margin-bottom:8px;transition:color .2s}',
    '#ac-drawer-close:hover{color:#e7eef8}',
    '#ac-drawer .ac-dl{display:flex;flex-direction:column;flex:1;min-height:0}',
    '#ac-drawer a{font-family:Inter,system-ui,sans-serif;text-decoration:none}',
    '#ac-drawer a:not(.btn){font-size:19px;font-weight:600;color:#dbe7f5;padding:15px 4px;border-bottom:1px solid rgba(150,180,220,.1);transition:color .18s,padding-left .18s}',
    '#ac-drawer a:not(.btn):hover,#ac-drawer a:not(.btn):focus-visible{color:#22d3ee;padding-left:9px;outline:none}',
    '#ac-drawer a.btn{margin-top:22px;width:100%;box-sizing:border-box;text-align:center;font-size:16px;font-weight:700;padding:15px 20px;border-radius:11px;',
      'background:linear-gradient(135deg,#22d3ee,#2563eb);color:#04121f;box-shadow:0 12px 30px rgba(34,211,238,.28)}',
    '#ac-drawer a.btn:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    'body.ac-nav-open{overflow:hidden!important}',
    '@media(max-width:820px){nav#nav .links{display:none!important}#ac-burger{display:flex}}',
    '@media(min-width:821px){#ac-burger,#ac-drawer,#ac-nav-backdrop{display:none!important}}'
  ].join('');
  document.head.appendChild(css);

  /* ---- elements ---- */
  var burger = document.createElement('button');
  burger.id='ac-burger'; burger.type='button';
  burger.setAttribute('aria-label','Open menu');
  burger.setAttribute('aria-expanded','false');
  burger.setAttribute('aria-controls','ac-drawer');
  burger.innerHTML='<span></span><span></span><span></span>';
  nav.appendChild(burger);

  var backdrop = document.createElement('div'); backdrop.id='ac-nav-backdrop';
  var drawer = document.createElement('div'); drawer.id='ac-drawer';
  drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true'); drawer.setAttribute('aria-label','Menu');
  drawer.innerHTML = '<button id="ac-drawer-close" type="button" aria-label="Close menu">&times;</button><nav class="ac-dl" aria-label="Site">'+links.innerHTML+'</nav>';
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  var closeBtn = drawer.querySelector('#ac-drawer-close');
  var focusables = drawer.querySelectorAll('a[href],button');

  /* ---- open / close ---- */
  var open=false, lastFocus=null;
  function setOpen(v){
    open=v;
    drawer.classList.toggle('open',v);
    backdrop.classList.toggle('open',v);
    document.body.classList.toggle('ac-nav-open',v);
    burger.setAttribute('aria-expanded',v?'true':'false');
    burger.setAttribute('aria-label',v?'Close menu':'Open menu');
    if(v){ lastFocus=document.activeElement; setTimeout(function(){ closeBtn.focus(); },40); }
    else if(lastFocus){ try{ lastFocus.focus(); }catch(e){} }
  }
  burger.addEventListener('click', function(){ setOpen(!open); });
  closeBtn.addEventListener('click', function(){ setOpen(false); });
  backdrop.addEventListener('click', function(){ setOpen(false); });
  // links close the drawer (navigation happens on their own)
  drawer.querySelectorAll('a[href]').forEach(function(a){ a.addEventListener('click', function(){ setOpen(false); }); });

  document.addEventListener('keydown', function(e){
    if(!open) return;
    if(e.key==='Escape'){ setOpen(false); burger.focus(); return; }
    if(e.key==='Tab'){                       // simple focus trap
      var f=[].slice.call(focusables).filter(function(el){return el.offsetParent!==null;});
      if(!f.length) return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });

  // safety: if resized up to desktop while open, close + unlock
  var mq = window.matchMedia('(min-width:821px)');
  (mq.addEventListener?mq.addEventListener.bind(mq,'change'):mq.addListener.bind(mq))(function(e){ if(e.matches && open) setOpen(false); });
})();
