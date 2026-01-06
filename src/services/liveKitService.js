// LiveKit Voice Service for VNeID
// Real-time voice streaming with automatic turn detection

import {
  Room,
  RoomEvent,
  Track,
  AudioPresets,
  ConnectionState,
  DataPacket_Kind,
} from '@livekit/react-native';
import { registerGlobals } from '@livekit/react-native-webrtc';

// Register WebRTC globals for React Native
registerGlobals();

// Service state
let room = null;
let isConnected = false;
let localAudioTrack = null;

// Callbacks
let callbacks = {
  onConnected: null,
  onDisconnected: null,
  onAgentMessage: null,
  onAgentSpeaking: null,
  onAgentStoppedSpeaking: null,
  onTranscript: null,
  onAction: null,
  onError: null,
};

/**
 * Initialize and connect to LiveKit room
 * @param {string} url - LiveKit server URL
 * @param {string} token - Access token
 */
export const connect = async (url, token) => {
  try {
    console.log('LiveKit: Connecting to', url);

    // Create room instance
    room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
      audioOutput: {
        deviceId: 'default',
      },
    });

    // Set up event listeners
    setupEventListeners();

    // Connect to room
    await room.connect(url, token, {
      autoSubscribe: true,
    });

    isConnected = true;
    console.log('LiveKit: Connected successfully');

    if (callbacks.onConnected) {
      callbacks.onConnected();
    }

    return true;
  } catch (error) {
    console.error('LiveKit: Connection error', error);
    if (callbacks.onError) {
      callbacks.onError(error.message);
    }
    return false;
  }
};

/**
 * Set up room event listeners
 */
const setupEventListeners = () => {
  if (!room) return;

  // Connection state changes
  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    console.log('LiveKit: Connection state:', state);

    if (state === ConnectionState.Disconnected) {
      isConnected = false;
      if (callbacks.onDisconnected) {
        callbacks.onDisconnected();
      }
    }
  });

  // Track subscribed (agent audio)
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('LiveKit: Track subscribed:', track.kind, 'from', participant.identity);

    if (track.kind === Track.Kind.Audio && participant.identity.includes('agent')) {
      // Agent audio track - this is the AI speaking
      track.attach();
      console.log('LiveKit: Agent audio attached');
    }
  });

  // Track unsubscribed
  room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    console.log('LiveKit: Track unsubscribed');
    if (track.kind === Track.Kind.Audio) {
      track.detach();
    }
  });

  // Data received from agent
  room.on(RoomEvent.DataReceived, (payload, participant, kind) => {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      console.log('LiveKit: Data received:', message);

      // Handle different message types
      if (message.action) {
        if (callbacks.onAction) {
          callbacks.onAction(message);
        }
      }

      if (message.transcript) {
        if (callbacks.onTranscript) {
          callbacks.onTranscript(message.transcript);
        }
      }

      if (message.text) {
        if (callbacks.onAgentMessage) {
          callbacks.onAgentMessage(message.text);
        }
      }
    } catch (e) {
      console.log('LiveKit: Failed to parse data:', e);
    }
  });

  // Participant speaking state
  room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    const agentSpeaking = speakers.some(s => s.identity.includes('agent'));

    if (agentSpeaking) {
      if (callbacks.onAgentSpeaking) {
        callbacks.onAgentSpeaking();
      }
    } else {
      if (callbacks.onAgentStoppedSpeaking) {
        callbacks.onAgentStoppedSpeaking();
      }
    }
  });

  // Transcription received
  room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
    const text = segments.map(s => s.text).join(' ');
    console.log('LiveKit: Transcription:', text);

    if (callbacks.onTranscript) {
      callbacks.onTranscript(text);
    }
  });

  // Error handling
  room.on(RoomEvent.Disconnected, (reason) => {
    console.log('LiveKit: Disconnected:', reason);
    isConnected = false;
  });
};

/**
 * Start publishing local audio (microphone)
 */
export const startMicrophone = async () => {
  if (!room || !isConnected) {
    console.error('LiveKit: Not connected');
    return false;
  }

  try {
    // Enable microphone
    await room.localParticipant.setMicrophoneEnabled(true);
    console.log('LiveKit: Microphone enabled');
    return true;
  } catch (error) {
    console.error('LiveKit: Microphone error', error);
    if (callbacks.onError) {
      callbacks.onError('Không thể bật microphone');
    }
    return false;
  }
};

/**
 * Stop publishing local audio
 */
export const stopMicrophone = async () => {
  if (!room) return;

  try {
    await room.localParticipant.setMicrophoneEnabled(false);
    console.log('LiveKit: Microphone disabled');
  } catch (error) {
    console.error('LiveKit: Stop microphone error', error);
  }
};

/**
 * Send context update to agent
 * @param {object} userContext - User information
 * @param {object} screenContext - Current screen context
 */
export const sendContextUpdate = async (userContext, screenContext) => {
  if (!room || !isConnected) return;

  try {
    const data = JSON.stringify({
      type: 'update_context',
      user_context: userContext,
      screen_context: screenContext,
    });

    await room.localParticipant.publishData(
      new TextEncoder().encode(data),
      { reliable: true }
    );

    console.log('LiveKit: Context sent');
  } catch (error) {
    console.error('LiveKit: Send context error', error);
  }
};

/**
 * Set callback functions
 * @param {object} cbs - Callback functions
 */
export const setCallbacks = (cbs) => {
  callbacks = { ...callbacks, ...cbs };
};

/**
 * Disconnect from room
 */
export const disconnect = async () => {
  if (room) {
    await room.disconnect();
    room = null;
  }
  isConnected = false;
  localAudioTrack = null;
  console.log('LiveKit: Disconnected');
};

/**
 * Check if connected
 */
export const isRoomConnected = () => isConnected;

/**
 * Get room instance
 */
export const getRoom = () => room;

export default {
  connect,
  disconnect,
  startMicrophone,
  stopMicrophone,
  sendContextUpdate,
  setCallbacks,
  isRoomConnected,
  getRoom,
};
