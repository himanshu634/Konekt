"use client";
import { useWindowSize } from "usehooks-ts";
import { useEffect, useRef, useState } from "react";
import { useSocket } from "contexts/socket";

export function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { width, height } = useWindowSize();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) {
      console.log("Socket is not available yet.");
      return;
    }

    console.log("Setting up PeerConnection and socket listeners.");
    const peerConfig = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    const peerConnection = new RTCPeerConnection(peerConfig);

    // Generate a unique ID for this peer to implement polite/impolite strategy
    const peerId = Math.random().toString(36).substr(2, 9);
    let isPolite = false; // Will be determined when we know the other peer's ID

    const handleIceCandidateEvent = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        console.log("New ICE candidate:", event.candidate);
        socket?.emit("iceCandidate", {
          candidate: event.candidate,
          roomName: "test-room",
        });
      }
    };

    const handleRemoteIceCandidate = async ({
      candidate,
    }: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("ICE candidate added successfully");
        } catch (error) {
          console.error("Error adding received ICE candidate", error);
        }
      }
    };

    const handleOffer = async ({
      offer: remoteOffer,
      senderId,
    }: {
      offer: RTCSessionDescriptionInit;
      senderId: string;
    }) => {
      console.log("Received offer from:", senderId, "Offer:", remoteOffer);
      console.log(
        `Current signaling state before processing offer: ${peerConnection.signalingState}`
      );

      // Determine politeness based on peer IDs to resolve offer collisions
      isPolite = peerId < senderId;

      // Handle offer collision (glare) with polite/impolite strategy
      const offerCollision =
        peerConnection.signalingState === "have-local-offer" ||
        peerConnection.signalingState === "stable";

      if (offerCollision && !isPolite) {
        console.log("Impolite peer ignoring offer collision");
        return; // Ignore the offer, let the other peer handle it
      }

      if (offerCollision && isPolite) {
        console.log("Polite peer rolling back local offer");
        // Rollback local offer by restarting ice
        await peerConnection.setLocalDescription({ type: "rollback" });
      }

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(remoteOffer)
        );
        console.log("Remote description (offer) set successfully.");
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log("Answer created and local description set:", answer);
        socket?.emit("answer", {
          answer,
          roomName: "test-room",
          targetId: senderId,
        });
      } catch (error) {
        console.error("Error processing offer and creating answer:", error);
      }
    };

    const handleAnswer = async ({
      answer: remoteAnswer,
    }: {
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log("Received answer:", remoteAnswer);
      console.log(
        `Current signaling state before processing answer: ${peerConnection.signalingState}`
      );

      // Only process answer if we're in the correct state
      if (peerConnection.signalingState === "have-local-offer") {
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(remoteAnswer)
          );
          console.log("Remote description (answer) set successfully.");
        } catch (error) {
          console.error("Error setting remote description from answer:", error);
        }
      } else if (peerConnection.signalingState === "stable") {
        console.log(
          "Connection already established, ignoring duplicate answer."
        );
      } else {
        console.warn(
          `Received answer but not in expected state. Current state: ${peerConnection.signalingState}. Expected: 'have-local-offer'`
        );
      }
    };

    peerConnection.onicecandidate = handleIceCandidateEvent;

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log("Remote stream set to video element");
      }
    };

    // Monitor connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state changed to: ${peerConnection.connectionState}`
      );
    };

    peerConnection.onsignalingstatechange = () => {
      console.log(
        `Signaling state changed to: ${peerConnection.signalingState}`
      );
    };

    socket.on("iceCandidate", handleRemoteIceCandidate);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);

    // Initial logic: join room and create/send offer
    (async () => {
      try {
        socket.emit("joinRoom", "test-room");

        // Add local stream to peer connection before creating offer
        if (
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getUserMedia === "function"
        ) {
          try {
            const localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            localStream.getTracks().forEach((track) => {
              peerConnection.addTrack(track, localStream);
            });
            console.log("Local stream added to peer connection");
          } catch (mediaError) {
            console.error(
              "Error getting local media for peer connection:",
              mediaError
            );
          }
        }

        console.log("Attempting to create offer.");
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log("Offer created and local description set:", offer);
        socket.emit("offer", { offer, roomName: "test-room" });
      } catch (error) {
        console.error("Error during initial offer creation/sending:", error);
      }
    })();

    return () => {
      console.log("Cleaning up PeerConnection and socket listeners.");
      socket.off("iceCandidate", handleRemoteIceCandidate);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      if (peerConnection) {
        peerConnection.onicecandidate = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.onsignalingstatechange = null;
        peerConnection.ontrack = null;
        peerConnection.close();
      }
    };
  }, [socket]); // Assuming peerConfig is stable or add to dependencies if it can change

  // Handle media stream
  useEffect(() => {
    setIsMounted(true);
    let stream: MediaStream | null = null;
    const currentVideoRef = videoRef.current; // Capture ref value

    (async () => {
      try {
        // Check if mediaDevices is supported
        if (
          !navigator.mediaDevices ||
          typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
          console.error("MediaDevices API not supported.");
          // Handle UI: show error message to user
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (currentVideoRef) {
          currentVideoRef.srcObject = stream;
          currentVideoRef.play().catch((playError) => {
            console.error("Error attempting to play video:", playError);
            // This can happen if the user hasn't interacted with the page yet.
          });
        }
      } catch (error) {
        console.error("Error accessing media devices.", error);
        // Handle UI: show error message to user, e.g. permissions denied
      }
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        console.log("Media stream stopped.");
      }
      if (currentVideoRef) {
        currentVideoRef.srcObject = null;
      }
    };
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex gap-4 w-full justify-center items-center">
      <video
        ref={videoRef}
        height={height * 0.4}
        width={width * 0.4}
        autoPlay
        muted
        className="rounded-xl"
      />
      <video
        ref={remoteVideoRef}
        height={height * 0.4}
        width={width * 0.4}
        autoPlay
        muted
        className="rounded-xl bg-amber-950"
      />
    </div>
  );
}
