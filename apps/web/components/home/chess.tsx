import { cn } from "@konekt/ui/utils";
import { Chessboard } from "react-chessboard";
import { useWindowSize } from "usehooks-ts";
import { useState, useCallback, useEffect, useRef } from "react";
import { Chess as ChessEngine } from "chess.js";
import { toast } from "sonner";
import { TurnIndicator } from "./turn-indicator";
import { useBaseContext } from "contexts/base";

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

export function Chess() {
  const { height, width } = useWindowSize();
  const { peerConnectionRef } = useBaseContext();
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Initialize chess game
  const [game] = useState(() => new ChessEngine());
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [gameState, setGameState] = useState<GameState>({
    moves: [],
    currentPosition: game.fen(),
    turn: Math.random() < 0.5 ? "w" : "b", // Randomly assign starting turn
    isGameOver: false,
  });

  useEffect(() => {
    const peerConnection = peerConnectionRef.current.peerConnection;
    const isInitiator = peerConnectionRef.current.isInitiator;
    console.log("Peer connection:", peerConnection, isInitiator);
    if (!peerConnection) {
      console.error("Peer connection is not initialized.");
      return;
    }

    function handleMessage(event: MessageEvent) {
      console.log("Message received:", event.data);
      // const data = JSON.parse(event.data);
      // if (data.type === "move") {
      //   handlePieceDrop(data.from, data.to, data.piece);
      // } else if (data.type === "gameState") {
      //   setGameState(data.gameState);
      //   setGamePosition(data.gameState.currentPosition);
      // }
    }

    if (isInitiator) {
      // Create a data channel if this peer is the initiator
      console.log("Creating data channel as initiator");
      const dataChannel = peerConnection.createDataChannel("chess");

      dataChannel.onopen = (event) => {
        console.log("Data channel opened:", event);
        dataChannelRef.current = dataChannel;
      };

      dataChannel.onmessage = handleMessage;
    }
    peerConnection.ondatachannel = (event) => {
      const receivedChannel = event.channel;
      // Set up the received data channel
      dataChannelRef.current = receivedChannel;
      console.log("Data channel received:", event.channel);

      receivedChannel.onmessage = handleMessage;
    };
  }, []);

  // Helper function to get the current game result
  const getCurrentGameResult = useCallback((gameInstance: ChessEngine) => {
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
  }, []);

  // Track piece movements
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      // Check if game is already over
      if (gameState.isGameOver) {
        toast.error("Game is over! No more moves allowed.");
        return false;
      }

      try {
        const gameCopy = new ChessEngine(game.fen());
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
          toast.error("Invalid move! Please try a different move.");
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
        toast.error("Invalid move! Please try a different move.");
        return false;
      }
    },
    [game, gameState.isGameOver, gameState.moves, getCurrentGameResult]
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
