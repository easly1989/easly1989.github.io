// The office chair, the tie that hangs on it, and the wire wastebasket (issue #160, ticket 05), as the CSS room has them in size and place,
// built as real things. Each has its origin at the middle of its foot on the floor (the floor is z = -560 in the room), x east, y
// north, z up; the room puts the chair down turned 28 degrees clockwise from above, as the CSS room's `rotateZ(28deg)`.
// The chair is 340 by 320 on its casters and 1020 high with its headrest; the basket stands in a square 110 across, 200 high, its
// foot 46 across the middle and its rim 60.

import { THREE, mesh, tint, roundedBox, extrude, warp } from "./kit.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const std = (key, roughness = 0.6, extra) => tint(new THREE.MeshStandardMaterial({ roughness, ...extra }), key);
const at = (m, x, y, z = 0) => {
  m.position.set(x, y, z);
  return m;
};
// the CSS chair's own px (x east and y south, from its top left corner, the element 340 by 320) to the chair's frame
const cx = (x) => x - 170;
const cy = (y) => 160 - y;

// a weave of fine threads, drawn once as a bump map (and a colour map for the mesh of the chair's back); `step` px a thread
function weave(renderer, repeat, light, dark, step = 8) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const g = cv.getContext("2d");
  g.fillStyle = dark;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = light;
  for (let y = 0; y < 64; y += step)
    for (let x = 0; x < 64; x += step) {
      if (((x + y) / step) % 2) g.fillRect(x + 0.5, y + 0.5, step - 1.5, step - 1.5);
      else {
        g.fillRect(x + 0.5, y + 0.5, step - 1.5, step / 2 - 1);
        g.fillRect(x + 0.5, y + step / 2 + 0.5, step - 1.5, step / 2 - 1);
      }
    }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// a closed outline of points, filled in so that no two are more than `step` apart
function densify(pts, step) {
  const out = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length],
      n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
    for (let k = 0; k < n; k++) out.push([p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  });
  return out;
}
// a rounded rectangle's outline as points (corner radius r), for a piping to follow
function outline(w, d, r, n = 10) {
  const pts = [];
  [[w / 2 - r, d / 2 - r, 0], [-(w / 2 - r), d / 2 - r, 90], [-(w / 2 - r), -(d / 2 - r), 180], [w / 2 - r, -(d / 2 - r), 270]].forEach(([x, y, a0]) => {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (i / n) * 90) * Math.PI) / 180;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  });
  return pts;
}

