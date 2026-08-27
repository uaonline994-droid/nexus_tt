/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { rtdb, ref, rtdbSet, rtdbOnValue, onDisconnect } from './firebase';

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
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

export class WebRTCManager {
  private roomId: string;
  private localPeer: PeerInfo;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private callbacks: WebRTCCallbacks;
  private isJoined: boolean = false;
  private sseEventSource: EventSource | null = null;
  private signalPollInterval: any = null;
  private presencePollInterval: any = null;
  private unsubscribePeersRtdb: (() => void) | null = null;
  private unsubscribeSignalsRtdb: (() => void) | null = null;

  constructor(roomId: string, localPeer: PeerInfo, callbacks: WebRTCCallbacks) {
    this.roomId = roomId;
    this.localPeer = localPeer;
    this.callbacks = callbacks;
  }

  public async join(localStream: MediaStream | null) {
    this.localStream = localStream;
    this.isJoined = true;

    // 1. Connect to Real-Time SSE Server Signaling
    try {
      this.sseEventSource = new EventSource(`/api/room/${this.roomId}/events?peerId=${encodeURIComponent(this.localPeer.id)}`);
      
      this.sseEventSource.onmessage = async (e) => {
        if (!this.isJoined) return;
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'peer_joined' && event.peer) {
            const peer = event.peer as PeerInfo;
            if (peer.id !== this.localPeer.id) {
              this.callbacks.onPeerJoined(peer);
              // Deterministic Caller: Peer with smaller ID initiates offer
              if (this.localPeer.id.localeCompare(peer.id) < 0) {
                await this.initiateCall(peer.id);
              }
            }
          } else if (event.type === 'peer_left' && event.peerId) {
            this.handlePeerLeft(event.peerId);
          } else if (event.type === 'peer_updated' && event.peer) {
            this.callbacks.onPeerUpdated(event.peer);
          } else if (event.type === 'signal' && event.fromPeerId && event.signal) {
            await this.handleIncomingSignal(event.fromPeerId, event.signal);
          }
        } catch (err) {
          console.warn('WebRTC SSE message warning:', err);
        }
      };
    } catch (e) {
      console.warn('WebRTC SSE init warning:', e);
    }

    // 2. Poll fallback for zero signal drops across proxies (every 600ms)
    this.signalPollInterval = setInterval(async () => {
      if (!this.isJoined) return;
      try {
        const res = await fetch(`/api/room/${this.roomId}/signals?peerId=${encodeURIComponent(this.localPeer.id)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.signals)) {
          for (const item of data.signals) {
            if (item && item.fromPeerId && item.signal) {
              await this.handleIncomingSignal(item.fromPeerId, item.signal);
            }
          }
        }
      } catch (e) {}
    }, 600);

    // 3. Fast presence polling (every 1200ms) to ensure instant peer discovery without lag
    this.presencePollInterval = setInterval(async () => {
      if (!this.isJoined) return;
      try {
        const res = await fetch(`/api/room/${this.roomId}/peers`);
        const data = await res.json();
        if (data.success && Array.isArray(data.peers)) {
          for (const peer of data.peers) {
            if (peer && peer.id !== this.localPeer.id) {
              this.callbacks.onPeerJoined(peer);
              if (!this.peerConnections.has(peer.id)) {
                if (this.localPeer.id.localeCompare(peer.id) < 0) {
                  await this.initiateCall(peer.id);
                }
              }
            }
          }
        }
      } catch (e) {}
    }, 1200);

    // 4. Announce Join via Server REST API
    try {
      const res = await fetch(`/api/room/${this.roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peer: this.localPeer })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.existingPeers)) {
        for (const existingPeer of data.existingPeers) {
          if (existingPeer.id !== this.localPeer.id) {
            this.callbacks.onPeerJoined(existingPeer);
            if (this.localPeer.id.localeCompare(existingPeer.id) < 0) {
              await this.initiateCall(existingPeer.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Server room join warning:', e);
    }

    // 5. Firebase RTDB presence & signaling queue fallback
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      await rtdbSet(myPeerRef, this.localPeer);
      try {
        onDisconnect(myPeerRef).remove();
      } catch (e) {}

      const peersRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers`);
      this.unsubscribePeersRtdb = rtdbOnValue(peersRef, async (snapshot) => {
        if (!this.isJoined) return;
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val) {
            const peersList: PeerInfo[] = Object.values(val);
            for (const peer of peersList) {
              if (peer.id === this.localPeer.id) continue;
              this.callbacks.onPeerJoined(peer);
              if (!this.peerConnections.has(peer.id)) {
                if (this.localPeer.id.localeCompare(peer.id) < 0) {
                  await this.initiateCall(peer.id);
                }
              }
            }
          }
        }
      });

      const mySignalsRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${this.localPeer.id}`);
      this.unsubscribeSignalsRtdb = rtdbOnValue(mySignalsRef, async (snapshot) => {
        if (!this.isJoined) return;
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val && typeof val === 'object') {
            const entries = Object.entries<any>(val);
            entries.sort((a, b) => (a[1]?.timestamp || 0) - (b[1]?.timestamp || 0));
            for (const [sigKey, sigItem] of entries) {
              if (!sigItem) continue;
              const fromPeerId = sigItem.fromPeerId;
              const signalData = sigItem.signal || sigItem;
              if (fromPeerId && signalData) {
                await this.handleIncomingSignal(fromPeerId, signalData);
              }
              try {
                const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${this.localPeer.id}/${sigKey}`);
                await rtdbSet(sigRef, null);
              } catch (e) {}
            }
          }
        }
      });
    } catch (e) {
      console.warn('WebRTC RTDB fallback warning:', e);
    }
  }

  private handlePeerLeft(peerId: string) {
    this.callbacks.onRemoteStreamRemoved(peerId);
    this.callbacks.onPeerLeft(peerId);
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try { pc.close(); } catch (e) {}
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
  }

  private async createPeerConnection(remotePeerId: string): Promise<RTCPeerConnection> {
    if (this.peerConnections.has(remotePeerId)) {
      return this.peerConnections.get(remotePeerId)!;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(remotePeerId, pc);
    this.pendingCandidates.set(remotePeerId, []);

    // Create container stream for remote audio & video tracks
    let remoteStream = this.remoteStreams.get(remotePeerId);
    if (!remoteStream) {
      remoteStream = new MediaStream();
      this.remoteStreams.set(remotePeerId, remoteStream);
    }

    // Add local tracks or transceivers to RTCPeerConnection
    if (this.localStream && this.localStream.getTracks().length > 0) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (e) {}
    }

    // Handle incoming remote media tracks (Audio + Video)
    pc.ontrack = (event) => {
      let targetStream = this.remoteStreams.get(remotePeerId);
      if (!targetStream) {
        targetStream = new MediaStream();
        this.remoteStreams.set(remotePeerId, targetStream);
      }

      if (event.track) {
        targetStream.getTracks().forEach((t) => {
          if (t.kind === event.track.kind) {
            targetStream!.removeTrack(t);
          }
        });
        targetStream.addTrack(event.track);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => {
          if (!targetStream!.getTracks().some((existing) => existing.id === t.id)) {
            targetStream!.addTrack(t);
          }
        });
      }

      this.callbacks.onRemoteStream(remotePeerId, targetStream);
    };

    // Send ICE Candidates immediately
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const candidatePayload = {
          type: 'candidate',
          candidate: JSON.stringify(event.candidate.toJSON())
        };

        // Server signaling
        try {
          fetch(`/api/room/${this.roomId}/signal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromPeerId: this.localPeer.id,
              toPeerId: remotePeerId,
              signal: candidatePayload
            })
          }).catch(() => {});
        } catch (e) {}

        // RTDB signaling queue
        try {
          const sigKey = 'sig_cand_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const candRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${remotePeerId}/${sigKey}`);
          rtdbSet(candRef, {
            fromPeerId: this.localPeer.id,
            signal: candidatePayload,
            timestamp: Date.now()
          }).catch(() => {});
        } catch (e) {}
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.handlePeerLeft(remotePeerId);
      }
    };

    return pc;
  }

  public async initiateCall(remotePeerId: string) {
    try {
      const pc = await this.createPeerConnection(remotePeerId);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      const signalPayload = {
        type: 'offer',
        sdp: offer.sdp
      };

      // Server signal
      fetch(`/api/room/${this.roomId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPeerId: this.localPeer.id,
          toPeerId: remotePeerId,
          signal: signalPayload
        })
      }).catch(() => {});

      // RTDB signal queue
      try {
        const sigKey = 'sig_offer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${remotePeerId}/${sigKey}`);
        rtdbSet(sigRef, {
          fromPeerId: this.localPeer.id,
          signal: signalPayload,
          timestamp: Date.now()
        }).catch(() => {});
      } catch (e) {}
    } catch (e) {
      console.warn('Initiate call error:', e);
    }
  }

  private async drainPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const pending = this.pendingCandidates.get(peerId) || [];
    for (const cand of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('Drain candidate notice:', e);
      }
    }
    this.pendingCandidates.set(peerId, []);
  }

  private async handleIncomingSignal(fromPeerId: string, signal: { type: string; sdp?: string; candidate?: string }) {
    try {
      const pc = await this.createPeerConnection(fromPeerId);

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        await this.drainPendingCandidates(fromPeerId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const answerSignal = {
          type: 'answer',
          sdp: answer.sdp
        };

        // Server signal
        fetch(`/api/room/${this.roomId}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromPeerId: this.localPeer.id,
            toPeerId: fromPeerId,
            signal: answerSignal
          })
        }).catch(() => {});

        // RTDB signal queue
        try {
          const sigKey = 'sig_answer_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const sigRef = ref(rtdb, `nexus_rooms/${this.roomId}/signals/${fromPeerId}/${sigKey}`);
          rtdbSet(sigRef, {
            fromPeerId: this.localPeer.id,
            signal: answerSignal,
            timestamp: Date.now()
          }).catch(() => {});
        } catch (e) {}
      } else if (signal.type === 'answer' && signal.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          await this.drainPendingCandidates(fromPeerId, pc);
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        try {
          const candidateData = JSON.parse(signal.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          } else {
            const pending = this.pendingCandidates.get(fromPeerId) || [];
            pending.push(candidateData);
            this.pendingCandidates.set(fromPeerId, pending);
          }
        } catch (candErr) {
          console.warn('Add ICE candidate warning:', candErr);
        }
      }
    } catch (e) {
      console.warn('Incoming signal handling error:', e);
    }
  }

  public updateLocalState(state: Partial<PeerInfo>) {
    this.localPeer = { ...this.localPeer, ...state };

    // Server update
    fetch(`/api/room/${this.roomId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: this.localPeer.id, state })
    }).catch(() => {});

    // RTDB update
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      rtdbSet(myPeerRef, this.localPeer).catch(() => {});
    } catch (e) {}
  }

  public replaceVideoTrack(newTrack: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video') || senders.find((s) => !s.track);
      if (videoSender) {
        videoSender.replaceTrack(newTrack).catch((err) => {
          console.warn('replaceTrack error:', err);
        });
      } else if (newTrack) {
        try {
          pc.addTrack(newTrack, this.localStream || new MediaStream());
        } catch (e) {}
      }
    });
  }

  public replaceAudioTrack(newTrack: MediaStreamTrack | null) {
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
      if (audioSender && newTrack) {
        audioSender.replaceTrack(newTrack).catch((err) => {
          console.warn('replaceAudioTrack error:', err);
        });
      }
    });
  }

  public async leave() {
    this.isJoined = false;

    if (this.signalPollInterval) {
      clearInterval(this.signalPollInterval);
      this.signalPollInterval = null;
    }
    if (this.presencePollInterval) {
      clearInterval(this.presencePollInterval);
      this.presencePollInterval = null;
    }
    if (this.sseEventSource) {
      this.sseEventSource.close();
      this.sseEventSource = null;
    }
    if (this.unsubscribePeersRtdb) this.unsubscribePeersRtdb();
    if (this.unsubscribeSignalsRtdb) this.unsubscribeSignalsRtdb();

    // Notify Server
    fetch(`/api/room/${this.roomId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: this.localPeer.id })
    }).catch(() => {});

    // Close all PeerConnections
    this.peerConnections.forEach((pc) => {
      try { pc.close(); } catch (e) {}
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();

    // Remove presence from RTDB
    try {
      const myPeerRef = ref(rtdb, `nexus_rooms/${this.roomId}/peers/${this.localPeer.id}`);
      await rtdbSet(myPeerRef, null);
    } catch (e) {}
  }
}

/**
 * Microphone & Voice Decibel Analyzer (Web Audio API)
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
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (!isRunning) return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      
      const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
      const isSpeaking = avg > 12;
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
