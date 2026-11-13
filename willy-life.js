// What Willy does next, in the room (willy-room.js): one of his everyday actions, picked at random,
// weighted, among those he can do where he is, never the one he did last, and none again before
// its cooldown is up. The actions and their weights were the 2D cat's (the bench's cat, which he
// replaced), remapped to the room; the ones that need a prop or a toy come with those.
//
// An action's run(at) gives where he ends up and the show that takes him there, as moments
// (willy-moves.js), or null when it cannot be done this time (no room for it, say). A moment may
// carry cues for when it starts: say, [text, ms] in a bubble over his head; look, a point in the
// room, "reader", "around" (somewhere about him) or null; blink, s of a slow blink; twitch, an ear;
// act, something done to the room as it starts (the mouse knocked).

// one of actions, or null: where, the surface he is on; now, s; ran, when each last ran, s;
// last, the one he did last; skip, those already tried this time that could not be done
export function pick(actions, { where, now, ran = {}, last = null, skip = new Set() }, rand = Math.random) {
  const can = actions.filter((a) => a.where.includes(where) && !skip.has(a.n) && !(a.cool && ran[a.n] != null && now - ran[a.n] < a.cool));
  const options = can.some((a) => a.n !== last) ? can.filter((a) => a.n !== last) : can;
  if (!options.length) return null;
  let r = rand() * options.reduce((n, a) => n + a.w, 0);
  for (const a of options) {
    if (r < a.w) return a;
    r -= a.w;
  }
  return options[options.length - 1];
}

// what the actions and the reactions are made of, for Willy w, his planner P and his moves M in a
// room of surfaces SURF
function kit({ w, P, M, SURF }) {
  const between = ([a, b]) => a + Math.random() * (b - a),
    one = (list) => list[Math.floor(Math.random() * list.length)],
    xyh = (s, p) => ({ surface: s, x: p[0], y: p[1], heading: p[2] }),
    here = (at) => [at.x, at.y, at.heading],
    fits = (to, clip) => w.fits(to.x, to.y, SURF[to.surface].z, to.heading, clip, { on: SURF[to.surface] }),
    // a place on the desk he can walk off from and turn all the way round in (at each of the
    // planner's 16 headings): one he could only walk into, nose first, is a pocket no route leaves
    free = (to) => fits(to, "walk") && [...Array(16).keys()].every((i) => fits({ ...to, heading: i * 22.5 }, "turn")),
    cue = (m, c) => Object.assign(m, c),
    hold = (clip, at, extra = 0, loop = false) => M.hold(clip, here(at), at.surface, extra, loop),
    // a clip held looping for about s seconds
    stay = (clip, at, s) => hold(clip, at, Math.max(0, s - M.dur(clip)), true);
  // somewhere free on the desk, at least far px from at
  function spot(at, clip = "idle", far = 200) {
    for (let n = 0; n < 30; n++) {
      const p = P.spot("desk", clip);
      const to = p && xyh("desk", p);
      if (to && free(to) && (at.surface !== "desk" || Math.hypot(to.x - at.x, to.y - at.y) >= far)) return to;
    }
    return null;
  }
  // there from at, in that gait, and what he does there; or null
  async function going(at, to, gait, then) {
    const there = to && then(to),
      route = there && (await M.go(at, to));
    return route ? { to, moments: [...M.legs(route, gait), ...there] } : null;
  }
  const done = (at, moments) => (moments ? { to: at, moments } : null);
  const ease = (k) => k * k * (3 - 2 * k);
  // a clip played while he shifts from a to b, slowly at both ends
  const sliding = (clip, a, b) => {
    const m = hold(clip, a);
    return { dur: m.dur, at: (t) => ({ ...m.at(t), x: a.x + (b.x - a.x) * ease(t / m.dur), y: a.y + (b.y - a.y) * ease(t / m.dur) }) };
  };
  // the spots near at, facing the same way, nearest first: the cushion is too shallow to sit or
  // lie on where he lands in its middle
  const NEAR = [];
  for (let dx = -60; dx <= 60; dx += 10) for (let dy = -90; dy <= 90; dy++) NEAR.push([dx, dy]); // (lying to knead fits in a strip 1 px deep)
  NEAR.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  // settling down in clips (the first sits or lies him down, the last gets him up), staying down
  // in each of those between, { clip, s, cue }, for about s: where he is, if he fits; else, on the
  // cushion, the nearest spot he does, shifting there as he settles, as a cat flops onto its
  // side, and back as he gets up, to where he landed, where he leaps down from; or null
  function settled(at, [down, ...rest]) {
    const up = rest.pop(),
      fit = (to) => [down, ...rest.map((m) => m.clip), up].every((c) => fits(to, c)),
      to = (at.surface === "perch" ? NEAR : [[0, 0]]).map(([dx, dy]) => ({ ...at, x: at.x + dx, y: at.y + dy })).find(fit);
    return to ? [sliding(down, at, to), ...rest.map((m) => cue(stay(m.clip, to, m.s), m.cue || {})), sliding(up, to, at)] : null;
  }
  const sitting = (at, s, c = {}) => settled(at, ["sit", { clip: "sit-idle", s, cue: c }, "sit-from"]);

  return { between, one, xyh, here, fits, free, cue, hold, stay, spot, going, done, sitting, settled };
}

