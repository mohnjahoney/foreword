import Phaser from "phaser"
import type { ScrambledBoard } from "../core/board"
import type { LetterResult } from "../core/evaluateGuess"
import type { ForewordPuzzle } from "../core/puzzle"
import { RENDER_SCALE } from "../style/rendering"
import { BOARD_LAYOUT, boardSlotCenter } from "./board/boardLayout"
import { addForewordHeader } from "./ForewordHeader"

const COLORS = {
  paper: 0xf3eedf,
  ink: "#211f1a",
  muted: "#756d5e",
  empty: 0xe9e2d3,
  absent: 0xaaa396,
  present: 0xc49f52,
  correct: 0x71845f,
} as const

const CELL_SIZE = BOARD_LAYOUT.tileSize
const SPLASH_SPEED = 2
const splashTime = (milliseconds: number): number => milliseconds / SPLASH_SPEED
const ENTRY_INTERVAL = splashTime(112)
const ROW_INTERVAL = splashTime(1_470)
const FLIP_DURATION = splashTime(145)
const SHUFFLE_DURATION = splashTime(1_250)

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
    addForewordHeader(this.scene, this.layer)
  }

  private buildBoard(): void {
    const rows = [...this.scrambledBoard.rows, { intendedGuess: this.puzzle.target, pattern: Array<LetterResult>(5).fill("correct") }]
    rows.forEach(({ intendedGuess }, row) => {
      const rowTiles = this.scrambledBoard.initialTiles.slice(row * 5, (row + 1) * 5)
      for (let column = 0; column < 5; column += 1) {
        const { x, y } = boardSlotCenter(row, column)
        const container = this.scene.add.container(x, y)
        const background = this.scene.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, COLORS.empty)
          .setStrokeStyle(BOARD_LAYOUT.tileBorderWidth, 0xc6bdae)
        const unknown = this.scene.add.text(0, 0, "*", {
          color: COLORS.ink,
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          fontStyle: "bold",
          resolution: RENDER_SCALE,
        }).setOrigin(0.5).setAlpha(0)
        const letter = this.scene.add.text(0, 0, rowTiles[column]?.letter ?? intendedGuess[column] ?? "", {
          color: "#fffaf0",
          fontFamily: "Arial, sans-serif",
          fontSize: `${BOARD_LAYOUT.letterFontSize}px`,
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
    const rows = [...this.scrambledBoard.rows, { intendedGuess: this.puzzle.target, pattern: Array<LetterResult>(5).fill("correct") }]
    rows.forEach((row, rowIndex) => {
      const start = splashTime(520) + rowIndex * ROW_INTERVAL
      for (let column = 0; column < 5; column += 1) {
        this.after(start + column * ENTRY_INTERVAL, () => {
          const tile = this.tiles[rowIndex * 5 + column]
          if (!tile) return
          this.scene.tweens.add({ targets: tile.unknown, alpha: 1, duration: splashTime(70), ease: "Sine.Out" })
          this.scene.tweens.add({ targets: tile.container, scale: 1.08, duration: splashTime(90), yoyo: true, ease: "Sine.Out" })
        })
      }
      const submitAt = start + 5 * ENTRY_INTERVAL + splashTime(180)
      row.pattern.forEach((result, column) => {
        this.after(submitAt + splashTime(170) + column * splashTime(88), () => this.flipTile(rowIndex * 5 + column, result))
      })
    })

    const targetRevealAt = splashTime(520) + 4 * ROW_INTERVAL + 5 * ENTRY_INTERVAL + splashTime(170) + 5 * splashTime(88) + splashTime(300)
    this.after(targetRevealAt, () => {
      for (let column = 0; column < 5; column += 1) this.showLetter(20 + column)
    })
    this.after(targetRevealAt + splashTime(900), () => this.shuffleUnknown())
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
    this.scene.tweens.add({ targets: tile.unknown, alpha: 0, duration: splashTime(300), ease: "Sine.InOut" })
    this.scene.tweens.add({ targets: tile.letter, alpha: 1, duration: splashTime(300), ease: "Sine.InOut" })
  }

  private showLetter(index: number): void {
    const tile = this.tiles[index]
    if (!tile) return
    tile.unknown.setAlpha(0)
    tile.letter.setAlpha(1)
  }

  private shuffleUnknown(): void {
    this.tiles.slice(0, 20).forEach((tile, index) => {
      const row = Math.floor(index / 5)
      const column = index % 5
      const destinationIndex = this.scrambledBoard.tiles.findIndex((candidate) => candidate.id === index)
      const destinationRow = Math.floor(destinationIndex / 5)
      const destinationColumn = destinationIndex % 5
      const destination = boardSlotCenter(destinationRow, destinationColumn)
      const source = boardSlotCenter(row, column)
      const offsetX = destination.x - source.x
      const offsetY = destination.y - source.y
      this.scene.tweens.add({
        targets: [tile.unknown, tile.letter],
        x: offsetX,
        y: offsetY,
        duration: SHUFFLE_DURATION,
        delay: (index % 5) * splashTime(18),
        ease: "Cubic.InOut",
      })
    })
    this.timers.push(this.scene.time.delayedCall(SHUFFLE_DURATION * 0.25, () => {
      for (let index = 0; index < 20; index += 1) this.crossfadeLetter(index)
    }))
    this.timers.push(this.scene.time.delayedCall(SHUFFLE_DURATION, () => {
        if (this.finished) return
        this.finished = true
        this.destroy()
        this.onComplete()
    }))
  }

  private after(delay: number, callback: () => void): void {
    this.timers.push(this.scene.time.delayedCall(delay, callback))
  }
}
