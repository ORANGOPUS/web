/*
  Orangopus mascot: a small toon-shaded 3D octopus drawn with three.js.

  Everything is built from primitives (no model file to download), and three.js is only loaded
  when a mascot is on screen, so it doesn't slow down the rest of the site.

    const octo = createOctopus(canvas);
    octo.setMood("thinking");   // "idle" | "thinking" | "happy"
    octo.destroy();

  Moods, each readable as a still pose too (reduced motion shows the pose without animating):
    idle      sits on the ground, looks at the pointer, blinks, tentacles sway slowly
    thinking  head tilted, eyes up and squinting, little "o" mouth, thought bubbles, fidgety tentacles
    happy     closed ^ ^ eyes, open grin, two arms waving in the air, bouncing on the spot
*/

import {
  AmbientLight,
  CircleGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
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
  RGBAFormat,
  Scene,
  SphereGeometry,
  TorusGeometry,
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
const GROUND = -1.12;
// Tentacles 0 and 7 sit at the front; they're the ones that wave when happy.
const WAVING: Record<number, number> = { 0: 1, 7: -1 };

export function createOctopus(canvas: HTMLCanvasElement, options: OctopusOptions = {}): Octopus {
  const color = new Color(options.color || "#ff913d");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.32, 7.2);

  scene.add(new AmbientLight(0xffffff, 1.1));
  const sun = new DirectionalLight(0xffffff, 1.9);
  sun.position.set(2.5, 3.5, 4);
  scene.add(sun);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  // Three flat bands of shade give the soft cartoon look.
  const gradient = track(new DataTexture(new Uint8Array([90, 175, 255]), 3, 1, RedFormat));
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.needsUpdate = true;

  // Soft round shadow so the octopus sits on the ground.
  const shadowSize = 64;
  const shadowPixels = new Uint8Array(shadowSize * shadowSize * 4);
  for (let y = 0; y < shadowSize; y++) {
    for (let x = 0; x < shadowSize; x++) {
      const d = Math.hypot(x - shadowSize / 2 + 0.5, y - shadowSize / 2 + 0.5) / (shadowSize / 2);
      shadowPixels[(y * shadowSize + x) * 4 + 3] = Math.round(255 * Math.max(0, 1 - d) ** 1.6);
    }
  }
  const shadowTexture = track(new DataTexture(shadowPixels, shadowSize, shadowSize, RGBAFormat));
  shadowTexture.needsUpdate = true;

  const skin = track(new MeshToonMaterial({ color, gradientMap: gradient }));
  const dark = track(new MeshBasicMaterial({ color: 0x2a1405, side: DoubleSide }));
  const white = track(new MeshBasicMaterial({ color: 0xffffff }));
  const tongue = track(new MeshBasicMaterial({ color: 0xff6f8e }));
  const blush = track(new MeshBasicMaterial({ color: 0xff5e7e, transparent: true, opacity: 0.55, depthWrite: false }));
  const bubbleMat = track(new MeshToonMaterial({ color: 0xfff4ea, gradientMap: gradient, transparent: true, opacity: 0.95 }));
  const shadowMat = track(new MeshBasicMaterial({ color: 0x000000, map: shadowTexture, transparent: true, opacity: 0.45, depthWrite: false }));

  const shadow = new Mesh(track(new CircleGeometry(1.35, 32)), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = GROUND + 0.005;
  scene.add(shadow);

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
  const happyEyeGeo = track(new TorusGeometry(0.12, 0.032, 8, 20, Math.PI));
  const eyes: Mesh[] = [];
  const happyEyes: Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeGeo, dark);
    eye.position.set(side * 0.34, 0.02, 0.9);
    eye.scale.set(1, 1.12, 0.6);
    const glint = new Mesh(glintGeo, white);
    glint.position.set(-0.05, 0.07, 0.13);
    eye.add(glint);
    face.add(eye);
    eyes.push(eye);

    // Closed, upturned "^" eyes for happy.
    const happyEye = new Mesh(happyEyeGeo, dark);
    happyEye.position.set(side * 0.34, -0.02, 0.92);
    happyEye.visible = false;
    face.add(happyEye);
    happyEyes.push(happyEye);

    const cheek = new Mesh(track(new CircleGeometry(0.13, 24)), blush);
    cheek.position.set(side * 0.6, -0.2, 0.79);
    cheek.lookAt(cheek.position.clone().multiplyScalar(2));
    cheek.scale.set(1.25, 0.8, 1);
    face.add(cheek);
  }

  // Mouths: a small smile (idle), an "o" (thinking), an open grin (happy).
  const smile = new Mesh(track(new TorusGeometry(0.085, 0.024, 8, 20, Math.PI)), dark);
  smile.position.set(0, -0.2, 0.93);
  smile.rotation.z = Math.PI;
  face.add(smile);

  const ooh = new Mesh(track(new TorusGeometry(0.055, 0.022, 8, 20)), dark);
  ooh.position.set(0.04, -0.22, 0.93);
  face.add(ooh);

  const grin = new Group();
  grin.position.set(0, -0.17, 0.935);
  const grinFill = new Mesh(track(new CircleGeometry(0.15, 24, Math.PI, Math.PI)), dark);
  const grinTongue = new Mesh(track(new CircleGeometry(0.07, 20, 0, Math.PI)), tongue);
  grinTongue.position.set(0, -0.125, 0.004);
  grin.add(grinFill, grinTongue);
  face.add(grin);

  // Thought bubbles, rising up and to the right of the head.
  const bubbleGeo = track(new SphereGeometry(1, 20, 14));
  const bubbles = [
    { x: 0.95, y: 1.28, r: 0.07 },
    { x: 1.18, y: 1.52, r: 0.1 },
    { x: 1.42, y: 1.84, r: 0.15 }
  ].map(b => {
    const m = new Mesh(bubbleGeo, bubbleMat);
    m.position.set(b.x, b.y, 0.2);
    m.userData.r = b.r;
    scene.add(m);
    return m;
  });

  // Tentacles: a chain of shrinking beads each, one instanced mesh for all eight.
  const beadGeo = track(new SphereGeometry(1, 16, 12));
  const beads = track(new InstancedMesh(beadGeo, skin, TENTACLES * BEADS));
  octo.add(beads);
  const dummy = new Object3D();

  let mood: OctopusMood = "idle";
  // 0..1 blend weights, eased toward the current mood so poses change smoothly.
  let thinkW = 0;
  let happyW = 0;
  let phase = 0;
  let bouncePhase = 0;
  const pointer = { x: 0, y: 0 };

  function placeTentacles(t: number) {
    let i = 0;
    for (let k = 0; k < TENTACLES; k++) {
      const base = (k / TENTACLES) * Math.PI * 2 + Math.PI / TENTACLES;
      const wave = WAVING[k] ?? 0;
      for (let b = 0; b < BEADS; b++) {
        const s = b / (BEADS - 1);
        const r = 0.27 * (1 - s * 0.72);
        const sway = Math.sin(phase + k * 1.3 - s * 3) * 0.14 * s;

        // Resting shape: down from the head, then along the ground, tip curling up.
        let angle = base + sway;
        let radius = 0.56 + 0.8 * s;
        const drop = 1 - (1 - Math.min(1, s / 0.6)) ** 2;
        let y = -0.3 + (GROUND + r + 0.3) * drop;
        y += Math.max(0, (s - 0.78) / 0.22) ** 2 * 0.3;
        y += Math.sin(phase * 1.3 + k * 0.7 + s * 4) * 0.035 * s;

        // Happy: the two front tentacles reach out to the sides and wave in the air.
        if (wave && happyW > 0) {
          const reach = Math.max(0, s - 0.15) * happyW;
          angle += wave * (1.05 + Math.sin(t * 9 + k) * 0.18) * happyW * Math.min(1, s * 2);
          radius += reach * 0.15;
          y += reach * (1.7 + Math.sin(t * 9 + k * 2 + s * 3) * 0.25);
        }

        dummy.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius * 0.85);
        dummy.scale.setScalar(r);
        dummy.updateMatrix();
        beads.setMatrixAt(i++, dummy.matrix);
      }
    }
    beads.instanceMatrix.needsUpdate = true;
  }

  function onPointer(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = MathUtils.clamp((e.clientX - (rect.left + rect.width / 2)) / 400, -1, 1);
    pointer.y = MathUtils.clamp((e.clientY - (rect.top + rect.height / 2)) / 400, -1, 1);
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

  let nextBlink = 1.5;
  let last = 0;
  function frame(t: number) {
    const dt = Math.min(0.05, Math.max(0, t - last));
    last = t;

    // Ease the pose toward the mood; reduced motion jumps straight to it.
    const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
    thinkW += ((mood === "thinking" ? 1 : 0) - thinkW) * ease;
    happyW += ((mood === "happy" ? 1 : 0) - happyW) * ease;
    const follow = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);

    if (!reducedMotion) {
      phase += dt * (1.4 + 3 * thinkW + 1.5 * happyW);
      bouncePhase += dt * (Math.PI / 0.5);
    }

    // Sitting on the ground: a slow breath, and bouncing when happy.
    const bounce = Math.abs(Math.sin(bouncePhase)) * 0.32 * happyW;
    const landing = happyW * Math.max(0, Math.cos(bouncePhase) ** 8) * 0.08;
    const breath = reducedMotion ? 0 : Math.sin(t * 1.8) * 0.012;
    octo.position.y = bounce;
    octo.scale.set(1 + landing, 1 - landing + breath, 1 + landing);
    const shadowScale = 1 - bounce * 0.8;
    shadow.scale.set(shadowScale, shadowScale, 1);
    shadowMat.opacity = 0.45 * shadowScale;

    // Where the head and eyes point: the pointer, or up and away when thinking.
    const lookX = MathUtils.lerp(pointer.x, 0.6, thinkW) * (1 - happyW);
    const lookY = MathUtils.lerp(pointer.y, -0.8, thinkW) * (1 - happyW);
    const idleSway = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.1;
    octo.rotation.y += (lookX * 0.4 + idleSway * (1 - thinkW) - octo.rotation.y) * follow;
    octo.rotation.x += (lookY * 0.18 - octo.rotation.x) * follow;
    octo.rotation.z += (-0.2 * thinkW + (reducedMotion ? 0 : Math.sin(t * 9) * 0.05 * happyW) - octo.rotation.z) * follow;

    // Eyes: blink when idle, squint while thinking, ^ ^ when happy.
    if (t > nextBlink + 0.14) nextBlink = t + 2.2 + Math.random() * 2.8;
    const blinking = !reducedMotion && t > nextBlink && thinkW < 0.5;
    const showHappyEyes = happyW > 0.5;
    for (const eye of eyes) {
      const sideX = Math.sign(eye.position.x) * 0.34;
      eye.position.x += (sideX + lookX * 0.07 - eye.position.x) * follow;
      eye.position.y += (0.02 - lookY * 0.07 - eye.position.y) * follow;
      eye.scale.y = blinking ? 0.12 : MathUtils.lerp(1.12, 0.72, thinkW);
      eye.visible = !showHappyEyes;
    }
    for (const eye of happyEyes) eye.visible = showHappyEyes;

    // Mouth
    const idleW = Math.max(0, 1 - thinkW - happyW);
    smile.scale.setScalar(Math.max(0.001, idleW));
    ooh.scale.setScalar(Math.max(0.001, thinkW * (reducedMotion ? 1 : 1 + Math.sin(t * 3) * 0.12)));
    grin.scale.setScalar(Math.max(0.001, happyW));

    // Thought bubbles pop in one after another and bob gently.
    bubbles.forEach((bubble, i) => {
      const appear = MathUtils.clamp(thinkW * 3 - i, 0, 1);
      const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 3 - i * 0.9) * 0.1;
      bubble.scale.setScalar(Math.max(0.001, bubble.userData.r * appear * pulse));
      bubble.position.y = [1.28, 1.52, 1.84][i] + (reducedMotion ? 0 : Math.sin(t * 2 - i) * 0.04);
      bubble.visible = appear > 0.01;
    });

    placeTentacles(t);
    renderer.render(scene, camera);
  }

  const resizeObserver = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => { resize(); if (reducedMotion) frame(last); })
    : null;
  resizeObserver?.observe(canvas);
  resize();

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
      last = (performance.now() - start) / 1000;
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
      if (next === "happy" && mood !== "happy") bouncePhase = 0;
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
