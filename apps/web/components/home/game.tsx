import { Chessboard } from "react-chessboard";
import { useWindowSize } from "usehooks-ts";

export function Game() {
  const { height, width } = useWindowSize();

  return (
    <div className="p-4 [&>div]:w-min! w-auto items-center h-auto flex bg-secondary text-lg font-semibold rounded-2xl justify-center">
      <Chessboard
        arePiecesDraggable
        showBoardNotation
        showPromotionDialog
        boardOrientation="black"
        animationDuration={10000}
        boardWidth={height * 0.8 < width - 100 ? height * 0.8 : width - 100}
      />
    </div>
  );
}
