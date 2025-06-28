import { cn } from "@konekt/ui/utils";
import { Chessboard } from "react-chessboard";
import { useWindowSize } from "usehooks-ts";
import { useState, useCallback, useEffect } from "react";
import { Chess as ChessEngine } from "chess.js";
import { toast } from "sonner";
import { TurnIndicator } from "./turn-indicator";
import { usePeerConnection } from "@contexts/peer-connection";

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
  const { height, width } = useWindowSize();
  const { manager } = usePeerConnection();

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
    console.log("Peer connection manager:", manager);
    if (!manager) return;

    function handleConnectionEstablished() {
      manager?.initiateChessDataChannel();
      // Assign player side when connection is established
      // The initiator (not polite) gets white, the receiver (polite) gets black
      if (manager) {
        const isInitiator = !manager.getIsPolite();
        if (isInitiator) {
          setPlayerSide("w");
          toast.success("You are playing as White pieces!");
        } else {
          setPlayerSide("b");
          toast.success("You are playing as Black pieces!");
        }
      }
    }

    function handleChessDataChannelMessage(data: { data: string }) {
      console.log("Received chess data:", data);
      try {
        const receivedData = JSON.parse(data.data);
        if (receivedData.type === "move") {
          // Apply the move from the other player
          const moveData: Move = receivedData.move;
          console.log("Processing received move:", moveData);

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
        }
      } catch (error) {
        console.error("Error processing received chess data:", error);
      }
    }

    // manager.on("onChessDataChannelOpen", handleChessDataChannelOpen);
    manager.on("connectionEstablished", handleConnectionEstablished);
    manager.on("onChessDataChannelMessage", handleChessDataChannelMessage);

    return () => {
      // manager.off("onChessDataChannelOpen", handleChessDataChannelOpen);
      manager.off("connectionEstablished", handleConnectionEstablished);
      manager.off("onChessDataChannelMessage", handleChessDataChannelMessage);
    };
  }, [manager, game, gameState.moves, playerSide]);

  // Track piece movements
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      if (gameState.isGameOver) {
        toast.error("Game is over! No more moves allowed.");
        return false;
      }

      // Check if player is assigned a side
      if (!playerSide) {
        toast.error("Waiting for connection to be established...");
        return false;
      }

      // Check if it's the player's turn
      if (gameState.turn !== playerSide) {
        toast.error("It's not your turn!");
        return false;
      }

      // Check if player is trying to move their own pieces
      const pieceColor = piece[0]?.toLowerCase() === "w" ? "w" : "b";
      if (pieceColor !== playerSide) {
        toast.error("You can only move your own pieces!");
        return false;
      }

      try {
        const moveData: Move = {
          from: sourceSquare,
          to: targetSquare,
          piece: piece[1]?.toLowerCase() ?? "q", // Will be overwritten by chess.js
          promotion: piece[1]?.toLowerCase() ?? "q",
          timestamp: new Date(),
          san: "", // Will be overwritten by chess.js
        };

        // Validate move using validateMove helper
        const { isValid, move } = validateMove({ game, moveData });
        if (!isValid || !move) {
          console.log(
            `Invalid move: ${piece} from ${sourceSquare} to ${targetSquare}`
          );
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
          manager?.sendChessData({
            type: "move",
            move: result.moveRecord,
          });
          return true;
        } else {
          toast.error("Invalid move! Please try a different move.");
          return false;
        }
      } catch (error) {
        console.log(
          `Invalid move: ${piece} from ${sourceSquare} to ${targetSquare}`,
          error
        );
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
        <div className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg">
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

      {/* Chess Board */}
      <div
        className={cn(
          "p-4 w-auto items-center h-auto flex bg-secondary text-lg font-semibold rounded-2xl justify-center",
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
          boardWidth={height * 0.8 < width - 100 ? height * 0.8 : width - 100}
          onPieceDrop={handlePieceDrop}
        />
      </div>
    </div>
  );
}
