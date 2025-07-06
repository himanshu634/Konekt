export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CALL: "call",
  CALL_RECEIVED: "callReceived",
  ANSWER: "answer",
  OFFER: "offer",
  /**
   * Event to handle ICE candidates during WebRTC connection establishment.
   */
  CANDIDATE: "candidate",
  JOIN_QUEUE: "joinQueue",
  LEAVE_QUEUE: "leaveQueue",
  SHUFFLE_QUEUE: "shuffleQueue",
  WAITING_FOR_MATCH: "waitingForMatch",
  ROOM_CREATED: "roomCreated",
  ROOM_MATE_LEFT: "roomMateLeft",
  SHUFFLE: "shuffle",
} as const;
