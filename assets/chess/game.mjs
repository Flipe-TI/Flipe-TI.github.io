/**
 * GameController: wraps chess.js and orchestrates the bot's turn.
 *
 * Interface:
 *   class GameController {
 *     constructor(opponent, { playerColor = "w" } = {})
 *     get fen()          // current FEN string
 *     get turn()         // "w" | "b"
 *     userMove({ from, to, promotion }) -> { ok: boolean, move? }
 *     async botMove()    -> { move?, gameOver? }
 *     status()           -> { over: boolean, result?, reason? }
 *   }
 */

import { Chess } from "../vendor/chess.js/chess.mjs";

export class GameController {
  /**
   * @param {object} opponent - Implements async move(chess) -> move|null
   * @param {{ playerColor?: "w"|"b" }} [opts]
   */
  constructor(opponent, { playerColor = "w" } = {}) {
    this._opponent = opponent;
    this._playerColor = playerColor;
    this._chess = new Chess();
  }

  /** @returns {string} Current position as a FEN string. */
  get fen() {
    return this._chess.fen();
  }

  /** @returns {"w"|"b"} Whose turn it is. */
  get turn() {
    return this._chess.turn();
  }

  /**
   * Apply a user move. Rejects illegal moves without changing state.
   *
   * @param {{ from: string, to: string, promotion?: string }} param
   * @returns {{ ok: boolean, move?: object }}
   */
  userMove({ from, to, promotion }) {
    try {
      const move = this._chess.move({ from, to, promotion });
      if (!move) return { ok: false };
      return { ok: true, move };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Ask the opponent to play one move. If the game is already over,
   * the opponent returns null and we return { gameOver: true }.
   *
   * @returns {Promise<{ move?: object, gameOver?: boolean }>}
   */
  async botMove() {
    const m = await this._opponent.move(this._chess);
    if (m === null) return { gameOver: true };

    const move = this._chess.move(m);
    return { move, gameOver: this._chess.isGameOver() };
  }

  /**
   * Summarise the game's terminal state.
   *
   * @returns {{ over: boolean, result?: string, reason?: string }}
   */
  status() {
    const chess = this._chess;

    if (!chess.isGameOver()) {
      return { over: false };
    }

    if (chess.isCheckmate()) {
      // The side to move is the one checkmated; the other side won.
      const winner = chess.turn() === "w" ? "b" : "w";
      const result = winner === "w" ? "1-0" : "0-1";
      return { over: true, result, reason: "checkmate" };
    }

    if (chess.isStalemate()) {
      return { over: true, result: "1/2-1/2", reason: "stalemate" };
    }

    // isDraw() covers insufficient material, 50-move rule, threefold repetition
    if (chess.isDraw()) {
      return { over: true, result: "1/2-1/2", reason: "draw" };
    }

    // Fallback (should not be reached with a standard chess.js game)
    return { over: true, result: "1/2-1/2", reason: "draw" };
  }
}
