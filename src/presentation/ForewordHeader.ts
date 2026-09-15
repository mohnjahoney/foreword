import Phaser from "phaser"
import { RENDER_SCALE } from "../style/rendering"

export function addForewordHeader(scene: Phaser.Scene, parent?: Phaser.GameObjects.Container): void {
  const title = scene.add.text(215, 67, "FOREWORD", {
    color: "#211f1a",
    fontFamily: "Georgia, Times New Roman, serif",
    fontSize: "31px",
    fontStyle: "bold",
    resolution: RENDER_SCALE,
  }).setOrigin(0.5)
  const rule = scene.add.graphics()
  rule.lineStyle(1, 0xc6bdae, 0.9)
  rule.lineBetween(31, 128, 399, 128)
  parent?.add([title, rule])
}
