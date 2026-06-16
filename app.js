(function () {
  initHashViews();

  function initHashViews() {
    const views    = Array.from(document.querySelectorAll('.view'));
    const navLinks = Array.from(document.querySelectorAll('#nav a'));
    const cta      = document.getElementById('cta-hello');
    const introRandom = document.getElementById('intro-random');
    const ageCounter  = document.getElementById('age-counter');
    const animWrap    = document.getElementById('anim-wrap');

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
      if (!animWrap) return;
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
    setRandomIntroLine();
    updateAgeCounter();
    setInterval(updateAgeCounter, 250);

    window.addEventListener('hashchange', function () { showView(currentView()); });
    showView(currentView());
  }
})();
