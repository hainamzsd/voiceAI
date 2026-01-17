// LiveKit Voice Service for VNeID
// Note: registerGlobals() is called in App.jsx before this import

import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
} from '@livekit/react-native';

// Service state
let room = null;
let isConnected = false;

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
 * Connect to LiveKit room
 */
export const connect = async (url, token) => {
  try {
    console.log('LiveKit: Connecting to', url);

    // Create room
    room = new Room();

    // Set up event listeners before connecting
    setupEventListeners();

    // Connect
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

  // Connection state
  room.on(RoomEvent.ConnectionStateChanged, (state) => {
    console.log('LiveKit: State:', state);
    if (state === ConnectionState.Disconnected) {
      isConnected = false;
      if (callbacks.onDisconnected) {
        callbacks.onDisconnected();
      }
    }
  });

  // Track subscribed
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    console.log('LiveKit: Track subscribed:', track.kind);
    if (track.kind === Track.Kind.Audio) {
      track.attach();
    }
  });

  // Track unsubscribed
  room.on(RoomEvent.TrackUnsubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      track.detach();
    }
  });

  // Data received
  room.on(RoomEvent.DataReceived, (payload, participant) => {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      console.log('LiveKit: Data:', message);

      if (message.action || message.type === 'action') {
        const actionData = {
          action: message.action || message.type,
          screen: message.screen || message.navigate_to,
          data: message.data || {},
        };
        if (callbacks.onAction) {
          callbacks.onAction(actionData);
        }
      }

      if (message.transcript && callbacks.onTranscript) {
        callbacks.onTranscript(message.transcript);
      }

      if ((message.text || message.message) && callbacks.onAgentMessage) {
        callbacks.onAgentMessage(message.text || message.message);
      }
    } catch (e) {
      console.log('LiveKit: Parse error:', e);
    }
  });

  // Speaking state
  room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    const agentSpeaking = speakers.some(s => s.identity?.includes('agent'));
    if (agentSpeaking && callbacks.onAgentSpeaking) {
      callbacks.onAgentSpeaking();
    } else if (!agentSpeaking && callbacks.onAgentStoppedSpeaking) {
      callbacks.onAgentStoppedSpeaking();
    }
  });

  // Transcription
  room.on(RoomEvent.TranscriptionReceived, (segments) => {
    const text = segments.map(s => s.text).join(' ');
    if (callbacks.onTranscript) {
      callbacks.onTranscript(text);
    }
  });
};

/**
 * Start microphone
 */
export const startMicrophone = async () => {
  if (!room || !isConnected) return false;

  try {
    await room.localParticipant.setMicrophoneEnabled(true);
    console.log('LiveKit: Mic enabled');
    return true;
  } catch (error) {
    console.error('LiveKit: Mic error', error);
    return false;
  }
};

/**
 * Stop microphone
 */
export const stopMicrophone = async () => {
  if (!room) return;
  try {
    await room.localParticipant.setMicrophoneEnabled(false);
  } catch (error) {
    console.error('LiveKit: Stop mic error', error);
  }
};

/**
 * Send context to agent
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
    console.error('LiveKit: Send error', error);
  }
};

/**
 * Set callbacks
 */
export const setCallbacks = (cbs) => {
  callbacks = { ...callbacks, ...cbs };
};

/**
 * Disconnect
 */
export const disconnect = async () => {
  if (room) {
    await room.disconnect();
    room = null;
  }
  isConnected = false;
};

export const isRoomConnected = () => isConnected;
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
