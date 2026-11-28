// What hangs on the room's two walls (issue #160, ticket 08), as the CSS room has it in size and place: the neon sign with the name and the line
// about the work cut into the wall under it, the poster (the note that says what the bench is), the neon navigation in its smoked frame on the
// right wall, and the light switch. Each is built in the plane of its wall, x along it as a reader of it reads, y up, z out of the wall into the
// room, and turned onto its wall by a holder (`onBack`, `onRight`); the origin of each is its middle, on the wall's face. The neon is real tubes
// (gl/neon.js): a pale core in coloured glass, held off the board on posts, and a glow round it (a plane of its own, added to the wall's light, that is bigger than the board).

import { THREE, mesh, roundedBox, paint, paintLive, scheme } from "./kit.js";
import { layout, tubes, haloStrokes } from "./neon.js";

const std = (color, roughness = 0.6, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// the back wall faces south (x east, y up, out of it to the south); the right wall faces west (x runs south, y up, out of it to the west)
const holder = (inner, basis) => {
  const h = new THREE.Group();
  h.add(inner);
  h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...basis));
  return h;
};
const onBack = (inner) => holder(inner, [V(1, 0, 0), V(0, 0, 1), V(0, -1, 0)]);
const onRight = (inner) => holder(inner, [V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0)]);

// a drawing that can be made again (the neon changes colour): the texture's own canvas is drawn over
function redraw(tex, k, draw) {
  const g = tex.image.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, tex.image.width, tex.image.height);
  g.scale(k, k);
  draw(g);
  tex.needsUpdate = true;
  window.dispatchEvent(new Event("gl-redraw"));
}
const mix = (hex, other, t) => {
  const a = new THREE.Color(hex),
    b = new THREE.Color(other);
  return "#" + a.lerp(b, t).getHexString();
};
const glowOf = (neon) => [[2, mix(neon, "#ffffff", 0.6)], [7, neon], [16, neon], [34, neon], [60, neon + "99"]];
// the smoked board a neon is mounted on: dark, a pale line just inside its edge, a fainter one inside that
function board(g, w, h, r, edge) {
  g.fillStyle = "rgba(24,30,38,0.82)";
  g.beginPath();
  g.roundRect(0, 0, w, h, r);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.45)";
  g.lineWidth = edge;
  g.beginPath();
  g.roundRect(edge / 2, edge / 2, w - edge, h - edge, Math.max(1, r - edge / 2));
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.08)";
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect(edge + 3, edge + 3, w - 2 * edge - 6, h - 2 * edge - 6, Math.max(1, r - edge - 3));
  g.stroke();
}
// four screws at the corners of a board w by h, 14 in from each
function screws(w, h, z) {
  const g = new THREE.Group();
  const m = std("#d9dde0", 0.25, { metalness: 1 });
  for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) {
    const s = mesh(new THREE.CylinderGeometry(3.2, 3.2, 2.4, 20), m);
    s.rotation.x = Math.PI / 2;
    s.position.set(x - w / 2, h / 2 - y, z + 1.2);
    g.add(s);
  }
  return g;
}

