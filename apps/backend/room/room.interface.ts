export interface Room {
  id: string;
  users: string[];
  createdAt: Date;
  status: 'waiting' | 'active' | 'full';
}