// WOLBOX - interakcje układu wg wzoru (menu pełnoekranowe, wejścia, paralaksa, przewijane pasy)
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var safe = function (fn) { try { fn(); } catch (e) { /* jeden efekt mniej, strona działa */ } };
  var all = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // menu pełnoekranowe
  safe(function () {
    var root = document.documentElement;
    all('[data-menu]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var open = root.classList.toggle('menu-open');
        all('[data-menu]').forEach(function (x) { x.setAttribute('aria-expanded', open ? 'true' : 'false'); });
      });
    });
    all('.site-menu a').forEach(function (a) { a.addEventListener('click', function () { root.classList.remove('menu-open'); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') root.classList.remove('menu-open'); });
  });

  // pasek po przewinięciu
  safe(function () {
    var nav = document.querySelector('.site-header');
    if (!nav) return;
    var t = false;
    function upd() { nav.classList.toggle('is-stuck', window.scrollY > 30); t = false; }
    window.addEventListener('scroll', function () { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  });

  // wejście banera
  safe(function () {
    var b = document.querySelector('.banner');
    if (!b) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('is-in'); }); });
    setTimeout(function () { b.classList.add('is-in'); }, 900);
  });

  // pojawianie przy przewijaniu (z bezpiecznikami: karta w tle, brak observera)
  safe(function () {
    var els = all('.reveal, .reveal-img');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
    var odslon = function () {
      els.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.1 && r.bottom > -40) { el.classList.add('in'); io.unobserve(el); }
      });
    };
    requestAnimationFrame(odslon);
    window.addEventListener('scroll', odslon, { passive: true });
    window.addEventListener('resize', odslon, { passive: true });
    document.addEventListener('visibilitychange', odslon);
    setTimeout(odslon, 900);
  });

  // paralaksa zdjęć (baner, pełny ekran)
  safe(function () {
    if (reduce) return;
    var items = all('[data-parallax] img');
    if (!items.length) return;
    var t = false;
    function upd() {
      var vh = window.innerHeight;
      items.forEach(function (img) {
        var box = img.parentElement.getBoundingClientRect();
        if (box.bottom < -100 || box.top > vh + 100) return;
        var p = (box.top + box.height / 2 - vh / 2) / (vh + box.height);
        img.style.transform = 'translate3d(0,' + (p * -12).toFixed(2) + '%,0)';
      });
      t = false;
    }
    window.addEventListener('scroll', function () { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  });

  // przewijane pasy: strzałki + licznik
  safe(function () {
    all('[data-slider]').forEach(function (wrap) {
      var track = wrap.querySelector('.slider, .kudos-track');
      if (!track) return;
      var kids = track.children;
      var cur = wrap.querySelector('[data-cur]');
      function step() { return kids.length > 1 ? kids[1].offsetLeft - kids[0].offsetLeft : track.clientWidth; }
      all('[data-dir]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var d = parseInt(b.getAttribute('data-dir'), 10);
          var max = track.scrollWidth - track.clientWidth;
          var next = track.scrollLeft + d * step();
          if (next > max + 4) next = 0; else if (next < -4) next = max;
          track.scrollTo({ left: next, behavior: reduce ? 'auto' : 'smooth' });
        });
      });
      if (cur) track.addEventListener('scroll', function () {
        var n = Math.round(track.scrollLeft / Math.max(1, step())) + 1;
        n = Math.min(kids.length, Math.max(1, n));
        cur.textContent = (n < 10 ? '0' : '') + n;
      }, { passive: true });
    });
  });
})();

