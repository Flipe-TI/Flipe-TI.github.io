/* ============================================================
   Core — vanilla, sem jQuery/Bootstrap
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Mobile nav ---- */
  const toggler = document.getElementById("navToggler");
  const sidenav = document.getElementById("sidenav");
  if (toggler && sidenav) {
    const setOpen = (open) => {
      sidenav.classList.toggle("open", open);
      document.body.classList.toggle("nav-open", open);
      toggler.setAttribute("aria-expanded", String(open));
      toggler.innerHTML = open ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    };
    toggler.addEventListener("click", () => setOpen(!sidenav.classList.contains("open")));
    sidenav.querySelectorAll("a[href^='#']").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );
  }

  /* ---- Scrollspy (IntersectionObserver) ---- */
  const navLinks = Array.from(document.querySelectorAll("#navList a"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = "#" + e.target.id;
            navLinks.forEach((a) =>
              a.classList.toggle("active", a.getAttribute("href") === id)
            );
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---- KPI count-up on view ---- */
  const kpiGrid = document.getElementById("kpiGrid");
  if (kpiGrid) {
    const animateValue = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      if (prefersReduced || isNaN(target)) {
        el.innerHTML = target + (suffix ? `<span class="suffix">${suffix}</span>` : "");
        return;
      }
      const dur = 900;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const val = Math.round((1 - Math.pow(1 - p, 3)) * target);
        el.innerHTML = val + (suffix ? `<span class="suffix">${suffix}</span>` : "");
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          kpiGrid.querySelectorAll(".kpi-value[data-count]").forEach(animateValue);
          obs.disconnect();
        });
      },
      { threshold: 0.4 }
    );
    io.observe(kpiGrid);
  }

  /* ---- Last-updated stamp (respeita idioma) ---- */
  const stamp = document.getElementById("lastUpdated");
  if (stamp) {
    const d = new Date(document.lastModified);
    const renderStamp = () => {
      if (isNaN(d)) return;
      const loc = document.documentElement.lang === "en" ? "en-US" : "pt-BR";
      stamp.textContent = d.toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" });
    };
    renderStamp();
    document.addEventListener("langchange", renderStamp);
  }

  /* ---- Reveal on scroll (AOS-lite) ---- */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length) {
    if (prefersReduced) {
      reveals.forEach((el) => el.classList.add("in"));
    } else {
      const ro = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      reveals.forEach((el) => ro.observe(el));
    }
  }

  /* ---- Footer year ---- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---- Contact form (Formspree + honeypot) ---- */
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("formMsg");
  const t = (k, fb) => (window.__i18n ? window.__i18n.t(k) : fb) || fb;
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  if (form && msg) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form._gotcha && form._gotcha.value) return; // honeypot
      const data = new FormData(form);
      const name = data.get("name"), email = data.get("email"),
        subject = data.get("subject"), message = data.get("message");
      const show = (text, cls) => (msg.innerHTML = '<span class="' + cls + '">' + text + "</span>");

      if (!name || !email || !subject || !message) return show(t("form.err.fields", "Preencha todos os campos."), "err");
      if (!isEmail(email)) return show(t("form.err.email", "Insira um email válido."), "err");

      const btn = form.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;
      fetch("https://formspree.io/f/xanzlwby", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, email, subject, message, _subject: "Novo contato de: " + name }),
      })
        .then((r) => {
          if (r.ok) { show(t("form.ok", "✓ Mensagem enviada!"), "ok"); form.reset(); }
          else show(t("form.err.send", "Erro ao enviar. Tente novamente."), "err");
        })
        .catch(() => show(t("form.err.send", "Erro ao enviar. Tente novamente."), "err"))
        .finally(() => { if (btn) btn.disabled = false; });
    });
  }
})();
