/**
 * index.mjs — Lazy entrypoint for the chess UI.
 *
 * Listens for a click on #jogar-start (the CTA button defined in index.html by Task 10).
 * On the first click, dynamically imports ui.mjs and calls mountUI — so chessground
 * and (optionally) onnxruntime-web are only fetched when the user actually wants to play.
 *
 * Phase 1 opponent flag:
 *   Set USE_ONNX to true to switch from StubOpponent to OnnxOpponent.
 *   Defaults to false for Phase 1 reliability (StubOpponent plays random legal moves,
 *   requires no network request for a model file, and has no WASM warm-up delay).
 */

// --- Phase 2: OnnxOpponent enabled (trained model plays in Felipe's style) ---
const USE_ONNX = true;

// Guard: track whether the board has already been mounted.
let mounted = false;

function init() {
  const startBtn = document.querySelector("#jogar-start");
  const boardContainer = document.querySelector("#jogar-board");

  // Defensive guard: if the expected elements aren't in the DOM yet
  // (Task 10 will add them), do nothing rather than crashing.
  if (!startBtn || !boardContainer) return;

  startBtn.addEventListener(
    "click",
    async function handleFirstClick() {
      // Prevent double-mounting.
      if (mounted) return;
      mounted = true;

      // Remove listener so subsequent clicks are ignored.
      startBtn.removeEventListener("click", handleFirstClick);

      const t = (k, fallback) =>
        window.__i18n && window.__i18n.t ? window.__i18n.t(k) : fallback;

      // Show loading state.
      startBtn.disabled = true;
      startBtn.textContent = t("chess.loading", "Loading…");
      boardContainer.setAttribute("aria-busy", "true");

      try {
        // Lazy-load the UI module (brings in chessground + optional ort).
        const { mountUI } = await import("./ui.mjs");
        await mountUI(boardContainer, { useOnnx: USE_ONNX });

        // Hide the start button once the board is ready.
        startBtn.hidden = true;
        boardContainer.removeAttribute("aria-busy");
      } catch (err) {
        // Surface errors gracefully.
        console.error("[chess] Failed to mount UI:", err);
        startBtn.disabled = false;
        startBtn.textContent = t("chess.cta", "Play");
        mounted = false;
      }
    }
  );
}

// Wire up after the DOM is ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // Already interactive/complete — run immediately.
  init();
}
