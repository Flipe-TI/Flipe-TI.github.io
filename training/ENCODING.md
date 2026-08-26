# Chess Position Encoding Contract

**encoding_version:** `az-8x8x73-v1`

This document is the authoritative specification for how a chess position (FEN) is encoded into an input tensor. Any reimplementation (e.g. Python/NumPy in Phase 2) must produce identical tensors for the same FEN.

---

## Input Tensor Shape

```
[PLANES, 8, 8]  →  PLANES = 18
```

Flattened length: `18 × 64 = 1152` (Float32).

---

## Coordinate System

- **rank 0** = bottom row = White's first rank (rank 1 in chess notation).
- **rank 7** = top row = White's eighth rank.
- **file 0** = a-file, **file 7** = h-file.

Index formula:

```
index = plane * 64 + rank * 8 + file
```

FEN encodes ranks from 8 down to 1 (top to bottom), so FEN row `i` (0-indexed from top) maps to internal rank `7 - i`.

---

## Perspective: always the side to move

The tensor is **always encoded from the perspective of the side to move** ("me").

- If **White** to move: no transformation needed.
- If **Black** to move:
  - **Rank-flip**: internal rank `r` becomes `7 - r` (vertical mirror).
  - **Color-swap**: Black pieces become "my" pieces (planes 0–5); White pieces become "opponent" pieces (planes 6–11).
  - File order is **not** changed (no horizontal flip).

After this transform, "my" pieces always appear near the bottom ranks regardless of which color is moving.

---

## Plane Layout (18 planes total)

| Plane | Content |
|-------|---------|
| 0  | My Pawns |
| 1  | My Knights |
| 2  | My Bishops |
| 3  | My Rooks |
| 4  | My Queens |
| 5  | My King |
| 6  | Opponent Pawns |
| 7  | Opponent Knights |
| 8  | Opponent Bishops |
| 9  | Opponent Rooks |
| 10 | Opponent Queens |
| 11 | Opponent King |
| 12 | Side to move (constant **1.0** everywhere, all 64 cells) |
| 13 | My castling — kingside (all 1.0 if right exists, else 0.0) |
| 14 | My castling — queenside (all 1.0 if right exists, else 0.0) |
| 15 | Opponent castling — kingside (all 1.0 if right exists, else 0.0) |
| 16 | Opponent castling — queenside (all 1.0 if right exists, else 0.0) |
| 17 | En-passant target square (1.0 at the target square, else 0.0) |

Castling rights are **relative to the mover**: planes 13–14 always refer to the side to move's rights (K/Q for White-to-move, k/q for Black-to-move), and planes 15–16 to the opponent's rights.

The en-passant square is rank-flipped by the same transform applied to pieces when Black is to move.

All values are `1.0` or `0.0`.

---

## Move encoding — 8x8x73 = 4672 (FROZEN, binding for JS and Python)

Index of a move = fromSquare * 73 + moveType, where fromSquare = rank*8 + file
(in the side-to-move perspective, same orientation as the position encoding).
moveType is 0..72:

- moveType 0..55 — "queen moves": 8 directions x 7 distances.
  Direction order (index d = 0..7), each a (file_delta, rank_delta) unit step:
    0: N  ( 0, +1)
    1: NE (+1, +1)
    2: E  (+1,  0)
    3: SE (+1, -1)
    4: S  ( 0, -1)
    5: SW (-1, -1)
    6: W  (-1,  0)
    7: NW (-1, +1)
  distance k = 1..7. moveType = d*7 + (k-1).
  (Normal moves and QUEEN promotions both use this range — a queen promotion
   is just the 1-step forward/diagonal queen move.)

- moveType 56..63 — knight moves, in this FROZEN order (knight index j = 0..7),
  each (file_delta, rank_delta):
    56: ( +1, +2 )
    57: ( +2, +1 )
    58: ( +2, -1 )
    59: ( +1, -2 )
    60: ( -1, -2 )
    61: ( -2, -1 )
    62: ( -2, +1 )
    63: ( -1, +2 )

- moveType 64..72 — underpromotions (promotion to knight, bishop, or rook only;
  queen promotion uses the queen-move range above). moveType = 64 + dir*3 + piece,
  where:
    dir  = 0 (capture-left, file_delta -1), 1 (push, file_delta 0), 2 (capture-right, file_delta +1)
           (rank_delta is always +1, toward promotion, in the mover's perspective)
    piece = 0 (knight), 1 (bishop), 2 (rook)

---

## meta.json

Every training batch file must include a `meta.json` with:

```json
{
  "encoding_version": "az-8x8x73-v1"
}
```

This allows the Python trainer to reject mismatched data batches before training begins.
