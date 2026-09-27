(function () {
  initHashViews();

  function initHashViews() {
    const views    = Array.from(document.querySelectorAll('.view'));
    const navLinks = Array.from(document.querySelectorAll('#nav a'));
    const cta      = document.getElementById('cta-hello');
    const introRandom = document.getElementById('intro-random');
    const ageCounter  = document.getElementById('age-counter');
    const animWrap    = document.getElementById('anim-wrap');
    const birdCount   = document.getElementById('bird-count');
    const figHint     = document.querySelector('.fig-hint');

    if (!views.length) return;

    const EMAIL = 'hi@abhijeet.space';
    let copyTimer  = null;
    let ctaHovered = false;
    let wDefault = 0, wEmail = 0, wCopied = 0;
    let murApi = null;
    const introEl    = document.querySelector('.intro');
    const introP1    = introEl && introEl.querySelector('p:first-child');
    const introBtn   = introEl && introEl.querySelector('.intro-expand');

    // ── Murmuration animation ────────────────────────────────────
    function startAnim() {
      // Phones get the quiet version: no flock, just the words
      if (!animWrap || isMobile()) return;
      if (!murApi) {
        murApi = Murmuration.init(animWrap, {
          ink:         '#0c0c0c',
          accent:      '#587a5c',
          green:       0.14,
          density:     0.9,
          speed:       1,
          interactive: true,
        });
      }
      updateBirdCount();
    }

    // The caption quotes the real flock size, which depends on the screen
    function updateBirdCount() {
      if (murApi && birdCount) birdCount.textContent = murApi.count();
    }

    function pauseAnim() {
      if (murApi) {
        murApi.destroy();
        murApi = null;
      }
    }

    // ── Intro clamp / expand (mobile) ────────────────────────────
    function isMobile() { return window.matchMedia('(max-width: 720px)').matches; }

    function clampIntro() {
      if (!introEl || !introP1) return;
      const lineH = parseFloat(getComputedStyle(introP1).lineHeight) || 22;
      introEl.classList.remove('is-expanded');
      introEl.classList.add('is-clamped');
      introEl.style.setProperty('--intro-p1-h', (lineH * 2) + 'px');
      if (introBtn) introBtn.setAttribute('aria-expanded', 'false');
    }

    function unclampIntro() {
      if (!introEl || !introP1) return;
      introEl.classList.remove('is-clamped', 'is-expanded');
      introEl.style.removeProperty('--intro-p1-h');
    }

    function expandIntro() {
      if (!introEl || !introP1) return;
      const full = introP1.scrollHeight + 'px';
      introEl.classList.add('is-expanded');
      introEl.classList.remove('is-clamped');
      introEl.style.setProperty('--intro-p1-h', full);
      if (introBtn) introBtn.setAttribute('aria-expanded', 'true');
    }

    if (introBtn) {
      introBtn.addEventListener('click', function () {
        if (introEl.classList.contains('is-expanded')) {
          clampIntro();
        } else {
          expandIntro();
        }
      });
    }

    // ── Routing ──────────────────────────────────────────────────
    function currentView() {
      const h = (location.hash || '').replace(/^#\/?/, '');
      if (h === 'work') return 'work';
      if (h === 'find') return 'find';
      return 'index';
    }

    function showView(name) {
      views.forEach(function (v) {
        const active = v.dataset.view === name;
        if (active) {
          v.removeAttribute('hidden');
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { v.classList.add('active'); });
          });
        } else {
          v.classList.remove('active');
          setTimeout(function () {
            if (!v.classList.contains('active')) v.setAttribute('hidden', '');
          }, 600);
        }
      });

      navLinks.forEach(function (a) {
        a.classList.toggle('active', a.dataset.view === name);
      });

      document.body.dataset.view = name;
      window.scrollTo({ top: 0, behavior: 'auto' });
      // Re-sync scroll-driven bits (jump label, progress) once the new
      // view has laid out
      requestAnimationFrame(function () {
        window.dispatchEvent(new Event('scroll'));
      });

      if (name === 'index') {
        startAnim();
        unclampIntro();
      } else {
        pauseAnim();
        if (isMobile()) clampIntro();
      }
    }

    // ── CTA ──────────────────────────────────────────────────────
    function initCTASizes() {
      if (!cta) return;
      const pad = 32;
      wDefault = cta.querySelector('.cta-s-default').offsetWidth + pad;
      wEmail   = cta.querySelector('.cta-s-email').offsetWidth   + pad;
      wCopied  = cta.querySelector('.cta-s-copied').offsetWidth  + pad;
      cta.style.transition = 'none';
      cta.style.width = wDefault + 'px';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { cta.style.transition = ''; });
      });
    }

    function copyEmail() {
      try {
        const ta = document.createElement('textarea');
        ta.value = EMAIL; ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        document.body.appendChild(ta); ta.select();
        ta.setSelectionRange(0, EMAIL.length);
        document.execCommand('copy'); ta.remove();
      } catch (_) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).catch(function () {});
      }
    }

    function initCTA() {
      if (!cta) return;
      const ctaSr = cta.querySelector('.cta-sr');

      if (document.fonts && document.fonts.ready) document.fonts.ready.then(initCTASizes);
      else initCTASizes();

      function isTouch() { return window.matchMedia('(hover: none)').matches; }

      // Desktop: hover expands / collapses
      cta.addEventListener('mouseenter', function () {
        if (isTouch()) return;
        ctaHovered = true;
        if (!wDefault) initCTASizes();
        if (cta.classList.contains('is-copied')) return;
        cta.classList.add('is-hovered');
        cta.style.width = wEmail + 'px';
      });

      cta.addEventListener('mouseleave', function () {
        if (isTouch()) return;
        ctaHovered = false;
        if (cta.classList.contains('is-copied')) return;
        cta.classList.remove('is-hovered');
        cta.style.width = wDefault + 'px';
      });

      function doCopy() {
        copyEmail();
        cta.classList.remove('is-hovered');
        cta.classList.add('is-copied');
        cta.style.width = wCopied + 'px';
        ctaSr.textContent = 'Copied';
        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          cta.classList.remove('is-copied');
          ctaSr.textContent = '';
          if (!isTouch() && ctaHovered) {
            cta.classList.add('is-hovered');
            cta.style.width = wEmail + 'px';
          } else {
            cta.style.width = wDefault + 'px';
          }
        }, 2000);
      }

      cta.addEventListener('click', function () {
        if (cta.classList.contains('is-copied')) return;

        // Mobile: first tap expands, second tap copies
        if (isTouch() && !cta.classList.contains('is-hovered')) {
          if (!wDefault) initCTASizes();
          cta.classList.add('is-hovered');
          cta.style.width = wEmail + 'px';
          return;
        }

        doCopy();
      });

      // Mobile: tap outside collapses the expanded state
      document.addEventListener('click', function (e) {
        if (!isTouch()) return;
        if (!cta.contains(e.target) && cta.classList.contains('is-hovered')) {
          cta.classList.remove('is-hovered');
          cta.style.width = wDefault + 'px';
        }
      });
    }

    // ── Work: jump between the beginning and now ─────────────────
    function initWorkJump() {
      const btn   = document.getElementById('work-jump');
      const now   = document.getElementById('work-now');
      const start = document.getElementById('work-start');
      if (!btn || !now || !start) return;

      const label = btn.querySelector('.work-jump-label');

      function atNow() { return btn.classList.contains('is-at-now'); }

      btn.addEventListener('click', function () {
        const target = atNow() ? start : now;
        target.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      });

      // Once the present is on screen, the button offers the way back
      function setAtNow(visible) {
        btn.classList.toggle('is-at-now', visible);
        label.textContent = visible ? 'start' : 'now';
        btn.setAttribute('aria-label', visible
          ? 'Back to the beginning'
          : 'Skip to what I do now');
      }

      const head = document.querySelector('.work-head');
      const progressLine = document.querySelector('.work-head .line');
      const trail = document.querySelector('.trail');

      // Pinned = the marker just above the header has scrolled out of view.
      // Measuring the header itself is unreliable on iOS Safari.
      const sentinel = document.querySelector('.work-head-sentinel');
      if (head && sentinel && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          const e = entries[0];
          head.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < 0);
        }).observe(sentinel);
      }

      function syncJump() {
        // The rule in the sticky header fills as you read down the trail
        if (progressLine && trail) {
          const t = trail.getBoundingClientRect();
          const travel = t.height - window.innerHeight * 0.5;
          const p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - t.top) / Math.max(1, travel)));
          progressLine.style.setProperty('--p', p.toFixed(4));
        }
        // "At now" only while the last entry is up top, or the page can't
        // scroll further. Any scroll back up offers the jump down again.
        const r = now.getBoundingClientRect();
        const doc = document.documentElement;
        const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;
        setAtNow(atBottom || r.top <= window.innerHeight * 0.35);
      }

      window.addEventListener('scroll', syncJump, { passive: true });
      window.addEventListener('resize', syncJump);
      syncJump();
    }

    function prefersReducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ── FDE definition: keep the card inside the viewport ──────────
    function initAbbr() {
      document.querySelectorAll('.abbr-wrap').forEach(function (wrap) {
        const tip = wrap.querySelector('.abbr-tooltip');
        if (!tip) return;
        function place() {
          const gutter = 12;
          const w = wrap.getBoundingClientRect();
          const half = tip.offsetWidth / 2;
          const centre = w.left + w.width / 2;
          const min = gutter + half, max = window.innerWidth - gutter - half;
          const shift = Math.min(max, Math.max(min, centre)) - centre;
          tip.style.setProperty('--tip-shift', shift + 'px');
        }
        wrap.addEventListener('mouseenter', place);
        wrap.addEventListener('focusin', place);
        wrap.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') document.activeElement.blur();
        });
      });
    }

    // ── Work: entries rise in as they scroll into view ───────────
    function initTrailReveal() {
      const items = document.querySelectorAll('.trail li');
      if (!items.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
      document.documentElement.classList.add('has-trail-reveal');
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      items.forEach(function (li) { io.observe(li); });
    }

    // ── Intro random line ────────────────────────────────────────
    function setRandomIntroLine() {
      if (!introRandom) return;
      const lines = [
        "My mom said the computer would ruin my future. The computer now pays rent. We don't discuss this.",
        "My mom can explain my sister's job in one word. Mine takes her a pause, a sigh, and the word 'laptop'.",
        "This is not my LinkedIn. That one has the boring version of me. He uses words like 'synergy'.",
      ];
      introRandom.textContent = lines[Math.floor(Math.random() * lines.length)];
    }

    // ── Age counter ──────────────────────────────────────────────
    function ageAsDecimal(now) {
      const birthYear = 2002, birthMonth = 9, birthDay = 17;
      let years = now.getFullYear() - birthYear;
      let lastBirthday = new Date(now.getFullYear(), birthMonth, birthDay);
      if (now < lastBirthday) {
        years -= 1;
        lastBirthday = new Date(now.getFullYear() - 1, birthMonth, birthDay);
      }
      const nextBirthday = new Date(lastBirthday.getFullYear() + 1, birthMonth, birthDay);
      return years + ((now - lastBirthday) / (nextBirthday - lastBirthday));
    }

    function updateAgeCounter() {
      if (ageCounter) ageCounter.textContent = ageAsDecimal(new Date()).toFixed(8);
    }

    // ── Init ─────────────────────────────────────────────────────
    initCTA();
    initWorkJump();
    initAbbr();
    initTrailReveal();
    setRandomIntroLine();
    updateAgeCounter();
    setInterval(updateAgeCounter, 250);

    if (figHint && window.matchMedia('(hover: none)').matches) {
      figHint.textContent = 'Drag through it.';
    }
    // Crossing the phone breakpoint starts or stops the flock
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (currentView() !== 'index') return;
        if (isMobile()) pauseAnim();
        else startAnim();
      }, 250);
    });

    window.addEventListener('hashchange', function () { showView(currentView()); });
    showView(currentView());
  }
})();
