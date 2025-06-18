import { cn } from "@konekt/ui/utils";
import { Chess } from "chess.js";

type TurnIndicatorProps = {
  currentTurn: "w" | "b";
  game: Chess;
  isGameOver: boolean;
};

export function TurnIndicator({
  currentTurn,
  game,
  isGameOver,
}: TurnIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-xl border">
      <div
        className={cn(
          "w-4 h-4 rounded-full",
          currentTurn === "w"
            ? "bg-gray-100 border-2 border-gray-400"
            : "bg-gray-800"
        )}
      />
      <span className="text-sm font-medium">
        {currentTurn === "w" ? "White" : "Black"} to move
      </span>
      {game.inCheck() && !isGameOver && (
        <span className="text-red-500 text-sm font-semibold">Check!</span>
      )}
      {isGameOver && (
        <span className="text-amber-500 text-sm font-semibold">Game Over</span>
      )}
    </div>
  );
}
