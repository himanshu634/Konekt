import {
  useRef,
  useEffect,
  useCallback,
  type ComponentProps,
  useState,
} from "react";
import { socket } from "@socket/socket";
import { SOCKET_EVENTS } from "@socket/events";
import { Button } from "@konekt/ui/button";
import { cn } from "@konekt/ui/utils";
import { VideoPlayer } from "./video-player";
import { usePeerConnection } from "@contexts/peer-connection";

type VideoPlayersPropsType = ComponentProps<"div"> & {
  userName: string;
};

export function Streams({
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

  useEffect(() => {
    // Handle incoming remote media tracks
    function handleTrack(event: RTCTrackEvent) {
      const remoteVideo = remoteVideoRef.current;
      const remoteStream = event.streams[0];
      if (remoteVideo && remoteStream) {
        remoteVideo.srcObject = remoteStream;
        remoteVideo.play();
      }
    }

    // Update connection state when peer connection state changes
    function handleConnectionStateChange(
      connectionState: RTCPeerConnectionState
    ) {
      if (connectionState === "connected") {
        setConnectionState("connected");
      }
    }

    // Set opponent's username and update state when user info is received
    function handleUserReceived(data: { user: { userName: string } }) {
      setOpponentUserName(data.user.userName);
      setConnectionState("matched");
    }

    function handleConnecttionDisconnected() {
      setConnectionState("idle");
      setOpponentUserName("");
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        remoteVideo.srcObject = null; // Reset remote video when disconnected
      }
    }

    manager?.on("track", handleTrack);
    manager?.on("connectionStateChange", handleConnectionStateChange);
    manager?.on("onUserReceived", handleUserReceived);
    manager?.on("disconnected", handleConnecttionDisconnected);
    return () => {
      manager?.off("track", handleTrack);
      manager?.off("connectionStateChange", handleConnectionStateChange);
      manager?.off("onUserReceived", handleUserReceived);
      manager?.off("disconnected", handleConnecttionDisconnected);
      manager?.destroy();
    };
  }, [manager]);

  // Initialize and display local video stream
  useEffect(() => {
    const localVideo = localVideoRef.current;
    if (!localVideo) return;

    const constraints = {
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
      },
    };

    let mediaStream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((streams) => {
        mediaStream = streams;
        localVideo.srcObject = streams;
        localVideo.play();
        manager?.addTracks([streams]);
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });

    return () => {
      // Cleanup media stream tracks to prevent echo
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, [manager]);

  useEffect(() => {
    // Add ICE candidate to peer connection
    const handleCandidateReceived = (data: { candidate: RTCIceCandidate }) => {
      if (data.candidate) {
        manager?.addIceCandidate(data.candidate);
      }
    };

    // Set state to waiting when searching for a match
    const handleWaitingForMatch = () => {
      console.log("Waiting for match...");
      setConnectionState("waiting");
    };

    // Handle room creation and initialize polite/impolite logic
    const handleRoomCreated = (data: { roomId: string; users: string[] }) => {
      const otherUser = data.users.find((id) => id !== socket.id);
      const isPolite = (socket.id ? socket.id : "") > (otherUser ?? "");
      console.log(
        "Room created:",
        data.roomId,
        "Other user:",
        otherUser,
        "Is polite:"
      );
      init(isPolite);
      // setRoomInfo({ roomId: data.roomId, otherUser });
      setConnectionState("matched");
    };

    // Handle when the room mate leaves
    const handleRoomMateLeft = () => {
      setConnectionState("waiting");
      // setRoomInfo({});
      // Reset remote video since partner left
      const remoteVideo = remoteVideoRef.current;
      if (remoteVideo) {
        remoteVideo.srcObject = null;
      }
    };

    // Register socket event listeners
    socket.on(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
    socket.on(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
    socket.on(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);
    socket.on(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    // }, 10000);

    return () => {
      socket.off(SOCKET_EVENTS.WAITING_FOR_MATCH, handleWaitingForMatch);
      socket.off(SOCKET_EVENTS.ROOM_CREATED, handleRoomCreated);
      socket.off(SOCKET_EVENTS.ROOM_MATE_LEFT, handleRoomMateLeft);
      socket.off(SOCKET_EVENTS.CANDIDATE, handleCandidateReceived);
    };
  }, [init, manager]);

  // Emit event to join the matchmaking queue
  const handleFindMatch = useCallback(() => {
    setConnectionState("waiting");
    socket.emit(SOCKET_EVENTS.JOIN_QUEUE, { userName });
  }, [userName]);

  // Leave the matchmaking queue and reset state
  const handleLeaveQueue = useCallback(() => {
    setConnectionState("idle");
    socket.emit(SOCKET_EVENTS.LEAVE_QUEUE);
  }, []);

  // Get button configuration based on current connection state
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
      case "calling":
        return {
          text: "Connecting...",
          action: () => {},
          disabled: true,
          variant: "default" as const,
        };
      case "matched":
        return {
          text: "Shuffle!",
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
    <div className={cn("gap-4 flex flex-col", className)} {...restProps}>
      <div className="gap-4 flex! lg:flex-col">
        <VideoPlayer ref={localVideoRef} userName={userName} muted={true} />
        <VideoPlayer
          ref={remoteVideoRef}
          userName={opponentUserName}
          muted={false}
        />
      </div>
      <Button
        onClick={buttonConfig.action}
        disabled={buttonConfig.disabled}
        variant={buttonConfig.variant}
      >
        {buttonConfig.text}
      </Button>
    </div>
  );
}
