import Phaser from "phaser"

const MIN_RENDER_SCALE = 1
const MAX_RENDER_SCALE = 2

export const RENDER_SCALE = Phaser.Math.Clamp(
  window.devicePixelRatio || MIN_RENDER_SCALE,
  MIN_RENDER_SCALE,
  MAX_RENDER_SCALE,
)

export const RENDER_SIZE = {
  width: Math.round(430 * RENDER_SCALE),
  height: Math.round(760 * RENDER_SCALE),
} as const

export function configureLogicalCamera(scene: Phaser.Scene): void {
  scene.cameras.main
    .setZoom(RENDER_SCALE)
    .centerOn(430 / 2, 760 / 2)
}
