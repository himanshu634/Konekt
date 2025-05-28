"use client";
import { useWindowSize } from "usehooks-ts";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "contexts/socket";

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useWindowSize();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { socket } = useSocket();

  console.log("Sockeet::", socket?.id);
  // useEffect(() => {
  //   socket.
  // }, [])

  // Handle media stream
  useEffect(() => {
    setIsMounted(true);
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    })();
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <video
      ref={videoRef}
      height={height * 0.5}
      width={width * 0.5}
      autoPlay
      muted
      className="rounded-xl"
    />
  );
}
