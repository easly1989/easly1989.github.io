// The two books on the desk (issue #160, ticket 06): CloudBank's ledger with its elastic band and Nutreek's agenda with its elastic and its
// bookmark, as the CSS room has them in size, place and turn. Each is a cased book of its own parts: a front cover and a back cover (boards with
// rounded corners and bevelled edges, covered in cloth), the spine between them, and the block of pages inside, its edges ruled with the
// leaves. The title, the logo and the line under it are printed on the front cover, sharp. The origin is the middle of the book's foot on the
// mat, x east, y north, z up; the spine is on the west. The ledger is 250 by 330 and 30 thick, the agenda 220 by 290 and 24; the room puts
// them down turned 4 degrees clockwise (the ledger) and 4 degrees counterclockwise (the agenda) from above.

import { THREE, mesh, roundedBox, roundedRect, paint, noiseTexture } from "./kit.js";

const BOARD = 3.5; // the covers' thickness
const BEVEL = 0.8;

// a rectangle with a radius for each corner (north west, north east, south east, south west), centred, x east and y north
function cornerRect(w, d, [nw, ne, se, sw]) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + sw, -d / 2);
  s.lineTo(w / 2 - se, -d / 2);
  s.absarc(w / 2 - se, -d / 2 + se, se, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, d / 2 - ne);
  s.absarc(w / 2 - ne, d / 2 - ne, ne, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + nw, d / 2);
  s.absarc(-w / 2 + nw, d / 2 - nw, nw, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -d / 2 + sw);
  s.absarc(-w / 2 + sw, -d / 2 + sw, sw, Math.PI, Math.PI * 1.5, false);
  return s;
}
// a board of that outline, BOARD thick, its top face and bottom face with the cover's picture and its edge in plain cloth
function board(w, d, corners, faceMat, edgeMat) {
  const g = new THREE.ExtrudeGeometry(cornerRect(w - 2 * BEVEL, d - 2 * BEVEL, corners.map((c) => Math.max(1, c - BEVEL))), {
    depth: BOARD - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 3,
    curveSegments: 16,
  });
  g.translate(0, 0, BEVEL);
  const m = mesh(g, [faceMat, edgeMat]);
  return m;
}
// the leaves' edges: fine lines, two to a px, to be the colour of the page and its bump
function leaves(renderer, repeatV) {
  const cv = document.createElement("canvas");
  cv.width = 4;
  cv.height = 16;
  const g = cv.getContext("2d");
  for (let y = 0; y < 16; y++) {
    g.fillStyle = y % 2 ? "#cfc6b0" : "#ffffff";
    g.fillRect(0, y, 4, 1);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, repeatV);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// a loop of elastic round the whole book: `along` "y" for a band that runs over the covers north to south (the ledger's), "x" for one that runs
// across them (the agenda's); 9 px wide, at `at` from the book's middle along the other axis
function elastic(w, d, h, along, at, color) {
  const len = along === "y" ? d : w;
  const ring = new THREE.ExtrudeGeometry(roundedRect(len + 3.6, h + 3.6, 2.4, roundedRect(len + 0.6, h + 0.6, 1.2)), { depth: 9, bevelEnabled: false, curveSegments: 6 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // (the ring's outline lies in the plane of the book's cross-section: its x along the run, its y up; the 9 px of width along the other axis)
  const basis = along === "y" ? [V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)] : [V(1, 0, 0), V(0, 0, 1), V(0, -1, 0)];
  ring.applyMatrix4(new THREE.Matrix4().makeBasis(...basis));
  ring.translate(along === "y" ? at - 4.5 : 0, along === "y" ? 0 : at + 4.5, h / 2);
  return mesh(ring, new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
}
// a ribbon bookmark: a strip `width` wide along a line of [y, z] points (in the book's y-z plane), its end cut in a V
function ribbon(points, width, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(([y, z]) => new THREE.Vector3(0, y, z)), false, "centripetal");
  const total = curve.getLength();
  const ts = [];
  for (let i = 0; i < 24; i++) ts.push((i / 24) * (1 - 9 / total));
  ts.push(1 - 8 / total, 1);
  const pos = [],
    idx = [];
  ts.forEach((t) => {
    const p = curve.getPointAt(t);
    pos.push(-width / 2, p.y, p.z, width / 2, p.y, p.z);
  });
  const n = ts.length;
  for (let i = 0; i < n - 2; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  // the V: the last row's two corners, and a point on the line between the row before them
  const pm = curve.getPointAt(1 - 8 / total);
  pos.push(0, pm.y, pm.z);
  const m = pos.length / 3 - 1,
    lm = (n - 2) * 2,
    le = (n - 1) * 2;
  idx.push(lm, le, m, lm + 1, m, le + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide }));
}

// the printing of a cover: `title` and `sub` at the bottom left (the sub line wrapped to the cover's width), the logo in a white tile at the top left
async function cover(renderer, { w, d, color, logo, tile, tilePad, tileRadius, tilePos, left, bottom, titleSize, subSize, hinge, year }) {
  const img = new Image();
  img.src = logo;
  await img.decode().catch(() => {});
  return (title, sub) =>
    paint(
      renderer,
      w,
      d,
      (g) => {
        g.fillStyle = color;
        g.fillRect(0, 0, w, d);
        if (hinge) {
          g.fillStyle = "rgba(255,255,255,0.25)"; // (the groove along the spine)
          g.fillRect(hinge, 0, 3, d);
        }
        g.fillStyle = "#fff";
        g.beginPath();
        g.roundRect(tilePos[0], tilePos[1], tile, tile, tileRadius);
        g.fill();
        g.drawImage(img, tilePos[0] + tilePad, tilePos[1] + tilePad, tile - 2 * tilePad, tile - 2 * tilePad);
        if (year) {
          g.fillStyle = "#fff";
          g.font = '800 17.6px "Bricolage Grotesque", sans-serif';
          g.textAlign = "right";
          g.textBaseline = "alphabetic";
          g.fillText(year, w - 22, 20 + 16);
        }
        // the title and the line under it, wrapped to what is left of the cover's width, their bottom `bottom` from its foot
        g.textAlign = "left";
        g.fillStyle = "#fff";
        g.font = `400 ${subSize}px "Atkinson Hyperlegible", sans-serif`;
        const maxW = w - left,
          lines = [];
        let line = "";
        for (const word of sub.split(" ")) {
          const t = line ? line + " " + word : word;
          if (g.measureText(t).width > maxW && line) {
            lines.push(line);
            line = word;
          } else line = t;
        }
        lines.push(line);
        const titleH = titleSize * 1.2,
          subH = subSize * 1.3,
          top = d - bottom - (titleH + 4 + lines.length * subH);
        g.font = `700 ${titleSize}px "Bricolage Grotesque", sans-serif`;
        g.fillText(title, left, top + titleH / 2 + titleSize * 0.33);
        g.font = `400 ${subSize}px "Atkinson Hyperlegible", sans-serif`;
        lines.forEach((l, i) => g.fillText(l, left, top + titleH + 4 + subH * (i + 0.5) + subSize * 0.33));
      },
      { k: 4 },
    );
}

// the book itself
async function book(renderer, { w, d, h, corners, color, page, print, extras }) {
  const group = new THREE.Group();
  const cloth = (map) => {
    const m = new THREE.MeshStandardMaterial({ color: map ? "#ffffff" : color, roughness: 0.85, map: map || null });
    m.bumpMap = noiseTexture(renderer, 128, 1.4, [w / 40, d / 40]);
    m.bumpScale = 0.7;
    return m;
  };
  const edge = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  if (print) {
    print.repeat.set(1 / (w - 2 * BEVEL), 1 / (d - 2 * BEVEL)); // (the board's top face has the outline's own px for uv)
    print.offset.set(0.5, 0.5);
  }
  const front = board(w, d, corners, cloth(print), edge);
  front.position.z = h - BOARD;
  const back = board(w, d, corners, cloth(), edge);
  group.add(front, back);
  // the spine, a little rounded on the west, between the boards
  const spine = mesh(roundedBox(BOARD + 1, d - 12, h, 2, 3), edge);
  spine.position.set(-w / 2 + (BOARD + 1) / 2 - 0.4, 0, 0);
  group.add(spine);
  // the pages: from the spine to 5 px short of the east edge, 5 short of the north and the south, their edges ruled
  const px = w - 4 - 5,
    pz = h - 2 * BOARD;
  const pages = new THREE.MeshStandardMaterial({ color: page, roughness: 0.95, map: leaves(renderer, pz / 16) });
  const block = mesh(roundedBox(px, d - 10, pz, 1.2, 2), pages);
  block.position.set(-w / 2 + 4 + px / 2, 0, BOARD);
  group.add(block);
  for (const m of extras(group)) group.add(m);
  return { group, height: h };
}

export async function ledger(renderer) {
  const [w, d, h] = [250, 330, 30];
  const print = await (await cover(renderer, { w, d, color: "#2b67c1", logo: "logo.svg", tile: 64, tilePad: 8, tileRadius: 14, tilePos: [40, 40], left: 40, bottom: 36, titleSize: 32, subSize: 16.8, hinge: 14 }))("CloudBank", "Personal finance, self-hosted");
  return book(renderer, {
    w, d, h, corners: [6, 12, 12, 6], color: "#2b67c1", page: "#efe7d3", print,
    // the elastic band: over the covers north to south, 34 px from the east edge
    extras: () => [elastic(w, d, h, "y", w / 2 - 34 - 4.5, "#13213a")],
  });
}

export async function agenda(renderer) {
  const [w, d, h] = [220, 290, 24];
  const print = await (await cover(renderer, { w, d, color: "#2c772f", logo: "nutreek.svg", tile: 46, tilePad: 6, tileRadius: 12, tilePos: [24, 24], left: 24, bottom: 26, titleSize: 28.8, subSize: 16.8, year: "2026" }))("Nutreek", "The week's meals, planned");
  return book(renderer, {
    w, d, h, corners: [5, 12, 12, 5], color: "#2c772f", page: "#f3ecda", print,
    extras: () => {
      // the elastic across the cover, 62% down; the bookmark out of the pages at the south edge, half way up, 58% across, falling to the mat
      const south = -d / 2 + 5,
        x = -w / 2 + 0.58 * w + 6;
      const r = ribbon([[south + 5, h / 2], [south, h / 2], [south - 6, 8], [south - 12, 2.2], [south - 18, 0.7], [south - 46, 0.5]], 12, "#c43a3a");
      r.position.x = x;
      return [elastic(w, d, h, "x", d / 2 - 0.62 * d - 4.5, "#143a17"), r];
    },
  });
}
