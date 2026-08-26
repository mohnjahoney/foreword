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
const ROW_GAP = 78
const POOL_LEFT = 52
const POOL_TOP = 548
const POOL_COLUMNS = 10

interface TileVisual {
  tile: LetterTile
  background: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
}

export class MainScene extends Phaser.Scene {
  private puzzle!: ForewordPuzzle
  private tileSlots: TileVisual[] = []
  private selectedSlot: number | undefined
  private message!: Phaser.GameObjects.Text
  private rowOutlines: Phaser.GameObjects.Rectangle[] = []

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
    this.buildPatterns()
    this.buildTilePool()
    this.message = this.add.text(31, 650, "Tap two letters to swap them.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px", wordWrap: { width: 365 } })
  }

  private buildPatterns(): void {
    this.puzzle.rows.forEach((row, rowIndex) => {
      const y = ROW_TOP + rowIndex * ROW_GAP
      this.add.text(31, y + 14, `${rowIndex + 1}`, { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "13px", fontStyle: "bold" })
      this.rowOutlines.push(this.add.rectangle(ROW_LEFT - 7, y - 7, 5 * CELL_SIZE + 4 * CELL_GAP + 14, CELL_SIZE + 14).setOrigin(0, 0).setFillStyle(0, 0).setStrokeStyle(0).setDepth(2))
      row.pattern.forEach((result, index) => {
        this.add.rectangle(ROW_LEFT + index * (CELL_SIZE + CELL_GAP), y, CELL_SIZE, CELL_SIZE, this.colorFor(result)).setOrigin(0, 0)
      })
    })
  }

  private buildTilePool(): void {
    const board = createScrambledBoard(this.puzzle)
    board.tiles.forEach((tile, slotIndex) => {
      const { x, y } = this.slotPosition(slotIndex)
      const background = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, COLORS.tile).setOrigin(0, 0).setInteractive({ useHandCursor: true })
      const text = this.add.text(x + CELL_SIZE / 2, y + CELL_SIZE / 2, tile.letter, { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "27px", fontStyle: "bold" }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      background.on("pointerdown", () => this.selectTile(slotIndex))
      text.on("pointerdown", () => this.selectTile(slotIndex))
      this.tileSlots.push({ tile, background, text })
    })
  }

  private selectTile(slotIndex: number): void {
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
    this.animateTile(second, firstSlot)
    this.animateTile(first, secondSlot)
    this.message.setText("Letters swapped. Keep going.")
    this.updateRowFeedback()
  }

  private animateTile(visual: TileVisual, slotIndex: number): void {
    const { x, y } = this.slotPosition(slotIndex)
    this.tweens.add({ targets: [visual.background, visual.text], x, y, duration: 220, ease: "Cubic.easeOut" })
  }

  private updateSelection(): void {
    this.tileSlots.forEach((visual, slotIndex) => visual.background.setStrokeStyle(slotIndex === this.selectedSlot ? 3 : 0, COLORS.selected))
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
    return { x: POOL_LEFT + (slotIndex % POOL_COLUMNS) * (CELL_SIZE + CELL_GAP), y: POOL_TOP + Math.floor(slotIndex / POOL_COLUMNS) * (CELL_SIZE + CELL_GAP) }
  }

  private colorFor(result: ForewordPuzzle["rows"][number]["pattern"][number]): number {
    return COLORS[result]
  }
}

function patternsMatch(
  actual: ForewordPuzzle["rows"][number]["pattern"],
  expected: ForewordPuzzle["rows"][number]["pattern"],
): boolean {
  return actual.every((result, index) => result === expected[index])
}
