/* ============================================================
   AC Lite — app shell (single-page)
   The top menu (nav) and the "your details" bar stay fixed; each
   tool's content is fetched and swapped into #view beneath them,
   so the tools feel like one app instead of six separate pages.
   Reuses the standalone tool pages as-is (they still work direct).
   Depends on engine.js, spine.js, nav.js. Include LAST.
   ============================================================ */
(function(){
  var TOOLS = ['what-can-you-claim','expiry-clock','ni-calculator','status-checker','jd-matcher','is-levy-working'];
  var DEFAULT = 'what-can-you-claim';
  var view, toolStyle, cache = {};

  function fileOf(route){ return route + '.html'; }
  function routeOf(){
    var h = (location.hash||'').replace(/^#\/?/,'').split('?')[0];
    return TOOLS.indexOf(h) >= 0 ? h : DEFAULT;
  }

  /* fetch a tool page once, carve it into the pieces the shell needs */
  function fetchTool(route){
    if(cache[route]) return Promise.resolve(cache[route]);
    return fetch(fileOf(route)).then(function(r){ return r.text(); }).then(function(html){
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var styleEl = doc.querySelector('head style');
      var app = doc.querySelector('.app') || doc.body;
      var head = app.querySelector('.lite-head'); if(head) head.remove();   // shell owns the nav
      var sp = app.querySelector('#spine'); if(sp) sp.remove();             // shell owns the details bar
      app.querySelectorAll('script').forEach(function(s){ s.remove(); });   // scripts run separately
      var code = '';
      doc.querySelectorAll('script').forEach(function(s){ if(!s.getAttribute('src')) code = s.textContent; });
      var out = {
        css: styleEl ? styleEl.textContent : '',
        content: app.innerHTML,
        code: code,
        title: (doc.querySelector('title') ? doc.querySelector('title').textContent : 'Fundable')
      };
      cache[route] = out; return out;
    });
  }

  function runTool(route, data){
    window.__acTool = fileOf(route);
    toolStyle.textContent = data.css;
    document.title = data.title;
    var apply = function(){ view.innerHTML = data.content; window.scrollTo(0,0); };
    var after = function(){
      try{ if(window.ACnav) ACnav.mount(); }catch(e){}          // re-highlight current tool in the menu
      try{ if(window.AC && AC.spine) AC.spine.refresh(); }catch(e){}
      if(data.code){ try{ (new Function(data.code))(); }catch(e){ console.error('tool script error:', route, e); } }
    };
    if(document.startViewTransition){
      var vt = document.startViewTransition(apply);
      vt.updateCallbackDone.then(after, after);
    } else { apply(); after(); }
  }

  function go(route){
    fetchTool(route).then(function(data){ runTool(route, data); }).catch(function(e){
      console.error(e);
      view.innerHTML = '<p class="note">Could not load this tool. <a href="'+fileOf(route)+'">Open it directly &rarr;</a></p>';
    });
  }
  function onHash(){ go(routeOf()); }

  /* keep tool-to-tool links inside the shell (no full reload) */
  function interceptClicks(){
    document.addEventListener('click', function(e){
      if(e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey) return;
      var a = e.target.closest && e.target.closest('a'); if(!a) return;
      var href = a.getAttribute('href') || '';
      var m = href.match(/^([a-z0-9-]+)\.html(\?[^#]*)?$/i);
      if(m && TOOLS.indexOf(m[1]) >= 0){
        e.preventDefault();
        location.hash = '#/' + m[1] + (m[2] || '');
      }
    });
  }

  function boot(){
    view = document.getElementById('view');
    toolStyle = document.getElementById('tool-style');
    window.addEventListener('hashchange', onHash);
    interceptClicks();
    onHash();
  }
  if(document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
