import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodePosition, moveToIndex, toPerspectiveSquare } from "../encoding.mjs";

const cases = JSON.parse(
  readFileSync(new URL("./fixtures/parity.json", import.meta.url))
);

for (const c of cases) {
  test(`parity: ${c.fen}`, () => {
    const tensor = encodePosition(c.fen);
    const nz = [];
    for (let i = 0; i < tensor.length; i++) if (tensor[i] !== 0) nz.push(i);
    assert.deepEqual(nz, c.nonzero_indices);

    // Derive side-to-move from the FEN (second space-separated token after the board).
    const sideToMove = c.fen.trim().split(/\s+/)[1]; // "w" or "b"

    // For Black, each move's from/to are mirrored to the side-to-move perspective
    // before moveToIndex — matching the behaviour of selectMove and encodePosition.
    // Stored indices in parity.json are therefore PERSPECTIVE indices, not absolute.
    for (const [uci, idx] of Object.entries(c.moves)) {
      const rawFrom = uci.slice(0, 2);
      const rawTo = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : null;
      const from = toPerspectiveSquare(rawFrom, sideToMove);
      const to = toPerspectiveSquare(rawTo, sideToMove);
      assert.equal(moveToIndex({ from, to, promotion }), idx);
    }
  });
}
