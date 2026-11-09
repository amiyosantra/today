"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- CAT BUILDER (one template, two colour sets) ----------
  function cat(k, c, hat) {
    const g = "url(#f" + k + ")", st = 'stroke="' + c.ln + '" stroke-width="4"';
    const cap = hat ? '<g transform="rotate(-10 160 66)"><path d="M120 70L160 6L200 70Z" fill="#ff7aa8" stroke="#c94f7d" stroke-width="3" stroke-linejoin="round"/><path d="M133 48H187M126 60H194" stroke="#fff" stroke-width="7" opacity=".85"/><circle cx="160" cy="10" r="11" fill="#ffd98a" stroke="#d9a84a" stroke-width="3"/></g>' : "";
    return '<svg class="cat" viewBox="0 0 320 360" data-face="calm" data-arm="">' +
      '<defs><radialGradient id="f' + k + '" cx=".35" cy=".28" r=".9"><stop offset="0" stop-color="' + c.hi + '"/><stop offset=".55" stop-color="' + c.fur + '"/><stop offset="1" stop-color="' + c.dk + '"/></radialGradient></defs>' +
      '<g class="tail"><path d="M236 310Q316 290 292 200" fill="none" stroke="' + c.ln + '" stroke-width="34" stroke-linecap="round"/><path d="M236 310Q316 290 292 200" fill="none" stroke="' + g + '" stroke-width="26" stroke-linecap="round"/></g>' +
      '<ellipse cx="160" cy="278" rx="92" ry="104" fill="' + g + '" ' + st + '/>' +
      '<ellipse cx="160" cy="300" rx="54" ry="70" fill="' + c.belly + '"/>' +
      '<g class="arm l"><rect x="78" y="226" width="32" height="76" rx="16" fill="' + g + '" ' + st + '/></g>' +
      '<g class="arm r"><rect x="210" y="226" width="32" height="76" rx="16" fill="' + g + '" ' + st + '/></g>' +
      '<g class="head">' +
        '<path d="M70 100L84 18L146 62Z" fill="' + g + '" ' + st + ' stroke-linejoin="round"/><path d="M250 100L236 18L174 62Z" fill="' + g + '" ' + st + ' stroke-linejoin="round"/>' +
        '<path d="M90 76L95 44L122 64Z" fill="' + c.inner + '"/><path d="M230 76L225 44L198 64Z" fill="' + c.inner + '"/>' +
        '<ellipse cx="160" cy="138" rx="102" ry="84" fill="' + g + '" ' + st + '/>' +
        '<ellipse cx="124" cy="96" rx="42" ry="20" fill="#fff" opacity=".28" transform="rotate(-20 124 96)"/>' +
        '<ellipse cx="98" cy="160" rx="17" ry="10" fill="#ff8fa8" opacity=".5"/><ellipse cx="222" cy="160" rx="17" ry="10" fill="#ff8fa8" opacity=".5"/>' +
        '<g class="e1" fill="#2a1d29"><ellipse cx="118" cy="134" rx="11" ry="15"/><ellipse cx="202" cy="134" rx="11" ry="15"/><circle cx="122" cy="128" r="4" fill="#fff"/><circle cx="206" cy="128" r="4" fill="#fff"/></g>' +
        '<g class="e2" fill="none" stroke="#2a1d29" stroke-width="6" stroke-linecap="round"><path d="M104 138Q118 118 132 138"/><path d="M188 138Q202 118 216 138"/></g>' +
        '<path d="M151 152Q160 160 169 152Q160 168 151 152Z" fill="#e5849f"/>' +
        '<g class="m1" fill="none" stroke="#5a3a46" stroke-width="3.5" stroke-linecap="round"><path d="M160 162Q150 178 138 168M160 162Q170 178 182 168"/></g>' +
        '<ellipse class="m2" cx="160" cy="174" rx="11" ry="9" fill="#6b2b3a"/>' +
        '<g class="m3"><path d="M128 164Q160 216 192 164Z" fill="#7a2a3c" stroke="#5a1f2d" stroke-width="3" stroke-linejoin="round"/><ellipse cx="160" cy="194" rx="14" ry="8" fill="#ff8fa8"/></g>' +
        '<g stroke="#5a3a46" stroke-width="2.5" stroke-linecap="round" opacity=".55"><path d="M92 150L52 142M92 160L52 166M228 150L268 142M228 160L268 166"/></g>' +
        '<rect class="mouth" x="146" y="160" width="28" height="22" fill="none"/><rect class="cheek" x="206" y="150" width="24" height="20" fill="none"/>' +
        '<g class="smudge"><ellipse cx="218" cy="160" rx="16" ry="11" fill="#fff7ef" stroke="#f3c6d3"/><circle cx="212" cy="156" r="4" fill="#ffb3cb"/><circle cx="226" cy="164" r="3" fill="#ffb3cb"/><circle cx="160" cy="153" r="7" fill="#fff7ef"/></g>' +
        cap + "</g></svg>";
  }
  const him = $("him"), her = $("her");
  him.innerHTML = cat("b", { hi: "#d6a06a", fur: "#a8703f", dk: "#6a3f1f", ln: "#4a2c14", belly: "#ecc9a0", inner: "#e8a0a0" }, false);
  her.innerHTML = cat("w", { hi: "#ffffff", fur: "#f7f4f1", dk: "#d6cfdc", ln: "#b3a7c0", belly: "#ffffff", inner: "#ffc2d1" }, true);
  const hs = him.firstElementChild, ws = her.firstElementChild;

  // ---------- DECOR: bunting + balloons ----------
  const flagColors = ["#ff8fb1", "#ffd98a", "#c8a0ff", "#8fe0d0", "#ffffff"];
  for (let i = 0; i < 14; i++) {
    const p = (i + 0.5) / 14, f = document.createElement("i");
    f.className = "flag";
    f.style.cssText = "left:" + (p * 100) + "%;top:" + (Math.sin(Math.PI * p) * 4.4).toFixed(2) + "cqw;background:" + flagColors[i % 5];
    $("bunting").appendChild(f);
  }
  [["6%", "#ff8fb1", "22cqw"], ["16%", "#ffd98a", "12cqw"], ["78%", "#c8a0ff", "14cqw"], ["90%", "#8fe0d0", "24cqw"], ["46%", "#ff8fb1", "6cqw"]].forEach((b, i) => {
    const el = document.createElement("i");
    el.style.cssText = "left:" + b[0] + ";top:" + b[2] + ";--c:" + b[1] + ";animation-delay:-" + i * 0.7 + "s";
    $("balloons").appendChild(el);
  });

  // ---------- 3D PARALLAX (pointer + gentle auto sway) ----------
  const world = $("world");
  let px = 0, py = 0;
  addEventListener("pointermove", (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; });
  (function loop(t) {
    if (!reduce) world.style.transform = "rotateX(" + (-py * 6 + Math.cos(t / 2300) * 1.2).toFixed(2) + "deg) rotateY(" + (px * 10 + Math.sin(t / 1800) * 3).toFixed(2) + "deg)";
    requestAnimationFrame(loop);
  })(0);

  // ---------- EFFECTS ----------
  const fx = $("fx");
  function confetti(n) {
    const cols = ["#ff8fb1", "#ffd98a", "#c8a0ff", "#ffffff", "#8fe0d0"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "conf";
      p.style.cssText = "left:" + Math.random() * 100 + "vw;background:" + pick(cols) + ";animation-duration:" + (2.5 + Math.random() * 3) + "s;animation-delay:" + Math.random() * 0.8 + "s";
      fx.appendChild(p); setTimeout(() => p.remove(), 6500);
    }
  }
  function hearts(n) {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const h = document.createElement("span");
      h.className = "rise"; h.textContent = pick(["♥", "💗", "💕", "✨"]);
      h.style.cssText = "left:" + (15 + Math.random() * 70) + "vw;font-size:" + (18 + Math.random() * 22) + "px;color:#ffabc6";
      fx.appendChild(h); setTimeout(() => h.remove(), 5200);
    }, i * 140);
  }

  // ---------- MUSIC: Happy Birthday tune, generated (no file needed) ----------
  const btn = $("musicBtn");
  let ac = null, master = null, loopTimer = null, playing = false, userStopped = false;
  const BEAT = 0.55;
  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const SONG = [["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2], ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 1], ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2]];
  const BARS = [[130.8, 329.6, 392], [98, 246.9, 293.7], [130.8, 329.6, 392], [98, 246.9, 293.7], [130.8, 329.6, 392], [130.8, 329.6, 392], [87.3, 220, 261.6], [130.8, 329.6, 392]];
  function tone(f, t, d, v, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(master || ac.destination); o.start(t); o.stop(t + d + 0.05);
  }
  function song() {
    if (!playing) return;
    const t0 = ac.currentTime + 0.1; let b = 0;
    for (const [n, beats] of SONG) {
      const t = t0 + b * BEAT, d = Math.max(beats * BEAT * 1.1, 0.35);
      tone(N[n], t, d, 0.11, "sine"); tone(N[n] * 2, t, d * 0.6, 0.015, "triangle"); b += beats;
    }
    BARS.forEach((bar, i) => {
      const t = t0 + i * 3 * BEAT;
      tone(bar[0], t, BEAT * 2, 0.07, "triangle");
      for (let k = 1; k <= 2; k++) { tone(bar[1], t + k * BEAT, BEAT * 0.8, 0.02, "sine"); tone(bar[2], t + k * BEAT, BEAT * 0.8, 0.02, "sine"); }
    });
    loopTimer = setTimeout(song, (b * BEAT + 1.6) * 1000);
  }
  function begin() {
    if (playing || !ac || ac.state !== "running") return;
    playing = true; master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination);
    btn.classList.remove("off"); song();
  }
  function music(on) {
    try {
      if (on) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = ac || new AC();
        ac.resume().then(begin).catch(() => {});
        begin();
      } else {
        playing = false; clearTimeout(loopTimer);
        if (master) { master.gain.cancelScheduledValues(0); master.gain.value = 0; master = null; }
        btn.classList.add("off");
      }
    } catch (e) { console.warn("Audio failed:", e); }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); userStopped = playing; music(!playing); });
  function chime() {
    try { if (ac && ac.state === "running") [523, 659, 784, 1046].forEach((f, i) => tone(f, ac.currentTime + i * 0.14, 0.5, 0.08, "triangle")); } catch (e) {}
  }
  // Try to start music right away. Browsers usually allow it only after a tap, so the first tap also starts it.
  btn.classList.add("off");
  music(true);

  // ---------- THE STORY ----------
  const cake = $("cake"), cutw = $("cutw");
  let busy = false, done = false;

  function fly(from, to, ms) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const sx = a.left + a.width / 2 - 23, sy = a.top + a.height / 2 - 17;
    const ex = b.left + b.width / 2 - 23, ey = b.top + b.height / 2 - 17;
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 90;
    const el = document.createElement("div"); el.className = "slice"; $("fly").appendChild(el);
    return el.animate([
      { transform: "translate(" + sx + "px," + sy + "px) scale(1) rotate(0deg)" },
      { transform: "translate(" + mx + "px," + my + "px) scale(1.3) rotate(-8deg)", offset: 0.5 },
      { transform: "translate(" + ex + "px," + ey + "px) scale(.9) rotate(4deg)" }
    ], { duration: ms, easing: "ease-in-out", fill: "forwards" }).finished.then(() => el);
  }
  async function eat(el) { await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished; el.remove(); }

  async function feed(giver, taker, arm) {
    giver.dataset.arm = arm; await wait(550);
    const el = await fly(cutw, taker.querySelector(".mouth"), 1500);
    await eat(el);
    taker.dataset.face = "chew"; hearts(5);
    await wait(1700);
    taker.dataset.face = "calm"; giver.dataset.arm = ""; await wait(500);
  }

  async function play() {
    if (busy) return; busy = true;
    $("hint").classList.add("off");
    if (!userStopped) music(true);
    await wait(700);

    cake.classList.add("out"); confetti(40); chime();           // candles blown out
    await wait(1300);

    ws.dataset.arm = "l";                                        // she cuts the cake
    setTimeout(() => cake.classList.add("cut"), 1100);
    await $("knife").animate([
      { transform: "translateY(-150%)", opacity: 0 },
      { transform: "translateY(-30%)", opacity: 1, offset: 0.25 },
      { transform: "translateY(14%)", opacity: 1, offset: 0.55 },
      { transform: "translateY(14%)", opacity: 1, offset: 0.63 },
      { transform: "translateY(-150%)", opacity: 0 }
    ], { duration: 2000, easing: "ease-in-out", fill: "forwards" }).finished;
    ws.dataset.arm = ""; await wait(400);

    await feed(ws, hs, "l");                                     // she feeds him
    await feed(hs, ws, "r");                                     // he feeds her

    hs.dataset.arm = "r"; await wait(550);                       // he smudges cake on her face
    const dab = await fly(cutw, ws.querySelector(".cheek"), 1100);
    await eat(dab);
    ws.querySelector(".smudge").classList.add("on");
    await wait(900); hs.dataset.arm = "";

    hs.dataset.face = "happy"; ws.dataset.face = "happy";        // both smile and celebrate
    $("stage").classList.add("party");
    confetti(140); hearts(14); chime();
    for (let i = 0; i < 4; i++) { await wait(1800); confetti(50); hearts(5); }
    done = true; $("replay").hidden = false;
  }

  function reset() {
    cake.classList.remove("out", "cut");
    [hs, ws].forEach((c) => { c.dataset.face = "calm"; c.dataset.arm = ""; });
    ws.querySelector(".smudge").classList.remove("on");
    $("stage").classList.remove("party"); $("replay").hidden = true;
    $("knife").style.opacity = 0; done = false; busy = false;
  }

  document.addEventListener("pointerdown", () => { if (!busy && !done) play(); });
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !busy && !done) play(); });
  $("replay").addEventListener("pointerdown", (e) => e.stopPropagation());
  $("replay").addEventListener("click", () => { reset(); if (!userStopped) music(true); play(); });
})();
