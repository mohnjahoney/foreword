import Phaser from "phaser"

type CelebrationGroup = Phaser.GameObjects.GameObject[]

const SETTLE_SCALE = 1.06
const SETTLE_DURATION = 150
const SETTLE_STAGGER = 45

function settleInOrder(scene: Phaser.Scene, groups: CelebrationGroup[]): void {
  groups.forEach((group, index) => {
    scene.tweens.add({
      targets: group,
      scale: SETTLE_SCALE,
      duration: SETTLE_DURATION,
      delay: index * SETTLE_STAGGER,
      yoyo: true,
      ease: "Sine.Out",
    })
  })
}

export function celebrateCompletedRow(scene: Phaser.Scene, row: CelebrationGroup[]): void {
  settleInOrder(scene, row)
}

export function celebrateCompletedPuzzle(scene: Phaser.Scene, rows: CelebrationGroup[][]): void {
  const columnWaves = rows[0]?.map((_group, column) => rows.map((row) => row[column]).filter((group): group is CelebrationGroup => group !== undefined)) ?? []
  settleInOrder(scene, columnWaves.flat())
}
