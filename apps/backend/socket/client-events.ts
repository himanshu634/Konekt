import { Socket, Server as SocketIOServer } from "socket.io";

// Define a type for the connected clients map for better type safety
export type ConnectedClientsMap = Map<
  string,
  { id: string; connectTime: Date }
>;
export type RoomsMap = Map<string, Set<string>>;

export function handleClientConnection(
  io: SocketIOServer,
  socket: Socket,
  connectedClients: ConnectedClientsMap,
  rooms: RoomsMap
) {
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

  socket.on("manualDisconnect", () => {
    console.log(`🔌 Client ${socket.id} requested manual disconnect`);
    socket.disconnect();
  });
}

export function handleClientDisconnection(
  io: SocketIOServer,
  socket: Socket,
  connectedClients: ConnectedClientsMap,
  rooms: RoomsMap,
  reason: string
) {
  console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`);

  // Remove client from tracking
  const clientInfo = connectedClients.get(socket.id);
  if (clientInfo) {
    const connectionDuration = Date.now() - clientInfo.connectTime.getTime();
    console.log(
      `⏱️  Client ${socket.id} was connected for ${Math.round(
        connectionDuration / 1000
      )}s`
    );
    connectedClients.delete(socket.id);
  }

  // Handle client leaving rooms on disconnect
  rooms.forEach((clientsInRoom, roomName) => {
    if (clientsInRoom.has(socket.id)) {
      clientsInRoom.delete(socket.id);
      console.log(
        `🚪 Client ${socket.id} automatically left room: ${roomName} on disconnect`
      );
      if (clientsInRoom.size === 0) {
        rooms.delete(roomName);
        console.log(`🧹 Room ${roomName} is now empty and has been removed.`);
      } else {
        // Use io.to(roomName) for broadcasting to room from server-side logic outside of socket instance
        io.to(roomName).emit("userLeftRoom", {
          roomName,
          clientId: socket.id,
          members: Array.from(clientsInRoom),
        });
        console.log(`👥 Members in room ${roomName}: ${clientsInRoom.size}`);
      }
    }
  });

  console.log(`📊 Total connected clients: ${connectedClients.size}`);

  // Broadcast to all remaining clients that a client disconnected
  socket.broadcast.emit("clientDisconnected", {
    clientId: socket.id,
    totalClients: connectedClients.size,
  });
}