// ---- the sign: the name in neon tubes on a smoked board 737 by 136, and the line about the work cut into the wall under it ----
export async function sign(renderer) {
  const inner = new THREE.Group();
  const W = 737,
    H = 136;
  let neon = "#ff4fa0";
  const AT = { x: 40, y: 93 }; // (where the name's baseline starts on the board, from its top left: the CSS room's text box)
  const lay = layout("Carlo Ruggiero", 657, 76); // (657 wide, the capital 76 high, as the typeface's name was)
  const face = await paint(renderer, W, H, (g) => board(g, W, H, 18, 2), { k: 4 });
  const GL = 90; // (the glow runs this far out of the board)
  const drawHalo = (g) => haloStrokes(g, 2, lay, { x: GL + AT.x, y: GL + AT.y }, neon, glowOf, 8);
  const halo = await paint(renderer, W + 2 * GL, H + 2 * GL, drawHalo, { k: 2 });
  const plate = mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: face, transparent: true, roughness: 0.25 }), { cast: false });
  plate.position.z = 3.1;
  inner.add(plate);
  const slab = mesh(roundedBox(W, H, 3, 1.2, 1), std("#181e26", 0.4)); // (the acrylic's own body behind its print)
  slab.position.z = 0;
  inner.add(slab);
  inner.add(screws(W, H, 3.1));
  // the tubes, standing 5 off the board's face
  const tg = tubes(lay, { r: 3.8, lift: 5, neon });
  tg.position.set(-W / 2 + AT.x, H / 2 - AT.y, 3.1);
  inner.add(tg);
  const glow = mesh(new THREE.PlaneGeometry(W + 2 * GL, H + 2 * GL), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }), { cast: false, receive: false });
  glow.position.z = 3.4;
  inner.add(glow);
  // the line about the work, cut into the wall: 703 by 28, its letters in the wall's ink with a dark edge above and a light one below
  const line = await paintLive(renderer, 703, 28, (g) => {
    const dark = scheme.matches;
    g.font = '700 23px "Bricolage Grotesque", sans-serif';
    g.textBaseline = "alphabetic";
    const text = "Senior Architect & Software Developer, 10\u00a0years and counting.";
    g.fillStyle = dark ? "rgba(255,244,226,0.3)" : "rgba(255,250,238,0.85)";
    g.fillText(text, 0, 21.5 + 1);
    g.fillStyle = dark ? "rgba(0,0,0,0.6)" : "rgba(30,24,16,0.4)";
    g.fillText(text, 0, 21.5 - 1);
    g.fillStyle = dark ? "#e3dccf" : "#3a3631";
    g.fillText(text, 0, 21.5);
  }, { k: 4 });
  const lineMesh = mesh(new THREE.PlaneGeometry(703, 28), new THREE.MeshStandardMaterial({ map: line, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { cast: false });
  lineMesh.position.set(17, -104, 0.1); // (the CSS room's p box: its middle 17 east and 104 under the board's middle)
  inner.add(lineMesh);
  const group = onBack(inner);
  // the colour the tube is: a hex colour; the glass, the core and the glow take it
  group.userData.neon = {
    get color() {
      return neon;
    },
    setColor(c) {
      neon = c;
      tg.userData.setColor(c);
      redraw(halo, 2, drawHalo);
    },
  };
  return { group, height: H };
}

// ---- the poster: the note, 480 by 190 and shown at 1.35 (648 by 256.5), turned a degree, taped at its two top corners, a bar of the six colours at its foot ----
export async function poster(renderer) {
  const inner = new THREE.Group();
  const S = 1.35;
  const paper = await paintLive(renderer, 480, 190, (g) => {
    g.fillStyle = scheme.matches ? "#e9e8e0" : "#fbfbf6";
    g.fillRect(0, 0, 480, 190);
    // the words: the first sentence in bold, the rest after it, one paragraph 420 wide
    const first = "This is my bench.",
      rest = "Everything on it is something I built and still look after. Pick anything up to see what it is. The cat is not for sale, and does what it likes.";
    const words = [...first.split(" ").map((w) => [w, true]), ...rest.split(" ").map((w) => [w, false])];
    const bold = '800 26.45px "Bricolage Grotesque", sans-serif',
      plain = '400 23px "Atkinson Hyperlegible", sans-serif';
    g.fillStyle = "#1d211f";
    g.textBaseline = "alphabetic";
    let x = 30,
      y = 26 + 31.74 * 0.5 + 8;
    const maxX = 480 - 30;
    for (const [w, b] of words) {
      g.font = b ? bold : plain;
      const ww = g.measureText(w).width,
        sp = g.measureText(" ").width;
      if (x + ww > maxX && x > 30) {
        x = 30;
        y += 31.74;
      }
      g.fillText(w, x, y);
      x += ww + sp;
    }
    // the bar of the six colours along the foot: cloudbank, scs, nutreek, planora, cupid, asf
    ["#2f6fd0", "#5b4cf0", "#2f7d32", "#6d59ad", "#c4356a", "#0f766e"].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect((i * 480) / 6, 180, 480 / 6 + 0.5, 10);
    });
  }, { k: 6 });
  const sheet = new THREE.Group();
  const edge = std("#f1efe6", 0.9);
  const body = mesh(new THREE.BoxGeometry(480 * S, 190 * S, 1.2), [edge, edge, edge, edge, std("#ffffff", 0.85, { map: paper }), edge]);
  body.position.z = 2.4;
  sheet.add(body);
  // the tape at its top corners, 76 by 24 (shown at 1.35), the left turned -30 degrees, the right +30
  for (const [cx, deg] of [[20, 30], [460, -30]]) {
    const t = mesh(new THREE.BoxGeometry(76 * S, 24 * S, 0.5), new THREE.MeshStandardMaterial({ color: "#f0e7cc", transparent: true, opacity: 0.85, roughness: 0.9 }), { cast: false });
    t.position.set((cx - 240) * S, (95 - 6) * S, 3.2);
    t.rotation.z = (deg * Math.PI) / 180;
    sheet.add(t);
  }
  sheet.rotation.z = (-1 * Math.PI) / 180; // (one degree clockwise as the room reads it)
  inner.add(sheet);
  return { group: onBack(inner), height: 190 * S };
}

