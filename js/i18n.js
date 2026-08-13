/* ============================================================
   i18n PT/EN — troca textos [data-i18n], persiste preferência
   ============================================================ */
(function () {
  "use strict";

  const STORE = "lang";
  const SUPPORTED = ["pt", "en"];
  const dicts = {};
  let current = null;

  const pick = () => {
    const saved = localStorage.getItem(STORE);
    if (SUPPORTED.includes(saved)) return saved;
    const nav = (navigator.language || "pt").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : "pt";
  };

  const load = (lang) =>
    dicts[lang]
      ? Promise.resolve(dicts[lang])
      : fetch("assets/data/i18n/" + lang + ".json")
          .then((r) => (r.ok ? r.json() : {}))
          .then((d) => (dicts[lang] = d))
          .catch(() => (dicts[lang] = {}));

  function apply(lang, dict) {
    current = lang;
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = dict[el.getAttribute("data-i18n")];
      if (val == null) return;
      // valores com markup (<strong> etc.) vão por innerHTML; JSON é conteúdo confiável
      if (val.indexOf("<") !== -1) el.innerHTML = val;
      else el.textContent = val;
    });
    // toggle buttons
    document.querySelectorAll(".lang-toggle button[data-lang]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang))
    );
    // expõe dicionário + evento para outros módulos (blog/github já leem lang)
    window.__i18n = { lang, t: (k) => dict[k] || k };
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  function set(lang) {
    if (!SUPPORTED.includes(lang) || lang === current) return;
    localStorage.setItem(STORE, lang);
    load(lang).then((d) => apply(lang, d));
  }

  // init
  const initial = pick();
  load(initial).then((d) => apply(initial, d));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-toggle button[data-lang]");
    if (btn) set(btn.dataset.lang);
  });
})();
