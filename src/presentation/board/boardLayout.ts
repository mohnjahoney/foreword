export const BOARD_LAYOUT = {
  left: 75,
  top: 150,
  tileSize: 52,
  gap: 7,
  rowStep: 73,
  rowPadding: 14,
  columns: 5,
  tileBorderWidth: 1.5,
  letterFontSize: 24,
} as const

export function boardSlotCenter(rowIndex: number, columnIndex: number): { x: number; y: number } {
  return {
    x: BOARD_LAYOUT.left + columnIndex * (BOARD_LAYOUT.tileSize + BOARD_LAYOUT.gap) + BOARD_LAYOUT.tileSize / 2,
    y: BOARD_LAYOUT.top + rowIndex * BOARD_LAYOUT.rowStep + BOARD_LAYOUT.tileSize / 2,
  }
}

export function boardRowWidth(): number {
  return BOARD_LAYOUT.columns * BOARD_LAYOUT.tileSize + (BOARD_LAYOUT.columns - 1) * BOARD_LAYOUT.gap + BOARD_LAYOUT.rowPadding
}
