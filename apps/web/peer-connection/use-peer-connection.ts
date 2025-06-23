"use client";
import { socket } from "@socket/socket";
import { PeerConnectionManager } from "peer-connection/manager";
import { useCallback, useRef } from "react";

export function usePeerConnection() {
  const managerRef = useRef<PeerConnectionManager | null>(null);

  const init = useCallback((isPolite: boolean) => {
    managerRef.current = new PeerConnectionManager({ socket, isPolite });
    return managerRef.current;
  }, []);

  return { manager: managerRef.current, init };
}
