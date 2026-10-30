import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Keycaps printed with my stack, drifting toward wandering targets, pushing off each other and the cursor.
const LEGENDS = ['py', 'sql', 'ts', 'js', '{ }', 'git', 'pg', 'api', '>_', '⌘', 'esc', '⏎', 'fast', 'c', '$', 'ctrl', 'docker', '=>', 'flask', '502?'];
const STYLES = {
  dark: { body: '#1c1c1c', ink: '#f0eee9' },
  paper: { body: '#e6eaf1', ink: '#141414' },
  accent: { body: '#3d7bff', ink: '#0a0b0d' },
  glass: { body: null, ink: '#3d7bff' },
};

function legendTexture(text, ink) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const size = text.length > 4 ? 64 : text.length > 2 ? 84 : 110;
  g.font = `600 ${size}px "Space Grotesk", sans-serif`;
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export async function initScene(canvas, { reduced }) {
  // legends are drawn to canvas, so the webfont must be ready first
  await document.fonts.load('600 84px "Space Grotesk"').catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e4e9f2');
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  camera.position.z = 20;

  const mobile = innerWidth <= 812;
  const total = mobile ? 12 : 20;
  const bodyGeo = new RoundedBoxGeometry(1, 0.55, 1, 4, 0.16);
  const legendGeo = new THREE.PlaneGeometry(0.8, 0.8);
  const bodyMats = {
    dark: new THREE.MeshStandardMaterial({ color: STYLES.dark.body, roughness: 0.55, metalness: 0.1 }),
    paper: new THREE.MeshStandardMaterial({ color: STYLES.paper.body, roughness: 0.6, metalness: 0 }),
    accent: new THREE.MeshStandardMaterial({ color: STYLES.accent.body, roughness: 0.45, metalness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({ transmission: 1, roughness: 0.06, thickness: 1.2, ior: 1.5, clearcoat: 1 }),
  };
  const kinds = (i) => (i === 0 ? 'accent' : ['dark', 'dark', 'accent', 'paper', 'dark', 'glass', 'accent', 'dark', 'paper'][i % 9]);

  const spread = (n) => (Math.random() * 2 - 1) * n;
  const bodies = Array.from({ length: total }, (_, i) => {
    const kind = kinds(i);
    const text = i === 0 ? 'mt' : LEGENDS[(i - 1) % LEGENDS.length];
    const group = new THREE.Group();
    group.add(new THREE.Mesh(bodyGeo, bodyMats[kind]));
    const legend = new THREE.Mesh(legendGeo, new THREE.MeshStandardMaterial({
      map: legendTexture(text, STYLES[kind].ink), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    legend.rotation.x = -Math.PI / 2;
    legend.position.y = 0.276;
    group.add(legend);
    group.position.set(spread(mobile ? 4 : 9), spread(4), spread(2));
    group.scale.setScalar(mobile ? 0.95 : 1.1);
    scene.add(group);
    return {
      mesh: group,
      vel: new THREE.Vector3(),
      f: 20 + Math.random() * 80,
      fx: spread(mobile ? 7 : 20), fy: spread(10), fz: spread(10),
      // wobble around "legend facing camera" so keys stay readable
      ph: [Math.random() * 6, Math.random() * 6, Math.random() * 6],
      sp: [0.3 + Math.random() * 0.4, 0.25 + Math.random() * 0.4, 0.2 + Math.random() * 0.3],
      rz: spread(0.5),
    };
  });

  // cursor projected onto the z=0 plane
  const pointer = new THREE.Vector3(999, 999, 0);
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, pointer);
  });
  canvas.parentElement.addEventListener('pointerleave', () => pointer.set(999, 999, 0));

  let halfW = 5, halfH = 3.5;
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    if (reduced) renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();

  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const RADIUS = mobile ? 0.75 : 0.85;
  const clock = new THREE.Clock();
  let elapsed = 0;

  function step(dt) {
    elapsed += dt;
    for (const b of bodies) {
      const t = b.f + 0.25 * elapsed;
      target.set(
        Math.cos(t) + Math.sin(t) / 10 + b.fx + Math.cos((t / 10) * b.f) + (Math.sin(t) * b.f) / 10,
        Math.sin(t) + Math.cos(2 * t) / 10 + b.fy + Math.sin((t / 10) * b.f) + (Math.cos(2 * t) * b.f) / 10,
        Math.sin(t) + b.fz * 0.3,
      );
      // keep targets inside the visible frame
      target.x = THREE.MathUtils.clamp(target.x, -halfW * 0.85, halfW * 0.85);
      target.y = THREE.MathUtils.clamp(target.y, -halfH * 0.8, halfH * 0.8);
      target.z = THREE.MathUtils.clamp(target.z, -4, 2.5);

      tmp.subVectors(target, b.mesh.position).normalize().multiplyScalar(6 * dt);
      b.vel.add(tmp);

      tmp.subVectors(b.mesh.position, pointer);
      tmp.z = 0;
      const d = tmp.length();
      if (d < 2.4) b.vel.add(tmp.normalize().multiplyScalar((2.4 - d) * 40 * dt));

      b.vel.multiplyScalar(Math.exp(-2.4 * dt));
      b.mesh.position.addScaledVector(b.vel, dt);
      const e = elapsed;
      b.mesh.rotation.set(
        1.15 + Math.sin(e * b.sp[0] + b.ph[0]) * 0.35 + b.vel.y * 0.08,
        Math.sin(e * b.sp[1] + b.ph[1]) * 0.45 - b.vel.x * 0.08,
        b.rz + Math.sin(e * b.sp[2] + b.ph[2]) * 0.3,
      );
    }
    // soft sphere collisions
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i].mesh.position, c = bodies[j].mesh.position;
        tmp.subVectors(a, c);
        const d = tmp.length();
        if (d > 0 && d < RADIUS * 2) {
          tmp.multiplyScalar((RADIUS * 2 - d) / d / 2);
          a.add(tmp);
          c.sub(tmp);
        }
      }
    }
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  if (reduced) {
    for (let i = 0; i < 240; i++) step(1 / 60);
    renderer.render(scene, camera);
    return;
  }
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    if (!visible || document.hidden) return;
    step(dt);
    renderer.render(scene, camera);
  });
}
