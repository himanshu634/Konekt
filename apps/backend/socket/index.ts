import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { SOCKET_EVENTS } from "./event-names";

const users = new Map<string, string>();

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for development - restrict in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log(`Socket disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on(SOCKET_EVENTS.CALL, (data) => {
      console.log(`Call event received: ${JSON.stringify(data)}`);
      // Handle call event logic here
      // For example, emit a response back to the client
      socket.emit(SOCKET_EVENTS.CALL_RESPONSE, {
        message: "Call received",
        data,
      });
    });
  });

  // Return io instance for potential use elsewhere
  return io;
}
