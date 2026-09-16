import Phaser from "phaser"
import type { ScrambledBoard } from "../core/board"
import type { LetterResult } from "../core/evaluateGuess"
import { boardSlotCenter } from "./board/boardLayout"
import { stopCorrectTileMarkAnimation } from "./board/correctTileMarks"
import { applyTileEvaluation, createTileAsterisk, createTileBackground, createTileLetter, SPLASH_PRESENTATION, type BoardPresentation } from "./board/tileVisuals"
import { addWerdolHeader } from "./WerdolHeader"

const COLORS = {
  paper: 0xf3eedf,
} as const

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
  evaluation?: LetterResult
}

export interface OpeningAnimationOptions {
  showAsterisk?: boolean
  showMarkup?: boolean
}

/** The anonymized Wordle prelude shown before the real Werdol board. */
export class OpeningAnimation {
  private readonly layer: Phaser.GameObjects.Container
  private readonly letterLayer: Phaser.GameObjects.Container
  private readonly tiles: OpeningTile[] = []
  private readonly timers: Phaser.Time.TimerEvent[] = []
  private readonly presentation: BoardPresentation
  private finished = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly scrambledBoard: ScrambledBoard,
    private readonly onComplete: () => void,
    private readonly options: OpeningAnimationOptions = {},
  ) {
    this.presentation = {
      ...SPLASH_PRESENTATION,
      showAsterisks: this.options.showAsterisk !== false,
      showEvaluation: this.options.showMarkup !== false,
    }
    this.layer = scene.add.container(0, 0).setDepth(10_000)
    this.letterLayer = scene.add.container(0, 0).setDepth(100)
    this.layer.add(scene.add.rectangle(215, 380, 430, 760, COLORS.paper).setInteractive())
    this.addHeader()
    this.buildBoard()
    this.layer.add(this.letterLayer)
    this.layer.bringToTop(this.letterLayer)
    this.scheduleAnimation()
  }

  destroy(): void {
    this.timers.forEach((timer) => timer.remove(false))
    this.tiles.forEach((tile) => stopCorrectTileMarkAnimation(tile.background))
    this.layer.destroy(true)
  }

  private addHeader(): void {
    addWerdolHeader(this.scene, this.layer)
  }

  private buildBoard(): void {
    const rows = this.scrambledBoard.rows
    rows.forEach(({ intendedGuess }, row) => {
      const rowTiles = this.scrambledBoard.initialTiles.slice(row * 5, (row + 1) * 5)
      for (let column = 0; column < 5; column += 1) {
        const { x, y } = boardSlotCenter(row, column)
        const container = this.scene.add.container(x, y)
        const background = createTileBackground(this.scene, { x: 0, y: 0 }, undefined, this.presentation)
        const unknown = createTileAsterisk(this.scene, { x, y }, this.presentation).setAlpha(0)
        const letter = createTileLetter(this.scene, { x, y }, rowTiles[column]?.letter ?? intendedGuess[column] ?? "", this.presentation).setAlpha(0)
        container.add(background)
        this.letterLayer.add([unknown, letter])
        this.layer.add(container)
        this.tiles.push({ container, background, unknown, letter })
      }
    })
  }

  private scheduleAnimation(): void {
    const rows = this.scrambledBoard.rows
    rows.forEach((row, rowIndex) => {
      const start = splashTime(520) + rowIndex * ROW_INTERVAL
      for (let column = 0; column < 5; column += 1) {
        this.after(start + column * ENTRY_INTERVAL, () => {
          const tile = this.tiles[rowIndex * 5 + column]
          if (!tile) return
          this.scene.tweens.add({ targets: tile.unknown, alpha: this.options.showAsterisk === false ? 0 : 1, duration: splashTime(70), ease: "Sine.Out" })
          if (!this.presentation.showAsterisks) tile.letter.setAlpha(1)
          this.scene.tweens.add({ targets: [tile.container, tile.unknown, tile.letter], scale: 1.08, duration: splashTime(90), yoyo: true, ease: "Sine.Out" })
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
      targets: [tile.container, tile.unknown, tile.letter],
      scaleY: 0.04,
      duration: FLIP_DURATION,
      ease: "Sine.In",
      onComplete: () => {
        tile.evaluation = result
        this.applyEvaluation(tile, result)
        this.scene.tweens.add({ targets: [tile.container, tile.unknown, tile.letter], scaleY: 1, duration: FLIP_DURATION, ease: "Back.Out" })
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

  private applyEvaluation(tile: OpeningTile, result: LetterResult): void {
    applyTileEvaluation(this.scene, tile.background, result, this.presentation, true)
  }

  private shuffleUnknown(): void {
    this.tiles.slice(0, 20).forEach((tile, index) => {
      const destinationIndex = this.scrambledBoard.tiles.findIndex((candidate) => candidate.id === index)
      const destinationRow = Math.floor(destinationIndex / 5)
      const destinationColumn = destinationIndex % 5
      const destination = boardSlotCenter(destinationRow, destinationColumn)
      this.scene.tweens.add({
        targets: [tile.unknown, tile.letter],
        x: destination.x,
        y: destination.y,
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
