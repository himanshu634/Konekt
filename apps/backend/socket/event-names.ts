export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CALL: "call",
  CALL_RECEIVED: "callReceived",
  ANSWER: "answer",
  OFFER: "offer",
  JOIN: "join",
  CANDIDATE: "candidate",
} as const;
