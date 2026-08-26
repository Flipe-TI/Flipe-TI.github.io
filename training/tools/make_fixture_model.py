"""
make_fixture_model.py — Build a minimal random-weight ONNX fixture model.

This is a throwaway placeholder so the inference pipeline (OnnxOpponent) can
be proven end-to-end BEFORE a real trained model exists (Phase 2).

Graph (BOTTLENECK architecture):
  Input  "board"  float32 [1, 18, 8, 8]
  Flatten → [1, 1152]
  Gemm (W1=[1152, 64], bias1=[64]) → [1, 64]
  Relu → [1, 64]
  Gemm (W2=[64, 4672], bias2=[4672]) → [1, 4672]
  Output "policy" float32 [1, 4672]

Usage:
  python training/tools/make_fixture_model.py

Outputs (overwrite):
  assets/models/felipe-chess/model.onnx
  assets/models/felipe-chess/meta.json
"""

import json
import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper, checker

SEED = 42
INPUT_PLANES = 18
BOARD_SIZE = 8
FLAT_SIZE = INPUT_PLANES * BOARD_SIZE * BOARD_SIZE  # 1152
HIDDEN_SIZE = 64
POLICY_SIZE = 4672
OPSET = 17

rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------------------
# Random initializers (bottleneck: 1152 -> 64 -> 4672)
# ---------------------------------------------------------------------------
W1 = rng.standard_normal((FLAT_SIZE, HIDDEN_SIZE)).astype(np.float32)
B1 = rng.standard_normal((HIDDEN_SIZE,)).astype(np.float32)
W2 = rng.standard_normal((HIDDEN_SIZE, POLICY_SIZE)).astype(np.float32)
B2 = rng.standard_normal((POLICY_SIZE,)).astype(np.float32)

W1_init = numpy_helper.from_array(W1, name="gemm_W1")
B1_init = numpy_helper.from_array(B1, name="gemm_B1")
W2_init = numpy_helper.from_array(W2, name="gemm_W2")
B2_init = numpy_helper.from_array(B2, name="gemm_B2")

# ---------------------------------------------------------------------------
# Graph nodes (bottleneck)
# ---------------------------------------------------------------------------
flatten_node = helper.make_node(
    op_type="Flatten",
    inputs=["board"],
    outputs=["flat"],
    axis=1,          # Flatten from dim 1 onwards: [1,18,8,8] → [1,1152]
)

gemm1_node = helper.make_node(
    op_type="Gemm",
    inputs=["flat", "gemm_W1", "gemm_B1"],
    outputs=["hidden"],
    transB=0,        # W1 is [1152, 64]
)

relu_node = helper.make_node(
    op_type="Relu",
    inputs=["hidden"],
    outputs=["hidden_relu"],
)

gemm2_node = helper.make_node(
    op_type="Gemm",
    inputs=["hidden_relu", "gemm_W2", "gemm_B2"],
    outputs=["policy"],
    transB=0,        # W2 is [64, 4672]
)

# ---------------------------------------------------------------------------
# Graph I/O types
# ---------------------------------------------------------------------------
board_input = helper.make_tensor_value_info(
    name="board",
    elem_type=TensorProto.FLOAT,
    shape=[1, INPUT_PLANES, BOARD_SIZE, BOARD_SIZE],
)

policy_output = helper.make_tensor_value_info(
    name="policy",
    elem_type=TensorProto.FLOAT,
    shape=[1, POLICY_SIZE],
)

# ---------------------------------------------------------------------------
# Assemble graph + model
# ---------------------------------------------------------------------------
graph = helper.make_graph(
    nodes=[flatten_node, gemm1_node, relu_node, gemm2_node],
    name="fixture-chess-policy",
    inputs=[board_input],
    outputs=[policy_output],
    initializer=[W1_init, B1_init, W2_init, B2_init],
)

model = helper.make_model(
    graph,
    opset_imports=[helper.make_opsetid("", OPSET)],
)
model.ir_version = 8  # IR v8 — widely supported by onnxruntime 1.x
model.doc_string = (
    "Random-weight fixture model for the felipe-chess bot. "
    "Encoding: az-8x8x73-v1. Replace with trained weights in Phase 2."
)

checker.check_model(model)

# ---------------------------------------------------------------------------
# Write outputs
# ---------------------------------------------------------------------------
repo_root = os.path.join(os.path.dirname(__file__), "..", "..")
out_dir = os.path.join(repo_root, "assets", "models", "felipe-chess")
os.makedirs(out_dir, exist_ok=True)

onnx_path = os.path.join(out_dir, "model.onnx")
onnx.save(model, onnx_path)
print(f"Wrote {onnx_path} ({os.path.getsize(onnx_path):,} bytes)")

meta = {
    "encoding_version": "az-8x8x73-v1",
    "input_name": "board",
    "output_name": "policy",
    "input_shape": [1, INPUT_PLANES, BOARD_SIZE, BOARD_SIZE],
    "policy_size": POLICY_SIZE,
    "fixture": True,
    "note": "bottleneck 1152->64->4672 random fixture, replaced by trained model in Phase 2",
}
meta_path = os.path.join(out_dir, "meta.json")
with open(meta_path, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)
    f.write("\n")
print(f"Wrote {meta_path}")
