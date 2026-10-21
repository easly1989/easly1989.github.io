/* The radio on the bench keeps playing from page to page. Each page is a new document, so
   the music cannot run on through a navigation: every page that loads this picks it up
   where the last one left it, at the point it would have reached by now. The console
   (terminal.html) does not load it, so the radio is quiet in there, and back out it goes
   on from where it stopped. State lasts for the visit (sessionStorage). */
(function () {
  "use strict";
  var STATIONS = ["lofi_1", "lofi_2", "ambient", "lofi_3", "rock"].map(function (n) {
    return "assets/radio/" + n + ".mp3";
  });
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
  state.station = state.station || 0;
  var audio = null;
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
    audio.src = STATIONS[state.station];
    if (at > 0)
      audio.addEventListener(
        "loadedmetadata",
        function () {
          if (audio.duration) audio.currentTime = at % audio.duration;
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
    state.t = audio ? audio.currentTime : state.t || 0;
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
  window.RADIO = {
    stations: STATIONS.length,
    state: function () {
      return state;
    },
    power: function (on) {
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
    },
    next: function () {
      state.station = (state.station + 1) % STATIONS.length;
      state.t = 0;
      if (state.on) start(0);
      save(state);
      changed();
    },
    onChange: function (fn) {
      listeners.push(fn);
    },
  };
  resume();
})();
