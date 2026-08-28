import Phaser from "phaser"
import { createScrambledBoard, type LetterTile } from "../core/board"
import { evaluateGuess } from "../core/evaluateGuess"
import { createForewordPuzzle, type ForewordPuzzle, type PuzzleSetup } from "../core/puzzle"
import { countBoardTiles } from "../core/validation"
import { countAlgorithmicMoves, findNextSwap } from "../core/minimumMoves"
import { ANSWER_WORDS, isAllowedWord } from "../core/words"
import { configureLogicalCamera } from "../style/rendering"

const COLORS = { ink: "#211f1a", muted: "#756d5e", absent: 0xaaa396, present: 0xc49f52, correct: 0x71845f, selected: 0x665d4f, tile: 0xc6bdae } as const
const CELL_SIZE = 52
const CELL_GAP = 7
const ROW_LEFT = 75
const ROW_TOP = 175
const OUTLINE_SIZE = CELL_SIZE + 5

interface TileVisual {
  tile: LetterTile
  text: Phaser.GameObjects.Text
}

interface SceneData extends PuzzleSetup {}
type InteractionMode = "swap" | "reveal"
type WordListMode = "easy" | "hard"
type IconKind = "swap" | "reveal" | "easy" | "hard" | "reset"

const ICON_KEYS = ["replace", "eye", "square", "layers-3", "rotate-ccw", "arrow-right"] as const

export class MainScene extends Phaser.Scene {
  private puzzle!: ForewordPuzzle
  private tileSlots: TileVisual[] = []
  private initialTileIds: number[] = []
  private slotBackgrounds: Phaser.GameObjects.Rectangle[] = []
  private tileOutlines: Phaser.GameObjects.Rectangle[] = []
  private selectedSlot: number | undefined
  private rowOutlines: Phaser.GameObjects.Rectangle[] = []
  private swapDirection = 1
  private swapAnimating = false
  private movesTaken = 0
  private minimumMoves = 0
  private puzzleCreationFailed = false
  private devPanelReady = false
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
  private normalModeLabel!: Phaser.GameObjects.Container
  private revealModeLabel!: Phaser.GameObjects.Container
  private easyModeLabel!: Phaser.GameObjects.Container
  private hardModeLabel!: Phaser.GameObjects.Container
  private modeLabelAnimating = false
  private static readonly ACTIVE_BUTTON_COLOR = 0x71845f
  private static readonly INACTIVE_BUTTON_COLOR = 0xc6bdae
  private static readonly BUTTON_STROKE_COLOR = 0x756d5e

  constructor() {
    super("main")
  }

  preload(): void {
    for (const icon of ICON_KEYS) {
      this.load.svg(`foreword-${icon}`, `${import.meta.env.BASE_URL}icons/${icon}.svg`, { width: 48, height: 48 })
    }
  }

  create(data: SceneData = {}): void {
    configureLogicalCamera(this)
    this.tileSlots = []
    this.initialTileIds = []
    this.slotBackgrounds = []
    this.tileOutlines = []
    this.rowOutlines = []
    this.selectedSlot = undefined
    this.swapAnimating = false
    this.movesTaken = 0
    this.minimumMoves = 0
    this.puzzleCreationFailed = false
    this.devPanelReady = false
    this.modeLabelAnimating = false
    this.interactionMode = "swap"
    this.requireTargetLetterInEachRow = data.requireTargetLetterInEachRow ?? false
    this.requireGreenTileInEachRow = data.requireGreenTileInEachRow ?? false
    this.minGreenTiles = clampTileMinimum(data.minGreenTiles ?? 4)
    this.minYellowTiles = clampTileMinimum(data.minYellowTiles ?? 4)
    this.wordListMode = data.wordListMode ?? "easy"
    try {
      this.puzzle = createForewordPuzzle(Math.random, {
        requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
        requireGreenTileInEachRow: this.requireGreenTileInEachRow,
        minGreenTiles: this.minGreenTiles,
        minYellowTiles: this.minYellowTiles,
        wordListMode: this.wordListMode,
      })
    } catch {
      this.puzzleCreationFailed = true
      this.puzzle = { target: "", rows: [] }
    }
    this.add.text(30, 28, "4oreword", { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "32px", fontStyle: "bold" })
    const devButton = this.add.text(398, 66, "PUZZLE SETUP ▾", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "11px", fontStyle: "bold" }).setOrigin(1, 0.5).setPadding(14, 10).setInteractive({ useHandCursor: true })
    devButton.on("pointerdown", () => this.setDevPanelVisible(!this.devPanel.visible))

