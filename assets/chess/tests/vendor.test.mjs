import { test } from "node:test";
import assert from "node:assert/strict";
import { Chess } from "../../vendor/chess.js/chess.mjs";

test("chess.js carrega e gera lances legais iniciais", () => {
  const c = new Chess();
  assert.equal(c.moves().length, 20);
});
