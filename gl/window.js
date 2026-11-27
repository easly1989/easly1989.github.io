// The back wall with its window, the sill, and the cat's perch hung under it on two chains (issue #160, ticket 05). The window is
// 600 by 380 px in a frame 22 px wide with a mullion each way; behind its glass lies a sky (a day's, a night's by the colour scheme,
// until the weather comes in ticket 10) and the roofs and trees of the town, drawn anew on every visit as the CSS room does.
// The set's origin is on the wall's face, at the window's middle (css x = 720, y = -200), x east, y north (the wall is behind it, at
// y from 0 to 24), z up from the mat: the room puts it down at (80, 640, 0) of the scene.

import { THREE, mesh, tint, pal, scheme, roundedBox, roundedRect, onFace, paint } from "./kit.js";

const FAR = -3200 - 720, // the wall's west end, from the window's middle
  EAST = 1374 - 720; // and its east end, past the right wall's face
const WALL = { bottom: -560, top: 2440 };
const WIN = { w: 600, h: 380, top: 660 }; // the window's outer size and its top edge
const FRAME = 22;
const INNER = { w: WIN.w - 2 * FRAME, h: WIN.h - 2 * FRAME };

const std = (key, roughness = 0.7, extra) => tint(new THREE.MeshStandardMaterial({ roughness, ...extra }), key);

// the sky and the town in the window, as one picture 556 by 336: a gradient, stars and a moon by night, and the roofs and trees
function skyline(g, w, h, roofs, r) {
  g.fillStyle = roofs;
  let x = -10;
  while (x < w + 10) {
    const bw = 40 + r() * 90;
    if (r() < 0.3) {
      const th = 60 + r() * 70,
        cr = 22 + r() * 26,
        tx = x + bw / 2;
      g.fillRect(tx - 4, h - th, 8, th);
      g.beginPath();
      g.arc(tx, h - th, cr, 0, Math.PI * 2);
      g.fill();
    } else {
      const top = h - (50 + r() * (r() < 0.25 ? 200 : 110));
      g.beginPath();
      if (r() < 0.6) {
        g.moveTo(x, h);
        g.lineTo(x, top);
        g.lineTo(x + bw / 2, top - 22 - r() * 26);
        g.lineTo(x + bw, top);
        g.lineTo(x + bw, h);
      } else g.rect(x, top, bw, h - top);
      g.fill();
      if (r() < 0.35) g.fillRect(x + bw * 0.7, top - 34, 10, 34);
    }
    x += bw + r() * 18;
  }
}