// ---- the navigation: four words in neon tubes (the one for this page in pink, the others in blue) on a smoked board 700 by 96, on the right wall ----
export async function nav(renderer) {
  const inner = new THREE.Group();
  const W = 700,
    H = 96;
  // (each word: its left on the board, its width as the CSS room has it, its colour)
  const LINKS = [["Projects", 36, 136, "#ff4fa0"], ["About", 221, 103, "#3fd2ff"], ["Donate", 374, 124, "#3fd2ff"], ["GitHub", 548, 116, "#3fd2ff"]];
  const BASE = 60; // (the words' baseline, from the board's top)
  const CAP = 27.4; // (the capital's height: 38 px type)
  const sh = (c) => [[3, c], [9, c], [20, c]];
  const words = LINKS.map(([t, x, w, c]) => ({ x, c, lay: layout(t, w, CAP) }));
  const face = await paint(renderer, W, H, (g) => board(g, W, H, 14, 2), { k: 4 });
  const GL = 40;
  const halo = await paint(renderer, W + 2 * GL, H + 2 * GL, (g) => {
    for (const w of words) haloStrokes(g, 2, w.lay, { x: GL + w.x, y: GL + BASE }, w.c, sh, 3.6);
  }, { k: 2 });
  const plate = mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: face, transparent: true, roughness: 0.25 }), { cast: false });
  plate.position.z = 3.1;
  inner.add(plate);
  const slab = mesh(roundedBox(W, H, 3, 1.2, 1), std("#181e26", 0.4));
  slab.position.z = 0;
  inner.add(slab);
  inner.add(screws(W, H, 3.1));
  for (const w of words) {
    const tg = tubes(w.lay, { r: 1.9, lift: 3.5, neon: w.c });
    tg.position.set(-W / 2 + w.x, H / 2 - BASE, 3.1);
    inner.add(tg);
  }
  const glow = mesh(new THREE.PlaneGeometry(W + 2 * GL, H + 2 * GL), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }), { cast: false, receive: false });
  glow.position.z = 3.4;
  inner.add(glow);
  return { group: onRight(inner), height: H };
}

// ---- the light switch: a cream plate 64 by 100 standing 10 off the wall, a rocker on it (pressed at its top, which is "on"), a small orange lamp above ----
export async function lightSwitch(renderer) {
  const inner = new THREE.Group();
  const plate = mesh(roundedBox(64, 100, 9, 3, 2), std("#f1ece2", 0.45));
  plate.position.z = 1;
  inner.add(plate);
  const rocker = new THREE.Group();
  const body = mesh(roundedBox(28, 56, 6, 2, 2), std("#e8e2d6", 0.4));
  rocker.add(body);
  const grad = await paint(renderer, 28, 56, (g) => {
    g.fillStyle = "#fbf9f4";
    g.fillRect(0, 0, 28, 28);
    g.fillStyle = "#ddd6c8";
    g.fillRect(0, 28, 28, 28);
  }, { k: 6 });
  const top = mesh(new THREE.PlaneGeometry(28, 56), new THREE.MeshStandardMaterial({ map: grad, roughness: 0.4 }), { cast: false });
  top.position.z = 6.02;
  rocker.add(top);
  const lamp = mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshStandardMaterial({ color: "#f5a623", emissive: "#f5a623", emissiveIntensity: 1.2, roughness: 0.4 }), { cast: false });
  lamp.position.set(0, 37, 1);
  rocker.add(lamp);
  rocker.position.z = 10;
  rocker.rotation.x = (-14 * Math.PI) / 180; // (on: its top is pressed in towards the wall)
  inner.add(rocker);
  const group = onBack(inner);
  let on = true;
  group.userData.lightSwitch = {
    isOn: () => on,
    setOn(next) {
      on = !!next;
      rocker.rotation.x = ((on ? -14 : 14) * Math.PI) / 180;
      top.rotation.z = on ? 0 : Math.PI; // (its two halves, the lighter on the pressed side, turn over with it)
      window.dispatchEvent(new Event("gl-redraw"));
    },
  };
  return { group, height: 100 };
}
