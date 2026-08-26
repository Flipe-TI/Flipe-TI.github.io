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

## Move Map (AlphaZero 8×8×73) — reference for Task 3

Each legal move is encoded as `(fromSquare, moveType)`.

```
index = fromSquare * 73 + moveType
```

`fromSquare` uses the same coordinate system as above (`rank * 8 + file`, 0-indexed, from mover's perspective after rank-flip if Black to move).

### moveType breakdown (73 total)

| Range | Count | Meaning |
|-------|-------|---------|
| 0–55  | 56    | Queen-moves: 8 directions × 7 distances |
| 56–63 | 8     | Knight-moves |
| 64–72 | 9     | Underpromotions: 3 pieces (Knight, Bishop, Rook) × 3 directions (left-capture, push, right-capture) |

Queen-promotion counts as a queen-move (indices 0–55). Knight/Bishop/Rook promotions use the underpromotion slots (64–72).

Direction ordering for queen-moves (index = direction * 7 + (distance - 1)):

| Idx | Direction |
|-----|-----------|
| 0   | N  (+rank) |
| 1   | NE |
| 2   | E  (+file) |
| 3   | SE |
| 4   | S  (-rank) |
| 5   | SW |
| 6   | W  (-file) |
| 7   | NW |

Knight-move ordering (8 moves, indices 56–63): the 8 L-shapes in a fixed order (e.g. (+2,+1), (+2,-1), (-2,+1), (-2,-1), (+1,+2), (+1,-2), (-1,+2), (-1,-2)).

---

## meta.json

Every training batch file must include a `meta.json` with:

```json
{
  "encoding_version": "az-8x8x73-v1"
}
```

This allows the Python trainer to reject mismatched data batches before training begins.