// LICZNIK WAŻNOŚCI DEMA (K. 09.08: pełne odliczanie dni/godzin/minut/sekund).
// Element wstrzykuje multipage TYLKO w dema. Nie wita klienta przy wejściu - wjeżdża
// po zejściu z pierwszego ekranu i chowa się po powrocie na górę.
(function () {
  var el = document.querySelector('.demo-wazne');
  if (!el || !el.getAttribute('data-do')) return;
  var koniec = new Date(el.getAttribute('data-do') + 'T23:59:59');
  if (isNaN(koniec)) return;
  var txt = el.querySelector('.dw-txt') || el;
  var dwa = function (n) { return (n < 10 ? '0' : '') + n; };

  var cykl = parseInt(el.getAttribute('data-cykl') || '0', 10);   // dni; 0 = brak wznowienia
  function tyka() {
    var teraz = new Date(), ms = koniec - teraz;
    // po wygaśnięciu licznik rusza od nowa (K. 10.08) - dema i tak zostają, a odliczanie
    // ma dawać klientowi realne poczucie, że sprawa ma termin.
    while (ms <= 0 && cykl > 0) {
      koniec = new Date(koniec.getTime() + cykl * 86400000);
      ms = koniec - teraz;
    }
    if (ms <= 0) { txt.innerHTML = 'Wersja pokazowa wygasła'; el.classList.add('is-koniec'); return false; }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var g = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sek = s % 60;
    var zegar = dwa(g) + ':' + dwa(m) + ':' + dwa(sek);
    txt.innerHTML = d > 0
      ? 'Wersja pokazowa · <b>' + d + ' dni</b> <span class="dw-zeg">' + zegar + '</span>'
      : 'Wersja pokazowa · <b class="dw-pilne">' + zegar + '</b>';
    el.classList.toggle('is-pilne', d === 0);
    return true;
  }
  if (tyka() !== false) setInterval(tyka, 1000);
  el.hidden = false;

  var tick = false;
  function stan() {
    el.classList.toggle('is-on', (window.scrollY || 0) > window.innerHeight * 0.55);
    tick = false;
  }
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true; requestAnimationFrame(stan);
  }, { passive: true });
  stan();
})();


/* === DOLNY PASEK MOBILE: chowa się przy stopce ===
   Lekcja 13.08.2026 (Zielony Azymut): klient zgłosił, że pasek „Zapytaj o termin"
   zasłania treść na dole strony. Rezerwę pod treścią daje CSS (razem z safe-area
   iPhone'a), a tu drugie zabezpieczenie: gdy w kadrze jest stopka albo sekcja CTA
   - czyli te same przyciski - pasek zjeżdża w dół i wraca po odjechaniu w górę.
   Brak IntersectionObserver = pasek zostaje widoczny, czyli stan sprzed zmiany. */
(function () {
  try {
    var pasek = document.querySelector('.sticky-reserve, .sticky-call');
    if (!pasek || !('IntersectionObserver' in window)) return;
    var cele = document.querySelectorAll('footer, .cta');
    if (!cele.length) return;
    var widoczne = 0;
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) { widoczne += w.isIntersecting ? 1 : -1; });
      if (widoczne < 0) widoczne = 0;
      pasek.classList.toggle('schowany', widoczne > 0);
    }, { threshold: 0.01 });
    cele.forEach(function (el) { io.observe(el); });
  } catch (e) {}
})();

/* === licznik otwarć demo (buy-signal) v3 - geo po stronie serwera === */
(function(){try{if(String(location.protocol).indexOf('http')!==0)return;try{if(/[?&#]team=1/.test(location.search+location.hash)){localStorage.setItem('nb_team','1');}}catch(e){}try{if(localStorage.getItem('nb_team')==='1')return;}catch(e){}if(/crm-newbeginning|crm\.impulseo\.pl/.test(document.referrer||''))return;try{if(navigator.webdriver)return;}catch(e){}try{if(/^https?:\/\/(kris20032|impulseo-pl)\.github\.io\/?$/i.test(document.referrer||''))return;}catch(e){}if(sessionStorage.getItem('_dv'))return;sessionStorage.setItem('_dv','1');var seg=(location.pathname.split('/').filter(Boolean)[0])||'';var base=location.origin+(seg?('/'+seg):'');var ua='';try{ua=(navigator.userAgent||'').slice(0,300);}catch(e){}var EP='https://zngfubfinbojfgaxdrbf.supabase.co/functions/v1/demo-view';try{fetch(EP,{method:'POST',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({demo_url:base,page:location.pathname,referrer:(document.referrer||null),user_agent:(ua||null)})}).catch(function(){});}catch(e){}}catch(e){}})();
