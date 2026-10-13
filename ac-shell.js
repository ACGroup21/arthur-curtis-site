/* ============================================================
   AC — the unified shell. Injects one nav + one footer on every
   page so the frame is identical everywhere. No splash.
   Include after ac.css:  <script src="ac-shell.js"></script>
   Optional per page: window.AC_PAGE = 'employers' (sets active).
   ============================================================ */
(function(){
  var WORDMARK = 'Arthur&nbsp;Curtis<span class="ed">Education</span>';

  var LINKS = [
    {href:'index.html',     label:'Home',          key:'home'},
    {href:'employers.html', label:'For employers', key:'employers'},
    {href:'learners.html',  label:'For learners',  key:'learners'},
    {href:'tools.html',     label:'Tools',         key:'tools'},
    {href:'about.html',     label:'About',         key:'about'}
  ];
  var CTA = {href:'contact.html', label:'Book a call'};

  // active page: explicit override, else infer from filename
  var file = (location.pathname.split('/').pop() || 'home.html').toLowerCase();
  var active = (window.AC_PAGE || '').toLowerCase();
  if(!active){
    LINKS.forEach(function(l){ if(l.href.toLowerCase() === file) active = l.key; });
    if(file === '' || file === 'index.html') active = 'home';
  }

  function navHTML(){
    var items = LINKS.map(function(l){
      var cur = (l.key === active) ? ' aria-current="page"' : '';
      return '<a href="'+l.href+'"'+cur+'>'+l.label+'</a>';
    }).join('');
    return ''
    + '<header class="ac-nav">'
    +   '<div class="ac-nav-in">'
    +     '<a class="ac-brand" href="index.html" aria-label="Arthur Curtis Education — home">'
    +       '<img class="ac-brand-wm" src="assets/wordmark-white.svg" alt="Arthur Curtis Education">'
    +       '<img class="ac-brand-bird" src="assets/hummingbird-white.png" alt="">'
    +     '</a>'
    +     '<button class="ac-burger" id="acBurger" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg></button>'
    +     '<div class="ac-nav-links" id="acNavLinks" role="navigation" aria-label="Primary">'+items+'<a class="ac-nav-cta" href="'+CTA.href+'">'+CTA.label+'</a></div>'
    +   '</div>'
    + '</header>';
  }

  var ACD = '<svg class="acd" viewBox="61 47 278 310" aria-hidden="true">'
    + '<path d="M 96 322 L 200 82 L 304 322" fill="none" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="200" cy="238" r="23" fill="#3B9EFF"/></svg>';

  function footHTML(){
    return ''
    + '<footer class="ac-foot">'
    +   '<div class="ac-foot-grid">'
    +     '<div class="ac-foot-brand">'
    +       '<span class="ac-foot-lock"><img src="assets/hummingbird-white.png" alt=""><img class="ac-foot-logo" src="assets/wordmark-white.svg" alt="Arthur Curtis Education"></span>'
    +       '<p class="ac-foot-tag">Levy, turned into a workforce that grows &mdash; and stays. Every plan traceable, every figure defensible.</p>'
    +       '<a class="ac-foot-mail" href="mailto:hello@arthurcurtis.com">hello@arthurcurtis.com</a>'
    +     '</div>'
    +     '<nav class="ac-foot-nav" aria-label="Footer">'
    +       '<span class="ac-foot-h">Explore</span>'
    +       '<a href="ourway.html">Our Way</a><a href="faq.html">FAQs</a><a href="partners.html">Partners</a><a href="blog.html">Blog</a><a href="contact.html">Contact</a>'
    +     '</nav>'
    +   '</div>'
    +   '<div class="ac-foot-bar">'
    +     '<span class="ac-mono ac-foot-cc">&copy; '+(new Date().getFullYear())+' Arthur Curtis Education &middot; Making people better</span>'
    +     '<span class="ac-credit">'+ACD+'<span>Built&nbsp;by <b>AC&nbsp;<span class="blue">Digital</span></b></span></span>'
    +   '</div>'
    + '</footer>';
  }

  function mount(){
    if(document.querySelector('.ac-nav')) return;             // idempotent
    document.body.insertAdjacentHTML('afterbegin', navHTML());
    document.body.insertAdjacentHTML('beforeend', footHTML());
    // favicon (the floating corner mascot was retired — the bird now lives in the header/footer lockups)
    var fav=document.querySelector('link[rel="icon"]'); if(!fav){ fav=document.createElement('link'); fav.rel='icon'; document.head.appendChild(fav); } fav.href='assets/favicon-hummingbird.png';
    var burger = document.getElementById('acBurger');
    var links  = document.getElementById('acNavLinks');
    if(burger && links){
      burger.addEventListener('click', function(){
        var open = links.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      links.addEventListener('click', function(e){
        if(e.target.tagName === 'A'){ links.classList.remove('open'); burger.setAttribute('aria-expanded','false'); }
      });
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
