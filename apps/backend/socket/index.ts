import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import { SOCKET_EVENTS } from "./event-names";

const usersMap: Array<string> = [];

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
      const index = usersMap.indexOf(socket.id);
      if (index !== -1) {
        usersMap.splice(index, 1);
      }
    });

    socket.on(SOCKET_EVENTS.CALL, (data) => {
      console.log("Call event received:", JSON.stringify(data));
      usersMap.push(socket.id);
      console.log("Current users:", usersMap);
      const peerId = usersMap.find((id) => id !== socket.id);
      if (peerId) {
        console.log(`Emitting call to peer: ${peerId}`, socket.id);
        io.to(peerId).emit(SOCKET_EVENTS.CALL_RECEIVED, {
          offer: data.offer,
        });
      }
    });

    socket.on(SOCKET_EVENTS.ANSWER, (data) => {
      console.log("Answer event received:", JSON.stringify(data));
      const peerId = usersMap.find((id) => id !== socket.id);
      if (peerId) {
        io.to(peerId).emit(SOCKET_EVENTS.ANSWER, {
          answer: data.answer,
        });
      }
    });

    socket.on(SOCKET_EVENTS.CANDIDATE, (data) => {
      console.log("Candidate event received:", JSON.stringify(data));
      const peerId = usersMap.find((id) => id !== socket.id);
      if (peerId) {
        io.to(peerId).emit(SOCKET_EVENTS.CANDIDATE, {
          candidate: data.candidate,
        });
      }
    });
  });

  // Return io instance for potential use elsewhere
  return io;
}
