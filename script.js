/**
 * M. EVAN ALMUNAWAR — Midnight Playlist
 * script-playlist.js | Diselaraskan penuh dengan script-portofolio.js
 *
 * PERUBAHAN & PENYELARASAN
 * ────────────────────────
 * 1. Pola IIFE + 'use strict' identik dengan portofolio.
 * 2. Nav scroll: rAF throttle + handleNavScroll() pattern dari portofolio.
 * 3. Reveal animations: .reveal-up / .reveal-left / .reveal-right + will-change
 *    cleanup via transitionend — identik portofolio (section 2).
 * 4. Hero entrance: setTimeout 120ms seperti portofolio (section 3).
 * 5. Scroll indicator fade: observer pattern dari portofolio (section 4).
 * 6. Smooth anchor: scrollIntoView + scroll-padding-top CSS (section 5).
 * 7. Lazy img polyfill: identik portofolio (section 6).
 * 8. Card reveal: IntersectionObserver dengan threshold 0.08 + stagger.
 * 9. Mood filter: pakai classList toggle + re-trigger visibility.
 * 10. Player toggle: sinkron dengan HTML — pakai class "player-open" di
 *     .card-cover (bukan "active" di .card-player-wrap) agar selaras CSS.
 * 11. Lazy iframe: observer 200px rootMargin.
 * 12. Cursor ambient glow: hanya desktop (pointer: fine), lerp smooth.
 * 13. Grain element: inject otomatis jika belum ada di HTML.
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     0. GRAIN ELEMENT — inject jika belum ada
     (Portofolio punya <div class="grain"> di HTML;
      di sini kita inject otomatis untuk safety)
  ───────────────────────────────────────────── */
  if (!document.querySelector('.grain')) {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  /* ─────────────────────────────────────────────
     1. NAVIGATION — scroll state (rAF throttle)
     Identik dengan portofolio section 1.
  ───────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var scrollTick = false;

  function handleNavScroll() {
    if (!scrollTick) {
      requestAnimationFrame(function () {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        scrollTick = false;
      });
      scrollTick = true;
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // run once on load

  /* ─────────────────────────────────────────────
     2. REVEAL ANIMATIONS — IntersectionObserver
     Identik dengan portofolio section 2.
     Mencari .reveal-up, .reveal-left, .reveal-right.
     will-change di-remove via transitionend.
  ───────────────────────────────────────────── */
  var revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('visible');
        revealObs.unobserve(el);

        el.addEventListener('transitionend', function cleanup() {
          el.style.willChange = 'auto';
          el.removeEventListener('transitionend', cleanup);
        }, { once: true });
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     3. HERO ENTRANCE — trigger setelah first paint
     Identik dengan portofolio section 3.
  ───────────────────────────────────────────── */
  setTimeout(function () {
    document.querySelectorAll('.hero .reveal-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }, 120);

  /* ─────────────────────────────────────────────
     4. SCROLL INDICATOR — fade on first scroll
     Identik dengan portofolio section 4.
  ───────────────────────────────────────────── */
  var scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollIndicator) {
    scrollIndicator.style.transition = 'opacity 0.4s';
    var scrollFadeDone = false;
    function fadeScrollIndicator() {
      if (scrollFadeDone) return;
      if (window.scrollY > 80) {
        scrollIndicator.style.opacity = '0';
        scrollFadeDone = true;
        window.removeEventListener('scroll', fadeScrollIndicator);
      }
    }
    window.addEventListener('scroll', fadeScrollIndicator, { passive: true });
  }

  /* ─────────────────────────────────────────────
     5. SMOOTH ANCHOR SCROLLING
     Identik dengan portofolio section 5.
  ───────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ─────────────────────────────────────────────
     6. LAZY-LOAD FALLBACK — img (identik portofolio section 6)
  ───────────────────────────────────────────── */
  var lazyImgs = document.querySelectorAll('img[loading="lazy"]');
  if (!('loading' in HTMLImageElement.prototype) && 'IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        if (img.dataset.src) { img.src = img.dataset.src; }
        imgObs.unobserve(img);
      });
    }, { rootMargin: '200px' });

    lazyImgs.forEach(function (img) {
      img.dataset.src = img.src;
      img.src = '';
      imgObs.observe(img);
    });
  }

  /* ─────────────────────────────────────────────
     7. PLAYLIST CARD REVEAL — staggered IntersectionObserver
     Pakai class "visible" seperti CSS style-playlist.css.
  ───────────────────────────────────────────── */
  var cards = document.querySelectorAll('.playlist-card');

  if ('IntersectionObserver' in window) {
    var cardObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        // Ambil index dari posisi dalam NodeList untuk stagger
        var idx = Array.prototype.indexOf.call(cards, card);
        setTimeout(function () {
          card.classList.add('visible');
        }, idx * 70);
        cardObs.unobserve(card);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    cards.forEach(function (card) { cardObs.observe(card); });
  } else {
    cards.forEach(function (card) { card.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     8. MOOD FILTER
     Pakai classList toggle; re-trigger visibility animation.
     Hidden pakai .hidden CSS class (display:none di style.css).
  ───────────────────────────────────────────── */
  var chips = document.querySelectorAll('.chip');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      // Update active chip
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      var mood = chip.dataset.mood;

      cards.forEach(function (card) {
        var match = (mood === 'all' || card.dataset.mood === mood);
        if (match) {
          card.classList.remove('hidden');
          // Re-trigger reveal animation
          card.classList.remove('visible');
          void card.offsetWidth; // force reflow
          setTimeout(function () { card.classList.add('visible'); }, 30);
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ─────────────────────────────────────────────
     9. CARD PLAYER TOGGLE
     Sinkron dengan index.html & style.css:
     - Toggle class "player-open" pada .card-cover
     - CSS style.css merespons .card-cover.player-open
     - Satu player aktif pada satu waktu
     - Reset src iframe saat ditutup (stop playback)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.card-play-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cover = btn.closest('.card-cover');
      var isOpen = cover.classList.contains('player-open');

      // Tutup semua player lain + reset iframe src
      document.querySelectorAll('.card-cover.player-open').forEach(function (openCover) {
        if (openCover !== cover) {
          openCover.classList.remove('player-open');
          var otherBtn = openCover.querySelector('.card-play-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-label', 'Show player');
          setPlayIcon(otherBtn, false);
          var iframe = openCover.querySelector('iframe');
          if (iframe) { iframe.src = iframe.src; } // stop playback
        }
      });

      // Toggle current player
      cover.classList.toggle('player-open', !isOpen);
      btn.setAttribute('aria-label', isOpen ? 'Show player' : 'Hide player');
      setPlayIcon(btn, !isOpen);

      // Stop playback jika ditutup
      if (isOpen) {
        var iframe = cover.querySelector('iframe');
        if (iframe) { iframe.src = iframe.src; }
      }
    });
  });

  function setPlayIcon(btn, playing) {
    if (!btn) return;
    if (playing) {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    } else {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
    }
  }

  /* ─────────────────────────────────────────────
     10. LAZY-LOAD IFRAMES — rootMargin 200px
  ───────────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var iframeObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // src sudah di HTML; observer hanya sebagai signal
          entry.target.dataset.srcLoaded = 'true';
          iframeObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('iframe[loading="lazy"]').forEach(function (iframe) {
      iframeObs.observe(iframe);
    });
  }

  /* ─────────────────────────────────────────────
     11. CURSOR AMBIENT GLOW — desktop only
     Identik dengan script-playlist lama; lerp smooth.
  ───────────────────────────────────────────── */
  if (!window.matchMedia('(pointer: coarse)').matches) {
    var glow = document.createElement('div');
    glow.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:360px',
      'height:360px',
      'border-radius:50%',
      'background:radial-gradient(circle,rgba(196,30,58,0.04) 0%,transparent 70%)',
      'pointer-events:none',
      'z-index:9998',
      'transform:translate(-50%,-50%)',
      'transition:opacity 0.5s',
      'opacity:0',
      'will-change:transform'
    ].join(';');
    document.body.appendChild(glow);

    var gx = 0, gy = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', function (e) {
      gx = e.clientX;
      gy = e.clientY;
      glow.style.opacity = '1';
    });
    document.addEventListener('mouseleave', function () {
      glow.style.opacity = '0';
    });

    function lerpN(a, b, t) { return a + (b - a) * t; }
    function animateGlow() {
      cx = lerpN(cx, gx, 0.1);
      cy = lerpN(cy, gy, 0.1);
      glow.style.left = cx + 'px';
      glow.style.top  = cy + 'px';
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

})();
