/**
 * VNeID Voice AI Demo
 * Natural Conversation Flow
 */

import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Vibration } from 'react-native';
import { Audio } from 'expo-av';

// Constants
import { COLORS } from './src/constants/colors';
import { MOCK_USER, INITIAL_FORM_DATA } from './src/constants/mockData';

// Screens
import { HomeScreen, LLTPScreen } from './src/screens';

// Components
import { BottomNav, VoiceModal, VoiceFab } from './src/components';

// Services
import {
  setupAudio,
  speakText,
  playAudioBase64,
  stopSpeaking,
  processTextCommand,
  processVoiceWithBackend,
  cleanResponse,
  setRecordingMode,
} from './src/services/voiceService';
import { testConnection, resetConversation, BACKEND_URL } from './api_integration';
import { MUC_DICH_OPTIONS } from './src/constants/mockData';

// Silence detection config - auto end-of-sentence detection
const SILENCE_THRESHOLD = -40; // dB level considered silence (lower = more sensitive)
const SILENCE_DURATION = 800; // ms of silence before auto-stop (faster response)
const MIN_RECORDING_TIME = 500; // minimum recording time before checking silence
const MAX_RECORDING_TIME = 15000; // max 15 seconds recording

export default function App() {
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState('home');
  const [lltpStep, setLltpStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [recording, setRecording] = useState(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Refs for silence detection
  const silenceTimerRef = useRef(null);
  const recordingStartTime = useRef(null);
  const meteringInterval = useRef(null);
  const isAutoListening = useRef(false);

  // Build screen context dynamically for AI
  const getScreenContext = () => {
    if (currentScreen === 'home') {
      return {
        screen_name: 'home',
        screen_description: 'Trang chủ VNeID, hiển thị thông tin CCCD và các dịch vụ',
        current_step: 0,
        total_steps: 1,
        fields_to_fill: [],
        filled_data: {},
        available_actions: ['navigate_lltp', 'navigate_cccd', 'view_info'],
      };
    }

    if (currentScreen === 'lltp') {
      // Step 0: Intro
      if (lltpStep === 0) {
        return {
          screen_name: 'lltp_intro',
          screen_description: 'Giới thiệu dịch vụ cấp phiếu lý lịch tư pháp',
          current_step: 0,
          total_steps: 4,
          fields_to_fill: [],
          filled_data: {},
          available_actions: ['start_lltp', 'navigate_home'],
        };
      }

      // Step 1: Personal Info (auto-filled)
      if (lltpStep === 1) {
        return {
          screen_name: 'lltp_personal_info',
          screen_description: 'Thông tin cá nhân - đã tự động điền từ VNeID',
          current_step: 1,
          total_steps: 4,
          fields_to_fill: [],
          filled_data: {
            hoTen: MOCK_USER.hoTen,
            cccd: MOCK_USER.cccd,
            ngaySinh: MOCK_USER.ngaySinh,
          },
          available_actions: ['next_step', 'prev_step'],
        };
      }

      // Step 2: Additional Info
      if (lltpStep === 2) {
        return {
          screen_name: 'lltp_additional_info',
          screen_description: 'Thông tin bổ sung về gia đình',
          current_step: 2,
          total_steps: 4,
          fields_to_fill: [
            { key: 'tenGoiKhac', label: 'Tên gọi khác', required: false },
            { key: 'hoTenCha', label: 'Họ tên cha', required: false },
            { key: 'namSinhCha', label: 'Năm sinh cha', required: false },
            { key: 'hoTenMe', label: 'Họ tên mẹ', required: false },
            { key: 'namSinhMe', label: 'Năm sinh mẹ', required: false },
          ],
          filled_data: {
            email: MOCK_USER.email,
            sdt: MOCK_USER.sdt,
          },
          available_actions: ['next_step', 'prev_step'],
        };
      }

      // Step 3: Purpose & Quantity
      if (lltpStep === 3) {
        return {
          screen_name: 'lltp_purpose',
          screen_description: 'Chọn mục đích và số lượng phiếu LLTP',
          current_step: 3,
          total_steps: 4,
          fields_to_fill: [
            { key: 'loai_phieu', label: 'Loại phiếu LLTP', required: true, options: ['Phiếu số 1 (cá nhân)', 'Phiếu số 2 (cơ quan)'] },
            { key: 'muc_dich', label: 'Mục đích yêu cầu', required: true, options: MUC_DICH_OPTIONS },
            { key: 'so_ban', label: 'Số lượng bản giấy', required: true },
          ],
          filled_data: {
            loai_phieu: formData.loaiPhieu === 'so1' ? 'Phiếu số 1' : formData.loaiPhieu === 'so2' ? 'Phiếu số 2' : '',
            muc_dich: formData.mucDich || '',
            so_ban: formData.soBanGiay || '',
          },
          available_actions: ['next_step', 'prev_step', 'fill_field'],
        };
      }

      // Step 4: Confirmation
      if (lltpStep === 4) {
        return {
          screen_name: 'lltp_confirm',
          screen_description: 'Xác nhận và gửi yêu cầu cấp phiếu LLTP',
          current_step: 4,
          total_steps: 4,
          fields_to_fill: [],
          filled_data: {
            loai_phieu: formData.loaiPhieu === 'so1' ? 'Phiếu số 1' : 'Phiếu số 2',
            muc_dich: formData.mucDich,
            so_ban: formData.soBanGiay,
          },
          available_actions: ['submit', 'prev_step'],
        };
      }
    }

    // Default context
    return {
      screen_name: currentScreen,
      screen_description: 'Unknown screen',
      current_step: 0,
      total_steps: 1,
      fields_to_fill: [],
      filled_data: {},
      available_actions: [],
    };
  };

  // Initialize - Auto start voice mode
  useEffect(() => {
    setupAudio();

    // Reset conversation on app start to prevent old history issues
    resetConversation().then(() => {
      testConnection().then(connected => {
        if (connected) {
          // Auto open voice mode and start listening
          setTimeout(() => {
            setShowVoiceModal(true);
            setAiMessage('Chào anh! Em có thể giúp gì ạ?');
            // Start listening after a short delay
            setTimeout(() => {
              startRecording();
            }, 800);
          }, 1000);
        }
      });
    });

    return () => {
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (meteringInterval.current) clearInterval(meteringInterval.current);
  };

  // Start recording with auto end-of-sentence detection
  const startRecording = async () => {
    // Prevent multiple recordings
    if (recording || isProcessing || isListening) {
      console.log('Already recording or processing, skipping');
      return;
    }

    try {
      // Stop any ongoing speech
      await stopSpeaking();

      if (permissionResponse?.status !== 'granted') {
        await requestPermission();
      }

      // Switch to recording mode
      await setRecordingMode();

      // Use LOW_QUALITY preset - most compatible with Whisper
      // LOW_QUALITY uses standard codecs that work everywhere
      const recordingOptions = {
        ...Audio.RecordingOptionsPresets.LOW_QUALITY,
        isMeteringEnabled: true,
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          // Metering callback for auto end-of-sentence detection
          if (status.isRecording && status.metering !== undefined) {
            checkSilence(status.metering);
          }
        },
        100 // Update every 100ms
      );

      setRecording(newRecording);
      setIsListening(true);
      setAiMessage('');
      recordingStartTime.current = Date.now();
      hasSpokenRef.current = false; // Reset speech detection
      Vibration.vibrate(30);

      console.log('Recording started - waiting for speech, will auto-stop on silence...');

    } catch (error) {
      console.log('Recording error:', error);
      setAiMessage('Không thể ghi âm');
    }
  };

  // Ref to track if user has spoken (to avoid stopping before any speech)
  const hasSpokenRef = useRef(false);
  const lastMeteringRef = useRef(-160);

  // Check for silence and auto-stop (end of sentence detection)
  const checkSilence = (metering) => {
    const recordingTime = Date.now() - recordingStartTime.current;
    lastMeteringRef.current = metering;

    // Safety: force stop if recording too long
    if (recordingTime > MAX_RECORDING_TIME) {
      console.log('Max recording time reached, forcing stop');
      stopRecording();
      return;
    }

    // Don't check for silence in first MIN_RECORDING_TIME
    if (recordingTime < MIN_RECORDING_TIME) return;

    // Track if user has started speaking (metering above threshold)
    if (metering > SILENCE_THRESHOLD) {
      hasSpokenRef.current = true;
      // Sound detected, reset silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else if (hasSpokenRef.current) {
      // Silence detected AFTER user has spoken = end of sentence
      if (!silenceTimerRef.current) {
        console.log(`Silence detected (${metering.toFixed(1)}dB), waiting ${SILENCE_DURATION}ms...`);
        silenceTimerRef.current = setTimeout(() => {
          console.log('End of sentence detected - processing...');
          silenceTimerRef.current = null;
          stopRecording();
        }, SILENCE_DURATION);
      }
    }
  };

  // Stop recording and process
  const stopRecording = async () => {
    if (!recording) return;

    clearTimers();
    hasSpokenRef.current = false; // Reset for next recording
    setIsListening(false);
    setIsProcessing(true);
    setAiMessage('Đang xử lý...');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Pass user context and screen context to backend
      const result = await processVoiceWithBackend(uri, MOCK_USER, getScreenContext());

      // Handle navigation based on action (with step if provided)
      handleNavigationAction(result.action, result.step);

      // Handle next_step from AI response
      if (result.next_step === true) {
        handleNavigationAction('next_step');
      }

      // Handle form data
      if (result.data) {
        if (result.data.muc_dich) {
          setFormData(prev => ({ ...prev, mucDich: result.data.muc_dich }));
        }
        if (result.data.so_ban) {
          setFormData(prev => ({ ...prev, soBanGiay: result.data.so_ban }));
        }
        if (result.data.loai_phieu) {
          setFormData(prev => ({ ...prev, loaiPhieu: result.data.loai_phieu }));
        }
      }

      // Clean and display response
      const cleanedResponse = cleanResponse(result.response || 'Bạn nói lại được không?');
      setAiMessage(cleanedResponse);
      setIsProcessing(false);

      // Debug: Log what we got from backend
      console.log('=== BACKEND RESULT ===');
      console.log('Response:', cleanedResponse);
      console.log('Audio received:', !!result.audio, result.audio ? `(${result.audio.length} chars)` : '(none)');

      // Play audio from backend (already generated)
      if (result.audio) {
        console.log('Playing audio from backend...');
        playAudioBase64(result.audio, {
          onDone: () => autoListenAfterSpeech()
        });
      } else {
        console.log('No audio in result, skipping playback');
        // Fallback: no audio, just auto-listen
        setTimeout(() => autoListenAfterSpeech(), 500);
      }

    } catch (error) {
      console.log('Error:', error);
      const errorMsg = 'Xin lỗi, bạn thử lại nhé?';
      setAiMessage(errorMsg);
      setIsProcessing(false);
      // No audio for error, just auto-listen
      setTimeout(() => autoListenAfterSpeech(), 500);
    }
  };

  // Handle navigation and flow actions from AI
  const handleNavigationAction = (action, step = null) => {
    if (!action || action === 'none' || action === 'fill_field') return;

    switch (action) {
      case 'navigate_lltp':
        setCurrentScreen('lltp');
        setLltpStep(step !== null ? step : 0);
        break;
      case 'navigate_cccd':
        setCurrentScreen('home');
        // Could add CCCD modal/view here
        break;
      case 'navigate_home':
        setCurrentScreen('home');
        setLltpStep(0);
        break;
      case 'set_step':
        // Update step within LLTP flow
        if (step !== null) {
          setLltpStep(step);
        }
        break;
      case 'next_step':
        // Advance to next step in current flow
        if (currentScreen === 'lltp' && lltpStep < 4) {
          setLltpStep(prev => prev + 1);
        }
        break;
      case 'prev_step':
        // Go back to previous step
        if (currentScreen === 'lltp' && lltpStep > 0) {
          setLltpStep(prev => prev - 1);
        }
        break;
      case 'submit':
      case 'submit_lltp':
      case 'complete_lltp':
        // Flow completed, could show success or reset
        setLltpStep(0);
        break;
      default:
        break;
    }
  };

  // Auto-listen after AI finishes speaking - continuous conversation
  const autoListenAfterSpeech = () => {
    // Short delay then start listening again
    setTimeout(() => {
      if (!isProcessing && !recording && !isListening) {
        console.log('Auto-listen: starting new recording for next input');
        isAutoListening.current = true;
        startRecording();
      } else {
        console.log('Auto-listen: skipped (processing:', isProcessing, 'recording:', !!recording, 'listening:', isListening, ')');
      }
    }, 300); // Quick turnaround for natural conversation
  };

  // Handle text command (from suggestion chips)
  const handleVoiceCommand = async (command) => {
    setAiMessage('Đang xử lý...');
    setIsProcessing(true);

    try {
      // Pass user context and screen context to backend
      const result = await processTextCommand(command, MOCK_USER, getScreenContext());

      if (result.success) {
        // Handle navigation (with step if provided)
        handleNavigationAction(result.action, result.step);

        // Handle next_step from AI response
        if (result.next_step === true) {
          handleNavigationAction('next_step');
        }

        // Handle form data
        if (result.data?.muc_dich) {
          setFormData(prev => ({ ...prev, mucDich: result.data.muc_dich }));
        }
        if (result.data?.so_ban) {
          setFormData(prev => ({ ...prev, soBanGiay: result.data.so_ban }));
        }
        if (result.data?.loai_phieu) {
          setFormData(prev => ({ ...prev, loaiPhieu: result.data.loai_phieu }));
        }

        const cleanedResponse = cleanResponse(result.response);
        setAiMessage(cleanedResponse);
        setIsProcessing(false);

        // Play audio from backend
        if (result.audio) {
          playAudioBase64(result.audio, {
            onDone: () => autoListenAfterSpeech()
          });
        } else {
          setTimeout(() => autoListenAfterSpeech(), 500);
        }
      } else {
        setAiMessage('Lỗi xử lý');
        setIsProcessing(false);
      }
    } catch (error) {
      setAiMessage('Lỗi kết nối');
      setIsProcessing(false);
    }
  };

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
    if (screen === 'lltp') {
      setLltpStep(0);
    }
  };

  const openVoiceModal = async () => {
    setShowVoiceModal(true);
    setAiMessage('');
    Vibration.vibrate(30);

    // Auto-start listening when modal opens
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  const closeVoiceModal = async () => {
    clearTimers();
    setShowVoiceModal(false);
    setIsListening(false);
    isAutoListening.current = false;

    await stopSpeaking();

    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
      setRecording(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Screens */}
      {currentScreen === 'home' && (
        <HomeScreen user={MOCK_USER} onNavigate={handleNavigate} />
      )}

      {currentScreen === 'lltp' && (
        <LLTPScreen
          step={lltpStep}
          setStep={setLltpStep}
          formData={formData}
          setFormData={setFormData}
          user={MOCK_USER}
          onBack={() => setCurrentScreen('home')}
          aiMessage={aiMessage}
          speakText={speakText}
        />
      )}

      {/* Voice FAB */}
      <VoiceFab onPress={openVoiceModal} isActive={showVoiceModal} />

      {/* Voice Modal */}
      <VoiceModal
        visible={showVoiceModal}
        onClose={closeVoiceModal}
        isListening={isListening}
        isProcessing={isProcessing}
        aiMessage={aiMessage}
        onStartListening={startRecording}
        onStopListening={stopRecording}
        onCommand={handleVoiceCommand}
        currentScreen={currentScreen}
      />

      {/* Bottom Navigation */}
      <BottomNav current={currentScreen} onNavigate={handleNavigate} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
