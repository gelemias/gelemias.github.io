/* ==========================================================================
   GUILLERMO RD — "TELEMETRY"  ·  interactions
   Vanilla JS, no dependencies. Degrades gracefully; respects reduced motion.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* --- theme toggle (light / dark) ----------------------------------------- */
  var THEME_KEY = "grd-theme";
  var root = document.documentElement;
  var themeMedia = window.matchMedia("(prefers-color-scheme: light)");
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  var effectiveTheme = function () {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced;
    return themeMedia.matches ? "light" : "dark";
  };
  var syncMeta = function () {
    if (themeMeta) themeMeta.setAttribute("content", effectiveTheme() === "light" ? "#f0f0ec" : "#08080a");
  };
  syncMeta();

  var toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = effectiveTheme() === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      root.setAttribute("data-theme", next);
      syncMeta();
    });
  }
  // follow the system when the user hasn't picked a theme
  themeMedia.addEventListener("change", function () {
    var stored;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) { stored = null; }
    if (!stored) syncMeta();
  });

  /* --- current year -------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --- local clock (Łódź / Europe-Warsaw) ---------------------------------- */
  var clockEl = document.getElementById("clock");
  if (clockEl) {
    var fmt;
    try {
      fmt = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Warsaw",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      });
    } catch (e) { fmt = null; }
    var tick = function () {
      var t = fmt ? fmt.format(new Date())
                  : new Date().toTimeString().slice(0, 8);
      clockEl.textContent = t + " CET";
    };
    tick();
    setInterval(tick, 1000);
  }

  /* --- typewriter role ----------------------------------------------------- */
  var typeEl = document.getElementById("type");
  if (typeEl) {
    var roles = [
      "Architecting government-grade digital identity.",
      "Building high-quality, secure mobile software.",
      "Crafting custom UI, the right way.",
      "iOS Engineer. Runner. F1 at heart."
    ];
    if (reduceMotion) {
      typeEl.textContent = roles[0];
    } else {
      var ri = 0, ci = 0, deleting = false;
      var run = function () {
        var word = roles[ri];
        typeEl.textContent = word.slice(0, ci);
        if (!deleting) {
          if (ci < word.length) { ci++; setTimeout(run, 42); }
          else { deleting = true; setTimeout(run, 2200); }
        } else {
          if (ci > 0) { ci--; setTimeout(run, 22); }
          else { deleting = false; ri = (ri + 1) % roles.length; setTimeout(run, 380); }
        }
      };
      run();
    }
  }

  /* --- scroll progress bar + nav glass -------------------------------------- */
  var progress = document.getElementById("progress");
  var navEl = document.querySelector(".nav");
  var onScroll = function () {
    var h = document.documentElement;
    if (progress) {
      var max = h.scrollHeight - h.clientHeight;
      progress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
    }
    if (navEl) navEl.classList.toggle("is-scrolled", h.scrollTop > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* --- reveal on scroll ----------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* --- count-up stats ------------------------------------------------------- */
  var counters = document.querySelectorAll("[data-count]");
  var animateCount = function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var start = null, dur = 1400;
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!("IntersectionObserver" in window)) {
    counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  } else {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animateCount(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* --- scroll-spy nav ------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --- project filter ------------------------------------------------------- */
  var filters = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll("#grid .card");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      filters.forEach(function (b) { b.classList.toggle("active", b === btn); });
      var shown = 0;
      cards.forEach(function (card) {
        var cats = card.getAttribute("data-cat") || "";
        var show = f === "all" || cats.split(" ").indexOf(f) !== -1;
        card.classList.toggle("hide", !show);
        card.classList.remove("refilter");
        if (show && !reduceMotion) {
          card.style.setProperty("--i", String(shown++));
          void card.offsetWidth;              // restart the entry animation
          card.classList.add("refilter");
        }
      });
    });
  });

  /* --- liquid metal + glass tilt --------------------------------------------
     One delegated pointer listener writes --mx/--my (sheen origin) on whatever
     control is under the cursor, and --rx/--ry (tilt) on project cards. The
     CSS interpolates --mx/--my, so the highlight trails the pointer.         */
  var TRACK = ".btn, .filter, .chip, .theme-toggle, .card";
  var TILT = "#grid .card, .cols .card";
  var MAX_TILT = 4.5;                          // degrees — restraint is the point

  if (finePointer && window.PointerEvent) {
    var tracked = null;
    var latest = null;
    var queued = false;

    var release = function (el) {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
    };

    var apply = function () {
      queued = false;
      if (!tracked || !latest) return;
      var r = tracked.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var x = (latest.clientX - r.left) / r.width;
      var y = (latest.clientY - r.top) / r.height;
      tracked.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
      tracked.style.setProperty("--my", (y * 100).toFixed(2) + "%");
      if (!reduceMotion && tracked.matches(TILT)) {
        tracked.style.setProperty("--rx", ((0.5 - y) * MAX_TILT).toFixed(2) + "deg");
        tracked.style.setProperty("--ry", ((x - 0.5) * MAX_TILT).toFixed(2) + "deg");
      }
    };

    document.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      var el = ev.target && ev.target.closest ? ev.target.closest(TRACK) : null;
      if (el !== tracked) {
        if (tracked) release(tracked);
        tracked = el;
      }
      if (!el) return;
      latest = ev;
      if (!queued) { queued = true; requestAnimationFrame(apply); }
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      if (tracked) { release(tracked); tracked = null; }
    });
  }

  /* --- hero glows drift with the pointer ------------------------------------ */
  var glows = document.querySelectorAll(".hero-glow");
  if (glows.length && finePointer && !reduceMotion) {
    var heroEl = document.querySelector(".hero");
    var heroVisible = true;
    if ("IntersectionObserver" in window && heroEl) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
      }, { threshold: 0 }).observe(heroEl);
    }
    var glowQueued = false, glowEv = null;
    var moveGlows = function () {
      glowQueued = false;
      if (!glowEv || !heroVisible) return;
      var dx = (glowEv.clientX / window.innerWidth) - 0.5;
      var dy = (glowEv.clientY / window.innerHeight) - 0.5;
      glows.forEach(function (g, i) {
        var k = i === 0 ? 34 : -26;
        g.style.setProperty("--px", (dx * k).toFixed(1) + "px");
        g.style.setProperty("--py", (dy * k).toFixed(1) + "px");
      });
    };
    window.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      glowEv = ev;
      if (!glowQueued) { glowQueued = true; requestAnimationFrame(moveGlows); }
    }, { passive: true });
  }

})();
