// assets/chess/tests/opponent.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "../../vendor/chess.js/chess.mjs";
import { selectMove, StubOpponent } from "../opponent.mjs";
import { POLICY_SIZE } from "../encoding.mjs";

function legalList(chess) {
  return chess.moves({ verbose: true }).map(m => ({ from: m.from, to: m.to, promotion: m.promotion || null }));
}

test("selectMove nunca escolhe lance ilegal, mesmo com política adversarial", () => {
  const chess = new Chess();
  const legal = legalList(chess);
  const policy = new Float32Array(POLICY_SIZE).fill(1); // uniforme total (inclui ilegais)
  for (let i = 0; i < 200; i++) {
    const mv = selectMove(policy, legal, "w", { temperature: 1 });
    assert.ok(legal.some(l => l.from === mv.from && l.to === mv.to && (l.promotion || null) === (mv.promotion || null)));
  }
});

test("StubOpponent devolve um lance legal na posição inicial", async () => {
  const chess = new Chess();
  const mv = await new StubOpponent().move(chess);
  const legal = legalList(chess);
  assert.ok(legal.some(l => l.from === mv.from && l.to === mv.to));
});

test("StubOpponent devolve null em xeque-mate", async () => {
  const mate = new Chess("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
  const mv = await new StubOpponent().move(mate);
  assert.equal(mv, null);
});
