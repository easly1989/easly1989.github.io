// The old computer, its keyboard and its mouse (issue #160, ticket 04), as the CSS room has them in size and
// place and drawn as real things: a beige case with a dished glass in a dark bezel, a floppy drive, a speaker, a power
// switch, vents along its side and a yellow note stuck on it; a keyboard on its feet with sixty-four keys and their legends;
// a ball mouse on its cord. Measured from the CSS room (px):
// the case 368 wide (x), 280 deep (y) and 320 high; the keyboard 400 by 136 in front of it; the mouse 68 by 88 to its right.
// Each is built with its origin at the middle of its foot, x east, y north (the case's back), z up; the room puts the set
// down turned 12 degrees counterclockwise (seen from above), as the CSS room's `rotateZ(-12deg)`.

import { THREE, mesh, material, paint, roundedBox, roundedRect, onFace, profile, sweep, extrude } from "./kit.js";

// the case
const W = 368,
  D = 280,
  H = 320;
const BEIGE = "#ddd3ba";
const DARK = "#35332d";

const plastic = (color, roughness = 0.52) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5 });

// the screen when the computer is off: a dark green tube with a glare at its upper left and the scan lines, as the CSS room's
async function offScreen(renderer) {
  return paint(renderer, 248, 184, (g) => {
    const grd = g.createRadialGradient(124, 83, 0, 124, 83, 150);
    grd.addColorStop(0, "#2b3a31");
    grd.addColorStop(0.78, "#10170f");
    grd.addColorStop(1, "#0b100a");
    g.fillStyle = grd;
    g.fillRect(0, 0, 248, 184);
    g.fillStyle = "rgba(0,0,0,0.28)";
    for (let y = 0; y < 184; y += 4) g.fillRect(0, y, 248, 1.5);
    const glare = g.createRadialGradient(70, 33, 0, 70, 33, 90);
    glare.addColorStop(0, "rgba(255,255,255,0.16)");
    glare.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glare;
    g.fillRect(0, 0, 248, 184);
  });
}

// a glass dished out of its frame: x east, z up, its middle `bulge` px proud of its edge (facing south, its edge at y = 0)
function dish(w, h, bulge) {
  const g = new THREE.PlaneGeometry(w, h, 40, 30);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2),
      y = p.getY(i) / (h / 2);
    p.setZ(i, bulge * (1 - (x * x + y * y) / 2));
  }
  g.computeVertexNormals();
  return g;
}