export async function chair(renderer) {
  const group = new THREE.Group();
  const seatZ = 300; // from the floor (the CSS room's FLOOR + 300)
  const plastic = std("chairLeg", 0.55);
  const cloth = std("chair", 0.92);
  cloth.bumpMap = weave(renderer, [10, 10], "#c4c4c4", "#6e6e6e");
  cloth.bumpScale = 0.8;
  const piping = std("chair", 0.75);
  const netting = std("chairMesh", 0.95);
  netting.map = weave(renderer, [1 / 32, 1 / 32], "#a8a8a8", "#444", 8); // (the shape's uv is in px: a tile 32 px across, threads 4 px)
  netting.bumpMap = netting.map;
  netting.bumpScale = 1.5;
  netting.side = THREE.DoubleSide;
  const chrome = new THREE.MeshStandardMaterial({ color: "#b9c0c6", roughness: 0.18, metalness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#23272a", roughness: 0.8 });
  const rbox = (w, d, h, seg, r) => new RoundedBoxGeometry(w, d, h, seg, r); // (centred)

  // the base: five tapering arms, each with a swivel caster of two wheels on its end, a hub, and the gas lift under its ribbed cover
  for (let a = 0; a < 5; a++) {
    const r = ((a * 72 + 18) * Math.PI) / 180,
      dx = Math.cos(r),
      dy = -Math.sin(r); // (the CSS angle runs clockwise from east, with y south)
    const arm = mesh(extrude([[0, -17], [150, -10], [176, -8], [182, 0], [176, 8], [150, 10], [0, 17]], 14, 3), plastic);
    arm.position.set(cx(170), cy(150), 30);
    arm.rotation.z = -r;
    group.add(arm);
    const cast = new THREE.Group();
    cast.position.set(cx(170) + dx * 172, cy(150) + dy * 172, 0);
    cast.rotation.z = -r;
    const post = mesh(new THREE.CylinderGeometry(5.5, 5.5, 18, 16), chrome);
    post.rotation.x = Math.PI / 2;
    post.position.z = 34;
    cast.add(post);
    for (const side of [-1, 1]) {
      const plate = mesh(roundedBox(22, 2.6, 22, 1, 2), rubber);
      plate.position.set(0, side * 9, 17);
      cast.add(plate);
      const wheel = mesh(new THREE.CylinderGeometry(13.5, 13.5, 6.5, 28), rubber);
      wheel.position.set(0, side * 4.4, 13.5);
      cast.add(wheel);
      const cap = mesh(new THREE.CylinderGeometry(6, 6, 7.4, 16), chrome);
      cap.position.set(0, side * 4.4, 13.5);
      cast.add(cap);
    }
    const axle = mesh(new THREE.CylinderGeometry(2.2, 2.2, 20, 10), chrome);
    axle.position.z = 13.5;
    cast.add(axle);
    group.add(cast);
  }
  const hub = mesh(new THREE.CylinderGeometry(24, 40, 22, 40), plastic);
  hub.rotation.x = Math.PI / 2;
  group.add(at(hub, cx(170), cy(150), 41));
  const cover = mesh(new THREE.CylinderGeometry(20, 24, 150, 32), plastic);
  cover.rotation.x = Math.PI / 2;
  group.add(at(cover, cx(170), cy(150), 127));
  for (let i = 0; i < 9; i++) group.add(at(mesh(new THREE.TorusGeometry(22.4 - i * 0.2, 2.2, 8, 32), plastic), cx(170), cy(150), 62 + i * 16));
  const lift = mesh(new THREE.CylinderGeometry(14, 14, 130, 28), chrome);
  lift.rotation.x = Math.PI / 2;
  group.add(at(lift, cx(170), cy(150), 265));
  group.add(at(mesh(roundedBox(140, 120, 18, 8, 3), plastic), cx(170), cy(150), 252)); // (the seat's mechanism, and its lever)
  const lever = mesh(new THREE.CylinderGeometry(2.4, 2.4, 70, 10), chrome);
  lever.rotation.z = Math.PI / 2;
  group.add(at(lever, cx(170) + 90, cy(150) + 10, 258));

  // the seat: 320 by 290, 32 thick, its edges rounded, its top domed 5 px (so that its highest point is at 300, as the CSS room's flat one), a piping at its edge
  const seat = warp(rbox(320, 290, 32, 10, 28), (v) => {
    if (v.z > 4) v.z += 5 * Math.max(0, 1 - (v.x / 165) ** 2) * Math.max(0, 1 - (v.y / 150) ** 2);
  });
  seat.translate(0, 0, 16);
  group.add(at(mesh(seat, cloth), cx(170), cy(145), seatZ - 37));
  const ring = new THREE.CatmullRomCurve3(outline(308, 278, 12).map(([x, y]) => new THREE.Vector3(x, y, 0)), true, "centripetal");
  group.add(at(mesh(new THREE.TubeGeometry(ring, 240, 2, 8, true), piping, { cast: false }), cx(170), cy(145), seatZ - 8));

  // the armrests: a post and a padded rest each, the pad soft and rounded on top
  for (const x of [15, 315]) {
    group.add(at(mesh(roundedBox(22, 22, 150, 6, 3), plastic), cx(x), cy(131), seatZ));
    const pad = warp(rbox(42, 190, 24, 8, 11), (v) => {
      if (v.z > 4) v.z += 2.5 * Math.max(0, 1 - (v.x / 21) ** 2);
    });
    pad.translate(0, 0, 12);
    group.add(at(mesh(pad, std("chairLeg", 0.65)), cx(x), cy(135), seatZ + 146));
  }

  // the back: a curved panel of netting in a frame, its sides coming round the sitter, 300 wide and 420 to 520 high; a lumbar pad on it
  const arc = (x) => (x * x) / 370; // (how far the panel's sides come forward)
  const top = (x) => 520 - 60 * (x / 150) ** 2 * 1.8; // (its top edge, lower at the sides)
  group.add(at(mesh(roundedBox(44, 26, 110, 5, 3), plastic), cx(170), cy(288), seatZ - 20));
  const outlinePts = [[-150, 0], [150, 0]];
  for (let i = 0; i <= 24; i++) outlinePts.push([150 - (300 * i) / 24, top(150 - (300 * i) / 24)]);
  const shape = new THREE.Shape(outlinePts.map(([x, z]) => new THREE.Vector2(x, z)));
  const panel = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 1, curveSegments: 4 });
  panel.rotateX(Math.PI / 2); // (the outline stands up; its depth runs south)
  warp(panel, (v) => {
    v.y += arc(v.x);
  }, false);
  const bx = cx(170),
    by = cy(298) - 2,
    BZ = seatZ + 70; // (its foot)
  group.add(at(mesh(panel, netting), bx, by, BZ));
  const rail = densify(outlinePts, 14); // (the frame round it: a rod along its edge)
  const frame = new THREE.CatmullRomCurve3(rail.map(([x, z]) => new THREE.Vector3(x, arc(x) - 2, z)), true, "centripetal");
  group.add(at(mesh(new THREE.TubeGeometry(frame, rail.length * 3, 5, 10, true), plastic), bx, by, BZ));
  const lumbar = warp(rbox(220, 20, 70, 8, 9), (v) => {
    v.y += arc(v.x) * 0.9 + (v.y > 0 ? 2 * Math.max(0, 1 - (v.x / 110) ** 2) : 0);
  });
  lumbar.translate(0, 0, 35);
  group.add(at(mesh(lumbar, cloth), bx, by + 10, seatZ + 150));
  // the headrest on its stem: padded, curved with the back, 88 thick (high) so that its dome reaches 1020
  group.add(at(mesh(roundedBox(20, 14, 40, 3, 2), chrome), cx(170), cy(299), seatZ + 70 + 520));
  const head = warp(rbox(210, 34, 88, 10, 15), (v) => {
    v.y += (v.x * v.x) / 900;
    if (v.z > 20) v.z += 2 * Math.max(0, 1 - (v.x / 105) ** 2);
  });
  head.translate(0, 0, 44);
  group.add(at(mesh(head, cloth), cx(170), cy(297), seatZ + 110 + 520));
  return { group, height: 1020 };
}

