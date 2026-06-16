/*!
 * Murmuration — a minimal flocking-boids banner animation.
 * Dependency-free. ~6KB. Drop-in for any website.
 *
 * USAGE
 *   <div data-murmuration style="width:100%;height:340px"></div>
 *   <script src="murmuration.js"></script>
 *
 * Every element with a [data-murmuration] attribute is auto-initialised on load.
 * Customise per-element with data-* attributes (all optional):
 *   data-ink="#141414"     base stroke colour (the "birds")
 *   data-accent="#1f9e63"  accent colour for a few highlighted birds
 *   data-green="0.12"      fraction (0–1) of birds drawn in the accent colour
 *   data-density="1"       flock-size multiplier (0.4–2)
 *   data-speed="1"         motion-speed multiplier (0.3–2)
 *   data-interactive="true" scatter the flock away from the cursor
 *   data-size="1"          bird-size multiplier
 *
 * Or initialise manually:
 *   Murmuration.init(element, { accent:'#1f9e63', density:1.2 });
 */
(function (global) {
  'use strict';

  const DEFAULTS = {
    ink: '#141414',
    accent: '#1f9e63',
    green: 0.12,
    density: 1,
    speed: 1,
    interactive: true,
    size: 1,
  };

  function hexA(hex, a) {
    let v = String(hex).trim().replace('#', '');
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    const n = parseInt(v, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function readOpts(el) {
    const d = el.dataset, o = Object.assign({}, DEFAULTS);
    if (d.ink) o.ink = d.ink;
    if (d.accent) o.accent = d.accent;
    if (d.green != null && d.green !== '') o.green = parseFloat(d.green);
    if (d.density) o.density = parseFloat(d.density);
    if (d.speed) o.speed = parseFloat(d.speed);
    if (d.size) o.size = parseFloat(d.size);
    if (d.interactive != null && d.interactive !== '') o.interactive = d.interactive !== 'false';
    return o;
  }

  function init(host, options) {
    if (!host) return null;
    if (host.__murmuration) return host.__murmuration; // already initialised
    const opts = Object.assign(readOpts(host), options || {});

    // ensure the host can position the canvas
    const cs = getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    host.style.overflow = host.style.overflow || 'hidden';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const st = { w: 0, h: 0, mx: -1e4, my: -1e4, mIn: false, birds: [] };
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      st.w = Math.max(1, r.width);
      st.h = Math.max(1, r.height);
      canvas.width = Math.round(st.w * dpr);
      canvas.height = Math.round(st.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function count() {
      return Math.min(280, Math.max(20, Math.round((st.w * st.h / 11000) * opts.density)));
    }

    function seed() {
      const n = count(), birds = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        birds.push({
          x: Math.random() * st.w,
          y: Math.random() * st.h,
          vx: Math.cos(a), vy: Math.sin(a),
          green: Math.random() < opts.green,
        });
      }
      st.birds = birds;
    }

    function onMove(e) {
      const r = host.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      st.mx = p.clientX - r.left; st.my = p.clientY - r.top; st.mIn = true;
    }
    function onLeave() { st.mIn = false; st.mx = -1e4; st.my = -1e4; }
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);

    function step(t) {
      const W = st.w, H = st.h, sp = opts.speed, P = st.birds;
      const maxS = 1.7 * sp, perc = 44, perc2 = perc * perc;
      for (let i = 0; i < P.length; i++) {
        const b = P[i];
        let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, cnt = 0;
        for (let j = 0; j < P.length; j++) {
          if (i === j) continue;
          const o = P[j], dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < perc2) {
            ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; cnt++;
            if (d2 < 256) { const d = Math.sqrt(d2) + 0.01; sx -= dx / d; sy -= dy / d; }
          }
        }
        if (cnt) {
          ax /= cnt; ay /= cnt; cx = cx / cnt - b.x; cy = cy / cnt - b.y;
          b.vx += ax * 0.045 + cx * 0.0009 + sx * 0.05;
          b.vy += ay * 0.045 + cy * 0.0009 + sy * 0.05;
        }
        b.vx += Math.cos(t * 0.0002 + b.y * 0.01) * 0.01;
        b.vy += Math.sin(t * 0.0002 + b.x * 0.01) * 0.01;
        if (opts.interactive && st.mIn) {
          const dx = b.x - st.mx, dy = b.y - st.my, d2 = dx * dx + dy * dy, R = 130;
          if (d2 < R * R) { const d = Math.sqrt(d2) + 0.01, f = (1 - d / R) * 0.9; b.vx += (dx / d) * f; b.vy += (dy / d) * f; }
        }
        const m = 60;
        if (b.x < m) b.vx += (m - b.x) * 0.004; else if (b.x > W - m) b.vx -= (b.x - (W - m)) * 0.004;
        if (b.y < m) b.vy += (m - b.y) * 0.004; else if (b.y > H - m) b.vy -= (b.y - (H - m)) * 0.004;
        const spd = Math.hypot(b.vx, b.vy) || 1, cl = Math.min(maxS, Math.max(0.5 * sp, spd));
        b.vx = (b.vx / spd) * cl; b.vy = (b.vy / spd) * cl;
        b.x += b.vx; b.y += b.vy;
      }
    }

    function draw() {
      const ds = opts.size;
      ctx.clearRect(0, 0, st.w, st.h);
      for (const b of st.birds) {
        const c = b.green ? opts.accent : opts.ink;
        const a = Math.atan2(b.vy, b.vx), L = 6 * ds;
        ctx.strokeStyle = hexA(c, b.green ? 0.85 : 0.55);
        ctx.lineWidth = 1.1 * ds; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - Math.cos(a) * L, b.y - Math.sin(a) * L);
        ctx.lineTo(b.x + Math.cos(a) * (L * 0.35), b.y + Math.sin(a) * (L * 0.35));
        ctx.stroke();
      }
    }

    let raf;
    function loop(now) { step(now); draw(); raf = requestAnimationFrame(loop); }

    resize();
    draw();

    let rt;
    function onResize() { clearTimeout(rt); rt = setTimeout(resize, 120); }
    global.addEventListener('resize', onResize);
    if ('ResizeObserver' in global) { try { new ResizeObserver(onResize).observe(host); } catch (e) {} }

    if (!reduce) raf = requestAnimationFrame(loop); // honour reduced-motion: show one static frame

    const api = {
      el: host,
      options: opts,
      set(next) { Object.assign(opts, next); seed(); if (reduce) draw(); },
      destroy() {
        cancelAnimationFrame(raf);
        global.removeEventListener('resize', onResize);
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerleave', onLeave);
        canvas.remove();
        host.__murmuration = null;
      },
    };
    host.__murmuration = api;
    return api;
  }

  function auto() {
    const els = document.querySelectorAll('[data-murmuration]');
    for (let i = 0; i < els.length; i++) init(els[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();

  global.Murmuration = { init: init, auto: auto };
})(window);
