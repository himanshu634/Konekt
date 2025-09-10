import type { Room } from "./room.interface";
import type { User } from "./user.interface";

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private users: Map<string, User> = new Map();
  private waitingQueue: Map<string, string[]> = new Map();

  // Generate a unique room ID
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add user to waiting queue for matchmaking
  addUserToQueue(
    socketId: string,
    userName: string,
    gamePreference: "chess" | "tic-tac-toe"
  ): void {
    // Create a new user object with their info
    const user: User = {
      socketId,
      userName,
      status: "waiting",
      joinedAt: new Date(),
      gamePreference,
    };

    // Store the user in our users database
    this.users.set(socketId, user);

    // Add them to the end of the waiting queue
    const isGameQueueExist: string[] | undefined =
      this.waitingQueue.get(gamePreference);
    if (isGameQueueExist) {
      isGameQueueExist.push(socketId);
    } else {
      this.waitingQueue.set(gamePreference, [socketId]);
    }
    console.log(
      `User ${socketId} added to waiting queue. Queue length: ${this.waitingQueue.get(gamePreference)?.length}`
    );
  }

  // Try to match users and create a room (returns room info if successful)
  tryCreateRoom(
    gamePreference: string
  ): { roomId: string; users: string[] } | null {
    // Check if we have at least 2 people waiting
    const waitingQueue: string[] | undefined =
      this.waitingQueue.get(gamePreference);
    if (!waitingQueue || waitingQueue.length < 2) {
      return null; // Not enough users to create a room
    }

    // Get the first 2 users from the queue (First In, First Out)
    const user1Id = waitingQueue.shift()!; // shift() removes first element
    const user2Id = waitingQueue.shift()!; // shift() removes first element

    // Create a new room with a unique ID
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      users: [user1Id, user2Id],
      createdAt: new Date(),
      status: "active",
    };

    // Store the room in our rooms database
    this.rooms.set(roomId, room);

    // Update both users' status - they're no longer waiting, they're in a room
    const user1 = this.users.get(user1Id)!;
    const user2 = this.users.get(user2Id)!;

    user1.roomId = roomId;
    user1.status = "in-room";
    user2.roomId = roomId;
    user2.status = "in-room";

    console.log(`Room ${roomId} created with users: ${user1Id}, ${user2Id}`);

    // Return the room info so the server can notify the users
    return {
      roomId,
      users: [user1Id, user2Id],
    };
  }

  // Remove user from system when they disconnect or leave
  removeUser(socketId: string): {
    roomId?: string;
    otherUserId?: string;
    gamePreference?: string | undefined;
  } | null {
    const user = this.users.get(socketId);
    if (!user) return null; // User doesn't exist

    const gamePreference: string = user.gamePreference;
    const waitingQueue: string[] | undefined =
      this.waitingQueue.get(gamePreference);
    if (!waitingQueue) {
      return null; // return if there is no waiting queue for that game preference
    }
    // Remove from waiting queue if they're still waiting
    const queueIndex = waitingQueue.indexOf(socketId);
    if (queueIndex > -1) {
      waitingQueue.splice(queueIndex, 1); // Remove from queue
      console.log(`User ${socketId} removed from waiting queue`);
    }

    // Handle room cleanup if user was in a room
    let result: {
      roomId?: string;
      otherUserId?: string;
      gamePreference?: string | undefined;
    } | null = null;

    if (user.roomId) {
      const room = this.rooms.get(user.roomId);
      if (room) {
        // Find the other user in the room
        const otherUserId = room.users.find((id) => id !== socketId);

        if (otherUserId) {
          // Update other user's status - put them back in queue
          const otherUser = this.users.get(otherUserId);
          if (otherUser) {
            otherUser.roomId = undefined; // No longer in a room
            otherUser.status = "waiting"; // Back to waiting
            // Put them back in the queue for a new match
            waitingQueue.push(otherUserId);
          }
        }

        // Delete the room since someone left
        this.rooms.delete(user.roomId);
        console.log(
          `Room ${user.roomId} deleted due to user ${socketId} leaving`
        );

        result = {
          roomId: user.roomId,
          gamePreference: user.gamePreference,
          otherUserId,
        };
      }
    }

    // Remove user completely from the system
    this.users.delete(socketId); 
    console.log(`User ${socketId} completely removed from system`);

    return result; // Return info about what was cleaned up
  }

  // Shuffle user to a new room
  shuffleUser(
    socketId: string
  ): { otherUserId?: string; gamePreference?: string | undefined } | null {
    const user = this.users.get(socketId);
    if (!user || !user.roomId) return null; // User not in a room

    const room = this.rooms.get(user.roomId);
    if (!room) return null;

    // Find the other user in the room
    const otherUserId = room.users.find((id) => id !== socketId);

    // Delete the old room first
    this.rooms.delete(user.roomId);
    console.log(`Room ${user.roomId} deleted for shuffle.`);

    // Put the shuffling user back in the queue
    user.roomId = undefined;
    user.status = "waiting";
    const waitingQueue: string[] | undefined = this.waitingQueue.get(
      user.gamePreference
    );
    if (!waitingQueue) {
      this.waitingQueue.set(user.gamePreference, [socketId]);
    } else {
      waitingQueue.push(socketId);
    }

    console.log(`User ${socketId} is shuffling and back in queue.`);

    // Put the other user back in the queue
    if (otherUserId) {
      const otherUser = this.users.get(otherUserId);
      if (otherUser) {
        otherUser.roomId = undefined;
        otherUser.status = "waiting";
        const otherUserWaitingQueue: string[] | undefined =
          this.waitingQueue.get(otherUser.gamePreference);
        if (!otherUserWaitingQueue) {
          this.waitingQueue.set(otherUser.gamePreference, [otherUserId]);
        } else {
          otherUserWaitingQueue.push(otherUserId);
        }
        console.log(`User ${otherUserId} put back into waiting queue.`);
        return { otherUserId, gamePreference: otherUser.gamePreference };
      }
    }
    return { otherUserId };
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
    return room.users.find((id) => id !== socketId) || null;
  }

  // Get system statistics for monitoring
  getStats(): {
    totalUsers: number;
    waitingUsers: number;
    activeRooms: number;
  } {
    return {
      totalUsers: this.users.size, // How many users total
      waitingUsers: Array.from(this.waitingQueue.values()).reduce(
        (prev, curr) => prev + curr.length,
        0
      ), // How many waiting for match
      activeRooms: this.rooms.size, // How many active rooms
    };
  }
}
