import { cn } from "@konekt/ui/utils";
import { Chessboard } from "react-chessboard";
import { useState, useCallback, useEffect } from "react";
import { Chess as ChessEngine } from "chess.js";
import { toast } from "sonner";
import { TurnIndicator } from "./turn-indicator";
import { usePeerConnection } from "@contexts/peer-connection";
import { useWindowSize } from "@uidotdev/usehooks";
import { getBoardWidth } from "lib/game";

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

type PlayerSide = "w" | "b";

// Helper function to get the current game result
const getCurrentGameResult = (gameInstance: ChessEngine) => {
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

// Helper to apply a move and update state
function applyMove({
  moveData,
  game,
  prevMoves = [],
  onStateUpdate,
  onPositionUpdate,
}: {
  moveData: Move;
  game: ChessEngine;
  prevMoves?: Move[];
  onStateUpdate: (newState: GameState) => void;
  onPositionUpdate: (fen: string) => void;
}) {
  // Make the move on the local board
  const move = game.move({
    from: moveData.from,
    to: moveData.to,
    promotion: moveData.promotion,
  });
  if (move) {
    // Create move record if not present (for local moves)
    const moveRecord: Move = {
      from: moveData.from,
      to: moveData.to,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
      timestamp: moveData.timestamp ? new Date(moveData.timestamp) : new Date(),
      san: move.san,
    };
    const newMoves = [...prevMoves, moveRecord];
    const newState: GameState = {
      moves: newMoves,
      currentPosition: game.fen(),
      turn: game.turn(),
      isGameOver: game.isGameOver(),
      result: game.isGameOver() ? getCurrentGameResult(game) : undefined,
    };
    onStateUpdate(newState);
    onPositionUpdate(game.fen());
    return { success: true, moveRecord };
  } else {
    return { success: false };
  }
}

// Helper to check if a move is valid and return move details
function validateMove({
  game,
  moveData,
}: {
  game: ChessEngine;
  moveData: Move;
}) {
  // Create a copy of the game to test the move
  const gameCopy = new ChessEngine(game.fen());
  const move = gameCopy.move(moveData);
  return { isValid: !!move, move };
}

export function Chess() {
  const { manager } = usePeerConnection();
  const { width, height } = useWindowSize();

  // Initialize chess game
  const [game] = useState(() => new ChessEngine());
  const [gamePosition, setGamePosition] = useState(game.fen());

  // Determine player side - first player gets white, second gets black
  const [playerSide, setPlayerSide] = useState<PlayerSide | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    moves: [],
    currentPosition: game.fen(),
    turn: "w", // Always start with white
    isGameOver: false,
  });

  useEffect(() => {
    if (!manager) return;

    function handleConnectionEstablished() {
      manager?.initiateGameDataChannel("chess");
      // Assign player side when connection is established
      // The initiator (not polite) gets white, the receiver (polite) gets black
      if (!manager) return;
      const isInitiator = !manager.getIsPolite();
      setPlayerSide(isInitiator ? "w" : "b");
      toast.success(
        `You are playing as ${isInitiator ? "White" : "Black"} pieces!`
      );
    }

    function handleChessDataChannelMessage(data: { data: string }) {
      // Only handle chess move messages
      try {
        const receivedData = JSON.parse(data.data);
        if (receivedData.type !== "move") return;
        const moveData: Move = receivedData.move;
        const result = applyMove({
          moveData,
          game,
          prevMoves: gameState.moves,
          onStateUpdate: setGameState,
          onPositionUpdate: setGamePosition,
        });
        if (!result.success) {
          console.error("Invalid received move:", moveData);
        }
      } catch (error) {
        console.error("Error processing received chess data:", error);
      }
    }

    manager.on("connectionEstablished", handleConnectionEstablished);
    manager.on("onGameDataChannelMessage", handleChessDataChannelMessage);

    return () => {
      manager.off("connectionEstablished", handleConnectionEstablished);
      manager.off("onGameDataChannelMessage", handleChessDataChannelMessage);
    };
  }, [manager, game, gameState.moves, playerSide]);

  // Track piece movements
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      // Prevent moves if game is over
      if (gameState.isGameOver) {
        toast.info(gameState.result ?? "Game is over! No more moves allowed.");
        return false;
      }
      // Ensure player side is assigned
      if (!playerSide) {
        toast.error("Waiting for connection to be established...");
        return false;
      }
      // Enforce turn order
      if (gameState.turn !== playerSide) {
        toast.error("It's not your turn!");
        return false;
      }
      // Only allow moving own pieces
      const pieceColor = piece[0]?.toLowerCase() === "w" ? "w" : "b";
      if (pieceColor !== playerSide) {
        toast.error("You can only move your own pieces!");
        return false;
      }
      try {
        // Prepare move data
        const moveData: Move = {
          from: sourceSquare,
          to: targetSquare,
          piece: piece[1]?.toLowerCase() ?? "q", // Will be overwritten by chess.js
          promotion: piece[1]?.toLowerCase() ?? "q",
          timestamp: new Date(),
          san: "", // Will be overwritten by chess.js
        };
        // Validate move
        const { isValid, move } = validateMove({ game, moveData });
        if (!isValid || !move) {
          toast.error("Invalid move! Please try a different move.");
          return false;
        }
        // Apply move
        const result = applyMove({
          moveData: {
            ...moveData,
            piece: move.piece,
            captured: move.captured,
            promotion: move.promotion,
            san: move.san,
            timestamp: new Date(),
          },
          game,
          prevMoves: gameState.moves,
          onStateUpdate: setGameState,
          onPositionUpdate: setGamePosition,
        });
        if (result.success && result.moveRecord) {
          manager?.sendGameData({
            type: "move",
            move: result.moveRecord,
          });
          return true;
        } else {
          toast.error("Invalid move! Please try a different move.");
          return false;
        }
      } catch {
        toast.error("Invalid move! Please try a different move.");
        return false;
      }
    },
    [
      game,
      gameState.isGameOver,
      gameState.moves,
      gameState.turn,
      playerSide,
      manager,
    ]
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4">
        {/* Player Side Indicator */}
        {playerSide && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2",
                playerSide === "w"
                  ? "bg-white border-gray-400"
                  : "bg-black border-gray-600"
              )}
            />
            <span>
              You are playing as {playerSide === "w" ? "White" : "Black"}
            </span>
          </div>
        )}
        {!playerSide && (
          <div className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-xl">
            <div className="w-4 h-4 rounded-full bg-gray-400 animate-pulse" />
            <span>Waiting for connection...</span>
          </div>
        )}

        {/* Turn Indicator */}
        <TurnIndicator
          currentTurn={gameState.turn}
          game={game}
          isGameOver={gameState.isGameOver}
        />
      </div>

      {/* Chess Board */}
      <div
        className={cn(
          "p-4 w-auto items-center h-auto flex bg-secondary text-lg font-semibold rounded-2xl justify-center transition-all",
          gameState.turn === "w"
            ? "shadow-lg shadow-white"
            : "shadow-lg shadow-black",
          "[&>div]:w-min! [&>div]:rounded-lg [&>div]:overflow-clip"
        )}
      >
        <Chessboard
          position={gamePosition}
          arePiecesDraggable={!gameState.isGameOver && !!playerSide}
          showBoardNotation
          showPromotionDialog
          boardOrientation={playerSide === "b" ? "black" : "white"}
          animationDuration={200}
          boardWidth={getBoardWidth(height, width)}
          onPieceDrop={handlePieceDrop}
        />
      </div>
    </div>
  );
}
