// coordinator-monitor's crab: an orange felt plush, its body a rounded box with a stub arm each
// side, four short legs and two black square eyes on its front, hung by a thin cord from a blue
// suction cup. The one model of it, for the room (room-plush.js) and for the pictures of it
// (render.html, README.md). Model units: y up, its front towards +z, its back on the wall (or the
// mat it lies on) at z = WALL; 2.14 across, arm to arm.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const WALL = -0.41;
export const WIDTH = 2.14;
// How the room draws it on its back wall (room-plush.js), and its still picture (render.html):
// scale px a unit, 108 px across (60 px across on a 1440 by 900 screen); in a canvas S px square on
// the wall, from left px left of the cup's middle and up px above it, room enough for it seen from
// the side, swinging, bouncing and with its shadow, and short of the corner (room.js)
export const ON_WALL = { scale: 108 / WIDTH, S: 216, left: 82, up: 18 };
const ORANGE = "#d8581c";
const SHELLS = 16;
const REACH = 0.055; // how far the fuzz stands off the felt
const CUP = new THREE.Vector3(0, 2.26, -0.42);
const PIVOT = new THREE.Vector3(0, 2.26, -0.2); // where the cord meets the cup's knob
const TOP = 1.16; // the top of its head, where the cord starts

// a box with rounded edges and corners, its vertices pushed out to a radius round an inner box
function rounded(w, h, d, r, seg = 18) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg),
    p = g.attributes.position,
    v = new THREE.Vector3(),
    inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = v.clone().clamp(inner.clone().negate(), inner);
    v.sub(c).normalize().multiplyScalar(r).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// The plush, hanging. root holds it all: swing turns what hangs about the cup's knob (pose()),
