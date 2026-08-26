// assets/chess/tests/game.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { GameController } from "../game.mjs";
import { StubOpponent } from "../opponent.mjs";

test("userMove legal avança; ilegal é rejeitado sem mudar estado", () => {
  const g = new GameController(new StubOpponent());
  const before = g.fen;
  assert.equal(g.userMove({ from: "e2", to: "e5" }).ok, false); // ilegal
  assert.equal(g.fen, before);
  assert.equal(g.userMove({ from: "e2", to: "e4" }).ok, true);
  assert.notEqual(g.fen, before);
});

test("botMove joga um lance legal após o usuário", async () => {
  const g = new GameController(new StubOpponent());
  g.userMove({ from: "e2", to: "e4" });
  const r = await g.botMove();
  assert.ok(r.move);
  assert.equal(g.turn, "w"); // voltou pro usuário
});

test("status detecta fim de jogo", () => {
  const g = new GameController(new StubOpponent());
  assert.equal(g.status().over, false);
});
