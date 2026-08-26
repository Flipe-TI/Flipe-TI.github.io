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

// ---------------------------------------------------------------------------
// Move encoding — AlphaZero 8×8×73
// See training/ENCODING.md for the authoritative frozen specification.
// ---------------------------------------------------------------------------

/** Total number of policy logits (8×8×73). */
export const POLICY_SIZE = 4672; // 64 * 73

/**
 * Queen-move directions in frozen order d=0..7: (file_delta, rank_delta)
 *   0: N (0,+1)  1: NE (+1,+1)  2: E (+1,0)  3: SE (+1,-1)
 *   4: S (0,-1)  5: SW (-1,-1)  6: W (-1,0)  7: NW (-1,+1)
 */
const QUEEN_DIRS = [
  [0, 1],   // d=0 N
  [1, 1],   // d=1 NE
  [1, 0],   // d=2 E
  [1, -1],  // d=3 SE
  [0, -1],  // d=4 S
  [-1, -1], // d=5 SW
  [-1, 0],  // d=6 W
  [-1, 1],  // d=7 NW
];

/**
 * Knight-move offsets in frozen order j=0..7: (file_delta, rank_delta)
 *   56:(+1,+2) 57:(+2,+1) 58:(+2,-1) 59:(+1,-2)
 *   60:(-1,-2) 61:(-2,-1) 62:(-2,+1) 63:(-1,+2)
 */
const KNIGHT_OFFSETS = [
  [1, 2],   // j=0 → moveType 56
  [2, 1],   // j=1 → moveType 57
  [2, -1],  // j=2 → moveType 58
  [1, -2],  // j=3 → moveType 59
  [-1, -2], // j=4 → moveType 60
  [-2, -1], // j=5 → moveType 61
  [-2, 1],  // j=6 → moveType 62
  [-1, 2],  // j=7 → moveType 63
];

/** Underpromotion piece codes → piece index (0=knight, 1=bishop, 2=rook) */
const UNDER_PIECE = { n: 0, b: 1, r: 2 };
/** Reverse: piece index → piece letter */
const UNDER_PIECE_INV = ["n", "b", "r"];

/** Parse algebraic square "e2" → {file: 4, rank: 1} (0-indexed). */
function parseSquare(sq) {
  return {
    file: sq.charCodeAt(0) - 97, // 'a'=0 .. 'h'=7
    rank: parseInt(sq[1], 10) - 1, // '1'=0 .. '8'=7
  };
}

/** Format {file, rank} → algebraic "e2". */
function formatSquare(file, rank) {
  return String.fromCharCode(97 + file) + (rank + 1);
}

/**
 * Convert an algebraic square to the side-to-move perspective.
 *
 * For White (sideToMove = "w"), the square is returned unchanged.
 * For Black (sideToMove = "b"), the rank is flipped: rank char r → char(9-r),
 * e.g. "d7" → "d2", "d5" → "d4". File is always unchanged.
 *
 * This is the single canonical mirror implementation shared by selectMove
 * (for index lookup) and the parity test (for fixture verification).
 *
 * @param {string} square     - Algebraic square, e.g. "e2"
 * @param {"w"|"b"} sideToMove
 * @returns {string}
 */
export function toPerspectiveSquare(square, sideToMove) {
  if (sideToMove !== "b") return square;
  const mirroredRank = 9 - parseInt(square[1], 10);
  return square[0] + mirroredRank;
}

/**
 * Encode a move to an AlphaZero policy index.
 *
 * @param {{ from: string, to: string, promotion: string|null }} move
 *   Squares are in the side-to-move perspective (already mirrored by caller).
 *   promotion: "q"|"r"|"b"|"n"|null. "q" and null use the queen-move range.
 * @returns {number} index in [0, POLICY_SIZE)
 */
