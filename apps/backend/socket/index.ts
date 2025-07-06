import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { SOCKET_EVENTS } from "./event-names";
import { RoomManager } from "../room/room-manager";

// Initialize RoomManager instance
// This will manage user queues and room creation
const roomManager = new RoomManager();

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for development - restrict in production
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const stats = roomManager.getStats();
    console.log(`Current stats: ${JSON.stringify(stats)}`);
    socket.prependAny((eventName, ...args) => {
      console.log(`📡 Event emitted: ${eventName}`, ...args);
    });

    socket.on(SOCKET_EVENTS.JOIN_QUEUE, ({ userName }) => {
      console.log(`User ${socket.id} wants to join queue`, userName);

      roomManager.addUserToQueue(socket.id, userName);

      socket.emit(SOCKET_EVENTS.WAITING_FOR_MATCH);

      const roomResult = roomManager.tryCreateRoom();

      if (roomResult) {
        const { roomId, users } = roomResult;

        users.forEach((userId) => {
          io.sockets.sockets.get(userId)?.join(roomId);
        });

        io.to(roomId).emit(SOCKET_EVENTS.ROOM_CREATED, {
          roomId,
          users,
          message: "Match found! You can now start calling.",
        });

        console.log(`Room ${roomId} created and users notified`);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_QUEUE, () => {
      console.log(`User ${socket.id} leaving queue`);
      const result = roomManager.removeUser(socket.id);

      if (result?.otherUserId) {
        io.to(result.otherUserId).emit(SOCKET_EVENTS.ROOM_MATE_LEFT, {
          message:
            "Your call partner left. You've been added back to the queue.",
        });

        const newRoomResult = roomManager.tryCreateRoom();
        if (newRoomResult) {
          const { roomId, users } = newRoomResult;
          users.forEach((userId) => {
            io.sockets.sockets.get(userId)?.join(roomId);
          });
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_CREATED, {
            roomId,
            users,
            message: "New match found!",
          });
        }
      }
    });

    socket.on(SOCKET_EVENTS.SHUFFLE_QUEUE, () => {
      console.log(`User ${socket.id} wants to shuffle.`);

      const shuffleResult = roomManager.shuffleUser(socket.id);

      if (shuffleResult) {
        const { otherUserId } = shuffleResult;

        // Notify the old partner that the user has left
        if (otherUserId) {
          io.to(otherUserId).emit(SOCKET_EVENTS.ROOM_MATE_LEFT, {
            message:
              "Your partner shuffled. You've been added back to the queue to find a new match.",
          });
          // Try to find a new match for the old partner immediately
          const newRoomResultForOther = roomManager.tryCreateRoom();
          if (newRoomResultForOther) {
            const { roomId, users } = newRoomResultForOther;
            users.forEach((userId) => {
              io.sockets.sockets.get(userId)?.join(roomId);
            });
            io.to(roomId).emit(SOCKET_EVENTS.ROOM_CREATED, {
              roomId,
              users,
              message: "New match found!",
            });
          }
        }

        // Notify the shuffling user they are back in the queue
        socket.emit(SOCKET_EVENTS.WAITING_FOR_MATCH);

        // Try to find a new match for the shuffling user
        const newRoomResultForShuffler = roomManager.tryCreateRoom();
        if (newRoomResultForShuffler) {
          const { roomId, users } = newRoomResultForShuffler;
          users.forEach((userId) => {
            io.sockets.sockets.get(userId)?.join(roomId);
          });
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_CREATED, {
            roomId,
            users,
            message: "New match found after shuffling!",
          });
        }
      } else {
        // Handle case where shuffle was not possible (e.g., not in a room)
        socket.emit("error", {
          message: "Could not shuffle. You may not be in a room.",
        });
      }
    });

    // Handle disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);

      const result = roomManager.removeUser(socket.id);

      if (result?.otherUserId) {
        // Notify the other user that their room mate left
        io.to(result.otherUserId).emit(SOCKET_EVENTS.ROOM_MATE_LEFT, {
          message:
            "Your call partner disconnected. You've been added back to the queue.",
        });

        // Try to find a new match for the remaining user
        const newRoomResult = roomManager.tryCreateRoom();
        if (newRoomResult) {
          const { roomId, users } = newRoomResult;
          users.forEach((userId) => {
            io.sockets.sockets.get(userId)?.join(roomId);
          });
          io.to(roomId).emit(SOCKET_EVENTS.ROOM_CREATED, {
            roomId,
            users,
            message: "New match found!",
          });
        }
      }
    });

    socket.on(SOCKET_EVENTS.CALL, (data) => {
      console.log(
        `Call event received from ${socket.id}:`,
        JSON.stringify(data)
      );

      const roomMateId = roomManager.getRoomMate(socket.id);
      if (roomMateId) {
        console.log(
          `Forwarding call from ${socket.id} to room mate ${roomMateId}`
        );
        io.to(roomMateId).emit(SOCKET_EVENTS.CALL_RECEIVED, {
          offer: data.offer,
          from: roomManager.getUser(socket.id),
        });
      } else {
        console.log(`No room mate found for ${socket.id}`);
        socket.emit("error", {
          message: "No room mate found. Please join queue first.",
        });
      }
    });

    socket.on(SOCKET_EVENTS.ANSWER, (data) => {
      console.log(
        `Answer event received from ${socket.id}:`,
        JSON.stringify(data)
      );

      const roomMateId = roomManager.getRoomMate(socket.id);
      if (roomMateId) {
        console.log(
          `Forwarding answer from ${socket.id} to room mate ${roomMateId}`
        );
        io.to(roomMateId).emit(SOCKET_EVENTS.ANSWER, {
          answer: data.answer,
          from: roomManager.getUser(socket.id),
        });
      }
    });

    // Handle ICE candidates (now room-based)
    socket.on(SOCKET_EVENTS.CANDIDATE, (data) => {
      console.log(`Candidate event received from ${socket.id}`);

      const roomMateId = roomManager.getRoomMate(socket.id);
      if (roomMateId) {
        io.to(roomMateId).emit(SOCKET_EVENTS.CANDIDATE, {
          candidate: data.candidate,
          from: socket.id,
        });
      }
    });
  });

  // Return io instance for potential use elsewhere
  return io;
}
