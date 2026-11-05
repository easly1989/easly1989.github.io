# The computer

An easter egg, not a project: an old all-in-one computer drawn in CSS 3D on the
room's desk. Its markup, style and script are inline in `index.html` (`.pc`), and
run only in the room. Only its power button does anything until it
has booted; then the screen or the keyboard opens `terminal.html`, a green CRT
console with a fake filesystem, floppy disks, tab completion and a few hidden
commands.

**The hidden commands are sealed, and that is the point.** Each one is the key
(PBKDF2, then AES-GCM) to its own entry in the `VAULT` in `terminal.html`, so the
page holds no command and no hash of one. The commands, the programs they open
and the kit that seals them live outside the repo, in
`~/.claude-env/bench-terminal/` (its `kit/build_term.py` rewrites
`terminal.html`). Edit the console there, never in the built page, and never
write a command, or the name of what it opens, into this repo — not in a
comment, a commit message or a PR. The hints in the console are riddles on
purpose.

State, all in this browser: `sessionStorage pc:on` says the computer was
switched on; opening `terminal.html` without it shows a red FATAL screen and
sets `localStorage pc:fried`, after which the room's computer stays broken
(cracked, scorched) until site data is cleared. `localStorage pc:mute` is the
speaker button. Ten wrong commands, or three wrong passwords, play
`assets/tty0.mp4` in a loop until its window is closed.

`crt.js` makes every sound with Web Audio, nothing downloaded; it loads, not
deferred, before `site.js`, in the room only. `terminal.html` stands alone: it
loads `crt.js` and its own script, and not `styles.css`, `site.js` or the room.
