import { cn } from "@konekt/ui/utils";
import { Chessboard } from "react-chessboard";
import { useWindowSize } from "usehooks-ts";
import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { TurnIndicator } from "./turn-indicator";

// Types for move tracking
type Move = {
  from: string;
  to: string;
  piece: string;
  captured?: string;
  promotion?: string;
  timestamp: Date;
  san: string; // Standard Algebraic Notation
};

type GameState = {
  moves: Move[];
  currentPosition: string; // FEN notation
  turn: "w" | "b";
  isGameOver: boolean;
  result?: string;
};

export function Game() {
  const { height, width } = useWindowSize();

  // Initialize chess game
  const [game] = useState(() => new Chess());
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [gameState, setGameState] = useState<GameState>({
    moves: [],
    currentPosition: game.fen(),
    turn: "w",
    isGameOver: false,
  });

  // Helper function to get the current game result
  const getCurrentGameResult = (gameInstance: Chess) => {
    if (gameInstance.isCheckmate()) {
      return gameInstance.turn() === "w"
        ? "Black wins by checkmate"
        : "White wins by checkmate";
    } else if (gameInstance.isDraw()) {
      if (gameInstance.isStalemate()) return "Draw by stalemate";
      if (gameInstance.isInsufficientMaterial())
        return "Draw by insufficient material";
      if (gameInstance.isThreefoldRepetition())
        return "Draw by threefold repetition";
      if (gameInstance.isDraw()) return "Draw by 50-move rule";
      return "Draw";
    }
    return undefined;
  };

  // Track piece movements
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      // Make a copy of the game to test the move
      const gameCopy = new Chess(game.fen());

      try {
        // Attempt to make the move
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: piece[1]?.toLowerCase() ?? "q", // Default to queen promotion
        });

        // If move is invalid, chess.js will throw an error
        if (!move) {
          console.log(
            `Invalid move: ${piece} from ${sourceSquare} to ${targetSquare}`
          );
          return false;
        }

        // Update the actual game state
        game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: piece[1]?.toLowerCase() ?? "q",
        });

        // Create move record
        const moveRecord: Move = {
          from: sourceSquare,
          to: targetSquare,
          piece: move.piece,
          captured: move.captured,
          promotion: move.promotion,
          timestamp: new Date(),
          san: move.san,
        };

        // Update game state
        const newGameState: GameState = {
          moves: [...gameState.moves, moveRecord],
          currentPosition: game.fen(),
          turn: game.turn(),
          isGameOver: game.isGameOver(),
          result: game.isGameOver() ? getCurrentGameResult(game) : undefined,
        };

        setGameState(newGameState);
        setGamePosition(game.fen());

        // Log the move details
        console.log("Move made:", {
          notation: move.san,
          from: sourceSquare,
          to: targetSquare,
          piece: move.piece,
          captured: move.captured ? `Captured ${move.captured}` : "No capture",
          check: game.inCheck() ? "Check!" : "",
          gameOver: game.isGameOver()
            ? `Game Over: ${getCurrentGameResult(game)}`
            : "",
        });

        return true;
      } catch (error) {
        console.log(
          `Invalid move: ${piece} from ${sourceSquare} to ${targetSquare}`,
          error
        );
        return false;
      }
    },
    [game, gameState]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Turn Indicator */}
      <TurnIndicator
        currentTurn={gameState.turn}
        game={game}
        isGameOver={gameState.isGameOver}
      />

      {/* Chess Board */}
      <div
        className={cn(
          "p-4 w-auto items-center h-auto flex bg-secondary text-lg font-semibold rounded-2xl justify-center",
          "[&>div]:w-min! [&>div]:rounded-lg [&>div]:overflow-clip"
        )}
      >
        <Chessboard
          position={gamePosition}
          arePiecesDraggable={!gameState.isGameOver}
          showBoardNotation
          showPromotionDialog
          boardOrientation="black"
          animationDuration={200}
          boardWidth={height * 0.8 < width - 100 ? height * 0.8 : width - 100}
          onPieceDrop={handlePieceDrop}
        />
      </div>
    </div>
  );
}
