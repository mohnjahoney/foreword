import Phaser from "phaser"
import { createScrambledBoard, type LetterTile } from "../core/board"
import { evaluateGuess } from "../core/evaluateGuess"
import { createForewordPuzzle, type ForewordPuzzle } from "../core/puzzle"
import { isAllowedWord } from "../core/words"

const COLORS = { ink: "#211f1a", muted: "#756d5e", absent: 0xaaa396, present: 0xc49f52, correct: 0x71845f, selected: 0x665d4f, tile: 0xc6bdae } as const
const CELL_SIZE = 52
const CELL_GAP = 7
const ROW_LEFT = 75
const ROW_TOP = 175

interface TileVisual {
  tile: LetterTile
  text: Phaser.GameObjects.Text
}

export class MainScene extends Phaser.Scene {
  private puzzle!: ForewordPuzzle
  private tileSlots: TileVisual[] = []
  private slotBackgrounds: Phaser.GameObjects.Rectangle[] = []
  private selectedSlot: number | undefined
  private message!: Phaser.GameObjects.Text
  private rowOutlines: Phaser.GameObjects.Rectangle[] = []
  private swapDirection = 1
  private swapAnimating = false

  constructor() {
    super("main")
  }

  create(): void {
    this.puzzle = createForewordPuzzle()
    this.add.text(30, 28, "FOREWORD", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "32px", fontStyle: "bold" })
    this.add.text(31, 70, "Reassemble the four words from one shared pool.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px" })
    const newPuzzle = this.add.text(398, 35, "NEW PUZZLE", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
    newPuzzle.on("pointerdown", () => this.scene.restart())

    this.add.text(31, 112, "TARGET", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold", letterSpacing: 2 })
    this.add.text(31, 127, this.puzzle.target, { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "28px", fontStyle: "bold" })
    this.buildBoard()
    this.message = this.add.text(31, 530, "Tap two letters to swap them.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px", wordWrap: { width: 365 } })
  }

  private buildBoard(): void {
    const board = createScrambledBoard(this.puzzle)
    this.puzzle.rows.forEach((row, rowIndex) => {
      const y = ROW_TOP + rowIndex * (CELL_SIZE + CELL_GAP + 26)
      this.add.text(31, y + 14, `${rowIndex + 1}`, { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "13px", fontStyle: "bold" })
      this.rowOutlines.push(this.add.rectangle(ROW_LEFT - 7, y - 7, 5 * CELL_SIZE + 4 * CELL_GAP + 14, CELL_SIZE + 14).setOrigin(0, 0).setFillStyle(0, 0).setStrokeStyle(0).setDepth(2))
      row.pattern.forEach((result, index) => {
        const slotIndex = rowIndex * 5 + index
        const x = ROW_LEFT + index * (CELL_SIZE + CELL_GAP)
        const background = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, this.colorFor(result)).setOrigin(0, 0).setDepth(0).setInteractive({ useHandCursor: true })
        background.on("pointerdown", () => this.selectTile(slotIndex))
        this.slotBackgrounds.push(background)

        const tile = board.tiles[slotIndex]
        if (tile === undefined) return
        const text = this.add.text(x + CELL_SIZE / 2, y + CELL_SIZE / 2, tile.letter, { color: "#fffaf0", fontFamily: "Arial, sans-serif", fontSize: "27px", fontStyle: "bold" }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true })
        text.on("pointerdown", () => this.selectTile(slotIndex))
        this.tileSlots.push({ tile, text })
      })
    })
  }

  private selectTile(slotIndex: number): void {
    if (this.swapAnimating) return
    if (this.selectedSlot === undefined) {
      this.selectedSlot = slotIndex
      this.updateSelection()
      return
    }
    if (this.selectedSlot === slotIndex) {
      this.selectedSlot = undefined
      this.updateSelection()
      return
    }
    const firstSlot = this.selectedSlot
    this.swapTiles(firstSlot, slotIndex)
    this.selectedSlot = undefined
    this.updateSelection()
  }

  private swapTiles(firstSlot: number, secondSlot: number): void {
    const first = this.tileSlots[firstSlot]
    const second = this.tileSlots[secondSlot]
    if (first === undefined || second === undefined) return
    this.tileSlots[firstSlot] = second
    this.tileSlots[secondSlot] = first
    this.animateExchange(first, second, firstSlot, secondSlot)
    this.message.setText("Letters swapped. Keep going.")
    this.updateRowFeedback()
  }

  private animateExchange(first: TileVisual, second: TileVisual, firstSlot: number, secondSlot: number): void {
    const startFirst = this.slotCenter(firstSlot)
    const startSecond = this.slotCenter(secondSlot)
    const distanceX = startSecond.x - startFirst.x
    const distanceY = startSecond.y - startFirst.y
    const distance = Math.hypot(distanceX, distanceY)
    const perpendicular = { x: -distanceY / distance, y: distanceX / distance }
    const arcHeight = Math.min(40, Math.max(20, distance * 0.3))
    const midpoint = { x: (startFirst.x + startSecond.x) / 2, y: (startFirst.y + startSecond.y) / 2 }
    const firstControl = {
      x: midpoint.x + perpendicular.x * arcHeight * this.swapDirection,
      y: midpoint.y + perpendicular.y * arcHeight * this.swapDirection,
    }
    const secondControl = {
      x: midpoint.x - perpendicular.x * arcHeight * this.swapDirection,
      y: midpoint.y - perpendicular.y * arcHeight * this.swapDirection,
    }
    this.swapDirection *= -1
    this.swapAnimating = true
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 300,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const progress = tween.getValue()
        if (progress === null) return
        const firstPoint = quadraticPoint(startFirst, firstControl, startSecond, progress)
        const secondPoint = quadraticPoint(startSecond, secondControl, startFirst, progress)
        first.text.setPosition(firstPoint.x, firstPoint.y)
        second.text.setPosition(secondPoint.x, secondPoint.y)
      },
      onComplete: () => {
        first.text.setPosition(startSecond.x, startSecond.y).setDepth(10)
        second.text.setPosition(startFirst.x, startFirst.y).setDepth(10)
        this.swapAnimating = false
        this.updateRowFeedback()
      },
    })
  }

  private updateSelection(): void {
    this.slotBackgrounds.forEach((background, slotIndex) => background.setStrokeStyle(slotIndex === this.selectedSlot ? 3 : 0, COLORS.selected))
  }

  private updateRowFeedback(): void {
    this.puzzle.rows.forEach((row, rowIndex) => {
      const word = this.tileSlots
        .slice(rowIndex * 5, (rowIndex + 1) * 5)
        .map((visual) => visual.tile.letter)
        .join("")
      const outline = this.rowOutlines[rowIndex]
      if (outline === undefined) return
      if (word === row.intendedGuess) {
        outline.setStrokeStyle(4, 0x4c7b43)
      } else if (isAllowedWord(word) && patternsMatch(evaluateGuess(word, this.puzzle.target), row.pattern)) {
        outline.setStrokeStyle(4, 0xc49f52)
      } else {
        outline.setStrokeStyle(0)
      }
    })
  }

  private slotPosition(slotIndex: number): { x: number; y: number } {
    const rowIndex = Math.floor(slotIndex / 5)
    const columnIndex = slotIndex % 5
    return {
      x: ROW_LEFT + columnIndex * (CELL_SIZE + CELL_GAP),
      y: ROW_TOP + rowIndex * (CELL_SIZE + CELL_GAP + 26),
    }
  }

  private slotCenter(slotIndex: number): { x: number; y: number } {
    const position = this.slotPosition(slotIndex)
    return { x: position.x + CELL_SIZE / 2, y: position.y + CELL_SIZE / 2 }
  }

  private colorFor(result: ForewordPuzzle["rows"][number]["pattern"][number]): number {
    return COLORS[result]
  }
}

function quadraticPoint(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  progress: number,
): { x: number; y: number } {
  const remaining = 1 - progress
  return {
    x: remaining * remaining * start.x + 2 * remaining * progress * control.x + progress * progress * end.x,
    y: remaining * remaining * start.y + 2 * remaining * progress * control.y + progress * progress * end.y,
  }
}

function patternsMatch(
  actual: ForewordPuzzle["rows"][number]["pattern"],
  expected: ForewordPuzzle["rows"][number]["pattern"],
): boolean {
  return actual.every((result, index) => result === expected[index])
}
