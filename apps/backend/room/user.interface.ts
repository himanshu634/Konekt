export interface User {
  socketId: string;
  roomId?: string;
  status: 'waiting' | 'in-room';
  joinedAt: Date;
}