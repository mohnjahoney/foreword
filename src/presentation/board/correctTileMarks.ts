import Phaser from "phaser"
const INCORRECT_TILE_RADIUS = 11

export function markCorrectTile(tile: Phaser.GameObjects.Rectangle | undefined, isCorrect: boolean): void {
  tile?.setRounded(isCorrect ? 0 : INCORRECT_TILE_RADIUS)
}
