# Duplicate-letter choice in the green layer

This example shows why identical letters on the board may not be interchangeable when optimizing the path to a complete solution.

## Setup

Target word:

```text
RADON
```

Intended row words:

```text
BARES
CANOE
```

Their Wordle-style patterns against `RADON` are:

```text
BARES → X G Y X X
CANOE → X G Y G X
```

The shuffled board is:

```text
A C R E S
A B N O E
```

The second position in both rows is green and therefore must contain `A`. There are two visible `A` tiles that could be moved into the first green position.

## Better choice

Take the `A` from the beginning of row 2 and swap it with the `C` in row 1:

```text
A C R E S       A A R E S
A B N O E  →    C B N O E
```

Then swap the remaining `A` and `B`:

```text
A A R E S       B A R E S
C B N O E  →    C A N O E
```

The complete board is solved in **2 swaps**.

## Worse choice

Instead, take the `A` from the beginning of row 1:

```text
A C R E S  →  C A R E S
A B N O E     A B N O E
```

Then fix the second green position:

```text
C A R E S  →  C A R E S
A B N O E     B A N O E
```

The green positions are now correct, but `B` and `C` are in the wrong rows. One final swap is needed, for **3 swaps total**.

## Lesson

The green constraint determines the letter but not which physical copy to use. The best choice depends on what the displaced letter leaves behind and whether that supports plausible complete row words.

Therefore, an optimal solver for the full puzzle cannot treat duplicate letters as completely interchangeable. It needs at least a lightweight model of candidate words for each row.

The green layer by itself does not distinguish these choices: both choices can place the green `A`s in two swaps. The difference appears when optimizing the complete board.

## Gray tiles and accounted-for duplicates

A gray tile does not always mean that the letter is absent from the target.
It can also mean that all copies of that letter have already been accounted
for elsewhere in the same guess.

For a letter `E`, let:

- `N` be the number of `E`s in the target;
- `x` be the number of green `E`s in the guess; and
- `y` be the number of non-green `E`s to the left of the `E` in question.

Under Wordle's duplicate-letter handling, a non-green `E` is gray when:

```text
N <= x + y
```

It is yellow when `N > x + y`. Greens claim copies first, and the remaining
copies are assigned to non-green occurrences from left to right.

For example:

```text
Target: DERBY
Guess:  REEDY
Result: Y G X Y G
```

For the third-position `E`, `N = 1`, `x = 1`, and `y = 0`. The second-position
`E` has already claimed the target's only `E`, so the third-position `E` is
gray even though `E` does occur in the target.

## Future puzzle-construction idea

The current board starts with a random shuffle of the letters. Keep in mind a
future experiment in which the initial shuffle is selected or lightly shaped
to encourage global solving rather than localized fixing. Possible signals
could include fewer immediate two-letter improvements, useful letters being
distributed across rows, or swaps whose value depends on what they enable
elsewhere. Any such shaping must preserve solvability and should be tested
for whether it creates interesting tradeoffs rather than arbitrary friction.
