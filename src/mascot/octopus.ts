/*
  Orangopus mascot: a small toon-shaded 3D octopus drawn with three.js.

  Everything is built from primitives (no model file to download), and three.js is only loaded
  when a mascot is on screen, so it doesn't slow down the rest of the site.

    const octo = createOctopus(canvas);
    octo.setMood("thinking");   // "idle" | "thinking" | "happy"
    octo.destroy();
*/

import {
  AmbientLight,
  CircleGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  RedFormat,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer
} from "three";

export type OctopusMood = "idle" | "thinking" | "happy";

export interface Octopus {
  setMood(mood: OctopusMood): void;
  destroy(): void;
}

export interface OctopusOptions {
  color?: string;
  /** Follow the pointer with the eyes. Defaults to true. */
  lookAtPointer?: boolean;
}

const TENTACLES = 8;
const BEADS = 22;

export function createOctopus(canvas: HTMLCanvasElement, options: OctopusOptions = {}): Octopus {
  const color = new Color(options.color || "#ff913d");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.12, 6.4);

  scene.add(new AmbientLight(0xffffff, 1.1));
  const sun = new DirectionalLight(0xffffff, 1.9);
  sun.position.set(2.5, 3.5, 4);
  scene.add(sun);

  // Three flat bands of shade give the soft cartoon look.
  const gradient = new DataTexture(new Uint8Array([90, 175, 255]), 3, 1, RedFormat);
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.needsUpdate = true;

  const disposables: { dispose(): void }[] = [gradient];
  const track = <T extends { dispose(): void }>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  const skin = track(new MeshToonMaterial({ color, gradientMap: gradient }));
  const dark = track(new MeshBasicMaterial({ color: 0x2a1405 }));
  const white = track(new MeshBasicMaterial({ color: 0xffffff }));
  const blush = track(new MeshBasicMaterial({ color: 0xff5e7e, transparent: true, opacity: 0.55, depthWrite: false }));

  const octo = new Group();
  scene.add(octo);

  // Head
  const head = new Mesh(track(new SphereGeometry(1, 48, 32)), skin);
  head.scale.set(1.02, 0.94, 0.96);
  head.position.y = 0.38;
  octo.add(head);

  // Face sits on the front of the head and moves with it.
  const face = new Group();
  face.position.copy(head.position);
  octo.add(face);

  const eyeGeo = track(new SphereGeometry(0.16, 24, 16));
  const glintGeo = track(new SphereGeometry(0.05, 12, 8));
  const eyes: Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeGeo, dark);
    eye.position.set(side * 0.34, 0.02, 0.9);
    eye.scale.set(1, 1.12, 0.6);
    const glint = new Mesh(glintGeo, white);
    glint.position.set(-0.05, 0.07, 0.13);
    eye.add(glint);
    face.add(eye);
    eyes.push(eye);

    const cheek = new Mesh(track(new CircleGeometry(0.13, 24)), blush);
    cheek.position.set(side * 0.6, -0.2, 0.79);
    cheek.lookAt(cheek.position.clone().multiplyScalar(2));
    cheek.scale.set(1.25, 0.8, 1);
    face.add(cheek);
  }

  const smile = new Mesh(track(new TorusGeometry(0.085, 0.024, 8, 20, Math.PI)), dark);
  smile.position.set(0, -0.2, 0.93);
  smile.rotation.z = Math.PI;
  face.add(smile);

  // Tentacles: a chain of shrinking beads each, one instanced mesh for all eight.
  const beadGeo = track(new SphereGeometry(1, 16, 12));
  const beads = new InstancedMesh(beadGeo, skin, TENTACLES * BEADS);
  track(beads);
  octo.add(beads);
  const dummy = new Object3D();

  let mood: OctopusMood = "idle";
  let hopStart = -10;
  const pointer = { x: 0, y: 0 };
  const look = new Vector3();

  function placeTentacles(t: number, speed: number) {
    let i = 0;
    for (let k = 0; k < TENTACLES; k++) {
      const base = (k / TENTACLES) * Math.PI * 2 + Math.PI / TENTACLES;
      for (let b = 0; b < BEADS; b++) {
        const s = b / (BEADS - 1);
        const wave = Math.sin(t * speed + k * 1.3 - s * 3.2) * 0.22 * s;
        const angle = base + wave * 0.9;
        const radius = 0.58 + 0.55 * s + 0.12 * Math.sin(t * speed * 0.8 + k + s * 2) * s;
        const y = -0.28 - 0.95 * s + 0.55 * s * s * s + Math.sin(t * speed + k * 0.7 + s * 4) * 0.07 * s;
        dummy.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius * 0.85);
        dummy.scale.setScalar(0.27 * (1 - s * 0.72));
        dummy.updateMatrix();
        beads.setMatrixAt(i++, dummy.matrix);
      }
    }
    beads.instanceMatrix.needsUpdate = true;
  }

  function onPointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    pointer.x = MathUtils.clamp((e.clientX - cx) / 400, -1, 1);
    pointer.y = MathUtils.clamp((e.clientY - cy) / 400, -1, 1);
  }
  if (options.lookAtPointer !== false && !reducedMotion) {
    window.addEventListener("pointermove", onPointer, { passive: true });
  }

  function resize() {
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { resize(); if (reducedMotion) frame(0); }) : null;
  resizeObserver?.observe(canvas);
  resize();

  let nextBlink = 1.5;
  function frame(t: number) {
    const thinking = mood === "thinking";
    const speed = thinking ? 4.2 : 1.9;

    // Gentle float, a hop when happy.
    const hopT = t - hopStart;
    const hop = hopT >= 0 && hopT < 0.7 ? Math.sin((hopT / 0.7) * Math.PI) * 0.45 : 0;
    octo.position.y = Math.sin(t * (thinking ? 3.2 : 1.6)) * 0.07 + hop;
    const squash = hopT >= 0 && hopT < 0.7 ? 1 + Math.sin((hopT / 0.7) * Math.PI * 2) * 0.05 : 1;
    octo.scale.set(1 / squash, squash, 1 / squash);

    // Where the eyes and head point.
    const target = thinking
      ? look.set(0.45, -0.55, 0)
      : look.set(pointer.x, pointer.y, 0);
    octo.rotation.y = MathUtils.lerp(octo.rotation.y, target.x * 0.35 + Math.sin(t * 0.7) * 0.12, 0.08);
    octo.rotation.x = MathUtils.lerp(octo.rotation.x, target.y * 0.2, 0.08);
    octo.rotation.z = thinking ? Math.sin(t * 2.4) * 0.08 : MathUtils.lerp(octo.rotation.z, 0, 0.1);
    for (const eye of eyes) {
      eye.position.x = MathUtils.lerp(eye.position.x, Math.sign(eye.position.x) * 0.34 + target.x * 0.06, 0.15);
      eye.position.y = MathUtils.lerp(eye.position.y, 0.02 - target.y * 0.05, 0.15);
    }

    // Blink every few seconds.
    if (t > nextBlink + 0.14) nextBlink = t + 2.2 + Math.random() * 2.8;
    const blinking = t > nextBlink;
    for (const eye of eyes) eye.scale.y = blinking ? 0.12 : 1.12;

    // Happy: a wider grin for a moment.
    const grin = mood === "happy" || hopT < 1.4 ? 1.35 : thinking ? 0.7 : 1;
    smile.scale.x = MathUtils.lerp(smile.scale.x, grin, 0.15);
    smile.scale.y = smile.scale.x;

    placeTentacles(t, speed);
    renderer.render(scene, camera);
  }

  let raf = 0;
  let visible = true;
  const start = performance.now();
  function loop() {
    raf = 0;
    if (!visible || document.hidden) return;
    frame((performance.now() - start) / 1000);
    raf = requestAnimationFrame(loop);
  }
  function wake() {
    if (reducedMotion) {
      frame(0);
    } else if (!raf) {
      raf = requestAnimationFrame(loop);
    }
  }
  const intersection = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(entries => {
        visible = entries.some(e => e.isIntersecting);
        if (visible) wake();
      })
    : null;
  intersection?.observe(canvas);
  document.addEventListener("visibilitychange", wake);
  wake();

  return {
    setMood(next: OctopusMood) {
      if (next === "happy" && mood !== "happy") hopStart = (performance.now() - start) / 1000;
      mood = next;
      if (reducedMotion) frame(0);
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", wake);
      resizeObserver?.disconnect();
      intersection?.disconnect();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
