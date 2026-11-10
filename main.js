(() => {
  "use strict";
  const cfg = window.BLAZE_CONFIG || {};
  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
  }

  /* ---------- Checkout / download links from config.js ---------- */
  function wire(a, url, missingMsg) {
    if (url) {
      a.href = url;
      if (/^https?:/i.test(url)) a.rel = "noopener";
    } else {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        toast(missingMsg);
      });
    }
  }
  $$("[data-checkout]").forEach((a) =>
    wire(a, cfg.checkout && cfg.checkout[a.dataset.checkout], "Checkout link isn't set yet. Add it in config.js.")
  );
  $$("[data-download]").forEach((a) =>
    wire(a, cfg.download && cfg.download[a.dataset.download], "Download link isn't set yet. Add it in config.js.")
  );
  const support = $("#support");
  if (support && cfg.supportEmail) {
    support.href = "mailto:" + cfg.supportEmail;
    support.hidden = false;
  }

  /* ---------- Screenshot placeholder fallback ---------- */
  const shot = $("#shot");
  if (shot) {
    const img = $("img", shot);
    const markEmpty = () => shot.classList.add("is-empty");
    img.addEventListener("error", markEmpty);
    if (img.complete && img.naturalWidth === 0) markEmpty();
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Deterministic RNG ---------- */
  function mulberry(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Blaze Mode keyframe visual ---------- */
  const keys = $("#keys");
  if (keys) {
    const r = mulberry(7);
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("i");
      const key = i % 7 === 2;
      el.style.height = key ? "100%" : 30 + r() * 28 + "%";
      if (key) el.className = "k";
      keys.appendChild(el);
    }
  }

  /* ---------- Hero waveform demo ---------- */
  const canvas = $("#wave");
  const stFound = $("#st-found");
  const stRemoved = $("#st-removed");
  const stLen = $("#st-len");
  if (!canvas) return setupTheme();

  const ctx = canvas.getContext("2d");
  const speech = [18, 24, 12, 30, 16, 22, 14, 20]; // seconds
  const gaps = [3, 6, 11, 4, 9, 13, 5, 8, 4]; // lead, 7 between, trail
  const N = 360;
  const total = speech.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
  const removedTotal = gaps.reduce((a, b) => a + b, 0);

  // Build segments in sample space.
  const segs = [];
  let tcur = 0;
  const push = (dur, silent) => {
    const i0 = Math.round((tcur / total) * N);
    tcur += dur;
    const i1 = Math.round((tcur / total) * N);
    segs.push({ i0, i1, n: i1 - i0, silent });
  };
  gaps.forEach((g, i) => {
    push(g, true);
    if (i < speech.length) push(speech[i], false);
  });

  const rnd = mulberry(42);
  const amp = new Array(N);
  segs.forEach((s) => {
    for (let k = s.i0; k < s.i1; k++) {
      amp[k] = s.silent
        ? 0.025 + rnd() * 0.05
        : 0.16 + 0.84 * Math.pow(rnd(), 0.8) * (0.55 + 0.45 * Math.pow(Math.sin(k * 0.21), 2));
    }
  });

  let W = 0, H = 0;
  let last = { scan: 1, cut: 1 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(last.scan, last.cut);
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const fmt = (s) => {
    s = Math.round(s);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function draw(scan, cut) {
    last = { scan, cut };
    if (!W) return;
    const cs = getComputedStyle(root);
    const wave = cs.getPropertyValue("--wave").trim();
    const acc = cs.getPropertyValue("--accent").trim();
    const accSoft = cs.getPropertyValue("--accent-soft").trim();
    const line = cs.getPropertyValue("--border").trim();
    const e = ease(cut);
    const sw = W / N;
    const mid = H / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = line;
    ctx.fillRect(0, mid - 0.5, W, 1);

    let x = 0;
    let found = 0;
    segs.forEach((s) => {
      const detected = s.silent && s.i1 / N <= scan + 1e-6;
      if (detected) found++;
      const scale = s.silent ? 1 - e : 1;
      const w = s.n * sw * scale;
      if (w < 0.2) return;

      if (detected) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = accSoft;
        ctx.fillRect(x, 0, w, H);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = acc;
        ctx.fillRect(x, 0, 1, H);
        ctx.fillRect(x + w - 1, 0, 1, H);
      }

      const bw = sw * scale;
      ctx.fillStyle = s.silent && detected ? acc : wave;
      ctx.globalAlpha = s.silent ? (detected ? 0.9 : 0.35) : 0.8;
      for (let k = s.i0; k < s.i1; k++) {
        const h = Math.max(2, amp[k] * H * 0.86);
        ctx.fillRect(x + (k - s.i0) * bw, mid - h / 2, Math.max(1, bw * 0.58), h);
      }
      x += w;
    });

    if (scan > 0 && scan < 1 && cut === 0) {
      const px = scan * W;
      ctx.globalAlpha = 1;
      ctx.fillStyle = acc;
      ctx.shadowColor = acc;
      ctx.shadowBlur = 10;
      ctx.fillRect(px - 1, 0, 2, H);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    const removed = removedTotal * e;
    stFound.textContent = String(found);
    stRemoved.textContent = fmt(removed);
    stLen.textContent = fmt(total - removed);
  }

  // Timeline: scan, hold, cut, hold, reset.
  const T = { scan: 2400, hold1: 500, cut: 1200, hold2: 2600, reset: 700 };
  const loop = T.scan + T.hold1 + T.cut + T.hold2 + T.reset;
  function render(now) {
    const t = now % loop;
    let scan = 1, cut = 0;
    if (t < T.scan) scan = t / T.scan;
    else if (t < T.scan + T.hold1) cut = 0;
    else if (t < T.scan + T.hold1 + T.cut) cut = (t - T.scan - T.hold1) / T.cut;
    else if (t < T.scan + T.hold1 + T.cut + T.hold2) cut = 1;
    else cut = 1 - (t - (loop - T.reset)) / T.reset;
    draw(scan, cut);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  if (reduce) {
    draw(1, 1);
  } else {
    let visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => (visible = en[0].isIntersecting), { threshold: 0.05 }).observe(canvas);
    }
    const frame = (now) => {
      if (visible && !document.hidden) render(now);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  setupTheme();

  /* ---------- Theme toggle ---------- */
  function setupTheme() {
    const btn = $("#theme");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("blaze-theme", next); } catch (e) {}
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.content = next === "light" ? "#faf9f7" : "#0a0b0c";
      draw(last.scan, last.cut);
    });
  }
})();
