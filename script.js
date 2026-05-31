/**
 * M. EVAN ALMUNAWAR — Midnight Playlist
 * script.js  (refactored — data-driven)
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
 * 7.  Data loader — fetch tracks.json + playlists.json
 * 8.  Render — song cards (from tracks.json)
 * 9.  Render — playlist cards (from playlists.json)
 * 10. Genre filter (ONLY targets .song-card, never .playlist-card)
 * 11. Playlist card player toggle
 * 12. Song card player toggle
 * 13. Lazy iframe observer
 * 14. Auto-thumbnail system (YouTube HQ → MQ fallback → SVG)
 * 15. Custom cover image fallback handler (data-bg)
 * 16. Cursor ambient glow (desktop only)
 *
 * ──────────────────────────────────────────────────
 * HOW TO ADD CONTENT (no HTML editing required):
 *
 * ADD A SONG:
 *   Open data/tracks.json and append an object:
 *   {
 *     "id":        "unique-id",          ← kebab-case, unique
 *     "title":     "Song Title",
 *     "artist":    "Artist Name",
 *     "genre":     "K-Pop",             ← visible label on card
 *     "category":  "kpop",              ← matches filter chip data-genre
 *     "youtubeId": "VIDEO_ID_HERE"      ← 11-char YouTube video ID
 *   }
 *
 * ADD A PLAYLIST:
 *   Open data/playlists.json and append an object:
 *   {
 *     "id":          "unique-id",
 *     "title":       "Playlist Name",
 *     "genre":       "K-Pop",
 *     "genreTag":    "kpop",
 *     "description": "Short description.",
 *     "playlistUrl": "https://youtube.com/playlist?list=...",
 *     "embedUrl":    "https://www.youtube.com/embed/videoseries?list=...",
 *     "featured":    false,             ← true = wide card (2 columns)
 *     "accentColor": "#C41E3A",
 *     "svgLabel":    "K-POP",
 *     "svgStyle":    "red"              ← "red" or "gold"
 *   }
 *
 * ADD A GENRE FILTER CHIP:
 *   1. Add <button class="chip" data-genre="new-genre">Label</button> in index.html
 *   2. Add matching "category": "new-genre" in tracks.json
 * ──────────────────────────────────────────────────
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
  ───────────────────────────────────────────── */
  function observeReveal() {
    var revealEls = document.querySelectorAll('.reveal-up:not(.observed), .reveal-left:not(.observed), .reveal-right:not(.observed)');

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

      revealEls.forEach(function (el) {
        el.classList.add('observed');
        revealObs.observe(el);
      });
    } else {
      revealEls.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  /* ─────────────────────────────────────────────
     3. HERO ENTRANCE — force after first paint
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
  function lazyLoadImages() {
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
  }

  /* ─────────────────────────────────────────────
     7. DATA LOADER
     Fetches both JSON files in parallel, then
     renders cards and wires all interactions.
  ───────────────────────────────────────────── */
  Promise.all([
    fetch('data/tracks.json').then(function (r) { return r.json(); }),
    fetch('data/playlists.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    var tracks   = results[0];
    var playlists = results[1];

    renderTracks(tracks);
    renderPlaylists(playlists);

    // Wire all interactions after DOM is populated
    initCardReveals();
    initGenreFilter();
    initPlaylistToggles();
    initSongToggles();
    initLazyIframes();
    initThumbnails();
    initCoverFallbacks();
    observeReveal();
    lazyLoadImages();

  }).catch(function (err) {
    console.error('[MidnightPlaylist] Failed to load JSON data:', err);
    // Graceful fallback message
    var songsGrid = document.getElementById('songs-grid');
    if (songsGrid) songsGrid.innerHTML = '<p style="color:#888;font-family:\'Space Mono\',monospace;font-size:12px;padding:2rem 0;">Could not load tracks. Make sure data/tracks.json exists and you are running a local server.</p>';
  });

  /* ─────────────────────────────────────────────
     8. RENDER — SONG CARDS
     Generates .song-card HTML from tracks array.
     Identical structure to original hardcoded cards.
  ───────────────────────────────────────────── */
  function renderTracks(tracks) {
    var grid = document.getElementById('songs-grid');
    if (!grid) return;

    var svgPlayIcon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l8 4-8 4V4z" fill="currentColor"/></svg>';

    var html = tracks.map(function (track, i) {
      var gradId = 'sg-auto-' + i;
      return [
        '<article class="song-card" data-category="' + esc(track.category) + '">',
        '  <div class="song-cover">',
        '    <div class="song-thumb" data-yt-id="' + esc(track.youtubeId) + '"' + (track.coverImage ? ' data-bg="' + esc(track.coverImage) + '"' : '') + '>',
        '      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="song-thumb-svg" aria-hidden="true">',
        '        <defs><radialGradient id="' + gradId + '" cx="50%" cy="40%" r="60%">',
        '          <stop offset="0%" stop-color="#C41E3A" stop-opacity="0.15"/>',
        '          <stop offset="100%" stop-color="#000" stop-opacity="0"/>',
        '        </radialGradient></defs>',
        '        <rect width="200" height="200" fill="#0a0a0a"/>',
        '        <rect width="200" height="200" fill="url(#' + gradId + ')"/>',
        '        <circle cx="100" cy="85" r="30" fill="none" stroke="#C41E3A" stroke-width="0.5" opacity="0.4"/>',
        '        <circle cx="100" cy="85" r="3" fill="#C41E3A" opacity="0.7"/>',
        '        <text x="100" y="170" text-anchor="middle" font-family="serif" font-size="8" fill="#C41E3A" opacity="0.3" letter-spacing="3">' + esc(track.genre.toUpperCase()) + '</text>',
        '      </svg>',
        '    </div>',
        '    <div class="song-player-wrap">',
        '      <iframe',
        '        src="https://www.youtube.com/embed/' + esc(track.youtubeId) + '"',
        '        title="' + esc(track.title) + ' - ' + esc(track.artist) + '"',
        '        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"',
        '        allowfullscreen',
        '        loading="lazy">',
        '      </iframe>',
        '    </div>',
        '    <button class="song-play-toggle" aria-label="Show player">' + svgPlayIcon + '</button>',
        '  </div>',
        '  <div class="song-body">',
        '    <div class="song-genre-tag">' + esc(track.genre) + '</div>',
        '    <h3 class="song-title">' + esc(track.title) + '</h3>',
        '    <p class="song-artist">' + esc(track.artist) + '</p>',
        '  </div>',
        '</article>'
      ].join('\n');
    });

    grid.innerHTML = html.join('\n');
  }

  /* ─────────────────────────────────────────────
     9. RENDER — PLAYLIST CARDS
     Generates .playlist-card HTML from playlists array.
     Identical structure to original hardcoded cards.
  ───────────────────────────────────────────── */
  function renderPlaylists(playlists) {
    var grid = document.getElementById('playlist-grid');
    if (!grid) return;

    var svgPlayIcon = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
    var svgArrow    = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var html = playlists.map(function (pl) {
      var isGold    = pl.svgStyle === 'gold';
      var featClass = pl.featured ? ' card-featured' : '';
      var tagClass  = isGold ? ' card-mood-tag--gold' : '';
      var btnClass  = isGold ? ' card-btn--gold' : '';
      var coverStyle= isGold
        ? 'style="background:linear-gradient(135deg,#0c0a08 0%,#1c1510 50%,#0a0808 100%)"'
        : '';

      var svgContent = isGold
        ? buildGoldSvg(pl.svgLabel)
        : buildRedSvg(pl.svgLabel);

      return [
        '<article class="playlist-card' + featClass + '">',
        '  <div class="card-cover">',
        '    <div class="card-cover-art"' + coverStyle + (pl.coverImage ? ' data-bg="' + esc(pl.coverImage) + '"' : '') + '>',
        '      ' + svgContent,
        '    </div>',
        '    <div class="card-player-wrap">',
        '      <iframe',
        '        src="' + esc(pl.embedUrl) + '"',
        '        title="' + esc(pl.title) + '"',
        '        allowfullscreen',
        '        loading="lazy">',
        '      </iframe>',
        '    </div>',
        '    <button class="card-play-toggle" aria-label="Show player">' + svgPlayIcon + '</button>',
        '  </div>',
        '  <div class="card-body">',
        '    <div class="card-mood-tag' + tagClass + '">' + esc(pl.genre) + '</div>',
        '    <h2 class="card-title">' + esc(pl.title) + '</h2>',
        '    <p class="card-desc">' + esc(pl.description) + '</p>',
        '    <a href="' + esc(pl.playlistUrl) + '" target="_blank" rel="noopener" class="card-btn' + btnClass + '">',
        '      <span>Open Playlist</span>',
        '      ' + svgArrow,
        '    </a>',
        '  </div>',
        '</article>'
      ].join('\n');
    });

    grid.innerHTML = html.join('\n');
  }

  /* SVG helpers — identical look to original hardcoded SVGs */
  function buildRedSvg(label) {
    return [
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="cover-svg">',
      '  <rect width="200" height="200" fill="#0a0a0a"/>',
      '  <circle cx="100" cy="100" r="40" fill="none" stroke="#C41E3A" opacity="0.4"/>',
      '  <text x="100" y="170" text-anchor="middle" fill="#C41E3A" opacity="0.3" letter-spacing="3">' + esc(label) + '</text>',
      '</svg>'
    ].join('');
  }

  function buildGoldSvg(label) {
    return [
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="cover-svg">',
      '  <defs><radialGradient id="rg-gold" cx="50%" cy="50%" r="55%">',
      '    <stop offset="0%" stop-color="#c8b89a" stop-opacity="0.14"/>',
      '    <stop offset="100%" stop-color="#000" stop-opacity="0"/>',
      '  </radialGradient></defs>',
      '  <rect width="200" height="200" fill="#0c0a08"/>',
      '  <rect width="200" height="200" fill="url(#rg-gold)"/>',
      '  <rect x="30" y="30" width="140" height="140" fill="none" stroke="#c8b89a" stroke-width="0.5" opacity="0.25"/>',
      '  <rect x="38" y="38" width="124" height="124" fill="none" stroke="#c8b89a" stroke-width="0.3" opacity="0.15"/>',
      '  <line x1="100" y1="55" x2="100" y2="145" stroke="#c8b89a" stroke-width="0.6" opacity="0.4"/>',
      '  <line x1="55" y1="100" x2="145" y2="100" stroke="#c8b89a" stroke-width="0.6" opacity="0.4"/>',
      '  <line x1="68" y1="68" x2="132" y2="132" stroke="#c8b89a" stroke-width="0.4" opacity="0.2"/>',
      '  <line x1="132" y1="68" x2="68" y2="132" stroke="#c8b89a" stroke-width="0.4" opacity="0.2"/>',
      '  <circle cx="100" cy="100" r="8" fill="none" stroke="#c8b89a" stroke-width="0.8" opacity="0.5"/>',
      '  <circle cx="100" cy="100" r="2" fill="#c8b89a" opacity="0.7"/>',
      '  <text x="100" y="175" text-anchor="middle" font-family="serif" font-size="8" fill="#c8b89a" opacity="0.35" letter-spacing="4">' + esc(label) + '</text>',
      '</svg>'
    ].join('');
  }

  /* ─────────────────────────────────────────────
     10. GENRE FILTER
     ONLY targets .song-card — NEVER .playlist-card
  ───────────────────────────────────────────── */
  function initGenreFilter() {
    var chips     = document.querySelectorAll('.chip');
    var songCards = document.querySelectorAll('.song-card');

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');

        var genre = chip.dataset.genre;

        songCards.forEach(function (card) {
          var match = (genre === 'all' || card.dataset.category === genre);
          if (match) {
            card.classList.remove('hidden');
            card.classList.remove('visible');
            void card.offsetWidth;
            setTimeout(function () { card.classList.add('visible'); }, 30);
          } else {
            card.classList.remove('visible');
            card.classList.add('hidden');
          }
        });
      });
    });
  }

  /* ─────────────────────────────────────────────
     11. PLAYLIST CARD PLAYER TOGGLE
  ───────────────────────────────────────────── */
  function initPlaylistToggles() {
    document.querySelectorAll('.playlist-card .card-play-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cover  = btn.closest('.card-cover');
        var isOpen = cover.classList.contains('player-open');

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
  }

  function setPlaylistIcon(btn, playing) {
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
  }

  /* ─────────────────────────────────────────────
     12. SONG CARD PLAYER TOGGLE
  ───────────────────────────────────────────── */
  function initSongToggles() {
    document.querySelectorAll('.song-card .song-play-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cover  = btn.closest('.song-cover');
        var isOpen = cover.classList.contains('player-open');

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
  }

  function setSongIcon(btn, playing) {
    if (!btn) return;
    btn.innerHTML = playing
      ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l8 4-8 4V4z" fill="currentColor"/></svg>';
  }

  /* ─────────────────────────────────────────────
     13. LAZY IFRAMES — observer
  ───────────────────────────────────────────── */
  function initLazyIframes() {
    if (!('IntersectionObserver' in window)) return;
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
     14. AUTO-THUMBNAIL SYSTEM (Song Cards)
     Priority: data-bg → YouTube HQ → YouTube MQ → SVG
  ───────────────────────────────────────────── */
  function initThumbnails() {
    document.querySelectorAll('.song-thumb').forEach(function (thumb) {
      var customBg = thumb.dataset.bg;
      var ytId     = thumb.dataset.ytId;

      if (customBg) { loadThumbImage(thumb, customBg); return; }

      if (ytId) {
        var hqUrl = 'https://img.youtube.com/vi/' + ytId + '/maxresdefault.jpg';
        var mqUrl = 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg';
        var testHQ = new Image();
        testHQ.onload = function () {
          if (testHQ.naturalWidth > 120) {
            applyThumb(thumb, hqUrl);
          } else {
            loadThumbImage(thumb, mqUrl);
          }
        };
        testHQ.onerror = function () { loadThumbImage(thumb, mqUrl); };
        testHQ.src = hqUrl;
      }
    });
  }

  function loadThumbImage(thumb, url) {
    var img = new Image();
    img.onload = function () { applyThumb(thumb, url); };
    img.src = url;
  }

  function applyThumb(thumb, url) {
    thumb.style.backgroundImage    = 'url("' + url + '")';
    thumb.style.backgroundSize     = 'cover';
    thumb.style.backgroundPosition = 'center';
    thumb.dataset.thumbLoaded = 'true';
  }

  /* ─────────────────────────────────────────────
     15. CUSTOM COVER IMAGE FALLBACK (Playlist Cards)
  ───────────────────────────────────────────── */
  function initCoverFallbacks() {
    document.querySelectorAll('.card-cover-art[data-bg]').forEach(function (el) {
      var src = el.dataset.bg;
      if (!src) return;
      var testImg = new Image();
      testImg.onload = function () {
        el.style.backgroundImage    = 'url("' + src + '")';
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center center';
        var svg = el.querySelector('.cover-svg');
        if (svg) svg.style.display = 'none';
      };
      testImg.onerror = function () { el.setAttribute('data-img-error', 'true'); };
      testImg.src = src;
    });
  }

  /* ─────────────────────────────────────────────
     Card staggered reveal (called after render)
  ───────────────────────────────────────────── */
  function initCardReveals() {
    var songCards     = document.querySelectorAll('.song-card');
    var playlistCards = document.querySelectorAll('.playlist-card');

    function staggerObserve(cards) {
      if (!('IntersectionObserver' in window)) {
        cards.forEach(function (card) { card.classList.add('visible'); });
        return;
      }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var card = entry.target;
          var idx  = Array.prototype.indexOf.call(cards, card);
          setTimeout(function () { card.classList.add('visible'); }, idx * 70);
          obs.unobserve(card);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      cards.forEach(function (card) { obs.observe(card); });
    }

    staggerObserve(songCards);
    staggerObserve(playlistCards);
  }

  /* ─────────────────────────────────────────────
     UTILITY — HTML escape to prevent XSS from JSON
  ───────────────────────────────────────────── */
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ─────────────────────────────────────────────
     16. CURSOR AMBIENT GLOW — desktop only
  ───────────────────────────────────────────── */
  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) {
    var glow = document.createElement('div');
    glow.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:360px', 'height:360px', 'border-radius:50%',
      'background:radial-gradient(circle,rgba(196,30,58,0.04) 0%,transparent 70%)',
      'pointer-events:none', 'z-index:9998',
      'transform:translate(-50%,-50%)', 'transition:opacity 0.5s',
      'opacity:0', 'will-change:transform'
    ].join(';');
    document.body.appendChild(glow);

    var gx = 0, gy = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', function (e) { gx = e.clientX; gy = e.clientY; glow.style.opacity = '1'; }, { passive: true });
    document.addEventListener('mouseleave', function () { glow.style.opacity = '0'; }, { passive: true });

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
