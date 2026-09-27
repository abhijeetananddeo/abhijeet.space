/*!
 * Murmuration — a minimal flocking-boids banner animation.
 * Dependency-free. ~8KB. Drop-in for any website.
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

    const st = { w: 1, h: 1, mx: -1e4, my: -1e4, mIn: false, birds: [] };
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const pw = st.w, ph = st.h;
      st.w = Math.max(1, r.width);
      st.h = Math.max(1, r.height);
      canvas.width = Math.round(st.w * dpr);
      canvas.height = Math.round(st.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!st.birds.length) { seed(); return; }
      // Keep the flock mid-flight: stretch it to the new box and top up / trim
      const sx = st.w / pw, sy = st.h / ph;
      for (const b of st.birds) { b.x *= sx; b.y *= sy; }
      const n = count();
      while (st.birds.length > n) st.birds.pop();
      while (st.birds.length < n) {
        const o = st.birds[Math.floor(Math.random() * st.birds.length)];
        st.birds.push(bird(o.x + (Math.random() - 0.5) * 20, o.y + (Math.random() - 0.5) * 20, Math.atan2(o.vy, o.vx)));
      }
      if (reduce) draw();
    }

    // Enough birds to read as a murmuration, not scattered dashes
    function count() {
      return Math.min(520, Math.max(60, Math.round((st.w * st.h / 2600) * opts.density)));
    }

    function bird(x, y, heading) {
      const a = heading + (Math.random() - 0.5) * 0.6;
      return { x: x, y: y, vx: Math.cos(a), vy: Math.sin(a), green: Math.random() < opts.green };
    }

    // Start as a few loose flocks already heading somewhere, so the first
    // frame looks like birds in formation rather than noise
    function seed() {
      const n = count(), birds = [];
      const groups = st.w > 700 ? 3 : 2;
      for (let g = 0; g < groups; g++) {
        const cx = st.w * (0.2 + 0.6 * Math.random());
        const cy = st.h * (0.3 + 0.4 * Math.random());
        const heading = Math.random() * Math.PI * 2;
        const spread = Math.min(st.w, st.h) * 0.16;
        const size = Math.round(n / groups);
        for (let i = 0; i < size && birds.length < n; i++) {
          // Gaussian-ish blob, stretched along the direction of travel
          const u = (Math.random() + Math.random() + Math.random() - 1.5) * spread * 1.4;
          const v = (Math.random() + Math.random() + Math.random() - 1.5) * spread * 0.7;
          const x = cx + Math.cos(heading) * u - Math.sin(heading) * v;
          const y = cy + Math.sin(heading) * u + Math.cos(heading) * v;
          birds.push(bird(Math.min(st.w, Math.max(0, x)), Math.min(st.h, Math.max(0, y)), heading));
        }
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

    // Neighbour lookups go through a uniform grid so a dense flock stays cheap
    const PERC = 44, PERC2 = PERC * PERC;
    let grid = new Map();
    function buildGrid() {
      grid.clear();
      const P = st.birds;
      for (let i = 0; i < P.length; i++) {
        const k = ((P[i].x / PERC) | 0) * 4096 + ((P[i].y / PERC) | 0);
        let cell = grid.get(k);
        if (!cell) grid.set(k, (cell = []));
        cell.push(P[i]);
      }
    }

    function step(t) {
      const W = st.w, H = st.h, sp = opts.speed, P = st.birds;
      const maxS = 1.7 * sp;
      buildGrid();
      for (let i = 0; i < P.length; i++) {
        const b = P[i];
        let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, cnt = 0;
        const gx = (b.x / PERC) | 0, gy = (b.y / PERC) | 0;
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const cell = grid.get((gx + ox) * 4096 + (gy + oy));
            if (!cell) continue;
            for (let j = 0; j < cell.length; j++) {
              const o = cell[j];
              if (o === b) continue;
              const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
              if (d2 < PERC2) {
                ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; cnt++;
                if (d2 < 144) { const d = Math.sqrt(d2) + 0.01; sx -= dx / d; sy -= dy / d; }
              }
            }
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
      const ds = opts.size, L = 5 * ds;
      ctx.clearRect(0, 0, st.w, st.h);
      ctx.lineWidth = 1.1 * ds; ctx.lineCap = 'round';
      // Two passes (ink, then accent) so each colour is a single stroke call
      for (let pass = 0; pass < 2; pass++) {
        const green = pass === 1;
        ctx.strokeStyle = hexA(green ? opts.accent : opts.ink, green ? 0.85 : 0.5);
        ctx.beginPath();
        for (const b of st.birds) {
          if (b.green !== green) continue;
          const spd = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / spd, uy = b.vy / spd;
          ctx.moveTo(b.x - ux * L, b.y - uy * L);
          ctx.lineTo(b.x + ux * (L * 0.35), b.y + uy * (L * 0.35));
        }
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
      count() { return st.birds.length; },
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
