export interface User {
  userName: string;
  socketId: string;
  roomId?: string;
  status: "waiting" | "in-room";
  joinedAt: Date;
}
