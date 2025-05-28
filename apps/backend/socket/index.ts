import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import {
  handleClientConnection,
  handleClientDisconnection,
} from "./client-events";
import type { ConnectedClientsMap, RoomsMap } from "./client-events"; // Import types separately
import { handleRoomEvents } from "./room-events";

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for development - restrict in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Track connected clients
  const connectedClients: ConnectedClientsMap = new Map();
  // Track rooms and their members
  const rooms: RoomsMap = new Map();

  io.on("connection", (socket) => {
    handleClientConnection(io, socket, connectedClients, rooms);
    handleRoomEvents(io, socket, rooms); // Pass io here as well if needed by room events for broadcasts

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      handleClientDisconnection(io, socket, connectedClients, rooms, reason);
    });
  });

  io.on("error", (error) => {
    console.error("Socket.IO error:", error);
  });

  // Return io instance for potential use elsewhere
  return io;
}
