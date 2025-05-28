"use client";
import { useScript, useWindowSize } from "usehooks-ts";
import { useEffect, useRef, useState } from "react";

// Type declarations for PeerJS
interface PeerCall {
  answer: (stream: MediaStream) => void;
  on: (event: string, callback: (stream?: MediaStream) => void) => void;
  close: () => void;
}

interface Peer {
  id: string;
  on: (event: string, callback: (id?: string | PeerCall) => void) => void;
  call: (id: string, stream: MediaStream) => PeerCall;
  disconnect: () => void;
  reconnect: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    Peer: new (options?: Record<string, unknown>) => Peer;
  }
}

export function Home() {
  const scriptStatus = useScript(
    "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useWindowSize();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [myPeerId, setMyPeerId] = useState<string>("");
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);

  // Initialize PeerJS
  useEffect(() => {
    if (scriptStatus !== "ready") return;

    const peerInstance = new (window as any).Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peerInstance.on("open", (id: string) => {
      console.log("My peer ID is: " + id);
      setMyPeerId(id);
    });

    peerInstance.on("call", async (call: PeerCall) => {
      console.log("Receiving call...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        call.answer(stream);
        setIsCallActive(true);

        call.on("stream", (remoteStream?: MediaStream) => {
          console.log("Received remote stream");
          if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        call.on("close", () => {
          console.log("Call ended");
          setIsCallActive(false);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
        });
      } catch (error) {
        console.error("Error answering call:", error);
      }
    });

    peerInstance.on("error", (error: Error) => {
      console.error("Peer error:", error);
    });

    setPeer(peerInstance);
    setIsMounted(true);

    return () => {
      if (peerInstance) {
        peerInstance.destroy();
      }
    };
  }, [scriptStatus]);

  // Get user media on mount
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    if (isMounted) {
      getUserMedia();
    }
  }, [isMounted]);

  const startCall = async () => {
    if (!peer || !remotePeerId || !localStream) {
      alert("Please enter a remote peer ID and ensure your camera is working");
      return;
    }

    try {
      console.log("Starting call to:", remotePeerId);
      const call = peer.call(remotePeerId, localStream);
      setIsCallActive(true);

      call.on("stream", (remoteStream?: MediaStream) => {
        console.log("Received remote stream");
        if (remoteVideoRef.current && remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      call.on("close", () => {
        console.log("Call ended");
        setIsCallActive(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      call.on("error", (error?: any) => {
        console.error("Call error:", error);
        setIsCallActive(false);
      });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    if (peer) {
      peer.disconnect();
      peer.reconnect();
      setIsCallActive(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  };

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full justify-center items-center p-6">
      {/* Peer ID Display */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Video Call App</h2>
        <div className="bg-gray-100 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Your Peer ID:</p>
          <p className="font-mono text-lg font-semibold">
            {myPeerId || "Loading..."}
          </p>
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex flex-col gap-4 items-center">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter remote peer ID"
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={startCall}
            disabled={isCallActive || !remotePeerId}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCallActive ? "Calling..." : "Start Call"}
          </button>
          {isCallActive && (
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              End Call
            </button>
          )}
        </div>

        {isCallActive && (
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Call Active</span>
          </div>
        )}
      </div>

      {/* Video Display */}
      <div className="flex gap-4 w-full justify-center items-center">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-2">Your Video</h3>
          <video
            ref={videoRef}
            height={height * 0.4}
            width={width * 0.4}
            autoPlay
            muted
            className="rounded-xl border-2 border-gray-300"
          />
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-2">Remote Video</h3>
          <video
            ref={remoteVideoRef}
            height={height * 0.4}
            width={width * 0.4}
            autoPlay
            muted
            className="rounded-xl bg-gray-900 border-2 border-gray-300"
          />
        </div>
      </div>
    </div>
  );
}
