import { io } from "socket.io-client";

export const socket = io("http://10.81.188.82:3001", {
  autoConnect: true,
});
