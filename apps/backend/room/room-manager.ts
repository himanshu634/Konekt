import type { Room } from "./room.interface";
import type { User } from "./user.interface";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private users: Map<string, User> = new Map();
  private waitingQueue: string[] = [];

  // Generate a unique room ID
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add user to waiting queue for matchmaking
  addUserToQueue(socketId: string): void {
    // Create a new user object with their info
    const user: User = {
      socketId,
      status: 'waiting',
      joinedAt: new Date()
    };
    
    // Store the user in our users database
    this.users.set(socketId, user);
    
    // Add them to the end of the waiting queue
    this.waitingQueue.push(socketId);
    
    console.log(`User ${socketId} added to waiting queue. Queue length: ${this.waitingQueue.length}`);
  }

  // Try to match users and create a room (returns room info if successful)
  tryCreateRoom(): { roomId: string; users: string[] } | null {
    // Check if we have at least 2 people waiting
    if (this.waitingQueue.length < 2) {
      return null; // Not enough users to create a room
    }

    // Get the first 2 users from the queue (First In, First Out)
    const user1Id = this.waitingQueue.shift()!; // shift() removes first element
    const user2Id = this.waitingQueue.shift()!; // shift() removes first element

    // Create a new room with a unique ID
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      users: [user1Id, user2Id],
      createdAt: new Date(),
      status: 'active'
    };

    // Store the room in our rooms database
    this.rooms.set(roomId, room);

    // Update both users' status - they're no longer waiting, they're in a room
    const user1 = this.users.get(user1Id)!;
    const user2 = this.users.get(user2Id)!;
    
    user1.roomId = roomId;
    user1.status = 'in-room';
    user2.roomId = roomId;
    user2.status = 'in-room';

    console.log(`Room ${roomId} created with users: ${user1Id}, ${user2Id}`);
    
    // Return the room info so the server can notify the users
    return {
      roomId,
      users: [user1Id, user2Id]
    };
  }

  // Remove user from system when they disconnect or leave
  removeUser(socketId: string): { roomId?: string; otherUserId?: string } | null {
    const user = this.users.get(socketId);
    if (!user) return null; // User doesn't exist

    // Remove from waiting queue if they're still waiting
    const queueIndex = this.waitingQueue.indexOf(socketId);
    if (queueIndex > -1) {
      this.waitingQueue.splice(queueIndex, 1); // Remove from queue
      console.log(`User ${socketId} removed from waiting queue`);
    }

    // Handle room cleanup if user was in a room
    let result: { roomId?: string; otherUserId?: string } | null = null;

    if (user.roomId) {
      const room = this.rooms.get(user.roomId);
      if (room) {
        // Find the other user in the room
        const otherUserId = room.users.find(id => id !== socketId);
        
        if (otherUserId) {
          // Update other user's status - put them back in queue
          const otherUser = this.users.get(otherUserId);
          if (otherUser) {
            otherUser.roomId = undefined;  // No longer in a room
            otherUser.status = 'waiting';  // Back to waiting
            // Put them back in the queue for a new match
            this.waitingQueue.push(otherUserId);
          }
        }

        // Delete the room since someone left
        this.rooms.delete(user.roomId);
        console.log(`Room ${user.roomId} deleted due to user ${socketId} leaving`);
        
        result = {
          roomId: user.roomId,
          otherUserId
        };
      }
    }

    // Remove user completely from the system
    this.users.delete(socketId);
    console.log(`User ${socketId} completely removed from system`);
    
    return result; // Return info about what was cleaned up
  }

  // Get room information by room ID
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // Get user information by socket ID
  getUser(socketId: string): User | undefined {
    return this.users.get(socketId);
  }

  // Find who the user is paired with in their room
  getRoomMate(socketId: string): string | null {
    const user = this.users.get(socketId);
    if (!user || !user.roomId) return null; // User not in a room

    const room = this.rooms.get(user.roomId);
    if (!room) return null; // Room doesn't exist

    // Find the other user in the room (not the current user)
    return room.users.find(id => id !== socketId) || null;
  }

  // Get system statistics for monitoring
  getStats(): { totalUsers: number; waitingUsers: number; activeRooms: number } {
    return {
      totalUsers: this.users.size,        // How many users total
      waitingUsers: this.waitingQueue.length,  // How many waiting for match
      activeRooms: this.rooms.size        // How many active rooms
    };
  }
}
