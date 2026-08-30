/**
 * ui.mjs — Board UI binding for the chess bot.
 *
 * Exports:
 *   createBoardBinding(controller, { onStatus }) — PURE function, no DOM, no chessground.
 *     Testable in Node. Returns { handleUserMove(from, to, promotion?) }.
 *
 *   async mountUI(container, { useOnnx }) — browser-only, dynamically imports
 *     chessground and (optionally) onnxruntime-web. NOT called in Node tests.
 *
 * Promotion in Phase 1:
 *   mountUI auto-queens (promotion = "q") when a pawn reaches the last rank.
 *   The pure createBoardBinding passes whatever promotion value it receives through.
 *
 * Imports of GameController, StubOpponent, OnnxOpponent are at the top level —
 * they are all Node-safe (no browser globals). Only chessground and onnxruntime-web
 * are dynamically imported inside mountUI, keeping this module Node-importable.
 */

import { GameController } from "./game.mjs";
import { StubOpponent } from "./opponent.mjs";
import { OnnxOpponent } from "./onnx-opponent.mjs";

// ---------------------------------------------------------------------------
// Pure turn/movable config — no DOM, no chessground. Node-safe.
// ---------------------------------------------------------------------------

/**
 * Derive chessground turn/movable config from game status + side to move.
 * turnColor MUST always match the side to move, or chessground treats the
 * user's next move as a premove and the board locks after one move.
 *
 * @param {{ over: boolean }} status
 * @param {"w"|"b"} turn  - side to move ("w" = white, "b" = black)
 * @returns {{ turnColor: "white"|"black", movableColor: "white"|undefined }}
 */
export function chessgroundTurnConfig(status, turn) {
  const sideToMove = turn === "w" ? "white" : "black";
  const userCanMove = !status.over && turn === "w";
  return { turnColor: sideToMove, movableColor: userCanMove ? "white" : undefined };
}

// ---------------------------------------------------------------------------
// Pure binding — no DOM, no chessground. Safe to import in Node tests.
// ---------------------------------------------------------------------------

/**
 * Wire a GameController to status callbacks.
 *
 * @param {GameController} controller
 * @param {{ onStatus: function }} opts
 * @returns {{ handleUserMove: function }}
 */
export function createBoardBinding(controller, { onStatus }) {
  async function handleUserMove(from, to, promotion) {
    const result = controller.userMove({ from, to, promotion });

    if (!result.ok) {
      // Illegal move — emit a status with current state and return early.
      onStatus(controller.status());
      return;
    }

    // Legal user move applied — emit status.
    onStatus(controller.status());

    // If the game is already over after the user's move, do not call botMove.
    if (controller.status().over) return;

    // Let the bot reply.
    await controller.botMove();

    // Emit status again (includes result if the game is now over).
    onStatus(controller.status());
  }

  return { handleUserMove };
}

// ---------------------------------------------------------------------------
// Browser-only: mountUI
// Chessground and onnxruntime-web are dynamically imported here so that
// importing createBoardBinding in Node never touches browser globals.
// ---------------------------------------------------------------------------

/**
 * Mount the chessboard UI in `container` and wire it to a GameController.
 *
 * @param {HTMLElement} container  - DOM element to mount chessground in.
 * @param {{ useOnnx?: boolean }}  opts
 */
