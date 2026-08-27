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
  minGreenTiles?: number
  minYellowTiles?: number
  useAnswerWordsForRows?: boolean
  wordListMode?: "easy" | "hard"
}

export function createForewordPuzzle(random = Math.random, setup: PuzzleSetup = {}): ForewordPuzzle {
  const useSmallList = setup.wordListMode === "easy" || (setup.wordListMode === undefined && setup.useAnswerWordsForRows === true)
  const wordList = setup.wordListMode === "hard" ? ALLOWED_WORDS : ANSWER_WORDS
  const target = choose(wordList, random)
  const guessWords = useSmallList ? ANSWER_WORDS : ALLOWED_WORDS
  const patterns = new Set<string>()
  const candidates: Array<{ word: string; pattern: LetterResult[] }> = []

  for (const word of shuffled(guessWords, random)) {
    if (word === target) continue

    const pattern = evaluateGuess(word, target)
    if (setup.requireTargetLetterInEachRow && !pattern.some((result) => result !== "absent")) continue
    if (setup.requireGreenTileInEachRow && !pattern.some((result) => result === "correct")) continue

    const signature = pattern.join("")
    if (patterns.has(signature)) continue

    patterns.add(signature)
    candidates.push({ word, pattern })
  }

  const guesses = chooseRows(candidates, setup)
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

function chooseRows(
  candidates: Array<{ word: string; pattern: LetterResult[] }>,
  setup: PuzzleSetup,
): Array<{ word: string; pattern: LetterResult[] }> {
  const guesses = candidates.slice(0, ROW_COUNT)
  const minGreenTiles = setup.minGreenTiles ?? 0
  const minYellowTiles = setup.minYellowTiles ?? 0
  const consideredWords = new Set(guesses.map((guess) => guess.word))

  while (!meetsTileMinimums(guesses, minGreenTiles, minYellowTiles)) {
    const removableIndex = guesses.reduce((leastHelpfulIndex, guess, index, rows) => {
      if (tileHelpfulness(guess) < tileHelpfulness(rows[leastHelpfulIndex]!)) return index
      return leastHelpfulIndex
    }, 0)
    const remainingPatterns = new Set(guesses.map((guess, index) => index === removableIndex ? "" : guess.pattern.join("")))
    const replacement = candidates
      .filter((candidate) => !consideredWords.has(candidate.word))
      .filter((candidate) => !remainingPatterns.has(candidate.pattern.join("")))
      .sort((first, second) => tileHelpfulness(second) - tileHelpfulness(first))[0]

    if (replacement === undefined) return guesses
    consideredWords.add(replacement.word)
    guesses[removableIndex] = replacement
  }

  return guesses
}

function meetsTileMinimums(
  guesses: Array<{ word: string; pattern: LetterResult[] }>,
  minGreenTiles: number,
  minYellowTiles: number,
): boolean {
  const counts = guesses.reduce(
    (totals, guess) => {
      guess.pattern.forEach((result) => {
        if (result === "correct") totals.green += 1
        if (result === "present") totals.yellow += 1
      })
      return totals
    },
    { green: 0, yellow: 0 },
  )
  return counts.green >= minGreenTiles && counts.yellow >= minYellowTiles
}

function tileHelpfulness(guess: { pattern: LetterResult[] }): number {
  return guess.pattern.filter((result) => result === "correct" || result === "present").length
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
