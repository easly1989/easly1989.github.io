// The shelf on the right wall with its brackets, the potted plant and the radio with its little projector (issue #160, ticket 05).
// The set's origin is on the right wall's face at the shelf's north end (css x = 1350, y = 520), x east (the wall is at x = 0 and
// beyond), y north (the shelf runs south, to negative y), z up from the mat: the room puts it down at (710, -80, 0) of the scene.
// The shelf is 112 deep and 700 long, its board 18 thick with its top 170 up, on three brackets; the plant stands at its north end
// (a blue glazed pot 56 square and 58 high), the radio at its south end (84 by 210 and 120 high, in beige) with a projector on it.

import { THREE, mesh, tint, roundedBox, extrude, paint } from "./kit.js";

const std = (key, roughness = 0.7, extra) => tint(new THREE.MeshStandardMaterial({ roughness, ...extra }), key);
// the shelf's own px (css x, y) to the set's frame
const sx = (x) => x - 1350;
const sy = (y) => -(y - 520);

// a leaf: a blade lofted from its base up and out, `len` long, `wid` across at its widest, bending over by `bend` radians, folded along
// its middle, drawn double-sided; it lies in the x-z plane, rising from the origin along +x as it bends
function leaf(len, wid, bend, material) {
  const N = 14;
  const pos = [],
    idx = [];
  let x = 0,
    z = 0,
    a = 0.12; // (the angle from upright)
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    a += (bend / N) * (0.4 + t * 1.2);
    if (i) {
      x += Math.sin(a) * (len / N);
      z += Math.cos(a) * (len / N);
    }
    const w = wid * Math.min(1, t / 0.18) * Math.pow(1 - t, 0.55); // (widest near the base, to a point)
    for (const s of [-1, 0, 1]) pos.push(x, s * w * 0.5, z + (s === 0 ? w * 0.12 : 0)); // (a fold: the middle stands up)
  }
  for (let i = 0; i < N; i++)
    for (let k = 0; k < 2; k++) {
      const a0 = i * 3 + k,
        b0 = (i + 1) * 3 + k;
      idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return mesh(g, material);
}

export async function plant() {
  const group = new THREE.Group();
  group.add(mesh(roundedBox(56, 56, 58, 8, 4), std("pot", 0.25)));
  // the soil, in the pot's mouth, a little under its rim
  const soil = mesh(new THREE.CylinderGeometry(20, 21, 3, 24), std("soil", 1));
  soil.rotation.x = Math.PI / 2;
  soil.position.set(0, 0, 55.5);
  group.add(soil);
  // nine leaves in four greens, round the base, upright and arching out
  const greens = ["#4f8a3c", "#5a9a44", "#447a34", "#5f9e48"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, side: THREE.DoubleSide }));
  const spec = [[0, 96, 0.8], [40, 110, 1.0], [80, 84, 0.9], [120, 102, 1.1], [160, 78, 0.7], [200, 106, 1.0], [240, 90, 0.85], [280, 112, 1.2], [320, 88, 0.95]];
  spec.forEach(([deg, len, bend], i) => {
    const l = leaf(len, 20, bend, greens[i % greens.length]);
    l.rotation.z = (deg * Math.PI) / 180;
    l.position.set(Math.cos((deg * Math.PI) / 180) * 3, Math.sin((deg * Math.PI) / 180) * 3, 56);
    group.add(l);
  });
  return { group, height: 58 + 110 };
}

