// node checks/willy-life.test.mjs: how Willy picks what to do next, with no page: at random,
// weighted, among what he can do where he is, never what he did last, and nothing again before
// its cooldown is up.
import assert from "node:assert/strict";
import { pick, warm, WARM, paws, PAW_KEYS } from "../willy-life.js";

const ACTIONS = [
  { n: "wander", w: 10, where: ["desk"] },
  { n: "nap", w: 6, cool: 40, where: ["desk"] },
  { n: "groom", w: 4, where: ["desk", "perch"] },
  { n: "down", w: 10, where: ["perch", "shelf"] },
];
// a random draw that always lands at r of the way through the total
const at = (r) => () => r;

// only what he can do where he is
for (let r = 0; r < 1; r += 0.05) assert.notEqual(pick(ACTIONS, { where: "shelf", now: 0 }, at(r)).n, "groom");
assert.equal(pick(ACTIONS, { where: "shelf", now: 0 }, at(0.5)).n, "down");

// weighted: 10, 6 and 4 of 20 on the desk
const counts = {};
for (let i = 0; i < 1000; i++) {
  const n = pick(ACTIONS, { where: "desk", now: 0 }, at(i / 1000)).n;
  counts[n] = (counts[n] || 0) + 1;
}
assert.deepEqual(counts, { wander: 500, nap: 300, groom: 200 });

// never what he did last, when anything else will do
for (let r = 0; r < 1; r += 0.05) assert.notEqual(pick(ACTIONS, { where: "desk", now: 0, last: "wander" }, at(r)).n, "wander");
// but if it is all there is, that
assert.equal(pick(ACTIONS, { where: "shelf", now: 0, last: "down" }, at(0.3)).n, "down");

// nothing again before its cooldown, in s, is up
const ran = { nap: 100 };
for (let r = 0; r < 1; r += 0.05) assert.notEqual(pick(ACTIONS, { where: "desk", now: 139, ran }, at(r)).n, "nap");
assert.equal(pick(ACTIONS, { where: "desk", now: 141, ran }, at(0.6)).n, "nap");

// what has been tried and could not be done this time is left out
for (let r = 0; r < 1; r += 0.05) assert.notEqual(pick(ACTIONS, { where: "desk", now: 0, skip: new Set(["wander"]) }, at(r)).n, "wander");

// nothing he can do: nothing
assert.equal(pick(ACTIONS, { where: "desk", now: 0, skip: new Set(["wander", "nap", "groom"]) }), null);

// the computer's monitor is warm while it is on, and for three minutes after it went off
assert.equal(WARM, 180);
assert.equal(warm({ on: true, off: null }, 0), true);
assert.equal(warm({ on: false, off: null }, 1000), false); // (never on this visit)
assert.equal(warm({ on: false, off: 100 }, 100 + 179), true);
assert.equal(warm({ on: false, off: 100 }, 100 + 181), false);

// what his paws type: punctuation and spaces, never a letter or a digit, nor Enter
assert.equal(PAW_KEYS, ";'[],./\\=- ");
for (let r = 0; r < 1; r += 0.01) assert.match(paws(4, () => r), /^[;'\[\],.\/\\=\- ]{4}$/);
assert.equal(paws(0), "");

console.log("ok: willy-life");
