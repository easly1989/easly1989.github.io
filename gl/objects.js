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
};
