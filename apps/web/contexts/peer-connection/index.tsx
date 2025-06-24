"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { PeerConnectionManager } from "./manager";
import { socket } from "@socket/socket";

type PeerConnectionContextType = {
  manager: PeerConnectionManager | null;
  init: (isPolite: boolean) => void;
};

const PeerConnectionContext = createContext<PeerConnectionContextType | null>(
  null
);

export function PeerConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [manager, setManager] = useState<PeerConnectionManager | null>(null);

  const init = useCallback((isPolite: boolean) => {
    setManager(new PeerConnectionManager({ socket, isPolite }));
  }, []);

  return (
    <PeerConnectionContext.Provider value={{ manager, init }}>
      {children}
    </PeerConnectionContext.Provider>
  );
}

export function usePeerConnection() {
  const context = useContext(PeerConnectionContext);
  if (!context) {
    throw new Error(
      "usePeerConnection must be used within a PeerConnectionProvider"
    );
  }
  return context;
}
