import { SOCKET_EVENTS } from "@socket/events";
import { Socket } from "socket.io-client";
import { EventEmitter } from "../lib/event-emiter";

type EventEmitterEvents = {
  iceCandidate: RTCPeerConnectionIceEvent;
  track: RTCTrackEvent;
  connectionstatechange: RTCPeerConnectionState;
  onUserReceived: { user: { userName: string } };
};

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: Socket;
  private eventEmitter = new EventEmitter<EventEmitterEvents>();
  private isPolite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private localStreams: MediaStream[] = [];

  constructor({ socket, isPolite }: { socket: Socket; isPolite: boolean }) {
    this.socket = socket;
    this.isPolite = isPolite;
    this.initializePeerConnection();
  }

  private initializePeerConnection() {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
    this.peerConnection.onconnectionstatechange =
      this.handleConnectionStateChange;

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
      this.eventEmitter.emit(
        "connectionstatechange",
        this.peerConnection.connectionState
      );
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
    console.log("DD:: Call received:", data.from);
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
}
