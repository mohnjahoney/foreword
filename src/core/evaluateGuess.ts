export const WORD_LENGTH = 5

export type LetterResult = "absent" | "present" | "correct"

export function normalizeWord(word: string): string {
  return word.trim().toUpperCase()
}

export function evaluateGuess(guessInput: string, answerInput: string): LetterResult[] {
  const guess = normalizeWord(guessInput)
  const answer = normalizeWord(answerInput)
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error(`Guess and answer must both contain ${WORD_LENGTH} letters`)
  }

  const results: LetterResult[] = Array.from({ length: WORD_LENGTH }, () => "absent")
  const remaining = new Map<string, number>()
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    const guessLetter = guess[index]
    const answerLetter = answer[index]
    if (guessLetter === answerLetter) {
      results[index] = "correct"
    } else if (answerLetter !== undefined) {
      remaining.set(answerLetter, (remaining.get(answerLetter) ?? 0) + 1)
    }
  }
  for (let index = 0; index < WORD_LENGTH; index += 1) {
    if (results[index] === "correct") continue
    const letter = guess[index]
    if (letter === undefined) continue
    const available = remaining.get(letter) ?? 0
    if (available > 0) {
      results[index] = "present"
      remaining.set(letter, available - 1)
    }
  }
  return results
}
