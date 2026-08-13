/* ============================================================
   GitHub repos ao vivo — client-side, com cache localStorage
   ============================================================ */
(function () {
  "use strict";

  const grid = document.getElementById("repoGrid");
  if (!grid) return;

  const user = grid.dataset.githubUser || "Flipe-TI";
  const MAX = 6;
  const CACHE_KEY = "gh_repos_" + user;
  const TTL = 6 * 60 * 60 * 1000; // 6h

  // Cores por linguagem (subset comum)
  const LANG_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5",
    PHP: "#4F5D95", HTML: "#e34c26", CSS: "#563d7c", Jupyter: "#DA5B0B",
    "Jupyter Notebook": "#DA5B0B", Java: "#b07219", Shell: "#89e051",
    Vue: "#41b883", "C#": "#178600", SQL: "#e38c00", Dockerfile: "#384d54",
  };

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

  const fmtDate = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(document.documentElement.lang === "en" ? "en-US" : "pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const isEN = () => document.documentElement.lang === "en";
  const updatedLabel = () => (isEN() ? "updated" : "atualizado");

  function render(repos) {
    if (!repos || !repos.length) {
      grid.innerHTML =
        '<div class="state">' +
        (isEN()
          ? "Couldn't load repositories right now. See everything on "
          : "Não foi possível carregar os repositórios agora. Veja tudo em ") +
        '<a href="https://github.com/' + esc(user) + '" target="_blank" rel="noopener">github.com/' + esc(user) + "</a>.</div>";
      return;
    }
    const top = repos
      .filter((r) => !r.fork && !r.archived)
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, MAX);

    grid.innerHTML = top
      .map((r) => {
        const color = LANG_COLORS[r.language] || "#8296ac";
        const lang = r.language
          ? '<span><span class="lang-dot" style="background:' + color + '"></span>' + esc(r.language) + "</span>"
          : "";
        const desc = r.description ? esc(r.description) : "—";
        return (
          '<article class="card item-card">' +
          '<h4><i class="fas fa-code-branch" style="color:var(--accent)"></i>' +
          '<a href="' + esc(r.html_url) + '" target="_blank" rel="noopener">' + esc(r.name) + "</a></h4>" +
          "<p>" + desc + "</p>" +
          '<div class="meta">' +
          lang +
          '<span><i class="fas fa-star"></i> ' + r.stargazers_count + "</span>" +
          '<span><i class="fas fa-code-branch"></i> ' + r.forks_count + "</span>" +
          "<span>" + updatedLabel() + " " + fmtDate(r.pushed_at) + "</span>" +
          "</div></article>"
        );
      })
      .join("");

    // Atualiza KPI de repositórios no hero
    const kpi = document.getElementById("kpiRepos");
    if (kpi) {
      const count = repos.filter((r) => !r.fork).length;
      // atualiza data-count p/ o count-up (scripts.js) não sobrescrever com o fallback
      kpi.dataset.count = String(count);
      kpi.innerHTML = count + '<span class="suffix">+</span>';
    }
  }

  // Cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.t < TTL && Array.isArray(cached.d)) {
      render(cached.d);
      return;
    }
  } catch (_) {}

  fetch("https://api.github.com/users/" + user + "/repos?sort=pushed&per_page=100", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      const slim = data.map((r) => ({
        name: r.name, html_url: r.html_url, description: r.description,
        language: r.language, stargazers_count: r.stargazers_count,
        forks_count: r.forks_count, pushed_at: r.pushed_at,
        fork: r.fork, archived: r.archived,
      }));
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: slim })); } catch (_) {}
      render(slim);
    })
    .catch(() => {
      // fallback: tenta cache antigo, senão mensagem
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && Array.isArray(cached.d)) return render(cached.d);
      } catch (_) {}
      render(null);
    });
})();
