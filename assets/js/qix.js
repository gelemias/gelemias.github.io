/* ==========================================================================
   GUILLERMO RD — "QIX"  ·  play-to-reveal shell
   Vanilla JS, no dependencies.

   Every section of the portfolio starts behind a dark metal plate. You steer
   a marker along the edge of what you have already claimed, push out into the
   field to draw, and close the line back onto a claimed edge — everything the
   Qix can no longer reach is cut away, and the content underneath shows
   through. Claim enough of a sector and the rest of the plate dissolves and
   the next one unlocks.

   The page underneath is the ordinary portfolio the whole time: the markup is
   untouched, the text is in the DOM for search engines and screen readers,
   and READ drops the plates for good. With JS off, none of this runs.
   ========================================================================== */
(function () {
  "use strict";

  /* --- tuning -------------------------------------------------------------- */
  var SPEED_CELLS = 38;          // marker cells per second
  var QIX_SPEED   = 165;         // px per second
  var QIX_TAIL    = 16;          // points kept for the Qix polyline
  var FREE = 0, CLAIMED = 1, TRAIL = 2;
  var STORE_KEY = "grd-play";

  /* One plate per page. `windows` are pre-cut so you can always read what it
     is you are opening, and `num` follows the page's own tag rather than its
     position, so the HUD and the page agree. Targets are a share of the field
     LEFT after those windows — nine short rounds rather than six long ones. */
  var LEVELS = [
    { id: "intro",   num: "00", name: "Hello",   cut: 0.32, windows: [".intro-name", ".intro-kicker"] },
    { id: "profile", num: "01", name: "Profile", cut: 0.42, windows: [".page-head"] },
    { id: "path-a",  num: "02", name: "Path",    cut: 0.42, windows: [".page-head"] },
    { id: "path-b",  num: "02", name: "Path",    cut: 0.38, windows: [".page-cont"] },
    { id: "work-a",  num: "03", name: "Work",    cut: 0.42, windows: [".page-head"] },
    { id: "work-b",  num: "03", name: "Work",    cut: 0.38, windows: [".page-cont"] },
    { id: "work-c",  num: "03", name: "Work",    cut: 0.38, windows: [".page-cont"] },
    { id: "toolkit", num: "04", name: "Toolkit", cut: 0.40, windows: [".page-head"] },
    { id: "contact", num: "05", name: "Contact", cut: 0.34, windows: [".page-tag"] }
  ];

  var main = document.querySelector("main");
  if (!main || !window.requestAnimationFrame) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- persistence --------------------------------------------------------- */
  function readStore() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (v && typeof v === "object") {
        return {
          mode: v.mode === "read" ? "read" : "play",
          cleared: Object.prototype.toString.call(v.cleared) === "[object Array]" ? v.cleared : []
        };
      }
    } catch (e) {}
    return { mode: "play", cleared: [] };
  }
  function writeStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  var state = readStore();
  if (reduceMotion) state.mode = "read";

  /* --- palette ------------------------------------------------------------- */
  var palette = {};
  function readPalette() {
    var cs = getComputedStyle(document.body);
    var pick = function (n, fb) { return (cs.getPropertyValue(n) || "").trim() || fb; };
    palette.tone   = pick("--tone", "#7f9478");
    palette.signal = pick("--signal", "#b0705a");
    palette.tone2  = pick("--tone-2", "#6d8695");
    /* The plate is a sheet of the same stock as the page, one shade further
       from it: on paper a little darker, in the dark theme a little lighter.
       Both stay quiet — the cut reads as depth and as type arriving, not as
       contrast. */
    var bg = pick("--ink", "#f2f0eb"), ink = pick("--text", "#2a2825");
    // lifting a dark page reads much stronger than darkening a pale one, so
    // the dark theme needs a smaller step to feel like the same sheet
    var k = lum(bg) > 0.5 ? 1 : 0.62;
    palette.plateLo = mix(bg, ink, 0.17 * k);
    palette.plateHi = mix(bg, ink, 0.10 * k);
  }

  function rgbOf(c) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(c).trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }
  function lum(c) {
    var x = rgbOf(c);
    return x ? (x[0] * 0.299 + x[1] * 0.587 + x[2] * 0.114) / 255 : 0;
  }
  function mix(a, b, t) {
    var x = rgbOf(a), y = rgbOf(b);
    if (!x || !y) return a;
    var c = function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); };
    return "rgb(" + c(0) + "," + c(1) + "," + c(2) + ")";
  }

  /* ==========================================================================
     ONE SECTOR
     ========================================================================== */
  function Sector(index, def, el, onClear) {
    this.index = index;
    this.def = def;
    this.el = el;
    this.onClear = onClear;
    this.cell = 10;
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
    this.claimed = 0;
    this.total = 1;
    this.trail = [];
    this.dir = { x: 0, y: 0 };
    this.want = { x: 0, y: 0 };
    this.step = 0;
    this.flashes = [];
    this.shake = 0;
    this.done = false;
    this.started = false;
    this.speed = SPEED_CELLS;
  }

  Sector.prototype.mount = function () {
    var self = this;
    this.el.classList.add("qx-level", "qx-locked");

    var wrap = document.createElement("div");
    wrap.className = "qx-wrap";
    wrap.setAttribute("aria-hidden", "true");

    this.plate = document.createElement("canvas");
    this.plate.className = "qx-plate";
    this.fx = document.createElement("canvas");
    this.fx.className = "qx-fx";
    wrap.appendChild(this.plate);
    wrap.appendChild(this.fx);

    var hud = document.createElement("div");
    hud.className = "qx-hud";
    hud.innerHTML =
      '<span class="qx-name"><span class="num">' + esc(this.def.num) + '</span>' +
      esc(this.def.name) + '</span>' +
      '<span class="qx-bar"><i></i><b></b></span>' +
      '<span class="qx-pct">0%</span>' +
      '<span class="qx-keys">Arrows / drag</span>';
    wrap.appendChild(hud);
    this.bar = hud.querySelector(".qx-bar i");
    this.mark = hud.querySelector(".qx-bar b");
    this.pct = hud.querySelector(".qx-pct");

    if (this.index === 1 && !state.cleared.length) {
      this.hint = document.createElement("div");
      this.hint.className = "qx-hint";
      this.hint.innerHTML =
        "<span>Cut it open</span>" +
        '<span class="sub">Arrows or drag. Run along the edge, push into the ' +
        "sheet to draw, close the line back on the edge. Whatever the drifter " +
        "can no longer reach falls away — and the page scrolls on.</span>";
      wrap.appendChild(this.hint);
    }

    this.wrap = wrap;
    this.el.appendChild(wrap);

    this.build();

    wrap.addEventListener("pointerdown", function (e) { self.onPointer(e, true); });
    wrap.addEventListener("pointermove", function (e) { self.onPointer(e, false); });
    wrap.addEventListener("pointerup", function () { self.pointing = false; });
    wrap.addEventListener("pointercancel", function () { self.pointing = false; });
    wrap.addEventListener("pointerleave", function () { self.pointing = false; });
  };

  /* Size the playfield to one screenful and lay out the grid. Called on mount
     and on resize; an existing board is resampled so progress survives. */
  Sector.prototype.build = function () {
    var prev = this.grid ? { g: this.grid, c: this.cols, r: this.rows } : null;

    // the field is exactly the screen below the nav, so the whole playfield —
    // HUD included — is on screen once the sector is snapped into place
    var nav = document.querySelector(".nav");
    var h = Math.max(320, window.innerHeight - (nav ? nav.offsetHeight : 0));
    this.el.style.height = h + "px";
    var w = this.el.clientWidth;

    this.cell = w < 620 ? 8 : 10;
    var strip = 46;                                 // the HUD lives under the field
    this.cols = Math.max(12, Math.floor(w / this.cell));
    this.rows = Math.max(12, Math.floor((h - strip) / this.cell));
    this.ox = (w - this.cols * this.cell) / 2;      // centre the grid in the box
    this.oy = 0;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    [this.plate, this.fx].forEach(function (c) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    });
    this.dpr = dpr;
    this.w = w;
    this.h = h;

    var n = this.cols * this.rows;
    this.grid = new Uint8Array(n);
    this.frame = new Uint8Array(n);
    var x, y;
    for (x = 0; x < this.cols; x++) { this.set(x, 0, CLAIMED); this.set(x, this.rows - 1, CLAIMED); }
    for (y = 0; y < this.rows; y++) { this.set(0, y, CLAIMED); this.set(this.cols - 1, y, CLAIMED); }
    var ring = 0;
    for (var i = 0; i < n; i++) if (this.grid[i] === CLAIMED) { this.frame[i] = 1; ring++; }
    this.total = n - ring;

    if (prev) {
      // resample the old board so a resize does not wipe the sector
      for (y = 0; y < this.rows; y++) {
        for (x = 0; x < this.cols; x++) {
          var sx = Math.min(prev.c - 1, Math.floor(x * prev.c / this.cols));
          var sy = Math.min(prev.r - 1, Math.floor(y * prev.r / this.rows));
          if (prev.g[sy * prev.c + sx] === CLAIMED) this.set(x, y, CLAIMED);
        }
      }
    } else {
      this.cutWindows();
    }

    this.claimed = 0;
    for (var j = 0; j < n; j++) {
      if (this.grid[j] === TRAIL) this.grid[j] = FREE;
      if (this.grid[j] === CLAIMED && !this.frame[j]) this.claimed++;
    }

    /* The border and the pre-cut headings are a free head start, so the goal
       is a share of what is actually left to take. Fixed on the first build so
       a resize cannot move the finish line. */
    if (this.goal === undefined) {
      var start = this.claimed / this.total;
      this.start = start;
      this.goal = start + (1 - start) * this.def.cut;
    }

    this.trail = [];
    this.drawing = false;
    this.px = this.cols >> 1;                       // marker starts bottom-centre
    this.py = this.rows - 1;
    this.dir = { x: 0, y: 0 };
    this.want = { x: 0, y: 0 };

    this.spawnQix();
    this.paintPlate();
    this.report();
  };

  /* Pre-cut the section's own heading so you can read what you are opening. */
  Sector.prototype.cutWindows = function () {
    var self = this;
    var box = this.el.getBoundingClientRect();
    (this.def.windows || []).forEach(function (sel) {
      var node = self.el.querySelector(sel);
      if (!node) return;
      var r = node.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var pad = 22;
      var x0 = Math.floor((r.left - box.left - pad - self.ox) / self.cell);
      var y0 = Math.floor((r.top - box.top - pad - self.oy) / self.cell);
      var x1 = Math.ceil((r.right - box.left + pad - self.ox) / self.cell);
      var y1 = Math.ceil((r.bottom - box.top + pad - self.oy) / self.cell);
      for (var y = y0; y <= y1; y++) {
        for (var x = x0; x <= x1; x++) self.set(x, y, CLAIMED);
      }
    });
  };

  Sector.prototype.spawnQix = function () {
    // drop the Qix on a free cell as near the middle as we can find one
    var cx = this.cols >> 1, cy = this.rows >> 1;
    var best = null;
    for (var ring = 0; ring < Math.max(this.cols, this.rows) && !best; ring++) {
      for (var dy = -ring; dy <= ring && !best; dy++) {
        for (var dx = -ring; dx <= ring && !best; dx++) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          var x = cx + dx, y = cy + dy;
          if (this.at(x, y) === FREE) best = { x: x, y: y };
        }
      }
    }
    if (!best) best = { x: cx, y: cy };
    var a = Math.random() * Math.PI * 2;
    this.qix = {
      x: (best.x + 0.5) * this.cell,
      y: (best.y + 0.5) * this.cell,
      vx: Math.cos(a) * QIX_SPEED,
      vy: Math.sin(a) * QIX_SPEED,
      tail: [],
      turn: 0
    };
  };

  /* --- grid helpers -------------------------------------------------------- */
  Sector.prototype.at = function (x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return CLAIMED;
    return this.grid[y * this.cols + x];
  };
  Sector.prototype.set = function (x, y, v) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    this.grid[y * this.cols + x] = v;
  };

  /* --- input --------------------------------------------------------------- */
  Sector.prototype.onPointer = function (e, down) {
    if (this.done) return;
    if (down) { this.pointing = true; this.wrap.setPointerCapture && this.wrap.setPointerCapture(e.pointerId); }
    if (!this.pointing) return;
    var r = this.wrap.getBoundingClientRect();
    var tx = (e.clientX - r.left - this.ox) / this.cell;
    var ty = (e.clientY - r.top - this.oy) / this.cell;
    var dx = tx - (this.px + 0.5);
    var dy = ty - (this.py + 0.5);
    if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) return;
    if (Math.abs(dx) > Math.abs(dy)) this.aim(dx > 0 ? 1 : -1, 0);
    else this.aim(0, dy > 0 ? 1 : -1);
  };
  Sector.prototype.aim = function (x, y) {
    this.want.x = x;
    this.want.y = y;
    this.begin();
  };
  Sector.prototype.begin = function () {
    if (this.started) return;
    this.started = true;
    if (this.hint) this.hint.classList.add("qx-out");
  };

  /* --- simulation ---------------------------------------------------------- */
  Sector.prototype.tick = function (dt) {
    if (this.done) return;

    this.step += dt * this.speed;
    var guard = 0;
    while (this.step >= 1 && guard++ < 16) {
      this.step -= 1;
      this.move();
    }

    this.moveQix(dt);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 4);
    for (var i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].t -= dt;
      if (this.flashes[i].t <= 0) this.flashes.splice(i, 1);
    }
  };

  Sector.prototype.move = function () {
    var d = this.want;
    if (!d.x && !d.y) return;

    var nx = this.px + d.x, ny = this.py + d.y;
    var s = this.at(nx, ny);

    if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) return;

    if (!this.drawing) {
      if (s === CLAIMED) { this.px = nx; this.py = ny; return; }
      if (s === FREE) {                       // push off the edge and start a line
        this.drawing = true;
        this.anchor = { x: this.px, y: this.py };
        this.trail = [];
        this.px = nx; this.py = ny;
        this.set(nx, ny, TRAIL);
        this.trail.push({ x: nx, y: ny });
      }
      return;
    }

    if (s === TRAIL) return;                  // no cutting across your own line
    if (s === FREE) {
      this.px = nx; this.py = ny;
      this.set(nx, ny, TRAIL);
      this.trail.push({ x: nx, y: ny });
      return;
    }
    // landed back on claimed ground — close it up
    this.px = nx; this.py = ny;
    this.close();
  };

  /* Everything the Qix can no longer reach becomes yours. */
  Sector.prototype.close = function () {
    var i, n = this.cols * this.rows;
    for (i = 0; i < this.trail.length; i++) {
      this.set(this.trail[i].x, this.trail[i].y, CLAIMED);
    }
    this.trail = [];
    this.drawing = false;
    this.want.x = 0; this.want.y = 0;

    var seed = this.qixCell();
    var reach = new Uint8Array(n);
    if (seed) {
      var qx = seed.x, qy = seed.y;
      var queue = new Int32Array(n);
      var head = 0, tail = 0;
      queue[tail++] = qy * this.cols + qx;
      reach[qy * this.cols + qx] = 1;
      while (head < tail) {
        var idx = queue[head++];
        var x = idx % this.cols, y = (idx / this.cols) | 0;
        if (x > 0 && !reach[idx - 1] && this.grid[idx - 1] === FREE) { reach[idx - 1] = 1; queue[tail++] = idx - 1; }
        if (x < this.cols - 1 && !reach[idx + 1] && this.grid[idx + 1] === FREE) { reach[idx + 1] = 1; queue[tail++] = idx + 1; }
        if (y > 0 && !reach[idx - this.cols] && this.grid[idx - this.cols] === FREE) { reach[idx - this.cols] = 1; queue[tail++] = idx - this.cols; }
        if (y < this.rows - 1 && !reach[idx + this.cols] && this.grid[idx + this.cols] === FREE) { reach[idx + this.cols] = 1; queue[tail++] = idx + this.cols; }
      }
    }

    var won = [];
    if (seed) {                               // no seed means no safe fill
      for (i = 0; i < n; i++) {
        if (this.grid[i] === FREE && !reach[i]) { this.grid[i] = CLAIMED; won.push(i); }
      }
    }

    this.claimed = 0;
    for (i = 0; i < n; i++) if (this.grid[i] === CLAIMED && !this.frame[i]) this.claimed++;

    this.paintPlate();
    if (won.length) this.flashes.push({ cells: won, t: 0.45, life: 0.45 });
    this.report();

    if (this.claimed / this.total >= this.goal) this.clear();
  };

  /* Rounding can land the Qix exactly on a boundary cell. Without a free seed
     the fill would treat the whole field as unreachable and hand over the
     entire sector, so look for a free cell next to it before giving up. */
  Sector.prototype.qixCell = function () {
    var qx = Math.floor(this.qix.x / this.cell);
    var qy = Math.floor(this.qix.y / this.cell);
    if (this.at(qx, qy) === FREE) return { x: qx, y: qy };
    for (var r = 1; r <= 3; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (this.at(qx + dx, qy + dy) === FREE) return { x: qx + dx, y: qy + dy };
        }
      }
    }
    return null;
  };

  /* Touched by the Qix: you lose the line you were drawing, nothing else. */
  Sector.prototype.cut = function () {
    for (var i = 0; i < this.trail.length; i++) {
      this.set(this.trail[i].x, this.trail[i].y, FREE);
    }
    this.trail = [];
    this.drawing = false;
    this.want.x = 0; this.want.y = 0;
    if (this.anchor) { this.px = this.anchor.x; this.py = this.anchor.y; }
    this.shake = 1;
    this.wrap.classList.add("qx-hit");
    var self = this;
    setTimeout(function () { self.wrap.classList.remove("qx-hit"); }, 320);
  };

  Sector.prototype.moveQix = function (dt) {
    var q = this.qix;
    q.turn -= dt;
    if (q.turn <= 0) {                        // wander, the way a Qix does
      q.turn = 0.12 + Math.random() * 0.18;
      var a = Math.atan2(q.vy, q.vx) + (Math.random() - 0.5) * 1.5;
      q.vx = Math.cos(a) * QIX_SPEED;
      q.vy = Math.sin(a) * QIX_SPEED;
    }

    var steps = 3, sdt = dt / steps;
    for (var s = 0; s < steps; s++) {
      var nx = q.x + q.vx * sdt;
      var ny = q.y + q.vy * sdt;
      var cx = Math.floor(nx / this.cell), cy = Math.floor(q.y / this.cell);
      if (this.at(cx, cy) === CLAIMED) { q.vx = -q.vx; nx = q.x; }
      cx = Math.floor(q.x / this.cell); cy = Math.floor(ny / this.cell);
      if (this.at(cx, cy) === CLAIMED) { q.vy = -q.vy; ny = q.y; }
      q.x = nx; q.y = ny;

      var here = this.at(Math.floor(q.x / this.cell), Math.floor(q.y / this.cell));
      if (here === TRAIL) { this.cut(); break; }
    }

    q.tail.push({ x: q.x, y: q.y });
    while (q.tail.length > QIX_TAIL) q.tail.shift();
  };

  Sector.prototype.report = function () {
    var p = this.claimed / this.total;
    var run = Math.max(0.0001, this.goal - this.start);
    if (this.bar) {
      this.bar.style.width = Math.max(0, Math.min(100, ((p - this.start) / run) * 100)).toFixed(1) + "%";
    }
    if (this.pct) {
      this.pct.textContent = Math.round(p * 100) + "% / " + Math.round(this.goal * 100) + "%";
    }
  };

  /* --- the payoff ---------------------------------------------------------- */
  Sector.prototype.clear = function () {
    if (this.done) return;
    this.done = true;
    var self = this;

    // dissolve whatever plate is left, then hand the section back to the page
    var left = [];
    var cells = this.cols * this.rows;
    for (var i = 0; i < cells; i++) if (this.grid[i] !== CLAIMED || this.frame[i]) left.push(i);
    shuffle(left);

    var start = null, dur = 520;
    var burn = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var upto = Math.floor(p * left.length);
      var ctx = self.plate.getContext("2d");
      ctx.save();
      ctx.scale(self.dpr, self.dpr);
      for (var k = self.burnt || 0; k < upto; k++) {
        var idx = left[k];
        var x = idx % self.cols, y = (idx / self.cols) | 0;
        ctx.clearRect(self.ox + x * self.cell, self.oy + y * self.cell, self.cell, self.cell);
      }
      ctx.restore();
      self.burnt = upto;
      if (p < 1) requestAnimationFrame(burn);
      else {
        self.wrap.classList.add("qx-out");
        setTimeout(function () {
          if (self.wrap.parentNode) self.wrap.parentNode.removeChild(self.wrap);
          self.el.classList.remove("qx-locked");
          self.el.style.height = "";
          self.onClear(self);
        }, 560);
      }
    };
    requestAnimationFrame(burn);
  };

  /* --- painting ------------------------------------------------------------ */
  Sector.prototype.paintPlate = function () {
    var ctx = this.plate.getContext("2d");
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // milled steel: flat base, a soft vertical roll, brushed grain, one
    // diagonal sheen and a vignette to sit it into the page
    ctx.fillStyle = palette.plateLo;
    ctx.fillRect(0, 0, this.w, this.h);
    var g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, palette.plateHi);
    g.addColorStop(0.45, palette.plateLo);
    g.addColorStop(1, palette.plateHi);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (var bx = 0; bx < this.w; bx += 3) ctx.fillRect(bx, 0, 1, this.h);

    var sheen = ctx.createLinearGradient(0, this.h, this.w, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.18)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, this.w, this.h);

    // and cut out everything already claimed — full alpha, or destination-out
    // would only erase as much as the grain colour it inherited
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    for (var y = 0; y < this.rows; y++) {
      var run = -1;
      for (var x = 0; x <= this.cols; x++) {
        var gi = y * this.cols + x;
        var owned = x < this.cols && this.grid[gi] === CLAIMED && !this.frame[gi];
        if (owned && run < 0) run = x;
        if (!owned && run >= 0) {
          // half a pixel of overlap on every side: erasing twice costs nothing
          // and it stops seams appearing between runs on a 1x display
          ctx.fillRect(this.ox + run * this.cell - 0.5, this.oy + y * this.cell - 0.5,
                       (x - run) * this.cell + 1, this.cell + 1);
          run = -1;
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  };

  Sector.prototype.render = function () {
    var ctx = this.fx.getContext("2d");
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 6 * this.shake,
                    (Math.random() - 0.5) * 6 * this.shake);
    }
    ctx.translate(this.ox, this.oy);
    var c = this.cell;

    // claim flash
    for (var f = 0; f < this.flashes.length; f++) {
      var fl = this.flashes[f];
      ctx.globalAlpha = (fl.t / fl.life) * 0.5;
      ctx.fillStyle = palette.tone;
      for (var k = 0; k < fl.cells.length; k++) {
        var idx = fl.cells[k];
        ctx.fillRect((idx % this.cols) * c, ((idx / this.cols) | 0) * c, c, c);
      }
    }
    ctx.globalAlpha = 1;

    // the line you are drawing — traced twice, wide and faint under thin and
    // bright, which reads as a glow without paying for a blur every frame
    if (this.trail.length) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      if (this.anchor) ctx.moveTo((this.anchor.x + 0.5) * c, (this.anchor.y + 0.5) * c);
      for (var t = 0; t < this.trail.length; t++) {
        ctx.lineTo((this.trail[t].x + 0.5) * c, (this.trail[t].y + 0.5) * c);
      }
      ctx.strokeStyle = palette.tone;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = Math.max(6, c * 1.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(2, c * 0.34);
      ctx.stroke();
    }

    // the Qix
    var q = this.qix;
    if (q.tail.length > 1) {
      ctx.strokeStyle = palette.tone2;
      ctx.beginPath();
      for (var i = 0; i < q.tail.length; i++) {
        var p = q.tail[i];
        var j = (i % 2 ? 1 : -1) * (c * 0.7) * (i / q.tail.length);
        if (i === 0) ctx.moveTo(p.x + j, p.y - j);
        else ctx.lineTo(p.x + j, p.y - j);
      }
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // the marker
    var mc = this.drawing ? palette.tone : palette.signal;
    ctx.fillStyle = mc;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(this.px * c - c, this.py * c - c, c * 3, c * 3);
    ctx.globalAlpha = 1;
    ctx.fillRect(this.px * c - 1, this.py * c - 1, c + 2, c + 2);

    ctx.restore();
  };

  /* ==========================================================================
     SHELL — sectors in document order, unlocked one at a time
     ========================================================================== */
  var sectors = [];
  var blocks = [];
  var live = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
  }); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Map every child of <main> to the sector that gates it: a section is gated
     by itself, and anything between two sections rides along with the one
     above it. */
  function mapBlocks() {
    var gate = -1;
    var kids = Array.prototype.slice.call(main.children);
    kids.forEach(function (el) {
      var hit = -1;
      for (var i = 0; i < LEVELS.length; i++) if (el.id === LEVELS[i].id) hit = i;
      if (hit >= 0) gate = hit;
      blocks.push({ el: el, gate: gate, isLevel: hit >= 0 });
    });
  }

  function firstOpen() {
    for (var i = 0; i < LEVELS.length; i++) {
      if (state.cleared.indexOf(LEVELS[i].id) === -1) return i;
    }
    return LEVELS.length;
  }

  function applyVisibility() {
    var open = firstOpen();
    blocks.forEach(function (b) {
      var show = b.gate < open || (b.gate === open && b.isLevel);
      b.el.classList.toggle("qx-hidden", !show);
    });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      var id = (a.getAttribute("href") || "").slice(1);
      var idx = -1;
      for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) idx = i;
      a.classList.toggle("qx-lock", idx > open);
      a.classList.toggle("qx-done", idx > -1 && idx < open);
    });
  }

  function armNext() {
    var open = firstOpen();
    if (open >= LEVELS.length) { live = null; return; }
    var def = LEVELS[open];
    var el = document.getElementById(def.id);
    if (!el) return;
    if (el.__qx) { live = el.__qx; return; }
    var s = new Sector(open + 1, def, el, onSectorClear);
    el.__qx = s;
    sectors.push(s);
    s.mount();
    live = s;
    if (open > 0) snapTo(el);
  }

  /* Bring a sector to rest just under the nav, so the playfield lines up with
     the screen. */
  function snapTo(el) {
    var nav = document.querySelector(".nav");
    var y = window.pageYOffset + el.getBoundingClientRect().top - (nav ? nav.offsetHeight : 0);
    try { window.scrollTo({ top: y, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, y); }
  }

  function onSectorClear(s) {
    if (state.cleared.indexOf(s.def.id) === -1) state.cleared.push(s.def.id);
    writeStore();
    applyVisibility();
    armNext();
  }

  /* --- loop ---------------------------------------------------------------- */
  var last = 0;
  function frame(ts) {
    // generous clamp: a 10fps device should still move the marker 30 cells a
    // second, it should just do it in fewer, longer steps
    var dt = last ? Math.min((ts - last) / 1000, 0.1) : 0.016;
    last = ts;
    if (live && !live.done && onScreen(live.el)) {
      live.tick(dt);
      live.render();
    }
    requestAnimationFrame(frame);
  }
  function onScreen(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 40 && r.top < window.innerHeight - 40;
  }

  /* --- keyboard ------------------------------------------------------------ */
  var KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0]
  };
  function onKey(e) {
    if (!live || live.done) return;
    var k = KEYS[e.key];
    if (!k) return;
    if (!onScreen(live.el)) return;
    e.preventDefault();
    live.aim(k[0], k[1]);
  }

  /* --- mode switch --------------------------------------------------------- */
  function toRead() {
    state.mode = "read";
    writeStore();
    document.body.setAttribute("data-play", "off");
    sectors.forEach(function (s) {
      s.done = true;
      if (s.wrap && s.wrap.parentNode) s.wrap.parentNode.removeChild(s.wrap);
      s.el.classList.remove("qx-locked");
      s.el.style.height = "";
    });
    blocks.forEach(function (b) { b.el.classList.remove("qx-hidden"); });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.classList.remove("qx-lock", "qx-done");
    });
    live = null;
    syncButton();
  }
  function toPlay() {
    state.mode = "play";
    state.cleared = [];
    writeStore();
    sectors.forEach(function (s) { delete s.el.__qx; });
    sectors = [];
    document.body.setAttribute("data-play", "on");
    applyVisibility();
    armNext();
    syncButton();
    var first = document.getElementById(LEVELS[0].id);
    if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var button;
  function syncButton() {
    if (!button) return;
    var playing = state.mode === "play";
    button.textContent = playing ? "Read" : "Play";
    button.setAttribute("aria-label", playing
      ? "Drop the plates and read the portfolio as a plain page"
      : "Play through the portfolio");
  }
  function buildButton() {
    var host = document.querySelector(".nav-status");
    if (!host) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "qx-mode";
    host.insertBefore(button, host.firstChild);
    button.addEventListener("click", function () {
      if (state.mode === "play") toRead(); else toPlay();
    });
    syncButton();
  }

  /* --- boot ---------------------------------------------------------------- */
  readPalette();
  mapBlocks();
  buildButton();

  if (state.mode === "play") {
    document.body.setAttribute("data-play", "on");
    applyVisibility();
    armNext();
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(frame);
  } else {
    document.body.setAttribute("data-play", "off");
  }

  /* repaint the plates when the theme flips under them */
  new MutationObserver(function () {
    readPalette();
    sectors.forEach(function (s) { if (!s.done) s.paintPlate(); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      sectors.forEach(function (s) { if (!s.done) s.build(); });
    }, 220);
  });

})();