// The tie, a thing of its own (the way back to the professional home): draped over the chair's headrest where it stands, its strip on the
// top, the knot on the back, the blade down the back towards the reader, 46 wide and 170 long, cut to a point. Its origin is the point of
// the headrest's top where it lies, x east, y north (the back is to the south), z up; the room puts it on the chair at (-70, -137, 1019)
// of the chair's frame, turned as the chair is. The headrest curves back at its sides, so the tie is bent to lie on it.
export async function tie() {
  const group = new THREE.Group();
  const silk = std("tie", 0.32);
  silk.side = THREE.DoubleSide;
  const back = -11.6; // (the headrest's back face here, from the tie's origin)
  const hug = (x) => ((x - 70) ** 2 - 4900) / 900; // (how far north the headrest's back lies at x from the tie's own middle)
  group.add(at(mesh(roundedBox(18, 34, 2, 0.6, 1), silk), 0, 5.4, 0.3));
  const down = warp(roundedBox(18, 2, 34, 0.6, 1), (v) => {
    v.y += hug(v.x);
  }, false);
  group.add(at(mesh(down, silk), 0, back - 1, -33));
  const knotGeo = warp(extrude([[-13, 0], [13, 0], [7.3, -32], [-7.3, -32]], 8, 1.6), (v) => {
    v.z -= hug(v.x);
    v.x *= 1 + 0.06 * Math.sin((v.y / 32) * Math.PI); // (the knot swells)
  }, false);
  const knot = mesh(knotGeo, silk);
  knot.rotation.x = Math.PI / 2; // (its outline stands up, its thickness runs south)
  group.add(at(knot, 0, back, -30));
  const bladeGeo = warp(extrude([[-9, 0], [9, 0], [23, -143], [0, -170], [-23, -143]], 3, 0.8), (v) => {
    v.z -= hug(v.x);
  }, false);
  const blade = mesh(bladeGeo, silk);
  blade.rotation.x = Math.PI / 2;
  group.add(at(blade, 0, back - 3, -60));
  return { group, height: 2 };
}

