import { cn } from "@konekt/ui/utils";

type TicTacToeBoardProps = {
  gamePosition: string[];
  width: number;
  onPieceDrop: (index: number) => void;
  turn: "o" | "x";
};

export function TicTacToeBoard({
  turn,
  gamePosition,
  width,
  onPieceDrop,
}: TicTacToeBoardProps) {
  return (
    // assign same height and width to container for square board
    <div
      className={cn(
        "grid grid-rows-3 grid-cols-3 gap-2 p-4 bg-secondary font-semibold rounded-2xl transition-all",
        turn === "o" ? "shadow-lg shadow-white" : "shadow-lg shadow-black"
      )}
      style={{ height: width, width: width }}
    >
      {gamePosition.map((gp, index) => {
        return (
          <div
            className="text-6xl bg-white text-black border-black text-center place-content-center rounded-sm"
            key={index}
            onClick={() => {
              onPieceDrop(index);
            }}
          >
            {gp}
          </div>
        );
      })}
    </div>
  );
}
