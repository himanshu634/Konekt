import { SOCKET_EVENTS } from "@socket/events";
import { Socket } from "socket.io-client";

class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private socket: Socket | null = null;

  constructor(socket: Socket) {
    this.initializePeerConnection();
    this.socket = socket;
  }

  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate);
      this.socket?.emit(SOCKET_EVENTS.CANDIDATE, {
        candidate: event.candidate,
      });
      // Here you would typically send the candidate to the remote peer
    }
  };

  private handleDataChannel = (event: RTCDataChannelEvent) => {
    console.log("Data channel received:", event.channel);
    this.dataChannel = event.channel;
    this.setupDataChannel();
  };

  private addEventListeners() {
    if (!this.peerConnection) return;

    this.peerConnection.addEventListener(
      "icecandidate",
      this.handleIceCandidate
    );

    this.peerConnection.addEventListener("datachannel", this.handleDataChannel);
  }

  private initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection();
    this.addEventListeners();
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("Data channel opened");
    };

    this.dataChannel.onmessage = (event) => {
      console.log("Message received:", event.data);
      // Handle incoming messages
    };
  }

  public getPeerConnection() {
    return this.peerConnection;
  }

  public getDataChannel() {
    return this.dataChannel;
  }

  public async createCall() {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer();
      // Set the local description with the offer
      await this.peerConnection.setLocalDescription(offer);
      //  Emit the offer to the server
      this.socket?.emit(SOCKET_EVENTS.CALL, { offer });
    } catch (error) {
      console.error("Failed to create offer:", error);
      return null;
    }
  }

  public async answerCall(offer: RTCSessionDescriptionInit) {
    try {
      if (!this.peerConnection)
        throw new Error("Peer connection not initialized");

      // Set the remote description with the offer
      await this.peerConnection.setRemoteDescription(offer);

      // Create an answer
      const answer = await this.peerConnection.createAnswer();

      // Set the local description with the answer
      await this.peerConnection.setLocalDescription(answer);

      // Emit the answer to the server
      this.socket?.emit(SOCKET_EVENTS.ANSWER, { answer });
    } catch (error) {
      console.error("Failed to answer call:", error);
      return null;
    }
  }

  public cleanup() {
    if (!this.peerConnection) return;

    this.peerConnection.removeEventListener(
      "icecandidate",
      this.handleIceCandidate
    );
    this.peerConnection.removeEventListener(
      "datachannel",
      this.handleDataChannel
    );

    this.peerConnection.close();
    this.peerConnection = null;
  }
}
