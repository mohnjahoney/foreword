import { evaluateGuess, normalizeWord, WORD_LENGTH } from "./evaluateGuess"
import { ALLOWED_WORDS } from "./words"
import type { ForewordPuzzle, ForewordRow } from "./puzzle"

export function countCompleteSolutions(
  puzzle: ForewordPuzzle,
  maxSolutions = 3,
  words: readonly string[] = ALLOWED_WORDS,
): number {
  if (maxSolutions < 1) return 0
  const candidates = puzzle.rows.map((row) => candidatesForRow(puzzle, row, words))
  const tileCounts = letterCounts(puzzle.rows.map((row) => row.intendedGuess).join(""))
  let solutions = 0

  function search(rowIndex: number, remaining: Map<string, number>): void {
    if (solutions >= maxSolutions) return
    if (rowIndex === candidates.length) {
      solutions += 1
      return
    }

    for (const candidate of candidates[rowIndex] ?? []) {
      if (!canUse(candidate, remaining)) continue
      const nextRemaining = new Map(remaining)
      consume(candidate, nextRemaining)
      search(rowIndex + 1, nextRemaining)
      if (solutions >= maxSolutions) return
    }
  }

  search(0, tileCounts)
  return solutions
}

function candidatesForRow(
  puzzle: ForewordPuzzle,
  row: ForewordRow,
  words: readonly string[],
): string[] {
  return words.filter((word) => {
    const normalized = normalizeWord(word)
    return normalized.length === WORD_LENGTH && patternsMatch(
      evaluateGuess(normalized, puzzle.target),
      row.pattern,
    )
  })
}

function letterCounts(letters: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1)
  return counts
}

function canUse(word: string, remaining: Map<string, number>): boolean {
  const needed = letterCounts(word)
  for (const [letter, count] of needed) {
    if ((remaining.get(letter) ?? 0) < count) return false
  }
  return true
}

function consume(word: string, remaining: Map<string, number>): void {
  for (const [letter, count] of letterCounts(word)) {
    remaining.set(letter, (remaining.get(letter) ?? 0) - count)
  }
}

function patternsMatch(
  actual: ForewordRow["pattern"],
  expected: ForewordRow["pattern"],
): boolean {
  return actual.every((result, index) => result === expected[index])
}
