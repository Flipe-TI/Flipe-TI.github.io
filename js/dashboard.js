/* ============================================================
   Dashboard da carreira — slicers + bar animation
   "live BI report" interactivity. No dependencies.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    animateBars();
    wireSlicers();
  }

  /* Animate proficiency bars from 0 → data-val when scrolled into view.
     Fail-safe: the bars ALWAYS end at their correct width, even if the
     IntersectionObserver never fires (0-height viewport, race, etc.). */
  function animateBars() {
    var host = document.getElementById("profBars");
    if (!host) return;
    var fills = Array.prototype.slice.call(host.querySelectorAll(".bar-fill"));
    if (!fills.length) return;

    var setTarget = function () {
      fills.forEach(function (f) {
        f.style.width = (f.getAttribute("data-val") || 0) + "%";
      });
    };

    // No animation path: guarantee correct final state and stop.
    if (reduce || !("IntersectionObserver" in window)) { setTarget(); return; }

    // Collapse, then grow when the panel becomes visible.
    fills.forEach(function (f) { f.style.width = "0%"; });

    var grown = false;
    var grow = function () { if (grown) return; grown = true; setTarget(); };

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { grow(); obs.disconnect(); }
      });
    }, { threshold: 0.15 });
    io.observe(host);

    // Safety net: never leave the bars empty if the observer stays silent.
    setTimeout(grow, 1600);
  }

  /* Slicers: multi-select OR filter over roles (like a Power BI slicer). */
  function wireSlicers() {
    var group = document.getElementById("slicers");
    if (!group) return;

    var slicers = Array.prototype.slice.call(group.querySelectorAll(".slicer"));
    var items = Array.prototype.slice.call(document.querySelectorAll("#tlList .tl-item"));
    var bars = Array.prototype.slice.call(document.querySelectorAll("#tlRows .tl-bar"));
    var barRows = Array.prototype.slice.call(document.querySelectorAll("#profBars .bar-row"));
    var matchOut = document.getElementById("dashMatch");
    var total = items.length;

    function techSet(el) {
      return (el.getAttribute("data-tech") || "")
        .split(",")
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
    }

    function apply() {
      var active = slicers
        .filter(function (b) { return b.getAttribute("aria-pressed") === "true"; })
        .map(function (b) { return b.getAttribute("data-tech"); });

      var hasFilter = active.length > 0;
      var matches = 0;

      function roleMatches(el) {
        if (!hasFilter) return true;
        var techs = techSet(el);
        return active.some(function (t) { return techs.indexOf(t) !== -1; });
      }

      items.forEach(function (el) {
        var ok = roleMatches(el);
        el.classList.toggle("dim", !ok);
        if (ok) matches++;
      });
      bars.forEach(function (el) {
        el.classList.toggle("dim", !roleMatches(el));
      });
      // dim proficiency bars not in the active selection
      barRows.forEach(function (row) {
        if (!hasFilter) { row.classList.remove("dim"); return; }
        var name = (row.querySelector(".bar-name") || {}).textContent || "";
        row.classList.toggle("dim", active.indexOf(name.trim()) === -1);
      });

      if (matchOut) matchOut.textContent = String(matches);
    }

    slicers.forEach(function (b) {
      b.addEventListener("click", function () {
        var pressed = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", pressed ? "false" : "true");
        apply();
      });
    });
  }
})();
