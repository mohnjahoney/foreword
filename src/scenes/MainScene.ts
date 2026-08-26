import Phaser from "phaser"
import { createScrambledBoard, type LetterTile } from "../core/board"
import { evaluateGuess } from "../core/evaluateGuess"
import { createForewordPuzzle, type ForewordPuzzle, type PuzzleSetup } from "../core/puzzle"
import { ANSWER_WORDS, isAllowedWord } from "../core/words"

const COLORS = { ink: "#211f1a", muted: "#756d5e", absent: 0xaaa396, present: 0xc49f52, correct: 0x71845f, selected: 0x665d4f, tile: 0xc6bdae } as const
const CELL_SIZE = 52
const CELL_GAP = 7
const ROW_LEFT = 75
const ROW_TOP = 175

interface TileVisual {
  tile: LetterTile
  text: Phaser.GameObjects.Text
}

interface SceneData extends PuzzleSetup {}
type InteractionMode = "swap" | "reveal"

export class MainScene extends Phaser.Scene {
  private puzzle!: ForewordPuzzle
  private tileSlots: TileVisual[] = []
  private slotBackgrounds: Phaser.GameObjects.Rectangle[] = []
  private tileOutlines: Phaser.GameObjects.Rectangle[] = []
  private selectedSlot: number | undefined
  private message!: Phaser.GameObjects.Text
  private rowOutlines: Phaser.GameObjects.Rectangle[] = []
  private swapDirection = 1
  private swapAnimating = false
  private requireTargetLetterInEachRow = false
  private requireGreenTileInEachRow = false
  private useAnswerWordsForRows = false
  private devPanel!: Phaser.GameObjects.Container
  private devOverlay!: Phaser.GameObjects.Rectangle
  private devPanelBackground!: Phaser.GameObjects.Rectangle
  private devCloseButton!: Phaser.GameObjects.Text
  private devToggle!: Phaser.GameObjects.Rectangle
  private devGreenToggle!: Phaser.GameObjects.Rectangle
  private devAnswerWordsToggle!: Phaser.GameObjects.Rectangle
  private interactionMode: InteractionMode = "swap"
  private normalModeButton!: Phaser.GameObjects.Rectangle
  private revealModeButton!: Phaser.GameObjects.Rectangle

  constructor() {
    super("main")
  }

