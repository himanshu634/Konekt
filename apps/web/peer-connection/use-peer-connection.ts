import { socket } from "@socket/socket";
import { PeerConnectionManager } from "lib/peer-connection-manager";
import { useRef } from "react";

export function usePeerConnection() {
  const managerRef = useRef<PeerConnectionManager>(
    new PeerConnectionManager({ isInitiator: false, socket: socket })
  );
}
