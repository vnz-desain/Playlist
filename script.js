/* ============================================
   MIDNIGHT PLAYLIST — script.js
   ============================================ */

'use strict';

/* ---- NAV SCROLL ---- */
(function initNav() {
  const nav = document.getElementById('nav');
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 40) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---- INTERSECTION OBSERVER — SECTION REVEALS ---- */
(function initReveal() {
  const sections = document.querySelectorAll('.mood-filter, .quote-section, .footer');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(el => obs.observe(el));
})();

/* ---- PLAYLIST CARD REVEAL ---- */
(function initCardReveal() {
  const cards = document.querySelectorAll('.playlist-card');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  cards.forEach(card => obs.observe(card));
})();

/* ---- MOOD FILTER ---- */
(function initMoodFilter() {
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.playlist-card');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      // Update active chip
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const mood = chip.dataset.mood;

      cards.forEach(card => {
        if (mood === 'all' || card.dataset.mood === mood) {
          card.classList.remove('hidden');
          // re-trigger animation
          card.classList.remove('visible');
          void card.offsetWidth;
          setTimeout(() => card.classList.add('visible'), 20);
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
})();

/* ---- CARD PLAYER TOGGLE ---- */
(function initPlayerToggle() {
  const toggleBtns = document.querySelectorAll('.card-play-toggle');

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cover  = btn.closest('.card-cover');
      const player = cover.querySelector('.card-player-wrap');
      const art    = cover.querySelector('.card-cover-art');
      const isOpen = player.classList.contains('active');

      // Close all other players first
      document.querySelectorAll('.card-player-wrap.active').forEach(p => {
        if (p !== player) {
          p.classList.remove('active');
          p.closest('.card-cover').querySelector('.card-play-toggle').classList.remove('playing');
          // pause by resetting src
          const iframe = p.querySelector('iframe');
          if (iframe) {
            iframe.src = iframe.src;
          }
        }
      });

      if (isOpen) {
        player.classList.remove('active');
        btn.classList.remove('playing');
        // stop by resetting src
        const iframe = player.querySelector('iframe');
        if (iframe) {
          iframe.src = iframe.src;
        }
      } else {
        player.classList.add('active');
        btn.classList.add('playing');
      }
    });
  });
})();

/* ---- SMOOTH SCROLL for hero CTA ---- */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

/* ---- LAZY LOAD iframes ---- */
(function initLazyFrames() {
  if ('IntersectionObserver' in window) {
    const iframes = document.querySelectorAll('iframe[loading="lazy"]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const iframe = entry.target;
          if (!iframe.dataset.srcLoaded) {
            iframe.dataset.srcLoaded = 'true';
            // src already set in HTML; just ensure it's loaded
          }
          obs.unobserve(iframe);
        }
      });
    }, { rootMargin: '200px' });

    iframes.forEach(iframe => obs.observe(iframe));
  }
})();

/* ---- CURSOR AMBIENT GLOW (subtle) ---- */
(function initGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip mobile

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 340px; height: 340px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(200,184,154,0.035) 0%, transparent 70%);
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: opacity 0.5s;
    opacity: 0;
  `;
  document.body.appendChild(glow);

  let gx = 0, gy = 0;
  let cx = 0, cy = 0;
  let rafId;

  document.addEventListener('mousemove', e => {
    gx = e.clientX;
    gy = e.clientY;
    glow.style.opacity = '1';
  });

  document.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animateGlow() {
    cx = lerp(cx, gx, 0.1);
    cy = lerp(cy, gy, 0.1);
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    rafId = requestAnimationFrame(animateGlow);
  }

  animateGlow();
})();
