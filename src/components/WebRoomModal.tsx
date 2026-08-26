/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, 
  Users, Volume2, ShieldCheck, Sparkles, UserPlus, Settings, 
  Check, Radio, AlertCircle, RefreshCw, Lock
} from 'lucide-react';
import { WebRoomParticipant, WebRoomSettings } from '../types';
import { ADMIN_EMAIL } from '../firebase';
import { WebRTCManager, PeerInfo, createAudioLevelMeter } from '../webrtcService';
import { soundService } from '../soundService';

interface WebRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  isPrivate?: boolean;
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    isAdmin: boolean;
  };
  settings: WebRoomSettings;
  onUpdateSettings: (settings: WebRoomSettings) => Promise<void>;
  hasAccess: boolean;
}

export const WebRoomModal: React.FC<WebRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  isPrivate = false,
  currentUser,
  settings,
  onUpdateSettings,
  hasAccess
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [newAllowedEmail, setNewAllowedEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);

  // Map of remote peers: id -> { peer: PeerInfo, stream?: MediaStream }
  const [remotePeers, setRemotePeers] = useState<Map<string, { peer: PeerInfo; stream?: MediaStream }>>(new Map());

  // Handle Room Lifecycle and Media Initialization
  useEffect(() => {
    if (!isOpen || !hasAccess) return;

    soundService.playRoomJoinSound();
    let stopAudioMeter: (() => void) | null = null;

    async function startRoom() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setIsCameraOn(true);
      } catch (err: any) {
        console.warn('Video+Audio getUserMedia failed, attempting audio-only:', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
          setIsCameraOn(false);
        } catch (audioErr: any) {
          console.warn('Microphone permission blocked or unavailable:', audioErr);
          setMediaError('Доступ до камери або мікрофона не надано. Ви можете слухати та бачити інших учасників.');
          setIsCameraOn(false);
        }
      }

      localStreamRef.current = stream;
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Audio Level Analyzer
      if (stream) {
        stopAudioMeter = createAudioLevelMeter(stream, (level, speaking) => {
          setMicLevel(level);
          setIsSpeaking(speaking && !isMuted);
          if (webrtcManagerRef.current) {
            webrtcManagerRef.current.updateLocalState({ isSpeaking: speaking && !isMuted });
          }
        });
      }

      // Initialize WebRTC Signaling Manager
      const localPeerInfo: PeerInfo = {
        id: currentUser.id || 'peer_' + Date.now(),
        name: currentUser.name || 'Користувач',
        email: currentUser.email,
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        isMuted: false,
        isCameraOn: Boolean(stream && stream.getVideoTracks().length > 0),
        isScreenSharing: false,
        isSpeaking: false,
        joinedAt: Date.now()
      };

      const manager = new WebRTCManager(roomId, localPeerInfo, {
        onPeerJoined: (peer) => {
          setRemotePeers((prev) => {
            const next = new Map<string, { peer: PeerInfo; stream?: MediaStream }>(prev);
            const existing = next.get(peer.id);
            next.set(peer.id, { peer, stream: existing?.stream });
            return next;
          });
        },
        onPeerLeft: (peerId) => {
          setRemotePeers((prev) => {
            const next = new Map<string, { peer: PeerInfo; stream?: MediaStream }>(prev);
            next.delete(peerId);
            return next;
          });
        },
        onPeerUpdated: (peer) => {
          setRemotePeers((prev) => {
            const next = new Map<string, { peer: PeerInfo; stream?: MediaStream }>(prev);
            const existing = next.get(peer.id);
            if (existing) {
              next.set(peer.id, { ...existing, peer });
            }
            return next;
          });
        },
        onRemoteStream: (peerId, remoteStream) => {
          setRemotePeers((prev) => {
            const next = new Map<string, { peer: PeerInfo; stream?: MediaStream }>(prev);
            const existing = next.get(peerId);
            if (existing) {
              next.set(peerId, { ...existing, stream: remoteStream });
            }
            return next;
          });
        },
        onRemoteStreamRemoved: (peerId) => {
          setRemotePeers((prev) => {
            const next = new Map<string, { peer: PeerInfo; stream?: MediaStream }>(prev);
            const existing = next.get(peerId);
            if (existing) {
              next.set(peerId, { ...existing, stream: undefined });
            }
            return next;
          });
        }
      });

      webrtcManagerRef.current = manager;
      await manager.join(stream);
    }

    startRoom();

    return () => {
      soundService.playRoomLeaveSound();
      if (stopAudioMeter) stopAudioMeter();
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.leave();
        webrtcManagerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setRemotePeers(new Map());
    };
  }, [isOpen, hasAccess, roomId]);

  const toggleMic = () => {
    soundService.playClickSound();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.updateLocalState({ isMuted: nextMuted });
    }
  };

  const toggleCamera = async () => {
    soundService.playClickSound();
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const nextCam = videoTrack.enabled;
        setIsCameraOn(nextCam);
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.updateLocalState({ isCameraOn: nextCam });
        }
      } else {
        // Request video track if wasn't started originally
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsCameraOn(true);
          if (webrtcManagerRef.current) {
            webrtcManagerRef.current.replaceVideoTrack(newVideoTrack);
            webrtcManagerRef.current.updateLocalState({ isCameraOn: true });
          }
        } catch (e) {
          setMediaError('Не вдалося отримати доступ до відеокамери');
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    soundService.playClickSound();
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.replaceVideoTrack(screenTrack);
          webrtcManagerRef.current.updateLocalState({ isScreenSharing: true });
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            const originalTrack = localStreamRef.current.getVideoTracks()[0] || null;
            if (webrtcManagerRef.current) {
              webrtcManagerRef.current.replaceVideoTrack(originalTrack);
              webrtcManagerRef.current.updateLocalState({ isScreenSharing: false });
            }
          }
        };
      } catch (e) {
        console.warn('Screen share cancelled');
      }
    } else {
      setIsScreenSharing(false);
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        const originalTrack = localStreamRef.current.getVideoTracks()[0] || null;
        if (webrtcManagerRef.current) {
          webrtcManagerRef.current.replaceVideoTrack(originalTrack);
          webrtcManagerRef.current.updateLocalState({ isScreenSharing: false });
        }
      }
    }
  };

  const handleCopyInvite = () => {
    soundService.playClickSound();
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleBetaTest = async () => {
    soundService.playClickSound();
    const updated = {
      ...settings,
      betaTestForAll: !settings.betaTestForAll
    };
    await onUpdateSettings(updated);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllowedEmail.trim()) return;
    soundService.playClickSound();
    const cleanEmail = newAllowedEmail.trim().toLowerCase();
    if (!settings.allowedEmails.includes(cleanEmail)) {
      const updated = {
        ...settings,
        allowedEmails: [...settings.allowedEmails, cleanEmail]
      };
      await onUpdateSettings(updated);
    }
    setNewAllowedEmail('');
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    soundService.playClickSound();
    const updated = {
      ...settings,
      allowedEmails: settings.allowedEmails.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase())
    };
    await onUpdateSettings(updated);
  };

  if (!isOpen) return null;

  // Access Denied Screen
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 p-6 text-center text-white space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-black tracking-tight">Веб-кімнати у закритому бета-тесті</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ця функція (Discord-like голосові та відео дзвінки) зараз доступна для тестування адміністратором 
            <span className="text-amber-400 font-bold"> NEXUS</span> та обраними учасниками.
          </p>
          <div className="p-3 rounded-2xl bg-slate-850 border border-white/10 text-xs text-slate-300">
            💬 Попросіть доступ у чаті з тегом <span className="text-amber-400 font-bold">@nexus</span> або дочекайтеся відкриття для всіх!
          </div>
          <button
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-200 transition-all cursor-pointer"
          >
            Зрозуміло, повернутися в чат
          </button>
        </div>
      </div>
    );
  }

  const remotePeersList = Array.from(remotePeers.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
      <div className="w-full max-w-5xl h-[92vh] sm:h-[88vh] rounded-[32px] bg-slate-950 border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Top Header */}
        <div className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isPrivate 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' 
                : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400'
            }`}>
              {isPrivate ? <Lock className="w-4 h-4" /> : <Radio className="w-4 h-4 animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold tracking-tight text-slate-100">
                  {roomName || 'Веб-кімната NEXUS'}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isPrivate 
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' 
                    : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                  {isPrivate ? 'PRIVATE P2P' : 'LIVE WebRTC'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {remotePeersList.length + 1} у кімнаті • Peer-to-Peer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.isAdmin && (
              <button
                onClick={() => {
                  soundService.playClickSound();
                  setShowAdminSettings(prev => !prev);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-bold text-indigo-400 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Доступ</span>
              </button>
            )}

            {!isPrivate && (
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Скопійовано!' : 'Запросити'}</span>
              </button>
            )}

            <button
              onClick={() => {
                soundService.playClickSound();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-950/80 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Warning Notice */}
        {mediaError && (
          <div className="bg-amber-950/60 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-amber-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{mediaError}</span>
            </div>
            <button
              onClick={() => setMediaError(null)}
              className="text-amber-400 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Video Grid */}
        <div className="flex-1 p-3 sm:p-5 overflow-y-auto flex flex-col justify-center">
          {showAdminSettings && currentUser.isAdmin ? (
            /* Admin Access Control Panel */
            <div className="w-full max-w-md mx-auto p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Керування доступом до веб-кімнат
                </h4>
                <button
                  onClick={() => setShowAdminSettings(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Master switch for Beta Test */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    🚀 Доступ для всіх (Бета-тест)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {settings.betaTestForAll 
                      ? 'УВІМКНЕНО: Кожен може заходити в кімнати' 
                      : 'ВИМКНЕНО: Лише за списком email'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBetaTest}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.betaTestForAll ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.betaTestForAll ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Allowed emails list */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Дозволені користувачі за Email:
                </span>
                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="user@gmail.com"
                    value={newAllowedEmail}
                    onChange={(e) => setNewAllowedEmail(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase text-white cursor-pointer"
                  >
                    Додати
                  </button>
                </form>

                <div className="max-h-32 overflow-y-auto space-y-1 pt-1">
                  {settings.allowedEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 text-xs text-slate-300">
                      <span className="truncate">{email}</span>
                      {email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="text-rose-400 hover:text-rose-300 text-[10px] uppercase font-bold cursor-pointer"
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Discord-like Video/Audio Grid */
            <div className={`grid gap-3 sm:gap-4 max-w-4xl mx-auto w-full ${
              remotePeersList.length === 0 ? 'grid-cols-1 max-w-md' : 'grid-cols-1 md:grid-cols-2'
            }`}>
              
              {/* Local User Tile */}
              <div className={`relative aspect-video rounded-3xl bg-slate-900 border overflow-hidden flex items-center justify-center shadow-xl transition-all ${
                isSpeaking ? 'border-emerald-500 ring-2 ring-emerald-500/50' : 'border-white/10'
              }`}>
                {isCameraOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror-video"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-full border-2 border-indigo-500 object-cover"
                    />
                    <span className="text-xs font-bold text-slate-300">{currentUser.name} (Ви)</span>
                  </div>
                )}

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md text-[11px] font-bold border border-white/10">
                  <span className="truncate text-slate-200">{currentUser.name} (Ви)</span>
                  <div className="flex items-center gap-1.5">
                    {isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {isSpeaking && (
                      <div className="flex items-center gap-0.5 ml-1">
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-soundwave-1" />
                        <span className="w-1 h-4 bg-emerald-400 rounded-full animate-soundwave-2" />
                        <span className="w-1 h-2 bg-emerald-400 rounded-full animate-soundwave-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Remote Peers Tiles */}
              {remotePeersList.map(({ peer, stream }) => (
                <RemotePeerTile key={peer.id} peer={peer} stream={stream} />
              ))}

              {/* Waiting for partner if room is empty */}
              {remotePeersList.length === 0 && (
                <div className="text-center py-3 text-xs text-slate-400 flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping mb-1" />
                  <span>Очікування підключення інших учасників у кімнату...</span>
                  <span className="text-[10px] text-slate-500">Коли хтось приєднається, відео та звук увімкнуться автоматично.</span>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Live Mic Decibel Bar */}
        <div className="h-1.5 bg-slate-900 w-full overflow-hidden shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-amber-400 transition-all duration-75"
            style={{ width: `${isMuted ? 0 : micLevel}%` }}
          />
        </div>

        {/* Bottom Control Bar */}
        <div className="h-20 px-4 sm:px-8 bg-slate-900/95 border-t border-white/10 flex items-center justify-center gap-3 sm:gap-4 shrink-0">
          
          {/* Mute Button */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Увімкнути мікрофон' : 'Вимкнути мікрофон'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              !isCameraOn 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                : 'bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700'
            }`}
            title={isCameraOn ? 'Вимкнути камеру' : 'Увімкнути камеру'}
          >
            {!isCameraOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isScreenSharing 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700'
            }`}
            title="Демонстрація екрана"
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Leave Room Button */}
          <button
            onClick={() => {
              soundService.playClickSound();
              onClose();
            }}
            className="h-12 px-6 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer ml-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Вийти</span>
          </button>
        </div>

      </div>
    </div>
  );
};

/**
 * Subcomponent for Rendering a Remote WebRTC Peer with Audio & Video
 */
const RemotePeerTile: React.FC<{ peer: PeerInfo; stream?: MediaStream }> = ({ peer, stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    if (stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(() => {
          setAudioBlocked(true);
        });
      }
    }
  }, [stream]);

  const handleUnblockAudio = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setAudioBlocked(false);
      }).catch(() => {});
    }
  };

  const hasVideo = Boolean(
    stream && 
    stream.getVideoTracks().length > 0 && 
    (peer.isCameraOn || peer.isScreenSharing)
  );

  return (
    <div className={`relative aspect-video rounded-3xl bg-slate-900 border overflow-hidden flex items-center justify-center shadow-xl transition-all ${
      peer.isSpeaking ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20' : 'border-white/10'
    }`}>
      {/* Remote Audio Track (Plays voice sound directly from remote peer!) */}
      <audio ref={audioRef} autoPlay playsInline />

      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <img
              src={peer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={peer.name}
              className="w-16 h-16 rounded-full border-2 border-indigo-500 object-cover"
            />
            {peer.isSpeaking && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-300">{peer.name}</span>
        </div>
      )}

      {/* Audio Playback Unblock Overlay if browser paused sound */}
      {audioBlocked && (
        <button
          onClick={handleUnblockAudio}
          className="absolute top-3 left-3 px-3 py-1 bg-amber-500/90 text-slate-950 font-bold text-[11px] rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-sm animate-pulse z-10"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Увімкнути звук</span>
        </button>
      )}

      {/* Bottom Overlay Label */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md text-[11px] font-bold border border-white/10">
        <span className="truncate text-slate-200">{peer.name}</span>
        <div className="flex items-center gap-1.5">
          {peer.isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {peer.isSpeaking && (
            <div className="flex items-center gap-0.5 ml-1">
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-soundwave-1" />
              <span className="w-1 h-4 bg-emerald-400 rounded-full animate-soundwave-2" />
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-soundwave-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
