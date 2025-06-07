"use client";
import { useWindowSize } from "usehooks-ts";
import { useCallback, useEffect, useRef } from "react";
import { socket } from "@socket/socket";
import { SOCKET_EVENTS } from "@socket/events";
import { Button } from "@konekt/ui/button";

export function Home() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
    const localVideo = localVideoRef.current;

    if (!localVideo) return;

    const constraints = {
      video: true,
      audio: true,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        localVideo.srcObject = stream;
        localVideo.play();
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  }, []);

  useEffect(() => {
    const handleSocketConnect = () => {
      console.log("Connected to socket server");
      // You can emit events or join rooms here if needed
      // socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: "exampleRoom" });
    };

    const handleCallResponse = (data: any) => {
      console.log("Call response received:", data);
    };

    socket.on(SOCKET_EVENTS.CONNECT, handleSocketConnect);
    socket.on(SOCKET_EVENTS.CALL_RESPONSE, handleCallResponse);

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, handleSocketConnect);
      socket.off(SOCKET_EVENTS.CALL_RESPONSE, handleCallResponse);
    };
  }, []);

  const handleClick = useCallback(() => {
    socket.emit(SOCKET_EVENTS.CALL, {
      message: "Initiating call",
      name: "John Doe",
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <video
          ref={localVideoRef}
          width={width * 0.3}
          height={height * 0.3}
          autoPlay
          playsInline
          style={{
            height: height * 0.4,
            width: width * 0.4,
          }}
          className="rounded-2xl overflow-clip border-2 border-blue-500"
        />
        <video
          ref={remoteVideoRef}
          width={width * 0.4}
          height={height * 0.4}
          autoPlay
          playsInline
          className="rounded-2xl border-2 border-blue-500"
        />
      </div>
      <Button onClick={handleClick}>Call</Button>
    </div>
  );
}
