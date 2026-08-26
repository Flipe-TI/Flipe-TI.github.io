/**
 * Chess Position Encoder — az-8x8x73-v1
 *
 * Pure ESM module with no external dependencies.
 * Encodes a FEN string into an 18-plane Float32Array tensor
 * from the perspective of the side to move.
 *
 * See training/ENCODING.md for the authoritative specification.
 */

export const ENCODING_VERSION = "az-8x8x73-v1";
export const PLANES = 18;
export const INPUT_SHAPE = [PLANES, 8, 8];

// Piece-type to plane index (relative to "my pieces" block at plane 0)
// P=0, N=1, B=2, R=3, Q=4, K=5
const PIECE_PLANE = {
  p: 0, // pawn
  n: 1, // knight
  b: 2, // bishop
  r: 3, // rook
  q: 4, // queen
  k: 5, // king
};

/**
 * Parse a FEN string and return an 18-plane Float32Array tensor.
 *
 * Tensor index formula: plane * 64 + rank * 8 + file
 *   rank 0 = White's back rank (row 1 in chess notation)
 *   rank 7 = Black's back rank
 *   file 0 = a-file, file 7 = h-file
 *
 * Always encoded from the perspective of the side to move:
 *   - White to move: no transform.
 *   - Black to move: rank-flip (r → 7-r) + color-swap so "my" pieces are planes 0-5.
 *
 * @param {string} fen
 * @returns {Float32Array}
 */
export function encodePosition(fen) {
  const parts = fen.trim().split(/\s+/);
  const piecePlacement = parts[0];
  const activeColor = parts[1]; // 'w' or 'b'
  const castling = parts[2] || "-"; // e.g. 'KQkq'
  const enPassant = parts[3] || "-"; // e.g. 'e6' or '-'

  const blackToMove = activeColor === "b";

  // Output tensor: PLANES × 8 × 8
  const tensor = new Float32Array(PLANES * 64);

  // --- Parse piece placement ---
  // FEN rows are listed from rank 8 down to rank 1 (top to bottom).
  // FEN row index i (0 = rank 8) → internal rank = 7 - i (before any flip)
  const fenRows = piecePlacement.split("/");

  for (let fenRow = 0; fenRow < 8; fenRow++) {
    const internalRankWhitePerspective = 7 - fenRow;
    let file = 0;

    for (const ch of fenRows[fenRow]) {
      if (ch >= "1" && ch <= "8") {
        file += parseInt(ch, 10);
      } else {
        const isUpperCase = ch === ch.toUpperCase();
        // White pieces are uppercase, Black pieces are lowercase
        const pieceColor = isUpperCase ? "w" : "b";
        const pieceType = ch.toLowerCase();
        const planeOffset = PIECE_PLANE[pieceType];

        if (planeOffset !== undefined) {
          let rank = internalRankWhitePerspective;
          let plane;

          if (!blackToMove) {
            // White to move: no transform
            // White ("w") = my pieces → planes 0-5
            // Black ("b") = opponent → planes 6-11
            plane = (pieceColor === "w" ? 0 : 6) + planeOffset;
          } else {
            // Black to move: rank-flip + color-swap
            rank = 7 - internalRankWhitePerspective;
            // Black ("b") = my pieces → planes 0-5
            // White ("w") = opponent → planes 6-11
            plane = (pieceColor === "b" ? 0 : 6) + planeOffset;
          }

          tensor[plane * 64 + rank * 8 + file] = 1.0;
        }

        file++;
      }
    }
  }

  // --- Plane 12: side-to-move (constant 1.0) ---
  tensor.fill(1.0, 12 * 64, 13 * 64);

  // --- Planes 13-16: castling rights (relative to mover) ---
  // Plane 13: my kingside
  // Plane 14: my queenside
  // Plane 15: opponent kingside
  // Plane 16: opponent queenside
  //
  // FEN castling string uses uppercase for White (K/Q) and lowercase for Black (k/q).
  if (!blackToMove) {
    // White to move: White=mine, Black=opponent
    if (castling.includes("K")) tensor.fill(1.0, 13 * 64, 14 * 64); // my kingside
    if (castling.includes("Q")) tensor.fill(1.0, 14 * 64, 15 * 64); // my queenside
    if (castling.includes("k")) tensor.fill(1.0, 15 * 64, 16 * 64); // opp kingside
    if (castling.includes("q")) tensor.fill(1.0, 16 * 64, 17 * 64); // opp queenside
  } else {
    // Black to move: Black=mine, White=opponent
    if (castling.includes("k")) tensor.fill(1.0, 13 * 64, 14 * 64); // my kingside
    if (castling.includes("q")) tensor.fill(1.0, 14 * 64, 15 * 64); // my queenside
    if (castling.includes("K")) tensor.fill(1.0, 15 * 64, 16 * 64); // opp kingside
    if (castling.includes("Q")) tensor.fill(1.0, 16 * 64, 17 * 64); // opp queenside
  }

  // --- Plane 17: en-passant target square ---
  if (enPassant !== "-") {
    const epFile = enPassant.charCodeAt(0) - "a".charCodeAt(0); // 0-7
    const epRankChess = parseInt(enPassant[1], 10); // 1-8
    let epRank = epRankChess - 1; // 0-indexed, White perspective

    if (blackToMove) {
      // Rank-flip same as pieces
      epRank = 7 - epRank;
    }

    tensor[17 * 64 + epRank * 8 + epFile] = 1.0;
  }

  return tensor;
}
