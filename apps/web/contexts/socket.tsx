"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useRef, // Add useRef
} from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

type SocketProviderProps = {
  children: ReactNode;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null); // Use useRef for socket

  useEffect(() => {
    // Replace with your server URL
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL);

    socketInstance.on("connect", () => {
      console.log("Connected to socket server");
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    socketRef.current = socketInstance; // Assign to ref

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
