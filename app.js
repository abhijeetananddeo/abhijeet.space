(function () {
  initHashViews();

  function initHashViews() {
    const views = Array.from(document.querySelectorAll('.view'));
    const navLinks = Array.from(document.querySelectorAll('#nav a'));
    const cta = document.getElementById('cta-hello');
    const ageCounter = document.getElementById('age-counter');
    const canvas = document.getElementById('anim');

    if (!views.length) return;

    const EMAIL = 'hi@abhijeet.space';
    let copyTimer = null;
    let ctaHovered = false;
    let wDefault = 0;
    let wEmail = 0;
    let wCopied = 0;

    const ctx = canvas ? canvas.getContext('2d') : null;
    let W = 0;
    let H = 0;
    let raf = null;
    let tick = 0;
    let mx = 0;
    let my = 0;
    let tmx = 0;
    let tmy = 0;
    const particles = [];

    const PALETTE = [
      [56, 88, 64],
      [88, 122, 92],
      [120, 148, 108],
      [156, 174, 140],
      [96, 124, 112],
      [188, 168, 122],
      [168, 116, 96],
    ];
    const N_PARTICLES = 240;

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function spawnParticle(p) {
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p.vx = 0;
      p.vy = 0;
      p.r = rand(0.7, 2.2);
      p.a = rand(0.45, 0.85);
      p.c = c;
      p.life = 0;
      p.maxLife = rand(280, 720);
      return p;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < N_PARTICLES; i++) {
        const p = spawnParticle({});
        p.life = Math.random() * p.maxLife;
        particles.push(p);
      }
    }

    function syncSize() {
      if (!canvas) return;

      const r = canvas.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);

      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        const fresh = !W || !H;
        W = canvas.width = w;
        H = canvas.height = h;
        if (fresh) initParticles();
      }
    }

    function flowAngle(x, y, t) {
      const s = 0.0028;
      const a = Math.sin(x * s + t * 0.00022) + Math.cos(y * s * 1.3 + t * 0.00028);
      const b = Math.sin((x + y) * s * 0.7 + t * 0.00018);
      return (a + b) * Math.PI;
    }

    function frame() {
      if (!ctx) return;

      syncSize();
      if (!W || !H) {
        raf = requestAnimationFrame(frame);
        return;
      }

      mx += (tmx - mx) * 0.04;
      my += (tmy - my) * 0.04;

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const ang = flowAngle(p.x - mx * 0.4, p.y - my * 0.4, tick);
        p.vx += Math.cos(ang) * 0.06;
        p.vy += Math.sin(ang) * 0.06;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;
        if (p.life > p.maxLife) spawnParticle(p);

        const fadeIn = Math.min(1, p.life / 60);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 60);
        const alpha = p.a * fadeIn * fadeOut;

        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      tick++;
      raf = requestAnimationFrame(frame);
    }

    function startAnim() {
      if (ctx && !raf) raf = requestAnimationFrame(frame);
    }

    function pauseAnim() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (ctx && W && H) ctx.clearRect(0, 0, W, H);
    }

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
            requestAnimationFrame(function () {
              v.classList.add('active');
            });
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

      if (name === 'index') startAnim();
      else pauseAnim();
    }

    function initCTASizes() {
      if (!cta) return;

      const pad = 32;
      const defEl = cta.querySelector('.cta-s-default');
      const emailEl = cta.querySelector('.cta-s-email');
      const copiedEl = cta.querySelector('.cta-s-copied');

      wDefault = defEl.offsetWidth + pad;
      wEmail = emailEl.offsetWidth + pad;
      wCopied = copiedEl.offsetWidth + pad;

      cta.style.transition = 'none';
      cta.style.width = wDefault + 'px';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cta.style.transition = '';
        });
      });
    }

    function copyEmail() {
      try {
        const ta = document.createElement('textarea');
        ta.value = EMAIL;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, EMAIL.length);
        document.execCommand('copy');
        ta.remove();
      } catch (_) {}

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(EMAIL).catch(function () {});
      }
    }

    function initCTA() {
      if (!cta) return;

      const ctaSr = cta.querySelector('.cta-sr');

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(initCTASizes);
      } else {
        initCTASizes();
      }

      cta.addEventListener('mouseenter', function () {
        ctaHovered = true;
        if (!wDefault) initCTASizes();
        if (cta.classList.contains('is-copied')) return;
        cta.classList.add('is-hovered');
        cta.style.width = wEmail + 'px';
      });

      cta.addEventListener('mouseleave', function () {
        ctaHovered = false;
        if (cta.classList.contains('is-copied')) return;
        cta.classList.remove('is-hovered');
        cta.style.width = wDefault + 'px';
      });

      cta.addEventListener('click', function () {
        copyEmail();
        cta.classList.remove('is-hovered');
        cta.classList.add('is-copied');
        cta.style.width = wCopied + 'px';
        ctaSr.textContent = 'Copied';

        if (copyTimer) clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          cta.classList.remove('is-copied');
          ctaSr.textContent = '';

          if (ctaHovered) {
            cta.classList.add('is-hovered');
            cta.style.width = wEmail + 'px';
          } else {
            cta.style.width = wDefault + 'px';
          }
        }, 2000);
      });
    }

    function ageAsDecimal(now) {
      const birthYear = 2002;
      const birthMonth = 9;
      const birthDay = 17;
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

    initCTA();
    updateAgeCounter();
    setInterval(updateAgeCounter, 250);

    document.addEventListener('mousemove', function (e) {
      tmx = (e.clientX / window.innerWidth - 0.5) * 60;
      tmy = (e.clientY / window.innerHeight - 0.5) * 60;
    });

    window.addEventListener('resize', syncSize);
    window.addEventListener('hashchange', function () {
      showView(currentView());
    });

    showView(currentView());
  }
})();
