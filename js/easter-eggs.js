/* ============================================================
   Easter eggs — 1x Senhor dos Anéis, 1x Star Wars
   Sutis, ativáveis por teclado, reversíveis, sem impacto em SEO.
   LOTR:      digite  "mellon"
   Star Wars: Konami  ↑ ↑ ↓ ↓ ← → ← → B A
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* estilos injetados sob demanda */
  const style = document.createElement("style");
  style.textContent = `
    .egg-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
      background:rgba(2,4,8,.82);backdrop-filter:blur(3px);animation:eggIn .4s ease}
    @keyframes eggIn{from{opacity:0}to{opacity:1}}
    .egg-overlay.out{animation:eggOut .5s ease forwards}
    @keyframes eggOut{to{opacity:0;visibility:hidden}}
    .egg-hint{position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);
      font-family:var(--font-mono,monospace);font-size:.72rem;color:#8296ac;opacity:.7}
    /* LOTR ring */
    .egg-ring{width:min(46vmin,320px);height:min(46vmin,320px);border-radius:50%;
      border:6px solid #d4af37;box-shadow:0 0 40px #d4af37,inset 0 0 30px rgba(212,175,55,.6);
      display:grid;place-items:center;text-align:center;color:#f6e6b3;
      font-family:'Geist',serif;padding:2rem;animation:ringGlow 2.4s ease-in-out infinite alternate}
    @keyframes ringGlow{to{box-shadow:0 0 70px #ffcf40,inset 0 0 50px rgba(255,207,64,.8)}}
    .egg-ring span{font-size:.9rem;letter-spacing:.05em;line-height:1.5;font-style:italic}
    /* Star Wars crawl */
    .egg-crawl-wrap{perspective:400px;width:100%;height:100%;overflow:hidden;display:flex;justify-content:center}
    .egg-crawl{margin-top:100vh;color:#ffd54a;font-family:'Geist',sans-serif;font-weight:600;
      text-align:justify;max-width:44rem;transform:rotateX(28deg);transform-origin:50% 100%;
      animation:crawl 22s linear forwards}
    .egg-crawl h3{color:#ffd54a;font-size:2rem;text-align:center;margin-bottom:1.5rem}
    .egg-crawl p{font-size:1.35rem;line-height:1.7;margin:0 0 1.2rem}
    @keyframes crawl{0%{top:100vh;transform:rotateX(28deg) translateZ(0) translateY(0)}
      100%{transform:rotateX(28deg) translateY(-160%)}}
  `;
  document.head.appendChild(style);

  function overlay(inner, ms) {
    const ov = document.createElement("div");
    ov.className = "egg-overlay";
    ov.innerHTML = inner + '<div class="egg-hint">[esc / clique para fechar]</div>';
    document.body.appendChild(ov);
    const close = () => {
      ov.classList.add("out");
      setTimeout(() => ov.remove(), 500);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    if (ms) setTimeout(close, ms);
  }

  /* ---- LOTR ---- */
  function lotr() {
    console.log(
      "%c꧁ Ash nazg durbatulûk ꧂\n%cThree Rings for the Elven-kings under the sky…",
      "color:#d4af37;font-size:16px;font-weight:bold", "color:#c9a227"
    );
    overlay(
      '<div class="egg-ring"><span>Ash nazg durbatulûk,<br>ash nazg gimbatul<br><br>— Um Anel para a todos governar —</span></div>',
      prefersReduced ? 4000 : 8000
    );
  }

  /* ---- Star Wars ---- */
  function starwars() {
    console.log("%cMay the Force be with you.", "color:#ffd54a;font-size:16px;font-weight:bold");
    if (prefersReduced) {
      overlay('<div style="color:#ffd54a;font-family:sans-serif;font-size:1.5rem;text-align:center">Que a Força esteja com você.</div>', 4000);
      return;
    }
    overlay(
      '<div class="egg-crawl-wrap"><div class="egg-crawl">' +
      "<h3>FELIPE GABRIEL</h3>" +
      "<p>Há muito tempo, numa base de dados muito, muito distante… um analista embarcou " +
      "na jornada de transformar dados brutos em decisão estratégica.</p>" +
      "<p>Com Power BI, SQL e Python como sabres de luz, ele enfrentou pipelines caóticos " +
      "e trouxe ordem à Galáxia dos indicadores.</p>" +
      "<p>Que a Força dos dados esteja com você.</p>" +
      "</div></div>",
      23000
    );
  }

  /* ---- listeners ---- */
  let buf = "";
  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key.toLowerCase()).slice(-8);
      if (buf.endsWith("mellon")) { buf = ""; lotr(); }
    }
  });

  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let ki = 0;
  document.addEventListener("keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    ki = k === KONAMI[ki] ? ki + 1 : (k === KONAMI[0] ? 1 : 0);
    if (ki === KONAMI.length) { ki = 0; starwars(); }
  });
})();
