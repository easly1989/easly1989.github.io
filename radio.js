/* The radio on the room's shelf keeps playing from page to page. Each page is a new
   document, so the music cannot run on through a navigation: every page that loads this
   picks it up where the last one left it, at the point it would have reached by now. The
   console (terminal.html) does not load it, so the radio is quiet in there, and back out it
   goes on from where it stopped. In a visit to the room every page's bar carries the radio
   too, which stops it (WCAG 1.4.2). State lasts for the visit (sessionStorage).
   Loaded at the end of the body, before site.js, and on the home before room.js. */
(function () {
  "use strict";
  // one track per station, credited on the radio and at the foot of About (assets/radio/README.md)
  var TRACKS = [
    { file: "lofi_1", title: "Lofi Chill Vlog Beats", author: "alex-morgan" },
    { file: "lofi_2", title: "Lofi Pop", author: "ZephiraMusic" },
    { file: "ambient", title: "Ambient Guitar", author: "The_Mountain" },
    { file: "lofi_3", title: "Lofi House", author: "ZephiraMusic" },
    { file: "rock", title: "Post-Rock Crescendo", author: "alex-morgan" },
  ];
  var VOLUME = 0.4;
  function load() {
    try {
      return JSON.parse(sessionStorage.getItem("radio")) || {};
    } catch (e) {
      return {};
    }
  }
  function save(s) {
    try {
      sessionStorage.setItem("radio", JSON.stringify(s));
    } catch (e) {}
  }
  var state = load();
  state.station = state.station >= 0 && state.station < TRACKS.length ? state.station | 0 : 0;
  var audio = null;
  // where a track was asked to start, and when: what it has reached until it plays itself
  var base = 0,
    baseAt = 0,
    seeking = false;
  var listeners = [];
  function changed() {
    listeners.forEach(function (fn) {
      fn(state);
    });
  }
  // streamed while it plays: nothing is fetched before a station is tuned in
  function start(at) {
    if (audio) audio.pause();
    audio = new Audio();
    audio.preload = "none";
    audio.loop = true;
    audio.volume = VOLUME;
    audio.src = "assets/radio/" + TRACKS[state.station].file + ".mp3";
    base = at;
    baseAt = Date.now();
    seeking = at > 0;
    if (seeking)
      audio.addEventListener(
        "loadedmetadata",
        function () {
          if (audio.duration) audio.currentTime = at % audio.duration;
          seeking = false;
        },
        { once: true }
      );
    // a page the reader has not touched yet may not make sound: it waits for a touch
    audio.play().catch(function () {
      var a = audio;
      function go() {
        removeEventListener("pointerdown", go, true);
        removeEventListener("keydown", go, true);
        if (a === audio && state.on) a.play().catch(function () {});
      }
      addEventListener("pointerdown", go, true);
      addEventListener("keydown", go, true);
    });
  }
  // where the music is, to carry on from on the next page
  function remember(quiet) {
    if (!state.on) return save(state);
    // a track that has not started yet (no touch, or its start not found yet) is where it
    // would be by now
    if (audio) state.t = audio.readyState && !seeking ? audio.currentTime : base + (Date.now() - baseAt) / 1000;
    state.at = Date.now();
    state.quiet = !!quiet;
    save(state);
  }
  function resume() {
    if (!state.on) return;
    var t = state.t || 0;
    if (!state.quiet && state.at) t += (Date.now() - state.at) / 1000;
    start(t);
  }
  addEventListener("pageswap", function (e) {
    var to = e.activation && e.activation.entry && e.activation.entry.url;
    remember(to && /terminal\.html(\?|#|$)/.test(to));
  });
  addEventListener("pagehide", function () {
    // the pageswap has said where it is going; without one (an older browser) it is a page
    // like any other
    if (state.at && Date.now() - state.at < 1000) return;
    remember(false);
  });
  // back through the cache the page is as it was left, its music paused
  addEventListener("pageshow", function (e) {
    if (e.persisted) {
      state = load();
      resume();
      changed();
    }
  });

  // The music's waveform, for the room's projector, set up the first time it is asked for.
  // The track is routed through it only once its context can sound: a suspended one would
  // silence it, so until then it plays on its own and there is no wave to show.
  var actx = null,
    analyser = null,
    wired = null,
    source = null,
    bins = null;
  function wave() {
    if (!audio || audio.paused) return null;
    if (!actx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      actx = new Ctx();
      analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyser.connect(actx.destination);
      bins = new Uint8Array(analyser.fftSize);
      var wake = function () {
        if (actx.state === "suspended") actx.resume();
      };
      wake();
      addEventListener("pointerdown", wake, true);
      addEventListener("keydown", wake, true);
    }
    if (actx.state !== "running") return null;
    if (wired !== audio) {
      try {
        if (source) source.disconnect();
        source = actx.createMediaElementSource(audio);
        source.connect(analyser);
      } catch (e) {
        return null;
      }
      wired = audio;
    }
    analyser.getByteTimeDomainData(bins);
    return bins;
  }

  function power(on) {
    state.on = on;
    state.t = 0;
    state.at = 0;
    if (on) start(0);
    else if (audio) {
      audio.pause();
      audio = null;
    }
    save(state);
    changed();
  }
  window.RADIO = {
    stations: TRACKS.length,
    // what is on air: its title and author
    track: function () {
      return TRACKS[state.station];
    },
    state: function () {
      return state;
    },
    power: power,
    next: function () {
      state.station = (state.station + 1) % TRACKS.length;
      state.t = 0;
      if (state.on) start(0);
      save(state);
      changed();
    },
    onChange: function (fn) {
      listeners.push(fn);
    },
    // the waveform playing now, 0 to 255 round 128, or null while there is none to read
    wave: wave,
  };

  // The radio itself, small and seen from the front, at the head of every page's bar in a
  // visit to the room: its power knob stops the music on any page (WCAG 1.4.2), its tuning
  // knob changes station, and what is on air is written beside it. In the room it stands on
  // its shelf, and the bar's links are the neon navigation. While it plays it is on every
  // page, in a visit or not, since it is how the music stops.
  var bar = document.querySelector("header.bar");
  var visit = false;
  try {
    visit = sessionStorage.getItem("room") === "1";
  } catch (e) {}
  if (bar && (visit || state.on) && !document.documentElement.classList.contains("iso")) {
    var set = document.createElement("div");
    set.className = "page-radio";
    set.setAttribute("role", "group");
    set.setAttribute("aria-label", "Radio");
    set.innerHTML =
      '<span class="pr-body"><span class="pr-dial" aria-hidden="true"><span class="pr-needle"></span></span><span class="pr-led" aria-hidden="true"></span>' +
      '<button type="button" class="pr-knob pr-power" aria-label="Radio"></button><button type="button" class="pr-knob pr-tune" aria-label="Next station"></button></span>' +
      '<span class="pr-on" aria-live="polite"></span>';
    var onBtn = set.querySelector(".pr-power"),
      said = set.querySelector(".pr-on");
    onBtn.addEventListener("click", function () {
      power(!state.on);
    });
    set.querySelector(".pr-tune").addEventListener("click", function () {
      set.style.setProperty("--turn", (parseFloat(set.style.getPropertyValue("--turn")) || 0) + 60 + "deg");
      window.RADIO.next();
    });
    bar.insertBefore(set, bar.firstChild);
    var show = function () {
      onBtn.setAttribute("aria-pressed", String(!!state.on));
      set.classList.toggle("on", !!state.on);
      set.style.setProperty("--st", TRACKS.length > 1 ? state.station / (TRACKS.length - 1) : 0.5);
      var tr = TRACKS[state.station];
      said.textContent = state.on ? tr.title + ", " + tr.author : "";
    };
    show();
    listeners.push(show);
  }
  resume();
})();
