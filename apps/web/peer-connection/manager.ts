import { SOCKET_EVENTS } from "@socket/events";
import { Socket } from "socket.io-client";
import { EventEmitter } from "../lib/event-emiter";

type EventEmitterEvents = {
  iceCandidate: RTCPeerConnectionIceEvent;
  track: RTCTrackEvent;
  connectionstatechange: RTCPeerConnectionState;
};

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket;
  private eventEmitter = new EventEmitter<EventEmitterEvents>(); // Placeholder for event emitter, if needed
  private isInitiator: boolean = false;
  private localStreams: MediaStream[] = [];

  /**
   * Creates an instance of PeerConnectionManager.
   * @param param0 - Configuration object containing `isInitiator` and `socket`.
   */
  constructor({
    // isInitiator,
    socket,
  }: {
    // isInitiator: boolean;
    socket: Socket;
  }) {
    this.socket = socket;
    this.initializePeerConnection();
  }

  /**
   * Initializes the RTCPeerConnection and sets up the data channel if this peer is the initiator.
   */
  private initializePeerConnection() {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
    this.peerConnection.onconnectionstatechange =
      this.handleConnectionStateChange;

    this.socket.on(SOCKET_EVENTS.ANSWER, this.handleAnswer);
    this.socket.on(SOCKET_EVENTS.CALL_RECEIVED, this.handleCallReceived);
  }

  /**
   * Removes event listeners from the peer connection.
   */
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
  }) => {
    if (data.offer.type === "offer") {
      await this.setOffer(data.offer);
    }
  };

  private handleAnswer = (data: { answer: RTCSessionDescriptionInit }) => {
    console.log("Answer received:", data);
    if (data.answer.type === "answer") {
      this.setAnswer(data.answer);
    }
  };

  /**
   * Handles incoming media tracks.
   * @param event - The RTCTrackEvent containing the track.
   */
  private handleTrack = (event: RTCTrackEvent) => {
    this.eventEmitter.emit("track", event);
  };

  /**
   * Handles incoming ICE candidates.
   * @param event - The RTCPeerConnectionIceEvent containing the ICE candidate.
   */
  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    console.log("New ICE candidate:", event.candidate);
    this.socket.emit(SOCKET_EVENTS.CANDIDATE, { candidate: event.candidate });
  };

  public addIceCandidate(candidate: RTCIceCandidateInit) {
    if (this.peerConnection) {
      this.peerConnection.addIceCandidate(candidate).catch((e) => {
        console.error("Error adding received ICE candidate", e);
      });
    }
  }

  // private setupDataChannel() {
  //   if (!this.dataChannel) return;

  //   this.dataChannel.onopen = () => {
  //     console.log("Data channel opened");
  //   };

  //   this.dataChannel.onmessage = (event) => {
  //     console.log("Message received:", event.data);
  //     // Handle incoming messages
  //   };
  // }

  public getPeerConnection() {
    return this.peerConnection;
  }

  public getDataChannel() {
    return this.dataChannel;
  }

  /**
   * Destroys the peer connection and cleans up resources.
   */
  public destroy() {
    this.removeEventListeners();
    this.peerConnection?.close();
  }

  /**
   * Adds media tracks from the provided streams to the peer connection.
   */
  public addTracks(streams: MediaStream[]) {
    this.localStreams = streams;
    if (!this.peerConnection) {
      console.error("Peer connection is not initialized.");
      return;
    }
    streams.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, stream);
      });
    });
  }

  /**
   * Add an offer to the peer connection.
   * @param offer - The SDP offer to set.
   */
  public async setOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      console.error("Peer connection is not initialized.");
      return;
    }
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit(SOCKET_EVENTS.ANSWER, { answer });
    } catch (error) {
      console.error("Error setting offer and creating answer:", error);
    }
  }

  public async setAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      console.error("Peer connection is not initialized.");
      return;
    }
    try {
      console.log(
        "local state::",
        this.peerConnection.signalingState,
        this.peerConnection.connectionState
      );
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("Remote description set with answer:", answer);
    } catch (error) {
      console.error("Error setting answer as remote description:", error);
    }
  }

  /**
   * Creates an call offer.
   * @returns The SDP offer.
   */
  public async call() {
    if (
      !this.peerConnection ||
      this.peerConnection.signalingState === "closed"
    ) {
      this.initializePeerConnection();
      this.addTracks(this.localStreams);
    }

    if (!this.peerConnection) {
      console.error("Peer connection is not initialized.");
      return;
    }
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log("Local description set with offer:", offer);
      this.socket.emit(SOCKET_EVENTS.CALL, { offer });
    } catch (error) {
      console.error("Error creating and sending offer:", error);
    }
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
