import React, { SetStateAction, useCallback, useEffect, useState } from "react";
import { TicTacToeBoard } from "./tic-tac-toe-board";
import { cn } from "@konekt/ui/utils";
import Confetti from "react-confetti";
import { toast } from "sonner";
import { TurnIndicator } from "./turn-indicator";
import { usePeerConnection } from "@contexts/peer-connection";
import { getBoardWidth } from "lib/game";
import { useWindowSize } from "@uidotdev/usehooks";

const initializeGamePosition: string[] = ["", "", "", "", "", "", "", "", ""];

type PlayerSide = "o" | "x";

type GameState = {
  isGameOver: boolean;
  result?: string;
  turn: PlayerSide;
  isWin: boolean;
};

// Valid board indices only
type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

function applyMove({
  turn,
  index,
  gamePosition,
  onPositionUpdate,
  onStateUpdate,
  isMyMove,
}: {
  index: number;
  turn: PlayerSide;
  gamePosition: string[];
  onStateUpdate: React.Dispatch<SetStateAction<GameState>>;
  onPositionUpdate: (newPositions: string[]) => void;
  isMyMove: boolean;
}): { success: boolean; result?: GameState } {
  try {
    const newPositions = [...gamePosition];
    newPositions[index] = turn;
    onPositionUpdate(newPositions);
    const resultGameState: GameState = {
      turn: turn === "o" ? "x" : "o",
      isGameOver: false,
      result: "",
      isWin: false,
    };

    // All possible winning line combinations (vertically, horizontally, diagonals)
    const winningCombinations: [CellIndex, CellIndex, CellIndex][] = [
      [0, 1, 2], // Row 1
      [3, 4, 5], // Row 2
      [6, 7, 8], // Row 3
      [0, 3, 6], // Column 1
      [1, 4, 7], // Column 2
      [2, 5, 8], // Column 3
      [0, 4, 8], // Diagonal top-left to bottom-right
      [2, 4, 6], // Diagonal top-right to bottom-left
    ];

    // Check if the current move caused a win
    for (const [a, b, c] of winningCombinations) {
      if (
        newPositions[a] !== "" && // skip empty cells
        newPositions[a] === newPositions[b] &&
        newPositions[a] === newPositions[c]
      ) {
        resultGameState.isGameOver = true;
        resultGameState.result = `${turn.toUpperCase()} wins!`;
        resultGameState.isWin = isMyMove && true;
        onStateUpdate(resultGameState);
        return { success: true, result: resultGameState };
      }
    }

    // Check if all cells are filled then it's a draw
    const isDraw = newPositions.every((position) => position !== "");
    if (isDraw) {
      resultGameState.isGameOver = true;
      resultGameState.result = "The game is a draw!";
      onStateUpdate(resultGameState);
      return { success: true, result: resultGameState };
    }
    onStateUpdate(resultGameState);
    return { success: true, result: resultGameState };
  } catch (err) {
    console.error("Error applying move:", err);
    return { success: false };
  }
}

export function TicTacToe() {
  const { manager } = usePeerConnection();
  const [gamePosition, setGamePosition] = useState<string[]>(
    initializeGamePosition
  );
  const { width, height } = useWindowSize();
  // Determine player side - first player gets "o", second gets "x"
  const [playerSide, setPlayerSide] = useState<PlayerSide | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    turn: "o", // Always start with "o"
    isGameOver: false,
    isWin: false,
  });

  useEffect(() => {
    if (!manager) return;

    function handleConnectionEstablished() {
      manager?.initiateGameDataChannel("tic tac toe");
      // Assign player side when connection is established
      // The initiator (not polite) gets "o", the receiver (polite) gets "x"
      if (!manager) return;
      const isInitiator = !manager.getIsPolite();
      setPlayerSide(isInitiator ? "x" : "o");
      toast.success(`You are playing as ${isInitiator ? "X" : "O"}`);
    }

    function handleTicTacToeDataChannelMessage(data: { data: string }) {
      // Only handle tic tac toe move messages
      try {
        const receivedData = JSON.parse(data.data);
        if (receivedData.type !== "move") return;
        const move: { success: boolean; result?: GameState } = applyMove({
          index: receivedData.index,
          turn: receivedData.turn,
          onStateUpdate: setGameState,
          onPositionUpdate: (newPositions) => {
            setGamePosition(newPositions);
          },
          gamePosition: receivedData.gamePosition,
          isMyMove: false,
        });
        if (!move.success) {
          console.error("Invalid received index:", receivedData.index);
        }
        if (move.result?.isGameOver) {
          toast.info(
            move.result.result ?? "Game is over! No more moves allowed."
          );
          return false;
        }
      } catch (error) {
        console.error("Error processing received tic tac toe data:", error);
      }
    }

    manager.on("connectionEstablished", handleConnectionEstablished);
    manager.on("onGameDataChannelMessage", handleTicTacToeDataChannelMessage);

    return () => {
      manager.off("connectionEstablished", handleConnectionEstablished);
      manager.off(
        "onGameDataChannelMessage",
        handleTicTacToeDataChannelMessage
      );
    };
  }, [manager, playerSide]);

  const handlePieceDrop = useCallback(
    (index: number) => {
      if (index < 0 || index > 8) return;
      // Prevent moves if game is over
      if (gameState.isGameOver) {
        toast.info("Game is over! No more moves allowed.");
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

      // Prevent move if the selected square is already taken
      if (gamePosition[index] !== "") {
        toast.error(
          "This square is already occupied. Please choose another one."
        );
        return;
      }

      const moveData = {
        index,
        turn: gameState.turn,
        gamePosition,
        onStateUpdate: setGameState,
        onPositionUpdate: (newPositions: string[]) => {
          setGamePosition(newPositions);
        },
        isMyMove: true,
      };

      const move: { success: boolean; result?: GameState } =
        applyMove(moveData);

      if (!move.success) {
        toast.error("Invalid move! Please try a different move.");
        return false;
      }

      manager?.sendGameData({
        type: "move",
        turn: gameState.turn,
        index,
        gamePosition,
      });

      if (move.result?.isGameOver) {
        toast.info(
          move.result.result ?? "Game is over! No more moves allowed."
        );
        return false;
      }
    },
    [playerSide, manager, gameState, setGameState]
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
                playerSide === "o"
                  ? "bg-white border-gray-400"
                  : "bg-black border-gray-600"
              )}
            />
            <span>You are playing as {playerSide === "o" ? "O" : "X"}</span>
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
          isGameOver={gameState.isGameOver}
        />
      </div>
      {/* Tic Tac Toe Board */}
      <TicTacToeBoard
        width={getBoardWidth(height, width)}
        gamePosition={gamePosition}
        onPieceDrop={handlePieceDrop}
        turn={gameState.turn}
      />
      {gameState.isWin && (
        <Confetti
          width={width ?? 0}
          height={height ?? 0}
          numberOfPieces={400} // denser confetti
          recycle={false} // stop after a burst (good for "celebration" moments)
          gravity={0.3} // more natural falling speed
          wind={0.01} // slight drift
          initialVelocityX={{ min: -6, max: 6 }}
          initialVelocityY={{ min: -15, max: 0 }} // burst upward then fall
          tweenDuration={7000} // slower fade-in/out for pieces
          colors={[
            "#FF6B6B",
            "#FFD93D",
            "#6BCB77",
            "#4D96FF",
            "#FFB84C",
            "#FF3CAC",
          ]} // custom bright palette
        />
      )}
    </div>
  );
}
