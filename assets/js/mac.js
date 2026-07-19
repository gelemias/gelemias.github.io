/* ==========================================================================
   GUILLERMO R. DELGADO — hero toy
   A low-poly Macintosh Classic (with keyboard + mouse) that floats behind the
   name and reacts to the pointer. Self-hosted Three.js, no external requests.
   Degrades to nothing if WebGL is unavailable; static if reduced-motion.

   Uses Three.js (r160, MIT) — vendored at assets/js/vendor/three.module.min.js
   ========================================================================== */
import * as THREE from "/assets/js/vendor/three.module.min.js";

const canvas = document.getElementById("mac3d");
if (canvas) init(canvas);

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) { return false; }
}

function init(canvas) {
  if (!webglOK()) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = canvas.closest(".hero") || canvas.parentElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.6, 9.2);
  camera.lookAt(0, 0.1, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* --- materials --------------------------------------------------------- */
  const beige   = new THREE.MeshStandardMaterial({ color: 0xdcd5c4, roughness: 0.72, metalness: 0.02 });
  const beigeHi = new THREE.MeshStandardMaterial({ color: 0xe7e1d2, roughness: 0.7,  metalness: 0.02 });
  const dark    = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.6,  metalness: 0.05 });
  const bezel   = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.5,  metalness: 0.1 });

  const VOLT = 0xd7ff2e;

  /* --- the machine ------------------------------------------------------- */
  const mac = new THREE.Group();

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    mac.add(m);
    return m;
  };

  // main body
  box(2.15, 3.0, 2.35, beige, 0, 0, 0);
  // slightly proud front plate
  box(2.0, 2.86, 0.06, beigeHi, 0, 0.02, 1.2);
  // recessed screen bezel
  box(1.72, 1.46, 0.14, bezel, 0, 0.58, 1.22);
  // the glowing screen
  const screenTex = makeScreenTexture();
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 1.12),
    new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
  );
  screen.position.set(0, 0.6, 1.31);
  mac.add(screen);
  // floppy slot
  box(0.92, 0.07, 0.06, dark, 0.2, -0.5, 1.24);
  // chin brand groove
  box(1.15, 0.02, 0.04, bezel, 0, -0.98, 1.23);
  // little rainbow tab (volt accent)
  box(0.12, 0.22, 0.05, new THREE.MeshBasicMaterial({ color: VOLT, toneMapped: false }), -0.78, -0.86, 1.24);
  // top vents
  for (let i = 0; i < 5; i++) box(1.3, 0.03, 0.03, bezel, 0, 1.32, -0.7 + i * 0.28);

  // keyboard
  const kb = box(2.55, 0.16, 0.92, beigeHi, 0, -1.62, 2.35);
  kb.rotation.x = -0.04;
  const kbTex = makeKeyboardTexture();
  const kbTop = new THREE.Mesh(
    new THREE.PlaneGeometry(2.5, 0.86),
    new THREE.MeshStandardMaterial({ map: kbTex, roughness: 0.8 })
  );
  kbTop.rotation.x = -Math.PI / 2 - 0.04;
  kbTop.position.set(0, -1.53, 2.35);
  mac.add(kbTop);

  // mouse
  const mouse = box(0.44, 0.17, 0.56, beigeHi, 1.72, -1.6, 2.15);
  box(0.16, 0.02, 0.22, bezel, 1.72, -1.5, 2.05); // button groove
  // mouse cable
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.72, -1.6, 1.9),
    new THREE.Vector3(1.55, -1.66, 2.05),
    new THREE.Vector3(1.3, -1.62, 2.25),
    new THREE.Vector3(1.2, -1.6, 2.35),
  ]);
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, 0.02, 6, false),
    new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.7 })
  );
  mac.add(cable);

  // base orientation (three-quarter view)
  const BASE_RY = -0.42, BASE_RX = 0.14;
  mac.rotation.set(BASE_RX, BASE_RY, 0);
  scene.add(mac);

  /* --- lights ------------------------------------------------------------ */
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-4, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
  fill.position.set(5, -2, 3);
  scene.add(fill);
  const rim = new THREE.PointLight(VOLT, 26, 20, 2);   // neon edge
  rim.position.set(3.4, 1.6, -2.2);
  scene.add(rim);

  /* --- responsive sizing ------------------------------------------------- */
  let baseY = 0;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // frame the toy: sit it to the right on wide screens, smaller / higher on narrow
    const wide = w / h;
    const s = THREE.MathUtils.clamp(w / 1500, 0.62, 1.15);
    mac.scale.setScalar(s);
    mac.position.x = wide > 1.1 ? 1.7 * s : 0.1;
    baseY = wide > 1.1 ? 0.15 : 0.9;
    mac.position.y = baseY;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  /* --- reduced motion: one static frame ---------------------------------- */
  if (reduce) { renderer.render(scene, camera); canvas.classList.add("ready"); return; }

  /* --- pointer parallax + idle float ------------------------------------- */
  const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let running = false, raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();

    target.x = BASE_RY + pointer.x * 0.55 + Math.sin(t * 0.35) * 0.05;
    target.y = BASE_RX - pointer.y * 0.32 + Math.sin(t * 0.5) * 0.03;
    mac.rotation.y += (target.x - mac.rotation.y) * 0.06;
    mac.rotation.x += (target.y - mac.rotation.x) * 0.06;
    mac.position.y = baseY + Math.sin(t * 0.8) * 0.09;

    renderer.render(scene, camera);
  }

  function start() { if (!running) { running = true; clock.getDelta(); frame(); } }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  // pause when the hero scrolls out of view or the tab is hidden
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => {
      en[0].isIntersecting ? start() : stop();
    }, { threshold: 0.01 }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  start();                  // kick off
  requestAnimationFrame(() => canvas.classList.add("ready"));
}

/* ==========================================================================
   Textures
   ========================================================================== */
function makeScreenTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  // dark CRT
  g.fillStyle = "#0a0f0a"; g.fillRect(0, 0, 256, 256);
  const grad = g.createRadialGradient(128, 120, 20, 128, 128, 170);
  grad.addColorStop(0, "#12210f"); grad.addColorStop(1, "#080b08");
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);

  // Happy Mac
  g.strokeStyle = "#d7ff2e"; g.fillStyle = "#d7ff2e";
  g.lineWidth = 7; g.lineJoin = "round";
  roundRect(g, 86, 70, 84, 104, 10); g.stroke();          // little mac body
  roundRect(g, 98, 84, 60, 46, 6); g.stroke();            // its screen
  g.fillRect(150, 150, 10, 5);                            // disk slot
  // smiley in the tiny screen
  g.fillRect(112, 100, 6, 6); g.fillRect(138, 100, 6, 6); // eyes
  g.lineWidth = 5;
  g.beginPath(); g.arc(128, 108, 12, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();

  // scanlines
  g.globalAlpha = 0.09; g.fillStyle = "#000";
  for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 256, 2);
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeKeyboardTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 176;
  const g = c.getContext("2d");
  g.fillStyle = "#e7e1d2"; g.fillRect(0, 0, 512, 176);
  g.fillStyle = "#cfc7b4";
  const cols = 15, rows = 4, m = 12, kw = (512 - m * 2) / cols, kh = 30, gap = 3;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = m + col * kw + gap, y = 14 + r * (kh + gap);
      const w = (r === rows - 1 && col === 4) ? kw * 6 - gap * 2 : kw - gap * 2; // spacebar
      if (r === rows - 1 && col > 4 && col < 10) continue;
      roundRect(g, x, y, w, kh - gap, 4); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
