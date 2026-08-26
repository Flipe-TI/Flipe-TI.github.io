import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePosition, PLANES } from "../encoding.mjs";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("encode tem tamanho PLANES*64", () => {
  const t = encodePosition(START);
  assert.equal(t.length, PLANES * 64);
});

test("brancas a mover: peão branco em a2 aparece no plano 0 (meu peão)", () => {
  const t = encodePosition(START);
  // a2 = rank 1, file 0 -> índice de casa 1*8+0 = 8, plano 0 (meus peões)
  assert.equal(t[0 * 64 + (1 * 8 + 0)], 1.0);
});

test("pretas a mover são espelhadas: peão preto vira 'meu peão' na fileira de baixo", () => {
  const blackToMove = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";
  const t = encodePosition(blackToMove);
  // após espelhar, os peões pretos (do lado a mover) ficam na rank 1
  assert.equal(t[0 * 64 + (1 * 8 + 0)], 1.0);
});

// Castling rights are relative to the mover.
// FEN "Kq" means White has kingside, Black has queenside.
// White to move → plane 13 (my K-side)=1, plane 16 (opp Q-side)=1, others=0.
// Black to move → plane 14 (my Q-side)=1, plane 15 (opp K-side)=1, others=0.
test("roque relativo ao lado a mover: brancas a mover com Kq", () => {
  const t = encodePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kq - 0 1");
  assert.equal(t[13 * 64], 1.0, "plane 13 (my kingside) deve ser 1");
  assert.equal(t[14 * 64], 0.0, "plane 14 (my queenside) deve ser 0");
  assert.equal(t[15 * 64], 0.0, "plane 15 (opp kingside) deve ser 0");
  assert.equal(t[16 * 64], 1.0, "plane 16 (opp queenside) deve ser 1");
});

test("roque relativo ao lado a mover: pretas a mover com Kq", () => {
  const t = encodePosition("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b Kq - 0 1");
  // Black to move: 'q' = Black queenside = my queenside → plane 14
  //                'K' = White kingside = opp kingside → plane 15
  assert.equal(t[13 * 64], 0.0, "plane 13 (my kingside) deve ser 0");
  assert.equal(t[14 * 64], 1.0, "plane 14 (my queenside) deve ser 1");
  assert.equal(t[15 * 64], 1.0, "plane 15 (opp kingside) deve ser 1");
  assert.equal(t[16 * 64], 0.0, "plane 16 (opp queenside) deve ser 0");
});

// En-passant square is also rank-flipped for Black to move.
// After 1.e4, FEN has en-passant target e3 (rank 2, 0-indexed) for Black.
// White to move check: e3 stays at rank 2, file 4.
// Black to move check: rank-flip → 7-2 = 5, file 4.
test("en-passant: quadrado do alvo está no plano 17 sem espelhar (brancas a mover)", () => {
  // After 1.e4: ep target is e3 = file 4, rank 2
  const t = encodePosition("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
  // Black to move → rank-flip: e3 = rank 2 → 7-2 = 5, file 4
  assert.equal(t[17 * 64 + (5 * 8 + 4)], 1.0, "plane 17 deve ter 1.0 no alvo espelhado e3→rank5");
});
