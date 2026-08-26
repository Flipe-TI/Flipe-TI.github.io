/**
 * OnnxOpponent — chess Opponent backed by an ONNX policy model.
 *
 * Implements the same interface as StubOpponent:
 *   async load()                  — initialise the InferenceSession
 *   async move(chess) -> move|null — run inference and select a legal move
 *
 * Backend injection
 * -----------------
 * The onnxruntime backend is injected via the constructor so the same class
 * works in two environments:
 *   - Node test:    new OnnxOpponent(url, { ort: await import("onnxruntime-node") })
 *   - Browser:      new OnnxOpponent(url, { ort: window.ort })  // onnxruntime-web
 * Both backends expose InferenceSession.create() and Tensor with the same API.
 *
 * Model contract
 * --------------
 *   Input  "board"  float32 [1, 18, 8, 8]
 *   Output "policy" float32 [1, 4672]
 * Policy is in the side-to-move perspective; selectMove handles mirroring.
 */

import { encodePosition } from "./encoding.mjs";
import { selectMove } from "./opponent.mjs";

export class OnnxOpponent {
  /**
   * @param {URL|string} modelUrl  Path or URL to the ONNX model file.
   *   In Node, file:// URLs are converted to a filesystem path for the runtime.
   *   In the browser, pass an absolute URL string or URL object.
   * @param {{ ort: object }} options  Injected onnxruntime backend.
   */
  constructor(modelUrl, { ort }) {
    this._modelUrl = modelUrl;
    this._ort = ort;
    this._session = null;
  }

  /**
   * Create the InferenceSession. Must be called before move().
   * Safe to call multiple times (idempotent after the first successful load).
   */
  async load() {
    if (this._session) return;

    const url = this._modelUrl;
    let source;

    if (url instanceof URL && url.protocol === "file:") {
      // Node: convert file:// URL → filesystem path.
      // Dynamic import avoids pulling node:url into the browser bundle.
      const { fileURLToPath } = await import("node:url");
      source = fileURLToPath(url);
    } else {
      // Browser: pass the URL string directly to onnxruntime-web.
      source = url instanceof URL ? url.toString() : url;
    }

    this._session = await this._ort.InferenceSession.create(source);
  }

  /**
   * Select and return a legal move for the current position.
   *
   * @param {import("../vendor/chess.js/chess.mjs").Chess} chess
   * @returns {Promise<{from:string,to:string,promotion:string|null}|null>}
   */
  async move(chess) {
    if (chess.isGameOver()) return null;

    // Encode position → Float32Array of length 18*64
    const data = encodePosition(chess.fen());

    // Build input tensor [1, 18, 8, 8]
    const tensor = new this._ort.Tensor("float32", data, [1, 18, 8, 8]);

    // Run inference
    const results = await this._session.run({ board: tensor });
    const policy = results["policy"].data; // Float32Array, length 4672

    // Enumerate legal moves in chess.js absolute coords
    const legalMoves = chess.moves({ verbose: true }).map(m => ({
      from: m.from,
      to: m.to,
      promotion: m.promotion || null,
    }));

    // selectMove handles perspective mirroring for Black internally
    return selectMove(policy, legalMoves, chess.turn(), { temperature: 0 });
  }
}
