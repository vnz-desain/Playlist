/**
 * M. EVAN ALMUNAWAR — Midnight Playlist
 * script.js
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
 * 7a. Song card reveal (staggered observer)
 * 7b. Playlist card reveal (staggered observer)
 * 8.  Genre filter (ONLY targets .song-card, never .playlist-card)
 * 9.  Playlist card player toggle
 * 10. Song card player toggle
 * 11. Lazy iframe observer
 * 12. Auto-thumbnail system (YouTube HQ → MQ fallback → SVG)
 * 13. Custom cover image fallback handler (data-bg)
 * 14. Cursor ambient glow (desktop only)
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
     1. NAVIGATION — scroll state (rAF throttle)
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
  handleNavScroll();

  /* ─────────────────────────────────────────────
     2. REVEAL ANIMATIONS — IntersectionObserver
     Targets .reveal-up, .reveal-left, .reveal-right.
     Removes will-change after animation to save memory.
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
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     3. HERO ENTRANCE — force after first paint
     Hero items are in viewport on load so IO may
     not fire. Force .visible after 120ms.
  ───────────────────────────────────────────── */
  setTimeout(function () {
    document.querySelectorAll('.hero .reveal-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }, 120);

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
     7a. SONG CARD REVEAL — staggered IntersectionObserver
     Only .song-card elements.
     NOTE: Genre filter (section 8) also targets only .song-card.
  ───────────────────────────────────────────── */
  var songCards = document.querySelectorAll('.song-card');

  if ('IntersectionObserver' in window) {
    var songCardObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var idx = Array.prototype.indexOf.call(songCards, card);
        setTimeout(function () {
          card.classList.add('visible');
        }, idx * 70);
        songCardObs.unobserve(card);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    songCards.forEach(function (card) { songCardObs.observe(card); });
  } else {
    songCards.forEach(function (card) { card.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     7b. PLAYLIST CARD REVEAL — staggered IntersectionObserver
     Separate from song cards.
     IMPORTANT: Playlist cards are NEVER touched by the genre filter.
  ───────────────────────────────────────────── */
  var playlistCards = document.querySelectorAll('.playlist-card');

  if ('IntersectionObserver' in window) {
    var playlistCardObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        var idx = Array.prototype.indexOf.call(playlistCards, card);
        setTimeout(function () {
          card.classList.add('visible');
        }, idx * 70);
        playlistCardObs.unobserve(card);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    playlistCards.forEach(function (card) { playlistCardObs.observe(card); });
  } else {
    playlistCards.forEach(function (card) { card.classList.add('visible'); });
  }

  /* ─────────────────────────────────────────────
     8. GENRE FILTER
     ─────────────────────────────────────────────
     HOW IT WORKS:
     - Filter chips: data-genre="kpop" on <button class="chip">
     - Song cards:   data-category="kpop" on <article class="song-card">
     - "all" shows every song card
     - Matching genre shows only song cards with matching data-category

     RULES:
     - ONLY targets .song-card — NEVER .playlist-card
     - Playlist cards are permanent and never hidden
     - Cards re-animate (fade + slide) on filter change

     TO ADD A NEW GENRE:
       1. Add <button class="chip" data-genre="new-genre">Label</button> in HTML
       2. Add data-category="new-genre" to song cards in HTML
       No JS changes needed.
  ───────────────────────────────────────────── */
  var chips = document.querySelectorAll('.chip');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chips.forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');

      var genre = chip.dataset.genre;

      // ONLY filter .song-card — playlist cards are NEVER touched
      songCards.forEach(function (card) {
        var match = (genre === 'all' || card.dataset.category === genre);

        if (match) {
          card.classList.remove('hidden');
          card.classList.remove('visible');
          void card.offsetWidth; // force reflow to reset animation
          setTimeout(function () {
            card.classList.add('visible');
          }, 30);
        } else {
          card.classList.remove('visible');
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ─────────────────────────────────────────────
     9. PLAYLIST CARD PLAYER TOGGLE
     Toggle embedded YouTube iframe for each playlist card.
     - One player open at a time
     - Closing resets iframe src (stops playback)
  ───────────────────────────────────────────── */
  document.querySelectorAll('.playlist-card .card-play-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cover = btn.closest('.card-cover');
      var isOpen = cover.classList.contains('player-open');

      // Close all other open playlist players
      document.querySelectorAll('.playlist-card .card-cover.player-open').forEach(function (openCover) {
        if (openCover !== cover) {
          openCover.classList.remove('player-open');
          var otherBtn = openCover.querySelector('.card-play-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-label', 'Show player');
          setPlaylistIcon(otherBtn, false);
          var iframe = openCover.querySelector('iframe');
          if (iframe) { iframe.src = iframe.src; }
        }
      });

      cover.classList.toggle('player-open', !isOpen);
      btn.setAttribute('aria-label', isOpen ? 'Show player' : 'Hide player');
      setPlaylistIcon(btn, !isOpen);

      if (isOpen) {
        var iframe = cover.querySelector('iframe');
        if (iframe) { iframe.src = iframe.src; }
      }
    });
  });

  function setPlaylistIcon(btn, playing) {
    if (!btn) return;
    if (playing) {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    } else {
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
    }
  }

  /* ─────────────────────────────────────────────
     10. SONG CARD PLAYER TOGGLE
     Toggle embedded YouTube iframe for each song card.
     Shares same single-player-at-a-time logic.
  ───────────────────────────────────────────── */
  document.querySelectorAll('.song-card .song-play-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cover = btn.closest('.song-cover');
      var isOpen = cover.classList.contains('player-open');

      // Close all other open song players
      document.querySelectorAll('.song-card .song-cover.player-open').forEach(function (openCover) {
        if (openCover !== cover) {
          openCover.classList.remove('player-open');
          var otherBtn = openCover.querySelector('.song-play-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-label', 'Show player');
          setSongIcon(otherBtn, false);
          var iframe = openCover.querySelector('iframe');
          if (iframe) { iframe.src = iframe.src; }
        }
      });

      cover.classList.toggle('player-open', !isOpen);
      btn.setAttribute('aria-label', isOpen ? 'Show player' : 'Hide player');
      setSongIcon(btn, !isOpen);

      if (isOpen) {
        var iframe = cover.querySelector('iframe');
        if (iframe) { iframe.src = iframe.src; }
      }
    });
  });

  function setSongIcon(btn, playing) {
    if (!btn) return;
    if (playing) {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
    } else {
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l8 4-8 4V4z" fill="currentColor"/></svg>';
    }
  }

  /* ─────────────────────────────────────────────
     11. LAZY IFRAMES — observer
     Marks iframes as loaded when they enter viewport.
     Actual src is in HTML — loading="lazy" handles deferral.
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
     12. AUTO-THUMBNAIL SYSTEM (Song Cards)
     ─────────────────────────────────────────────
     Priority chain for each .song-thumb:

       1. data-bg="images/custom.jpg"  ← manual override (highest priority)
       2. data-yt-id="VIDEO_ID"        ← YouTube HQ thumbnail auto-fetch
          → falls back to MQ if HQ 404s
       3. SVG fallback art             ← always rendered; hidden when real thumb loads

     HOW TO USE:
       Custom image:  add data-bg="images/cover.jpg" to .song-thumb
       Auto YouTube:  ensure data-yt-id="VIDEO_ID" matches the embed iframe
       Pure SVG:      leave both attributes off; SVG is shown automatically

     NOTE: YouTube thumbnail URLs are constructed client-side —
     no API key needed. HQ = maxresdefault.jpg, MQ = mqdefault.jpg.
  ───────────────────────────────────────────── */
  document.querySelectorAll('.song-thumb').forEach(function (thumb) {
    var customBg = thumb.dataset.bg;
    var ytId     = thumb.dataset.ytId;

    // Priority 1: manual data-bg image
    if (customBg) {
      loadThumbImage(thumb, customBg);
      return;
    }

    // Priority 2: auto YouTube thumbnail
    if (ytId) {
      var hqUrl = 'https://img.youtube.com/vi/' + ytId + '/maxresdefault.jpg';
      var mqUrl = 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg';
      var testHQ = new Image();
      testHQ.onload = function () {
        // YouTube returns a 120x90 placeholder for missing HQ — detect it
        if (testHQ.naturalWidth > 120) {
          applyThumb(thumb, hqUrl);
        } else {
          // HQ not available — try MQ
          loadThumbImage(thumb, mqUrl);
        }
      };
      testHQ.onerror = function () {
        loadThumbImage(thumb, mqUrl);
      };
      testHQ.src = hqUrl;
    }
    // Priority 3: SVG fallback — already in HTML, no action needed
  });

  function loadThumbImage(thumb, url) {
    var img = new Image();
    img.onload = function () { applyThumb(thumb, url); };
    img.onerror = function () { /* SVG fallback stays visible */ };
    img.src = url;
  }

  function applyThumb(thumb, url) {
    thumb.style.backgroundImage = 'url("' + url + '")';
    thumb.style.backgroundSize  = 'cover';
    thumb.style.backgroundPosition = 'center';
    thumb.dataset.thumbLoaded = 'true'; // hides SVG via CSS
  }

  /* ─────────────────────────────────────────────
     13. CUSTOM COVER IMAGE FALLBACK (Playlist Cards)
     ─────────────────────────────────────────────
     For .card-cover-art[data-bg="images/custom.jpg"]:
       - If image loads → apply as background, hide SVG
       - If image fails → mark [data-img-error], CSS shows SVG

     HOW TO USE:
       <div class="card-cover-art" data-bg="images/kpop-cover.jpg" style="background:...">
  ───────────────────────────────────────────── */
  document.querySelectorAll('.card-cover-art[data-bg]').forEach(function (el) {
    var src = el.dataset.bg;
    if (!src) return;

    var testImg = new Image();
    testImg.onload = function () {
      el.style.backgroundImage   = 'url("' + src + '")';
      el.style.backgroundSize    = 'cover';
      el.style.backgroundPosition = 'center center';
      var svg = el.querySelector('.cover-svg');
      if (svg) svg.style.display = 'none';
    };
    testImg.onerror = function () {
      el.setAttribute('data-img-error', 'true');
    };
    testImg.src = src;
  });

  /* ─────────────────────────────────────────────
     14. CURSOR AMBIENT GLOW — desktop only
     Smooth lerp red glow following cursor.
     Only on pointer:fine (mouse) devices.
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
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

})();
