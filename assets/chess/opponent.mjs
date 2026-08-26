/**
 * Opponent abstraction for the chess bot.
 *
 * Exports:
 *   - selectMove(policy, legalMoves, sideToMove, {temperature}) -> {from,to,promotion}
 *   - class StubOpponent implements Opponent interface
 *
 * Interface contract (Opponent):
 *   async move(chess) -> {from, to, promotion} | null
 *   Returns null when the game is over, else a legal move object.
 *
 * Mirror contract: chess.js gives absolute squares; encodePosition already
 * encodes the board from the side-to-move perspective (rank-flip for Black).
 * selectMove mirrors each legal move's from/to into that same perspective
 * before calling moveToIndex (index lookup only), then returns the original
 * absolute move so the chess.js legality guarantee is preserved.
 */

import { moveToIndex, POLICY_SIZE } from "./encoding.mjs";

/**
 * Mirror a square from absolute coords to side-to-move perspective for Black.
 * Only rank flips (rank char r → char(57 - r.charCodeAt(0)), i.e. '1'↔'8').
 * File is unchanged. Example: "e2" → "e7", "g8" → "g1".
 *
 * @param {string} sq  - Algebraic square, e.g. "e2"
 * @returns {string}
 */
function mirrorSquare(sq) {
  // sq[0] = file letter, sq[1] = rank digit '1'..'8'
  // Mirror rank: '1'↔'8', '2'↔'7', etc. → new_rank = 9 - rank
  const mirroredRank = 9 - parseInt(sq[1], 10);
  return sq[0] + mirroredRank;
}

/**
 * Select a move from legalMoves using the policy vector, applying a
 * legality mask. Illegal entries (not in legalMoves) are never considered.
 *
 * The policy vector is always in the side-to-move perspective (matching
 * encodePosition). For Black, each move's from/to squares are mirrored
 * before the index lookup; the original absolute move is still returned.
 *
 * @param {Float32Array} policy  - Raw policy logits/probabilities, length POLICY_SIZE.
 * @param {Array<{from:string,to:string,promotion:string|null}>} legalMoves
 * @param {"w"|"b"} sideToMove  - "w" = no mirror; "b" = rank-flip from/to.
 * @param {{temperature?: number}} [opts]  - temperature=0 → argmax; >0 → sample.
 * @returns {{from:string,to:string,promotion:string|null}}
 */
export function selectMove(policy, legalMoves, sideToMove, { temperature = 0 } = {}) {
  if (legalMoves.length === 0) {
    throw new Error("selectMove: legalMoves is empty");
  }

  const mirror = sideToMove === "b";

  // Build a weight array parallel to legalMoves.
  // Only legal moves ever enter this array, so the result is always legal.
  // For Black, mirror from/to before the index lookup (perspective alignment).
  const weights = legalMoves.map(m => {
    const lookupMove = mirror
      ? { from: mirrorSquare(m.from), to: mirrorSquare(m.to), promotion: m.promotion }
      : m;
    const idx = moveToIndex(lookupMove);
    const w = policy[idx];
    return (w > 0 ? w : 0);
  });

  let total = weights.reduce((a, b) => a + b, 0);

  // Fallback: if the model assigns zero mass to all legal moves, use uniform.
  if (total <= 0) {
    for (let i = 0; i < weights.length; i++) weights[i] = 1;
    total = weights.length;
  }

  let chosenIdx;

  if (temperature === 0) {
    // Argmax
    chosenIdx = 0;
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] > weights[chosenIdx]) chosenIdx = i;
    }
  } else {
    // Temperature scaling and sampling
    if (temperature !== 1) {
      for (let i = 0; i < weights.length; i++) {
        weights[i] = Math.pow(weights[i] / total, 1 / temperature);
      }
      total = weights.reduce((a, b) => a + b, 0);
    }

    // Multinomial sample
    const r = Math.random() * total;
    let cumulative = 0;
    chosenIdx = weights.length - 1; // default to last in case of float drift
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        chosenIdx = i;
        break;
      }
    }
  }

  return legalMoves[chosenIdx];
}

/**
 * StubOpponent: implements the Opponent interface with a uniform policy.
 * Every legal move is equally likely (POLICY_SIZE Float32Array of ones,
 * filtered through selectMove's legality mask).
 */
export class StubOpponent {
  /**
   * @param {import("../../vendor/chess.js/chess.mjs").Chess} chess
   * @returns {Promise<{from:string,to:string,promotion:string|null}|null>}
   */
  async move(chess) {
    if (chess.isGameOver()) return null;

    const legalMoves = chess.moves({ verbose: true }).map(m => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion || null,
    }));

    const policy = new Float32Array(POLICY_SIZE).fill(1);
    const sideToMove = chess.turn(); // "w" or "b"

    return selectMove(policy, legalMoves, sideToMove, { temperature: 0 });
  }
}