export function moveToIndex({ from, to, promotion }) {
  const f = parseSquare(from);
  const t = parseSquare(to);
  const df = t.file - f.file;
  const dr = t.rank - f.rank;

  const fromSquare = f.rank * 8 + f.file;

  // --- Underpromotion (n/b/r only) ---
  if (promotion === "n" || promotion === "b" || promotion === "r") {
    const dir = df + 1; // file_delta -1→0, 0→1, +1→2
    const piece = UNDER_PIECE[promotion];
    const moveType = 64 + dir * 3 + piece;
    return fromSquare * 73 + moveType;
  }

  // --- Knight move ---
  for (let j = 0; j < 8; j++) {
    if (KNIGHT_OFFSETS[j][0] === df && KNIGHT_OFFSETS[j][1] === dr) {
      return fromSquare * 73 + (56 + j);
    }
  }

  // --- Queen move (includes queen promotion; promotion="q" or null) ---
  const k = Math.max(Math.abs(df), Math.abs(dr)); // distance 1..7
  const sdf = df === 0 ? 0 : df / Math.abs(df);   // sign
  const sdr = dr === 0 ? 0 : dr / Math.abs(dr);
  for (let d = 0; d < 8; d++) {
    if (QUEEN_DIRS[d][0] === sdf && QUEEN_DIRS[d][1] === sdr) {
      const moveType = d * 7 + (k - 1);
      return fromSquare * 73 + moveType;
    }
  }

  throw new Error(`moveToIndex: cannot encode move ${from}-${to} promo=${promotion}`);
}

/**
 * Decode a policy index back to a move object.
 *
 * For queen-move indices that land on rank 7 with k=1 and direction ∈ {N,NE,NW},
 * the function emits promotion:"q" because that is the only way moveToIndex
 * would produce a 1-step forward queen move from rank 6. Non-promotion
 * sliding moves and diagonal bishop/rook moves to the back rank cannot be
 * distinguished from queen promotions in this encoding — this is inherent to
 * the AlphaZero scheme; legal-move masking downstream resolves the ambiguity.
 *
 * @param {number} index
 * @param {"w"|"b"} sideToMove  (unused in coordinate math; coords are
 *   already in the caller's perspective, same as moveToIndex)
 * @returns {{ from: string, to: string, promotion: string|null }}
 */
export function indexToMove(index, sideToMove) { // eslint-disable-line no-unused-vars
  const fromSquare = Math.floor(index / 73);
  const moveType = index % 73;

  const fromRank = Math.floor(fromSquare / 8);
  const fromFile = fromSquare % 8;

  // --- Underpromotion ---
  if (moveType >= 64) {
    const sub = moveType - 64;
    const dir = Math.floor(sub / 3); // 0=left, 1=push, 2=right
    const piece = sub % 3;
    const df = dir - 1; // -1, 0, +1
    const dr = 1;       // always +1 in mover perspective
    const toFile = fromFile + df;
    const toRank = fromRank + dr;
    return {
      from: formatSquare(fromFile, fromRank),
      to: formatSquare(toFile, toRank),
      promotion: UNDER_PIECE_INV[piece],
    };
  }

  // --- Knight move ---
  if (moveType >= 56) {
    const j = moveType - 56;
    const df = KNIGHT_OFFSETS[j][0];
    const dr = KNIGHT_OFFSETS[j][1];
    return {
      from: formatSquare(fromFile, fromRank),
      to: formatSquare(fromFile + df, fromRank + dr),
      promotion: null,
    };
  }

  // --- Queen move ---
  const d = Math.floor(moveType / 7);
  const k = (moveType % 7) + 1; // distance 1..7
  const df = QUEEN_DIRS[d][0] * k;
  const dr = QUEEN_DIRS[d][1] * k;
  const toFile = fromFile + df;
  const toRank = fromRank + dr;

  // Detect queen promotion: 1-step forward (or diagonal-forward) move arriving
  // at rank 7 from rank 6. Directions that go "forward" (rank_delta > 0): N, NE, NW.
  let promotion = null;
  if (k === 1 && QUEEN_DIRS[d][1] === 1 && toRank === 7) {
    promotion = "q";
  }

  return {
    from: formatSquare(fromFile, fromRank),
    to: formatSquare(toFile, toRank),
    promotion,
  };
}

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
