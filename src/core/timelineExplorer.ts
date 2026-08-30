export interface ExplorerFocus<K extends string> {
  kind: K
  x: number
}

export interface TimelineExplorerConfig {
  smoothing: number
}

export class TimelineExplorer<K extends string> {
  private target?: ExplorerFocus<K>
  private smoothed?: ExplorerFocus<K>
  private frame?: number

  constructor(
    private readonly onChange: (focus: ExplorerFocus<K> | undefined) => void,
    private readonly config: TimelineExplorerConfig,
  ) {}

  getFocus(): ExplorerFocus<K> | undefined {
    return this.smoothed
  }

  setPointer(kind: K, x: number): void {
    this.target = { kind, x }
    if (this.smoothed?.kind !== kind) this.smoothed = { kind, x }
    this.scheduleFrame()
  }

  clear(): void {
    this.target = undefined
    this.smoothed = undefined
    this.onChange(undefined)
  }

  dispose(): void {
    if (this.frame !== undefined) window.cancelAnimationFrame(this.frame)
    this.frame = undefined
    this.target = undefined
    this.smoothed = undefined
  }

  private scheduleFrame(): void {
    if (this.frame !== undefined) return
    this.frame = window.requestAnimationFrame(() => {
      this.frame = undefined
      const target = this.target
      const smoothed = this.smoothed
      if (target === undefined || smoothed === undefined) {
        this.onChange(undefined)
        return
      }
      smoothed.x += (target.x - smoothed.x) * this.config.smoothing
      this.onChange(smoothed)
      if (Math.abs(target.x - smoothed.x) > 0.1) this.scheduleFrame()
    })
  }
}
