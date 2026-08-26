import { test } from "node:test";
import assert from "node:assert/strict";
import { chessgroundTurnConfig } from "../ui.mjs";

test("white to move, game live: turnColor white, user (white) can move", () => {
  assert.deepEqual(chessgroundTurnConfig({ over: false }, "w"), { turnColor: "white", movableColor: "white" });
});
test("black to move (bot thinking): turnColor black, user cannot move", () => {
  assert.deepEqual(chessgroundTurnConfig({ over: false }, "b"), { turnColor: "black", movableColor: undefined });
});
test("game over: no side is movable (turnColor still reflects side to move)", () => {
  assert.deepEqual(chessgroundTurnConfig({ over: true }, "w"), { turnColor: "white", movableColor: undefined });
});