// hang is the toy itself (its felt, fuzz and eyes) and the cup stays on the wall. With fuzz
// false, no shells: the felt alone.
export function plush({ fuzz = true } = {}) {
  // felt: noise for its fibres, as a bump and, coarser, as the shells' strands
  const N = 256,
    cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const cx = cv.getContext("2d"),
    img = cx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const n = Math.random() * 255;
    img.data.set([n, n, n, 255], i * 4);
  }
  cx.putImageData(img, 0, 0);
  const noise = new THREE.CanvasTexture(cv);
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
  noise.repeat.set(14, 14);
  const orange = new THREE.Color(ORANGE);
  const felt = new THREE.MeshPhysicalMaterial({ color: orange, roughness: 0.95, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color("#ffb07a"), bumpMap: noise, bumpScale: 0.6, side: THREE.DoubleSide });
  const ink = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.7, side: THREE.DoubleSide });

  const root = new THREE.Group(),
    swing = new THREE.Group(),
    hang = new THREE.Group();
  swing.position.copy(PIVOT);
  hang.position.copy(PIVOT).negate();
  swing.add(hang);
  root.add(swing);
  // the body, the arms and the legs: size, corner and where (each a few segments round its
  // corners, the shells over them too; fewer still for the light pass, body())
  const PARTS = [[1.5, 1.08, 0.82, 0.3, 0, 0.62, 0], [0.42, 0.4, 0.52, 0.16, -0.86, 0.6, 0], [0.42, 0.4, 0.52, 0.16, 0.86, 0.6, 0]].concat([-0.5, -0.17, 0.17, 0.5].map((x) => [0.25, 0.5, 0.5, 0.11, x, 0.08, 0])),
    EYES = [-0.33, 0.33].map((x) => [0.2, 0.26, 0.1, 0.03, x, 0.72, 0.41 + REACH]);
  const part = ([w, h, d, r, x, y, z], mat, seg) => {
    const m = new THREE.Mesh(rounded(w, h, d, r, seg), mat);
    m.position.set(x, y, z);
    return m;
  };
  const parts = PARTS.map((p) => part(p, felt, 12)),
    eyes = EYES.map((p) => part(p, ink, 4));
  hang.add(...parts, ...eyes);
  // fuzz: shells a hair out from the felt, fewer strands the further out, each strand a few
  // pixels across
  const shells = [];
  if (fuzz) {
    const sc = document.createElement("canvas");
    sc.width = sc.height = 64;
    sc.getContext("2d").drawImage(cv, 0, 0, 64, 64, 0, 0, 64, 64);
    const strands = new THREE.CanvasTexture(sc);
    strands.wrapS = strands.wrapT = THREE.RepeatWrapping;
    strands.repeat.set(2, 2);
    for (let i = 1; i <= SHELLS; i++) {
      const t = i / SHELLS;
      // darker at the root and lighter at the tips, so the strands read against each other
      const s = new THREE.MeshPhysicalMaterial({ color: orange.clone().offsetHSL(0, 0, -0.1 + 0.14 * t), roughness: 1, sheen: 0.6, sheenColor: new THREE.Color("#ffb98a"), alphaMap: strands, alphaTest: 0.2 + 0.75 * t, side: THREE.FrontSide });
      s.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n transformed += normal * ${(REACH * t).toFixed(4)};`);
      };
      s.customProgramCacheKey = () => "plush shell " + i;
      shells.push(s);
      for (const m of parts) {
        const sm = new THREE.Mesh(m.geometry, s);
        sm.position.copy(m.position);
        hang.add(sm);
      }
    }
  }
  // the cord, from the top of its head up to the knob (stretched by pose())
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8), new THREE.MeshStandardMaterial({ color: "#8d9196", roughness: 0.8 }));
  swing.add(cord);
  // the suction cup: a flat dome, its rim flat on the wall, and its knob
  const blue = new THREE.MeshPhysicalMaterial({ color: "#5d9fd0", roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.88 });
  const cup = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), blue);
  dome.scale.y = 0.45;
  dome.rotation.x = Math.PI / 2; // (its dome facing out)
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 16), blue);
  knob.rotation.x = Math.PI / 2;
  knob.position.z = 0.16;
  cup.add(dome, knob);
  cup.position.copy(CUP);
  root.add(cup);

  // turned by angle (radians) about the knob, as it swings, and dropped by drop down its cord,
  // as it bounces on it
  function pose(angle = 0, drop = 0) {
    swing.rotation.z = angle;
    hang.position.set(-PIVOT.x, -PIVOT.y - drop, -PIVOT.z);
    const len = PIVOT.y - TOP + drop;
    cord.scale.y = len;
    cord.position.set(0, -len / 2, 0);
  }
  pose();

  return {
    root,
    hang,
    felt,
    shells,
    pose,
    // its felt and eyes as one geometry, in hang's frame: what takes the room's light
    body() {
      return mergeGeometries(
        PARTS.map((p) => part(p, felt, 6)).concat(eyes).map((m) => {
          m.updateMatrix();
          const g = m.geometry.clone().applyMatrix4(m.matrix);
          for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
          return g.index ? g.toNonIndexed() : g;
        }),
      );
    },
    // lying on its back on the mat, face up, its cord trailing loose with the cup at its end
    // (the mat is then y = 0, and its head towards -z)
    lie() {
      pose();
      swing.remove(cord);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([[0, TOP - 0.02, -0.2], [0.04, TOP + 0.1, -0.36], [0.3, TOP + 0.17, WALL + 0.014], [0.8, TOP + 0.14, WALL + 0.014], [1.3, TOP + 0.0, WALL + 0.014], [1.62, TOP - 0.06, WALL + 0.014], [1.8, TOP - 0.07, WALL + 0.014]].map((p) => new THREE.Vector3(...p))),
          64,
          0.014,
          8,
        ),
        cord.material,
      );
      root.add(tube);
      cup.position.set(1.98, TOP - 0.07, WALL);
      root.rotation.x = -Math.PI / 2;
      root.position.y = -WALL;
    },
  };
}

// How it is drawn, as approved (render.html): filmic, a little under, from above, with a warm key
// from the top left and in front and a cool fill from the right. up, left and front are the ways
// up, to the reader's left and towards the reader in the scene's frame.
export function look(renderer, scene, { up, left, front }) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  const sky = new THREE.HemisphereLight("#fff6ea", "#6a5a4a", 1.4);
  sky.position.copy(up);
  const key = new THREE.DirectionalLight("#fff1dc", 2.4);
  const fill = new THREE.DirectionalLight("#dfe8ff", 0.6);
  key.position.copy(up).multiplyScalar(6).addScaledVector(left, 3).addScaledVector(front, 4);
  fill.position.copy(up).multiplyScalar(2).addScaledVector(left, -4).addScaledVector(front, 5);
  scene.add(sky, key, fill);
}

// Its soft shadow on the wall behind it, as approved: what the reader sees of it, blurred and
// a little down and to the right, in the plane's px; drawn from the canvas src it is drawn in,
// k canvas px to a px of the plane, into pen. (The room's light pass lights it, but the room's
// lamp only grazes the back wall, and throws next to no shadow on it.) It is the shadow of the
// picture drawn well off the canvas, which every browser draws (Safari has no filter on a
// canvas); its blur is twice the deviation of the blur it is.
export function shadow(pen, src, k) {
  const far = pen.canvas.width + src.width + 64 * k;
  pen.clearRect(0, 0, pen.canvas.width, pen.canvas.height);
  pen.save();
  pen.setTransform(1, 0, 0, 1, 0, 0);
  pen.shadowColor = "rgba(0, 0, 0, 0.28)";
  pen.shadowBlur = 8 * k;
  pen.shadowOffsetX = far;
  pen.drawImage(src, 9 * k - far, 14 * k);
  pen.restore();
}

// The camera that draws it flat on a plane it is in front of, as the reader sees it there. In the
// plane's px, x along it, y down it and z out of it, a step of z off it shows on screen as the
// step (p, q) along it does, so a point at height z is seen at (x + p z, y + q z) on the plane;
// the canvas covers S px square from (x0, y0) of it, and the nearer the reader, the further along
// (-p, -q, 1). (As room-mouse.js draws the mouse on the desk.) The scene is held with its y up the
// plane, the other way (UP, onPlane()): through a mirror three.js would take its faces to be
// turned round, and light their backs. cam is an orthographic camera, turned to look the way the
// reader does, so its sheen, its shine and the cup's gloss face the reader; its projection undoes
// the turn.
export function flat(cam, { p, q, x0, y0, S, R }) {
  const look = new THREE.Vector3(-p, q, 1).normalize(),
    side = new THREE.Vector3(0, 1, 0).cross(look).normalize();
  cam.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, new THREE.Vector3().crossVectors(look, side), look));
  cam.position.set(0, 0, 0);
  cam.updateMatrixWorld(true);
  cam.projectionMatrix.set(
    2 / S, 0, (2 * p) / S, -1 - (2 * x0) / S,
    0, 2 / S, (-2 * q) / S, 1 + (2 * y0) / S,
    p / R, -q / R, -1 / R, 0,
    0, 0, 0, 1,
  ).multiply(cam.matrixWorld);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}
// from the scene's frame (y up the plane) to the plane's px (y down it)
export const UP = new THREE.Matrix4().makeScale(1, -1, 1);

// From model units to the scene's frame: the model s px a unit, its back a px off the plane and
// the cup's middle over (cx, cy) of the plane (in its px, y down it)
export function onPlane(s, cx, cy) {
  return new THREE.Matrix4().set(s, 0, 0, cx - s * CUP.x, 0, s, 0, -cy - s * CUP.y, 0, 0, s, -s * WALL - 1, 0, 0, 0, 1);
}
