// ============================================================
// API INTEGRATION - KET NOI APP VOI KAGGLE BACKEND
// ============================================================
// Copy code nay vao App.jsx de ket noi voi backend that
// ============================================================

// BUOC 1: Thay URL nay bang URL tu Kaggle ngrok
const BACKEND_URL = 'https://4a02eced4cf9.ngrok-free.app';

// BUOC 2: Process voice with user and screen context
const processVoiceWithBackend = async (audioUri, userContext = null, screenContext = null) => {
  try {
    const formData = new FormData();

    // Format đúng cho React Native
    const uriParts = audioUri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    // Map file types to MIME types
    const mimeTypes = {
      'wav': 'audio/wav',
      'm4a': 'audio/mp4',
      'mp4': 'audio/mp4',
      'caf': 'audio/x-caf',
      'webm': 'audio/webm',
    };

    formData.append('audio', {
      uri: audioUri,
      type: mimeTypes[fileType] || 'audio/wav',
      name: `recording.${fileType}`,
    });

    // Add user context
    if (userContext) {
      formData.append('user_context', JSON.stringify(userContext));
    }

    // Add screen context (tells AI what screen/fields we're on)
    if (screenContext) {
      formData.append('screen_context', JSON.stringify(screenContext));
    }

    const response = await fetch(`${BACKEND_URL}/process_voice`, {
      method: 'POST',
      body: formData,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    const result = await response.json();

    if (result.success) {
      return {
        transcript: result.transcript,
        data: result.data,
        response: result.response,
        audio: result.audio,  // Base64 audio from ElevenLabs TTS
        action: result.action,
        next_step: result.next_step,
        field_asking: result.field_asking,
      };
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// BUOC 3: Thay the function stopRecording trong App.jsx
/*
const stopRecording = async () => {
  if (!recording) return;

  setIsListening(false);
  setIsProcessing(true);
  setAiMessage('Dang xu ly...');

  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    // GOI API BACKEND THAY VI MOCK
    const result = await processVoiceWithBackend(uri);

    // Xu ly ket qua
    if (result.action === 'navigate_lltp') {
      setCurrentScreen('lltp');
    } else if (result.action === 'navigate_home') {
      setCurrentScreen('home');
    }

    if (result.data.muc_dich) {
      setFormData(prev => ({ ...prev, muc_dich: result.data.muc_dich }));
    }
    if (result.data.so_ban) {
      setFormData(prev => ({ ...prev, so_ban: result.data.so_ban }));
    }

    setAiMessage(result.response);
    speakText(result.response);

  } catch (error) {
    console.log('Error:', error);
    setAiMessage('Co loi xay ra. Vui long thu lai.');
  }

  setIsProcessing(false);
};
*/

// BUOC 4: Test ket noi (optional)
const testConnection = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    const data = await response.json();
    console.log('Backend status:', data);
    return data.status === 'healthy';
  } catch (error) {
    console.error('Connection failed:', error);
    return false;
  }
};

// BUOC 5: Process text with user and screen context
const processTextWithBackend = async (text, userContext = null, screenContext = null) => {
  try {
    const response = await fetch(`${BACKEND_URL}/process_text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        text,
        user_context: userContext,
        screen_context: screenContext,
      }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'Lỗi kết nối' };
  }
};

// BUOC 6: Reset conversation history
const resetConversation = async () => {
  try {
    await fetch(`${BACKEND_URL}/reset`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
  } catch (error) {
    console.error('Reset error:', error);
  }
};

export { processVoiceWithBackend, processTextWithBackend, testConnection, resetConversation, BACKEND_URL };
