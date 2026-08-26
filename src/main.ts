import Phaser from "phaser"
import { MainScene } from "./scenes/MainScene"
import "./styles.css"

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 430,
  height: 760,
  backgroundColor: "#f3eedf",
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 430,
    height: 760,
  },
  render: { antialias: true, roundPixels: false },
  input: { keyboard: true, mouse: true, touch: true },
}

new Phaser.Game(config)
