import { evaluateGuess, type LetterResult } from "./evaluateGuess"
import { ALLOWED_WORDS, ANSWER_WORDS } from "./words"

export const ROW_COUNT = 4

export interface ForewordRow {
  intendedGuess: string
  pattern: LetterResult[]
}

export interface ForewordPuzzle {
  target: string
  rows: ForewordRow[]
}

export interface PuzzleSetup {
  requireTargetLetterInEachRow?: boolean
  requireGreenTileInEachRow?: boolean
  useAnswerWordsForRows?: boolean
}

export function createForewordPuzzle(random = Math.random, setup: PuzzleSetup = {}): ForewordPuzzle {
  const target = choose(ANSWER_WORDS, random)
  const guessWords = setup.useAnswerWordsForRows ? ANSWER_WORDS : ALLOWED_WORDS
  const guesses = shuffled(guessWords, random)
    .filter((word) => word !== target)
    .filter((word) => !setup.requireTargetLetterInEachRow || evaluateGuess(word, target).some((result) => result !== "absent"))
    .filter((word) => !setup.requireGreenTileInEachRow || evaluateGuess(word, target).some((result) => result === "correct"))
    .slice(0, ROW_COUNT)

  if (guesses.length !== ROW_COUNT) {
    throw new Error(`Could not create a puzzle with ${ROW_COUNT} rows`)
  }

  return {
    target,
    rows: guesses.map((intendedGuess) => ({
      intendedGuess,
      pattern: evaluateGuess(intendedGuess, target),
    })),
  }
}

function choose<T>(items: readonly T[], random: () => number): T {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) throw new Error("Cannot choose from an empty list")
  return item
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    result[index] = result[swapIndex] as T
    result[swapIndex] = current as T
  }
  return result
}
