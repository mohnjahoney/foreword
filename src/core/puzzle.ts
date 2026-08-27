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
  wordListMode?: "easy" | "hard"
}

export function createForewordPuzzle(random = Math.random, setup: PuzzleSetup = {}): ForewordPuzzle {
  const useSmallList = setup.wordListMode === "easy" || (setup.wordListMode === undefined && setup.useAnswerWordsForRows === true)
  const wordList = setup.wordListMode === "hard" ? ALLOWED_WORDS : ANSWER_WORDS
  const target = choose(wordList, random)
  const guessWords = useSmallList ? ANSWER_WORDS : ALLOWED_WORDS
  const patterns = new Set<string>()
  const guesses: Array<{ word: string; pattern: LetterResult[] }> = []

  for (const word of shuffled(guessWords, random)) {
    if (word === target) continue

    const pattern = evaluateGuess(word, target)
    if (setup.requireTargetLetterInEachRow && !pattern.some((result) => result !== "absent")) continue
    if (setup.requireGreenTileInEachRow && !pattern.some((result) => result === "correct")) continue

    const signature = pattern.join("")
    if (patterns.has(signature)) continue

    patterns.add(signature)
    guesses.push({ word, pattern })
    if (guesses.length === ROW_COUNT) break
  }

  if (guesses.length !== ROW_COUNT) {
    throw new Error(`Could not create a puzzle with ${ROW_COUNT} rows`)
  }

  return {
    target,
    rows: guesses.map(({ word, pattern }) => ({
      intendedGuess: word,
      pattern,
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
