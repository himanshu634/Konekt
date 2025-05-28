"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState, // Add useState
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
  const [socket, setSocket] = useState<Socket | null>(null); // Use useState for socket

  useEffect(() => {
    // Replace with your server URL
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL!);

    socketInstance.on("connect", () => {
      console.log("Connected to socket server");
    });

    socketInstance.on("welcome", (data) => {
      console.log("Welcome message from server:", data);
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    setSocket(socketInstance); // Assign to state

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  if (!socket) {
    return <p>Connecting to socket...</p>; // Don't render children if socket is not available
  }

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
