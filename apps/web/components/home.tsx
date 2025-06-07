"use client";
import { useWindowSize } from "usehooks-ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@socket/socket";
import { SOCKET_EVENTS } from "@socket/events";
import { Button } from "@konekt/ui/button";
import { Input } from "@konekt/ui/input";

export function Home() {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(
    new RTCPeerConnection()
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [userName, setUserName] = useState("");
  const { width, height } = useWindowSize();

  useEffect(() => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection) return;

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
        socket.emit(SOCKET_EVENTS.CANDIDATE, { candidate: event.candidate });
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        if (event.streams[0]) remoteVideo.srcObject = event.streams[0];
        remoteVideo.play();
      }
    };

    return () => {
      peerConnection.close();
      peerConnectionRef.current = null;
    };
  }, []);

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
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          stream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, stream);
          });
        }
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  }, []);

  useEffect(() => {
    const handleAnswer = (data: any) => {
      console.log("Answer received:", data);
      if (data.answer.type === "answer") {
        const peerConnection = peerConnectionRef.current;
        if (peerConnection) {
          console.log("Setting remote description with answer:", data.answer);
          peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    };

    const handleCallReceived = async (data: any) => {
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) return;
      console.log("Call received:", data);
      if (data.offer.type === "offer") {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit(SOCKET_EVENTS.ANSWER, { answer });
      }
    };

    const handleCandidateReceived = (data: any) => {
      console.log("Candidate received:", data);
      const peerConnection = peerConnectionRef.current;
      if (peerConnection && data.candidate) {
        peerConnection
          .addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
      }
    };

    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.CALL_RECEIVED, handleCallReceived);
    socket.on(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);

    return () => {
      socket.off(SOCKET_EVENTS.ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.CALL_RECEIVED, handleCallReceived);
      socket.off(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    };
  }, []);

  const handleClick = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection) return;
    const localOffer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(localOffer);

    socket.emit(SOCKET_EVENTS.CALL, { offer: localOffer });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <video
          ref={localVideoRef}
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
          autoPlay
          playsInline
          className="rounded-2xl border-2 border-blue-500"
        />
      </div>
      <Button onClick={handleClick}>Call</Button>
      <div>
        <Input
          placeholder="Enter your name"
          onChange={(event) => {
            setUserName(event.target.value);
          }}
        />
        {/* <Button onClick={handleJoin}>Join</Button> */}
      </div>
    </div>
  );
}
