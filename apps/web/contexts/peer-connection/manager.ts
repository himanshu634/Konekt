import { SOCKET_EVENTS } from "@socket/events";
import { Socket } from "socket.io-client";
import { EventEmitter } from "../../lib/event-emiter";

type EventEmitterEvents = {
  iceCandidate: RTCPeerConnectionIceEvent;
  track: RTCTrackEvent;
  connectionStateChange: RTCPeerConnectionState;
  onUserReceived: { user: { userName: string } };
  connectionEstablished: void;
  onChessDataChannelOpen: void;
  onChessDataChannelMessage: { data: any };
};

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: Socket;
  private eventEmitter = new EventEmitter<EventEmitterEvents>();
  private isPolite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStreams: MediaStream[] = [];
  private chessDataChannel: RTCDataChannel | null = null;

  constructor({ socket, isPolite }: { socket: Socket; isPolite: boolean }) {
    this.socket = socket;
    this.isPolite = isPolite;
    this.initializePeerConnection();
  }

  private initializePeerConnection() {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },
        { urls: "stun:stun1.l.google.com:5349" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:5349" },
        { urls: "stun:stun3.l.google.com:3478" },
        { urls: "stun:stun3.l.google.com:5349" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:5349" },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
    this.peerConnection.onconnectionstatechange =
      this.handleConnectionStateChange;
    this.peerConnection.ondatachannel = this.handleDataChannel;

    this.peerConnection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        const offer = await this.peerConnection!.createOffer();
        await this.peerConnection!.setLocalDescription(offer);
        this.socket.emit(SOCKET_EVENTS.CALL, { offer });
      } catch (error) {
        console.error("Negotiation error:", error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.socket.on(SOCKET_EVENTS.ANSWER, this.handleAnswer);
    this.socket.on(SOCKET_EVENTS.CALL_RECEIVED, this.handleCallReceived);
  }

  private removeEventListeners() {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = null;
    this.peerConnection.ontrack = null;
    this.peerConnection.onconnectionstatechange = null;

    this.socket.off(SOCKET_EVENTS.ANSWER, this.handleAnswer);
    this.socket.off(SOCKET_EVENTS.CALL_RECEIVED, this.handleCallReceived);
  }

  private handleConnectionStateChange = () => {
    if (this.peerConnection) {
      const connectionState = this.peerConnection.connectionState;
      this.eventEmitter.emit("connectionStateChange", connectionState);

      // Emit specific event when connection is established
      if (connectionState === "connected") {
        this.eventEmitter.emit("connectionEstablished", undefined);
        console.log("WebRTC connection established successfully!");
      }
    }
  };

  private handleCallReceived = async (data: {
    offer: RTCSessionDescriptionInit;
    from: { userName: string };
  }) => {
    const offer = data.offer;
    const offerCollision =
      this.makingOffer || this.peerConnection?.signalingState !== "stable";

    this.ignoreOffer = !this.isPolite && offerCollision;
    if (this.ignoreOffer) {
      console.warn("Ignored offer due to glare handling.");
      return;
    }
    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      this.socket.emit(SOCKET_EVENTS.ANSWER, { answer });
      this.eventEmitter.emit("onUserReceived", { user: data.from });
    } catch (error) {
      console.error("Error handling remote offer:", error);
    }
  };

  private handleAnswer = async (data: {
    answer: RTCSessionDescriptionInit;
    from: { userName: string };
  }) => {
    try {
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      this.eventEmitter.emit("onUserReceived", { user: data.from });
    } catch (error) {
      console.error("Error setting remote answer:", error);
    }
  };

  private handleTrack = (event: RTCTrackEvent) => {
    this.eventEmitter.emit("track", event);
  };

  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      this.socket.emit(SOCKET_EVENTS.CANDIDATE, { candidate: event.candidate });
    }
  };

  private handleDataChannel = (event: RTCDataChannelEvent) => {
    const dataChannel = event.channel;

    // Check if this is the chess data channel
    if (dataChannel.label === "chess") {
      console.log("Received chess data channel from peer");
      this.chessDataChannel = dataChannel;

      dataChannel.onopen = (event) => {
        console.log("Received data channel opened", event);
        this.eventEmitter.emit("onChessDataChannelOpen", undefined);
      };

      dataChannel.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          this.eventEmitter.emit("onChessDataChannelMessage", {
            data: parsedData,
          });
        } catch (error) {
          console.error("Error parsing received chess data:", error);
        }
      };

      dataChannel.onerror = (error) => {
        console.error("Received data channel error:", error);
      };
    }
  };

  /**
   * Initiates a data channel for chess game communication.
   * @returns void
   */
  public initiateChessDataChannel() {
    if (!this.peerConnection) return;

    try {
      const dataChannel = this.peerConnection.createDataChannel("chess");
      this.chessDataChannel = dataChannel;
      console.log("Data channel created:", dataChannel);
      dataChannel.onopen = (event) => {
        this.chessDataChannel = dataChannel; // Store the channel for later use
        this.eventEmitter.emit("onChessDataChannelOpen", undefined);
        console.log("Data channel opened", event);
      };
      dataChannel.onmessage = (event) => {
        console.log("Received message:", event.data);
        this.eventEmitter.emit("onChessDataChannelMessage", {
          data: event.data,
        });
      };
      dataChannel.onerror = (error) => {
        console.error("Data channel error:", error);
      };
    } catch (error) {
      console.error("Error creating data channel:", error);
      return;
    }
  }

  public sendChessData(data: any) {
    if (!this.chessDataChannel || this.chessDataChannel.readyState !== "open") {
      console.error("Data channel is not open. Cannot send data.");
      return;
    }
    try {
      this.chessDataChannel.send(JSON.stringify(data));
    } catch (error) {
      console.error("Error sending chess data:", error);
    }
  }

  public addIceCandidate(candidate: RTCIceCandidateInit) {
    this.peerConnection?.addIceCandidate(candidate).catch((e) => {
      console.error("Error adding ICE candidate:", e);
    });
  }

  public addTracks(streams: MediaStream[]) {
    this.localStreams = streams;
    if (!this.peerConnection) return;

    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });
    });
  }

  public async call() {
    if (
      !this.peerConnection ||
      this.peerConnection.signalingState === "closed"
    ) {
      this.initializePeerConnection();
      this.addTracks(this.localStreams);
    }
    // negotiationneeded handles offer creation
  }

  public destroy() {
    this.removeEventListeners();
    this.peerConnection?.close();
  }

  public on<K extends keyof EventEmitterEvents>(
    event: K,
    listener: (data: EventEmitterEvents[K]) => void
  ) {
    this.eventEmitter.on(event, listener);
  }

  public off<K extends keyof EventEmitterEvents>(
    event: K,
    listener: (data: EventEmitterEvents[K]) => void
  ) {
    this.eventEmitter.off(event, listener);
  }

  public getIsPolite(): boolean {
    return this.isPolite;
  }
}
