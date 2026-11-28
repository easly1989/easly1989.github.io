// The odds and ends that lie on the desk (issue #160, ticket 08), as the CSS room draws them (styles.css `.loose`, room.js LOOSE): a pencil, an
// eraser, a paper clip, a coin, a bottle cap, a USB stick and a rubber band. Each is a real small thing lying flat on z = 0, its origin at the
// middle of its plan, x east, y north, in the CSS room's size, its art as it is there (the pencil's tip to the west, the stick's plug to the east).
// The room draws three to five of the seven on each visit (all of them with `?odds`) and puts them where they go into nothing (room-gl.js).

import { THREE, mesh, roundedBox, paint } from "./kit.js";

const std = (color, roughness = 0.6, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

// ---- the pencil: 240 by 15 and 10 thick, a hexagonal barrel, its tip towards the west: lead, wood, yellow paint, a pink end ----
export function pencil() {
  const group = new THREE.Group();
  const R = 7.5;
  const along = (pts, seg, material) => {
    const g = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x - 120)), seg);
    g.rotateZ(-Math.PI / 2); // (its axis, y, now runs east)
    group.add(mesh(g, material));
  };
  along([[0, 0], [2.6, 9.6]], 24, std("#333333", 0.45));
  along([[2.6, 9.6], [R, 28.8]], 24, std("#e8c59a", 0.8));
  along([[R, 28.8], [R, 220.8]], 6, std("#f2b63d", 0.45, { flatShading: true }));
  along([[R, 220.8], [R, 240], [0, 240]], 6, std("#dd7777", 0.8, { flatShading: true }));
  group.rotation.x = Math.PI / 6; // (a flat side down)
  const holder = new THREE.Group();
  holder.add(group);
  holder.scale.z = 10 / (R * Math.sqrt(3)); // (the hexagon's flat to flat is 13; the CSS room's pencil is 10 thick)
  holder.position.z = 5;
  const out = new THREE.Group();
  out.add(holder);
  return { group: out, height: 10 };
}

// ---- the eraser: 58 by 26 and 12 thick, white, in a blue sleeve over its east 55% ----
export function eraser() {
  const group = new THREE.Group();
  const white = mesh(roundedBox(26.1, 26, 12, 3, 2), std("#f2f2ee", 0.85));
  white.position.x = -29 + 13.05;
  const blue = mesh(roundedBox(31.9, 26, 12, 3, 2), std("#3b6fd6", 0.55));
  blue.position.x = 29 - 15.95;
  group.add(white, blue);
  return { group, height: 12 };
}

// ---- the paper clip: 16 by 46, a steel wire 3 thick wound in two and a half turns ----
export function clip() {
  const pts = [];
  const sg = (v, p) => Math.sign(v) * Math.abs(v) ** p;
  const turns = 2.35,
    N = 140;
  for (let i = 0; i <= N; i++) {
    const phi = 0.5 + (i / N) * turns * 2 * Math.PI,
      s = (phi - 0.5) / (2 * Math.PI);
    const a = 6.5 - 1.9 * s,
      b = 21.5 - 5.4 * s;
    pts.push(new THREE.Vector3(a * sg(Math.cos(phi), 0.5), b * sg(Math.sin(phi), 0.5), 0));
  }
  const wire = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 260, 1.5, 8, false);
  const group = new THREE.Group();
  const m = mesh(wire, std("#b9c0c4", 0.3, { metalness: 0.9 }));
  m.position.z = 1.5;
  group.add(m);
  return { group, height: 3 };
}

