import { useRef, useEffect, useCallback, ComponentProps } from "react";
import { socket } from "@socket/socket";
import { SOCKET_EVENTS } from "@socket/events";
import { Button } from "@konekt/ui/button";
import { cn } from "@konekt/ui/utils";
import { VideoPlayer } from "./video-player";

type VideoPlayersPropsType = ComponentProps<"div"> & { userName: string };

export function VideoPlayers({
  userName,
  className,
  ...restProps
}: VideoPlayersPropsType) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    peerConnectionRef.current = new RTCPeerConnection();
    const peerConnection = peerConnectionRef.current;

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
    <div className={cn("space-y-4", className)} {...restProps}>
      <div className="space-y-4">
        <VideoPlayer ref={localVideoRef} userName={userName} />
        <VideoPlayer ref={remoteVideoRef} />
      </div>
      <Button className="mx-auto" onClick={handleClick}>
        Call
      </Button>
    </div>
  );
}
