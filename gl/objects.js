// The room's objects, one entry each (issue #160): its name and a build() that makes it, standing on z = 0
// with its origin at the middle of its foot, in the room's px. An object is judged alone on the workbench
// (gl/bench.js: ?roomgl&bench=<name>) before it is put in the room. The mug is first: it uses a turned shape, a
// swept handle, a glaze, a coffee and a print round its side.

import { THREE, lathe, sweep, mesh, material, paint } from "./kit.js";

export const OBJECTS = {
  // Buy me a coffee (the donate page): a china mug 131 px across and 124 high, the wall 12 px thick, the coffee a little
  // under the rim, a D of a handle on the east, "Buy me a coffee" printed round the side that faces the camera
  mug: {
    label: "The mug",
    async build(renderer) {
      const group = new THREE.Group();
      const R = 65.6,
        wall = 12,
        H = 124,
        Ri = R - wall;
      // the body: a foot ring, the side a touch wider at the top than the base, a rounded lip, the inside down to a rounded bottom
      // (the outside, from the foot up to the lip, then the lip and the inside down to the bottom)
      const outside = [[0, 0], [54, 0], [58, 0.6], [60.5, 3], [62.8, 12], [64.4, 40], [65.4, 80], [R, 112], [R, 116.5]];
      const body = lathe([
        ...outside, [65.1, 120.6], [63.2, 123.2], [60.6, H], [57.4, H], [54.8, 123.2], [53.4, 120.6], [Ri - 0.6, 116.5],
        [Ri - 0.6, 24], [Ri - 2.4, 14], [Ri - 7, 9.2], [Ri - 16, 7.6], [0, 7.2],
      ]);
      // the radius of the outside at a height, by the straight pieces between the points above
      const radiusAt = (z) => {
        for (let i = 1; i < outside.length; i++) {
          const [r0, z0] = outside[i - 1],
            [r1, z1] = outside[i];
          if (z <= z1) return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0 || 1);
        }
        return R;
      };
      group.add(mesh(body, material.china()));
      // the coffee, 12 px under the rim, a touch higher at the wall (it clings to it)
      const coffee = lathe([[0, H - 12.4], [Ri - 4, H - 12], [Ri - 0.7, H - 10.6], [Ri - 0.7, H - 10.2], [Ri - 4, H - 11], [0, H - 11.4]], 64);
      group.add(mesh(coffee, material.liquid(), { cast: false }));
      // the handle: a D swept out of the side, its ends let into the wall
      const handle = sweep([[R - 7, 0, 102], [R + 8, 0, 107], [R + 26, 0, 97], [R + 35, 0, 78], [R + 33, 0, 58], [R + 22, 0, 43], [R + 4, 0, 36], [R - 8, 0, 39]], 6.2, { radial: 18 });
      group.add(mesh(handle, material.china()));
      // what it says, printed round the side facing the camera (the south-west), 170 px of the curve across and 80 high
      const arc = 170 / R;
      const map = await paint(renderer, 170, 80, (g) => {
        g.fillStyle = "#3b2a1e";
        g.font = '800 30px "Bricolage Grotesque", sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("Buy me", 85, 25);
        g.fillText("a coffee", 85, 55);
      });
      // (a piece of the body's own curve, 26 to 106 px up and 0.2 px out of it, so that it lies on the china at every height)
      const skin = [];
      for (let z = 26; z <= 106; z += 4) skin.push([radiusAt(z) + 0.2, z]);
      const print = mesh(lathe(skin, 64, -Math.PI / 4 - arc / 2, arc), material.decal(map), { cast: false });
      print.name = "print";
      group.add(print);
      return { group, height: H };
    },
  },
  // the old computer, as the CSS room has it: 368 by 280 and 320 high (gl/computer.js); `ground` is the piece of the mat the
  // bench lays under it, px across, and `look` how far back the camera stands, in heights
  computer: { label: "The old computer", ground: 1000, look: 3.6, build: (r) => import("./computer.js").then((m) => m.computer(r)) },
  keyboard: { label: "The keyboard", ground: 700, look: 9, build: (r) => import("./computer.js").then((m) => m.keyboard(r)) },
  mouse: { label: "The mouse", ground: 500, look: 9, build: () => import("./computer.js").then((m) => m.mouse()) },
  // the three together as they stand on the desk, the keyboard in front of the case and the mouse to its right
  pc: { label: "The computer, keyboard and mouse", ground: 1500, look: 4.6, build: (r) => import("./computer.js").then((m) => m.pc(r)) },
  // the office chair, the tie that hangs on it, and the wire wastebasket (gl/furniture.js)
  chair: { label: "The chair", ground: 900, look: 3.1, build: (r) => import("./furniture.js").then((m) => m.chair(r)) },
  // the tie is its own thing: on the bench it hangs from its origin, the top of the headrest; the room puts it on the chair
  tie: { label: "The tie", ground: 400, look: 7, hangs: 235, build: () => import("./furniture.js").then((m) => m.tie()) },
  bin: { label: "The wastebasket", ground: 500, look: 3.2, build: (r) => import("./furniture.js").then((m) => m.bin(r)) },
  // the wall with its window, the sill and the cat's perch on its chains (gl/window.js: standing on the wall's face, window's middle at the origin);
  // the shelf, the plant and the radio with its projector (gl/shelf.js: standing on the right wall's face at the shelf's north end)
  window: { label: "The window, the sill and the perch", ground: 1400, look: 2.4, build: (r) => import("./window.js").then((m) => m.windowSet(r)) },
  shelf: { label: "The shelf, the plant and the radio", ground: 1000, look: 2.8, build: (r) => import("./shelf.js").then((m) => m.shelf(r)) },
  plant: { label: "The plant", ground: 400, look: 3.4, build: (r) => import("./shelf.js").then((m) => m.plant(r)) },
  // the two books on the desk (gl/books.js): CloudBank's ledger and Nutreek's agenda, with their covers printed, their bands and the bookmark
  ledger: { label: "The ledger (CloudBank)", ground: 700, near: 1000, build: (r) => import("./books.js").then((m) => m.ledger(r)) },
  agenda: { label: "The agenda (Nutreek)", ground: 700, near: 950, build: (r) => import("./books.js").then((m) => m.agenda(r)) },
  // the rest of the desk and the walls (ticket 07): the instant camera (gl/camera.js), Planora's jar (gl/jar.js), the pager, the post on the computer and the
  // cards taped to the right wall (gl/things.js)
  camera: { label: "The camera", ground: 700, near: 900, build: (r) => import("./camera.js").then((m) => m.camera(r)) },
  jar: { label: "The jar (Planora)", ground: 700, near: 900, build: (r) => import("./jar.js").then((m) => m.jar(r)) },
  pager: { label: "The pager (ASF Plugins)", ground: 400, near: 330, build: (r) => import("./things.js").then((m) => m.pager(r)) },
  post: { label: "The post on the computer", ground: 500, near: 600, build: (r) => import("./things.js").then((m) => m.post(r)) },
  cards: { label: "The cards on the wall", ground: 700, near: 1000, hangs: 130, build: (r) => import("./things.js").then((m) => m.cards(r)) },
  // the odds and ends, Willy's box and the cable (ticket 08: gl/loose.js, gl/desk.js), and what hangs on the walls (gl/walls.js)
  loose: { label: "The odds and ends", ground: 500, near: 400, build: (r) => import("./loose.js").then((m) => m.looseSet(r)) },
  nest: { label: "Willy's box", ground: 600, near: 700, build: (r) => import("./desk.js").then((m) => m.nest(r)) },
  cable: { label: "The cable and its socket", ground: 1400, near: 1600, build: (r) => import("./desk.js").then((m) => m.cable(r)) },
  sign: { label: "The neon name", ground: 1000, near: 1100, hangs: 140, build: (r) => import("./walls.js").then((m) => m.sign(r)) },
  poster: { label: "The poster", ground: 800, near: 800, hangs: 130, build: (r) => import("./walls.js").then((m) => m.poster(r)) },
  nav: { label: "The neon navigation", ground: 1000, near: 1000, hangs: 70, build: (r) => import("./walls.js").then((m) => m.nav(r)) },
  switch: { label: "The light switch", ground: 400, near: 450, hangs: 110, build: (r) => import("./walls.js").then((m) => m.lightSwitch(r)) },
  radio: { label: "The radio", ground: 500, look: 3, build: (r) => import("./shelf.js").then((m) => m.radio(r)) },
};