// ---- the coin: gold, 45 across (30 as drawn, shown at 1.5) and 6 thick, a ring just inside its edge ----
export async function coin(renderer) {
  const group = new THREE.Group();
  const gold = std("#d2ac45", 0.35, { metalness: 0.85 });
  const edge = mesh(new THREE.LatheGeometry([[0, 0], [21, 0], [22.5, 1.5], [22.5, 4.5], [21, 6], [0, 6]].map(([r, z]) => new THREE.Vector2(r, z)), 64).rotateX(Math.PI / 2), gold);
  group.add(edge);
  const face = await paint(renderer, 30, 30, (g) => {
    const rg = g.createRadialGradient(12, 10.5, 0, 12, 10.5, 21);
    rg.addColorStop(0, "#f3dc8b");
    rg.addColorStop(0.7, "#c49b2e");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(15, 15, 15, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(15, 15, 13.5, 0, Math.PI * 2);
    g.stroke();
  }, { k: 8 });
  const top = mesh(new THREE.CircleGeometry(21, 64), new THREE.MeshStandardMaterial({ map: face, roughness: 0.3, metalness: 0.6 }), { cast: false });
  top.position.z = 6.02;
  group.add(top);
  return { group, height: 6 };
}

// ---- the bottle cap: 30 across and 6 thick, red, a crimped rim of eighteen teeth round a smooth top ----
export function cap() {
  const group = new THREE.Group();
  const star = new THREE.Shape();
  const T = 18;
  for (let i = 0; i < T * 4; i++) {
    const a = (i / (T * 4)) * Math.PI * 2,
      r = 13.7 + 1.3 * Math.cos(a * T);
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const skirt = new THREE.ExtrudeGeometry(star, { depth: 3.2, bevelEnabled: false, curveSegments: 4 });
  group.add(mesh(skirt, std("#a82822", 0.4, { metalness: 0.5 })));
  const dome = new THREE.LatheGeometry([[13.2, 3], [12.7, 5.2], [11.8, 6], [0, 6]].map(([r, z]) => new THREE.Vector2(r, z)), 48).rotateX(Math.PI / 2);
  group.add(mesh(dome, std("#d8332b", 0.35, { metalness: 0.5 })));
  // the ring pressed in the top
  const ring = mesh(new THREE.TorusGeometry(9.5, 0.5, 6, 48), std("#b8241e", 0.4, { metalness: 0.5 }), { cast: false });
  ring.position.z = 6;
  group.add(ring);
  return { group, height: 6 };
}

// ---- the USB stick: 66 by 22 and 8 thick, a black body with chamfered corners at its west and a steel plug, narrower and thinner, to the east ----
export function usb() {
  const group = new THREE.Group();
  const bodyShape = new THREE.Shape([[0, 2.64], [1.98, 0], [47.5, 0], [47.5, 22], [1.98, 22], [0, 19.36]].map(([x, y]) => new THREE.Vector2(x - 33, y - 11)));
  const body = new THREE.ExtrudeGeometry(bodyShape, { depth: 6.8, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2 });
  body.translate(0, 0, 0.6);
  group.add(mesh(body, std("#2a2a2c", 0.5)));
  const collar = mesh(roundedBox(1.4, 15, 5.4, 0.3, 1), std("#9ea4a8", 0.35, { metalness: 0.8 }));
  collar.position.set(14.2, 0, 1.3);
  group.add(collar);
  const plug = mesh(roundedBox(17.2, 14.1, 4.4, 0.5, 1), std("#c7ccd0", 0.25, { metalness: 0.95 }));
  plug.position.set(24.4, 0, 1.8);
  group.add(plug);
  return { group, height: 8 };
}

// ---- the rubber band: dropped in a loose loop, 44 by 34, a flat band 3 wide ----
export function band() {
  const pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    // (an egg, a little lopsided, as the CSS room's radii make it)
    pts.push(new THREE.Vector3(Math.cos(a) * (20.5 + 1.6 * Math.cos(a + 0.7)), Math.sin(a) * (15.5 - 1.2 * Math.sin(a - 0.5)), 0));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "centripetal"), 128, 1.5, 8, true);
  tube.scale(1, 1, 0.55);
  const group = new THREE.Group();
  const m = mesh(tube, std("#d9bf8c", 0.6));
  m.position.z = 0.85;
  group.add(m);
  return { group, height: 1.7 };
}

// by name, as the room draws them (what each is in the pool of seven)
export const LOOSE = { pencil, eraser, clip, coin, "bottle-cap": cap, "usb-stick": usb, "rubber-band": band };

// all seven in a row, for the workbench
export async function looseSet(renderer) {
  const group = new THREE.Group();
  const names = Object.keys(LOOSE);
  let x = -200;
  for (const n of names) {
    const o = await LOOSE[n](renderer);
    o.group.position.set(x, n === "pencil" ? 40 : -20, 0);
    x += n === "pencil" ? 200 : 62;
    group.add(o.group);
  }
  group.position.x = 70;
  return { group, height: 12 };
}