// the wastebasket: a black wire-mesh basket, its rim and foot rolled solid, the mesh seen through to the sheets in it
function wireTexture(renderer) {
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 112;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, 64, 112);
  g.strokeStyle = "#fff";
  g.lineWidth = 5;
  g.lineCap = "square";
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 112);
  g.moveTo(64, 0);
  g.lineTo(0, 112);
  g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.generateMipmaps = false; // (a thin wire averaged over a mip level falls under the cut-off and thins out)
  t.minFilter = THREE.LinearFilter;
  return t;
}
// a sheet of paper crumpled into a ball: a sphere pushed in and out by a few folds, seeded so that it is the same each time
function crumple(radius, seed) {
  const g = mergeVertices(new THREE.IcosahedronGeometry(radius, 4).deleteAttribute("normal").deleteAttribute("uv"));
  const p = g.attributes.position;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const folds = Array.from({ length: 7 }, () => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize());
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone().normalize();
    let k = 0;
    for (const f of folds) k += Math.abs(Math.sin(u.dot(f) * 6.2)) * 0.12 + Math.max(0, u.dot(f) - 0.82) * -0.5;
    v.copy(u).multiplyScalar(radius * (0.86 + k * 0.5));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export async function bin(renderer) {
  const group = new THREE.Group();
  const R0 = 46,
    R1 = 60,
    H = 200;
  const wire = tint(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.4, alphaMap: null, side: THREE.DoubleSide, transparent: false, alphaTest: 0.5 }), "binWire");
  const map = wireTexture(renderer);
  map.repeat.set((2 * Math.PI * 53) / 11, H / 19.5);
  wire.alphaMap = map;
  const shell = new THREE.LatheGeometry([new THREE.Vector2(R0, 0), new THREE.Vector2(R1, H)], 64);
  shell.rotateX(Math.PI / 2);
  group.add(mesh(shell, wire, { cast: true }));
  // the rim and the foot, rolled solid
  const rolled = tint(new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5 }), "binWire");
  const rim = mesh(new THREE.TorusGeometry(R1, 3.4, 12, 64), rolled);
  group.add(at(rim, 0, 0, H));
  const foot = mesh(new THREE.TorusGeometry(R0 + 0.6, 3, 12, 64), rolled);
  group.add(at(foot, 0, 0, 3));
  const floor = mesh(new THREE.CircleGeometry(R0 - 2, 48), std("binIn", 0.9));
  group.add(at(floor, 0, 0, 1.2));
  // the sheets in it: five balls, at the CSS room's places (x east, y south from the middle; z the foot of each)
  const paperMat = std("binPaper", 0.9);
  [[-14, 6, 2, 46, 11], [18, -10, 2, 40, 23], [-4, -22, 30, 42, 37], [10, 14, 36, 38, 41], [-16, -6, 64, 36, 53]].forEach(([x, y, z, s, seed]) => {
    const sheet = mesh(crumple((s / 2) * 0.82, seed), paperMat);
    group.add(at(sheet, x, -y, z + s / 2));
  });
  return { group, height: H };
}
