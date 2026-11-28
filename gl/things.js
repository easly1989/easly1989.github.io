// The small things of the desk and the wall (issue #160, ticket 07), as the CSS room has them in size, place and look: ASF Plugins' pager, the post
// that lies on top of the old computer (a letter, an envelope and Cupid's sealed envelope), and Social Contacts Sync's cards taped to the right wall.
// Each has its own origin, said at its head, and is put in the room by room-gl.js.

import { THREE, mesh, roundedBox, roundedRect, paint, warp } from "./kit.js";

const std = (color, roughness = 0.6, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const decal = (map, extra) => new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...extra });
// a plane lying on a face, `w` east and `d` north (the canvas's top is north)
const lying = (w, d, material, z) => {
  const m = mesh(new THREE.PlaneGeometry(w, d), material, { cast: false });
  m.position.z = z;
  return m;
};
// a paper sheet: w by d by t, its top face (+z) with the picture, the rest its own colour
const sheet = (w, d, t, map, edge) => {
  const e = std(edge, 0.9);
  return mesh(new THREE.BoxGeometry(w, d, t), [e, e, e, e, std("#ffffff", 0.85, { map }), e]);
};
const loadImg = async (src) => {
  const img = new Image();
  img.src = src;
  await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]); // (a picture that never comes must not hold the room back)
  return img;
};
const safeDraw = (g, img, ...a) => {
  try {
    g.drawImage(img, ...a);
  } catch {} // (a picture that did not load leaves its place empty: the thing still stands)
};
// text wrapped to `maxW` at the context's font: its lines
const wrapLines = (g, text, maxW) => {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? line + " " + word : word;
    if (g.measureText(t).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = t;
  }
  lines.push(line);
  return lines;
};

