import {
  useRef,
  useEffect,
  useCallback,
  ComponentProps,
  useState,
} from "react";
import { socket } from "@socket/socket";
import { SOCKET_EVENTS } from "@socket/events";
import { Button } from "@konekt/ui/button";
import { cn } from "@konekt/ui/utils";
import { VideoPlayer } from "./video-player";
import { useBaseContext } from "contexts/base";

type VideoPlayersPropsType = ComponentProps<"div"> & {
  userName: string;
};

export function VideoPlayers({
  userName,
  className,
  ...restProps
}: VideoPlayersPropsType) {
  const { peerConnectionRef } = useBaseContext();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [connectionState, setConnectionState] = useState<
    "idle" | "waiting" | "matched" | "calling" | "connected"
  >("idle");
  const [roomInfo, setRoomInfo] = useState<{
    roomId?: string;
    otherUser?: string;
  }>({});

  useEffect(() => {
    const peerConnectionInstance = peerConnectionRef.current.peerConnection;

    if (!peerConnectionInstance) {
      console.error("Peer connection is not initialized.");
      return;
    }

    // Handle ICE candidates
    peerConnectionInstance.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
        socket.emit(SOCKET_EVENTS.CANDIDATE, { candidate: event.candidate });
      }
    };

    // Handle remote stream
    peerConnectionInstance.ontrack = (event) => {
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        if (event.streams[0]) remoteVideo.srcObject = event.streams[0];
        remoteVideo.play();
        setConnectionState("connected");
      }
    };

    return () => {
      peerConnectionInstance.close();
      peerConnectionRef.current.peerConnection = null;
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
        const peerConnection = peerConnectionRef.current.peerConnection;
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
        const peerConnection = peerConnectionRef.current.peerConnection;
        if (peerConnection) {
          console.log("Setting remote description with answer:", data.answer);
          peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    };

    const handleCallReceived = async (data: any) => {
      const peerConnection = peerConnectionRef.current.peerConnection;
      if (!peerConnection) return;
      console.log("Call received:", data);
      setConnectionState("calling");

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
      const peerConnection = peerConnectionRef.current.peerConnection;
      if (peerConnection && data.candidate) {
        peerConnection
          .addIceCandidate(new RTCIceCandidate(data.candidate))
          .catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
      }
    };

    // NEW: Room-based event handlers
    const handleWaitingForMatch = () => {
      setConnectionState("waiting");
    };

    const handleRoomCreated = (data: any) => {
      setConnectionState("matched");
      setRoomInfo({
        roomId: data.roomId,
        otherUser: data.users.find((id: string) => id !== socket.id),
      });
    };

    const handleRoomMateLeft = (data: any) => {
      setConnectionState("waiting");
      setRoomInfo({});

      // Reset remote video since partner left
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        remoteVideo.srcObject = null;
      }
    };

    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.CALL_RECEIVED, handleCallReceived);
    socket.on(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    socket.on(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
    socket.on(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
    socket.on(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);

    return () => {
      socket.off(SOCKET_EVENTS.ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.CALL_RECEIVED, handleCallReceived);
      socket.off(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
      socket.off(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
      socket.off(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
      socket.off(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);
    };
  }, []);

  const handleFindMatch = useCallback(() => {
    console.log("Joining queue...");
    setConnectionState("waiting");
    socket.emit(SOCKET_EVENTS.JOIN_QUEUE);
  }, []);

  const handleStartCall = useCallback(async () => {
    const peerConnection = peerConnectionRef.current.peerConnection;
    if (!peerConnection) return;

    console.log("Starting call...");
    setConnectionState("calling");

    const localOffer = await peerConnection.createOffer();
    peerConnectionRef.current.isInitiator = true;
    console.log("Local offer created:", localOffer);
    await peerConnection.setLocalDescription(localOffer);
    socket.emit(SOCKET_EVENTS.CALL, { offer: localOffer });
  }, []);

  const handleLeaveQueue = useCallback(() => {
    console.log("Leaving queue...");
    setConnectionState("idle");
    setRoomInfo({});
    socket.emit(SOCKET_EVENTS.LEAVE_QUEUE);
  }, []);

  const getButtonConfig = () => {
    switch (connectionState) {
      case "idle":
        return {
          text: "Find Match",
          action: handleFindMatch,
          disabled: false,
          variant: "default" as const,
        };
      case "waiting":
        return {
          text: "Cancel Search",
          action: handleLeaveQueue,
          disabled: false,
          variant: "outline" as const,
        };
      case "matched":
        return {
          text: "Start Call",
          action: handleStartCall,
          disabled: false,
          variant: "default" as const,
        };
      case "calling":
        return {
          text: "Connecting...",
          action: () => {},
          disabled: true,
          variant: "default" as const,
        };
      case "connected":
        return {
          text: "Connected!",
          action: () => {},
          disabled: true,
          variant: "default" as const,
        };
      default:
        return {
          text: "Find Match",
          action: handleFindMatch,
          disabled: false,
          variant: "default" as const,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div
      className={cn("space-y-4 w-full flex flex-col", className)}
      {...restProps}
    >
      <div className="space-y-4">
        <VideoPlayer ref={localVideoRef} userName={userName} />
        <VideoPlayer ref={remoteVideoRef} />
      </div>

      <div className="text-center text-sm min-h-[20px]">
        {connectionState === "idle" && "Find a match!"}
        {connectionState === "waiting" &&
          "Looking for someone to connect with..."}
        {connectionState === "matched" && `Match found! Ready to call.`}
        {connectionState === "calling" && "Establishing connection..."}
        {connectionState === "connected" &&
          "Connection established! You can now talk."}
      </div>

      <Button
        className=""
        onClick={buttonConfig.action}
        disabled={buttonConfig.disabled}
        variant={buttonConfig.variant}
      >
        {buttonConfig.text}
      </Button>

      {roomInfo.roomId && (
        <div className="text-xs text-gray-400 text-center">
          Room: {roomInfo.roomId.slice(-8)}
        </div>
      )}
    </div>
  );
}
