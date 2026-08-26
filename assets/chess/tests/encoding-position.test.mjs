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
