import Phaser from "phaser"
import { createScrambledBoard, type LetterTile } from "../core/board"
import { evaluateGuess } from "../core/evaluateGuess"
import { createForewordPuzzle, type ForewordPuzzle, type PuzzleSetup } from "../core/puzzle"
import { countBoardTiles } from "../core/validation"
import { countAlgorithmicMoves, findNextSwap } from "../core/minimumMoves"
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
type WordListMode = "easy" | "hard"

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
  private movesTaken = 0
  private minimumMoves = 0
  private movesTakenText!: Phaser.GameObjects.Text
  private minimumMovesText!: Phaser.GameObjects.Text
  private requireTargetLetterInEachRow = false
  private requireGreenTileInEachRow = false
  private minGreenTiles = 4
  private minYellowTiles = 4
  private wordListMode: WordListMode = "easy"
  private devPanel!: Phaser.GameObjects.Container
  private devOverlay!: Phaser.GameObjects.Rectangle
  private devPanelBackground!: Phaser.GameObjects.Rectangle
  private devCloseButton!: Phaser.GameObjects.Text
  private devToggle!: Phaser.GameObjects.Rectangle
  private devGreenToggle!: Phaser.GameObjects.Rectangle
  private devGreenCountText!: Phaser.GameObjects.Text
  private devYellowCountText!: Phaser.GameObjects.Text
  private devCountButtons: Phaser.GameObjects.Text[] = []
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
    this.movesTaken = 0
    this.minimumMoves = 0
    this.interactionMode = "swap"
    this.requireTargetLetterInEachRow = data.requireTargetLetterInEachRow ?? false
    this.requireGreenTileInEachRow = data.requireGreenTileInEachRow ?? false
    this.minGreenTiles = clampTileMinimum(data.minGreenTiles ?? 4)
    this.minYellowTiles = clampTileMinimum(data.minYellowTiles ?? 4)
    this.wordListMode = data.wordListMode ?? "easy"
    this.puzzle = createForewordPuzzle(Math.random, {
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      minGreenTiles: this.minGreenTiles,
      minYellowTiles: this.minYellowTiles,
      wordListMode: this.wordListMode,
    })
    this.add.text(30, 28, "FOREWORD", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "32px", fontStyle: "bold" })
    this.add.text(31, 70, "Reassemble the four words from one shared pool.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px" })
    const newPuzzle = this.add.text(398, 35, `NEW PUZZLE · ${this.puzzle.wordsConsidered ?? 0}`, { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setPadding(14, 10).setInteractive({ useHandCursor: true })
    newPuzzle.on("pointerdown", () => this.scene.restart({
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      minGreenTiles: this.minGreenTiles,
      minYellowTiles: this.minYellowTiles,
      wordListMode: this.wordListMode,
    }))
    const devButton = this.add.text(398, 66, "DEV", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setPadding(14, 10).setInteractive({ useHandCursor: true })
    devButton.on("pointerdown", () => this.setDevPanelVisible(!this.devPanel.visible))

    this.add.text(31, 112, "TARGET", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold", letterSpacing: 2 })
    this.add.text(31, 127, this.puzzle.target, { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "28px", fontStyle: "bold" })
    this.buildBoard()
    this.buildMoveInfo()
    this.message = this.add.text(31, 530, "Tap two letters to swap them.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px", wordWrap: { width: 365 } })
    this.buildInteractionTools()
    this.buildWordListModeTools()
    this.buildDevPanel()
  }

  private buildMoveInfo(): void {
    this.add.text(330, 108, "MOVES", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold" }).setOrigin(0, 0.5)
    this.add.text(330, 125, "MINIMUM", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold" }).setOrigin(0, 0.5)
    this.movesTakenText = this.add.text(398, 108, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(1, 0.5)
    this.minimumMovesText = this.add.text(398, 125, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(1, 0.5)
    this.updateMoveInfo()
  }

  private updateMoveInfo(): void {
    this.movesTakenText?.setText(String(this.movesTaken))
    this.minimumMovesText?.setText(String(this.minimumMoves))
  }

  private buildInteractionTools(): void {
    const normalX = 31
    const revealX = 182
    const nextX = 342
    const y = 590
    this.normalModeButton = this.add.rectangle(normalX, y, 138, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    this.revealModeButton = this.add.rectangle(revealX, y, 152, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    const nextSwapButton = this.add.rectangle(nextX, y, 72, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    const normalLabel = this.add.text(normalX + 69, y + 21, "↔  NORMAL", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5)
    const revealLabel = this.add.text(revealX + 76, y + 21, "REVEAL TOOL", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5)
    const nextSwapLabel = this.add.text(nextX + 36, y + 21, "NEXT", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(0.5)
    this.normalModeButton.on("pointerdown", () => this.setInteractionMode("swap"))
    this.revealModeButton.on("pointerdown", () => this.setInteractionMode("reveal"))
    nextSwapButton.on("pointerdown", () => this.performNextAlgorithmicSwap())
    this.setInteractionMode("swap")
    normalLabel.setDepth(1)
    revealLabel.setDepth(1)
    nextSwapLabel.setDepth(1)
  }

  private performNextAlgorithmicSwap(): void {
    if (this.swapAnimating) return
    const next = findNextSwap(this.puzzle, this.tileSlots.map((visual) => visual.tile))
    if (next === undefined) {
      this.message.setText("The board is solved.")
      return
    }
    this.swapTiles(next.firstSlot, next.secondSlot)
    this.message.setText(`Suggested swap: ${next.improvement === 2 ? "two tiles" : "one tile"} correct.`)
  }

  private buildWordListModeTools(): void {
    const y = 650
    const easyButton = this.add.rectangle(31, y, 138, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    const hardButton = this.add.rectangle(182, y, 138, 42, 0xc6bdae).setOrigin(0, 0).setInteractive({ useHandCursor: true })
    this.add.text(100, y + 21, "EASY", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5).setDepth(1)
    this.add.text(251, y + 21, "HARD", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5).setDepth(1)
    easyButton.on("pointerdown", () => this.setWordListMode("easy"))
    hardButton.on("pointerdown", () => this.setWordListMode("hard"))
    const updateButtons = (): void => {
      easyButton.setFillStyle(this.wordListMode === "easy" ? 0x71845f : 0xc6bdae)
      hardButton.setFillStyle(this.wordListMode === "hard" ? 0x71845f : 0xc6bdae)
    }
    this.setWordListModeButtons = updateButtons
    updateButtons()
  }

  private setWordListModeButtons: (() => void) | undefined

  private setWordListMode(mode: WordListMode): void {
    if (mode === this.wordListMode) return
    this.wordListMode = mode
    this.setWordListModeButtons?.()
    this.scene.restart({
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      minGreenTiles: this.minGreenTiles,
      minYellowTiles: this.minYellowTiles,
      wordListMode: this.wordListMode,
    })
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
    const panel = this.add.rectangle(0, 0, 380, 335, 0xfaf6e9).setOrigin(0, 0).setStrokeStyle(2, 0x756d5e).setInteractive()
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
    const greenCountLabel = this.add.text(20, 180, "Minimum total green tiles", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "15px" })
    const yellowCountLabel = this.add.text(20, 235, "Minimum total yellow tiles", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "15px" })
    this.devGreenCountText = this.add.text(310, 180, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(0.5)
    this.devYellowCountText = this.add.text(310, 235, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(0.5)
    const greenMinus = this.add.text(270, 180, "−", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold" }).setOrigin(0.5).setPadding(10, 8).setInteractive({ useHandCursor: true })
    const greenPlus = this.add.text(350, 180, "+", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold" }).setOrigin(0.5).setPadding(10, 8).setInteractive({ useHandCursor: true })
    const yellowMinus = this.add.text(270, 235, "−", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold" }).setOrigin(0.5).setPadding(10, 8).setInteractive({ useHandCursor: true })
    const yellowPlus = this.add.text(350, 235, "+", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold" }).setOrigin(0.5).setPadding(10, 8).setInteractive({ useHandCursor: true })
    this.devCountButtons = [greenMinus, greenPlus, yellowMinus, yellowPlus]
    greenMinus.on("pointerdown", () => this.adjustTileMinimum("green", -1))
    greenPlus.on("pointerdown", () => this.adjustTileMinimum("green", 1))
    yellowMinus.on("pointerdown", () => this.adjustTileMinimum("yellow", -1))
    yellowPlus.on("pointerdown", () => this.adjustTileMinimum("yellow", 1))
    const note = this.add.text(20, 285, "Changes take effect when the panel closes.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "14px", wordWrap: { width: 330 } })
    this.devPanel.add([panel, heading, close, toggleLabel, this.devToggle, greenLabel, this.devGreenToggle, greenCountLabel, yellowCountLabel, this.devGreenCountText, this.devYellowCountText, greenMinus, greenPlus, yellowMinus, yellowPlus, note])
    this.devPanelBackground = panel
    this.devCloseButton = close
    this.updateDevToggle()
    this.updateTileMinimumText()
    this.setDevPanelVisible(false)
  }

  private adjustTileMinimum(color: "green" | "yellow", amount: number): void {
    const current = color === "green" ? this.minGreenTiles : this.minYellowTiles
    const next = clampTileMinimum(current + amount)
    if (color === "green") this.minGreenTiles = next
    else this.minYellowTiles = next
    this.updateTileMinimumText()
  }

  private updateTileMinimumText(): void {
    this.devGreenCountText?.setText(String(this.minGreenTiles))
    this.devYellowCountText?.setText(String(this.minYellowTiles))
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
      this.devCountButtons.forEach((button) => button.setInteractive({ useHandCursor: true }))
    } else {
      this.devOverlay.disableInteractive()
      this.devPanelBackground.disableInteractive()
      this.devCloseButton.disableInteractive()
      this.devToggle.disableInteractive()
      this.devGreenToggle.disableInteractive()
      this.devCountButtons.forEach((button) => button.disableInteractive())
    }
  }

  private currentPuzzleSetup(): PuzzleSetup {
    return {
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      minGreenTiles: this.minGreenTiles,
      minYellowTiles: this.minYellowTiles,
      wordListMode: this.wordListMode,
    }
  }

  private puzzleSatisfiesSetup(setup: PuzzleSetup): boolean {
    return this.puzzle.rows.every((row) => {
      if (setup.requireTargetLetterInEachRow && !row.pattern.some((result) => result !== "absent")) return false
      if (setup.requireGreenTileInEachRow && !row.pattern.some((result) => result === "correct")) return false
      if (setup.wordListMode === "easy" && !ANSWER_WORDS.includes(row.intendedGuess)) return false
      return true
    }) && (() => {
      const counts = countBoardTiles(this.puzzle)
      return counts.green >= (setup.minGreenTiles ?? 0) && counts.yellow >= (setup.minYellowTiles ?? 0)
    })()
  }

  private updateDevToggle(): void {
    this.devToggle.setFillStyle(this.requireTargetLetterInEachRow ? 0x71845f : 0xc6bdae)
    this.devToggle.setStrokeStyle(2, this.requireTargetLetterInEachRow ? 0x4c7b43 : 0x756d5e)
    this.devGreenToggle.setFillStyle(this.requireGreenTileInEachRow ? 0x71845f : 0xc6bdae)
    this.devGreenToggle.setStrokeStyle(2, this.requireGreenTileInEachRow ? 0x4c7b43 : 0x756d5e)
  }

  private buildBoard(): void {
    const board = createScrambledBoard(this.puzzle)
    this.minimumMoves = countAlgorithmicMoves(this.puzzle, board.tiles)
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
    this.movesTaken += 1
    this.updateMoveInfo()
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

function clampTileMinimum(value: number): number {
  return Math.max(0, Math.min(6, Math.round(value)))
}
