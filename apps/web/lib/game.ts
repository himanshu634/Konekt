export function getBoardWidth(
  height: number | null | undefined,
  width: number | null | undefined
) {
  // Reserve space for video streams and margins below the chessboard
  const reservedHeight = 260; // px, adjust as needed for video area
  const marginRatio = 0.9;
  const minBoardSize = 240; // px
  const maxBoardSize = 600; // px

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    isNaN(width) ||
    isNaN(height)
  ) {
    return minBoardSize;
  }

  // Calculate available height for the chessboard
  const availableHeight = Math.max(height - reservedHeight, minBoardSize);
  const size = Math.floor(Math.min(width, availableHeight) * marginRatio);
  return Math.max(minBoardSize, Math.min(size, maxBoardSize));
}