  create(data: SceneData = {}): void {
    this.tileSlots = []
    this.slotBackgrounds = []
    this.tileOutlines = []
    this.rowOutlines = []
    this.selectedSlot = undefined
    this.swapAnimating = false
    this.interactionMode = "swap"
    this.requireTargetLetterInEachRow = data.requireTargetLetterInEachRow ?? false
    this.requireGreenTileInEachRow = data.requireGreenTileInEachRow ?? false
    this.useAnswerWordsForRows = data.useAnswerWordsForRows ?? false
    this.puzzle = createForewordPuzzle(Math.random, {
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      useAnswerWordsForRows: this.useAnswerWordsForRows,
    })
    this.add.text(30, 28, "FOREWORD", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "32px", fontStyle: "bold" })
    this.add.text(31, 70, "Reassemble the four words from one shared pool.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px" })
    const newPuzzle = this.add.text(398, 35, "NEW PUZZLE", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setPadding(14, 10).setInteractive({ useHandCursor: true })
    newPuzzle.on("pointerdown", () => this.scene.restart({
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      useAnswerWordsForRows: this.useAnswerWordsForRows,
    }))
    const devButton = this.add.text(398, 66, "DEV", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setPadding(14, 10).setInteractive({ useHandCursor: true })
    devButton.on("pointerdown", () => this.setDevPanelVisible(!this.devPanel.visible))

    this.add.text(31, 112, "TARGET", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold", letterSpacing: 2 })
    this.add.text(31, 127, this.puzzle.target, { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "28px", fontStyle: "bold" })
    this.buildBoard()
    this.message = this.add.text(31, 530, "Tap two letters to swap them.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px", wordWrap: { width: 365 } })
    this.buildInteractionTools()
    this.buildDevPanel()
  }

  private buildInteractionTools(): void {
    const normalX = 31
    const revealX = 182
    const y = 590
    this.normalModeButton = this.add.rectangle(normalX, y, 138, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    this.revealModeButton = this.add.rectangle(revealX, y, 152, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    const normalLabel = this.add.text(normalX + 69, y + 21, "↔  NORMAL", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5)
    const revealLabel = this.add.text(revealX + 76, y + 21, "REVEAL TOOL", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5)
    this.normalModeButton.on("pointerdown", () => this.setInteractionMode("swap"))
    this.revealModeButton.on("pointerdown", () => this.setInteractionMode("reveal"))
    this.setInteractionMode("swap")
    normalLabel.setDepth(1)
    revealLabel.setDepth(1)
  }

  private setInteractionMode(mode: InteractionMode): void {
    this.interactionMode = mode
    this.normalModeButton?.setFillStyle(mode === "swap" ? 0x71845f : 0xc6bdae)
    this.revealModeButton?.setFillStyle(mode === "reveal" ? 0x71845f : 0xc6bdae)
    if (this.message !== undefined) {
      this.message.setText(mode === "swap" ? "Tap two letters to swap them." : "Tap a square to reveal its letter.")
    }
  }

  private buildDevPanel(): void {
    this.devOverlay = this.add.rectangle(0, 0, 430, 760, 0x000000, 0).setOrigin(0, 0).setDepth(49).setInteractive()
    this.devOverlay.on("pointerdown", () => this.setDevPanelVisible(false))
    this.devPanel = this.add.container(25, 95).setDepth(50)
    const panel = this.add.rectangle(0, 0, 380, 325, 0xfaf6e9).setOrigin(0, 0).setStrokeStyle(2, 0x756d5e).setInteractive()
    const heading = this.add.text(20, 18, "PUZZLE SETUP", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "14px", fontStyle: "bold", letterSpacing: 1 })
    const close = this.add.text(355, 18, "CLOSE", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold" }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
    close.on("pointerdown", () => this.setDevPanelVisible(false))
    const toggleLabel = this.add.text(20, 68, "Each row shares a letter with target", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "15px", wordWrap: { width: 285 } })
    this.devToggle = this.add.rectangle(330, 73, 30, 18).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.devToggle.on("pointerdown", () => {
      this.requireTargetLetterInEachRow = !this.requireTargetLetterInEachRow
      this.updateDevToggle()
    })
    const greenLabel = this.add.text(20, 122, "Each row has at least one green tile", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "15px", wordWrap: { width: 285 } })
    this.devGreenToggle = this.add.rectangle(330, 127, 30, 18).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.devGreenToggle.on("pointerdown", () => {
      this.requireGreenTileInEachRow = !this.requireGreenTileInEachRow
      this.updateDevToggle()
    })
    const answerWordsLabel = this.add.text(20, 176, "Draw rows from the smaller answer list", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "15px", wordWrap: { width: 285 } })
    this.devAnswerWordsToggle = this.add.rectangle(330, 181, 30, 18).setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.devAnswerWordsToggle.on("pointerdown", () => {
      this.useAnswerWordsForRows = !this.useAnswerWordsForRows
      this.updateDevToggle()
    })
    const note = this.add.text(20, 235, "Changes take effect when the panel closes.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "14px", wordWrap: { width: 330 } })
    this.devPanel.add([panel, heading, close, toggleLabel, this.devToggle, greenLabel, this.devGreenToggle, answerWordsLabel, this.devAnswerWordsToggle, note])
    this.devPanelBackground = panel
    this.devCloseButton = close
    this.updateDevToggle()
    this.setDevPanelVisible(false)
  }

  private setDevPanelVisible(visible: boolean): void {
    if (!visible && this.devPanel.visible && !this.puzzleSatisfiesSetup(this.currentPuzzleSetup())) {
      this.scene.restart(this.currentPuzzleSetup())
      return
    }
    this.devPanel.setVisible(visible)
    if (visible) {
      this.devOverlay.setInteractive()
      this.devPanelBackground.setInteractive()
      this.devCloseButton.setInteractive({ useHandCursor: true })
      this.devToggle.setInteractive({ useHandCursor: true })
      this.devGreenToggle.setInteractive({ useHandCursor: true })
      this.devAnswerWordsToggle.setInteractive({ useHandCursor: true })
    } else {
      this.devOverlay.disableInteractive()
      this.devPanelBackground.disableInteractive()
      this.devCloseButton.disableInteractive()
      this.devToggle.disableInteractive()
      this.devGreenToggle.disableInteractive()
      this.devAnswerWordsToggle.disableInteractive()
    }
  }

  private currentPuzzleSetup(): PuzzleSetup {
    return {
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      useAnswerWordsForRows: this.useAnswerWordsForRows,
    }
  }

  private puzzleSatisfiesSetup(setup: PuzzleSetup): boolean {
    return this.puzzle.rows.every((row) => {
      if (setup.requireTargetLetterInEachRow && !row.pattern.some((result) => result !== "absent")) return false
      if (setup.requireGreenTileInEachRow && !row.pattern.some((result) => result === "correct")) return false
      if (setup.useAnswerWordsForRows && !ANSWER_WORDS.includes(row.intendedGuess)) return false
      return true
    })
  }

  private updateDevToggle(): void {
    this.devToggle.setFillStyle(this.requireTargetLetterInEachRow ? 0x71845f : 0xc6bdae)
    this.devToggle.setStrokeStyle(2, this.requireTargetLetterInEachRow ? 0x4c7b43 : 0x756d5e)
    this.devGreenToggle.setFillStyle(this.requireGreenTileInEachRow ? 0x71845f : 0xc6bdae)
    this.devGreenToggle.setStrokeStyle(2, this.requireGreenTileInEachRow ? 0x4c7b43 : 0x756d5e)
    this.devAnswerWordsToggle.setFillStyle(this.useAnswerWordsForRows ? 0x71845f : 0xc6bdae)
    this.devAnswerWordsToggle.setStrokeStyle(2, this.useAnswerWordsForRows ? 0x4c7b43 : 0x756d5e)
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
        this.tileOutlines.push(this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE).setOrigin(0, 0).setFillStyle(0, 0).setStrokeStyle(0).setDepth(3))

        const tile = board.tiles[slotIndex]
        if (tile === undefined) return
        const text = this.add.text(x + CELL_SIZE / 2, y + CELL_SIZE / 2, tile.letter, { color: "#fffaf0", fontFamily: "Arial, sans-serif", fontSize: "27px", fontStyle: "bold" }).setOrigin(0.5).setDepth(10)
        this.tileSlots.push({ tile, text })
      })
    })
    this.updateLetterFeedback()
  }

  private selectTile(slotIndex: number): void {
    if (this.swapAnimating) return
    if (this.interactionMode === "reveal") {
      this.revealTile(slotIndex)
      return
    }
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

  private revealTile(slotIndex: number): void {
    const rowIndex = Math.floor(slotIndex / 5)
    const columnIndex = slotIndex % 5
    const row = this.puzzle.rows[rowIndex]
    const expectedLetter = row?.intendedGuess[columnIndex]
    const current = this.tileSlots[slotIndex]
    if (expectedLetter === undefined || current === undefined) return
    if (current.tile.letter === expectedLetter) {
      this.message.setText("That letter is already in the right place.")
      return
    }

    const sourceSlot = this.tileSlots.findIndex((visual, index) => visual.tile.letter === expectedLetter && index !== slotIndex && !this.isLetterCorrectAtSlot(index))
    if (sourceSlot < 0) {
      this.message.setText("I couldn't find that letter to reveal it.")
      return
    }

    this.swapTiles(slotIndex, sourceSlot)
    this.message.setText("Letter revealed. Keep going.")
  }

  private isLetterCorrectAtSlot(slotIndex: number): boolean {
    const rowIndex = Math.floor(slotIndex / 5)
    const columnIndex = slotIndex % 5
    const row = this.puzzle.rows[rowIndex]
    const visual = this.tileSlots[slotIndex]
    return row !== undefined && visual !== undefined && visual.tile.letter === row.intendedGuess[columnIndex]
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
    this.updateLetterFeedback()
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

  private updateLetterFeedback(): void {
    this.tileOutlines.forEach((outline, slotIndex) => {
      outline.setStrokeStyle(this.isLetterCorrectAtSlot(slotIndex) ? 4 : 0, 0x4c7b43)
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