    this.add.text(215, 127, this.puzzleCreationFailed ? "—" : this.puzzle.target, { color: COLORS.ink, fontFamily: "Georgia, Times New Roman, serif", fontSize: "28px", fontStyle: "bold" }).setOrigin(0.5)
    if (this.puzzleCreationFailed) {
      this.add.text(31, 235, "NO PUZZLE FOUND", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "18px", fontStyle: "bold" })
      this.add.text(31, 265, "Try reducing the constraints in DEV.", { color: COLORS.muted, fontFamily: "Georgia, Times New Roman, serif", fontSize: "16px", wordWrap: { width: 360 } })
    } else {
      this.buildBoard()
    }
    this.buildMoveInfo()
    this.buildInteractionTools()
    this.buildWordListModeTools()
    this.buildDevPanel()
    this.buildNewPuzzleButton()
  }

  private buildNewPuzzleButton(): void {
    const button = this.add.rectangle(105, 708, 220, 38, MainScene.ACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    this.add.text(215, 727, `NEW PUZZLE  ·  ${this.puzzle.wordsConsidered ?? 0}`, { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "12px", fontStyle: "bold" }).setOrigin(0.5).setDepth(1)
    button.on("pointerdown", () => this.scene.restart({
      requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
      requireGreenTileInEachRow: this.requireGreenTileInEachRow,
      minGreenTiles: this.minGreenTiles,
      minYellowTiles: this.minYellowTiles,
      wordListMode: this.wordListMode,
    }))
  }

  private buildMoveInfo(): void {
    this.add.rectangle(285, 535, 115, 140, 0xe7e0d0).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR)
    const nextButton = this.add.rectangle(295, 545, 45, 34, MainScene.INACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    this.add.image(317, 562, "foreword-arrow-right").setDisplaySize(25, 25).setDepth(1)
    nextButton.on("pointerdown", () => this.performNextAlgorithmicSwap())
    const resetButton = this.add.rectangle(345, 545, 45, 34, MainScene.INACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    createIconLabel(this, 367, 562, "reset")
    resetButton.on("pointerdown", () => this.resetPuzzle())
    this.add.text(295, 605, "MOVES", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold" }).setOrigin(0, 0.5)
    this.add.text(295, 630, "MINIMUM", { color: COLORS.muted, fontFamily: "Arial, sans-serif", fontSize: "10px", fontStyle: "bold" }).setOrigin(0, 0.5)
    this.movesTakenText = this.add.text(390, 605, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(1, 0.5)
    this.minimumMovesText = this.add.text(390, 630, "", { color: COLORS.ink, fontFamily: "Arial, sans-serif", fontSize: "16px", fontStyle: "bold" }).setOrigin(1, 0.5)
    this.updateMoveInfo()
  }

  private updateMoveInfo(): void {
    this.movesTakenText?.setText(String(this.movesTaken))
    this.minimumMovesText?.setText(String(this.minimumMoves))
  }

  private buildInteractionTools(): void {
    const normalX = 31
    const revealX = 112
    const y = 545
    this.normalModeButton = this.add.rectangle(normalX, y, 72, 38, MainScene.ACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    this.revealModeButton = this.add.rectangle(revealX, y, 72, 38, MainScene.INACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    this.normalModeLabel = createIconLabel(this, normalX + 36, y + 19, "swap")
    this.revealModeLabel = createIconLabel(this, revealX + 36, y + 19, "reveal")
    this.normalModeButton.on("pointerdown", () => this.toggleInteractionMode())
    this.revealModeButton.on("pointerdown", () => this.toggleInteractionMode())
    this.setInteractionMode("swap", false)
  }

  private performNextAlgorithmicSwap(): void {
    if (this.swapAnimating) return
    if (this.puzzleCreationFailed) {
      return
    }
    const next = findNextSwap(this.puzzle, this.tileSlots.map((visual) => visual.tile))
    if (next === undefined) {
      return
    }
    this.swapTiles(next.firstSlot, next.secondSlot)
  }

  private buildWordListModeTools(): void {
    const y = 605
    const easyButton = this.add.rectangle(31, y, 72, 38, MainScene.ACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    const hardButton = this.add.rectangle(112, y, 72, 38, MainScene.INACTIVE_BUTTON_COLOR).setOrigin(0, 0).setStrokeStyle(1, MainScene.BUTTON_STROKE_COLOR).setInteractive({ useHandCursor: true })
    const easyX = this.wordListMode === "easy" ? 67 : 148
    const hardX = this.wordListMode === "easy" ? 148 : 67
    this.easyModeLabel = createIconLabel(this, easyX, y + 19, "easy")
    this.hardModeLabel = createIconLabel(this, hardX, y + 19, "hard")
    easyButton.on("pointerdown", () => this.toggleWordListMode())
    hardButton.on("pointerdown", () => this.toggleWordListMode())
  }

  private setWordListMode(mode: WordListMode): void {
    if (mode === this.wordListMode) return
    if (this.modeLabelAnimating) return
    this.wordListMode = mode
    this.modeLabelAnimating = true
    this.animateLabelExchange(this.easyModeLabel, this.hardModeLabel, () => {
      this.scene.restart({
        requireTargetLetterInEachRow: this.requireTargetLetterInEachRow,
        requireGreenTileInEachRow: this.requireGreenTileInEachRow,
        minGreenTiles: this.minGreenTiles,
        minYellowTiles: this.minYellowTiles,
        wordListMode: this.wordListMode,
      })
    })
  }

  private toggleWordListMode(): void {
    this.setWordListMode(this.wordListMode === "easy" ? "hard" : "easy")
  }

  private setInteractionMode(mode: InteractionMode, animate = true): void {
    if (mode === this.interactionMode && animate) return
    const shouldAnimate = animate && mode !== this.interactionMode
    this.interactionMode = mode
    if (shouldAnimate && !this.modeLabelAnimating) {
      this.modeLabelAnimating = true
      this.animateLabelExchange(this.normalModeLabel, this.revealModeLabel)
    }
  }

  private toggleInteractionMode(): void {
    this.setInteractionMode(this.interactionMode === "swap" ? "reveal" : "swap")
  }

  private animateLabelExchange(
    first: Phaser.GameObjects.Container,
    second: Phaser.GameObjects.Container,
    onComplete?: () => void,
  ): void {
    const firstPosition = { x: first.x, y: first.y }
    const secondPosition = { x: second.x, y: second.y }
    const distanceX = secondPosition.x - firstPosition.x
    const distanceY = secondPosition.y - firstPosition.y
    const distance = Math.hypot(distanceX, distanceY)
    const perpendicular = { x: -distanceY / distance, y: distanceX / distance }
    const midpoint = { x: (firstPosition.x + secondPosition.x) / 2, y: (firstPosition.y + secondPosition.y) / 2 }
    const arcHeight = Math.min(28, Math.max(14, distance * 0.2))
    const firstControl = { x: midpoint.x + perpendicular.x * arcHeight * this.swapDirection, y: midpoint.y + perpendicular.y * arcHeight * this.swapDirection }
    const secondControl = { x: midpoint.x - perpendicular.x * arcHeight * this.swapDirection, y: midpoint.y - perpendicular.y * arcHeight * this.swapDirection }
    this.swapDirection *= -1
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 300,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const progress = tween.getValue()
        if (progress === null) return
        const firstPoint = quadraticPoint(firstPosition, firstControl, secondPosition, progress)
        const secondPoint = quadraticPoint(secondPosition, secondControl, firstPosition, progress)
        first.setPosition(firstPoint.x, firstPoint.y)
        second.setPosition(secondPoint.x, secondPoint.y)
      },
      onComplete: () => {
        first.setPosition(secondPosition.x, secondPosition.y)
        second.setPosition(firstPosition.x, firstPosition.y)
        this.modeLabelAnimating = false
        onComplete?.()
      },
    })
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
    this.devPanelReady = true
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
    if (!visible && this.devPanelReady && this.devPanel.visible && (this.puzzleCreationFailed || !this.puzzleSatisfiesSetup(this.currentPuzzleSetup()))) {
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
    this.initialTileIds = board.tiles.map((tile) => tile.id)
    this.minimumMoves = countAlgorithmicMoves(this.puzzle, board.tiles)
    this.puzzle.rows.forEach((row, rowIndex) => {
      const y = ROW_TOP + rowIndex * (CELL_SIZE + CELL_GAP + 26)
      const rowWidth = 5 * CELL_SIZE + 4 * CELL_GAP + 14
      this.rowOutlines.push(this.add.rectangle(ROW_LEFT - 7 + rowWidth / 2, y - 7 + (CELL_SIZE + 14) / 2, rowWidth, CELL_SIZE + 14).setOrigin(0.5).setFillStyle(0, 0).setStrokeStyle(0).setDepth(2))
      row.pattern.forEach((result, index) => {
        const slotIndex = rowIndex * 5 + index
        const center = this.slotCenter(slotIndex)
        const background = this.add.rectangle(center.x, center.y, CELL_SIZE, CELL_SIZE, this.colorFor(result)).setOrigin(0.5).setDepth(0).setInteractive({ useHandCursor: true })
        background.on("pointerdown", () => this.selectTile(slotIndex))
        this.slotBackgrounds.push(background)
        this.tileOutlines.push(this.add.rectangle(center.x, center.y, OUTLINE_SIZE, OUTLINE_SIZE).setOrigin(0.5).setFillStyle(0, 0).setStrokeStyle(0).setDepth(3))

        const tile = board.tiles[slotIndex]
        if (tile === undefined) return
        const text = this.add.text(center.x, center.y, tile.letter, { color: "#fffaf0", fontFamily: "Arial, sans-serif", fontSize: "27px", fontStyle: "bold" }).setOrigin(0.5).setDepth(10)
        this.tileSlots.push({ tile, text })
      })
    })
    this.updateLetterFeedback()
  }

  private resetPuzzle(): void {
    if (this.swapAnimating || this.puzzleCreationFailed) return
    const visualsById = new Map(this.tileSlots.map((visual) => [visual.tile.id, visual]))
    const resetSlots = this.initialTileIds.map((id) => visualsById.get(id))
    if (resetSlots.some((visual) => visual === undefined)) return

    this.tileSlots = resetSlots as TileVisual[]
    this.tileSlots.forEach((visual, slotIndex) => {
      const center = this.slotCenter(slotIndex)
      visual.text.setPosition(center.x, center.y).setDepth(10)
    })
    this.movesTaken = 0
    this.selectedSlot = undefined
    this.updateMoveInfo()
    this.updateSelection()
    this.updateRowFeedback()
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
      return
    }

    const sourceSlot = this.tileSlots.findIndex((visual, index) => visual.tile.letter === expectedLetter && index !== slotIndex && !this.isLetterCorrectAtSlot(index))
    if (sourceSlot < 0) {
      return
    }

    this.swapTiles(slotIndex, sourceSlot)
  }

  private isLetterCorrectAtSlot(slotIndex: number): boolean {
    const rowIndex = Math.floor(slotIndex / 5)
    const columnIndex = slotIndex % 5
    const row = this.puzzle.rows[rowIndex]
    const visual = this.tileSlots[slotIndex]
    return row !== undefined && visual !== undefined && visual.tile.letter === row.intendedGuess[columnIndex]
  }

  private isRowCorrect(rowIndex: number): boolean {
    const row = this.puzzle.rows[rowIndex]
    if (row === undefined) return false
    return this.tileSlots
      .slice(rowIndex * 5, (rowIndex + 1) * 5)
      .map((visual) => visual.tile.letter)
      .join("") === row.intendedGuess
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
        outline.setStrokeStyle(4, 0x8FAF83)
      } else if (isAllowedWord(word) && patternsMatch(evaluateGuess(word, this.puzzle.target), row.pattern)) {
        outline.setStrokeStyle(4, 0xc49f52)
      } else {
        outline.setStrokeStyle(0)
      }
    })
  }

  private updateLetterFeedback(): void {
    this.tileOutlines.forEach((outline, slotIndex) => {
      const rowIndex = Math.floor(slotIndex / 5)
      const showIndividualOutline = !this.isRowCorrect(rowIndex) && this.isLetterCorrectAtSlot(slotIndex)
      // outline.setStrokeStyle(showIndividualOutline ? 4 : 0, 0x4c7b43)
      outline.setStrokeStyle(showIndividualOutline ? 4 : 0, 0x8FAF83)
    })
  }

  private slotCenter(slotIndex: number): { x: number; y: number } {
    const rowIndex = Math.floor(slotIndex / 5)
    const columnIndex = slotIndex % 5
    return {
      x: ROW_LEFT + columnIndex * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      y: ROW_TOP + rowIndex * (CELL_SIZE + CELL_GAP + 26) + CELL_SIZE / 2,
    }
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

function createIconLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  kind: IconKind,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(1)
  const assetName = {
    swap: "replace",
    reveal: "eye",
    easy: "square",
    hard: "layers-3",
    reset: "rotate-ccw",
  }[kind]
  container.add(scene.add.image(0, 0, `foreword-${assetName}`).setDisplaySize(30, 30))
  return container
}
