import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encodePosition, moveToIndex } from "../encoding.mjs";

const cases = JSON.parse(
  readFileSync(new URL("./fixtures/parity.json", import.meta.url))
);

for (const c of cases) {
  test(`parity: ${c.fen}`, () => {
    const t = encodePosition(c.fen);
    const nz = [];
    for (let i = 0; i < t.length; i++) if (t[i] !== 0) nz.push(i);
    assert.deepEqual(nz, c.nonzero_indices);
    for (const [uci, idx] of Object.entries(c.moves)) {
      const from = uci.slice(0, 2),
        to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : null;
      assert.equal(moveToIndex({ from, to, promotion }), idx);
    }
  });
}