export async function mountUI(container, { useOnnx = false } = {}) {
  // --- 1. Build the opponent ---
  let opponent;

  if (useOnnx) {
    // Dynamically load onnxruntime-web so Node tests never touch it.
    const ort = await import("../vendor/onnxruntime-web/ort.wasm.min.mjs");
    // Tell the WASM runtime where to find the .wasm binaries.
    // Absolute URL resolved from this module: a bare relative specifier fails
    // ort's internal dynamic import(). This works both locally and under the
    // GitHub Pages subpath. ort-web 1.29 auto-falls-back to single-thread when
    // crossOriginIsolated is false (GitHub Pages), so no COOP/COEP is needed.
    ort.env.wasm.wasmPaths = new URL("../vendor/onnxruntime-web/", import.meta.url).href;

    const modelUrl = new URL("../models/felipe-chess/model.onnx", import.meta.url);
    opponent = new OnnxOpponent(modelUrl, { ort });
    await opponent.load();
  } else {
    // Phase 1 default: StubOpponent (random legal moves, no network needed).
    opponent = new StubOpponent();
  }

  // --- 2. Create the controller ---
  const controller = new GameController(opponent);

  // --- 3. Detect prefers-reduced-motion (mirrors js/easter-eggs.js pattern) ---
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- 4. Dynamically import chessground (browser global dependency) ---
  const { Chessground } = await import("../vendor/chessground/chessground.mjs");

  // --- 5. Import Chess for legal-move destination computation ---
  const { Chess } = await import("../vendor/chess.js/chess.mjs");

  function computeDests() {
    const tmp = new Chess(controller.fen);
    const dests = new Map();
    for (const move of tmp.moves({ verbose: true })) {
      const targets = dests.get(move.from) || [];
      targets.push(move.to);
      dests.set(move.from, targets);
    }
    return dests;
  }

  // --- 6. Status element — prefer #jogar-status in the page; fall back to creating one ---
  const t = (k, fallback) =>
    window.__i18n && window.__i18n.t ? window.__i18n.t(k) : fallback;

  function statusText(status) {
    if (status.over) {
      if (status.reason === "checkmate") {
        if (status.result === "1-0") return t("chess.you_win", "You win!");
        if (status.result === "0-1") return t("chess.you_lose", "Bot wins.");
        return t("chess.draw", "Draw.");
      }
      return t("chess.draw", "Draw.");
    }
    return controller.turn === "w"
      ? t("chess.your_turn", "Your turn")
      : t("chess.bot_thinking", "Bot is thinking…");
  }

  let statusEl = document.querySelector("#jogar-status");
  if (!statusEl) {
    statusEl = container.querySelector(".chess-status");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "chess-status";
      container.insertAdjacentElement("afterend", statusEl);
    }
  }

  let currentStatus = controller.status();

  // --- 6b. Set bilingual aria-label on the board container ---
  // The i18n system only swaps textContent for [data-i18n] elements, so we
  // set the aria-label imperatively here and refresh it on langchange.
  function updateBoardLabel() {
    container.setAttribute("aria-label", t("chess.board_label", "Chess board"));
  }
  updateBoardLabel();
  document.addEventListener("langchange", updateBoardLabel);

  // --- 7. Mount chessground ---
  const ground = Chessground(container, {
    fen: controller.fen,
    orientation: "white",
    movable: {
      color: "white",
      free: false,
      dests: computeDests(),
      events: {
        after: async (from, to) => {
          // Auto-queen promotion when a pawn reaches the last rank (Phase 1).
          const fromRank = from[1];
          const toRank = to[1];
          const isWhitePawnPromotion =
            controller.turn === "w" && fromRank === "7" && toRank === "8";
          const isBlackPawnPromotion =
            controller.turn === "b" && fromRank === "2" && toRank === "1";
          const promotion =
            isWhitePawnPromotion || isBlackPawnPromotion ? "q" : undefined;

          await binding.handleUserMove(from, to, promotion);
        },
      },
    },
    animation: {
      enabled: !prefersReduced,
    },
    draggable: {
      enabled: true,
    },
  });

  // --- 8. Wire the binding ---
  function onStatus(status) {
    currentStatus = status;

    // Update status display.
    statusEl.textContent = statusText(status);

    // Refresh board position and legal moves.
    // turnColor MUST be set explicitly: chessground auto-toggles it after each
    // real drag, so without restoring it here it stays "black" while
    // movable.color stays "white" — chessground then treats the next white
    // move as a premove and the board locks after the first move.
    const cfg = chessgroundTurnConfig(status, controller.turn);
    ground.set({
      fen: controller.fen,
      turnColor: cfg.turnColor,
      movable: {
        color: cfg.movableColor,
        dests: status.over ? new Map() : computeDests(),
      },
    });
  }

  const binding = createBoardBinding(controller, { onStatus });

  // Set initial status message.
  statusEl.textContent = statusText(currentStatus);

  // Re-render status text on language change.
  document.addEventListener("langchange", () => {
    statusEl.textContent = statusText(currentStatus);
  });

  return { ground, controller, binding };
}
