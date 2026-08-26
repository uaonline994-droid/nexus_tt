/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { rtdb, ref, rtdbSet, rtdbGet, rtdbOnValue } from './firebase';

export interface PeerInfo {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export interface WebRTCCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  onPeerJoined: (peer: PeerInfo) => void;
  onPeerLeft: (peerId: string) => void;
  onPeerUpdated: (peer: PeerInfo) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class WebRTCManager {
  private roomId: string;
  private localPeer: PeerInfo;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private callbacks: WebRTCCallbacks;
  private isJoined: boolean = false;
  private unsubscribePeers: (() => void) | null = null;
  private unsubscribeSignals: (() => void) | null = null;

  constructor(roomId: string, localPeer: PeerInfo, callbacks: WebRTCCallbacks) {
    this.roomId = roomId;
    this.localPeer = localPeer;
    this.callbacks = callbacks;
  }

  public async join(localStream: MediaStream | null) {
    this.localStream = localStream;
    this.isJoined = true;

    // 1. Announce presence in RTDB
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      await rtdbSet(myPeerRef, this.localPeer);
    } catch (e) {
      console.warn('WebRTC presence error:', e);
    }

    // 2. Listen for other peers joining/leaving
    const peersRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers`);
    this.unsubscribePeers = rtdbOnValue(peersRef, async (snapshot) => {
      if (!this.isJoined) return;
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val) {
          const peersList: PeerInfo[] = Object.values(val);
          for (const peer of peersList) {
            if (peer.id === this.localPeer.id) continue;
            this.callbacks.onPeerJoined(peer);

            // If we are the newly joined peer or initiate connection with existing peers
            if (!this.peerConnections.has(peer.id)) {
              // Initiate WebRTC connection if our joinedAt is greater (polite peer pattern)
              if (this.localPeer.joinedAt > peer.joinedAt) {
                await this.initiateCall(peer.id);
              }
            }
          }
        }
      }
    });

    // 3. Listen for signals directed to me
    const mySignalsRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${this.localPeer.id}`);
    this.unsubscribeSignals = rtdbOnValue(mySignalsRef, async (snapshot) => {
      if (!this.isJoined) return;
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (val) {
          for (const [fromPeerId, signalData] of Object.entries<any>(val)) {
            if (!signalData) continue;
            await this.handleIncomingSignal(fromPeerId, signalData);
            // Clear processed signal
            try {
              const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${this.localPeer.id}/${fromPeerId}`);
              await rtdbSet(sigRef, null);
            } catch (e) {}
          }
        }
      }
    });
  }

  private async createPeerConnection(remotePeerId: string): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remotePeerId)) {
      return this.peerConnections.get(remotePeerId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(remotePeerId, pc);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.callbacks.onRemoteStream(remotePeerId, event.streams[0]);
      }
    };

    // ICE Candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          const candRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${remotePeerId}/${this.localPeer.id}`);
          await rtdbSet(candRef, {
            type: 'candidate',
            candidate: JSON.stringify(event.candidate.toJSON())
          });
        } catch (e) {}
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.callbacks.onRemoteStreamRemoved(remotePeerId);
        this.callbacks.onPeerLeft(remotePeerId);
        this.peerConnections.delete(remotePeerId);
      }
    };

    return pc;
  }

  private async initiateCall(remotePeerId: string) {
    try {
      const pc = await this.createPeerConnection(remotePeerId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${remotePeerId}/${this.localPeer.id}`);
      await rtdbSet(sigRef, {
        type: 'offer',
        sdp: offer.sdp
      });
    } catch (e) {
      console.warn('Initiate call error:', e);
    }
  }

  private async handleIncomingSignal(fromPeerId: string, signal: { type: string; sdp?: string; candidate?: string }) {
    try {
      const pc = await this.createPeerConnection(fromPeerId);

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${fromPeerId}/${this.localPeer.id}`);
        await rtdbSet(sigRef, {
          type: 'answer',
          sdp: answer.sdp
        });
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidateData = JSON.parse(signal.candidate);
        await pc.addIceCandidate(new RTCIceCandidate(candidateData));
      }
    } catch (e) {
      console.warn('Incoming signal handling error:', e);
    }
  }

  public updateLocalState(state: Partial<PeerInfo>) {
    this.localPeer = { ...this.localPeer, ...state };
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      rtdbSet(myPeerRef, this.localPeer).catch(() => {});
    } catch (e) {}
  }

  public replaceVideoTrack(newTrack: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        if (newTrack) {
          sender.replaceTrack(newTrack);
        }
      }
    });
  }

  public async leave() {
    this.isJoined = false;

    if (this.unsubscribePeers) this.unsubscribePeers();
    if (this.unsubscribeSignals) this.unsubscribeSignals();

    // Close all PeerConnections
    this.peerConnections.forEach((pc) => {
      try {
        pc.close();
      } catch (e) {}
    });
    this.peerConnections.clear();

    // Remove presence from RTDB
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      await rtdbSet(myPeerRef, null);
    } catch (e) {}
  }
}

/**
 * Microphone decibel meter
 */
export function createAudioLevelMeter(
  stream: MediaStream, 
  onLevelChange: (level: number, isSpeaking: boolean) => void
): () => void {
  let isRunning = true;
  let audioCtx: AudioContext | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};

    audioCtx = new AudioContextClass();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      const isSpeaking = avg > 14;
      onLevelChange(normalizedLevel, isSpeaking);

      requestAnimationFrame(update);
    };

    update();
  } catch (e) {
    console.warn('Audio level meter error:', e);
  }

  return () => {
    isRunning = false;
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  };
}
