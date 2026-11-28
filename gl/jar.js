// Planora's glass jar of ideas (issue #160, ticket 07), as the CSS room has it: 150 across and 200 high, glass you see through with a thick pale
// rim, four paper slips lying on its bottom and a folded idea among them, and a label stuck round the glass, torn at its right end where
// someone has tried to peel it off ("Planora", "Ideas for the group. In testing."), with streaks of light on the glass. The origin is the
// middle of its foot on the mat, z up.

import { THREE, mesh, lathe, paint } from "./kit.js";

const R = 75; // the jar's outer radius

export async function jar(renderer) {
  const group = new THREE.Group();
  // the glass: a lathed wall 4 thick with a rounded, thick bottom and a rounded lip; clear, with a coat of light on it
  const glass = new THREE.MeshPhysicalMaterial({ color: "#eaf4f2", roughness: 0.03, metalness: 0, transparent: true, opacity: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false });
  const wall = lathe([[0, 0], [66, 0], [73, 2], [R, 8], [R, 196], [R - 0.7, 199], [R - 2.2, 200], [R - 3.6, 199], [R - 4, 196], [R - 4, 14], [66, 9.5], [0, 9]], 96);
  const body = mesh(wall, glass, { cast: false });
  body.renderOrder = 2;
  group.add(body);
  // its lip, rolled, a touch whiter
  const rim = mesh(new THREE.TorusGeometry(R - 2.1, 2.1, 10, 96), new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }), { cast: false });
  rim.position.z = 198.4;
  rim.renderOrder = 3;
  group.add(rim);
  // the slips on the bottom, at the CSS room's places (x east, y north from the middle), turned as it has them
  const slips = [[-22, 22, 20, "#ffe9a8"], [18, 6, -35, "#cfe3ff"], [-10, -18, -70, "#f6c9d6"], [14, -30, 50, "#d6f0c9"]];
  slips.forEach(([x, y, deg, c], i) => {
    const s = mesh(new THREE.BoxGeometry(46, 18, 0.7), new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    s.position.set(x, y, 9.4 + i * 0.8);
    s.rotation.z = (deg * Math.PI) / 180;
    group.add(s);
  });
  // an idea folded in half among them, its name on the fold's face: 96 by 32, a crease along its middle
  const idea = await paint(renderer, 96, 32, (g) => {
    g.fillStyle = "#fbf6e8";
    g.fillRect(0, 0, 96, 32);
    const sh = g.createLinearGradient(0, 24, 0, 32);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = sh;
    g.fillRect(0, 24, 96, 8);
    g.fillStyle = "#2b2722";
    g.font = '800 17px "Bricolage Grotesque", sans-serif';
    g.textBaseline = "alphabetic";
    g.fillText("Planora", 8, 7 + 14);
  }, { k: 6 });
  const folded = mesh(new THREE.BoxGeometry(96, 32, 1.4), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: "#f1e9d4", roughness: 0.85 })).concat([new THREE.MeshStandardMaterial({ map: idea, roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: "#f1e9d4", roughness: 0.85 })]));
  folded.position.set(-9, -9, 13.4);
  folded.rotation.z = (16 * Math.PI) / 180;
  group.add(folded);

  // what is printed round the glass: pieces of the jar's own curve, laid 0.6 outside it
  const skin = (r, z0, z1) => [[r, z0], [r, z1]];
  const wrap = (map, w, z0, z1, atDeg, r, opts = {}) => {
    const arc = w / r;
    const m = mesh(lathe(skin(r, z0, z1), 64, ((atDeg * Math.PI) / 180) * -1 - arc / 2, arc), new THREE.MeshStandardMaterial({ map, transparent: true, roughness: opts.rough ?? 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide }), { cast: opts.cast ?? false });
    m.renderOrder = 4;
    group.add(m);
    return m;
  };
  // the label: torn paper, 176 round the curve and 76 high, its top at 136
  const label = await paint(renderer, 176, 76, (g) => {
    const P = [[1, 4], [12, 2], [30, 3.5], [52, 1], [70, 3], [81, 2], [84, 10], [88, 6], [90, 19], [94, 14], [92.5, 31], [97, 38], [94.5, 52], [99, 61], [96, 73], [98.5, 86], [95, 97], [80, 99], [61, 97.5], [40, 99], [21, 98], [3, 99], [1, 86], [2, 69], [0, 50], [2, 31], [0, 13]];
    const path = new Path2D();
    P.forEach(([x, y], i) => (i ? path.lineTo((x * 176) / 100, (y * 76) / 100) : path.moveTo((x * 176) / 100, (y * 76) / 100)));
    path.closePath();
    g.fillStyle = "#fbfbf6";
    g.fill(path);
    g.save();
    g.clip(path);
    // where it was scraped at its right end: the white of the paper, in streaks
    g.fillStyle = "rgba(255,255,255,0.85)";
    const scr = new Path2D();
    [[30, 0], [100, 8], [92, 40], [100, 70], [70, 100], [40, 82], [12, 90], [0, 52], [18, 24]].forEach(([x, y], i) => {
      const px = 176 * (0.94 + (x / 100) * 0.13),
        py = 76 * (0.06 + (y / 100) * 0.62);
      i ? scr.lineTo(px, py) : scr.moveTo(px, py);
    });
    scr.closePath();
    g.fill(scr);
    g.restore();
    g.fillStyle = "#1d211f";
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.font = '800 24px "Bricolage Grotesque", sans-serif';
    g.fillText("Planora", 88 - 2, 10 + 24 * 0.95);
    g.fillStyle = "#3b413d";
    g.font = '400 13.1px "Atkinson Hyperlegible", sans-serif';
    g.fillText("Ideas for the group.", 88 - 2, 10 + 25.2 + 4 + 13.1);
    g.fillText("In testing.", 88 - 2, 10 + 25.2 + 4 + 13.1 + 15.7);
  }, { k: 6 });
  wrap(label, 176, 60, 136, 45, R + 0.6, { cast: true });
  // the light on the glass, left of the front: a streak above the label, one below, and a fainter one down the right edge
  const shine = (alpha) =>
    paint(renderer, 34, 100, (g) => {
      const lg = g.createLinearGradient(0, 0, 34, 0);
      lg.addColorStop(0.08, "rgba(255,255,255,0)");
      lg.addColorStop(0.34, `rgba(255,255,255,${0.9 * alpha})`);
      lg.addColorStop(0.52, `rgba(255,255,255,${0.5 * alpha})`);
      lg.addColorStop(0.7, `rgba(255,255,255,${0.15 * alpha})`);
      lg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = lg;
      g.fillRect(0, 0, 34, 100);
      g.globalCompositeOperation = "destination-in"; // (faded out at its ends, as the CSS mask does)
      const mk = g.createLinearGradient(0, 0, 0, 100);
      mk.addColorStop(0, "rgba(0,0,0,0)");
      mk.addColorStop(0.14, "#000");
      mk.addColorStop(0.78, "#000");
      mk.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = mk;
      g.fillRect(0, 0, 34, 100);
    }, { k: 4 });
  const s1 = await shine(1),
    s2 = await shine(0.5);
  wrap(s1, 34, 138, 188, 98, R + 1.4);
  wrap(s1, 34, 12, 58, 98, R + 1.4);
  wrap(s2, 28, 26, 176, 345, R + 1.4);
  return { group, height: 200 };
}
