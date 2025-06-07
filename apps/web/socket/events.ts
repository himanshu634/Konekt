export const SOCKET_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CALL: "call",
  CALL_RECEIVED: "callReceived",
  ANSWER: "answer",
  OFFER: "offer",
  JOIN: "join",
  GET_RANDOM_PERSON: "getRandomPerson",
  CANDIDATE: "candidate",
} as const;
