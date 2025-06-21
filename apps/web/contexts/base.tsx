"use client";
import { createContext, useContext, useRef } from "react";

type BaseContextType = {
  peerConnectionRef: React.RefObject<{
    peerConnection: null | RTCPeerConnection;
    isInitiator: boolean;
  }>;
};

const BaseContext = createContext<BaseContextType | undefined>(undefined);

export function BaseProvider({ children }: { children: React.ReactNode }) {
  // This is a base object to hold the peer connection reference.
  const peerConnectionRef = useRef<{
    peerConnection: null | RTCPeerConnection;
    isInitiator: boolean;
  }>({ peerConnection: null, isInitiator: false });
  if (!peerConnectionRef.current.peerConnection) {
    peerConnectionRef.current.peerConnection = new RTCPeerConnection();
  }

  return (
    <BaseContext.Provider value={{ peerConnectionRef }}>
      {children}
    </BaseContext.Provider>
  );
}

export function useBaseContext() {
  const context = useContext(BaseContext);
  if (!context) {
    throw new Error("useBaseContext must be used within a BaseProvider");
  }
  return context;
}
