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
    ort.env.wasm.wasmPaths = "assets/vendor/onnxruntime-web/";

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

  // --- 5. Helper: compute legal-move destinations for chessground ---
  function legalDests(chess) {
    // chess.js is accessible via controller's internal state; we re-derive
    // legal moves from the FEN using a temporary Chess instance imported at top.
    // Instead, we expose legal moves via controller — but GameController doesn't
    // expose chess.moves(). We import Chess directly here for the dests map.
    // (This import is already resolved — Chess is from vendor, not browser-only.)
    const { Chess } = /** @type {any} */ (globalThis.__chessForDests || {});
    if (!Chess) {
      // Fallback: return empty map when Chess is not available (shouldn't happen
      // in browser since chess.js is already vendored and loaded).
      return new Map();
    }
    const tmp = new Chess(chess);
    const dests = new Map();
    for (const move of tmp.moves({ verbose: true })) {
      const srcs = dests.get(move.from) || [];
      srcs.push(move.to);
      dests.set(move.from, srcs);
    }
    return dests;
  }

  // Better: import Chess directly (it's already in scope via transitive imports).
  // We re-import it explicitly here so this function is self-contained.
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

  // --- 6. Status element (create one if not present) ---
  let statusEl = container.querySelector(".chess-status");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "chess-status";
    container.insertAdjacentElement("afterend", statusEl);
  }

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
    // Update status display.
    if (status.over) {
      const resultText =
        status.reason === "checkmate"
          ? `Checkmate — ${status.result}`
          : `Game over — ${status.result} (${status.reason})`;
      statusEl.textContent = resultText;
    } else {
      statusEl.textContent =
        controller.turn === "w" ? "Your turn (white)" : "Bot is thinking…";
    }

    // Refresh board position and legal moves.
    ground.set({
      fen: controller.fen,
      movable: {
        color: status.over ? undefined : "white",
        dests: status.over ? new Map() : computeDests(),
      },
    });
  }

  const binding = createBoardBinding(controller, { onStatus });

  // Set initial status message.
  statusEl.textContent = "Your turn (white)";

  return { ground, controller, binding };
}
