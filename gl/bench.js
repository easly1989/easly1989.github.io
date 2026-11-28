// The modelling workbench (issue #160, ticket 03): one object of the room alone, on a piece of the mat, in the room's
// light and its environment, turning slowly, to be looked at up close (drag to turn the view, wheel to come nearer).
// Reached with ?roomgl&bench=<name>; without a name, or with one that is not there, it lists what there is.
// window.BENCH tells a check what it shows: names, name, ready, drawn, and pixel(), project() as the room's.

import { THREE, renderer as makeRenderer, ratio, addLight, pal, scheme, matTexture, material, mesh } from "./kit.js";
import { OBJECTS } from "./objects.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const reduced = window.reducedMotion ? window.reducedMotion() : matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function bench(name) {
  const names = Object.keys(OBJECTS);
  const api = (window.BENCH = { names, name: names.includes(name) ? name : null, ready: false, drawn: 0 });
  // what there is, always: a link to each
  const list = document.createElement("nav");
  list.setAttribute("aria-label", "Workbench");
  list.style.cssText = "position:fixed;left:12px;top:12px;z-index:2;font:14px system-ui,sans-serif;color:#e8f0ff;background:#000a;padding:8px 12px;border-radius:8px";
  // (built with text, never with the address's words as markup: the name comes from the query string)
  list.append("Workbench:");
  for (const n of names) {
    const a = document.createElement("a");
    a.href = "?bench=" + encodeURIComponent(n);
    a.textContent = n;
    a.style.cssText = "color:#9fd0ff;margin-left:8px";
    list.append(a);
  }
  const say = (text) => {
    list.append(document.createElement("br"), text);
  };
  document.body.append(list);
  if (!api.name) return say(name ? "No such object: " + name : "Pick an object.");

  const canvas = document.createElement("canvas");
  canvas.className = "room-gl";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const spec = OBJECTS[api.name];
  const MW = spec.ground || 600; // the piece of the mat it stands on, px across
  addLight(scene, renderer, new THREE.Vector3(-1340, -660, 2100), Math.max(700, MW * 0.75)); // (where the room's sun is, from the middle of the mat)
  scene.background = new THREE.Color(pal().back);

  // a piece of the mat to stand on, as the room's
  const top = new THREE.Mesh(new THREE.PlaneGeometry(MW, MW), new THREE.MeshStandardMaterial({ roughness: 0.62 }));
  top.receiveShadow = true;
  top.position.z = 0;
  scene.add(top);
  function paintMat() {
    const p = pal();
    top.material.map?.dispose();
    top.material.map = matTexture(renderer, p, MW, MW);
    top.material.needsUpdate = true;
    scene.background = new THREE.Color(p.back);
    invalidate();
  }

  // the object, turning on a turntable
  let built;
  try {
    built = await spec.build(renderer);
  } catch (e) {
    // (said here, to the one looking at it: this is a tool, and a failure is the point of it)
    console.warn("[bench] could not build", api.name, e);
    canvas.remove();
    return say("Could not build " + api.name + ": " + (e && e.message ? e.message : e));
  }
  const { group, height } = built;
  const turntable = new THREE.Group();
  turntable.add(group);
  turntable.position.z = spec.hangs || 0; // (a thing that hangs from its origin, the tie, is lifted so that it hangs clear of the mat)
  scene.add(turntable);
  // an object with a state to try (the radio: off, its projector in; on, out) gets a button for it
  let radio = null;
  group.traverse((o) => {
    if (o.userData.radio) radio = o.userData.radio;
  });
  if (radio) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.cssText = "margin-left:12px;font:inherit";
    const say2 = () => (btn.textContent = "Radio: " + (radio.isOn() ? "on" : "off"));
    btn.addEventListener("click", () => {
      radio.setOn(!radio.isOn());
      say2();
    });
    say2();
    list.append(btn);
    api.radio = radio;
  }

  // the camera: the room's direction, but in perspective and near; the mouse turns it round the object
  const cam = new THREE.PerspectiveCamera(28, 1, 10, 5000);
  cam.up.set(0, 0, 1);
  cam.position.set(-1, -1, 0.9).normalize().multiplyScalar(Math.max(520, height * (spec.look || 4)));
  const controls = new OrbitControls(cam, canvas);
  controls.target.set(0, 0, spec.hangs ? spec.hangs - 110 : height * 0.45);
  controls.enableDamping = true;
  controls.minDistance = 120;
  controls.maxDistance = 4000;
  cam.far = 12000;
  cam.updateProjectionMatrix();
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, cam));
  try {
    const ao = new GTAOPass(scene, cam, innerWidth, innerHeight);
    ao.updateGtaoMaterial({ radius: 20, distanceExponent: 1, thickness: 6, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
    composer.addPass(ao);
  } catch (e) {
    console.warn("[bench] no ambient occlusion", e);
  }
  composer.addPass(new OutputPass());

  // a frame when something asks for one, and one after another while it turns (unless the reader's motion says it rests)
  let pending = false;
  function draw() {
    pending = false;
    if (!reduced) turntable.rotation.z += 0.004;
    controls.update();
    try {
      composer.render();
    } catch (e) {
      return say("Drawing failed: " + (e && e.message ? e.message : e));
    }
    api.drawn++;
    if (!reduced) invalidate();
  }
  function invalidate() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(draw);
    }
  }
  function resize() {
    renderer.setPixelRatio(ratio());
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setPixelRatio(ratio());
    composer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    invalidate();
  }
  controls.addEventListener("change", invalidate);
  addEventListener("gl-redraw", invalidate);
  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  canvas.addEventListener("webglcontextrestored", invalidate);
  scheme.addEventListener("change", paintMat);
  addEventListener("resize", resize);
  addEventListener("pagehide", (e) => {
    if (e.persisted) return;
    renderer.dispose();
    renderer.forceContextLoss();
  });

  Object.assign(api, {
    scene,
    camera: cam,
    THREE,
    turntable,
    group,
    redraw: invalidate,
    // the colour drawn at a px of the window, [r, g, b]
    pixel(x, y) {
      const r = renderer.getPixelRatio(),
        cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(canvas, x * r, y * r, 1, 1, 0, 0, 1, 1);
      return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3);
    },
    // where a point of the object (x, y, z, its own px) is on the screen now
    project(x, y, z) {
      const v = new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld).project(cam);
      return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
    },
  });
  paintMat();
  resize();
  turntable.rotation.z = 0;
  group.updateMatrixWorld(true);
  composer.render();
  api.drawn++;
  api.ready = true;
  document.documentElement.classList.add("gl-ready");
  if (!reduced) invalidate();
}
