// assets/chess/tests/ui-wiring.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { GameController } from "../game.mjs";
import { StubOpponent } from "../opponent.mjs";
import { createBoardBinding } from "../ui.mjs";

test("handleUserMove aplica lance do usuário e agenda a vez do bot, emitindo status", async () => {
  const g = new GameController(new StubOpponent());
  const statuses = [];
  const binding = createBoardBinding(g, { onStatus: s => statuses.push(s) });
  await binding.handleUserMove("e2", "e4");
  assert.ok(statuses.length >= 1);
  assert.equal(g.turn, "w"); // usuário jogou, bot respondeu, voltou
});
