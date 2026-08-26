// assets/chess/tests/encoding-moves.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { moveToIndex, indexToMove, POLICY_SIZE } from "../encoding.mjs";

test("POLICY_SIZE é 4672", () => {
  assert.equal(POLICY_SIZE, 4672);
});

test("round-trip de um lance simples (e2e4 na perspectiva)", () => {
  const idx = moveToIndex({ from: "e2", to: "e4", promotion: null });
  assert.ok(idx >= 0 && idx < POLICY_SIZE);
  const back = indexToMove(idx, "w");
  assert.deepEqual(back, { from: "e2", to: "e4", promotion: null });
});

test("cavalo tem índice de knight-move válido", () => {
  const idx = moveToIndex({ from: "g1", to: "f3", promotion: null });
  const back = indexToMove(idx, "w");
  assert.equal(back.from, "g1");
  assert.equal(back.to, "f3");
});

test("underpromotion a cavalo mapeia distinto de promoção a dama", () => {
  const knight = moveToIndex({ from: "a7", to: "a8", promotion: "n" });
  const queen = moveToIndex({ from: "a7", to: "a8", promotion: "q" });
  assert.notEqual(knight, queen);
});

// Extra round-trip tests to pin the promotion convention for the Python port.
// Queen promotion is encoded as a 1-step forward queen move; indexToMove
// returns promotion:"q" for a k=1 queen-direction move landing on rank 7.
test("round-trip: promoção a dama (a7a8 q)", () => {
  const idx = moveToIndex({ from: "a7", to: "a8", promotion: "q" });
  const back = indexToMove(idx, "w");
  assert.deepEqual(back, { from: "a7", to: "a8", promotion: "q" });
});

// Underpromotion round-trip (knight push: a7→a8, file delta 0)
test("round-trip: underpromotion a cavalo (a7a8 n)", () => {
  const idx = moveToIndex({ from: "a7", to: "a8", promotion: "n" });
  const back = indexToMove(idx, "w");
  assert.deepEqual(back, { from: "a7", to: "a8", promotion: "n" });
});
