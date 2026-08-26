import nytAdditionalGuesses from "./wordlists/nytAdditionalGuesses.json"
import nytAnswers from "./wordlists/nytAnswers.json"
import { normalizeWord, WORD_LENGTH } from "./evaluateGuess"

export const ANSWER_WORDS = nytAnswers.map(normalizeWord).filter((word) => word.length === WORD_LENGTH)
export const ALLOWED_WORDS = [...nytAnswers, ...nytAdditionalGuesses]
  .map(normalizeWord)
  .filter((word) => word.length === WORD_LENGTH)

const ALLOWED_WORD_SET = new Set(ALLOWED_WORDS)

export function isAllowedWord(word: string): boolean {
  return ALLOWED_WORD_SET.has(normalizeWord(word))
}
