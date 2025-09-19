export interface User {
  userName: string;
  socketId: string;
  roomId?: string;
  status: "waiting" | "in-room";
  gamePreference: "chess" | "tic-tac-toe";
  joinedAt: Date;
}
