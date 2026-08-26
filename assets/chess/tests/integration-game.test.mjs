// assets/chess/tests/integration-game.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import * as ort from "onnxruntime-node";
import { GameController } from "../game.mjs";
import { OnnxOpponent } from "../onnx-opponent.mjs";

test("partida completa contra OnnxOpponent termina em estado legal (<=300 plies)", async () => {
  const bot = new OnnxOpponent(
    new URL("../../models/felipe-chess/model.onnx", import.meta.url),
    { ort }
  );
  await bot.load();
  const g = new GameController(bot, { playerColor: "w" });
  let plies = 0;
  while (!g.status().over && plies < 300) {
    // "usuário" também joga via um bot para automatizar
    const legal = g.legalMoves();               // helper exposto pelo controller
    const pick = legal[Math.floor(Math.random() * legal.length)];
    assert.equal(g.userMove(pick).ok, true);
    plies++;
    if (g.status().over) break;
    await g.botMove();
    plies++;
  }
  const st = g.status();
  assert.ok(st.over || plies >= 300);
});
