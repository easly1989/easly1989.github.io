// Willy's box and the computer's power cable (issue #160, ticket 08), as the CSS room has them.
//
// The box (`nest`): corrugated cardboard standing open at the desk's back left, 262 by 258 and 90 high, its walls 6 thick, its floor of plain
// cardboard, and one flap folded out and drooping over its front. Its origin is the middle of its plan on z = 0 (its walls go 4 down to the desk).
// The cable (`cable`): 9 thick and black, from the computer's back across the desk to the desk's back edge, down behind it, and into the wall
// socket near the floor. Its origin is the point where it goes over the desk's back edge, in the room's own px (x east, y north, z up).

import { THREE, mesh, roundedBox, paint, noiseTexture } from "./kit.js";

const std = (color, roughness = 0.7, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

export async function nest(renderer) {
  const group = new THREE.Group();
  const W = 262,
    D = 258,
    H = 90,
    T = 6;
  // (the CSS room's own px: x east and y south from the box's north west corner, its plan's middle at (131, 129))
  const at = (m, x, y, w, d, z) => {
    m.position.set(x + w / 2 - W / 2, D / 2 - (y + d / 2), z);
    return m;
  };
  const card = std("#c9a26b", 0.92);
  card.bumpMap = noiseTexture(renderer, 128, 1.2, [W / 60, D / 60]);
  card.bumpScale = 0.9;
  // the walls, from 4 under the mat to the top, so that the desk is not seen under them
  for (const [x, y, w, d] of [[0, 0, W, T], [0, 0, T, D], [W - T, 0, T, D], [0, D - T, W, T]]) group.add(at(mesh(roundedBox(w, d, H + 4, 0.8, 1), card), x, y, w, d, -4));
  // the floor, a plain board a little darker
  const floor = mesh(new THREE.PlaneGeometry(W - 2 * T, D - 2 * T), std("#b48c58", 0.95), { cast: false });
  at(floor, T, T, W - 2 * T, D - 2 * T, 5);
  group.add(floor);
  // the flap: 250 wide and 74 long, hinged on the front wall's top edge and folded out 38 degrees below the level, its end drooping
  const flap = mesh(roundedBox(W - 2 * T, 74, 2.4, 0.5, 1), std("#bf965f", 0.92));
  const hinge = new THREE.Group();
  hinge.position.set(0, D / 2 - D, H); // (the front wall's outer face, at the top)
  hinge.add(flap);
  flap.position.set(0, -37, -1.2);
  hinge.rotation.x = (38 * Math.PI) / 180; // (its free end, to the south, goes down)
  group.add(hinge);
  return { group, height: H };
}

// the socket on the wall: 70 by 70, cream, two dark holes at a third and two thirds across
async function socketPlate(renderer) {
  const map = await paint(renderer, 70, 70, (g) => {
    g.fillStyle = "#efeae0";
    g.beginPath();
    g.roundRect(0, 0, 70, 70, 8);
    g.fill();
    g.fillStyle = "#333";
    for (const x of [24.5, 45.5]) {
      g.beginPath();
      g.arc(x, 35, 5, 0, Math.PI * 2);
      g.fill();
    }
  }, { k: 6 });
  const plate = mesh(roundedBox(70, 70, 3, 1.2, 1), std("#efeae0", 0.7));
  const face = mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false }), { cast: false });
  face.position.z = 3.05;
  plate.add(face);
  return plate;
}

// the cable: `shift` is how far the computer was moved from the CSS room's place ([x, y] of the scene), and its end goes with it
export async function cable(renderer, { shift = [0, 0] } = {}) {
  const group = new THREE.Group();
  // (the path as the CSS room draws it: a cubic from the computer's back to the desk's back edge, in px of its stage, x east, y south)
  const O = { x: -399.5, y: -152 }; // where it goes over the edge, the origin
  const toLocal = (x, y, z) => new THREE.Vector3(x - O.x, -(y - O.y), z);
  const P = [[-258 + shift[0], 220 - shift[1]], [-270, 100], [-410, 60], [-400, -150]];
  const bez = (t) => {
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]);
  };
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const [x, y] = bez(i / 48);
    pts.push(toLocal(x, y, 0.6));
  }
  // over the edge and down behind the desk, then in to the socket (centre at x = -405, z = -465 on the back wall's face, y = -199; its right hole at 65%)
  pts.push(toLocal(O.x, O.y - 2.5, -3), toLocal(O.x, O.y - 2.5, -20), toLocal(O.x, O.y - 2.5, -440), toLocal(-396, -170, -460), toLocal(-394.5, -183, -465));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const wire = mesh(new THREE.TubeGeometry(curve, 320, 4.5, 12, false), std("#2b2b2b", 0.6));
  group.add(wire);
  // the plug on its end, in the socket's right hole
  const plug = mesh(roundedBox(14, 16, 18, 2, 2), std("#2b2b2b", 0.5));
  plug.position.copy(toLocal(-394.5, -188.5, -465)); // (its north face on the socket's, 3 proud of the wall)
  plug.position.z -= 9; // (it stands on z = 0 up, 18 high)
  group.add(plug);
  // the socket
  const sock = await socketPlate(renderer);
  sock.rotation.x = Math.PI / 2; // (it faces south: its picture on the +z face, which now looks -y)
  sock.position.copy(toLocal(-405, -199.5, -465)); // (its back on the wall, its middle at z = -465)
  group.add(sock);
  return { group, height: 0.6 };
}
