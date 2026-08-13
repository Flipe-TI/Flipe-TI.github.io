/* ============================================================
   Blog via dev.to API — client-side
   Defina o usuário em: <div id="blogGrid" data-devto-user="SEU_USER">
   ============================================================ */
(function () {
  "use strict";

  const grid = document.getElementById("blogGrid");
  if (!grid) return;

  const user = (grid.dataset.devtoUser || "").trim();
  const isEN = () => document.documentElement.lang === "en";

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

  // Sem usuário configurado ainda: placeholder honesto
  if (!user) {
    grid.innerHTML =
      '<div class="state">' +
      (isEN()
        ? "Articles coming soon. Meanwhile, connect on "
        : "Em breve, artigos aqui. Enquanto isso, conecte-se no ") +
      '<a href="https://www.linkedin.com/in/felipe-silva-ti/" target="_blank" rel="noopener">LinkedIn</a>.' +
      "</div>";
    return;
  }

  const fmt = (iso) => {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(isEN() ? "en-US" : "pt-BR", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';

  fetch("https://dev.to/api/articles?username=" + encodeURIComponent(user) + "&per_page=6")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((posts) => {
      if (!Array.isArray(posts) || !posts.length) {
        grid.innerHTML = '<div class="state">' + (isEN() ? "No articles published yet." : "Nenhum artigo publicado ainda.") + "</div>";
        return;
      }
      const readLabel = isEN() ? "min read" : "min de leitura";
      grid.innerHTML = posts
        .map((p) => {
          const tags = (p.tag_list || [])
            .slice(0, 3)
            .map((t) => '<span class="tag">' + esc(t) + "</span>")
            .join("");
          return (
            '<article class="card item-card">' +
            "<h4><a href=\"" + esc(p.url) + "\" target=\"_blank\" rel=\"noopener\">" + esc(p.title) + "</a></h4>" +
            "<p>" + esc(p.description || "") + "</p>" +
            '<div class="tags" style="margin-bottom:.8rem">' + tags + "</div>" +
            '<div class="meta">' +
            "<span>" + fmt(p.published_at) + "</span>" +
            "<span>" + (p.reading_time_minutes || 1) + " " + readLabel + "</span>" +
            "</div></article>"
          );
        })
        .join("");
    })
    .catch(() => {
      grid.innerHTML =
        '<div class="state">' +
        (isEN() ? "Couldn't load articles. See them on " : "Não foi possível carregar os artigos. Veja em ") +
        '<a href="https://dev.to/' + esc(user) + '" target="_blank" rel="noopener">dev.to/' + esc(user) + "</a>.</div>";
    });
})();
