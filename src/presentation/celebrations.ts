import Phaser from "phaser"

type CelebrationGroup = Phaser.GameObjects.GameObject[]

const SETTLE_DURATION = 160
const SETTLE_STAGGER = 60
const SETTLE_SCALE = 1.05
const SETTLE_EASE = "Sine.inOut"
const SETTLE_ROW_PULSES = 2
const SETTLE_PUZZLE_PULSES = 2

// const SETTLE_DURATION = 220
// const SETTLE_STAGGER = 65
// const SETTLE_SCALE = 1.05
// const SETTLE_EASE = "Sine.inOut"
// const SETTLE_ROW_PULSES = 2
// const SETTLE_PUZZLE_PULSES = 2

// const SETTLE_DURATION = 150
// const SETTLE_STAGGER = 45
// const SETTLE_SCALE = 1.06
// const SETTLE_EASE = "Sine.out"
// const SETTLE_ROW_PULSES = 2
// const SETTLE_PUZZLE_PULSES = 3

function settleInOrder(scene: Phaser.Scene, groups: CelebrationGroup[], scale: number, pulses: number, onComplete?: () => void): void {
  if (groups.length === 0) {
    onComplete?.()
    return
  }
  groups.forEach((group, index) => {
    scene.tweens.add({
      targets: group,
      scale,
      duration: SETTLE_DURATION,
      delay: index * SETTLE_STAGGER,
      yoyo: true,
      repeat: pulses - 1,
      ease: SETTLE_EASE,
      onComplete: index === groups.length - 1 ? onComplete : undefined,
    })
  })
}

export function celebrateCompletedRow(scene: Phaser.Scene, row: CelebrationGroup[], onComplete?: () => void): void {
  settleInOrder(scene, row, SETTLE_SCALE, SETTLE_ROW_PULSES, onComplete)
}

export function celebrateCompletedPuzzle(scene: Phaser.Scene, rows: CelebrationGroup[][], onComplete?: () => void): void {
  const columnWaves = rows[0]?.map((_group, column) => rows.map((row) => row[column]).filter((group): group is CelebrationGroup => group !== undefined)) ?? []
  settleInOrder(scene, columnWaves.flat(), SETTLE_SCALE, SETTLE_PUZZLE_PULSES, onComplete)
}