// the actions, for Willy w, his planner P and his moves M in a room of surfaces SURF
export function everyday({ w, P, M, SURF }) {
  const { between, one, xyh, here, fits, free, cue, hold, stay, spot, going, done, sitting, settled } = kit({ w, P, M, SURF });
  return [
    { n: "wander", w: 10, where: ["desk"], run: (at) => going(at, spot(at), "walk", (to) => [stay("idle", to, between([0.6, 1.5]))]) },
    { n: "trot", w: 4, where: ["desk"], run: (at) => going(at, spot(at, "sit"), "trot", (to) => sitting(to, between([1.5, 3]))) },
    {
      n: "sit and look around",
      w: 8,
      where: ["desk", "perch"],
      run: (at) => done(at, settled(at, ["sit", ...[0, 1, 2].map(() => ({ clip: "sit-idle", s: between([0.7, 1.6]), cue: { look: "around" } })), { clip: "sit-idle", s: 0.6, cue: { look: null } }, "sit-from"])),
    },
    { n: "loaf", w: 6, where: ["desk", "perch"], run: (at) => done(at, settled(at, ["lie", { clip: "loaf", s: between([6, 12]) }, "lie-from"])) },
    {
      n: "nap",
      w: 6,
      cool: 40,
      where: ["desk", "perch"],
      run: async (at) => {
        const nap = (to) => settled(to, ["sleep", { clip: "sleep-idle", s: between([18, 40]) }, "wake"]);
        if (at.surface === "perch") return done(at, nap(at));
        return going(at, spot(at, "sleep"), "walk", (to) => {
          const m = nap(to);
          return m && [...m, hold("stretch", to)];
        });
      },
    },
    // washing his face is grooming too
    ...[["groom", 7], ["wash face", 4]].map(([n, wt]) => ({ n, w: wt, where: ["desk", "perch"], run: (at) => done(at, settled(at, ["sit", { clip: "groom", s: 0 }, "sit-from"])) })),
    { n: "stretch", w: 5, where: ["desk"], run: (at) => done(at, [hold("stretch", at), stay("idle", at, 0.5)]) },
    { n: "yawn", w: 4, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(hold("yawn", at), { say: ["*yawn*", 1300] })]) },
    { n: "slow blink", w: 4, where: ["desk", "perch"], run: (at) => done(at, sitting(at, 2.6, { look: "reader", blink: 1.3 })) },
    { n: "stare at nothing", w: 4, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(stay("idle", at, between([2.5, 5])), { look: "around" }), cue(stay("idle", at, 0.3), { look: null })]) },
    {
      n: "chase its tail",
      w: 2,
      cool: 60,
      where: ["desk"],
      run: (at) => {
        const round = M.chasing(here(at), "desk");
        const clear = round.every((m) => [0, 0.5].every((k) => { const q = m.at(m.dur * k); return w.fits(q.x, q.y, SURF.desk.z, q.h, "chase", { on: SURF.desk }); }));
        const then = clear && sitting(at, 1.2, { say: ["…", 900] });
        return then ? done(at, [...round, ...then]) : null;
      },
    },
    {
      n: "zoomies",
      w: 2,
      cool: 70,
      where: ["desk"],
      run: async (at) => {
        const moments = [];
        let from = at;
        for (let i = 0; i < 4; i++) {
          const to = spot(from, "sit", 300);
          const route = to && (await M.go(from, to));
          if (!route) break;
          moments.push(...M.legs(route, "run"));
          from = to;
        }
        const then = moments.length && sitting(from, 1.5);
        return then ? { to: from, moments: [...moments, ...then] } : null;
      },
    },
    {
      n: "pounce on nothing",
      w: 3,
      where: ["desk"],
      run: (at) => {
        const r = (at.heading * Math.PI) / 180,
          ahead = (k) => [at.x + Math.cos(r) * 150 * k, at.y - Math.sin(r) * 150 * k];
        if (![0.5, 1].every((k) => w.fits(...ahead(k), SURF.desk.z, at.heading, "walk", { on: SURF.desk }))) return null;
        const to = xyh("desk", [...ahead(1), at.heading]);
        const then = sitting(to, 1);
        return then && { to, moments: [...M.pouncing(here(at), 150, "desk"), ...then] };
      },
    },
    {
      // the old mouse by the keyboard (ROOM.mouse): he creeps up to it, watches it, and pounces;
      // it slides off a little where he lands on it
      n: "knock the mouse about",
      w: 4,
      cool: 45,
      where: ["desk"],
      run: (at) => {
        const mouse = window.ROOM && window.ROOM.mouse;
        if (!mouse || !mouse.body) return null; // (no mouse drawn: room-mouse.js)
        const [mx, my, mz] = mouse.at();
        // landing as near it as he fits, so his paws come down on it
        const tries = [];
        for (const L of [230, 250, 270, 300]) {
          const round = [];
          for (const d of [120, 170, 220]) for (let i = 0; i < 16; i++) round.push([L + d, d, (i * Math.PI) / 8]);
          tries.push(...round.sort(() => Math.random() - 0.5));
        }
        for (const [D, d, a] of tries) {
          const heading = ((a * 180) / Math.PI + 180) % 360,
            from = xyh("desk", [mx + Math.cos(a) * D, my - Math.sin(a) * D, heading]),
            ahead = (k) => [from.x - Math.cos(a) * d * k, from.y + Math.sin(a) * d * k];
          // (where he waits need only take him walking up and crouching, not turning round)
          if (!fits(from, "walk") || !fits(from, "crouch")) continue;
          if (![0.5, 1].every((k) => w.fits(...ahead(k), SURF.desk.z, heading, "walk", { on: SURF.desk }))) continue;
          const land = xyh("desk", [...ahead(1), heading]),
            then = sitting(land, between([1.5, 2.5]));
          if (!then) continue;
          cue(then[0], { act: () => mouse.knock(heading), look: [mx, my, mz] });
          return going(at, from, "walk", (to) => {
            const leap = M.pouncing(here(to), d, "desk", between([1.2, 2.2]));
            cue(leap[0], { look: [mx, my, mz] });
            return [...leap, ...then];
          });
        }
        return null;
      },
    },
    // kneading is for soft things: the cushion under the window
    // (lying down, or standing, where there is no room to lie down and knead)
    {
      n: "knead",
      w: 3,
      where: ["perch"],
      run: (at) => {
        const prr = { say: ["prr", 1500] };
        return done(at, settled(at, ["lie", { clip: "knead-lie", s: between([3, 5]), cue: prr }, "lie-from"]) || (fits(at, "knead") && [cue(stay("knead", at, between([3, 5])), prr)]));
      },
    },
    { n: "sneeze", w: 2, where: ["desk", "perch", "shelf"], run: (at) => done(at, [cue(hold("shake", at), { say: ["tchi!", 900] })]) },
    { n: "meow at you", w: 3, where: ["desk", "perch"], run: (at) => done(at, sitting(at, 1.5, { look: "reader", say: [one(["mew", "mrrp?", "meow"]), 1200] })) },
    {
      n: "ear twitch",
      w: 3,
      where: ["desk", "perch"],
      run: (at) => done(at, settled(at, ["lie", ...[0, 1, 2].map(() => ({ clip: "loaf", s: between([0.9, 1.7]), cue: { twitch: true } })), "lie-from"])),
    },
    {
      n: "walk the line",
      w: 2,
      where: ["desk"],
      run: (at) => {
        // straight on along the mat's grid, slowly, as far as he can go
        const h = Math.round(at.heading / 90) * 90,
          r = (h * Math.PI) / 180;
        if (h !== at.heading && !fits(at, "turn")) return null;
        let d = 0;
        while (d < 400 && w.fits(at.x + Math.cos(r) * (d + 20), at.y - Math.sin(r) * (d + 20), SURF.desk.z, h, "walk", { on: SURF.desk })) d += 20;
        if (d < 160) return null;
        const to = xyh("desk", [at.x + Math.cos(r) * d, at.y - Math.sin(r) * d, h]);
        const then = sitting(to, 1.2);
        return then && { to, moments: [...M.walking([here(at), [at.x, at.y, h], here(to)], "desk", { d: 0 }, "sneak"), ...then] };
      },
    },
    // the room's own: up to the cushion under the window to sleep, up to the shelf to look
    // down, and back to the desk from either
    {
      n: "nap on the cushion",
      w: 20,
      where: ["desk"],
      run: async (at) => {
        // by whichever of the jumps lands him where he can lie down
        for (const hop of P.hops("desk", "perch")) {
          const to = xyh("perch", [hop.to[0], hop.to[1], hop.h1]),
            m = settled(to, ["sleep", { clip: "sleep-idle", s: between([15, 40]) }, "wake"]);
          if (m) return going(at, to, "walk", () => m);
        }
        return null;
      },
    },
    {
      n: "look from the shelf",
      w: 10,
      where: ["desk"],
      run: async (at) => {
        const hop = P.hops("desk", "shelf")[0];
        const to = hop && xyh("shelf", [hop.to[0], hop.to[1], hop.h1]);
        return to && going(at, to, "walk", (to) => [cue(stay("look-down", to, between([3, 7])), { look: "reader" })]);
      },
    },
    { n: "chatter at the birds", w: 3, where: ["perch"], run: (at) => done(at, settled(at, ["sit", { clip: "chatter", s: 0, cue: { look: "window", say: ["ek-ek-ek", 1600] } }, "sit-from"])) },
    { n: "back to the desk", w: 10, where: ["perch", "shelf"], run: (at) => going(at, spot(at, "sit"), "walk", (to) => sitting(to, between([3, 8]))) },
  ];
}

