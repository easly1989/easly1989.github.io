// The instant camera (issue #160, ticket 07), as the CSS room builds it from boxes (room.js "the camera"): a black base with the slot the print
// comes out of and "About me" on its front; behind a tall white front plate a black body whose top slopes down to the back, with the eyepiece
// standing out of it; the plate carries the lens (left of centre, standing out), the red shutter button, the finder window, the light meter
// and a stripe in the six products' colours. The origin is the middle of its foot on the mat, x east, y north, z up; its front (the plate) is to
// the south, 160 wide, 150 deep and 120 high. The room puts it down turned 12 degrees clockwise from above, its front nearly square to the reader.

import { THREE, mesh, roundedBox, profile, paint } from "./kit.js";

const std = (color, roughness = 0.6, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
// the CSS camera's own px (x east and y south from its top left corner, the element 160 by 150) to the camera's frame
const cx = (x) => x - 80;
const cy = (y) => 75 - y;

export async function camera(renderer) {
  const group = new THREE.Group();
  const ink = std("#262626", 0.55);
  const dark = std("#2b2b2b", 0.5);
  const white = std("#efede6", 0.5);
  // the base, 34 high, the whole depth; the print slot is in its front
  group.add(mesh(roundedBox(160, 150, 34, 3, 2), ink));
  // the body behind the plate: its top slopes from 70 at the back up to 114 at the plate, in one piece (a profile of y and z, 148 wide)
  const body = mesh(profile([[75, 34], [-43, 34], [-43, 114], [75, 70]], 148, 0.8), dark);
  group.add(body);
  // the eyepiece standing out of the back
  const eye = mesh(roundedBox(44, 26, 30, 3, 2), std("#1b1b1b", 0.5));
  eye.position.set(0, 88, 50);
  group.add(eye);
  // the front plate, white, 86 above the base's top
  const plate = mesh(roundedBox(160, 32, 86, 2.5, 2), white);
  plate.position.set(0, cy(134), 34);
  group.add(plate);

  // what is printed on the front, 160 by 120 (the plate above, the base below), laid just in front of it
  const COLORS = ["#2f6fd0", "#5b4cf0", "#2f7d32", "#6d59ad", "#c4356a", "#0f766e"]; // (the six products', in the order of the stripe)
  const face = await paint(
    renderer,
    160,
    120,
    (g) => {
      // the finder window, in a pale frame
      g.fillStyle = "#d8d5cc";
      g.beginPath();
      g.roundRect(117, 7, 36, 28, 5);
      g.fill();
      const f = g.createRadialGradient(124 + 30 * 0.35, 10 + 22 * 0.35, 0, 124 + 30 * 0.35, 10 + 22 * 0.35, 30 * 0.7);
      f.addColorStop(0, "#7b8b9a");
      f.addColorStop(1, "#1b2229");
      g.fillStyle = f;
      g.beginPath();
      g.roundRect(120, 10, 30, 22, 3);
      g.fill();
      // the light meter
      const m = g.createRadialGradient(127 + 6, 44 + 5.6, 0, 127 + 6, 44 + 5.6, 11);
      m.addColorStop(0, "#555");
      m.addColorStop(1, "#111");
      g.fillStyle = m;
      g.beginPath();
      g.arc(135, 52, 8, 0, Math.PI * 2);
      g.fill();
      // the stripe in the six colours, 16 wide, from 68 down to the foot of the plate
      COLORS.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(67 + (i * 16) / 6, 68, 16 / 6 + 0.2, 18);
      });
      // the base's front: its name, and the slot the print comes out of
      g.fillStyle = "#f2efe8";
      g.font = '700 13px "Bricolage Grotesque", sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      if ("letterSpacing" in g) g.letterSpacing = "0.5px";
      g.fillText("About me", 80, 99);
      g.fillStyle = "#3a3a3a";
      g.beginPath();
      g.roundRect(80 - 68.8, 110.5, 137.6, 4, 2);
      g.fill();
      g.fillStyle = "#0c0c0c";
      g.beginPath();
      g.roundRect(80 - 68.8, 109.5, 137.6, 4, 2);
      g.fill();
    },
    { k: 6 },
  );
  const print = mesh(new THREE.PlaneGeometry(160, 120), new THREE.MeshStandardMaterial({ map: face, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), { cast: false });
  print.geometry.rotateX(Math.PI / 2); // (it faces south: x east, its up is z)
  print.position.set(0, -75.12, 60);
  group.add(print);

  // the lens: a barrel standing 14 out of the plate left of centre, ringed in black, its glass in rings of blue and black, a bright spot on it
  const lens = new THREE.Group();
  const barrel = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(33, 0), new THREE.Vector2(33, 3), new THREE.Vector2(30.5, 3.6), new THREE.Vector2(29.2, 9), new THREE.Vector2(29.2, 13), new THREE.Vector2(0, 13)], 64), std("#1d1d1d", 0.4, { metalness: 0.3 }));
  barrel.rotation.x = Math.PI / 2; // (a lathe turns round y: now round z)
  lens.add(barrel);
  const glass = await paint(renderer, 58, 58, (g) => {
    // (the CSS room's rings are percentages of the farthest corner, 41 px out: 34%, 58%, 66% are 13.9, 23.8 and 27.1 px)
    const rings = [[29, "#1b1b1b"], [27.3, "#3a3a3a"], [23.8, "#10161c"], [13.9, "#2c3a4a"]];
    g.translate(29, 29);
    for (const [r, c] of rings) {
      g.fillStyle = c;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.beginPath();
    g.arc(-9, -10, 3.6, 0, Math.PI * 2);
    g.fill();
  }, { k: 6 });
  const disc = mesh(new THREE.CircleGeometry(29.2, 64), new THREE.MeshPhysicalMaterial({ map: glass, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }), { cast: false });
  disc.position.z = 13.05;
  lens.add(disc);
  lens.rotation.x = Math.PI / 2; // (its axis, z, now runs south, and what was up is up still)
  lens.position.set(cx(75), -75, 34 + 86 - 39);
  group.add(lens);
  // the shutter button: red, domed, low on the left
  const shut = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(10, 0), new THREE.Vector2(10, 7), new THREE.Vector2(8.6, 9), new THREE.Vector2(0, 9.6)], 32), std("#e0533f", 0.4));
  shut.rotation.x = Math.PI; // (a lathe's axis, y, now points south... turned end for end: it stands out of the front)
  shut.position.set(cx(24), -75, 120 - 56);
  group.add(shut);
  return { group, height: 120 };
}
