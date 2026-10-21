/* The old computer's sounds, made on the spot with Web Audio: the tube coming on
   and going off, its hum while it is on, the floppy drive, the keys, a beep.
   Nothing is downloaded. Muting is remembered in this browser. */
(function () {
  "use strict";
  var ctx = null;
  var out = null;
  var hum = null;
  var noise = null;
  var playing = null;
  var muted = false;
  try {
    muted = localStorage.getItem("pc:mute") === "1";
  } catch (e) {}

  // Browsers start audio only after a gesture; the first key or click wakes it.
  function wake() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }
  addEventListener("pointerdown", wake, true);
  addEventListener("keydown", wake, true);

  function audio() {
    if (!ctx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      ctx = new Ctx();
      out = ctx.createGain();
      out.gain.value = muted ? 0 : 0.6;
      out.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noise.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    wake();
    return ctx;
  }
  // a volume that rises to v in a moment and falls away over len seconds
  function envelope(t, v, len, attack) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(out);
    return g;
  }
  function tone(type, f0, f1, t, len, v, attack) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
    o.connect(envelope(t, v, len, attack));
    o.start(t);
    o.stop(t + len + 0.05);
  }
  function hiss(t, len, v, freq, q, kind) {
    var s = ctx.createBufferSource();
    s.buffer = noise;
    var f = ctx.createBiquadFilter();
    f.type = kind || "bandpass";
    f.frequency.value = freq;
    f.Q.value = q || 1;
    s.connect(f);
    f.connect(envelope(t, v, len));
    s.start(t, Math.random());
    s.stop(t + len + 0.05);
  }

  var CRT = {
    // the switch, the degauss thump, and the whine of the tube warming up
    on: function () {
      if (!audio()) return;
      var t = ctx.currentTime;
      hiss(t, 0.09, 0.5, 180, 0.8, "lowpass");
      tone("sawtooth", 62, 48, t + 0.03, 1.1, 0.18, 0.02);
      tone("sine", 7600, 7900, t + 0.2, 1.6, 0.012, 0.5);
      CRT.hum(true);
    },
    // the whine falls, the picture collapses with a pop
    off: function () {
      if (!audio()) return;
      var t = ctx.currentTime;
      CRT.hum(false);
      hiss(t, 0.05, 0.35, 900, 1);
      tone("sine", 7800, 1800, t, 0.45, 0.02, 0.01);
      hiss(t + 0.38, 0.06, 0.25, 300, 0.7, "lowpass");
    },
    // the hum of a tube that is on: mains, the flyback, a little static
    hum: function (yes) {
      if (!yes) {
        if (hum && ctx) {
          hum.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
          var h = hum;
          setTimeout(function () {
            h.nodes.forEach(function (n) {
              n.stop();
            });
          }, 600);
        }
        hum = null;
        return;
      }
      if (hum || !audio()) return;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
      g.connect(out);
      var nodes = [];
      [[60, 0.014], [120, 0.007], [7850, 0.0025]].forEach(function (p) {
        var o = ctx.createOscillator();
        var v = ctx.createGain();
        o.frequency.value = p[0];
        v.gain.value = p[1];
        o.connect(v);
        v.connect(g);
        o.start();
        nodes.push(o);
      });
      var s = ctx.createBufferSource();
      s.buffer = noise;
      s.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 3200;
      f.Q.value = 0.6;
      var v = ctx.createGain();
      v.gain.value = 0.006;
      s.connect(f);
      f.connect(v);
      v.connect(g);
      s.start();
      nodes.push(s);
      hum = { g: g, nodes: nodes };
    },
    // the motor spins and the head steps across the disk
    floppy: function (secs) {
      if (!audio()) return;
      var t = ctx.currentTime;
      secs = secs || 1;
      tone("sawtooth", 96, 92, t, secs, 0.03, 0.08);
      for (var s = 0.05; s < secs - 0.05; s += 0.06 + Math.random() * 0.1) {
        hiss(t + s, 0.025, 0.22, 1700 + Math.random() * 900, 3);
        if (Math.random() < 0.4) tone("square", 38, 38, t + s, 0.05, 0.03);
      }
    },
    // the lever and the disk going home, or coming out
    clack: function () {
      if (!audio()) return;
      var t = ctx.currentTime;
      hiss(t, 0.05, 0.4, 700, 1.5);
      hiss(t + 0.07, 0.07, 0.3, 260, 0.8, "lowpass");
    },
    // an instant camera: the flash's pop and the shutter's clack
    shutter: function () {
      if (!audio()) return;
      var t = ctx.currentTime;
      tone("sine", 5200, 2400, t, 0.06, 0.03, 0.002);
      hiss(t, 0.03, 0.5, 3200, 1.4);
      hiss(t + 0.06, 0.06, 0.4, 1100, 1.2);
      hiss(t + 0.07, 0.08, 0.3, 240, 0.8, "lowpass");
    },
    // its motor pushing the print out through the rollers, for secs
    eject: function (secs) {
      if (!audio()) return;
      var t = ctx.currentTime;
      secs = secs || 1;
      tone("sawtooth", 150, 120, t, secs, 0.035, 0.06);
      tone("square", 300, 260, t, secs, 0.008, 0.06);
      for (var s = 0; s < secs - 0.05; s += 0.04) hiss(t + s, 0.03, 0.06, 2400 + Math.random() * 1200, 2);
      hiss(t + secs, 0.05, 0.25, 600, 1);
    },
    key: function () {
      if (!audio()) return;
      hiss(ctx.currentTime, 0.02, 0.08, 2600 + Math.random() * 1400, 2.5);
    },
    beep: function () {
      if (!audio()) return;
      tone("square", 440, 440, ctx.currentTime, 0.16, 0.05, 0.003);
    },
    // a dead power supply: a crackle and nothing else
    fizz: function () {
      if (!audio()) return;
      var t = ctx.currentTime;
      for (var i = 0; i < 9; i++) hiss(t + Math.random() * 0.5, 0.02 + Math.random() * 0.04, 0.25, 1200 + Math.random() * 3000, 1.2);
    },
    // A Hayes modem dialling a name: tones for its letters, a ring, the answer tone,
    // and the handshake screech. busy: the line is engaged instead. Seconds it takes.
    dial: function (name, busy) {
      if (!audio()) return 0;
      var t = ctx.currentTime + 0.1;
      var rows = [697, 770, 852, 941];
      var cols = [1209, 1336, 1477];
      // the letters on a phone's keys, from 2 to 9
      var pad = ["abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"];
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .split("")
        .forEach(function (ch) {
          var d = /\d/.test(ch)
            ? +ch
            : pad.findIndex(function (k) {
                return k.indexOf(ch) >= 0;
              }) + 2;
          var at = d === 0 ? [3, 1] : [Math.floor((d - 1) / 3), (d - 1) % 3];
          tone("sine", rows[at[0]], rows[at[0]], t, 0.09, 0.05, 0.004);
          tone("sine", cols[at[1]], cols[at[1]], t, 0.09, 0.05, 0.004);
          t += 0.14;
        });
      t += 0.3;
      if (busy) {
        for (var b = 0; b < 3; b++) {
          tone("sine", 480, 480, t, 0.4, 0.04, 0.01);
          tone("sine", 620, 620, t, 0.4, 0.04, 0.01);
          t += 0.8;
        }
        return t - ctx.currentTime;
      }
      tone("sine", 440, 440, t, 0.9, 0.035, 0.02);
      tone("sine", 480, 480, t, 0.9, 0.035, 0.02);
      t += 1.3;
      tone("sine", 2100, 2100, t, 0.8, 0.04, 0.01);
      t += 0.9;
      for (var i = 0; i < 6; i++) {
        hiss(t, 0.22, 0.12, 1000 + Math.random() * 2200, 0.8);
        tone("sawtooth", 1200 + i * 150, 2400 - i * 120, t, 0.2, 0.025, 0.01);
        t += 0.24;
      }
      return t - ctx.currentTime;
    },
    // a television between channels
    snow: function (secs) {
      if (!audio()) return;
      hiss(ctx.currentTime, secs || 0.7, 0.16, 3000, 0.3);
    },
    // a few square-wave notes, as a sound card of the day played them: [Hz, beats]
    tune: function (notes, bpm) {
      if (!audio()) return;
      var t = ctx.currentTime + 0.05;
      var beat = 60 / (bpm || 132);
      notes.forEach(function (n) {
        if (n[0]) tone("square", n[0], n[0], t, n[1] * beat * 0.95, 0.035, 0.01);
        t += n[1] * beat;
      });
    },
    // A song as a sound card of the day played it, looping until stopped:
    // { len: seconds, notes: [[start, length, key, velocity, channel, program]] }.
    // Each family of instrument gets one chip voice.
    song: function (s) {
      if (!audio() || !s || !s.notes || !s.notes.length) return;
      CRT.stopSong();
      var bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(out);
      var start = ctx.currentTime + 0.15;
      var length = Math.max(s.len, 1); // never zero, or the loop below would not end
      var i = 0;
      function voice(n, at) {
        var key = n[2];
        var p = n[5];
        var v = (n[3] / 127) * 0.05;
        var len = Math.max(0.05, n[1]);
        var g = ctx.createGain();
        g.connect(bus);
        if (n[4] === 9) {
          // the drum channel: a short burst of noise, lower for the low keys
          var src = ctx.createBufferSource();
          src.buffer = noise;
          var f = ctx.createBiquadFilter();
          f.type = "bandpass";
          f.frequency.value = key < 40 ? 180 : key < 50 ? 900 : 5000;
          src.connect(f);
          f.connect(g);
          g.gain.setValueAtTime(v * 2, at);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
          src.start(at, Math.random());
          src.stop(at + 0.15);
          return;
        }
        var o = ctx.createOscillator();
        o.frequency.value = 440 * Math.pow(2, (key - 69) / 12);
        var plucked = p < 8 || (p >= 24 && p < 32) || (p >= 45 && p < 47) || (p >= 8 && p < 16);
        o.type = p >= 64 && p < 80 ? "square" : p >= 8 && p < 16 ? "sine" : "triangle";
        if (o.type === "square") v *= 0.45;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(v, at + (plucked ? 0.005 : 0.03));
        if (plucked) g.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(len, 1.2) + 0.2);
        else {
          g.gain.setValueAtTime(v, at + len);
          g.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.12);
        }
        o.connect(g);
        o.start(at);
        o.stop(at + len + 0.3);
      }
      var timer = setInterval(function () {
        var horizon = ctx.currentTime + 0.6;
        for (;;) {
          if (i >= s.notes.length) {
            i = 0;
            start += length;
          }
          var at = start + s.notes[i][0];
          if (at > horizon) break;
          if (at >= ctx.currentTime) voice(s.notes[i], at);
          i++;
        }
      }, 200);
      playing = { bus: bus, timer: timer };
    },
    stopSong: function () {
      if (!playing) return;
      clearInterval(playing.timer);
      playing.bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      var bus = playing.bus;
      setTimeout(function () {
        bus.disconnect();
      }, 500);
      playing = null;
    },
    muted: function () {
      return muted;
    },
    mute: function (yes) {
      muted = !!yes;
      try {
        localStorage.setItem("pc:mute", muted ? "1" : "0");
      } catch (e) {}
      if (out) out.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
    },
  };
  window.CRT = CRT;
})();