// How he answers being petted: the click, or Enter on his button. One of fourteen reactions, picked
// at random, never the same twice running, and by where he is. pick()ed like an action, but a
// reaction with solo true is the only answer where its when() holds: on the cushion, asleep or lying
// down, he only opens one eye; on the shelf he turns and looks down. Peekaboo's, ducking behind the
// computer, comes with #71: a solo reaction with when: (c) => c.peekaboo, added to this list.
// Each carries line, what the live line says he did.
//
// run(at, ctx) is as an action's, but from wherever the show he was in had him: ctx.rest is "sleep"
// or "lie" when he is down, and ctx.fur(at) leaves a little fur on what he stands on.
export function reactions({ w, P, M, SURF }) {
  const { between, one, here, fits, cue, hold, stay, spot, going, done, sitting, settled } = kit({ w, P, M, SURF });
  // standing here a while, as he is: what he does from a moment he was caught in
  const idle = (at, s, c = {}) => cue(stay("idle", at, s), c);
  return [
    { n: "open one eye", w: 1, where: ["perch"], solo: true, when: (c) => !!c.rest, line: "Willy opens one eye.", run: (at, c) => (fits(at, c.rest === "sleep" ? "sleep-idle" : "loaf") ? [cue(stay(c.rest === "sleep" ? "sleep-idle" : "loaf", at, 2.4), { blink: 1.8 })] : null) },
    { n: "look down", w: 1, where: ["shelf"], solo: true, line: "Willy turns and looks down at you.", run: (at) => (fits(at, "look-down") ? [cue(stay("look-down", at, between([3, 5])), { look: "reader" })] : null) },
    {
      n: "purr",
      w: 8,
      where: ["desk", "perch"],
      line: "Willy purrs.",
      run: (at, c) => {
        const cues = { look: "reader", say: ["prrr", 1800] };
        return done(at, (c.rest && settled(at, ["lie", { clip: "pet-lie", s: between([2.5, 4]), cue: cues }, "lie-from"])) || settled(at, ["sit", { clip: "pet-sit", s: between([2.5, 4]), cue: cues }, "sit-from"]));
      },
    },
    { n: "meow at you", w: 6, where: ["desk", "perch"], line: "Willy meows at you.", run: (at) => done(at, sitting(at, 1.5, { look: "reader", say: [one(["mew", "mrrp?", "meow"]), 1200] })) },
    { n: "chirp", w: 5, where: ["desk", "perch"], line: "Willy chirps.", run: (at) => done(at, sitting(at, 1.2, { look: "reader", say: [one(["brrp!", "prrp?"]), 900], twitch: true })) },
    { n: "slow blink", w: 6, where: ["desk", "perch"], line: "Willy gives you a slow blink.", run: (at) => done(at, sitting(at, 2.6, { look: "reader", blink: 1.3 })) },
    { n: "headbutt", w: 6, where: ["desk", "perch", "shelf"], line: "Willy headbutts your hand.", run: (at, c) => (!c.rest && fits(at, "pet") ? [cue(hold("pet", at), { look: "reader" }), idle(at, 0.3)] : null) },
    {
      n: "belly trap",
      w: 3,
      where: ["desk", "perch"],
      line: "Willy rolls onto his back. It's a trap.",
      run: (at) => {
        const roll = settled(at, ["lie", { clip: "roll-over", s: 0 }, "lie-from"]);
        return done(at, roll && [...roll, ...(fits(at, "swat-right") ? [cue(hold("swat-right", at), { look: "reader" })] : [])]);
      },
    },
    { n: "ignore you", w: 5, where: ["desk", "perch", "shelf"], line: "Willy ignores you.", run: (at, c) => (c.rest ? null : [idle(at, between([2, 3.5]), { look: "around" }), idle(at, 0.3, { look: null })]) },
    {
      // (he stops first, so the walk's first step does not jump from the pose he was caught in)
      n: "walk off",
      w: 4,
      where: ["desk", "perch", "shelf"],
      line: "Willy walks off.",
      run: async (at, c) => {
        if (c.rest || !fits(at, "idle")) return null;
        const r = await going(at, spot(at), "walk", (to) => [stay("idle", to, between([0.6, 1.2]))]);
        return r && { to: r.to, moments: [idle(at, 0.35), ...r.moments] };
      },
    },
    { n: "pointed grooming", w: 5, where: ["desk", "perch"], line: "Willy grooms himself, pointedly.", run: (at) => done(at, settled(at, ["sit", { clip: "groom", s: between([3, 4.5]), cue: { look: "around" } }, "sit-from"])) },
    { n: "knead", w: 3, where: ["desk", "perch"], line: "Willy kneads.", run: (at, c) => (!c.rest && fits(at, "knead") ? [cue(stay("knead", at, between([2.5, 4])), { say: ["prr", 1500] })] : null) },
    { n: "yawn", w: 4, where: ["desk", "perch", "shelf"], line: "Willy yawns.", run: (at, c) => (!c.rest && fits(at, "yawn") ? [cue(hold("yawn", at), { say: ["*yawn*", 1300] })] : null) },
    { n: "stare", w: 4, where: ["desk", "perch", "shelf"], line: "Willy stares at you.", run: (at, c) => (c.rest ? null : [idle(at, between([2.5, 4]), { look: "reader" }), idle(at, 0.3, { look: null })]) },
    { n: "sneeze", w: 3, where: ["desk", "perch", "shelf"], line: "Willy sneezes.", run: (at, c) => (!c.rest && fits(at, "shake") ? [cue(hold("shake", at), { say: ["tchi!", 900] })] : null) },
    {
      n: "rub and leave fur",
      w: 4,
      where: ["desk", "perch"],
      line: "Willy rubs against you and leaves some fur.",
      run: (at, c) => (!c.rest && fits(at, "pet") ? [cue(hold("pet", at), { look: "reader" }), cue(hold("pet", at), { act: () => c.fur(at) }), idle(at, 0.3)] : null),
    },
  ];
}

// the reaction to give, from ctx (reactions()): among those where he is that can be done now, the
// solo ones alone where there are any; or null
export function react(list, ctx, state, rand = Math.random) {
  const here = list.filter((a) => a.where.includes(ctx.where) && !state.skip.has(a.n) && (!a.when || a.when(ctx)));
  return pick(here.some((a) => a.solo) ? here.filter((a) => a.solo) : here, { where: ctx.where, last: state.last, skip: state.skip }, rand);
}
