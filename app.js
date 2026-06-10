/* ─────────────────────────────────────────
   Globals from CDN scripts
───────────────────────────────────────── */
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════
   PAGE LOADER
═══════════════════════════════════════════ */
function runLoader() {
  const fill = document.getElementById('loaderFill');
  const pct  = document.getElementById('loaderPct');
  const el   = document.getElementById('pageLoader');
  let p = 0;

  const iv = setInterval(() => {
    p += Math.random() * 14 + 4;
    if (p >= 100) { p = 100; clearInterval(iv); }
    fill.style.width = p + '%';
    pct.textContent  = Math.round(p) + '%';
    if (p === 100) setTimeout(() => {
      el.classList.add('out');
      boot();
    }, 340);
  }, 70);
}

/* ═══════════════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════════════ */
function initCursor() {
  const dot  = document.getElementById('curDot');
  const ring = document.getElementById('curRing');
  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  /* hover state */
  document.querySelectorAll('a, button, .magnetic, .lw-complex').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  (function loop() {
    rx += (mx - rx) * 0.09;
    ry += (my - ry) * 0.09;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  })();
}

/* ═══════════════════════════════════════════
   SCROLL PROGRESS
═══════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / (h.scrollHeight - h.clientHeight)})`;
  });
}

/* ═══════════════════════════════════════════
   THREE.JS — VINYL RECORD + PARTICLES
═══════════════════════════════════════════ */
async function initThreeJS() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  /* Load Three.js lazily — if its CDN fails, skip the 3D scene
     instead of crashing the whole page. */
  let THREE;
  try {
    THREE = await import('three');
  } catch (err) {
    console.warn('Three.js failed to load — skipping 3D background.', err);
    return;
  }

  /* Scene */
  const scene  = new THREE.Scene();
  const W = window.innerWidth, H = window.innerHeight;
  const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 100);
  camera.position.set(0, 0.6, 5.5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  /* ── VINYL GROUP ── */
  const vinyl = new THREE.Group();
  scene.add(vinyl);
  vinyl.position.x = -1.8;   /* push to the left (RTL: visually right side) */
  vinyl.rotation.x  =  0.32;
  vinyl.rotation.y  =  0.28;

  /* Main disc */
  const discMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c0c14,
    metalness: 0.96, roughness: 0.04,
    reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.04,
  });
  vinyl.add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.065, 128), discMat));

  /* Groove rings */
  const grooveMat = new THREE.LineBasicMaterial({ color: 0x1c1c28, transparent: true, opacity: 0.65 });
  for (let r = 0.62; r < 1.88; r += 0.052) {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.038, Math.sin(a) * r));
    }
    vinyl.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), grooveMat));
  }

  /* Center label */
  const labelMat = new THREE.MeshStandardMaterial({
    color: 0x5b21b6, roughness: 0.35, metalness: 0.2,
    emissive: 0x3b0764, emissiveIntensity: 0.4,
  });
  vinyl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 64), labelMat));

  /* Center hole */
  const holeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  holeMesh.position.y = 0.01;
  vinyl.add(holeMesh);

  /* Glowing edge ring */
  const edgeGeo = new THREE.TorusGeometry(2.03, 0.035, 14, 128);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.5 });
  const edgeRing = new THREE.Mesh(edgeGeo, edgeMat);
  edgeRing.rotation.x = Math.PI / 2;
  vinyl.add(edgeRing);

  /* ── PARTICLES ── */
  const N = 2800;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const c1  = new THREE.Color(0x7c3aed);
  const c2  = new THREE.Color(0x06b6d4);
  const c3  = new THREE.Color(0xf59e0b);

  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r  = 2.8 + Math.random() * 5.5;
    pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    pos[i*3+2] = r * Math.cos(ph);
    const mix = Math.random();
    const c = mix < 0.5 ? c1.clone().lerp(c2, mix * 2) : c2.clone().lerp(c3, (mix - 0.5) * 2);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.024, vertexColors: true, transparent: true, opacity: 0.62, sizeAttenuation: true });
  const stars = new THREE.Points(pGeo, pMat);
  scene.add(stars);

  /* ── AMBIENT RINGS (audio-wave feel) ── */
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const rGeo = new THREE.TorusGeometry(2.5 + i * 0.55, 0.008, 8, 128);
    const rMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.12 - i * 0.03 });
    const ring = new THREE.Mesh(rGeo, rMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.x = -1.8;
    scene.add(ring);
    rings.push(ring);
  }

  /* ── LIGHTING ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const pLight1 = new THREE.PointLight(0x7c3aed, 5, 14);
  pLight1.position.set(3, 3, 4);
  scene.add(pLight1);

  const pLight2 = new THREE.PointLight(0x06b6d4, 3, 12);
  pLight2.position.set(-4, -1.5, 3);
  scene.add(pLight2);

  const dLight = new THREE.DirectionalLight(0xffffff, 0.35);
  dLight.position.set(0, 8, 2);
  scene.add(dLight);

  /* ── MOUSE TRACKING ── */
  let mx = 0, my = 0, tx = 0, ty = 0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth  - 0.5);
    my = (e.clientY / window.innerHeight - 0.5) * -1;
  });

  /* ── ANIMATION LOOP ── */
  let t = 0;
  (function animate() {
    requestAnimationFrame(animate);
    t += 0.005;

    tx += (mx * 0.55 - tx) * 0.038;
    ty += (my * 0.35 - ty) * 0.038;

    vinyl.rotation.z  += 0.004;
    vinyl.rotation.y   = 0.28 + tx * 0.55;
    vinyl.rotation.x   = 0.32 + ty * 0.3;
    vinyl.position.y   = Math.sin(t * 0.9) * 0.1;

    edgeMat.opacity = 0.28 + Math.sin(t * 2.2) * 0.18;
    rings.forEach((r, i) => {
      r.scale.setScalar(1 + Math.sin(t * 1.5 + i * 1.1) * 0.04);
      r.material.opacity = (0.1 - i * 0.025) + Math.sin(t * 1.8 + i) * 0.04;
    });

    stars.rotation.y = t * 0.04;
    stars.rotation.x = t * 0.018;

    pLight1.position.x = Math.sin(t) * 3.5;
    pLight1.position.z = Math.cos(t) * 3 + 2;
    pLight2.position.x = Math.cos(t * 0.7) * -3.5;

    renderer.render(scene, camera);
  })();

  /* Entry animation */
  gsap.from(vinyl.scale, { x: 0, y: 0, z: 0, duration: 1.4, ease: 'back.out(1.5)', delay: 0.5 });

  /* Resize */
  window.addEventListener('resize', () => {
    const W2 = window.innerWidth, H2 = window.innerHeight;
    camera.aspect = W2 / H2;
    camera.updateProjectionMatrix();
    renderer.setSize(W2, H2);
  });
}

