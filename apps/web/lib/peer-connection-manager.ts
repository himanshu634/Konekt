import { SOCKET_EVENTS } from "@socket/events";
import { Socket } from "socket.io-client";

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket;
  private isInitiator: boolean = false;

  /**
   * Creates an instance of PeerConnectionManager.
   * @param param0 - Configuration object containing `isInitiator` and `socket`.
   */
  constructor({
    isInitiator,
    socket,
  }: {
    isInitiator: boolean;
    socket: Socket;
  }) {
    this.isInitiator = isInitiator;
    this.socket = socket;
    this.initializePeerConnection();
  }

  /**
   * Initializes the RTCPeerConnection and sets up the data channel if this peer is the initiator.
   */
  private initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection();
    this.peerConnection.onicecandidate = this.handleIceCandidate;
    this.peerConnection.ontrack = this.handleTrack;
  }

  /**
   * Removes event listeners from the peer connection.
   */
  private removeEventListeners() {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = null;
    this.peerConnection.ontrack = null;
  }

  /**
   * Handles incoming media tracks.
   * @param event - The RTCTrackEvent containing the track.
   */
  private handleTrack = (event: RTCTrackEvent) => {
    console.log("Track received:", event);
  };

  /**
   * Handles incoming ICE candidates.
   * @param event - The RTCPeerConnectionIceEvent containing the ICE candidate.
   */
  private handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate);
      this.socket.emit(SOCKET_EVENTS.CANDIDATE, { candidate: event.candidate });
    } else {
      console.log("All ICE candidates have been sent.");
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
    this.peerConnection?.close();
    this.removeEventListeners();
  }

  /**
   * Adds media tracks from the provided streams to the peer connection.
   */
  public addTracks(streams: MediaStream[]) {
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
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.emit(SOCKET_EVENTS.ANSWER, { answer });
  }
}
