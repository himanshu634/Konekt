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
import { usePeerConnection } from "peer-connection/use-peer-connection";

type VideoPlayersPropsType = ComponentProps<"div"> & {
  userName: string;
};

export function VideoPlayers({
  userName,
  className,
  ...restProps
}: VideoPlayersPropsType) {
  const { manager, init } = usePeerConnection();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [opponentUserName, setOpponentUserName] = useState<string>("");

  const [connectionState, setConnectionState] = useState<
    "idle" | "waiting" | "matched" | "calling" | "connected"
  >("idle");
  const [roomInfo, setRoomInfo] = useState<{
    roomId?: string;
    otherUser?: string;
  }>({});

  useEffect(() => {
    function handleTrack(event: RTCTrackEvent) {
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo && event.streams[0] && event.streams.length > 0) {
        // Set the remote video stream to the video element
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.play();
      }
    }
    function handleConnectionStateChange(
      connectionState: RTCPeerConnectionState
    ) {
      if (connectionState === "connected") {
        setConnectionState("connected");
      }
    }

    function handleUserReceived(data: { user: { userName: string } }) {
      setOpponentUserName(data.user.userName);
      setConnectionState("matched");
    }

    manager?.on("track", handleTrack);
    manager?.on("connectionstatechange", handleConnectionStateChange);
    manager?.on("onUserReceived", handleUserReceived);
    return () => {
      manager?.off("track", handleTrack);
      manager?.off("connectionstatechange", handleConnectionStateChange);
      manager?.off("onUserReceived", handleUserReceived);
      manager?.destroy();
    };
  }, [manager]);

  // Initialize local video stream
  useEffect(() => {
    const localVideo = localVideoRef.current;

    if (!localVideo) return;

    const constraints = {
      video: true,
      audio: true,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((streams) => {
        localVideo.srcObject = streams;
        localVideo.play();
        manager?.addTracks([streams]);
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  }, [manager]);

  useEffect(() => {
    const handleCandidateReceived = (data: { candidate: RTCIceCandidate }) => {
      if (data.candidate) {
        manager?.addIceCandidate(data.candidate);
      }
    };

    // NEW: Room-based event handlers
    const handleWaitingForMatch = () => {
      setConnectionState("waiting");
    };

    const handleRoomCreated = (data: { roomId: string; users: string[] }) => {
      const otherUser = data.users.find((id) => id !== socket.id);
      const isPolite = (socket.id ? socket.id : "") > (otherUser ?? "");
      init(isPolite);

      setRoomInfo({
        roomId: data.roomId,
        otherUser,
      });

      setConnectionState("matched");
    };

    const handleRoomMateLeft = () => {
      setConnectionState("waiting");
      setRoomInfo({});

      // Reset remote video since partner left
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        remoteVideo.srcObject = null;
      }
    };

    socket.on(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
    socket.on(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
    socket.on(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);
    socket.on(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    return () => {
      socket.off(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
      socket.off(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
      socket.off(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);
      socket.off(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    };
  }, [init, manager]);

  const handleFindMatch = useCallback(() => {
    setConnectionState("waiting");
    socket.emit(SOCKET_EVENTS.JOIN_QUEUE, { userName });
  }, [userName]);

  const handleStartCall = useCallback(async () => {
    setConnectionState("calling");
    await manager?.call();
  }, [manager]);

  const handleLeaveQueue = useCallback(() => {
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
        <VideoPlayer ref={remoteVideoRef} userName={opponentUserName} />
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
