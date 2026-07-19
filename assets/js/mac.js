/* ==========================================================================
   GUILLERMO R. DELGADO — hero toy
   Loads a floating retro Macintosh (.glb) that reacts to the pointer.
   Self-hosted Three.js + GLTFLoader — no external requests.
   Degrades to nothing without WebGL; renders one static frame if reduced-motion;
   pauses when the hero scrolls away or the tab is hidden.

   Model:  assets/models/retro-mac.glb  (vertex-coloured, ~52 KB)
   Three.js (r160, MIT) — vendored under assets/js/vendor/
   ========================================================================== */
import * as THREE from "three";
import { GLTFLoader } from "/assets/js/vendor/GLTFLoader.js";

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
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.6, 11);

  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  /* --- lights ------------------------------------------------------------ */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8173, 2.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-5, 8, 7);
  scene.add(key);
  const rimc = new THREE.DirectionalLight(0xb8c6d7, 1.8);
  rimc.position.set(6, 2, -5);
  scene.add(rimc);
  const volt = new THREE.PointLight(0xd7ff2e, 14, 26, 2);   // subtle brand edge
  volt.position.set(4.6, 2.6, -3);
  scene.add(volt);

  /* --- palette (assigned by mesh name; the .glb ships no materials) ------ */
  const beige     = new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.62, metalness: 0.02 });
  const beigeDark = new THREE.MeshStandardMaterial({ color: 0xa89f8b, roughness: 0.68, metalness: 0.02 });
  const keyMat    = new THREE.MeshStandardMaterial({ color: 0xd8ceb9, roughness: 0.7,  metalness: 0.02 });
  const dark      = new THREE.MeshStandardMaterial({ color: 0x1f2427, roughness: 0.45, metalness: 0.05 });
  const cableMat  = new THREE.MeshStandardMaterial({ color: 0xb8ad98, roughness: 0.72, metalness: 0.02 });
  const screenGlow = new THREE.MeshStandardMaterial({
    color: 0xa9c5ce, emissive: 0x6c8f9b, emissiveIntensity: 0.6, roughness: 0.36, metalness: 0
  });
  const materialFor = (n) => {
    if (/screen/.test(n)) return screenGlow;
    if (/bezel|floppy/.test(n)) return dark;
    if (/cable/.test(n)) return cableMat;
    if (/^key_|space_bar/.test(n)) return keyMat;
    if (/computer_base|lower_panel|mouse_button/.test(n)) return beigeDark;
    return beige;   // case, keyboard_base, mouse_body, vents
  };

  /* --- rig + model ------------------------------------------------------- */
  const rig = new THREE.Group();
  scene.add(rig);
  let model = null;
  const BASE_RY = 0.12, BASE_RX = -0.04;

  new GLTFLoader().load(
    "/assets/models/retro-mac.glb",
    (gltf) => {
      model = gltf.scene;
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = o.receiveShadow = false;
        // the .glb ships no normals — lighting needs them
        if (o.geometry && !o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        o.material = materialFor(o.name || "");
      });
      // centre the assembly on the rig origin
      const box = new THREE.Box3().setFromObject(model);
      box.getCenter(model.position).multiplyScalar(-1);
      rig.add(model);
      resize();
      canvas.classList.add("ready");
      if (reduce) draw();
    },
    undefined,
    () => { /* model failed to load — hero still fine */ }
  );

  /* --- pointer + responsive framing -------------------------------------- */
  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  let baseY = 0, camBaseY = 0.6;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.1;
    if (wide) {
      camera.position.z = 11;  camBaseY = 0.6;
      rig.position.x = 1.9;    rig.scale.setScalar(1.0);
      baseY = 0.1;
    } else {
      camera.position.z = 14;  camBaseY = 0.4;
      rig.position.x = 0.2;    rig.scale.setScalar(0.82);
      baseY = 0.6;
    }
    rig.position.y = baseY;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const draw = () => renderer.render(scene, camera);

  /* --- reduced motion: static (draw happens once the model is in) -------- */
  if (reduce) {
    rig.rotation.set(BASE_RX, BASE_RY, 0);
    camera.lookAt(0, 0, 0);
    draw();
    return;
  }

  /* --- animation loop ---------------------------------------------------- */
  let running = false, raf = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    smooth.lerp(pointer, 0.06);
    const px = smooth.x, py = smooth.y;

    rig.rotation.y += ((BASE_RY + px * 0.33) - rig.rotation.y) * 0.05;
    rig.rotation.x += ((BASE_RX - py * 0.20) - rig.rotation.x) * 0.05;
    rig.position.y = baseY + Math.sin(t * 0.75) * 0.12;

    camera.position.x += ((px * 0.5) - camera.position.x) * 0.03;
    camera.position.y += ((camBaseY + py * 0.25) - camera.position.y) * 0.03;
    camera.lookAt(0, -0.1, 0);

    draw();
  }

  function start() { if (!running) { running = true; frame(); } }
  function stop()  { running = false; cancelAnimationFrame(raf); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => { en[0].isIntersecting ? start() : stop(); },
      { threshold: 0.01 }).observe(hero);
  }
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });

  start();
}
