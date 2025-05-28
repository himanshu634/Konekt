import { Socket, Server as SocketIOServer } from "socket.io";
import type { RoomsMap } from "./client-events";

export function handleRoomEvents(
  io: SocketIOServer,
  socket: Socket,
  rooms: RoomsMap
) {
  // Handle joinRoom event
  socket.on("joinRoom", (roomName: string) => {
    socket.join(roomName);
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }
    rooms.get(roomName)?.add(socket.id);

    console.log(`🚪 Client ${socket.id} joined room: ${roomName}`);
    socket.emit("joinedRoom", { roomName, clientId: socket.id });
    // Emit to others in the room
    socket.to(roomName).emit("userJoinedRoom", {
      roomName,
      clientId: socket.id,
      members: Array.from(rooms.get(roomName) || []),
    });
    console.log(`👥 Members in room ${roomName}: ${rooms.get(roomName)?.size}`);
  });

  socket.on("offer", ({ offer, roomName }) => {
    console.log(`📩 Offer from ${socket.id} in room ${roomName}:`, offer);
    socket.to(roomName).emit("offer", { offer, senderId: socket.id });
  });

  socket.on("answer", ({ answer, roomName }) => {
    console.log(`📩 Answer from ${socket.id} in room ${roomName}:`, answer);
    socket.to(roomName).emit("answer", { answer, senderId: socket.id });
  });

  socket.on("iceCandidate", ({ candidate, roomName }) => {
    console.log(
      `🧊 ICE Candidate from ${socket.id} in room ${roomName}:`,
      candidate
    );
    socket.to(roomName).emit("iceCandidate", {
      candidate,
      senderId: socket.id,
    });
  });

  // Handle leaveRoom event
  socket.on("leaveRoom", (roomName: string) => {
    socket.leave(roomName);
    const roomMembers = rooms.get(roomName);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      if (roomMembers.size === 0) {
        rooms.delete(roomName);
        console.log(`🧹 Room ${roomName} is now empty and has been removed.`);
      } else {
        console.log(`👥 Members in room ${roomName}: ${roomMembers.size}`);
      }
    }

    console.log(`🚪 Client ${socket.id} left room: ${roomName}`);
    socket.emit("leftRoom", { roomName, clientId: socket.id });
    // Emit to others in the room
    socket.to(roomName).emit("userLeftRoom", {
      roomName,
      clientId: socket.id,
      members: Array.from(rooms.get(roomName) || []),
    });
    console.log(
      `👥 Members in room ${roomName}: ${rooms.get(roomName)?.size || 0}`
    );
  });

  // Handle messageRoom event
  socket.on(
    "messageRoom",
    (data: { roomName: string; message: any; senderName?: string }) => {
      const { roomName, message, senderName } = data;
      console.log(
        `💬 Message from ${socket.id} (or ${senderName}) in room ${roomName}:`,
        message
      );
      // Broadcast to others in the room
      socket.to(roomName).emit("roomMessage", {
        roomName,
        message,
        senderId: socket.id,
        senderName: senderName || socket.id,
        timestamp: new Date().toISOString(),
      });
    }
  );
}
