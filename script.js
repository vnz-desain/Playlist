/**
 * M. EVAN ALMUNAWAR — Midnight Playlist
 * script.js — Fixed & Improved
 *
 * SECTIONS:
 * ──────────────────────────────────────────────────
 * 0.  Grain overlay (inject if missing)
 * 1.  Navigation scroll state (rAF throttle)
 * 2.  Reveal animations (IntersectionObserver)
 * 3.  Hero entrance (forced after first paint)
 * 4.  Scroll indicator fade
 * 5.  Smooth anchor scrolling
 * 6.  Lazy-load images (polyfill)
 * 7.  Playlist card reveal (staggered observer)
 * 8.  Genre filter (data-genre → data-category matching)
 * 9.  Card player toggle (iframe embed)
 * 10. Lazy iframe observer
 * 11. Cursor ambient glow (desktop only)
 * 12. Cover image fallback handler
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     0. GRAIN ELEMENT — inject if not in HTML
  ───────────────────────────────────────────── */
  if (!document.querySelector('.grain')) {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  /* ─────────────────────────────────────────────
     1. NAVIGATION — scroll state with rAF throttle
     Adds .scrolled class when scrolled past 60px.
  ───────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var scrollTick = false;

  function handleNavScroll() {
    if (!scrollTick) {
      requestAnimationFrame(function () {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
        scrollTick = false;
      });
      scrollTick = true;
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // run once on load to set initial state

  /* ─────────────────────────────────────────────
     2. REVEAL ANIMATIONS — IntersectionObserver
     Targets .reveal-up, .reveal-left, .reveal-right.
     Adds .visible class when element enters viewport.
     Removes will-change after transition to save memory.
  ───────────────────────────────────────────── */
  var revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('visible');
        revealObs.unobserve(el);

        // Clean up will-change after animation completes (memory optimization)
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
    // Fallback: show everything if IntersectionObserver not supported
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     3. HERO ENTRANCE — force trigger after first paint
     ─────────────────────────────────────────────
     FIX: Hero text is initially opacity:0 (reveal-up class).
     IntersectionObserver may not fire for elements already
     in the viewport on load. We force .visible after 120ms
     to guarantee text appears regardless of browser paint timing.

     WHY 120ms: enough time for first paint to complete,
     short enough to feel instant to the user.
  ───────────────────────────────────────────── */
  setTimeout(function () {
    document.querySelectorAll('.hero .reveal-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }, 120);

  // Additional safety: also fire on DOMContentLoaded if not already visible
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      document.querySelectorAll('.hero .reveal-up:not(.visible)').forEach(function (el) {
        el.classList.add('visible');
      });
    }, 50);
  });

  /* ─────────────────────────────────────────────
     4. SCROLL INDICATOR — fade on first scroll
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
     Intercepts clicks on #hash links.
     CSS scroll-padding-top: --nav-h handles offset.
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
     6. LAZY-LOAD IMAGES — polyfill for older browsers
     Modern browsers handle loading="lazy" natively.
     This polyfill covers browsers without native support.
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
     7. PLAYLIST CARD REVEAL — staggered reveal
     Each card gets .visible after a staggered delay
     based on its position in the grid.
  ───────────────────────────────────────────── */
  var cards = document.querySelectorAll('.playlist-card');

  if ('IntersectionObserver' in window) {
    var cardObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var idx = Array.prototype.indexOf.call(cards, card);
        setTimeout(function () {
          card.classList.add('visible');
        }, idx * 70); // 70ms stagger between each card
        cardObs.unobserve(card);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    cards.forEach(function (card) { cardObs.observe(card); });
  } else {
    // Fallback: reveal all immediately
    cards.forEach(function (card) { card.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     8. GENRE FILTER
     ─────────────────────────────────────────────
     HOW IT WORKS:
     - Filter buttons use data-genre="kpop" (etc.) on <button class="chip">
     - Playlist cards use data-category="kpop" (etc.) on <article class="playlist-card">
     - "all" button shows every card regardless of category
     - Other genres show only cards where data-category matches

     TO ADD A NEW GENRE:
     1. Add <button class="chip" data-genre="your-genre">Your Genre</button> in HTML
     2. Add data-category="your-genre" to playlist cards in HTML
     No JS changes needed.

     ANIMATION: cards re-animate (fade + slide) when filter changes.
  ───────────────────────────────────────────── */
  var chips = document.querySelectorAll('.chip');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      // Update active chip
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      var genre = chip.dataset.genre; // reads data-genre attribute from filter button

      cards.forEach(function (card) {
        // data-category on card must match data-genre on button
        var match = (genre === 'all' || card.dataset.category === genre);

        if (match) {
          // Show card: remove hidden, re-trigger reveal animation
          card.classList.remove('hidden');
          card.classList.remove('visible');
          void card.offsetWidth; // force browser reflow to reset animation
          setTimeout(function () {
            card.classList.add('visible');
          }, 30);
        } else {
          // Hide card: remove visible first to avoid stuck state
          card.classList.remove('visible');
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ─────────────────────────────────────────────
     9. CARD PLAYER TOGGLE
     Toggles the embedded YouTube iframe for each card.
     - Clicks the play button → shows iframe, hides cover art
     - Only one player open at a time
     - Closing a player resets iframe src (stops playback)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.card-play-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cover = btn.closest('.card-cover');
      var isOpen = cover.classList.contains('player-open');

      // Close all other open players first
      document.querySelectorAll('.card-cover.player-open').forEach(function (openCover) {
        if (openCover !== cover) {
          openCover.classList.remove('player-open');
          var otherBtn = openCover.querySelector('.card-play-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-label', 'Show player');
          setPlayIcon(otherBtn, false);
          // Reset iframe src to stop playback
          var iframe = openCover.querySelector('iframe');
          if (iframe) { iframe.src = iframe.src; }
        }
      });

      // Toggle current player
      cover.classList.toggle('player-open', !isOpen);
      btn.setAttribute('aria-label', isOpen ? 'Show player' : 'Hide player');
      setPlayIcon(btn, !isOpen);

      // Stop playback when closing
      if (isOpen) {
        var iframe = cover.querySelector('iframe');
        if (iframe) { iframe.src = iframe.src; }
      }
    });
  });

  function setPlayIcon(btn, playing) {
    if (!btn) return;
    if (playing) {
      // Close (X) icon when player is open
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    } else {
      // Play (triangle) icon when player is closed
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
    }
  }

  /* ─────────────────────────────────────────────
     10. LAZY IFRAMES — observe for performance
     Iframes have loading="lazy" in HTML.
     This observer marks them loaded once in range.
     Actual src is already in HTML — this just tracks load state.
  ───────────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    var iframeObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
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
     Smooth lerp glow following cursor position.
     Only active on pointer:fine devices (mouse, not touch).
  ───────────────────────────────────────────── */
  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) {
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
    var glowRaf = null;

    document.addEventListener('mousemove', function (e) {
      gx = e.clientX;
      gy = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      glow.style.opacity = '0';
    }, { passive: true });

    function lerpN(a, b, t) { return a + (b - a) * t; }
    function animateGlow() {
      cx = lerpN(cx, gx, 0.1);
      cy = lerpN(cy, gy, 0.1);
      glow.style.left = cx + 'px';
      glow.style.top  = cy + 'px';
      glowRaf = requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

  /* ─────────────────────────────────────────────
     12. COVER IMAGE FALLBACK HANDLER
     ─────────────────────────────────────────────
     If a playlist cover image fails to load
     (e.g. images/playlist-name.jpg not found),
     this marks the element so CSS shows the SVG fallback instead.

     HOW TO USE CUSTOM COVER IMAGES:
     1. Put image in images/ folder: images/my-playlist.jpg
     2. Add to card-cover-art: data-bg="images/my-playlist.jpg"
     3. This script will load it and apply as background-image
     4. If it fails, the SVG cover art shows automatically

     Example:
       <div class="card-cover-art" data-bg="images/kpop-cover.jpg" style="background:...">
  ───────────────────────────────────────────── */
  document.querySelectorAll('.card-cover-art[data-bg]').forEach(function (el) {
    var src = el.dataset.bg;
    if (!src) return;

    var testImg = new Image();
    testImg.onload = function () {
      // Image loaded successfully — apply as background
      el.style.backgroundImage = 'url("' + src + '")';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center center';
      // Hide SVG fallback since we have a real image
      var svg = el.querySelector('.cover-svg');
      if (svg) svg.style.display = 'none';
    };
    testImg.onerror = function () {
      // Image failed to load — mark element, CSS will show SVG fallback
      el.setAttribute('data-img-error', 'true');
    };
    testImg.src = src;
  });

})();
