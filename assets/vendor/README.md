# assets/vendor — Pinned ESM libs

Third-party libraries vendored here for use as ES modules in the browser (no CDN at runtime).
`node_modules/` is gitignored; these files ARE committed and versioned.

---

## chess.js — v1.4.0

**Source:** `node_modules/chess.js/dist/esm/chess.js`
**Vendored as:** `assets/vendor/chess.js/chess.mjs`

Self-contained ESM bundle (no imports). Copied verbatim.

**Copy command:**
```bash
cp node_modules/chess.js/dist/esm/chess.js assets/vendor/chess.js/chess.mjs
```

---

## chessground — v9.2.1

**Source:** `node_modules/chessground/dist/*.js` + `node_modules/chessground/assets/*.css`
**Vendored as:** `assets/vendor/chessground/`

Chessground is a multi-file ESM graph (each `.js` imports siblings via `./xxx.js`).
The entire `dist/` is copied to preserve the relative-path graph.
`chessground.mjs` is a copy of `chessground.js` (the entry point) with all imports relative.
CSS files (`chessground.base.css`, `chessground.brown.css`, `chessground.cburnett.css`) are copied from `assets/`.

All imports verified to be relative (`./xxx.js`) — no bare specifiers.

**Copy commands:**
```bash
cp node_modules/chessground/dist/*.js assets/vendor/chessground/
cp node_modules/chessground/assets/*.css assets/vendor/chessground/
cp assets/vendor/chessground/chessground.js assets/vendor/chessground/chessground.mjs
```

**Usage:** Import from `./chessground.mjs` (or `./chessground.js`). Browser must serve with MIME type `application/javascript`.

---

## onnxruntime-web — v1.29.0

**Source:** `node_modules/onnxruntime-web/dist/*` (wasm/CPU backend only)
**Vendored as:** `assets/vendor/onnxruntime-web/`

Only the wasm/CPU inference backend is vendored (~14 MB):
- `ort.wasm.min.mjs` — ESM entry point (wasm-only, no static imports)
- `ort-wasm-simd-threaded.mjs` — wasm loader glue code
- `ort-wasm-simd-threaded.wasm` — the actual wasm binary (~14 MB)

All other backends (WebGL, WebGPU, JSPI, etc.) are omitted to reduce bundle size.

**Usage:** `import * as ort from './ort.wasm.min.mjs'`. Set `ort.env.wasm.wasmPaths = 'assets/vendor/onnxruntime-web/'` so the runtime finds the `.wasm` binary.

---

## Updating a lib

1. Update the exact version in `package.json` `devDependencies` (no `^` or `~`).
2. Run `npm install`.
3. Re-run the copy commands above.
4. Run `npm test` to verify the sanity test passes.
5. Commit `assets/vendor/**`, `package.json`, `package-lock.json`.
