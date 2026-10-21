/* The instant photos. Each time the camera on the bench is used it takes one of them, the
   About page shows it, and back on the bench it stays where it belongs: lying in front of
   the camera or hung on the wall. Each has its own place, so taken again it simply comes
   back there. What is out lasts for the visit (sessionStorage). */
(function () {
  "use strict";
  // Each caption is written by hand on the print's bottom edge, each a little differently:
  // in pen or in pencil, at its own slant. The heart is drawn, not written.
  var PHOTOS = [
    {
      id: "carlo",
      src: "assets/carlo.jpg",
      alt: "Carlo Ruggiero lying down, looking up at a white cat with black patches sitting beside him",
      caption: "That's us.",
      hand: "blue",
      tilt: -2,
    },
    { id: "cat", src: "assets/photos/cat.jpg", alt: "Carlo Ruggiero in headphones at his desk, holding a white cat with black patches", caption: "That's us.", hand: "pencil", tilt: 1.5 },
    { id: "crossed-arms", src: "assets/photos/crossed-arms.jpg", alt: "Carlo Ruggiero standing in a square with his arms crossed, smiling and looking to one side", caption: "Amsterdam 09/2026", hand: "black", tilt: -1 },
    { id: "beard", src: "assets/photos/beard.jpg", alt: "Carlo Ruggiero under a white pergola, pointing at his beard with a grin", caption: "chill 06/2026", hand: "pencil", tilt: 3 },
    { id: "volleyball", src: "assets/photos/volleyball.jpg", alt: "Carlo Ruggiero jumping to hit the ball in a game of indoor beach volleyball", caption: "Beeeach!!!", hand: "blue", tilt: -4, size: 1.12 },
    { id: "seaside", src: "assets/photos/seaside.jpg", alt: "A selfie of Carlo Ruggiero and another person, both smiling, on a terrace high above the sea", caption: "", heart: true, tilt: -6 },
    { id: "hand", src: "assets/photos/hand.jpg", alt: "Carlo Ruggiero laughing and holding his hand up to the camera in a sunny square", caption: "Catania 04/2026", hand: "black", tilt: 1.5 },
  ];
  // the hands: a typeface, an ink, and a size that evens out the faces' different heights
  var HANDS = {
    blue: { font: '"Caveat", cursive', ink: "#24346a", size: 1 },
    black: { font: '"Nanum Pen Script", cursive', ink: "#1f1f24", size: 1.22 },
    pencil: { font: '"Reenie Beanie", cursive', ink: "#5d5b57", size: 1.18 },
  };
  // a heart drawn in red pen in one stroke, its end running a little past its start
  var HEART =
    '<svg class="pen-heart" viewBox="0 0 40 34" role="img" aria-label="a heart"><path d="M20 31C7 22 1 14 5.5 7 9.5 1.5 17 3 20 9.5 23 3 30.5 1 34.5 6.5 39 13 33 22 21 30.6l-2.4-1.8" /></svg>';
  function esc(t) {
    return t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }
  // the same small wobble for a photo every time it is drawn, on the bench and on its page
  function wobble(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return function () {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  // the caption, letter by letter: each one leans and sits a little off the line, and the
  // pressure on the pen comes and goes
  function written(p) {
    var hand = HANDS[p.hand] || HANDS.blue;
    var r = wobble(p.id);
    var letters = Array.prototype.map.call(p.caption, function (c) {
      if (c === " ") return " ";
      return (
        '<span style="display:inline-block;rotate:' + ((r() - 0.5) * 9).toFixed(1) + "deg;translate:0 " + ((r() - 0.5) * 0.1).toFixed(3) + "em;opacity:" + (0.78 + r() * 0.22).toFixed(2) + '">' + esc(c) + "</span>"
      );
    });
    return (
      // read as the words, not letter by letter
      '<span class="pen-line" role="img" aria-label="' + esc(p.caption).replace(/"/g, "&quot;") + '" style="display:inline-block;font-family:' + hand.font.replace(/"/g, "&quot;") + ";color:" + hand.ink + ";font-size:" + (hand.size * (p.size || 1)).toFixed(2) + "em;rotate:" + (p.tilt || 0) + 'deg">' + letters.join("") + "</span>"
    );
  }
  function read(k) {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function write(k, v) {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {}
  }
  function byId(id) {
    return PHOTOS.filter(function (p) {
      return p.id === id;
    })[0];
  }
  window.PHOTOS = {
    all: PHOTOS,
    byId: byId,
    // what is written on the print's bottom edge, in pen
    pen: function (p) {
      if (p.heart) return '<span class="pen-line" style="display:inline-block;rotate:' + (p.tilt || 0) + 'deg">' + HEART + "</span>";
      return p.caption ? written(p) : "";
    },
    // the one in the camera: what the About page shows next
    current: function () {
      return byId(read("photo:next")) || PHOTOS[0];
    },
    // a new shot, never the same as the last one
    shoot: function () {
      var last = read("photo:next");
      var pool = PHOTOS.filter(function (p) {
        return p.id !== last;
      });
      var p = pool[Math.floor(Math.random() * pool.length)];
      write("photo:next", p.id);
      write("photo:developed", "");
      return p;
    },
    // a photo picked up from the bench: the About page shows that one
    choose: function (id) {
      write("photo:next", id);
      write("photo:developed", "1");
      return byId(id);
    },
    // a photo picked up from the bench developed long ago; a new shot has not yet
    developed: function () {
      return read("photo:developed") === "1";
    },
    // the ones left on the bench
    out: function () {
      return (read("photo:out") || "").split(",").filter(byId);
    },
    setOut: function (ids) {
      write("photo:out", ids.join(","));
    },
    shown: function () {
      return byId(read("photo:shown"));
    },
    setShown: function (id) {
      write("photo:shown", id || "");
    },
  };
})();
