import { cn } from "@konekt/ui/utils";

type TurnIndicatorProps = {
  currentTurn: "o" | "x";
  isGameOver: boolean;
};

export function TurnIndicator({
  currentTurn,
  isGameOver,
}: TurnIndicatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-xl border">
      <div
        className={cn(
          "w-4 h-4 rounded-full",
          currentTurn === "o"
            ? "bg-gray-100 border-2 border-gray-400"
            : "bg-gray-800"
        )}
      />
      <span className="text-sm font-medium">
        {currentTurn === "x" ? "X" : "O"} to move
      </span>
      {isGameOver && (
        <span className="text-amber-500 text-sm font-semibold">Game Over</span>
      )}
    </div>
  );
}