export async function computer(renderer) {
  const group = new THREE.Group();
  const beige = plastic(BEIGE);
  const dark = plastic(DARK, 0.6);
  // the case: a box with its edges rounded, a hair narrower at the top as a tube's housing is; feet of rubber under it
  group.add(mesh(roundedBox(W, D, H, 14, 4), beige));
  for (const [x, y] of [[-150, -110], [150, -110], [-150, 110], [150, 110]]) {
    const foot = mesh(roundedBox(40, 30, 3, 1.4, 2), material.rubber());
    foot.position.set(x, y, -3);
    group.add(foot);
  }
  const FY = -D / 2; // the front face
  // the bezel round the glass: a dark frame 14 px wide standing 8 px off the front, the glass 248 by 184 inside it
  const GX = -W / 2 + 24 + 124, // the glass's middle, from the case's left (24 px in) and top (24 px down)
    GZ = H - 24 - 92;
  const hole = roundedRect(248, 184, 30);
  const bezel = new THREE.ExtrudeGeometry(roundedRect(248 + 28, 184 + 28, 40, hole), { depth: 9, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.2, bevelSegments: 3, curveSegments: 32 });
  group.add(mesh(onFace(bezel, "front", [GX, FY, GZ]), dark));
  // the glass itself, 256 by 192, its edge tucked 3 px under the bezel and dished out to a middle 9 px proud of that
  const glass = new THREE.MeshPhysicalMaterial({ map: await offScreen(renderer), roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  group.add(mesh(onFace(dish(256, 192, 9), "front", [GX, FY - 4, GZ]), glass, { cast: false }));

  // the floppy drive: a raised panel 176 by 48 with its slot, and the light that says it is reading
  const DX = -W / 2 + 32 + 88,
    DZ = H - 240 - 24;
  const drive = mesh(roundedBox(176, 5, 48, 1.8, 2), plastic("#d0c7af", 0.5));
  drive.position.set(DX, FY - 2.5, DZ - 24);
  group.add(drive);
  const slot = mesh(roundedBox(144, 3, 12, 1, 1), plastic("#2b2823", 0.7));
  slot.position.set(DX, FY - 6, DZ - 24 + 14);
  group.add(slot);
  const busy = mesh(roundedBox(20, 3, 12, 1, 1), plastic("#6a4a35", 0.5));
  busy.position.set(-W / 2 + 208 + 10, FY - 1.5, H - 256 - 6);
  group.add(busy);

  // the speaker: three slits 4 px wide, 12 apart; the power switch, a rocker with its light, at the bottom right
  for (let i = 0; i < 3; i++) {
    const slit = mesh(roundedBox(4, 3, 40, 1, 1), plastic("#47423a", 0.7));
    slit.position.set(-W / 2 + 232 + i * 12 + 2, FY - 1, 28);
    group.add(slit);
  }
  const rocker = mesh(roundedBox(36, 6, 36, 3, 2), plastic("#5a5248", 0.45));
  rocker.position.set(-W / 2 + 318, FY - 3, 32);
  group.add(rocker);
  const led = mesh(new THREE.CylinderGeometry(6, 6, 3, 20), plastic("#4d5a4f", 0.4));
  led.rotation.x = Math.PI / 2;
  led.position.set(-W / 2 + 344, FY - 1.5, 84);
  group.add(led);

  // the side the camera sees: vents, eight upright slots 8 px wide and 96 long, 24 apart
  // (cut into the side, so drawn on it, in the dark of a slot; the note goes over them, as the CSS room's does)
  const WX = -W / 2;
  const vents = await paint(renderer, 184, 96, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = "rgba(48,42,30,0.82)";
      g.beginPath();
      g.roundRect(i * 24 + 6, 0, 8, 96, 3);
      g.fill();
      g.fillStyle = "rgba(255,248,230,0.35)"; // the lip of each slot, lit from above
      g.fillRect(i * 24 + 6, 0, 8, 1.2);
    }
  });
  group.add(mesh(onFace(new THREE.PlaneGeometry(184, 96), "west", [WX - 0.15, D / 2 - (48 + 92), 184 + 48]), new THREE.MeshStandardMaterial({ map: vents, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), { cast: false }));

  // the yellow note, stuck along its top edge 96 px from the back, 138 down from the top, 180 by 150, its lower part curling off the case
  const note = await paint(renderer, 180, 150, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 150);
    grd.addColorStop(0, "#ffe36e");
    grd.addColorStop(0.64, "#ffe36e");
    grd.addColorStop(0.84, "#ffeb8c");
    grd.addColorStop(0.92, "#ffe98a");
    grd.addColorStop(1, "#e8c450");
    g.fillStyle = grd;
    g.fillRect(0, 0, 180, 150);
    g.fillStyle = "#2b2400";
    g.textBaseline = "top";
    g.font = '700 18.4px "Bricolage Grotesque", sans-serif';
    g.fillText("Write to me", 18, 18 + 2);
    g.font = '400 14.4px "Atkinson Hyperlegible", sans-serif';
    const words = "A project, a licence, or just to talk shop.".split(" ");
    let line = "",
      y = 18 + 23.92 + 6.4;
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (g.measureText(t).width > 144 && line) {
        g.fillText(line, 18, y);
        line = w;
        y += 19.44;
      } else line = t;
    }
    g.fillText(line, 18, y);
  });
  const paper = new THREE.PlaneGeometry(180, 150, 12, 16);
  {
    const p = paper.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 1 - (p.getY(i) + 75) / 150; // 0 at its stuck top edge, 1 at the foot
      p.setZ(i, 0.6 + 9 * Math.pow(Math.max(0, f - 0.62) / 0.38, 2));
    }
    paper.computeVertexNormals();
  }
  const noteMat = new THREE.MeshStandardMaterial({ map: note, roughness: 0.9, side: THREE.DoubleSide });
  // (its middle: 96 + 90 px from the back, 288 - 75 up; a paper that is a little turned, as stuck by hand)
  const noteMesh = mesh(onFace(paper, "west", [WX - 0.9, D / 2 - (96 + 90), 288 - 75]), noteMat);
  group.add(noteMesh);
  group.userData = { front: FY, west: WX, height: H };
  return { group, height: H };
}

