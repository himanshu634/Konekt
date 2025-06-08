import { io } from "socket.io-client";

export const socket = io("http://192.168.1.71:3001", {
  autoConnect: true,
});
