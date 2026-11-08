/* ============================================================
   СОЗИДАНИЕ — motion system
   Physical easing, scroll choreography, micro-interactions
   ============================================================ */

(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. GRACEFUL FALLBACK ---------- */
  // If GSAP failed to load, reveal everything and bail out so nothing stays hidden.
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') {
    document.getElementById('loader')?.remove();
    document.querySelectorAll('[data-anim="fade"],.loader__mark').forEach(el => {
      el.style.opacity = 1; el.style.transform = 'none';
    });
    document.querySelectorAll('.hero__title .w').forEach(el => el.style.transform = 'none');
    document.querySelectorAll('.hero__kicker,.hero__lead,.hero__strip').forEach(el => {
      el.style.opacity = 1; el.style.transform = 'none';
    });
    document.body.classList.remove('is-locked');
    return;
  }

  const hasGSAP = true;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. SPLIT TEXT ---------- */
  function splitWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        const wrap = document.createElement('span');
        wrap.className = 'split-line';
        const inner = document.createElement('span');
        inner.textContent = part;
        wrap.appendChild(inner);
        frag.appendChild(wrap);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return Array.from(el.querySelectorAll('.split-line > span'));
  }

  document.querySelectorAll('[data-split]').forEach(el => {
    const words = splitWords(el);
    if (reduce) return;
    gsap.set(words, { yPercent: 118, opacity: 0 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(words, {
        yPercent: 0, opacity: 1, duration: 1.15, ease: 'power3.out',
        stagger: { each: 0.045, from: 'start' }
      })
    });
  });

  document.querySelectorAll('[data-split-words]').forEach(el => {
    const words = splitWords(el);
    if (reduce) return;
    gsap.set(words, { opacity: 0, y: 24, filter: 'blur(4px)' });
    ScrollTrigger.create({
      trigger: el, start: 'top 86%', once: true,
      onEnter: () => gsap.to(words, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.05, ease: 'power2.out',
        stagger: 0.035
      })
    });
  });

  /* ---------- 2. FADE REVEALS ---------- */
  if (!reduce) {
    document.querySelectorAll('[data-anim="fade"]').forEach(el => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  } else {
    document.querySelectorAll('[data-anim="fade"]').forEach(el => {
      el.style.opacity = 1; el.style.transform = 'none';
    });
  }

  /* ---------- 3. HERO INTRO ---------- */
  // на внутренних страницах (.hero нет) — ничего не анимируем, чтобы не ругался GSAP
  const hero = document.querySelector('.hero');
  const heroLines = hero ? hero.querySelectorAll('.hero__title .w') : [];
  const heroFade = hero ? hero.querySelectorAll('.hero__kicker, .hero__lead, .hero__strip') : [];
  if (hero) {
    gsap.set(heroLines, { yPercent: 112 });
    gsap.set(heroFade, { opacity: 0, y: 18 });
    gsap.set('.hero__foot .round', { opacity: 0, scale: 0.8 });
  }

  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (!hero) return tl;
    tl.to(heroLines, { yPercent: 0, duration: 1.35, stagger: 0.09 })
      .to('.hero__kicker', { opacity: 1, y: 0, duration: 0.9 }, 0.15)
      .to('.hero__lead', { opacity: 1, y: 0, duration: 1.0 }, 0.7)
      .to('.hero__foot .round', { opacity: 1, scale: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.85)
      .to('.hero__strip', { opacity: 1, y: 0, duration: 0.9 }, 0.8);
    return tl;
  }

  /* ---------- 4. LOADER ---------- */
  const loader = document.getElementById('loader');
  const tl = gsap.timeline();
  tl.to('.loader__mark', { opacity: 1, duration: 0.7, ease: 'power2.out' })
    .to('.loader__word', { opacity: 1, duration: 0.6 }, 0.25)
    .to('.loader__line i', { width: '100%', duration: 1.0, ease: 'power2.inOut' }, 0.2)
    .to('.loader__inner', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.45)
    .to(loader, {
      yPercent: -100, duration: 1.05, ease: 'power4.inOut',
      onStart: () => { document.body.classList.remove('is-locked'); }
    }, 1.75)
    .add(heroIntro(), '-=0.55')
    .set(loader, { display: 'none' });

  document.body.classList.add('is-locked');

  /* ---------- 5. LENIS SMOOTH SCROLL ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({
      duration: 1.25,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.5 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- 6. NAV STATE + THEME ---------- */
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 'top -60',
    onUpdate: self => {
      nav.classList.toggle('is-stuck', self.scroll() > 60);
    }
  });

  // nav inverts over dark sections
  const darkSections = document.querySelectorAll('[data-theme="dark"]');
  darkSections.forEach(sec => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 8%', end: 'bottom 8%',
      onToggle: self => {
        if (!nav.classList.contains('is-stuck')) return;
        nav.classList.toggle('is-inverted', self.isActive);
      }
    });
  });

  /* ---------- 7. PARALLAX ---------- */
  if (!reduce) {
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const strength = parseFloat(el.dataset.parallax) || 0.12;
      gsap.fromTo(el, { yPercent: -strength * 34 }, {
        yPercent: strength * 34, ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.1
        }
      });
    });
  }

  /* ---------- 8. HORIZONTAL WORK TRACK ---------- */
  const track = document.getElementById('track');
  const workSection = document.querySelector('.work');
  if (track && window.innerWidth > 900 && !reduce) {
    const getDistance = () => track.scrollWidth - window.innerWidth + 40;
    gsap.to(track, {
      x: () => -getDistance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.work__pin',
        start: 'top top',
        end: () => '+=' + (getDistance() + window.innerHeight * 0.4),
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });
  }

  /* ---------- 9. CARD TILT (physical) ---------- */
  if (window.matchMedia('(hover:hover)').matches && !reduce) {
    document.querySelectorAll('.card').forEach(card => {
      const qx = gsap.quickTo(card, 'rotationY', { duration: 0.85, ease: 'power3.out' });
      const qy = gsap.quickTo(card, 'rotationX', { duration: 0.85, ease: 'power3.out' });
      card.style.transformStyle = 'preserve-3d';
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        qx(px * 7); qy(-py * 5);
      });
      card.addEventListener('mouseleave', () => { qx(0); qy(0); });
    });
  }

  /* ---------- 10. CURSOR ---------- */
  const cursor = document.getElementById('cursor');
  const label = cursor ? cursor.querySelector('.cursor__label') : null;
  if (cursor && window.matchMedia('(hover:hover)').matches) {
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.42, ease: 'power3.out' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.42, ease: 'power3.out' });
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    window.addEventListener('mousemove', e => {
      cx(e.clientX); cy(e.clientY);
      // light trail pulse
    });

    document.querySelectorAll('a, button, .acc__head, .card, input').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const text = el.dataset.cursor;
        if (text) {
          label.textContent = text;
          cursor.classList.add('is-label');
        } else {
          cursor.classList.add('is-hover');
        }
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover', 'is-label');
      });
    });
  }

  /* ---------- 11. MARQUEE (marquee with inertia) ---------- */
  const rows = document.querySelectorAll('[data-marquee]');
  rows.forEach((row, idx) => {
    const inner = row.querySelector('.logos__inner');
    if (!inner) return;
    const dir = idx % 2 === 0 ? -1 : 1;
    gsap.set(inner, { xPercent: dir === -1 ? 0 : -50 });
    const tween = gsap.to(inner, {
      xPercent: dir === -1 ? -50 : 0,
      duration: 38,
      ease: 'none',
      repeat: -1
    });
    row.addEventListener('mouseenter', () => gsap.to(tween, { timeScale: 0.25, duration: 0.9, ease: 'power2.out' }));
    row.addEventListener('mouseleave', () => gsap.to(tween, { timeScale: 1, duration: 1.1, ease: 'power2.out' }));
  });

  /* ---------- 12. ACCORDION ---------- */
  const acc = document.getElementById('acc');
  if (acc) {
    const items = acc.querySelectorAll('.acc__item');
    items.forEach(item => {
      const head = item.querySelector('.acc__head');
      const panel = item.querySelector('.acc__panel');
      gsap.set(panel, { height: 0 });
      head.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        items.forEach(other => {
          if (other === item) return;
          other.classList.remove('is-open');
          gsap.to(other.querySelector('.acc__panel'), { height: 0, duration: 0.62, ease: 'power3.inOut' });
        });
        if (isOpen) {
          item.classList.remove('is-open');
          gsap.to(panel, { height: 0, duration: 0.62, ease: 'power3.inOut' });
        } else {
          item.classList.add('is-open');
          gsap.to(panel, {
            height: 'auto', duration: 0.78, ease: 'power3.inOut',
            onComplete: () => ScrollTrigger.refresh()
          });
        }
      });
    });
  }

  /* ---------- 13. COUNTERS (spring) ---------- */
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(obj, {
        v: end, duration: 1.9, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); }
      })
    });
  });

  /* ---------- 14. FORM ---------- */
  const form = document.getElementById('form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.name.value.trim();
      const phone = form.phone.value.trim();
      if (!name || !phone) {
        gsap.fromTo(form, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' });
        return;
      }
      form.classList.add('is-sent');
      gsap.fromTo('.form__ok', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
    });
  }

  /* ---------- 15. MOBILE MENU ---------- */
  const burger = document.getElementById('burger');
  const mmenu = document.getElementById('mmenu');
  function closeMenu() {
    if (!burger) return;
    burger.classList.remove('is-open');
    mmenu && mmenu.classList.remove('is-open');
    nav.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }
  if (burger && mmenu) {
    burger.addEventListener('click', () => {
      const open = !mmenu.classList.contains('is-open');
      burger.classList.toggle('is-open', open);
      mmenu.classList.toggle('is-open', open);
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (lenis) open ? lenis.stop() : lenis.start();
    });
  }

  /* ---------- 16. LIGHTBOX (страница писем) ---------- */
  const lb = document.getElementById('lightbox');
  if (lb) {
    const lbImg = document.getElementById('lightboxImg');
    const lbCount = document.getElementById('lightboxCount');
    const shots = Array.from(document.querySelectorAll('.letter__btn'));
    const total = shots.length;
    let idx = 0;
    const pad = n => String(n).padStart(2, '0');

    const show = i => {
      if (!total) return;
      idx = (i + total) % total;
      const src = shots[idx].querySelector('img');
      lbImg.src = src.getAttribute('src');
      lbImg.alt = src.getAttribute('alt') || '';
      lbCount.textContent = pad(idx + 1) + ' / ' + pad(total);
      if (!reduce) gsap.fromTo(lbImg, { opacity: 0, scale: 0.985 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
    };
    const open = i => {
      show(i);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    };

    shots.forEach((b, i) => b.addEventListener('click', () => open(i)));
    lb.querySelector('.lightbox__close').addEventListener('click', close);
    lb.querySelector('.lightbox__btn--prev').addEventListener('click', () => show(idx - 1));
    lb.querySelector('.lightbox__btn--next').addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    window.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- 17. HERO SCROLL-DRIVEN VIDEO ----------
     Прогресс прокрутки = прогресс видео. Секция .hero высотой
     --hero-h + 100svh, внутри sticky-блок ровно на один экран,
     поэтому на весь ролик приходится ровно 100svh скролла. */
  (function heroVideo(){
    const heroEl = document.querySelector('.hero');
    const pin    = document.querySelector('.hero__pin');
    const frame  = document.querySelector('.hero__frame');
    const vid    = document.querySelector('.hero__video');
    if (!heroEl || !pin || !frame || !vid) return;

    const FADE = 0.3;    // текст гаснет за первые 30% прокрутки
    const EPS  = 1 / 30; // допуск seek (кадр ролика — 1/24 с)

    let dur = 0, ready = false;
    let lastOp = null, lastVis = null, lastPe = null;

    const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

    /* Портретная мобильная версия показывает вертикальное фото — ролик там
       не используется, поэтому src снимается, чтобы не тянуть 5.7 МБ впустую.
       Состояние читается из CSS (там же единственный брейкпоинт), а при
       повороте экрана исходное состояние возвращается. preload="none" в
       разметке: тянуть ролик начинает только этот блок — первый кадр на
       время даёт <picture> под видео. */
    const VID_SRC = 'video/scrolling-hero.mp4';

    /* <picture> пересматривает кандидат <source> только при изменении самих
       атрибутов, а не при смене медиазапроса: без подсказки при повороте
       экрана кадр «залипал» на прежнем файле. Настоящий медиазапрос читаем
       один раз (он же лежит в styles.css), а состояние «портрет» берём у того
       же условия, что выключает видео — расхождения быть не может. */
    const picSource = document.querySelector('.hero__picture source');
    const PIC_MEDIA = picSource ? picSource.media : '';
    const PIC_OFF   = 'screen and (max-width:0px)';   // не совпадает никогда
    function syncPicture(idle){
      if (!picSource) return;
      const next = idle ? PIC_MEDIA : PIC_OFF;
      if (picSource.media !== next) picSource.media = next;
    }

    function syncVideoSource(){
      const idle = window.getComputedStyle(vid).display === 'none';
      syncPicture(idle);
      if (idle){
        if (vid.hasAttribute('src')){
          vid.removeAttribute('src');
          try { vid.load(); } catch (e) {}
          dur = 0; ready = false;
        }
      } else if (!vid.hasAttribute('src') || vid.preload !== 'auto'){
        if (!vid.hasAttribute('src')) vid.setAttribute('src', VID_SRC);
        vid.preload = 'auto';
        try { vid.load(); } catch (e) {}
        if (syncMeta()) apply();
      }
    }
    syncVideoSource();
    window.addEventListener('resize', syncVideoSource);
    /* страховка на поворот экрана: resize на части мобильных браузеров
       приходит раньше обновления вьюпорта — добиваемся проверкой с задержкой */
    window.addEventListener('orientationchange', function(){
      setTimeout(syncVideoSource, 150);
    });

    // metadata может догрузиться раньше, чем app.js дошёл до этого блока
    function syncMeta(){
      if (ready) return true;
      if (vid.readyState >= 1 && isFinite(vid.duration) && vid.duration > 0) {
        dur = vid.duration;
        ready = true;
        return true;
      }
      return false;
    }

    function progress(){
      const run = heroEl.offsetHeight - pin.offsetHeight;
      if (run <= 0) return 0;
      return clamp(-heroEl.getBoundingClientRect().top / run, 0, 1);
    }

    function apply(){
      syncMeta();
      const p = progress();

      const o = clamp(1 - p / FADE, 0, 1);
      if (o !== lastOp) { frame.style.opacity = o; lastOp = o; }
      const vis = o <= 0.002 ? 'hidden' : 'visible';
      if (vis !== lastVis) { frame.style.visibility = vis; lastVis = vis; }
      const pe = o < 0.4 ? 'none' : '';
      if (pe !== lastPe) { frame.style.pointerEvents = pe; lastPe = pe; }

      if (ready && dur && !vid.seeking) {
        const t = p * dur;
        if (Math.abs(vid.currentTime - t) > EPS) {
          try { vid.currentTime = t; } catch (e) { /* seek недоступен */ }
        }
      }
    }

    vid.addEventListener('loadedmetadata', apply);
    vid.addEventListener('seeked', apply);
    window.addEventListener('scroll', apply, { passive: true });
    window.addEventListener('resize', apply);
    if (lenis) lenis.on('scroll', apply);
    apply();
  })();

  /* ---------- 18. REFRESH + DEEP LINK ---------- */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  setTimeout(() => ScrollTrigger.refresh(), 900);

  // приход с другой страницы (index.html#about) — прыжок к якорю после лоадера
  if (location.hash && location.hash.length > 1) {
    const jump = () => {
      let target = null;
      try { target = document.querySelector(location.hash); } catch (err) { target = null; }
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
      ScrollTrigger.refresh();
    };
    if (loader) tl.eventCallback('onComplete', jump);
    else jump();
  }
})();
