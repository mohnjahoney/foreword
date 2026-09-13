import Phaser from "phaser"
import type { ScrambledBoard } from "../core/board"
import type { LetterResult } from "../core/evaluateGuess"
import type { ForewordPuzzle } from "../core/puzzle"
import { RENDER_SCALE } from "../style/rendering"

const COLORS = {
  paper: 0xf3eedf,
  ink: "#211f1a",
  muted: "#756d5e",
  empty: 0xe9e2d3,
  absent: 0xaaa396,
  present: 0xc49f52,
  correct: 0x71845f,
} as const

const CELL_SIZE = 45
const CELL_GAP = 6
const BOARD_LEFT = 102
const BOARD_TOP = 174
const ROW_STEP = CELL_SIZE + CELL_GAP + 14
const ENTRY_INTERVAL = 112
const ROW_INTERVAL = 1_470
const FLIP_DURATION = 145
const SHUFFLE_DURATION = 1_250

interface OpeningTile {
  container: Phaser.GameObjects.Container
  background: Phaser.GameObjects.Rectangle
  unknown: Phaser.GameObjects.Text
  letter: Phaser.GameObjects.Text
}

/** The anonymized Wordle prelude shown before the real Foreword board. */
export class OpeningAnimation {
  private readonly layer: Phaser.GameObjects.Container
  private readonly tiles: OpeningTile[] = []
  private readonly timers: Phaser.Time.TimerEvent[] = []
  private finished = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly puzzle: ForewordPuzzle,
    private readonly scrambledBoard: ScrambledBoard,
    private readonly onComplete: () => void,
  ) {
    this.layer = scene.add.container(0, 0).setDepth(10_000)
    this.layer.add(scene.add.rectangle(215, 380, 430, 760, COLORS.paper).setInteractive())
    this.addHeader()
    this.buildBoard()
    this.scheduleAnimation()
  }

  destroy(): void {
    this.timers.forEach((timer) => timer.remove(false))
    this.layer.destroy(true)
  }

  private addHeader(): void {
    this.layer.add(this.scene.add.text(215, 67, "FOREWORD", {
      color: COLORS.ink,
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "31px",
      fontStyle: "bold",
      resolution: RENDER_SCALE,
    }).setOrigin(0.5))
    this.layer.add(this.scene.add.text(215, 104, "A word is never just one word.", {
      color: COLORS.muted,
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: "15px",
      fontStyle: "italic",
      resolution: RENDER_SCALE,
    }).setOrigin(0.5))
    const rule = this.scene.add.graphics()
    rule.lineStyle(1, 0xc6bdae, 0.9)
    rule.lineBetween(31, 128, 399, 128)
    this.layer.add(rule)
  }

  private buildBoard(): void {
    const rows = [
      ...this.puzzle.rows,
      { intendedGuess: this.puzzle.target, pattern: Array<LetterResult>(5).fill("correct") },
    ]
    rows.forEach(({ intendedGuess }, row) => {
      for (let column = 0; column < 5; column += 1) {
        const x = BOARD_LEFT + column * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
        const y = BOARD_TOP + row * ROW_STEP + CELL_SIZE / 2
        const container = this.scene.add.container(x, y)
        const background = this.scene.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, COLORS.empty)
          .setStrokeStyle(1.5, 0xc6bdae)
        const unknown = this.scene.add.text(0, 0, "*", {
          color: COLORS.ink,
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          fontStyle: "bold",
          resolution: RENDER_SCALE,
        }).setOrigin(0.5).setAlpha(0)
        const letter = this.scene.add.text(0, 0, intendedGuess[column] ?? "", {
          color: "#fffaf0",
          fontFamily: "Arial, sans-serif",
          fontSize: "24px",
          fontStyle: "bold",
          resolution: RENDER_SCALE,
        }).setOrigin(0.5).setAlpha(0)
        container.add([background, unknown, letter])
        this.layer.add(container)
        this.tiles.push({ container, background, unknown, letter })
      }
    })
  }

  private scheduleAnimation(): void {
    const rows = [
      ...this.puzzle.rows,
      { intendedGuess: this.puzzle.target, pattern: Array<LetterResult>(5).fill("correct") },
    ]
    rows.forEach((row, rowIndex) => {
      const start = 520 + rowIndex * ROW_INTERVAL
      for (let column = 0; column < 5; column += 1) {
        this.after(start + column * ENTRY_INTERVAL, () => {
          const tile = this.tiles[rowIndex * 5 + column]
          if (!tile) return
          this.scene.tweens.add({ targets: tile.unknown, alpha: 1, duration: 70, ease: "Sine.Out" })
          this.scene.tweens.add({ targets: tile.container, scale: 1.08, duration: 90, yoyo: true, ease: "Sine.Out" })
        })
      }
      const submitAt = start + 5 * ENTRY_INTERVAL + 180
      row.pattern.forEach((result, column) => {
        this.after(submitAt + 170 + column * 88, () => this.flipTile(rowIndex * 5 + column, result))
      })
    })

    const targetRevealAt = 520 + 4 * ROW_INTERVAL + 5 * ENTRY_INTERVAL + 170 + 5 * 88 + 300
    this.after(targetRevealAt, () => {
      for (let column = 0; column < 5; column += 1) this.crossfadeLetter(20 + column)
    })
    this.after(targetRevealAt + 900, () => this.shuffleUnknown())
  }

  private flipTile(index: number, result: LetterResult): void {
    const tile = this.tiles[index]
    if (!tile) return
    this.scene.tweens.add({
      targets: tile.container,
      scaleY: 0.04,
      duration: FLIP_DURATION,
      ease: "Sine.In",
      onComplete: () => {
        tile.background.setFillStyle(COLORS[result]).setStrokeStyle(1.5, COLORS[result])
        this.scene.tweens.add({ targets: tile.container, scaleY: 1, duration: FLIP_DURATION, ease: "Back.Out" })
      },
    })
  }

  private crossfadeLetter(index: number): void {
    const tile = this.tiles[index]
    if (!tile) return
    this.scene.tweens.add({ targets: tile.unknown, alpha: 0, duration: 300, ease: "Sine.InOut" })
    this.scene.tweens.add({ targets: tile.letter, alpha: 1, duration: 300, ease: "Sine.InOut" })
  }

  private shuffleUnknown(): void {
    this.tiles.slice(0, 20).forEach((tile, index) => {
      const row = Math.floor(index / 5)
      const column = index % 5
      const destination = this.scrambledBoard.tiles.findIndex((candidate) => candidate.id === index)
      const destinationRow = Math.floor(destination / 5)
      const destinationColumn = destination % 5
      const destinationX = BOARD_LEFT + destinationColumn * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
      const destinationY = BOARD_TOP + destinationRow * ROW_STEP + CELL_SIZE / 2
      const sourceX = BOARD_LEFT + column * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
      const sourceY = BOARD_TOP + row * ROW_STEP + CELL_SIZE / 2
      const offsetX = destinationX - sourceX
      const offsetY = destinationY - sourceY
      this.scene.tweens.add({
        targets: [tile.unknown, tile.letter],
        x: offsetX,
        y: offsetY,
        duration: SHUFFLE_DURATION,
        delay: (index % 5) * 18,
        ease: "Cubic.InOut",
      })
    })
    this.timers.push(this.scene.time.delayedCall(SHUFFLE_DURATION * 0.25, () => {
      for (let index = 0; index < 20; index += 1) this.crossfadeLetter(index)
    }))
    this.scene.tweens.add({ targets: this.tiles.slice(20).map((tile) => tile.container), alpha: 0, duration: SHUFFLE_DURATION, ease: "Sine.InOut" })
    this.scene.tweens.add({
      targets: this.layer,
      alpha: 0,
      duration: 650,
      delay: SHUFFLE_DURATION - 250,
      ease: "Sine.InOut",
      onComplete: () => {
        if (this.finished) return
        this.finished = true
        this.destroy()
        this.onComplete()
      },
    })
  }

  private after(delay: number, callback: () => void): void {
    this.timers.push(this.scene.time.delayedCall(delay, callback))
  }
}
