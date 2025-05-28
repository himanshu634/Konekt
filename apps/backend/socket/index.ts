import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins for development - restrict in production
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Track connected clients
  const connectedClients = new Map<string, { id: string; connectTime: Date }>();

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Store client info
    connectedClients.set(socket.id, {
      id: socket.id,
      connectTime: new Date(),
    });

    // Log current connection count
    console.log(`📊 Total connected clients: ${connectedClients.size}`);

    // Send welcome message to the connected client
    socket.emit("welcome", {
      message: "Successfully connected to Konekt server",
      clientId: socket.id,
      serverTime: new Date().toISOString(),
    });

    // Broadcast to all other clients that a new client connected
    socket.broadcast.emit("clientConnected", {
      clientId: socket.id,
      totalClients: connectedClients.size,
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`);

      // Remove client from tracking
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        const connectionDuration =
          Date.now() - clientInfo.connectTime.getTime();
        console.log(
          `⏱️  Client ${socket.id} was connected for ${Math.round(connectionDuration / 1000)}s`
        );
        connectedClients.delete(socket.id);
      }

      console.log(`📊 Total connected clients: ${connectedClients.size}`);

      // Broadcast to all remaining clients that a client disconnected
      socket.broadcast.emit("clientDisconnected", {
        clientId: socket.id,
        totalClients: connectedClients.size,
      });
    });

    // Optional: Handle manual disconnect request
    socket.on("manualDisconnect", () => {
      console.log(`🔌 Client ${socket.id} requested manual disconnect`);
      socket.disconnect();
    });
  });

  // Return io instance for potential use elsewhere
  return io;
}
