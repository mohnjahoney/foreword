import Phaser from "phaser"

type CelebrationGroup = Phaser.GameObjects.GameObject[]

const SETTLE_DURATION = 150
const SETTLE_STAGGER = 45

function settleInOrder(scene: Phaser.Scene, groups: CelebrationGroup[], scale: number, pulses: number): void {
  groups.forEach((group, index) => {
    scene.tweens.add({
      targets: group,
      scale,
      duration: SETTLE_DURATION,
      delay: index * SETTLE_STAGGER,
      yoyo: true,
      repeat: pulses - 1,
      ease: "Sine.Out",
    })
  })
}

export function celebrateCompletedRow(scene: Phaser.Scene, row: CelebrationGroup[]): void {
  settleInOrder(scene, row, 1.3, 2)
}

export function celebrateCompletedPuzzle(scene: Phaser.Scene, rows: CelebrationGroup[][]): void {
  const columnWaves = rows[0]?.map((_group, column) => rows.map((row) => row[column]).filter((group): group is CelebrationGroup => group !== undefined)) ?? []
  settleInOrder(scene, columnWaves.flat(), 1.5, 3)
}
