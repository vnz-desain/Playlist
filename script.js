/**
 * M. EVAN ALMUNAWAR — Midnight Playlist
 * script.js — Supabase edition
 *
 * Data source: Supabase REST (via js/supabase.js)
 * Tables: tracks, playlists
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     UTILITY
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

  // Extract YouTube video ID dari berbagai format URL
  function ytId(url) {
    if (!url) return null;
    // Match youtu.be/ID atau v=ID
    var m = url.match(/(?:youtu\.be\/|[?&]v=)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Extract YouTube playlist ID
  function ytListId(url) {
    if (!url) return null;
    var m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }

  /* ─────────────────────────────────────────────
     0. GRAIN
  ───────────────────────────────────────────── */
  if (!document.querySelector('.grain')) {
    var grain = document.createElement('div');
    grain.className = 'grain';
    grain.setAttribute('aria-hidden', 'true');
    document.body.appendChild(grain);
  }

  /* ─────────────────────────────────────────────
     1. NAV SCROLL
  ───────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var scrollTick = false;
  window.addEventListener('scroll', function () {
    if (!scrollTick) {
      requestAnimationFrame(function () {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
        scrollTick = false;
      });
      scrollTick = true;
    }
  }, { passive: true });

  /* ─────────────────────────────────────────────
     2. REVEAL ANIMATIONS
  ───────────────────────────────────────────── */
  function observeReveal() {
    var els = document.querySelectorAll('.reveal-up:not(.observed)');
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
      els.forEach(function (el) { el.classList.add('observed'); obs.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  /* ─────────────────────────────────────────────
     3. HERO ENTRANCE
  ───────────────────────────────────────────── */
  setTimeout(function () {
    document.querySelectorAll('.hero .reveal-up').forEach(function (el) {
      el.classList.add('visible');
    });
  }, 120);

  /* ─────────────────────────────────────────────
     4. SCROLL INDICATOR FADE
  ───────────────────────────────────────────── */
  var scrollInd = document.querySelector('.scroll-indicator');
  if (scrollInd) {
    scrollInd.style.transition = 'opacity 0.4s';
    var fadeDone = false;
    window.addEventListener('scroll', function () {
      if (!fadeDone && window.scrollY > 80) {
        scrollInd.style.opacity = '0';
        fadeDone = true;
      }
    }, { passive: true });
  }

  /* ─────────────────────────────────────────────
     5. SMOOTH ANCHOR SCROLL
  ───────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ─────────────────────────────────────────────
     7. DATA LOADER — fetch dari Supabase
  ───────────────────────────────────────────── */
  Promise.all([
    sbGet('tracks',    'order=sort_order.asc'),
    sbGet('playlists', 'order=sort_order.asc')
  ]).then(function (results) {
    var tracks    = results[0];
    var playlists = results[1];

    renderTracks(tracks);
    renderPlaylists(playlists);
    buildGenreChips(tracks);

    initCardReveals();
    initGenreFilter();
    initPlaylistToggles();
    initSongToggles();
    initThumbnails();
    observeReveal();

  }).catch(function (err) {
    console.error('[Playlist] Supabase error:', err);
    var g = document.getElementById('songs-grid');
    if (g) g.innerHTML = '<p style="color:var(--white-dim);font-family:\'Space Mono\',monospace;font-size:11px;padding:2rem 0">Gagal memuat data: ' + esc(err.message) + '</p>';
    var pg = document.getElementById('playlist-grid');
    if (pg) pg.innerHTML = '';
  });

  /* ─────────────────────────────────────────────
     8. RENDER — TRACK LIST (Spotify-style)
     Layout: # | thumb | title+artist | genre | play
  ───────────────────────────────────────────── */
  function renderTracks(tracks) {
    var grid = document.getElementById('songs-grid');
    if (!grid) return;
    if (!tracks.length) {
      grid.innerHTML = '<p style="color:var(--white-dim);font-family:\'Space Mono\',monospace;font-size:11px;padding:2rem 0">Belum ada tracks.</p>';
      return;
    }

    var svgPlay = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l8 4-8 4V4z" fill="currentColor"/></svg>';

    var header = [
      '<div class="track-list-header">',
      '  <span class="tl-num">#</span>',
      '  <span class="tl-thumb-spacer"></span>',
      '  <span class="tl-info">Judul</span>',
      '  <span class="tl-genre">Genre</span>',
      '  <span class="tl-action"></span>',
      '</div>'
    ].join('');

    var rows = tracks.map(function (track, i) {
      var vid      = ytId(track.link);
      var cat      = (track.genre || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
      var embedSrc = vid ? 'https://www.youtube.com/embed/' + esc(vid) + '?autoplay=1' : '';
      var thumbYt  = vid ? ' data-yt-id="' + esc(vid) + '"' : '';
      var thumbBg  = track.image_url ? ' data-bg="' + esc(track.image_url) + '"' : '';

      return [
        '<div class="track-row song-card" data-category="' + esc(cat) + '">',
        '  <div class="track-row-main">',
        '    <span class="tl-num">',
        '      <span class="tr-number">' + (i + 1) + '</span>',
        '      <span class="tr-play-icon" aria-hidden="true">' + svgPlay + '</span>',
        '    </span>',
        '    <div class="tl-thumb"' + thumbYt + thumbBg + '>',
        '      <div class="tl-thumb-fallback"><svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" fill="#0a1628"/><circle cx="20" cy="18" r="6" fill="none" stroke="#4fc3f7" stroke-width="0.7" opacity="0.4"/><circle cx="20" cy="18" r="1.5" fill="#4fc3f7" opacity="0.5"/></svg></div>',
        '    </div>',
        '    <div class="tl-info">',
        '      <span class="tl-title">' + esc(track.title) + '</span>',
        '      <span class="tl-artist">' + esc(track.artist) + '</span>',
        '    </div>',
        '    <span class="tl-genre"><span class="tl-genre-tag">' + esc(track.genre) + '</span></span>',
        '    <span class="tl-action">',
        '      <button class="tr-toggle-btn" aria-label="Putar ' + esc(track.title) + '">' + svgPlay + '</button>',
        '    </span>',
        '  </div>',
        '  <div class="track-embed-wrap">',
        embedSrc
          ? '    <div class="track-embed-inner"><iframe data-src="' + esc(embedSrc) + '" title="' + esc(track.title) + '" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>'
          : '    <div class="track-embed-inner track-embed-nolink"><p>Tidak ada link YouTube.</p></div>',
        '  </div>',
        '</div>'
      ].join('\n');
    });

    grid.innerHTML = header + rows.join('\n');
  }


    /* ─────────────────────────────────────────────
     9. RENDER — PLAYLIST CARDS
  ───────────────────────────────────────────── */
  function renderPlaylists(playlists) {
    var grid = document.getElementById('playlist-grid');
    if (!grid) return;
    if (!playlists.length) {
      grid.innerHTML = '';
      return;
    }

    var svgPlay  = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 5l6 4-6 4V5z" fill="currentColor"/></svg>';
    var svgArrow = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var html = playlists.map(function (pl, i) {
      var listId   = ytListId(pl.link);
      var embedSrc = listId
        ? 'https://www.youtube.com/embed/videoseries?list=' + listId
        : (pl.link || '');
      var gradId   = 'pg-' + i;
      var featured = (i === 0); // row pertama featured (wide)
      var featClass = featured ? ' card-featured' : '';
      var coverBg   = pl.image_url ? ' data-bg="' + esc(pl.image_url) + '"' : '';

      return [
        '<article class="playlist-card' + featClass + '">',
        '  <div class="card-cover">',
        '    <div class="card-cover-art"' + coverBg + '>',
        '      ' + buildNavySvg(pl.genre || '', gradId),
        '    </div>',
        '    <div class="card-player-wrap">',
        embedSrc
          ? '      <iframe src="' + esc(embedSrc) + '" title="' + esc(pl.title) + '" allowfullscreen loading="lazy"></iframe>'
          : '',
        '    </div>',
        '    <button class="card-play-toggle" aria-label="Show player">' + svgPlay + '</button>',
        '  </div>',
        '  <div class="card-body">',
        '    <div class="card-mood-tag">' + esc(pl.genre) + '</div>',
        '    <h2 class="card-title">' + esc(pl.title) + '</h2>',
        '    <p class="card-desc">' + esc(pl.body) + '</p>',
        pl.link
          ? '    <a href="' + esc(pl.link) + '" target="_blank" rel="noopener" class="card-btn"><span>Open Playlist</span>' + svgArrow + '</a>'
          : '',
        '  </div>',
        '</article>'
      ].join('\n');
    });

    grid.innerHTML = html.join('\n');
  }

  function buildNavySvg(label, gradId) {
    return [
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" class="cover-svg">',
      '  <defs><radialGradient id="' + gradId + '" cx="50%" cy="50%" r="55%">',
      '    <stop offset="0%" stop-color="#4fc3f7" stop-opacity="0.12"/>',
      '    <stop offset="100%" stop-color="#050d1a" stop-opacity="0"/>',
      '  </radialGradient></defs>',
      '  <rect width="200" height="200" fill="#0a1628"/>',
      '  <rect width="200" height="200" fill="url(#' + gradId + ')"/>',
      '  <rect x="30" y="30" width="140" height="140" fill="none" stroke="#4fc3f7" stroke-width="0.5" opacity="0.2"/>',
      '  <rect x="38" y="38" width="124" height="124" fill="none" stroke="#4fc3f7" stroke-width="0.3" opacity="0.1"/>',
      '  <line x1="100" y1="55" x2="100" y2="145" stroke="#4fc3f7" stroke-width="0.6" opacity="0.3"/>',
      '  <line x1="55" y1="100" x2="145" y2="100" stroke="#4fc3f7" stroke-width="0.6" opacity="0.3"/>',
      '  <circle cx="100" cy="100" r="8" fill="none" stroke="#4fc3f7" stroke-width="0.8" opacity="0.4"/>',
      '  <circle cx="100" cy="100" r="2" fill="#4fc3f7" opacity="0.6"/>',
      '  <text x="100" y="175" text-anchor="middle" font-family="serif" font-size="8" fill="#4fc3f7" opacity="0.3" letter-spacing="4">' + esc(label.toUpperCase()) + '</text>',
      '</svg>'
    ].join('');
  }

  /* ─────────────────────────────────────────────
     BUILD GENRE CHIPS dari data tracks
  ───────────────────────────────────────────── */
  function buildGenreChips(tracks) {
    var chipsWrap = document.querySelector('.mood-chips');
    if (!chipsWrap) return;

    // Kumpulkan genre unik
    var seen = {};
    var genres = [];
    tracks.forEach(function (t) {
      var g = (t.genre || '').trim();
      var key = g.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (g && !seen[key]) { seen[key] = true; genres.push({ label: g, key: key }); }
    });

    // Rebuild chips: All + per-genre
    chipsWrap.innerHTML = '<button class="chip active" data-genre="all">All</button>' +
      genres.map(function (g) {
        return '<button class="chip" data-genre="' + esc(g.key) + '">' + esc(g.label) + '</button>';
      }).join('');
  }

  /* ─────────────────────────────────────────────
     10. GENRE FILTER
  ───────────────────────────────────────────── */
  function initGenreFilter() {
    var chipsWrap = document.querySelector('.mood-chips');
    if (!chipsWrap) return;
    chipsWrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      chipsWrap.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
      chip.classList.add('active');
      var genre = chip.dataset.genre;
      document.querySelectorAll('.song-card').forEach(function (card) {
        var match = genre === 'all' || card.dataset.category === genre;
        if (match) {
          card.classList.remove('hidden');
          void card.offsetWidth;
          setTimeout(function () { card.classList.add('visible'); }, 30);
        } else {
          card.classList.remove('visible');
          card.classList.add('hidden');
        }
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
        document.querySelectorAll('.playlist-card .card-cover.player-open').forEach(function (c) {
          if (c !== cover) {
            c.classList.remove('player-open');
            var ob = c.querySelector('.card-play-toggle');
            if (ob) { ob.setAttribute('aria-label', 'Show player'); setPlaylistIcon(ob, false); }
            var iframe = c.querySelector('iframe');
            if (iframe) iframe.src = iframe.src;
          }
        });
        cover.classList.toggle('player-open', !isOpen);
        btn.setAttribute('aria-label', isOpen ? 'Show player' : 'Hide player');
        setPlaylistIcon(btn, !isOpen);
        if (isOpen) { var iframe = cover.querySelector('iframe'); if (iframe) iframe.src = iframe.src; }
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
     12. TRACK ROW TOGGLE — inline YT embed expand
  ───────────────────────────────────────────── */
  function initSongToggles() {
    var svgPlay  = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l8 4-8 4V4z" fill="currentColor"/></svg>';
    var svgPause = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3" y="3" width="4" height="10" rx="1" fill="currentColor"/><rect x="9" y="3" width="4" height="10" rx="1" fill="currentColor"/></svg>';

    function closeRow(row) {
      row.classList.remove('track-open');
      var btn = row.querySelector('.tr-toggle-btn');
      if (btn) btn.innerHTML = svgPlay;
      var numEl = row.querySelector('.tr-number');
      if (numEl) numEl.style.display = '';
      var playEl = row.querySelector('.tr-play-icon');
      if (playEl) playEl.style.opacity = '';
      // Stop iframe: reset src
      var iframe = row.querySelector('.track-embed-wrap iframe');
      if (iframe && iframe.src) { iframe.src = ''; }
    }

    function openRow(row) {
      row.classList.add('track-open');
      var btn = row.querySelector('.tr-toggle-btn');
      if (btn) btn.innerHTML = svgPause;
      var numEl = row.querySelector('.tr-number');
      if (numEl) numEl.style.display = 'none';
      var playEl = row.querySelector('.tr-play-icon');
      if (playEl) playEl.style.opacity = '1';
      // Lazy-load iframe
      var iframe = row.querySelector('.track-embed-wrap iframe');
      if (iframe && iframe.dataset.src && !iframe.src) {
        iframe.src = iframe.dataset.src;
      }
    }

    // Click on whole row (but not on external links)
    document.querySelectorAll('.track-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        // Ignore clicks on anchor tags
        if (e.target.closest('a')) return;
        var isOpen = row.classList.contains('track-open');
        // Close all others
        document.querySelectorAll('.track-row.track-open').forEach(function (r) {
          if (r !== row) closeRow(r);
        });
        if (isOpen) closeRow(row);
        else openRow(row);
      });
    });
  }

  function setSongIcon() {} // kept for compat (unused now)


    /* ─────────────────────────────────────────────
     14. THUMBNAILS — YouTube HQ → MQ → SVG
  ───────────────────────────────────────────── */
  function initThumbnails() {
    // Track thumbnails — inject <img> langsung, pakai onerror fallback MQ
    document.querySelectorAll('.tl-thumb').forEach(function (thumb) {
      var fallback = thumb.querySelector('.tl-thumb-fallback');
      var ytid = thumb.dataset.ytId;
      var customBg = thumb.dataset.bg;
      var imgEl = document.createElement('img');
      imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:4px;position:absolute;inset:0';

      if (customBg) {
        imgEl.src = customBg;
      } else if (ytid) {
        var mq = 'https://img.youtube.com/vi/' + ytid + '/mqdefault.jpg';
        var hq = 'https://img.youtube.com/vi/' + ytid + '/maxresdefault.jpg';
        imgEl.src = hq;
        imgEl.onerror = function () { imgEl.src = mq; };
      } else {
        return; // tidak ada sumber thumbnail, biarkan SVG fallback
      }

      imgEl.onload = function () {
        // HQ YouTube returns 120px wide placeholder if not available
        if (ytid && imgEl.naturalWidth <= 120) {
          imgEl.src = 'https://img.youtube.com/vi/' + ytid + '/mqdefault.jpg';
          return;
        }
        thumb.style.position = 'relative';
        thumb.appendChild(imgEl);
        if (fallback) fallback.style.display = 'none';
      };
    });

    // Playlist card cover art
    document.querySelectorAll('.card-cover-art[data-bg]').forEach(function (el) {
      var src = el.dataset.bg;
      if (!src) return;
      var img = new Image();
      img.onload = function () {
        el.style.backgroundImage = 'url("' + src + '")';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        var svg = el.querySelector('.cover-svg');
        if (svg) svg.style.display = 'none';
      };
      img.src = src;
    });
  }

  /* ─────────────────────────────────────────────
     CARD STAGGER REVEAL
  ───────────────────────────────────────────── */
  function initCardReveals() {
    function stagger(cards) {
      if (!('IntersectionObserver' in window)) {
        cards.forEach(function (c) { c.classList.add('visible'); });
        return;
      }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var idx = Array.prototype.indexOf.call(cards, entry.target);
          setTimeout(function () { entry.target.classList.add('visible'); }, idx * 60);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      cards.forEach(function (c) { obs.observe(c); });
    }
    stagger(document.querySelectorAll('.song-card'));
    stagger(document.querySelectorAll('.playlist-card'));
  }

  /* ─────────────────────────────────────────────
     16. CURSOR GLOW (desktop only)
  ───────────────────────────────────────────── */
  if (window.matchMedia && !window.matchMedia('(pointer: coarse)').matches) {
    var glow = document.createElement('div');
    glow.style.cssText = [
      'position:fixed','top:0','left:0',
      'width:360px','height:360px','border-radius:50%',
      'background:radial-gradient(circle,rgba(79,195,247,0.05) 0%,transparent 70%)',
      'pointer-events:none','z-index:9998',
      'transform:translate(-50%,-50%)','transition:opacity 0.5s',
      'opacity:0','will-change:transform'
    ].join(';');
    document.body.appendChild(glow);
    var gx = 0, gy = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', function (e) { gx = e.clientX; gy = e.clientY; glow.style.opacity = '1'; }, { passive: true });
    document.addEventListener('mouseleave', function () { glow.style.opacity = '0'; }, { passive: true });
    (function loop() {
      cx += (gx - cx) * 0.1; cy += (gy - cy) * 0.1;
      glow.style.left = cx + 'px'; glow.style.top = cy + 'px';
      requestAnimationFrame(loop);
    })();
  }

})();
