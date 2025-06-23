"use client";
import { socket } from "@socket/socket";
import { PeerConnectionManager } from "peer-connection/manager";
import { useRef } from "react";

export function usePeerConnection() {
  const managerRef = useRef<PeerConnectionManager>(
    new PeerConnectionManager({ socket: socket })
  );

  return { manager: managerRef.current };
}
