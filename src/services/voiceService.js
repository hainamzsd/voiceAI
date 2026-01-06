// Voice Service - TTS và Recording
import { Audio } from 'expo-av';
import { processVoiceWithBackend, processTextWithBackend, BACKEND_URL } from '../../api_integration';

// Current playing sound reference
let currentSound = null;
let isPlaying = false; // Prevent duplicate plays

// Setup Audio - Configure for loud playback
export const setupAudio = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      // Use speaker for loud output
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.log('Audio setup error:', error);
  }
};

// Set audio mode for playback (louder)
export const setPlaybackMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.log('Playback mode error:', error);
  }
};

// Set audio mode for recording
export const setRecordingMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.log('Recording mode error:', error);
  }
};

// Clean text for speech - remove ALL JSON and technical content
const cleanTextForSpeech = (text) => {
  if (!text) return '';

  let cleaned = text;

  // Remove @@AI@@...@@END@@ block (dynamic AI format)
  cleaned = cleaned.replace(/@@AI@@[\s\S]*?@@END@@/g, '');

  // Remove @@DATA@@...@@END@@ block (legacy format)
  cleaned = cleaned.replace(/@@DATA@@[\s\S]*?@@END@@/g, '');

  // Remove JSON objects {...}
  cleaned = cleaned.replace(/\{[^{}]*\}/g, '');
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, '');

  // Remove JSON-like artifacts (brackets, quotes, colons)
  cleaned = cleaned.replace(/[\{\}\[\]"]/g, '');

  // Remove markdown
  cleaned = cleaned.replace(/[*_`#]/g, '');

  // Remove technical keywords
  cleaned = cleaned.replace(/\b(extracted|missing|action|next_question|navigate_\w+|none|muc_dich|so_ban)\b/gi, '');

  // Clean up punctuation artifacts
  cleaned = cleaned.replace(/:\s*,/g, '');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\s*:\s*/g, ' ');

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing punctuation artifacts
  cleaned = cleaned.replace(/^[\s,.:]+/, '');
  cleaned = cleaned.replace(/[\s,.:]+$/, '');

  return cleaned;
};

// Play audio from base64 (received from backend)
export const playAudioBase64 = async (base64Audio, options = {}) => {
  try {
    if (!base64Audio) {
      console.log('TTS: No audio data received from backend');
      if (options.onDone) options.onDone();
      return;
    }

    console.log('TTS: ========== AUDIO PLAYBACK START ==========');
    console.log('TTS: Audio data length:', base64Audio.length, 'chars');
    console.log('TTS: First 50 chars:', base64Audio.substring(0, 50));

    // Stop any current playback first
    await stopSpeaking();

    // Switch to playback mode for louder audio
    await setPlaybackMode();

    console.log('TTS: Creating sound...');

    // Play directly from base64 data URI
    const dataUri = `data:audio/mpeg;base64,${base64Audio}`;

    const { sound } = await Audio.Sound.createAsync(
      { uri: dataUri },
      { shouldPlay: true, volume: 1.0 }
    );

    currentSound = sound;
    console.log('TTS: Sound created successfully, starting playback');
    console.log('TTS: currentSound set:', !!currentSound);

    if (options.onStart) options.onStart();

    // Handle completion with timeout fallback
    let finished = false;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish && !finished) {
        finished = true;
        console.log('TTS: Playback finished');
        currentSound = null;
        sound.unloadAsync().catch(() => {});
        if (options.onDone) options.onDone();
      }
    });

    // Fallback: if no finish event after 30 seconds, cleanup
    setTimeout(() => {
      if (!finished) {
        console.log('TTS: Timeout, forcing cleanup');
        finished = true;
        currentSound = null;
        sound.unloadAsync().catch(() => {});
        if (options.onDone) options.onDone();
      }
    }, 30000);

  } catch (e) {
    console.log('TTS play error:', e);
    if (options.onDone) options.onDone();
  }
};

// Legacy speakText - now just a wrapper (for fallback)
export const speakText = async (text, options = {}) => {
  // This is now only used for initial greeting or fallback
  console.log('TTS (fallback):', text);
  if (options.onDone) {
    setTimeout(() => options.onDone(), 100);
  }
};

// Stop speaking
export const stopSpeaking = async () => {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
    isPlaying = false;
  } catch (e) {
    console.log('Stop speech error:', e);
    currentSound = null;
    isPlaying = false;
  }
};

// Check if speaking
export const isSpeaking = async () => {
  try {
    if (currentSound) {
      const status = await currentSound.getStatusAsync();
      return status.isPlaying;
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Process text command with user and screen context
export const processTextCommand = async (command, userContext = null, screenContext = null) => {
  try {
    const result = await processTextWithBackend(command, userContext, screenContext);

    // Clean response for display and speech
    if (result.response) {
      result.response = cleanTextForSpeech(result.response);
    }

    return result;
  } catch (error) {
    console.error('Process text error:', error);
    throw error;
  }
};

// Clean response helper (exported for use in App.jsx)
export const cleanResponse = cleanTextForSpeech;

export { processVoiceWithBackend };
