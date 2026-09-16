import Phaser from "phaser"
const INCORRECT_TILE_RADIUS = 11
const CORRECT_TILE_RADIUS = 0
const CORRECT_TILE_MARK_DURATION = 500
const CORRECT_TILE_MARK_DELAY = 100
const CORRECT_TILE_MARK_STROKE = 2
const CORRECT_TILE_MARK_COLOR = 0xfffdf7
const CORRECT_TILE_MARK_START_FRACTION = 0.25
const CORRECT_TILE_MARK_FADE_END = 0.8

const radiusByTile = new WeakMap<Phaser.GameObjects.Rectangle, number>()
const squareByTile = new WeakMap<Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle>()
const tweenByTile = new WeakMap<Phaser.GameObjects.Rectangle, Phaser.Tweens.Tween>()
const targetByTile = new WeakMap<Phaser.GameObjects.Rectangle, boolean>()

export function markCorrectTile(tile: Phaser.GameObjects.Rectangle | undefined, isCorrect: boolean): void {
  if (!tile) return
  const radius = isCorrect ? CORRECT_TILE_RADIUS : INCORRECT_TILE_RADIUS
  tile.setRounded(radius)
  radiusByTile.set(tile, radius)
  targetByTile.set(tile, isCorrect)
}

export function animateCorrectTileMark(
  scene: Phaser.Scene,
  tile: Phaser.GameObjects.Rectangle | undefined,
  isCorrect: boolean,
): void {
  if (!tile) return
  const targetRadius = isCorrect ? CORRECT_TILE_RADIUS : INCORRECT_TILE_RADIUS
  const currentRadius = radiusByTile.get(tile) ?? INCORRECT_TILE_RADIUS
  if (targetByTile.get(tile) === isCorrect && (tweenByTile.has(tile) || currentRadius === targetRadius)) return
  if (currentRadius === targetRadius) return markCorrectTile(tile, isCorrect)

  stopCorrectTileMarkAnimation(tile)
  targetByTile.set(tile, isCorrect)
  const square = isCorrect ? getOrCreateCorrectMark(scene, tile) : squareByTile.get(tile)
  const startSize = tile.width * CORRECT_TILE_MARK_START_FRACTION
  if (isCorrect && square) {
    square.setSize(startSize, startSize).setAlpha(0)
  }
  const tween = scene.tweens.addCounter({
    from: currentRadius,
    to: targetRadius,
    delay: CORRECT_TILE_MARK_DELAY,
    duration: CORRECT_TILE_MARK_DURATION,
    ease: "Cubic.easeInOut",
    onUpdate: (tween) => {
      const value = tween.getValue() ?? currentRadius
      const progress = Math.min(1, Math.max(0, (value - currentRadius) / (targetRadius - currentRadius)))
      const radius = Math.max(CORRECT_TILE_RADIUS, value)
      tile.setRounded(radius)
      radiusByTile.set(tile, radius)
      updateCorrectMarkSquare(square, tile, progress, isCorrect, startSize)
    },
    onComplete: () => {
      markCorrectTile(tile, isCorrect)
      if (square) {
        if (isCorrect) square.setSize(tile.width, tile.height).setAlpha(0)
        else square.setSize(startSize, startSize).setAlpha(0)
      }
      tweenByTile.delete(tile)
    },
  })
  tweenByTile.set(tile, tween)
}

/** Temporary diagnostic mark: show the final white square immediately. */
export function correctTileMarkAnimationForTesting(
  scene: Phaser.Scene,
  tile: Phaser.GameObjects.Rectangle | undefined,
  isCorrect: boolean,
): void {
  if (!tile) return
  stopCorrectTileMarkAnimation(tile)
  const square = isCorrect ? getOrCreateCorrectMark(scene, tile) : squareByTile.get(tile)
  markCorrectTile(tile, isCorrect)
  if (!square) return
  const startSize = tile.width * CORRECT_TILE_MARK_START_FRACTION
  square.setSize(isCorrect ? tile.width * 0.75 : startSize, isCorrect ? tile.height * 0.75 : startSize)
    .setAlpha(isCorrect ? 1 : 0)
}

export function stopCorrectTileMarkAnimation(tile: Phaser.GameObjects.Rectangle | undefined): void {
  if (!tile) return
  tweenByTile.get(tile)?.stop()
  tweenByTile.delete(tile)
}

function getOrCreateCorrectMark(scene: Phaser.Scene, tile: Phaser.GameObjects.Rectangle): Phaser.GameObjects.Rectangle {
  const existing = squareByTile.get(tile)
  if (existing) return existing

  const parent = tile.parentContainer
  const startSize = tile.width * CORRECT_TILE_MARK_START_FRACTION
  const square = scene.add.rectangle(tile.x, tile.y, startSize, startSize)
    .setOrigin(0.5)
    .setFillStyle(0, 0)
    .setStrokeStyle(CORRECT_TILE_MARK_STROKE, CORRECT_TILE_MARK_COLOR)
    .setAlpha(0)
  if (parent) parent.add(square)
  squareByTile.set(tile, square)
  return square
}

function updateCorrectMarkSquare(
  square: Phaser.GameObjects.Rectangle | undefined,
  tile: Phaser.GameObjects.Rectangle,
  progress: number,
  expanding: boolean,
  startSize: number,
): void {
  if (!square) return
  const squareProgress = expanding ? progress : 1 - progress
  const size = startSize + (tile.width - startSize) * squareProgress
  const opacity = expanding ? expandingSquareOpacity(progress) : 1 - progress
  square.setSize(size, size).setAlpha(opacity)
}

function expandingSquareOpacity(progress: number): number {
  if (progress <= CORRECT_TILE_MARK_FADE_END) return progress / CORRECT_TILE_MARK_FADE_END
  return (1 - progress) / (1 - CORRECT_TILE_MARK_FADE_END)
}
