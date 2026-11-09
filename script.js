"use strict";
/* Happy Birthday Beralini — real-life sunset garden + walkable cats.
   Drop-in upgrade of the flat-room version. Same CDN (three r128), same story beats. */
(function () {
  const $ = (id) => document.getElementById(id);
  const T = window.THREE;
  if (!T) { $("hint").textContent = "Could not load the 3D engine. Check your internet and refresh."; return; }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ================= RENDERER / SCENE / CAMERA =================
  const renderer = new T.WebGLRenderer({ canvas: $("c"), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new T.Scene();
  scene.background = new T.Color(0x2a1740);
  scene.fog = new T.Fog(0x3a2148, 20, 58);
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 200);

  // golden-hour lights
  scene.add(new T.HemisphereLight(0xffd9ec, 0x3d5a34, 0.85));
  const sun = new T.DirectionalLight(0xffb36a, 1.15);
  sun.position.set(-7, 8, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -6, near: 1, far: 40 });
  scene.add(sun);
  const fill = new T.DirectionalLight(0x8fb1ff, 0.25); fill.position.set(6, 5, -4); scene.add(fill);
  const glow = new T.PointLight(0xffa850, 0.9, 7); glow.position.set(0, 1.7, 1.4); scene.add(glow);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  function M(geo, col, o) {
    o = o || {};
    const m = new T.Mesh(geo, col && col.isMaterial ? col : new T.MeshStandardMaterial({ color: col, roughness: o.r == null ? 0.85 : o.r, metalness: o.m || 0 }));
    m.position.set(o.x || 0, o.y || 0, o.z || 0);
    m.scale.set(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy, o.sz == null ? 1 : o.sz);
    m.castShadow = o.sh !== false; m.receiveShadow = true;
    (o.parent || scene).add(m);
    return m;
  }
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding;
    return t;
  }
  // short dense speckle used as fur-shell alpha (green channel = coverage)
  const furNoise = (function () {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 5200; i++) {
      g.fillStyle = "rgba(255,255,255," + (0.5 + Math.random() * 0.5) + ")";
      g.fillRect(Math.random() * 128, Math.random() * 128, 1.4, 1 + Math.random() * 2.5);
    }
    return new T.CanvasTexture(c);
  })();
  // tabby / shaded coat: subtle wavy bands read as real fur markings on spheres
  function coatTex(base, band, n) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = "rgba(255,255,255," + Math.random() * 0.05 + ")";
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.strokeStyle = band; g.lineWidth = 7;
      for (let i = 0; i < n; i++) {
        const y = (i + 0.5) * (h / n);
        g.globalAlpha = 0.35; g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + i * 2) * 5);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
  }
  // cheap shell fur: N slightly larger alpha-speckle layers = fuzzy silhouette
  function furry(mesh, hex, layers) {
    layers = layers || 5;
    for (let i = 0; i < layers; i++) {
      const mat = new T.MeshStandardMaterial({
        color: hex, roughness: 1, transparent: true,
        opacity: 0.6 - i * 0.1, alphaMap: furNoise, depthWrite: false
      });
      const s = new T.Mesh(mesh.geometry, mat);
      s.scale.setScalar(1 + (i + 1) * 0.022);
      s.castShadow = s.receiveShadow = false;
      mesh.add(s);
    }
  }

  // ================= SKY DOME + SUN + CLOUDS + HILLS =================
  (function sky() {
    const tex = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "#150b33"); gr.addColorStop(0.30, "#4a2560");
      gr.addColorStop(0.46, "#c65b7a"); gr.addColorStop(0.55, "#ff9a6a");
      gr.addColorStop(0.62, "#ffd98a"); gr.addColorStop(0.70, "#8a5a6a");
      gr.addColorStop(1, "#2a1a3a");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const dome = new T.Mesh(new T.SphereGeometry(90, 24, 16),
      new T.MeshBasicMaterial({ map: tex, side: T.BackSide, fog: false }));
    scene.add(dome);
    // sun disc
    const sunTex = canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.35, "rgba(255,190,110,0.9)");
      gr.addColorStop(1, "rgba(255,150,80,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    const disc = new T.Mesh(new T.PlaneGeometry(16, 16),
      new T.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
    disc.position.set(-22, 6.5, -55); disc.lookAt(0, 3, 0); scene.add(disc);
  })();

  const clouds = [];
  (function makeClouds() {
    const tex = canvasTex(256, 128, (g) => {
      g.clearRect(0, 0, 256, 128);
      const blobs = [[70, 80, 46], [120, 66, 58], [175, 78, 48], [100, 90, 60], [150, 92, 55], [40, 92, 30], [215, 92, 32]];
      blobs.forEach((b) => {
        const gr = g.createRadialGradient(b[0], b[1], 4, b[0], b[1], b[2]);
        gr.addColorStop(0, "rgba(255,225,205,0.95)"); gr.addColorStop(0.6, "rgba(240,170,160,0.55)"); gr.addColorStop(1, "rgba(240,170,160,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(b[0], b[1], b[2], 0, 7); g.fill();
      });
    });
    for (let i = 0; i < 8; i++) {
      const sm = new T.SpriteMaterial({ map: tex, transparent: true, opacity: 0.55 + Math.random() * 0.3, depthWrite: false, fog: false });
      const s = new T.Sprite(sm);
      s.position.set((Math.random() - 0.5) * 90, 9 + Math.random() * 9, -32 - Math.random() * 18);
      s.scale.set(13 + Math.random() * 10, 5 + Math.random() * 3, 1);
      s.userData.v = 0.12 + Math.random() * 0.2;
      scene.add(s); clouds.push(s);
    }
  })();
  // early stars fading in at the top of the dusk sky
  const starMat = new T.PointsMaterial({ color: 0xcfd8ff, size: 0.22, transparent: true, opacity: 0.0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  (function stars() {
    const g = new T.BufferGeometry(), p = [];
    for (let i = 0; i < 220; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.25 + Math.random() * 1.1, r = 80;
      p.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.6 + 6, Math.sin(a) * Math.cos(e) * r);
    }
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    scene.add(new T.Points(g, starMat));
  })();

  (function hills() {
    const m1 = new T.MeshStandardMaterial({ color: 0x4a3a63, roughness: 1 });
    const h1 = M(new T.SphereGeometry(22, 20, 12), m1, { x: -20, y: -7.5, z: -34, sz: 0.5, sh: false });
    const h2 = M(new T.SphereGeometry(26, 20, 12), new T.MeshStandardMaterial({ color: 0x5a4670, roughness: 1 }),
      { x: 18, y: -8.5, z: -38, sz: 0.5, sh: false });
    h1.receiveShadow = h2.receiveShadow = true;
  })();

  // ================= GRASS + PATH + FLOWERS + TREES + LANTERNS =================
  (function grass() {
    const tex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#4d7a3f"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const s = ["#5d8f47", "#426e35", "#6fa055", "#3a6230"][(Math.random() * 4) | 0];
        g.fillStyle = s; g.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 3);
      }
    });
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(14, 14);
    const gr = new T.Mesh(new T.CircleGeometry(60, 40),
      new T.MeshStandardMaterial({ map: tex, roughness: 1 }));
    gr.rotation.x = -Math.PI / 2; gr.position.y = -4; gr.receiveShadow = true; scene.add(gr);
  })();

  (function path() {
    const stone = new T.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.95 });
    for (let i = 0; i < 7; i++) {
      const s = M(new T.CylinderGeometry(0.55 + Math.random() * 0.15, 0.6, 0.08, 9), stone,
        { x: (Math.random() - 0.5) * 0.5, y: -3.95, z: 5.5 + i * 1.5, sh: false });
      s.receiveShadow = true;
    }
  })();

  // grass blades near the table (cheap instanced look via small cones)
  (function blades() {
    const geo = new T.ConeGeometry(0.03, 0.35, 4);
    const mat = new T.MeshStandardMaterial({ color: 0x6fa055, roughness: 1 });
    for (let i = 0; i < 520; i++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 9;
      const b = new T.Mesh(geo, mat);
      b.position.set(Math.cos(a) * r, -3.85, Math.sin(a) * r * 0.7 + 1);
      b.rotation.z = (Math.random() - 0.5) * 0.4; scene.add(b);
    }
  })();

  (function flowers() {
    const stemM = new T.MeshStandardMaterial({ color: 0x3f7a34, roughness: 1 });
    const cols = [0xff8fb1, 0xffd98a, 0xffffff, 0xc8a0ff, 0xff6a8a];
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r = 4.5 + Math.random() * 9;
      const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.7 + 0.5;
      if (Math.abs(x) < 4 && z > -3 && z < 5) continue;
      const st = M(new T.CylinderGeometry(0.02, 0.02, 0.5, 5), stemM, { x, y: -3.7, z, sh: false });
      st.receiveShadow = false;
      M(new T.SphereGeometry(0.09, 8, 8), new T.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.6 }),
        { x, y: -3.42, z, sh: false });
    }
  })();

  function tree(x, z, s) {
    const g = new T.Group(); g.position.set(x, -4, z); g.scale.setScalar(s); scene.add(g);
    M(new T.CylinderGeometry(0.28, 0.42, 3.4, 8), new T.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }), { y: 1.7, parent: g });
    const leaf = new T.MeshStandardMaterial({ color: 0x3f7d33, roughness: 1 });
    M(new T.SphereGeometry(1.7, 14, 12), leaf, { y: 4.1, parent: g });
    M(new T.SphereGeometry(1.2, 12, 10), new T.MeshStandardMaterial({ color: 0x529244, roughness: 1 }), { x: 1.1, y: 3.4, parent: g });
    M(new T.SphereGeometry(1.0, 12, 10), leaf, { x: -1.1, y: 3.5, parent: g });
    return g;
  }
  tree(-9, -8, 1.3); tree(9.5, -7, 1.1); tree(-12, 2, 0.9); tree(12, 3, 1.0);

  const lanternLights = [];
  function lantern(x, z) {
    const g = new T.Group(); g.position.set(x, -4, z); scene.add(g);
    M(new T.CylinderGeometry(0.07, 0.09, 3.2, 8), new T.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.8 }), { y: 1.6, parent: g });
    const bulb = M(new T.SphereGeometry(0.26, 14, 12),
      new T.MeshBasicMaterial({ color: 0xffd9a0 }), { y: 3.3, parent: g, sh: false });
    M(new T.ConeGeometry(0.4, 0.35, 8), new T.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.8 }), { y: 3.62, parent: g });
    const pl = new T.PointLight(0xffb36a, 0.9, 12); pl.position.set(x, -0.4, z); scene.add(pl);
    lanternLights.push({ pl, bulb });
    return g;
  }
  lantern(-5.2, -2.5); lantern(5.2, -2.5);

  // ================= TABLE (wood) + SIGN + BUNTING + BALLOONS =================
  (function table() {
    const woodTex = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = "#8a5a33"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = "rgba(60,32,12," + (0.15 + Math.random() * 0.25) + ")";
        g.lineWidth = 1 + Math.random() * 2; g.beginPath();
        const y = Math.random() * h; g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); g.stroke();
      }
    });
    woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping; woodTex.repeat.set(3, 1);
    const wood = new T.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
    M(new T.BoxGeometry(9, 0.28, 5.4), wood, { y: -0.18, z: 0.6 });
    const legM = new T.MeshStandardMaterial({ color: 0x5e3a1e, roughness: 0.9 });
    [[-4, -1.8], [4, -1.8], [-4, 2.8], [4, 2.8]].forEach((p) =>
      M(new T.BoxGeometry(0.3, 4, 0.3), legM, { x: p[0], y: -2.1, z: p[1] }));
    // pink runner on top
    M(new T.BoxGeometry(9.1, 0.06, 2.2), new T.MeshStandardMaterial({ color: 0xf49ac0, roughness: 0.9 }), { y: -0.01, z: 0.6, sh: false });
    M(new T.BoxGeometry(9.1, 0.05, 5.5), new T.MeshStandardMaterial({ color: 0xfff3f0, roughness: 0.9 }), { y: -0.06, z: 0.6, sh: false });
  })();

  (function sign() {
    const post = new T.MeshStandardMaterial({ color: 0x5e3a1e, roughness: 0.9 });
    M(new T.CylinderGeometry(0.09, 0.09, 3.4, 8), post, { x: -3.4, y: 3.2, z: -3.6 });
    M(new T.CylinderGeometry(0.09, 0.09, 3.4, 8), post, { x: 3.4, y: 3.2, z: -3.6 });
    const tex = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = "#6a4526"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = "rgba(40,22,8," + (0.12 + Math.random() * 0.2) + ")";
        g.lineWidth = 1 + Math.random() * 2.5; g.beginPath();
        const y = Math.random() * h; g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + 5, w * 0.6, y - 5, w, y); g.stroke();
      }
      g.fillStyle = "rgba(30,16,8,0.72)"; g.fillRect(28, 28, w - 56, h - 56);
      g.strokeStyle = "#ffd98a"; g.lineWidth = 6; g.strokeRect(34, 34, w - 68, h - 68);
      g.fillStyle = "#ffe9c4"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "900 92px system-ui,sans-serif";
      g.fillText("HAPPY BIRTHDAY", w / 2, h / 2 - 46);
      g.font = "900 104px system-ui,sans-serif"; g.fillStyle = "#ffb1cd";
      g.fillText("BERALINI  \uD83D\uDC31", w / 2, h / 2 + 62);
    });
    const board = new T.Mesh(new T.BoxGeometry(6.4, 1.6, 0.12),
      new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    board.position.set(0, 4.6, -3.6); board.castShadow = true; scene.add(board);
  })();

  const flagCols = [0xff8fb1, 0xffd98a, 0xc8a0ff, 0x8fe0d0, 0xffffff];
  const flags = [];
  (function bunting() {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const x = -7 + i; pts.push(V(x, 5.9 - 0.9 * (1 - Math.pow(x / 7, 2)), -3.3)); }
    scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xffd98a })));
    for (let i = 0; i < 14; i++) {
      const a = pts[i], b = pts[i + 1], s = new T.Shape();
      s.moveTo(-0.34, 0); s.lineTo(0.34, 0); s.lineTo(0, -0.75);
      const f = new T.Mesh(new T.ShapeGeometry(s), new T.MeshBasicMaterial({ color: flagCols[i % 5], side: T.DoubleSide }));
      f.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, -3.3);
      f.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
      f.userData.ph = i * 0.7; scene.add(f); flags.push(f);
    }
  })();

  const balloons = [];
  [[-4.9, 3.8, -2.2, 0xff8fb1], [-3.4, 4.7, -2.9, 0xffd98a], [3.5, 4.6, -2.9, 0xc8a0ff],
   [4.9, 3.7, -2.2, 0x8fe0d0], [0.2, 5.3, -3.4, 0xff6a8a], [-6, 4.6, -0.5, 0x8fe0d0], [6, 4.4, -0.5, 0xffd98a]
  ].forEach((b, i) => {
    const g = new T.Group(); g.position.set(b[0], b[1], b[2]);
    const body = M(new T.SphereGeometry(0.5, 24, 18),
      new T.MeshStandardMaterial({ color: b[3], roughness: 0.18, metalness: 0.08 }), { sy: 1.2, parent: g });
    body.receiveShadow = false;
    // shiny highlight
    M(new T.SphereGeometry(0.1, 8, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }),
      { x: -0.16, y: 0.22, z: 0.38, parent: g, sh: false });
    M(new T.CylinderGeometry(0.008, 0.008, 2.6, 4),
      new T.MeshBasicMaterial({ color: 0xfff2dd }), { y: -1.9, parent: g, sh: false });
    g.userData = { y0: b[1], ph: i * 1.3 }; scene.add(g); balloons.push(g);
  });

  // fireflies + petals + butterflies
  const fireGeo = new T.BufferGeometry(), firePos = [];
  for (let i = 0; i < 70; i++) firePos.push((Math.random() - 0.5) * 18, Math.random() * 4 - 1, -4 + Math.random() * 9);
  fireGeo.setAttribute("position", new T.Float32BufferAttribute(firePos, 3));
  const fireflies = new T.Points(fireGeo, new T.PointsMaterial({ color: 0xffe6a8, size: 0.09, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
  scene.add(fireflies);

  const petals = [];
  (function makePetals() {
    const geo = new T.PlaneGeometry(0.09, 0.06);
    const cols = [0xffb1cd, 0xffd9e2, 0xff8fb1, 0xffffff];
    for (let i = 0; i < 42; i++) {
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: cols[i % 4], side: T.DoubleSide, transparent: true, opacity: 0.95 }));
      m.position.set((Math.random() - 0.5) * 16, Math.random() * 7, -4 + Math.random() * 9);
      m.userData = { v: 0.25 + Math.random() * 0.4, ph: Math.random() * 9 };
      scene.add(m); petals.push(m);
    }
  })();

  const butterflies = [];
  (function makeButterflies() {
    for (let i = 0; i < 3; i++) {
      const g = new T.Group();
      const col = [0xff8fb1, 0xffd98a, 0xc8a0ff][i];
      const wgeo = new T.PlaneGeometry(0.22, 0.3);
      const wmat = new T.MeshBasicMaterial({ color: col, side: T.DoubleSide });
      const l = new T.Mesh(wgeo, wmat), r = new T.Mesh(wgeo, wmat);
      l.position.x = -0.11; r.position.x = 0.11; g.add(l, r);
      g.userData = { l, r, ph: i * 2.1, cx: -3 + i * 3, cz: -1 + (i % 2) * 2 };
      scene.add(g); butterflies.push(g);
    }
  })();

  // ================= CATS =================
  function makeCat(o) {
    const side = o.side;
    const fur = new T.MeshStandardMaterial({ color: o.fur, roughness: 0.95, map: coatTex(o.coatBase, o.coatBand, o.coatN) });
    const belly = new T.MeshStandardMaterial({ color: o.belly, roughness: 0.95 });
    const pink = new T.MeshStandardMaterial({ color: 0xff9fb8, roughness: 0.8 });
    const dark = new T.MeshStandardMaterial({ color: 0x241822, roughness: 0.3 });
    const c = { side, face: "calm", phase: o.phase, lean: { x: 0, z: 0, hx: 0, hy: 0, hz: 0 }, ears: [], walk: 0 };

    const root = c.root = new T.Group(); root.position.set(side * 1.15, 0, -0.45); scene.add(root);
    const body = c.body = new T.Group(); root.add(body);
    const bodyMesh = M(new T.SphereGeometry(1, 32, 24), fur, { y: 0.85, sx: 0.85, sz: 0.8, parent: body });
    M(new T.SphereGeometry(1, 24, 16), belly, { y: 0.72, z: 0.5, sx: 0.55, sy: 0.7, sz: 0.34, parent: body });
    c.feet = [-1, 1].map((s) => M(new T.SphereGeometry(0.3, 16, 12), fur, { x: s * 0.42, y: 0.12, z: 0.95, sy: 0.55, sz: 1.5, parent: root }));

    const head = c.head = new T.Group(); head.position.set(0, 2.45, 0.05); head.scale.setScalar(0.9); body.add(head);
    const headMesh = M(new T.SphereGeometry(0.95, 36, 28), fur, { sx: 1.1, sy: 0.92, parent: head });
    [-1, 1].forEach((s) => {
      const e = M(new T.ConeGeometry(0.36, 0.74, 4), fur, { x: s * 0.64, y: 0.8, parent: head });
      e.rotation.z = -s * 0.42; e.rotation.y = Math.PI / 4; c.ears.push(e);
      const inn = M(new T.ConeGeometry(0.24, 0.5, 4), pink, { x: s * 0.62, y: 0.76, z: 0.1, parent: head, sh: false });
      inn.rotation.z = -s * 0.42; inn.rotation.y = Math.PI / 4;
    });
    const eo = c.eo = new T.Group(), eh = c.eh = new T.Group(); head.add(eo, eh);
    const white = new T.MeshBasicMaterial({ color: 0xffffff });
    const irisT = canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 8, 64, 64, 62);
      gr.addColorStop(0, o.irisMid); gr.addColorStop(0.72, o.irisMid); gr.addColorStop(1, o.irisEdge);
      g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = 7;
      g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
    });
    [-1, 1].forEach((s) => {
      M(new T.SphereGeometry(0.13, 16, 12), dark, { x: s * 0.4, y: 0.1, z: 0.84, sy: 1.3, sz: 0.55, parent: eo, sh: false });
      const iris = new T.Mesh(new T.CircleGeometry(0.115, 24), new T.MeshBasicMaterial({ map: irisT }));
      iris.position.set(s * 0.4, 0.1, 0.928); eo.add(iris);
      const pup = new T.Mesh(new T.CircleGeometry(0.048, 16), new T.MeshBasicMaterial({ color: 0x0a0808 }));
      pup.position.set(s * 0.4, 0.1, 0.936); pup.scale.set(0.72, 1.5, 1); eo.add(pup);
      M(new T.SphereGeometry(0.042, 8, 8), white, { x: s * 0.4 + 0.05, y: 0.16, z: 0.938, parent: eo, sh: false });
      const a = new T.Mesh(new T.TorusGeometry(0.13, 0.03, 8, 20, Math.PI), dark); a.position.set(s * 0.4, 0.04, 0.86); eh.add(a);
    });
    M(new T.SphereGeometry(0.08, 12, 10), new T.MeshStandardMaterial({ color: 0xe5849f, roughness: 0.5 }), { y: -0.1, z: 0.93, sx: 1.3, sy: 0.8, sz: 0.8, parent: head, sh: false });
    c.mcalm = new T.Group(); head.add(c.mcalm);
    [-1, 1].forEach((s) => { const u = new T.Mesh(new T.TorusGeometry(0.085, 0.016, 6, 14, Math.PI), dark); u.rotation.z = Math.PI; u.position.set(s * 0.085, -0.2, 0.92); c.mcalm.add(u); });
    c.mchew = M(new T.SphereGeometry(0.13, 14, 10), new T.MeshStandardMaterial({ color: 0x6b2434 }), { y: -0.3, z: 0.88, sz: 0.5, parent: head, sh: false });
    c.mhappy = new T.Group(); head.add(c.mhappy);
    M(new T.SphereGeometry(0.21, 18, 12), new T.MeshStandardMaterial({ color: 0x6e1f33 }), { y: -0.3, z: 0.84, sx: 1.2, sy: 0.8, sz: 0.5, parent: c.mhappy, sh: false });
    M(new T.SphereGeometry(0.1, 12, 8), pink, { y: -0.38, z: 0.9, sx: 1.3, sy: 0.6, sz: 0.5, parent: c.mhappy, sh: false });
    [-1, 1].forEach((s) => {
      const ch = new T.Mesh(new T.CircleGeometry(0.17, 16), new T.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.55 }));
      ch.position.set(s * 0.7, -0.1, 0.7); ch.rotation.y = s * 0.85; head.add(ch);
      for (let k = 0; k < 3; k++) {
        const w = M(new T.CylinderGeometry(0.008, 0.008, 0.62, 4), 0x4a3a44, { x: s * 0.86, y: -0.08 - k * 0.07, z: 0.74, parent: head, sh: false });
        w.rotation.z = Math.PI / 2 + s * (k - 1) * 0.12; w.rotation.y = s * 0.6;
      }
    });
    c.mouth = new T.Object3D(); c.mouth.position.set(0, -0.3, 0.95); head.add(c.mouth);
    c.cheek = new T.Object3D(); c.cheek.position.set(-side * 0.72, -0.08, 0.7); head.add(c.cheek);
    const cream = new T.MeshStandardMaterial({ color: 0xfff6ee, roughness: 0.6 });
    c.smear = new T.Group(); c.smear.visible = false; head.add(c.smear);
    M(new T.SphereGeometry(0.15, 14, 10), cream, { x: -side * 0.68, y: -0.06, z: 0.72, sx: 1.3, sz: 0.5, parent: c.smear, sh: false });
    M(new T.SphereGeometry(0.06, 10, 8), pink, { x: -side * 0.64, y: -0.02, z: 0.8, parent: c.smear, sh: false });
    M(new T.SphereGeometry(0.1, 12, 10), cream, { y: -0.12, z: 0.98, sz: 0.6, parent: c.smear, sh: false });

    if (o.hat) {
      const hat = new T.Group(); hat.position.set(0.12, 1.0, 0.05); hat.rotation.z = -0.22; head.add(hat);
      M(new T.ConeGeometry(0.46, 1.0, 28), new T.MeshStandardMaterial({ color: 0xff7aa8, roughness: 0.5 }), { parent: hat });
      [[-0.15, 0.3], [0.12, 0.178]].forEach((r) => { const t = M(new T.TorusGeometry(r[1], 0.03, 8, 28), 0xffffff, { y: r[0], parent: hat, sh: false }); t.rotation.x = Math.PI / 2; });
      M(new T.SphereGeometry(0.11, 14, 10), 0xffd98a, { y: 0.52, parent: hat });
      c.hat = hat;
    }

    c.tail = [];
    for (let i = 0; i < 8; i++) c.tail.push(M(new T.SphereGeometry(0.22 - 0.012 * i, 12, 10), fur, { parent: root }));

    c.arms = [-1, 1].map((s) => {
      const sh = new T.Object3D(); sh.position.set(s * 0.74, 1.3, 0.2); body.add(sh);
      const a = {
        s, sh, inner: s === -side, target: V(0, 0, 0), eff: V(0, 0, 0), hold: null, busy: false, pole: V(s * 0.8, -1, -0.3),
        up: M(new T.CylinderGeometry(0.17, 0.2, 1, 14), fur), lo: M(new T.CylinderGeometry(0.15, 0.17, 1, 14), fur),
        el: M(new T.SphereGeometry(0.18, 14, 10), fur), paw: M(new T.SphereGeometry(0.29, 18, 14), fur, { sy: 0.9 })
      };
      a.rest = () => V(root.position.x + s * 0.66, 0.27 + root.position.y, root.position.z + 0.85);
      a.target.copy(a.rest());
      return a;
    });
    [bodyMesh, headMesh, ...c.tail].forEach((m) => furry(m, o.fur, 5));
    c.ears.forEach((e) => furry(e, o.fur, 3));
    c.home = root.position.clone();
    c.yaw = 0;
    return c;
  }
  const him = makeCat({ side: -1, fur: 0xb47840, belly: 0xebcaa0, phase: 0,
    coatBase: "#b87f45", coatBand: "#7a4d22", coatN: 9, irisEdge: "#3a2008", irisMid: "#d9973a" });
  const her = makeCat({ side: 1, fur: 0xf7f3f0, belly: 0xffffff, hat: true, phase: 2,
    coatBase: "#f6f2ec", coatBand: "#d9cfc0", coatN: 5, irisEdge: "#1e3a34", irisMid: "#8fd0bd" });
  her.name = "Beralini";
  const cats = [him, her];
  // soft contact shadows ground the cats on the table
  const blobTex = canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, "rgba(20,8,16,0.5)"); gr.addColorStop(0.7, "rgba(20,8,16,0.22)"); gr.addColorStop(1, "rgba(20,8,16,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  cats.forEach((c) => {
    const sh = new T.Mesh(new T.PlaneGeometry(2.7, 2.4),
      new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; scene.add(sh); c.shadow = sh;
  });
  const inner = (c) => c.arms.find((a) => a.inner);
  function setFace(c, f) {
    c.face = f;
    c.eo.visible = f === "calm" || f === "open"; c.eh.visible = f === "chew" || f === "happy";
    c.mcalm.visible = f === "calm"; c.mchew.visible = f === "open" || f === "chew"; c.mhappy.visible = f === "happy";
  }
  cats.forEach((c) => setFace(c, "calm"));

  const _P = V(0, 0, 0), _D = V(0, 0, 0), _E = V(0, 0, 0), _Pl = V(0, 0, 0), UP = V(0, 1, 0);
  function limb(m, a, b) {
    _D.subVectors(b, a); const len = _D.length();
    m.position.copy(a).addScaledVector(_D, 0.5); m.scale.set(1, Math.max(len, 0.001), 1);
    m.quaternion.setFromUnitVectors(UP, _D.normalize());
  }
  function solve(arm) {
    const L = 1.15;
    arm.sh.getWorldPosition(_P);
    _D.subVectors(arm.target, _P); let d = _D.length(); const max = 2 * L * 0.995;
    if (d > max) { _D.setLength(max); arm.eff.copy(_P).add(_D); d = max; } else arm.eff.copy(arm.target);
    _D.normalize();
    const a = d / 2, h = Math.sqrt(Math.max(L * L - a * a, 0));
    _Pl.copy(arm.pole); _Pl.addScaledVector(_D, -_Pl.dot(_D));
    if (_Pl.lengthSq() < 1e-4) _Pl.set(0, -1, 0); _Pl.normalize();
    _E.copy(_P).addScaledVector(_D, a).addScaledVector(_Pl, h);
    limb(arm.up, _P, _E); limb(arm.lo, _E, arm.eff);
    arm.el.position.copy(_E); arm.paw.position.copy(arm.eff);
    if (arm.hold) arm.hold.obj.position.copy(arm.eff).add(arm.hold.off);
  }

  // ================= CAKE / SLICE / KNIFE =================
  const CAKE = V(0, 0, 1.3), DEG = Math.PI / 180;
  const SP = 0xf5dca6, CR = 0xfff3f7, FR = 0xff9fc0;
  const spongeTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = "#f3d9a0"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = "rgba(160,110,60," + (0.08 + Math.random() * 0.16) + ")";
      const r = 1 + Math.random() * 2.6;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
    }
  });
  spongeTex.wrapS = spongeTex.wrapT = T.RepeatWrapping;
  const LAY = [[0.22, SP], [0.06, CR], [0.22, SP], [0.06, CR], [0.1, FR, 0.89]];
  function sector(a0, a1, r) {
    const g = new T.Group(); let y = 0.07;
    LAY.forEach((l) => {
      const R = l[2] || r, s = new T.Shape();
      s.moveTo(0, 0); s.lineTo(R * Math.cos(a0), R * Math.sin(a0)); s.absarc(0, 0, R, a0, a1, false); s.lineTo(0, 0);
      const geo = new T.ExtrudeGeometry(s, { depth: l[0], bevelEnabled: false, curveSegments: 24 }); geo.rotateX(-Math.PI / 2);
      const mo = { color: l[1], roughness: 0.65 };
      if (l[1] === SP) mo.map = spongeTex;
      const m = new T.Mesh(geo, new T.MeshStandardMaterial(mo));
      m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m); y += l[0];
    });
    return g;
  }
  const TOP = 0.73;
  function berry(parent, x, z) {
    M(new T.SphereGeometry(0.09, 12, 10), new T.MeshStandardMaterial({ color: 0xe0203f, roughness: 0.4 }), { x, y: TOP + 0.07, z, sy: 1.1, parent });
    M(new T.ConeGeometry(0.05, 0.05, 6), 0x3f9a4a, { x, y: TOP + 0.15, z, parent, sh: false });
  }
  const cake = new T.Group(); cake.position.copy(CAKE); scene.add(cake);
  M(new T.CylinderGeometry(1.05, 1.05, 0.07, 40), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.55 }), { y: 0.035, parent: cake });
  cake.add(sector(300 * DEG, 600 * DEG, 0.85));
  [10, 70, 130, 190, 320].forEach((d) => berry(cake, Math.cos(d * DEG) * 0.64, -Math.sin(d * DEG) * 0.64));
  // glossy frosting drips around the rim
  const dripM = new T.MeshStandardMaterial({ color: 0xfff3f7, roughness: 0.32 });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    M(new T.SphereGeometry(0.055, 10, 8), dripM,
      { x: Math.cos(a) * 0.83, y: TOP - 0.03 - (i % 3) * 0.03, z: -Math.sin(a) * 0.83, sy: 1.5 + (i % 3) * 0.5, parent: cake, sh: false });
  }
  const flames = [];
  [30, 90, 150].forEach((d) => {
    const x = Math.cos(d * DEG) * 0.4, z = -Math.sin(d * DEG) * 0.4;
    M(new T.CylinderGeometry(0.035, 0.035, 0.34, 10), 0xffffff, { x, y: TOP + 0.17, z, parent: cake });
    const f = M(new T.ConeGeometry(0.05, 0.17, 10), new T.MeshBasicMaterial({ color: 0xffb02e }), { x, y: TOP + 0.43, z, parent: cake, sh: false });
    flames.push(f);
  });
  // candle light flicker anchor
  const candleLight = new T.PointLight(0xff9a3a, 0.9, 5); candleLight.position.set(0, 1.6, 1.3); scene.add(candleLight);

  const slice = new T.Group(), sliceBase = V(CAKE.x, 0, CAKE.z + 0.5);
  const sliceIn = sector(240 * DEG, 300 * DEG, 0.85); sliceIn.position.z = -0.5; slice.add(sliceIn);
  berry(sliceIn, 0, 0.6); slice.position.copy(sliceBase); scene.add(slice);

  const knife = new T.Group(), KNIFE_REST = V(1.75, 0.06, 1.95);
  M(new T.CylinderGeometry(0.07, 0.07, 0.4, 12), 0x7a4a2a, { y: 0.2, parent: knife });
  M(new T.BoxGeometry(0.025, 0.55, 0.95), new T.MeshStandardMaterial({ color: 0xe9eef5, roughness: 0.2, metalness: 0.7 }), { y: -0.28, parent: knife });
  scene.add(knife);
  function resetKnife() { knife.position.copy(KNIFE_REST); knife.rotation.set(0, 0.3, Math.PI / 2); }
  resetKnife();

  const dab = M(new T.SphereGeometry(0.16, 14, 10), new T.MeshStandardMaterial({ color: 0xfff6ee, roughness: 0.5 }), { sh: false });
  dab.visible = false;

  // ================= ANIMATION ENGINE =================
  const anims = [];
  function anim(ms, fn) { return new Promise((res) => anims.push({ t0: performance.now(), ms, fn, res })); }
  function stepAnims(now) {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i], k = Math.min(1, (now - a.t0) / a.ms);
      a.fn(ease(k), k);
      if (k >= 1) { anims.splice(i, 1); a.res(); }
    }
  }
  function reach(arm, get, ms) { arm.busy = true; const from = arm.target.clone(); return anim(ms, (e) => arm.target.lerpVectors(from, get(), e)); }
  function follow(arm, get, ms) { arm.busy = true; return anim(ms, () => arm.target.copy(get())); }
  function park(arm, ms) { arm.busy = true; const from = arm.target.clone(); return anim(ms || 700, (e) => arm.target.lerpVectors(from, arm.rest(), e)).then(() => { arm.busy = false; }); }
  function leanTo(c, to, ms) { const f = Object.assign({}, c.lean); return anim(ms, (e) => { for (const k in to) c.lean[k] = f[k] + (to[k] - f[k]) * e; }); }
  const mouthW = (c) => c.mouth.getWorldPosition(V(0, 0, 0));
  const cheekW = (c) => c.cheek.getWorldPosition(V(0, 0, 0));

  const parts = [], pgeo = new T.BoxGeometry(1, 1, 1);
  function burst(pos, n, o) {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(pgeo, new T.MeshStandardMaterial({ color: o.col || pick([0xfff1d6, 0xf5dca6, 0xff9fc0]), transparent: true }));
      const s = o.size || 0.05; m.scale.set(s, s, s); m.position.copy(pos); scene.add(m);
      parts.push({ m, v: V((Math.random() - 0.5) * (o.spread || 1.2), (o.up || 1.5) * Math.random() + 0.3, (Math.random() - 0.2) * (o.spread || 1.2)), g: o.g == null ? -7 : o.g, life: o.life || 1.2, t: 0 });
    }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; p.v.y += p.g * dt; p.m.position.addScaledVector(p.v, dt);
      if (p.g < 0 && p.m.position.y < 0.05) { p.m.position.y = 0.05; p.v.set(0, 0, 0); }
      p.m.material.opacity = Math.max(0, 1 - Math.pow(p.t / p.life, 2));
      if (p.t > p.life) { scene.remove(p.m); p.m.material.dispose(); parts.splice(i, 1); }
    }
  }

  // ================= MOVEMENT (WASD + joystick + orbit camera) =================
  const keys = {};
  addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    if ((e.key === "Enter" || e.key === " ") && !busy && !done) start();
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });

  const joyVec = { x: 0, y: 0, active: false }; // joystick removed: tap anywhere starts the show

  // orbit drag + zoom
  let yaw = 0.15, pitch = 0.32, dist = 10.2, dragging = false, lx = 0, ly = 0, moved = 0, downAt = 0;
  const cv = $("c");
  cv.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; moved = 0; downAt = performance.now(); });
  addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * 0.005; pitch = clamp(pitch + dy * 0.004, 0.08, 1.05);
  });
  addEventListener("pointerup", () => { dragging = false; });
  cv.addEventListener("wheel", (e) => { dist = clamp(dist + e.deltaY * 0.01, 6, 16); e.preventDefault(); }, { passive: false });

  let busy = false, done = false, partyOn = false;
  function movePlayer(dt, t) {
    if (busy) { her.walk = lerp(her.walk || 0, 0, 0.2); return; }
    let mx = 0, mz = 0;
    if (keys["w"] || keys["arrowup"]) mz -= 1;
    if (keys["s"] || keys["arrowdown"]) mz += 1;
    if (keys["a"] || keys["arrowleft"]) mx -= 1;
    if (keys["d"] || keys["arrowright"]) mx += 1;
    if (joyVec.active) { mx += joyVec.x; mz += joyVec.y; }
    // camera-relative: screen-up = away from camera, screen-right = camera right
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const wx = mx * cos + mz * sin, wz = -mx * sin + mz * cos;
    const sp = Math.hypot(wx, wz);
    if (sp > 0.15) {
      const v = Math.min(sp, 1) * 2.4 * dt;
      her.root.position.x += wx / sp * v;
      her.root.position.z += wz / sp * v;
      her.root.position.x = clamp(her.root.position.x, -3.6, 3.6);
      her.root.position.z = clamp(her.root.position.z, -2.0, 2.8);
      // push out of cake
      const dx = her.root.position.x - CAKE.x, dz = her.root.position.z - CAKE.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.35 && d > 0.001) { her.root.position.x = CAKE.x + dx / d * 1.35; her.root.position.z = CAKE.z + dz / d * 1.35; }
      const targetYaw = Math.atan2(wx, wz);
      let dy = targetYaw - her.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      her.yaw += dy * Math.min(1, dt * 10);
      her.walk = (her.walk || 0) + dt * 11;
      if (!reduce && Math.random() < dt * 6)
        burst(her.root.position.clone().add(V(0, 0.1, 0.6)), 1, { col: 0xffd9e2, size: 0.035, spread: 0.3, up: 0.5, life: 0.6 });
    } else {
      her.walk = lerp(her.walk || 0, 0, 0.15);
    }
    her.root.rotation.y = her.yaw;
  }

  // ================= PER-FRAME =================
  let last = 0;
  function updateCat(c, t) {
    const ph = c.phase, br = Math.sin(t * 1.8 + ph) * 0.012;
    c.body.scale.set(1 + br * 0.5, 1 + br, 1 + br * 0.5);
    const wob = c.walk || 0;
    c.body.rotation.x = c.lean.x + Math.sin(t * 1.1 + ph) * 0.012 + (wob ? Math.sin(wob) * 0.03 : 0);
    c.body.rotation.z = c.side * c.lean.z + (wob ? Math.sin(wob * 0.5) * 0.02 : 0);
    const chew = c.face === "chew";
    c.head.rotation.set(c.lean.hx + (chew ? Math.sin(t * 15) * 0.05 : 0), c.lean.hy + Math.sin(t * 0.7 + ph) * 0.05, c.lean.hz + Math.sin(t * 1.3 + ph) * 0.025);
    c.head.position.y = 2.45 + (chew ? Math.abs(Math.sin(t * 15)) * 0.05 : 0) + (wob ? Math.abs(Math.sin(wob)) * 0.04 : 0);
    c.eo.scale.y = ((t + ph * 1.7) % 4) > 3.88 ? 0.1 : 1;
    if (c.face === "chew") c.mchew.scale.set(1, 0.8 + 0.6 * Math.abs(Math.sin(t * 15)), 0.5);
    else if (c.face === "open") c.mchew.scale.set(1.3, 1.6, 0.5);
    c.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 0.9 + ph + i * 3) * 0.06 * (((t * 0.3 + i) % 3) > 2.6 ? 3 : 0.4); });
    const hopping = partyOn && !reduce ? Math.abs(Math.sin(t * 5 + ph)) * 0.22 : 0;
    const stepping = wob ? Math.abs(Math.sin(wob)) * 0.09 : 0;
    c.root.position.y = c === her ? stepping + hopping * 0.4 : hopping;
    if (c.shadow) { c.shadow.position.x = c.root.position.x; c.shadow.position.z = c.root.position.z + 0.3; }
    if (c.feet && wob) c.feet.forEach((f, i) => { f.position.z = 0.95 + Math.sin(wob + i * Math.PI) * 0.12; });
    if (c.hat) c.hat.rotation.y = Math.sin(t * 1.4) * 0.08;
    c.tail.forEach((s, i) => {
      const k = i / 7, sw = Math.sin(t * 2.2 + i * 0.5 + ph) * 0.12 * k + (partyOn ? Math.sin(t * 9 + i * 0.4) * 0.18 * k : 0) + (wob ? Math.sin(wob * 0.7 + i * 0.5) * 0.1 * k : 0);
      s.position.set(c.side * (0.78 + 0.9 * Math.sin(k * 1.7) + sw), 0.35 + 1.5 * Math.pow(k, 1.2), -0.55 - 0.1 * k);
    });
    c.arms.forEach((a) => {
      if (!a.busy) {
        const want = partyOn ? V(c.root.position.x + a.s * 1.35, 2.2 + 0.4 * Math.sin(t * 8 + ph + a.s), c.root.position.z + 0.5) : a.rest();
        a.target.lerp(want, 0.12);
      }
    });
  }

  function frame(now) {
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    stepAnims(now);
    movePlayer(dt, t);
    cats.forEach((c) => updateCat(c, t));
    cats.forEach((c) => c.arms.forEach(solve));
    stepParts(dt);
    // environment life
    clouds.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 48) c.position.x = -48; });
    flags.forEach((f) => { f.rotation.x = Math.sin(t * 2 + f.userData.ph) * 0.28; });
    balloons.forEach((b) => { b.position.y = b.userData.y0 + Math.sin(t * 0.9 + b.userData.ph) * (partyOn ? 0.45 : 0.15); b.rotation.z = Math.sin(t * 0.7 + b.userData.ph) * 0.06; });
    petals.forEach((p) => {
      p.position.y -= p.userData.v * dt; p.position.x += Math.sin(t * 1.2 + p.userData.ph) * dt * 0.5;
      p.rotation.x += dt; p.rotation.y += dt * 0.7;
      if (p.position.y < -3.5) { p.position.y = 6; p.position.x = (Math.random() - 0.5) * 16; }
    });
    butterflies.forEach((b) => {
      const u = b.userData, tt = t * 0.5 + u.ph;
      b.position.set(u.cx + Math.sin(tt) * 2.2, 1.6 + Math.sin(tt * 1.7) * 0.7, u.cz + Math.cos(tt * 0.8) * 1.6);
      const flap = Math.sin(t * 18 + u.ph) * 0.9;
      u.l.rotation.y = flap; u.r.rotation.y = -flap;
      b.rotation.y = Math.cos(tt) > 0 ? 0.5 : -0.5;
    });
    const fp = fireGeo.attributes.position.array;
    for (let i = 0; i < fp.length; i += 3) {
      fp[i] += Math.sin(t * 0.8 + i) * dt * 0.25; fp[i + 1] += Math.cos(t * 0.6 + i * 0.3) * dt * 0.15;
    }
    fireGeo.attributes.position.needsUpdate = true;
    fireflies.material.opacity = 0.55 + Math.sin(t * 2) * 0.25;
    starMat.opacity = 0.35 + Math.sin(t * 1.3) * 0.12;
    flames.forEach((f, i) => { if (f.scale.x > 0.01) f.scale.set(Math.max(0.001, f.scale.x), Math.max(0.001, f.scale.x) * (1 + Math.sin(t * 22 + i * 2) * 0.12), Math.max(0.001, f.scale.x)); });
    candleLight.intensity = flames[0].scale.x > 0.02 ? 0.9 + Math.sin(t * 20) * 0.15 : 0;
    glow.intensity = candleLight.intensity * 0.8;
    lanternLights.forEach((L, i) => { L.pl.intensity = 0.85 + Math.sin(t * 3 + i * 2) * 0.08; });
    // camera follows Beralini
    if (!reduce && !dragging && !busy) yaw += dt * 0.045;
    const fx = her.root.position.x * 0.45, fz = 0.7 + her.root.position.z * 0.25;
    const aspect = innerWidth / innerHeight;
    const fit = aspect < 1 ? clamp(1.12 / aspect, 1, 2.3) : 1; // portrait: pull back
    const baseR = /Mobi|Android/i.test(navigator.userAgent) ? Math.max(11.5, dist) : dist;
    const R = baseR * fit;
    camera.position.set(fx + Math.sin(yaw) * Math.cos(pitch) * R, 2.1 + Math.sin(pitch) * R, fz + Math.cos(yaw) * Math.cos(pitch) * R);
    camera.lookAt(fx, 2.0, fz);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ================= FX / MUSIC =================
  const fx = $("fx");
  function confetti(n) {
    if (reduce) n = Math.min(n, 30);
    const cols = ["#ff8fb1", "#ffd98a", "#c8a0ff", "#ffffff", "#8fe0d0"];
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span"); p.className = "conf";
      p.style.cssText = "left:" + Math.random() * 100 + "vw;background:" + pick(cols) + ";animation-duration:" + (2.5 + Math.random() * 3) + "s;animation-delay:" + Math.random() * 0.8 + "s";
      fx.appendChild(p); setTimeout(() => p.remove(), 6500);
    }
  }
  function hearts(n) {
    for (let i = 0; i < n; i++) setTimeout(() => {
      const h = document.createElement("span"); h.className = "rise"; h.textContent = pick(["\u2665", "\uD83D\uDC97", "\uD83D\uDC95", "\u2728", "\uD83D\uDC31"]);
      h.style.cssText = "left:" + (15 + Math.random() * 70) + "vw;font-size:" + (18 + Math.random() * 22) + "px;color:#ffabc6";
      fx.appendChild(h); setTimeout(() => h.remove(), 5200);
    }, i * 140);
  }
  function fireworks() {
    if (reduce) return;
    for (let k = 0; k < 5; k++) setTimeout(() => {
      burst(V((Math.random() - 0.5) * 8, 4 + Math.random() * 2.5, -4), 26,
        { col: pick([0xff8fb1, 0xffd98a, 0xc8a0ff, 0x8fe0d0, 0xffffff]), size: 0.07, spread: 3.2, up: 1.2, g: -1.2, life: 1.8 });
    }, k * 350);
  }

  const btn = $("musicBtn");
  let ac = null, master = null, loopTimer = null, playing = false, userStopped = false;
  const BEAT = 0.55;
  const N = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const SONG = [["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2], ["G4", .75], ["G4", .25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", .75], ["G4", .25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 1], ["F5", .75], ["F5", .25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2]];
  const BARS = [[130.8, 329.6, 392], [98, 246.9, 293.7], [130.8, 329.6, 392], [98, 246.9, 293.7], [130.8, 329.6, 392], [130.8, 329.6, 392], [87.3, 220, 261.6], [130.8, 329.6, 392]];
  function tone(f, tt, d, v, type) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(v, tt + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, tt + d);
    o.connect(g); g.connect(master || ac.destination); o.start(tt); o.stop(tt + d + 0.05);
  }
  function song() {
    if (!playing) return;
    const t0 = ac.currentTime + 0.1; let b = 0;
    for (const sb of SONG) { const tt = t0 + b * BEAT, d = Math.max(sb[1] * BEAT * 1.1, 0.35); tone(N[sb[0]], tt, d, 0.11, "sine"); tone(N[sb[0]] * 2, tt, d * 0.6, 0.015, "triangle"); b += sb[1]; }
    BARS.forEach((bar, i) => { const tt = t0 + i * 3 * BEAT; tone(bar[0], tt, BEAT * 2, 0.07, "triangle"); for (let k = 1; k <= 2; k++) { tone(bar[1], tt + k * BEAT, BEAT * 0.8, 0.02, "sine"); tone(bar[2], tt + k * BEAT, BEAT * 0.8, 0.02, "sine"); } });
    loopTimer = setTimeout(song, (b * BEAT + 1.6) * 1000);
  }
  function begin() {
    if (playing || !ac || ac.state !== "running") return;
    playing = true; master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination); btn.classList.remove("off"); song();
  }
  function music(on) {
    try {
      if (on) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = ac || new AC(); ac.resume().then(begin).catch(() => {}); begin(); }
      else { playing = false; clearTimeout(loopTimer); if (master) { try { master.gain.cancelScheduledValues(0); } catch (e) {} master.gain.value = 0; master = null; } btn.classList.add("off"); }
    } catch (e) { /* no audio */ }
  }
  btn.addEventListener("click", (e) => { e.stopPropagation(); userStopped = playing; music(!playing); });
  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  function chime() { try { if (ac && ac.state === "running") [523, 659, 784, 1046].forEach((f, i) => tone(f, ac.currentTime + i * 0.14, 0.5, 0.08, "triangle")); } catch (e) {} }
  btn.classList.add("off"); music(true);

  // ================= STORY =================
  const dir = (deg) => V(Math.cos(deg * DEG), 0, -Math.sin(deg * DEG));
  const eatPos = (c) => mouthW(c).add(V(0, -0.3, 0.75));

  async function story() {
    // walk Beralini home first so the cut works from anywhere
    const hp = her.home;
    if (her.root.position.distanceTo(hp) > 0.1) {
      const from = her.root.position.clone();
      her.yaw = Math.atan2(hp.x - from.x, hp.z - from.z);
      await anim(900, (e) => her.root.position.lerpVectors(from, hp, e));
      her.root.rotation.y = 0; her.yaw = 0;
    }
    him.root.position.copy(him.home); him.root.rotation.y = 0;
    await Promise.all([leanTo(him, { x: 0.3, z: 0.1 }, 800), leanTo(her, { x: 0.3, z: 0.1 }, 800)]);
    setFace(him, "open"); setFace(her, "open"); await wait(350);
    flames.forEach((f) => burst(f.getWorldPosition(V(0, 0, 0)), 3, { col: 0xcccccc, size: 0.07, spread: 0.3, up: 0.6, g: 0.8, life: 1.6 }));
    await anim(450, (e) => flames.forEach((f) => f.scale.setScalar(Math.max(0.001, 1 - e))));
    setFace(him, "calm"); setFace(her, "calm"); confetti(40); chime();
    const hint = $("hint"); if (hint) { hint.textContent = "Make a wish, Beralini \uD83D\uDC31"; hint.classList.remove("off"); setTimeout(() => hint.classList.add("off"), 2200); }
    await Promise.all([leanTo(him, { x: 0, z: 0 }, 700), leanTo(her, { x: 0, z: 0 }, 700)]);
    await wait(300);

    const A = inner(her);
    await reach(A, () => knife.position.clone().add(V(0, 0.2, 0)), 1000);
    A.hold = { obj: knife, off: V(0, -0.2, 0) };
    async function cutLine(deg) {
      const d = dir(deg), p = V(CAKE.x + d.x * 0.5, 0, CAKE.z + d.z * 0.5), psi = Math.atan2(d.x, d.z);
      const rz = knife.rotation.z, ry = knife.rotation.y;
      await Promise.all([reach(A, () => V(p.x, 1.95, p.z), 800), anim(800, (e) => { knife.rotation.z = rz * (1 - e); knife.rotation.y = ry + (psi - ry) * e; })]);
      await reach(A, () => V(p.x, 0.84, p.z), 650);
      burst(V(p.x, 0.15, p.z), 10, { spread: 0.8, up: 1 }); await wait(150);
      await reach(A, () => V(p.x, 1.95, p.z), 600);
    }
    await cutLine(240); await cutLine(300);
    await anim(450, (e) => { slice.position.z = sliceBase.z + 0.2 * e; });
    await Promise.all([reach(A, () => V(1.75, 0.6, 1.95), 800), anim(800, (e) => { knife.rotation.z = (Math.PI / 2) * e; knife.rotation.y = lerp(knife.rotation.y, 0.3, e); })]);
    A.hold = null; await anim(250, (e) => { knife.position.set(KNIFE_REST.x, lerp(0.4, 0.06, e), KNIFE_REST.z); });
    park(A, 600); await wait(300);

    await reach(A, () => slice.position.clone().add(V(0, 0.3, 0.4)), 900);
    A.hold = { obj: slice, off: V(0, -0.2, -0.4) };
    setFace(him, "open");
    await Promise.all([leanTo(him, { x: 0.34, z: 0.28, hx: 0.08 }, 1100), reach(A, () => eatPos(him), 1200)]);
    await follow(A, () => eatPos(him), 350);
    setFace(him, "chew"); burst(mouthW(him), 12, { spread: 1, up: 1.2 }); hearts(5);
    await anim(350, (e) => slice.scale.setScalar(1 - 0.4 * e));
    const keepA = eatPos(him); await follow(A, () => keepA, 1500);
    setFace(him, "calm");
    const plate = V(0.2, 0, 1.95);
    await Promise.all([leanTo(him, { x: 0, z: 0, hx: 0 }, 900), reach(A, () => plate.clone().add(V(0, 0.3, 0.3)), 1000)]);
    A.hold = null; park(A, 700);

    const B = inner(him);
    await reach(B, () => slice.position.clone().add(V(0, 0.3, 0.3)), 900);
    B.hold = { obj: slice, off: V(0, -0.2, -0.3) };
    setFace(her, "open");
    await Promise.all([leanTo(her, { x: 0.34, z: 0.28, hx: 0.08 }, 1100), reach(B, () => eatPos(her), 1200)]);
    await follow(B, () => eatPos(her), 350);
    setFace(her, "chew"); burst(mouthW(her), 12, { spread: 1, up: 1.2 }); hearts(5);
    await anim(350, (e) => slice.scale.setScalar(0.6 - 0.22 * e));
    const keepB = eatPos(her); await follow(B, () => keepB, 1500);
    setFace(her, "calm");

    await anim(350, (e) => { slice.scale.setScalar(0.38 * (1 - e)); });
    slice.visible = false; B.hold = { obj: dab, off: V(0, 0.32, 0.05) }; dab.visible = true;
    await Promise.all([leanTo(her, { x: 0, z: 0, hx: 0 }, 900), reach(B, () => cheekW(her).add(V(0, -0.45, 0.3)), 1000)]);
    await reach(B, () => cheekW(her).add(V(0.05, -0.2, 0.12)), 450);
    dab.visible = false; B.hold = null; her.smear.visible = true;
    setFace(her, "happy"); await leanTo(her, { hy: -0.28, hz: -0.12 }, 250);
    await wait(500); await Promise.all([leanTo(her, { hy: 0, hz: 0 }, 600), park(B, 800)]);

    setFace(him, "happy"); setFace(her, "happy"); partyOn = true;
    confetti(160); hearts(18); fireworks(); chime();
    const title = document.querySelector(".title h1");
    if (title) title.textContent = "Happy Birthday Beralini \uD83D\uDC31";
    for (let i = 0; i < 5; i++) { await wait(1800); confetti(50); hearts(6); if (i % 2 === 0) fireworks(); }
  }

  async function play() {
    if (busy) return; busy = true;
    $("hint").classList.add("off");
    if (!userStopped) music(true);
    await wait(600);
    try { await story(); } catch (e) { console.error(e); }
    done = true; $("replay").hidden = false;
  }

  function reset() {
    partyOn = false; flames.forEach((f) => f.scale.setScalar(1));
    cats.forEach((c) => {
      setFace(c, "calm"); c.lean = { x: 0, z: 0, hx: 0, hy: 0, hz: 0 };
      c.smear.visible = false; c.arms.forEach((a) => { a.busy = false; a.hold = null; });
      c.root.position.copy(c.home); c.root.rotation.y = 0; c.yaw = 0; c.walk = 0;
    });
    slice.visible = true; slice.scale.setScalar(1); slice.position.copy(sliceBase); dab.visible = false; resetKnife();
    $("replay").hidden = true; done = false; busy = false;
  }

  function start() { if (!busy && !done) play(); }
  // tap (not drag) starts the celebration; drag orbits instead
  document.addEventListener("pointerup", (e) => {
    if (e.target.closest && e.target.closest("button")) return;
    if (moved < 9 && performance.now() - downAt < 600) start();
  });
  $("replay").addEventListener("click", (e) => { e.stopPropagation(); reset(); play(); });

  $("hint").textContent = "Tap to celebrate \u2665";
  setTimeout(() => { if (!busy) $("hint").classList.add("off"); }, 7000);
  window.__birthday = { cats: cats, start: start, her: her };
  window.__dbg = { scene: scene, camera: camera, renderer: renderer };
})();