export async function windowSet(renderer) {
  const group = new THREE.Group();
  const wall = std("wall", 0.95);
  // the wall: four slabs round the opening (the frame covers the cut), 24 px thick
  const slab = (x0, x1, z0, z1) => {
    const m = mesh(roundedBox(x1 - x0, 24, z1 - z0, 0.01, 1), wall, { cast: false });
    m.position.set((x0 + x1) / 2, 12, z0);
    group.add(m);
  };
  const ox0 = -INNER.w / 2,
    ox1 = INNER.w / 2,
    oz0 = WIN.top - FRAME - INNER.h,
    oz1 = WIN.top - FRAME;
  slab(FAR, ox0, WALL.bottom, WALL.top);
  slab(ox1, EAST, WALL.bottom, WALL.top);
  slab(ox0, ox1, WALL.bottom, oz0);
  slab(ox0, ox1, oz1, WALL.top);

  // the frame: a ring 22 wide standing 6 px off the wall, with a mullion up the middle and one across, 45% down
  const ring = new THREE.ExtrudeGeometry(roundedRect(WIN.w, WIN.h, 6, roundedRect(INNER.w, INNER.h, 2)), { depth: 14, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 6 });
  const sill = std("sill", 0.6);
  group.add(mesh(onFace(ring, "front", [0, 8, WIN.top - WIN.h / 2]), sill));
  const mullionV = mesh(roundedBox(14, 10, INNER.h, 2, 1), sill);
  mullionV.position.set(0, 4, oz0);
  const mullionH = mesh(roundedBox(INNER.w, 10, 14, 2, 1), sill);
  mullionH.position.set(0, 4, oz1 - 0.45 * INNER.h - 7);
  group.add(mullionV, mullionH);

  // what is outside: the sky and the town, one picture, lit by nothing (it is the light outside), 20 px behind the glass
  let sky;
  const seed = Math.floor(Math.random() * 2147483646) + 1; // (the same town in both schemes, new on each visit)
  const rng = (() => {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  });
  const sky_draw = (g) => {
    const p = pal();
    const grd = g.createLinearGradient(0, 0, 0, INNER.h);
    grd.addColorStop(0, p.skyTop);
    grd.addColorStop(1, p.skyLow);
    g.fillStyle = grd;
    g.fillRect(0, 0, INNER.w, INNER.h);
    if (p.night) {
      g.fillStyle = "#fff";
      for (const [x, y, r] of [[0.18, 0.22, 1.5], [0.63, 0.14, 1], [0.82, 0.34, 1.2], [0.4, 0.4, 1], [0.3, 0.1, 1], [0.9, 0.12, 1.1], [0.52, 0.28, 0.9]]) {
        g.beginPath();
        g.arc(x * INNER.w, y * INNER.h, r, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#f6f1d0";
      g.beginPath();
      g.arc(0.76 * INNER.w, 0.18 * INNER.h, 18, 0, Math.PI * 2);
      g.fill();
    }
    skyline(g, INNER.w, INNER.h, p.roofs, rng());
  };
  sky = await paint(renderer, INNER.w, INNER.h, sky_draw, { k: 2 });
  const skyMesh = mesh(onFace(new THREE.PlaneGeometry(INNER.w, INNER.h), "front", [0, 18, (oz0 + oz1) / 2]), new THREE.MeshBasicMaterial({ map: sky }), { cast: false, receive: false });
  group.add(skyMesh);
  // the glass: a faint sheen over it, from the upper left
  const sheen = await paint(renderer, INNER.w, INNER.h, (g) => {
    const grd = g.createLinearGradient(0, 0, INNER.w, INNER.h * 0.6);
    grd.addColorStop(0, "rgba(255,255,255,0.28)");
    grd.addColorStop(0.38, "rgba(255,255,255,0)");
    grd.addColorStop(0.62, "rgba(255,255,255,0)");
    grd.addColorStop(1, "rgba(255,255,255,0.12)");
    g.fillStyle = grd;
    g.fillRect(0, 0, INNER.w, INNER.h);
  }, { k: 1 });
  group.add(mesh(onFace(new THREE.PlaneGeometry(INNER.w, INNER.h), "front", [0, 1, (oz0 + oz1) / 2]), new THREE.MeshBasicMaterial({ map: sheen, transparent: true, depthWrite: false }), { cast: false, receive: false }));
  // the same sky and town again when the scheme changes (the town as it was)
  scheme.addEventListener("change", () => {
    const g = sky.image.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.scale(2, 2);
    sky_draw(g);
    sky.needsUpdate = true;
  });

  // the sill: 660 wide and 78 deep, 20 thick, its top at the window's bottom edge
  const sillBoard = mesh(roundedBox(660, 78, 20, 3, 2), sill);
  sillBoard.position.set(0, -39, WIN.top - WIN.h - 20);
  group.add(sillBoard);

  // the cat's perch: a board 360 by 190 hung over the sill's front on two chains from the wall over the frame, a fleece on it
  const PERCH = { w: 360, d: 190, z: WIN.top - WIN.h + 24, dx: 0 };
  const board = mesh(roundedBox(PERCH.w, PERCH.d, 14, 4, 2), std("perch", 0.6));
  board.position.set(PERCH.dx, -PERCH.d / 2, PERCH.z - 14);
  group.add(board);
  const fleece = mesh(roundedBox(PERCH.w - 36, PERCH.d - 26, 26, 34, 4), std("fleece", 1));
  fleece.position.set(PERCH.dx, -(PERCH.d - 26) / 2 - 12, PERCH.z);
  group.add(fleece);
  // the chains: links of a gold wire, 6 px apart, each turned a quarter from the last, from the wall (just over the frame) to the board's front corner
  const gold = new THREE.MeshStandardMaterial({ color: "#c9a24a", roughness: 0.35, metalness: 0.9 });
  for (const x of [-170, 166]) {
    const top = WIN.top + 16;
    const a = new THREE.Vector3(x, -2, top),
      b = new THREE.Vector3(x, -(PERCH.d - 8) - 2, PERCH.z);
    const len = a.distanceTo(b),
      dir = b.clone().sub(a).normalize(),
      n = Math.floor(len / 6);
    const links = new THREE.InstancedMesh(new THREE.TorusGeometry(2.6, 0.9, 8, 14), gold, n);
    links.castShadow = true;
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
      turn = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2) * (Math.PI / 2));
      m4.compose(a.clone().addScaledVector(dir, i * 6 + 3), q.clone().multiply(turn), new THREE.Vector3(1, 1.7, 1));
      links.setMatrixAt(i, m4);
    }
    group.add(links);
  }
  return { group, height: WIN.top };
}
