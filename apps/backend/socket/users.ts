type UserData = {
  id: string;
  name: string;
  timestamp: number;
};

const users = new Map<string, UserData>();
const waitingUser = new Map<string, UserData>();

export function addUser(socketId: string, userName: string): UserData {
  const userData: UserData = {
    id: socketId,
    name: userName,
    timestamp: Date.now(),
  };
  waitingUser.set(socketId, userData);
  users.set(socketId, userData);
  console.log("User added:", JSON.stringify(userData));
  console.log("Waiting user added:", waitingUser.size);
  return userData;
}

export function removeUser(socketId: string): void {
  users.delete(socketId);
  waitingUser.delete(socketId);
}