// the keyboard: 400 by 136 on its feet, 16 px high at the front and 34 at the back, a well of 352 by 80 with four rows of sixteen keys
// 16 px square on a pitch of 22 by 20, and a spacebar 160 by 16, every key with its legend
export async function keyboard(renderer) {
  const group = new THREE.Group();
  const body = plastic("#d5cbb2", 0.55);
  const KW = 400,
    KD = 136,
    FRONT = 16,
    BACK = 34;
  group.add(mesh(profile([[-KD / 2, 0], [KD / 2, 0], [KD / 2, BACK], [-KD / 2, FRONT]], KW, 2.5), body));
  const tilt = Math.atan2(BACK - FRONT, KD);
  const deck = new THREE.Group();
  deck.position.set(0, -KD / 2, FRONT);
  deck.rotation.x = tilt;
  group.add(deck);
  // the well the keys stand in, a shade darker
  const well = mesh(roundedBox(352, 80, 2, 1, 1), plastic("#c9bfa4", 0.7));
  well.position.set(0, KD - 56, 0); // (16 px from the back edge, 80 deep: its middle 56 from it)
  deck.add(well);
  // the keys: instanced, 16 by 16 and 5.6 high, rounded, the same cream
  const keyGeo = roundedBox(16, 16, 5.6, 2.2, 2);
  const keys = new THREE.InstancedMesh(keyGeo, plastic("#efe9dc", 0.5), 64);
  keys.castShadow = keys.receiveShadow = true;
  const m = new THREE.Matrix4();
  const place = (i, ex, ey) => {
    // (ex, ey from the keyboard's left and back edges, in the CSS keyboard's own px; the deck's y runs from the front)
    m.makeTranslation(-KW / 2 + ex + 8, KD - ey - 8, 2);
    keys.setMatrixAt(i, m);
  };
  let i = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 16; col++) place(i++, 24 + col * 22, 16 + row * 20);
  keys.instanceMatrix.needsUpdate = true;
  deck.add(keys);
  const space = mesh(roundedBox(160, 16, 5.6, 2.2, 2), plastic("#efe9dc", 0.5));
  space.position.set(-KW / 2 + 120 + 80, KD - 104 - 8, 2);
  deck.add(space);
  // the legends, painted on one sheet laid over the key tops (a px over them), in the order of the rows
  const rows = [
    ["Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "\\", "`", "Del"],
    ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", ";", "'", "Bs"],
    ["Ctl", "A", "S", "D", "F", "G", "H", "J", "K", "L", ",", ".", "/", "~", "Ret", "End"],
    ["Sh", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "+", "Alt", "Fn", "Up", "Sh"],
  ];
  const legends = await paint(renderer, KW, KD, (g) => {
    g.clearRect(0, 0, KW, KD);
    g.fillStyle = "#4b463c";
    g.textAlign = "center";
    g.textBaseline = "middle";
    rows.forEach((r, row) =>
      r.forEach((t, col) => {
        g.font = (t.length > 2 ? '700 6.5px' : '700 9px') + ' "Atkinson Hyperlegible", sans-serif';
        g.fillText(t, 24 + col * 22 + 8, 16 + row * 20 + 8.5);
      }),
    );
    g.font = '700 7px "Atkinson Hyperlegible", sans-serif';
    g.fillText("SPACE", 120 + 80, 104 + 8.5);
  });
  const sheet = new THREE.PlaneGeometry(KW, KD);
  const sheetMesh = mesh(sheet, material.decal(legends), { cast: false });
  sheetMesh.name = "legends";
  sheetMesh.position.set(0, KD / 2, 2 + 5.6 + 0.15);
  sheetMesh.material.depthWrite = false;
  deck.add(sheetMesh);
  return { group, height: BACK };
}

// the mouse: a ball mouse of the computer's beige, 68 by 88, its nose to the back (the room's CC0 model of it, assets/mouse, has too few
// faces to be smooth: this is made of a smooth surface), a dome whose plan is a rounded rectangle a little narrower at the nose, with
// two buttons set off by a seam and a wheel between them; and its cord, 2.2 px thick, running out of its nose, round behind the
// keyboard and into the east side of the case (at x = 184, 140 px from the back, y = -4 here)
const MOUSE = { a: 34, b: 44, c: 27, n: 2.9, q: 2.3 }; // half the width and the length, the height, the squareness of the plan, of the dome
// the height of the dome over a point of its plan, 0 at its edge (the plan's norm t: 1 at the edge)
const taper = (y) => 1 - 0.14 * Math.max(0, y / MOUSE.b);
const norm = (x, y) => (Math.abs(x / (MOUSE.a * taper(y))) ** MOUSE.n + Math.abs(y / MOUSE.b) ** MOUSE.n) ** (1 / MOUSE.n);
const domeAt = (x, y) => MOUSE.c * Math.max(0, 1 - Math.min(1, norm(x, y)) ** MOUSE.q) ** (1 / MOUSE.q);
export async function mouse() {
  const group = new THREE.Group();
  const { a, b, n } = MOUSE;
  // the surface: rings from the middle out, each point of a ring on the superellipse of the plan
  const RING = 96,
    RAD = 28;
  const pos = [],
    idx = [];
  const sg = (v, p) => Math.sign(v) * Math.abs(v) ** p;
  for (let j = 0; j <= RAD; j++) {
    const t = j / RAD;
    for (let i = 0; i < RING; i++) {
      const th = (i / RING) * Math.PI * 2;
      const y = b * sg(Math.sin(th), 2 / n) * t,
        x = a * taper(y) * sg(Math.cos(th), 2 / n) * t;
      pos.push(x, y, domeAt(x, y));
    }
  }
  for (let j = 0; j < RAD; j++)
    for (let i = 0; i < RING; i++) {
      const k = j * RING + i,
        k1 = j * RING + ((i + 1) % RING);
      idx.push(k, k + RING, k1, k1, k + RING, k1 + RING);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const beige = new THREE.MeshPhysicalMaterial({ color: "#d6ccb2", roughness: 0.42, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
  group.add(mesh(geo, beige));
  // the seams, a groove 1.1 px across: between the buttons down the middle of the front half, and across where they end
  const dark = new THREE.MeshStandardMaterial({ color: "#7d755f", roughness: 0.8 });
  const groove = (pts) => group.add(mesh(sweep(pts.map(([x, y]) => [x, y, domeAt(x, y) + 0.1]), 0.55, { radial: 6 }), dark, { cast: false }));
  groove(Array.from({ length: 9 }, (_, i) => [0, 6 + i * 4.1]));
  groove(Array.from({ length: 13 }, (_, i) => [-26 + i * 4.33, 6]));
  // the wheel, a dark pill let into the seam between the buttons
  const wheel = mesh(roundedBox(6, 12, 4, 1.6, 3), plasticDark());
  wheel.position.set(0, 24, domeAt(0, 24) - 1.6);
  wheel.rotation.x = -Math.atan2(domeAt(0, 28) - domeAt(0, 20), 8);
  group.add(wheel);
  const height = MOUSE.c;
  // the cord, from the nose (the mouse at (298, -264) from the case's middle, 44 px to its back) to the case's east side
  const cord = sweep([[0, 44, 2.2], [0, 84, 2.2], [-34, 190, 2.2], [-100, 252, 2.2], [-114, 262, 2.2]], 2.2, { radial: 8 });
  const cordMesh = mesh(cord, new THREE.MeshStandardMaterial({ color: "#8b836c", roughness: 0.85 }));
  cordMesh.name = "cord";
  group.add(cordMesh);
  return { group, height, cord: cordMesh };
}
const plasticDark = () => new THREE.MeshStandardMaterial({ color: "#6f6858", roughness: 0.5 });

// the set, as it stands on the desk: the case on the desk (4 px under the mat's top), the keyboard in front of it and the
// mouse and its cord to its right; the origin is the middle of the case's foot
export async function pc(renderer) {
  const set = new THREE.Group();
  const c = await computer(renderer);
  c.group.position.z = -4;
  set.add(c.group);
  const k = await keyboard(renderer);
  k.group.position.set(0, -240, 0);
  set.add(k.group);
  const mo = await mouse();
  mo.group.position.set(298, -264, 0);
  // (the cord is in the case's frame: it starts at the mouse's nose and ends at the case)
  set.add(mo.group);
  return { group: set, height: H };
}