/* ═══════════════════════════════════════════
   GSAP ANIMATIONS
═══════════════════════════════════════════ */
function initGSAP() {
  /* ── NAV scroll class ── */
  ScrollTrigger.create({
    start: 'top -70',
    onUpdate: s => document.getElementById('mainNav').classList.toggle('scrolled', s.scroll() > 70),
  });

  /* ── Hero title lines ── */
  gsap.to('.hl', {
    clipPath: 'inset(0 0 0% 0)',
    y: 0,
    duration: 1.0,
    stagger: 0.14,
    ease: 'power3.out',
    delay: 0.25,
  });

  /* ── Hero sub, actions, proof ── */
  gsap.to(['.hero-badge', '.hero-sub', '.hero-actions', '.hero-proof'], {
    opacity: 1, y: 0,
    duration: 0.85,
    stagger: 0.1,
    ease: 'power2.out',
    delay: 0.6,
  });

  /* ── Section title reveals ── */
  document.querySelectorAll('.tr').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%' },
      y: 55, opacity: 0,
      duration: 0.85, ease: 'power3.out',
    });
  });

  /* ── Staggered card grids ── */
  ['.steps-grid .reveal-card', '.songs-grid .reveal-card', '.plans-grid .reveal-card'].forEach(sel => {
    gsap.to(sel, {
      scrollTrigger: { trigger: sel.split(' ')[0], start: 'top 80%' },
      opacity: 1, y: 0,
      duration: 0.7, stagger: 0.1, ease: 'power2.out',
    });
  });

  /* ── Single reveal-up blocks ── */
  document.querySelectorAll('.reveal-up').forEach(el => {
    gsap.to(el, {
      scrollTrigger: { trigger: el, start: 'top 82%' },
      opacity: 1, y: 0,
      duration: 0.9, ease: 'power2.out',
    });
  });

  /* ── Canvas parallax on scroll ── */
  gsap.to('#heroCanvas', {
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.2,
    },
    y: 130, scale: 0.96,
    transformOrigin: 'center center',
  });

  /* ── Hero content fade on scroll ── */
  gsap.to('.hero-body', {
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '40% top',
      scrub: 1,
    },
    opacity: 0, y: -30,
  });
}

/* ═══════════════════════════════════════════
   MAGNETIC BUTTONS
═══════════════════════════════════════════ */
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width  / 2;
      const y = e.clientY - r.top  - r.height / 2;
      gsap.to(el, { x: x * 0.27, y: y * 0.27, duration: 0.3, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.75, ease: 'elastic.out(1, 0.42)' });
    });
  });
}

/* ═══════════════════════════════════════════
   LYRICS — highlight active line on scroll
═══════════════════════════════════════════ */
function initLyricsHighlight() {
  const lines = document.querySelectorAll('.lyric-line');
  if (!lines.length) return;

  lines.forEach((line, i) => {
    gsap.from(line, {
      scrollTrigger: { trigger: line, start: 'top 78%' },
      opacity: 0, x: -20,
      duration: 0.6, delay: i * 0.1, ease: 'power2.out',
    });
  });
}

/* ═══════════════════════════════════════════
   BOOT — called after loader finishes
═══════════════════════════════════════════ */
function boot() {
  initGSAP();
  initLyricsHighlight();
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initScrollProgress();
  initThreeJS();
  initMagnetic();
  runLoader();
});
