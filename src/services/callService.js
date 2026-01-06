// Call Service - Continuous audio like a phone call
// Uses short recording segments sent continuously to backend

import { Audio } from 'expo-av';

const CHUNK_DURATION = 2000; // 2 second chunks
const SILENCE_THRESHOLD = -45; // dB threshold for speech detection

class CallService {
  constructor() {
    this.isCallActive = false;
    this.recording = null;
    this.chunkTimer = null;
    this.currentSound = null;

    // Callbacks
    this.onStatusChange = null;
    this.onTranscript = null;
    this.onResponse = null;
    this.onError = null;

    // Context
    this.userContext = null;
    this.screenContext = null;
    this.backendUrl = '';

    // Audio accumulator on backend handles VAD
    this.sessionId = null;
  }

  /**
   * Initialize the call service
   */
  async init(backendUrl) {
    this.backendUrl = backendUrl.replace(/\/$/, '');

    // Setup audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false,
    });

    // Generate session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('CallService initialized, session:', this.sessionId);
    return true;
  }

  /**
   * Set callbacks
   */
  setCallbacks({ onStatusChange, onTranscript, onResponse, onError }) {
    this.onStatusChange = onStatusChange;
    this.onTranscript = onTranscript;
    this.onResponse = onResponse;
    this.onError = onError;
  }

  /**
   * Set context for AI
   */
  setContext(userContext, screenContext) {
    this.userContext = userContext;
    this.screenContext = screenContext;
  }

  /**
   * Start the call - begins continuous recording
   */
  async startCall() {
    if (this.isCallActive) {
      console.log('Call already active');
      return;
    }

    try {
      this.isCallActive = true;
      this._updateStatus('connecting');

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      // Start continuous recording loop
      await this._startRecordingLoop();

      this._updateStatus('active');
      console.log('Call started');

    } catch (error) {
      console.error('Start call error:', error);
      this.isCallActive = false;
      this._updateStatus('error');
      if (this.onError) this.onError(error.message);
    }
  }

  /**
   * End the call
   */
  async endCall() {
    console.log('Ending call...');
    this.isCallActive = false;

    // Clear chunk timer
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Stop current recording
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (e) {}
      this.recording = null;
    }

    // Stop any playing audio
    await this.stopAudio();

    this._updateStatus('ended');
    console.log('Call ended');
  }

  /**
   * Start the continuous recording loop
   */
  async _startRecordingLoop() {
    if (!this.isCallActive) return;

    try {
      // Recording options
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.LOW_QUALITY,
        isMeteringEnabled: true,
      };

      // Create new recording
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        this._onRecordingStatus.bind(this),
        100 // 100ms metering updates
      );

      this.recording = recording;

      // Set timer to stop and send chunk
      this.chunkTimer = setTimeout(() => {
        this._processChunk();
      }, CHUNK_DURATION);

    } catch (error) {
      console.error('Recording loop error:', error);
      if (this.isCallActive) {
        // Retry after delay
        setTimeout(() => this._startRecordingLoop(), 500);
      }
    }
  }

  /**
   * Handle recording status updates (metering)
   */
  _onRecordingStatus(status) {
    if (status.metering !== undefined) {
      // Could use this for visual feedback
      // console.log('Metering:', status.metering);
    }
  }

  /**
   * Process current chunk and start new recording
   */
  async _processChunk() {
    if (!this.isCallActive || !this.recording) return;

    try {
      // Stop current recording
      const currentRecording = this.recording;
      this.recording = null;

      await currentRecording.stopAndUnloadAsync();
      const uri = currentRecording.getURI();

      // Start new recording immediately (don't wait for processing)
      if (this.isCallActive) {
        this._startRecordingLoop();
      }

      // Send chunk to backend
      if (uri) {
        await this._sendChunk(uri);
      }

    } catch (error) {
      console.error('Process chunk error:', error);
      // Continue recording loop
      if (this.isCallActive) {
        this._startRecordingLoop();
      }
    }
  }

  /**
   * Send audio chunk to backend
   */
  async _sendChunk(audioUri) {
    try {
      const formData = new FormData();

      // Get file extension
      const uriParts = audioUri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('audio', {
        uri: audioUri,
        type: fileType === 'm4a' ? 'audio/mp4' : `audio/${fileType}`,
        name: `chunk.${fileType}`,
      });

      formData.append('session_id', this.sessionId);
      formData.append('is_chunk', 'true');

      if (this.userContext) {
        formData.append('user_context', JSON.stringify(this.userContext));
      }
      if (this.screenContext) {
        formData.append('screen_context', JSON.stringify(this.screenContext));
      }

      const response = await fetch(`${this.backendUrl}/process_voice_chunk`, {
        method: 'POST',
        body: formData,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      const result = await response.json();

      // If backend detected end of speech and has response
      if (result.has_response) {
        console.log('Got response:', result.transcript);

        if (this.onTranscript) this.onTranscript(result.transcript);
        if (this.onResponse) this.onResponse(result);

        // Play audio response
        if (result.audio) {
          await this.playAudio(result.audio);
        }
      }

    } catch (error) {
      console.error('Send chunk error:', error);
    }
  }

  /**
   * Play audio response
   */
  async playAudio(base64Audio) {
    try {
      // Stop any current playback
      await this.stopAudio();

      // Pause recording while playing
      const wasRecording = this.recording !== null;
      if (wasRecording && this.recording) {
        await this.recording.pauseAsync();
      }

      // Set playback mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUri },
        { shouldPlay: true, volume: 1.0 }
      );

      this.currentSound = sound;

      // Wait for playback to finish
      await new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            resolve();
          }
        });
        // Timeout fallback
        setTimeout(resolve, 30000);
      });

      // Cleanup
      await sound.unloadAsync();
      this.currentSound = null;

      // Resume recording mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      // Resume recording if was active
      if (wasRecording && this.recording) {
        try {
          await this.recording.startAsync();
        } catch (e) {
          // Recording may have been replaced, ignore
        }
      }

    } catch (error) {
      console.error('Play audio error:', error);
    }
  }

  /**
   * Stop current audio playback
   */
  async stopAudio() {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (e) {}
      this.currentSound = null;
    }
  }

  /**
   * Update status
   */
  _updateStatus(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Check if call is active
   */
  isActive() {
    return this.isCallActive;
  }
}

// Singleton instance
const callService = new CallService();
export default callService;
