// assets/chess/tests/onnx-opponent.test.mjs
//
// End-to-end test: OnnxOpponent loads the fixture model and produces a legal move.
// Also tests the perspective mirror in selectMove (the inference crux).

import { test } from "node:test";
import assert from "node:assert/strict";
import * as ort from "onnxruntime-node";
import { Chess } from "../../vendor/chess.js/chess.mjs";
import { OnnxOpponent } from "../onnx-opponent.mjs";
import { selectMove } from "../opponent.mjs";
import { POLICY_SIZE, moveToIndex } from "../encoding.mjs";

// ---------------------------------------------------------------------------
// Fixture model: end-to-end inference
// ---------------------------------------------------------------------------

test("OnnxOpponent carrega o modelo fixture e devolve lance legal", async () => {
  const bot = new OnnxOpponent(
    new URL("../../models/felipe-chess/model.onnx", import.meta.url),
    { ort }
  );
  await bot.load();

  const chess = new Chess();
  const mv = await bot.move(chess);
  const legal = chess.moves({ verbose: true });

  assert.ok(mv !== null, "move() must not return null in a non-terminal position");
  assert.ok(
    legal.some(l => l.from === mv.from && l.to === mv.to),
    `Returned move ${JSON.stringify(mv)} is not in the legal move list`
  );
});

// ---------------------------------------------------------------------------
// Mirror perspective tests for selectMove
//
// These tests use a hand-crafted spike policy to verify the index-to-move
// mapping. The spike is placed at the MIRRORED index (side-to-move perspective)
// and we assert that selectMove returns the ORIGINAL absolute move.
// ---------------------------------------------------------------------------

test("selectMove mirror: brancas (sem espelho) — spike em e2→e4 retorna e2→e4", () => {
  // White to move: no mirroring. Absolute = perspective.
  // moveToIndex({from:"e2",to:"e4"}):
  //   e2 → file=4, rank=1, fromSquare=12
  //   df=0, dr=2 → queen N direction (d=0), k=2 → moveType=1
  //   index = 12*73 + 1 = 877
  const SPIKE_INDEX = 877;
  assert.equal(moveToIndex({ from: "e2", to: "e4", promotion: null }), SPIKE_INDEX,
    "Sanity: moveToIndex({e2,e4}) should be 877");

  const policy = new Float32Array(POLICY_SIZE).fill(0);
  policy[SPIKE_INDEX] = 1.0;

  const chess = new Chess(); // start position, White to move
  const legalMoves = chess.moves({ verbose: true }).map(m => ({
    from: m.from, to: m.to, promotion: m.promotion || null,
  }));

  const mv = selectMove(policy, legalMoves, "w", { temperature: 0 });
  assert.equal(mv.from, "e2");
  assert.equal(mv.to, "e4");
});

test("selectMove mirror: pretas (com espelho) — spike no índice espelhado de e7→e5 retorna e7→e5", () => {
  // After 1.e4, Black to move. Legal move: e7→e5.
  // Mirrored: e7 → e2, e5 → e4  (rank: 7→9-7=2, 5→9-5=4)
  // moveToIndex({from:"e2",to:"e4"}):
  //   e2 → file=4, rank=1, fromSquare=12
  //   df=0, dr=2 → queen N (d=0), k=2 → moveType=1
  //   index = 12*73 + 1 = 877
  const SPIKE_INDEX = 877;

  // Verify the mirrored index independently
  assert.equal(moveToIndex({ from: "e2", to: "e4", promotion: null }), SPIKE_INDEX,
    "Sanity: mirrored e7→e5 (as e2→e4 in Black perspective) should be index 877");

  const policy = new Float32Array(POLICY_SIZE).fill(0);
  policy[SPIKE_INDEX] = 1.0;

  const chess = new Chess();
  chess.move("e4"); // now Black to move
  assert.equal(chess.turn(), "b");

  const legalMoves = chess.moves({ verbose: true }).map(m => ({
    from: m.from, to: m.to, promotion: m.promotion || null,
  }));

  // e7→e5 must be in the legal list
  assert.ok(
    legalMoves.some(m => m.from === "e7" && m.to === "e5"),
    "e7→e5 must be a legal move after 1.e4"
  );

  const mv = selectMove(policy, legalMoves, "b", { temperature: 0 });

  // The returned move must be the original ABSOLUTE move (e7→e5), not the mirrored one
  assert.equal(mv.from, "e7",
    `Expected from=e7 (absolute), got from=${mv.from}`);
  assert.equal(mv.to, "e5",
    `Expected to=e5 (absolute), got to=${mv.to}`);
});
