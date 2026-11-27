// The office chair with its tie, and the wire wastebasket (issue #160, ticket 05), as the CSS room has them in size and place,
// built as real things. Each has its origin at the middle of its foot on the floor (the floor is z = -560 in the room), x east, y
// north, z up; the room puts the chair down turned 28 degrees clockwise from above, as the CSS room's `rotateZ(28deg)`.
// The chair is 340 by 320 on its casters and 1020 high with its headrest; the basket stands in a square 110 across, 200 high, its
// foot 46 across the middle and its rim 60.

import { THREE, mesh, tint, roundedBox, extrude } from "./kit.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const std = (key, roughness = 0.6, extra) => tint(new THREE.MeshStandardMaterial({ roughness, ...extra }), key);
const at = (m, x, y, z = 0) => {
  m.position.set(x, y, z);
  return m;
};
// the CSS chair's own px (x east and y south, from its top left corner, the element 340 by 320) to the chair's frame
const cx = (x) => x - 170;
const cy = (y) => 160 - y;

export async function chair() {
  const group = new THREE.Group();
  const seatZ = 300; // from the floor (the CSS room's FLOOR + 300)
  const leg = std("chairLeg", 0.5, { metalness: 0.1 });
  const body = std("chair", 0.85); // fabric
  const mesh_ = std("chairMesh", 0.9);
  const metal = new THREE.MeshStandardMaterial({ color: "#9aa2a8", roughness: 0.3, metalness: 1 });
  const wheel = new THREE.MeshStandardMaterial({ color: "#2a2f33", roughness: 0.7 });
  // five arms of a star, 180 long, with a caster on the end of each, a hub, and the gas lift
  for (let a = 0; a < 5; a++) {
    const deg = a * 72 + 18,
      r = (deg * Math.PI) / 180,
      dx = Math.cos(r),
      dy = -Math.sin(r); // (the CSS angle runs clockwise from east, with y south)
    const arm = mesh(roundedBox(180, 20, 14, 5, 3), leg);
    arm.position.set(cx(170) + dx * 90, cy(150) + dy * 90, 30);
    arm.rotation.z = -r;
    group.add(arm);
    const fork = mesh(roundedBox(14, 14, 14, 3, 2), leg);
    fork.position.set(cx(170) + dx * 172, cy(150) + dy * 172, 28);
    group.add(fork);
    const wh = new THREE.Group();
    wh.add(mesh(new THREE.CylinderGeometry(15, 15, 10, 24), wheel)); // (axle along y: turned with the group to lie across the arm)
    wh.position.set(cx(170) + dx * 176, cy(150) + dy * 176, 17);
    wh.rotation.z = -r;
    group.add(wh);
  }
  const hub = mesh(new THREE.CylinderGeometry(34, 38, 24, 40), leg);
  hub.rotation.x = Math.PI / 2;
  group.add(at(hub, cx(170), cy(150), 40));
  const lift = mesh(new THREE.CylinderGeometry(16, 16, 220, 28), metal);
  lift.rotation.x = Math.PI / 2;
  group.add(at(lift, cx(170), cy(150), 52 + 110));
  // the seat, 320 by 290 and 32 thick, its edges rounded
  group.add(at(mesh(roundedBox(320, 290, 32, 30, 5), body), cx(170), cy(145), seatZ - 32));
  // armrests, each on a post and a pad
  for (const x of [15, 315]) {
    group.add(at(mesh(roundedBox(22, 22, 150, 5, 2), leg), cx(x), cy(131), seatZ));
    group.add(at(mesh(roundedBox(42, 190, 18, 10, 4), leg), cx(x), cy(135), seatZ + 150));
  }
  // the back: its post, five slats on an arc, a lumbar pad standing off them, the headrest on its stem
  group.add(at(mesh(roundedBox(44, 26, 110, 4, 2), leg), cx(170), cy(285), seatZ - 20));
  for (let s = -2; s <= 2; s++) {
    const slat = mesh(roundedBox(60, 24, 520 - Math.abs(s) * 30, 6, 3), Math.abs(s) === 2 ? leg : mesh_);
    slat.position.set(cx(170 + s * 58), cy(298 - s * s * 9), seatZ + 70);
    slat.rotation.z = (s * 9 * Math.PI) / 180;
    group.add(slat);
  }
  group.add(at(mesh(roundedBox(220, 14, 70, 12, 4), body), cx(170), cy(275), seatZ + 150));
  group.add(at(mesh(roundedBox(20, 14, 40, 3, 2), metal), cx(170), cy(299), seatZ + 70 + 520));
  group.add(at(mesh(roundedBox(210, 34, 90, 22, 5), body), cx(170), cy(297), seatZ + 110 + 520));

  // the tie: hung over the headrest's front, knotted, its blade down the back towards the reader. Its top lies on the headrest, the
  // knot below it, the blade 46 wide and 170 long, cut to a point.
  const TOP = seatZ + 110 + 520 + 90; // the headrest's top
  const tie = std("tie", 0.55);
  const tx = cx(100);
  group.add(at(mesh(roundedBox(18, 34, 2, 0.6, 1), tie), tx, cy(297), TOP));
  const knot = mesh(extrude([[-9, 0], [9, 0], [13, -32], [-13, -32]].map(([x, z]) => [x, z]), 8, 1.2), tie);
  knot.rotation.x = Math.PI / 2; // (its outline stands up, its thickness runs south)
  knot.position.set(tx, cy(314) - 8, TOP - 30);
  group.add(knot);
  const blade = mesh(extrude([[-6, 0], [6, 0], [23, -143], [0, -170], [-23, -143]], 3, 0.8), tie);
  blade.rotation.x = Math.PI / 2;
  blade.position.set(tx, cy(318) - 3, TOP - 60);
  group.add(blade);
  group.userData = { tie: [blade, knot] };
  return { group, height: TOP + 2 };
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
