"use client";
import { useWindowSize } from "usehooks-ts";

import { useEffect, useRef } from "react";

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useWindowSize();

  useEffect(() => {
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
