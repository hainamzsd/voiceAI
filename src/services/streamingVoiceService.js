// Streaming Voice Service - Real-time audio like Discord
// Uses WebSocket for continuous conversation

import { Audio } from 'expo-av';
import { io } from 'socket.io-client';

let socket = null;
let isConnected = false;
let currentSound = null;

// Audio recording state
let recording = null;
let isStreaming = false;
let streamInterval = null;

// Callbacks
let onTranscript = null;
let onResponse = null;
let onAudioResponse = null;
let onStatusChange = null;
let onError = null;

// User/Screen context
let currentUserContext = null;
let currentScreenContext = null;

/**
 * Initialize WebSocket connection
 */
export const initStreaming = async (backendUrl) => {
  return new Promise((resolve, reject) => {
    try {
      // Clean URL and create socket connection
      const wsUrl = backendUrl.replace(/\/$/, '');
      console.log('Connecting to:', wsUrl);

      socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        isConnected = true;
        if (onStatusChange) onStatusChange('connected');
        resolve(true);
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        isConnected = false;
        if (onStatusChange) onStatusChange('disconnected');
      });

      socket.on('connected', (data) => {
        console.log('Server ready:', data);
      });

      socket.on('listening_started', () => {
        console.log('Server listening');
        if (onStatusChange) onStatusChange('listening');
      });

      socket.on('processing', () => {
        console.log('Server processing');
        if (onStatusChange) onStatusChange('processing');
      });

      socket.on('response', async (data) => {
        console.log('Received response:', data.transcript);

        if (data.success) {
          if (onTranscript) onTranscript(data.transcript);
          if (onResponse) onResponse(data);

          // Play audio response
          if (data.audio) {
            await playAudioBase64(data.audio);
          }

          if (onAudioResponse) onAudioResponse(data);
        } else {
          if (onError) onError(data.error);
        }

        // Auto-restart listening after response
        if (onStatusChange) onStatusChange('ready');
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      // Timeout
      setTimeout(() => {
        if (!isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);

    } catch (error) {
      console.error('Init error:', error);
      reject(error);
    }
  });
};

/**
 * Set callbacks
 */
export const setCallbacks = ({ onTranscriptCb, onResponseCb, onAudioCb, onStatusCb, onErrorCb }) => {
  onTranscript = onTranscriptCb;
  onResponse = onResponseCb;
  onAudioResponse = onAudioCb;
  onStatusChange = onStatusCb;
  onError = onErrorCb;
};

/**
 * Set context for AI
 */
export const setContext = (userContext, screenContext) => {
  currentUserContext = userContext;
  currentScreenContext = screenContext;
};

/**
 * Start streaming audio to server
 */
export const startStreaming = async () => {
  if (!isConnected || !socket) {
    console.error('Not connected to server');
    return false;
  }

  if (isStreaming) {
    console.log('Already streaming');
    return true;
  }

  try {
    // Stop any playing audio
    await stopAudio();

    // Setup audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });

    // Create recording with raw PCM output
    const recordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.pcm',
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      },
      ios: {
        extension: '.pcm',
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/wav',
        bitsPerSecond: 256000,
      },
    };

    // Tell server we're starting
    socket.emit('start_listening', {
      user_context: currentUserContext,
      screen_context: currentScreenContext,
    });

    // Start recording
    const { recording: newRecording } = await Audio.Recording.createAsync(
      recordingOptions,
      (status) => {
        // Metering callback - we could send this to server for better VAD
        if (status.metering !== undefined) {
          // console.log('Metering:', status.metering);
        }
      },
      50 // 50ms updates
    );

    recording = newRecording;
    isStreaming = true;

    if (onStatusChange) onStatusChange('listening');

    // Start sending audio chunks every 100ms
    streamInterval = setInterval(async () => {
      if (recording && isStreaming) {
        try {
          // Get current audio data
          const status = await recording.getStatusAsync();
          if (status.isRecording) {
            // For now, we'll use a workaround - accumulate and send periodically
            // True streaming would require native module modifications
          }
        } catch (e) {
          // Ignore errors during streaming
        }
      }
    }, 100);

    console.log('Streaming started');
    return true;

  } catch (error) {
    console.error('Start streaming error:', error);
    isStreaming = false;
    if (onError) onError('Không thể bắt đầu ghi âm');
    return false;
  }
};

/**
 * Stop streaming and process remaining audio
 */
export const stopStreaming = async () => {
  if (!isStreaming || !recording) {
    return;
  }

  try {
    isStreaming = false;

    if (streamInterval) {
      clearInterval(streamInterval);
      streamInterval = null;
    }

    // Stop recording and get the file
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    if (uri && socket && isConnected) {
      // Read file and send as final chunk
      const response = await fetch(uri);
      const blob = await response.blob();

      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        socket.emit('audio_chunk', {
          chunk: base64,
          user_context: currentUserContext,
          screen_context: currentScreenContext,
          is_final: true,
        });
      };
      reader.readAsDataURL(blob);

      // Also trigger stop_listening for immediate processing
      socket.emit('stop_listening', {
        user_context: currentUserContext,
        screen_context: currentScreenContext,
      });
    }

    if (onStatusChange) onStatusChange('processing');
    console.log('Streaming stopped');

  } catch (error) {
    console.error('Stop streaming error:', error);
  }
};

/**
 * Play audio from base64
 */
export const playAudioBase64 = async (base64Audio) => {
  try {
    if (!base64Audio) return;

    await stopAudio();

    // Set playback mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });

    const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
    const { sound } = await Audio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true, volume: 1.0 }
    );

    currentSound = sound;

    return new Promise((resolve) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          currentSound = null;
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      });

      // Timeout fallback
      setTimeout(() => {
        if (currentSound === sound) {
          currentSound = null;
          sound.unloadAsync().catch(() => {});
          resolve();
        }
      }, 30000);
    });

  } catch (error) {
    console.error('Play audio error:', error);
  }
};

/**
 * Stop current audio playback
 */
export const stopAudio = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {}
    currentSound = null;
  }
};

/**
 * Disconnect from server
 */
export const disconnect = () => {
  if (streamInterval) {
    clearInterval(streamInterval);
    streamInterval = null;
  }

  if (recording) {
    recording.stopAndUnloadAsync().catch(() => {});
    recording = null;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  isConnected = false;
  isStreaming = false;
};

/**
 * Check connection status
 */
export const isSocketConnected = () => isConnected;

export default {
  initStreaming,
  setCallbacks,
  setContext,
  startStreaming,
  stopStreaming,
  playAudioBase64,
  stopAudio,
  disconnect,
  isSocketConnected,
};
