# Motion

**The resting state is the visible one.** Everything that animates on its own ends where the
content is plainly visible, and a page whose scripts never load shows all of it: books are
readable pages, the About photo is a photo (its development is a CSS animation that ends at no
filter), the professional home is whole and Willy is simply absent or still. Never write a rule
that leaves content hidden unless something else runs.

Non-user-triggered motion is Willy, the opening moves and the page transitions. Decoration does
not loop forever: the mug's steam puffs three times and stops. The one exception, asked for: the
pager's screen in the room changes its message every 8 to 25 s and runs a long one to its end
and back; under reduced motion it shows one message, still, and in a hidden tab it waits. The
crab on the room's wall swings a few times as the room arrives (about 2.5 s) and when it is
pointed at, and comes to rest; once any object's move starts, or the computer is switched on, it
settles in a few frames and stays still until the move is over. Under reduced motion it never
moves. Willy's peek on the professional home moves only in answer to a mouse or the keyboard.

**A reader may animate anyway.** "Under reduced motion" means: the browser asks for it and the
reader did not choose otherwise. The choice is `localStorage` `site:motion` `"1"`, set by a button
in the footer of the professional home and of every professional page ("Your browser asks for
less motion. Animate anyway.", `aria-pressed`; on, "Animating. Respect my browser's setting."),
shown by `site.js` only where the browser asks for less motion or the choice is set. The playful
pages have no button and follow the choice. `motion.js`, loaded (not deferred) in every page's
head, after `styles.css` where there is one, holds the one answer. Two pages go without it:
`terminal.html`, which stands alone and is rewritten by the kit outside the repo (`docs/computer.md`), so
it keeps its own reduced-motion rules and the browser's answer, and `asf-notifier.html`, only a
redirect.

- **Scripts** ask `reducedMotion()`, never `matchMedia` for its `.matches`; `reducedMotion.query`
  is the browser's own query, for its `change` event. Each file that asks holds one line of
  fallback to the browser's answer (`window.reducedMotion || function () { … }`), so a page whose
  `motion.js` never ran (an old cached page, a blocked script) still works and keeps still.
  `reducedMotion()` reads the choice kept in memory, never storage, so it is cheap per frame.
- **CSS**: every rule under `@media (prefers-reduced-motion: reduce)` starts with
  `:where(html:not(.motion-ok))`, or puts `:where(:not(.motion-ok))` on its first compound when that
  is `html` or `.iso` (`.iso:where(:not(.motion-ok)) .thing`), so it adds no specificity and
  yields to `html.motion-ok`, which `motion.js` sets. A new reduced-motion rule follows the same
  form (`checks/motion.py`).
- **Page transitions**: no class can reach `@view-transition`, so on the pages with `styles.css`
  `motion.js` adopts a sheet with `navigation: auto`, which outweighs the reduced-motion `none`.

The button takes effect at once for Willy's peek, which watches `html.motion-ok`; the room, the
playful pages and the page transitions read it on their next load. A choice made in another tab
(the `storage` event) or before a page came back from the back/forward cache (`pageshow`) is read
again, with the class, the button and the page transitions. Without storage there is no choice and
no button; where storing it fails, the choice holds for that page and a note by the button says it
is not remembered. With none chosen, nothing may move on its own under reduced motion.