export async function radio(renderer) {
  const group = new THREE.Group();
  // the case: 84 wide (x), 210 long (y) and 120 high, its edges rounded, standing on the shelf
  group.add(mesh(roundedBox(84, 210, 120, 12, 4), std("radio", 0.55)));
  // its face, the side towards the room (west): a dial of cream with its ticks and a red needle at the north end, a grille of slats to the
  // south, a lamp; painted 210 by 120 and laid on the case's side (u runs south from the north end)
  const face = await paint(renderer, 210, 120, (g) => {
    g.fillStyle = "#f3ead2";
    g.beginPath();
    g.roundRect(10, 10, 190, 34, 4); // (the tuning dial takes the whole length of the face, 190 px)
    g.fill();
    g.fillStyle = "#8d8169";
    for (let x = 16; x < 196; x += 9) g.fillRect(x, 30, 1, 12);
    g.fillStyle = "#c0392b";
    g.fillRect(70, 12, 3, 30);
    g.fillStyle = "#5a4a36";
    g.beginPath();
    g.roundRect(100, 48, 100, 64, 8);
    g.fill();
    g.fillStyle = "#8a7556";
    for (let x = 103; x < 198; x += 7) g.fillRect(x, 50, 4, 60);
    g.fillStyle = "#4a2a22";
    g.beginPath();
    g.arc(18, 66, 4.5, 0, Math.PI * 2);
    g.fill();
  });
  const faceMesh = mesh(new THREE.PlaneGeometry(210, 120), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { cast: false });
  // (its basis: x runs south, y up, normal west)
  faceMesh.geometry.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0)));
  faceMesh.position.set(-42.2, 0, 60);
  group.add(faceMesh);
  // the two knobs, 34 across and 8 proud, below the dial, each with a notch, turned differently
  const knobMat = new THREE.MeshStandardMaterial({ color: "#3b3027", roughness: 0.5 });
  const notch = new THREE.MeshStandardMaterial({ color: "#e8dcc0", roughness: 0.6 });
  [28, 70].forEach((u, i) => {
    const k = new THREE.Group();
    const cap = mesh(new THREE.CylinderGeometry(17, 17, 8, 32), knobMat);
    cap.rotation.z = Math.PI / 2;
    k.add(cap);
    const n = mesh(new THREE.BoxGeometry(1.5, 3, 11), notch);
    n.position.set(-4.2, 0, 6);
    k.add(n);
    k.rotation.x = i ? 0.5 : -1.0;
    k.position.set(-46, 105 - u, 31);
    group.add(k);
  });
  // the projector on top: a toothed wheel 84 across and 8 thick, and on it a wedge 52 by 60, 32 high at the room's side and 14 at the wall's,
  // turned 45 degrees (the CSS room's `rotateZ(-45deg)`) when it is out. Off, it is not there: it sinks into the radio, turning, through a
  // round slot in the top (the case's top, z = 120, clips it), and comes out the same way when the radio plays. setOn(on) does it, in 0.8 s,
  // or at once under reduced motion; it asks for a frame each step ("gl-redraw", which the room and the workbench listen to).
  const slotMat = new THREE.MeshStandardMaterial({ color: "#2a2218", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const slot = mesh(new THREE.CircleGeometry(43.5, 48), slotMat, { cast: false });
  slot.position.set(0, 65, 120.3);
  group.add(slot);
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), -120);
  const projMat = () => {
    const m = std("radio", 0.5);
    m.clippingPlanes = [clip];
    return m;
  };
  const wheel = mesh(new THREE.CylinderGeometry(42, 42, 8, 48), projMat());
  wheel.material.color.set("#6f5e4c"); // (a brown plate, as the CSS room's wheel)
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(0, 0, -4);
  const wedgeGeo = extrude([[0, 0], [52, 0], [52, 14], [0, 32]], 60, 0.8);
  wedgeGeo.rotateX(Math.PI / 2); // (its outline stands up, its depth runs south)
  wedgeGeo.translate(-26, 30, 0);
  const projector = new THREE.Group();
  projector.add(wheel, mesh(wedgeGeo, projMat()));
  group.add(projector);
  const OUT = { z: 128, turn: (45 * Math.PI) / 180 },
    IN = { z: 84, turn: (-135 * Math.PI) / 180 }; // (down in the radio, half a turn and a quarter back)
  let t = 0, // 0 in, 1 out
    on = false,
    raf = 0;
  const pose = () => {
    const e = t * t * (3 - 2 * t); // (eased)
    projector.position.set(0, 65, IN.z + (OUT.z - IN.z) * e);
    projector.rotation.z = IN.turn + (OUT.turn - IN.turn) * e;
    projector.visible = t > 0.001;
    clip.constant = -group.localToWorld(new THREE.Vector3(0, 0, 120)).z; // (the case's top, wherever the radio stands)
    window.dispatchEvent(new Event("gl-redraw"));
  };
  const reduced = () => (window.reducedMotion ? window.reducedMotion() : matchMedia("(prefers-reduced-motion: reduce)").matches);
  const api = {
    setOn(next) {
      on = !!next;
      cancelAnimationFrame(raf);
      if (reduced()) {
        t = on ? 1 : 0;
        return pose();
      }
      let last = performance.now();
      const step = (now) => {
        t = Math.max(0, Math.min(1, t + ((on ? 1 : -1) * (now - last)) / 800));
        last = now;
        pose();
        if (t > 0 && t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
    isOn: () => on,
    // where it is: how far out (0 to 1), its height and its turn
    pose: () => ({ out: t, z: projector.position.z, turn: projector.rotation.z, visible: projector.visible }),
  };
  group.userData.radio = api;
  group.userData.projector = projector;
  // (the clip follows where the radio stands, set again before each of the projector's two meshes is drawn)
  const follow = () => {
    clip.constant = -group.localToWorld(new THREE.Vector3(0, 0, 120)).z;
  };
  wheel.onBeforeRender = follow;
  projector.children[1].onBeforeRender = follow;
  pose();
  return { group, height: 160 };
}

export async function shelf(renderer) {
  const group = new THREE.Group();
  const board = mesh(roundedBox(112, 700, 18, 2, 2), std("sill", 0.6));
  board.position.set(sx(1238) + 56, sy(520) - 350, 152);
  group.add(board);
  for (const y of [560, 850, 1160]) {
    const bracket = mesh(roundedBox(60, 14, 60, 2, 2), std("skirting", 0.7));
    bracket.position.set(sx(1290) + 30, sy(y) - 7, 92);
    group.add(bracket);
  }
  const p = await plant();
  p.group.position.set(sx(1270) + 28, sy(530) - 28, 170);
  group.add(p.group);
  const r = await radio(renderer);
  r.group.position.set(sx(1254) + 42, sy(1000) - 105, 170);
  group.add(r.group);
  group.userData.radio = r.group.userData.radio;
  return { group, height: 330 };
}