// ---- the pager: 120 by 78 and 16 high in the asf colour, a screen and a paper label on its top, a belt clip down its west side, two keys on its east ----
// The origin is the middle of its foot; the room puts it down turned 7 degrees counterclockwise from above.
export async function pager(renderer) {
  const group = new THREE.Group();
  const W = 120,
    D = 78,
    H = 16;
  const body = new THREE.ExtrudeGeometry(roundedRect(W - 3, D - 3, 9.5), { depth: H - 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 3, curveSegments: 14 });
  body.translate(0, 0, 1.5);
  group.add(mesh(body, std("#0f766e", 0.5)));
  // the belt clip: down the west side, from under the face to just over the mat
  const clip = mesh(roundedBox(7, 46, 10, 2, 2), std("#2b2f2e", 0.5));
  clip.position.set(-61.5, 0, 3);
  group.add(clip);
  // the two keys on the east side
  [15, -3].forEach((y) => {
    const key = mesh(roundedBox(6, 12, 7, 1.5, 2), std("#0a524c", 0.5));
    key.position.set(60, y, 5);
    group.add(key);
  });
  // the screen: 102 by 28, dark green glass in a darker frame, its message in faint green letters that glow a little
  const screen = (emit) =>
    paint(renderer, 102, 28, (g) => {
      if (!emit) {
        g.fillStyle = "#0b1510";
        g.beginPath();
        g.roundRect(0, 0, 102, 28, 4);
        g.fill();
        g.fillStyle = "#14211a";
        g.beginPath();
        g.roundRect(2, 2, 98, 24, 3);
        g.fill();
      } else {
        g.fillStyle = "#000";
        g.fillRect(0, 0, 102, 28);
      }
      g.fillStyle = "#9fd8a0";
      g.font = '500 11.5px "IBM Plex Mono", ui-monospace, monospace';
      g.textBaseline = "middle";
      if (emit) {
        g.shadowColor = "#9fd8a0";
        g.shadowBlur = 3;
      }
      g.fillText("bot2 farming finished", 5, 14.5);
    }, { k: 8 });
  const lcd = lying(102, 28, new THREE.MeshStandardMaterial({ map: await screen(false), emissiveMap: await screen(true), emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), H + 0.1);
  lcd.position.set(0, 39 - 22, H + 0.1);
  group.add(lcd);
  // its paper label, "ASF Plugins", 106 by 23 below the screen
  const tag = await paint(renderer, 106, 23, (g) => {
    g.fillStyle = "#fbfbf6";
    g.beginPath();
    g.roundRect(0, 0, 106, 23, 3);
    g.fill();
    g.fillStyle = "#1d211f";
    g.font = '700 15.2px "Bricolage Grotesque", sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("ASF Plugins", 53, 12.2);
  }, { k: 8 });
  const label = lying(106, 23, decal(tag), H + 0.1);
  label.position.set(0, 39 - 47 - 11.5, H + 0.1);
  group.add(label);
  return { group, height: H };
}

// ---- the post on the old computer: a letter, an envelope, and on them Cupid's sealed envelope (736 by 192 on its page, here 0.4 of that) ----
// The origin is the middle of Cupid's envelope on the computer's top (at z = 320); the room puts it there. The letter and the envelope lie
// under it, turned as the CSS room has them.
export async function post(renderer) {
  const group = new THREE.Group();
  // the letter: cream, a fold down at 58%, ruled lines in its left part
  const letterMap = await paint(renderer, 230, 150, (g) => {
    g.fillStyle = "#f5eedc";
    g.fillRect(0, 0, 230, 150);
    g.fillStyle = "rgba(0,0,0,0.15)";
    g.fillRect(230 * 0.58, 0, 1, 150);
    g.fillStyle = "rgba(0,0,0,0.1)";
    for (let y = 40 + 22; y < 150; y += 23) g.fillRect(0, y, 230 * 0.55, 1);
  }, { k: 6 });
  const letter = sheet(230, 150, 0.7, letterMap, "#e9e1cb");
  letter.position.set(-15.4, 12.1, 0.35);
  letter.rotation.z = (-2 * Math.PI) / 180;
  group.add(letter);
  // the plain envelope: tan, the two lines of its flap crossing at its middle
  const envMap = await paint(renderer, 240, 120, (g) => {
    g.fillStyle = "#e7dcc4";
    g.fillRect(0, 0, 240, 120);
    g.strokeStyle = "rgba(0,0,0,0.08)";
    g.lineWidth = 1;
    [[160, 1], [20, 1]].forEach(([deg]) => {
      const a = ((deg - 90) * Math.PI) / 180; // (a line across the picture, at right angles to a CSS gradient of that angle)
      const dx = Math.cos(a + Math.PI / 2) * 300,
        dy = Math.sin(a + Math.PI / 2) * 300;
      g.beginPath();
      g.moveTo(120 - dx, 60 - dy);
      g.lineTo(120 + dx, 60 + dy);
      g.stroke();
    });
  }, { k: 6 });
  const env = sheet(240, 120, 0.7, envMap, "#d9ceb5");
  env.position.set(26.1, -14.9, 1.05);
  env.rotation.z = (21 * Math.PI) / 180;
  group.add(env);

  // Cupid's envelope, closed, as its page draws it at 736 by 192 and 1 rem = 16 px: the pocket, the flap folded down, the seal on its point,
  // the address, and the stamp with the logo
  const img = await loadImg("cupid.svg");
  const cupid = await paint(renderer, 736, 192, (g) => {
    const lg = g.createLinearGradient(0, 0, 736 * 0.17, 192);
    lg.addColorStop(0, "#f6e8eb");
    lg.addColorStop(1, "#ead3d9");
    g.fillStyle = lg;
    g.fillRect(0, 0, 736, 192);
    g.strokeStyle = "rgba(120,40,70,0.14)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 192);
    g.lineTo(368, 0);
    g.moveTo(736, 192);
    g.lineTo(368, 0);
    g.stroke();
    g.fillStyle = "#e2c3cb"; // (the flap, folded down over the pocket to a point at its middle)
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(736, 0);
    g.lineTo(368, 112);
    g.closePath();
    g.fill();
    g.fillStyle = "#060203";
    g.font = '400 16px "Atkinson Hyperlegible", sans-serif';
    g.textBaseline = "alphabetic";
    g.fillText("To the agency,", 32, 133.4);
    g.fillText("with the whole workflow inside", 32, 159);
    // the stamp: white, a pink square in it with the logo
    g.save();
    g.shadowColor = "rgba(0,0,0,0.2)";
    g.shadowBlur = 4;
    g.shadowOffsetY = 2;
    g.fillStyle = "#fff";
    g.fillRect(736 - 24 - 67.2, 192 - 22.4 - 80, 67.2, 80);
    g.restore();
    g.fillStyle = "#fbe8ee";
    g.fillRect(736 - 24 - 67.2 + 5.6, 192 - 22.4 - 80 + 5.6, 56, 68.8);
    safeDraw(g, img, 736 - 24 - 67.2 + 5.6, 192 - 22.4 - 80 + 5.6 + (68.8 - 56) / 2, 56, 56);
  }, { k: 4 });
  const cupidSheet = sheet(294.4, 76.8, 0.7, cupid, "#e3cdd3");
  cupidSheet.position.z = 1.75;
  cupidSheet.rotation.z = (16 * Math.PI) / 180;
  group.add(cupidSheet);
  // the seal on the flap's point: a wax dome, 23 across and 1.8 high, a heart pressed in it (centre 368, 112 of the 736 by 192)
  const sealMap = await paint(renderer, 57.6, 57.6, (g) => {
    const rg = g.createRadialGradient(57.6 * 0.4, 57.6 * 0.35, 0, 57.6 * 0.4, 57.6 * 0.35, 57.6 * 0.7);
    rg.addColorStop(0, "#e35b8a");
    rg.addColorStop(1, "#a8234f");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(28.8, 28.8, 28.8, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(14.4, 14.4);
    g.scale(1.2, 1.2);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fill(new Path2D("M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.3 5.3 3.3 1.7-2 3.1-3.3 5.3-3.3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"));
    g.restore();
  }, { k: 8 });
  const R = 11.52;
  const dome = warp(new THREE.PlaneGeometry(2 * R, 2 * R, 36, 36), (v) => {
    const q = (v.x * v.x + v.y * v.y) / (R * R);
    v.z = 1.8 * Math.max(0, 1 - q) ** 0.6;
  });
  const seal = mesh(dome, new THREE.MeshStandardMaterial({ map: sealMap, transparent: true, alphaTest: 0.5, roughness: 0.35 }), { cast: false });
  // (the flap's point is 16 css px under the envelope's middle, 6.4 scene px to its south, turned with it)
  const a = (16 * Math.PI) / 180;
  seal.position.set(6.4 * Math.sin(a), -6.4 * Math.cos(a), 2.1);
  seal.rotation.z = a;
  group.add(seal);
  return { group, height: 4 };
}

// ---- the cards pinned on the right wall: three contact cards, fanned and taped, the front one with its face ----
// The origin is the middle of the front card's place on the wall's face; x runs along the wall as a reader of it reads (south), y up, z out into the
// room, so that the card's picture reads from the room; the room turns the whole to the wall and puts it at (706, 240.56, 170.33).
export async function cards(renderer) {
  const holder = new THREE.Group();
  const group = new THREE.Group();
  holder.add(group);
  const W = 390,
    H = 180;
  const paper = "#fbfbf6";
  const draw = (face, g, bars = [0.8, 0.55]) => {
    g.fillStyle = paper;
    g.beginPath();
    g.roundRect(0, 0, 260, 120, 10);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(18 + 29, 31 + 29, 29, 0, Math.PI * 2); // (the face: a disc, with its head and shoulders when it has one)
    g.clip();
    g.fillStyle = face ? "#5b4cf0" : "#d6d3cc";
    g.fillRect(18, 31, 58, 58);
    if (face) {
      g.fillStyle = "#ffd9b8";
      g.beginPath();
      g.arc(47, 31 + 13 + 11, 11, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(47, 31 + 38 + 15, 22, 15, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    const maxW = 260 - 18 - 90;
    if (face) {
      g.fillStyle = "#1d211f";
      g.font = '700 18.4px "Bricolage Grotesque", sans-serif';
      const tl = wrapLines(g, "Social Contacts Sync", maxW);
      g.font = '400 13.6px "Atkinson Hyperlegible", sans-serif';
      const sl = wrapLines(g, "Every contact gets a face", maxW);
      const th = tl.length * 22.1 + sl.length * 17.7;
      let y = (120 - th) / 2;
      g.font = '700 18.4px "Bricolage Grotesque", sans-serif';
      tl.forEach((l) => {
        g.fillText(l, 90, y + 14.8);
        y += 22.1;
      });
      g.fillStyle = "#555b57";
      g.font = '400 13.6px "Atkinson Hyperlegible", sans-serif';
      sl.forEach((l) => {
        g.fillText(l, 90, y + 12.8);
        y += 17.7;
      });
    } else {
      g.fillStyle = "#d6d3cc";
      [[49, bars[0]], [63, bars[1]]].forEach(([y, f]) => {
        g.beginPath();
        g.roundRect(90, y, maxW * f, 8, 4);
        g.fill();
      });
    }
  };
  const makeCard = async (face, bars) => {
    const map = await paint(renderer, 260, 120, (g) => draw(face, g, bars), { k: 6 });
    map.repeat.set(1 / (W - 0.6), 1 / (H - 0.6)); // (the card's top face has the outline's own px for uv)
    map.offset.set(0.5, 0.5);
    const g = new THREE.ExtrudeGeometry(roundedRect(W - 0.6, H - 0.6, 14.7), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, 0.3);
    const top = std("#ffffff", 0.8, { map }),
      edge = std(paper, 0.9);
    return mesh(g, [top, edge]);
  };
  // back to front: each a little nearer the room, as the CSS room's order stacks them; their places and turns measured on it (px of the wall, x south, y up)
  for (const [x, y, deg, face, z, bars] of [[-21.6, -13.8, 12, false, -1.4, [0.8, 0.55]], [18.2, 5.4, -2, false, -0.7, [0.7, 0.45]], [0, 0, 3, true, 0]]) {
    const c = await makeCard(face, bars);
    c.position.set(x, y, z);
    c.rotation.z = (deg * Math.PI) / 180;
    group.add(c);
  }
  // the two strips of tape that hold them, 6 px nearer the room than the front card: translucent, a pale straw, turned as the CSS room has them
  for (const [x, y, deg] of [[-171.1, 92.4, 38], [251.9, 62.6, -32]]) {
    const t = mesh(new THREE.BoxGeometry(120, 36, 0.5), new THREE.MeshStandardMaterial({ color: "#f0e7cc", transparent: true, opacity: 0.85, roughness: 0.9 }), { cast: false });
    t.position.set(x, y, 6);
    t.rotation.z = (deg * Math.PI) / 180;
    group.add(t);
  }
  // (the wall's own frame: x runs south, y up, z out of the wall into the room, which is west)
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(-1, 0, 0));
  holder.quaternion.setFromRotationMatrix(basis);
  return { group: holder, height: H };
}
