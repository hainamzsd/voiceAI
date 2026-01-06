/**
 * VNeID Voice AI Demo - LiveKit Version
 * Real-time voice streaming with automatic turn detection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator, Vibration } from 'react-native';

// Constants
import { COLORS } from './src/constants/colors';
import { MOCK_USER, INITIAL_FORM_DATA, MUC_DICH_OPTIONS } from './src/constants/mockData';

// Screens
import { HomeScreen, LLTPScreen } from './src/screens';

// Components
import { BottomNav, VoiceModal, VoiceFab } from './src/components';

// LiveKit Service
import liveKitService from './src/services/liveKitService';

// LiveKit Configuration
const LIVEKIT_URL = 'wss://your-project.livekit.cloud'; // Replace with your LiveKit URL
const LIVEKIT_TOKEN = ''; // Will be fetched from token server

export default function App() {
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState('home');
  const [lltpStep, setLltpStep] = useState(0);

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // Voice/LiveKit states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Build screen context for AI
  const getScreenContext = useCallback(() => {
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

      if (lltpStep === 2) {
        return {
          screen_name: 'lltp_additional_info',
          screen_description: 'Thông tin bổ sung về gia đình',
          current_step: 2,
          total_steps: 4,
          fields_to_fill: [
            { key: 'tenGoiKhac', label: 'Tên gọi khác', required: false },
            { key: 'hoTenCha', label: 'Họ tên cha', required: false },
            { key: 'hoTenMe', label: 'Họ tên mẹ', required: false },
          ],
          filled_data: {
            email: MOCK_USER.email,
            sdt: MOCK_USER.sdt,
          },
          available_actions: ['next_step', 'prev_step'],
        };
      }

      if (lltpStep === 3) {
        return {
          screen_name: 'lltp_purpose',
          screen_description: 'Chọn mục đích và số lượng phiếu LLTP',
          current_step: 3,
          total_steps: 4,
          fields_to_fill: [
            { key: 'loai_phieu', label: 'Loại phiếu LLTP', required: true, options: ['Phiếu số 1', 'Phiếu số 2'] },
            { key: 'muc_dich', label: 'Mục đích yêu cầu', required: true, options: MUC_DICH_OPTIONS.slice(0, 5) },
            { key: 'so_ban', label: 'Số lượng bản', required: true },
          ],
          filled_data: {
            loai_phieu: formData.loaiPhieu === 'so1' ? 'Phiếu số 1' : formData.loaiPhieu === 'so2' ? 'Phiếu số 2' : '',
            muc_dich: formData.mucDich || '',
            so_ban: formData.soBanGiay || '',
          },
          available_actions: ['next_step', 'prev_step', 'fill_field'],
        };
      }

      if (lltpStep === 4) {
        return {
          screen_name: 'lltp_confirm',
          screen_description: 'Xác nhận và gửi yêu cầu',
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

    return {
      screen_name: currentScreen,
      screen_description: 'Unknown screen',
      current_step: 0,
      total_steps: 1,
      fields_to_fill: [],
      filled_data: {},
      available_actions: [],
    };
  }, [currentScreen, lltpStep, formData]);

  // Handle actions from AI agent
  const handleAction = useCallback((actionData) => {
    console.log('Received action:', actionData);
    const { action, data } = actionData;

    switch (action) {
      case 'navigate_lltp':
        setCurrentScreen('lltp');
        setLltpStep(0);
        break;

      case 'navigate_home':
        setCurrentScreen('home');
        setLltpStep(0);
        break;

      case 'next_step':
        if (currentScreen === 'lltp' && lltpStep < 4) {
          setLltpStep(prev => prev + 1);
        }
        break;

      case 'prev_step':
        if (currentScreen === 'lltp' && lltpStep > 0) {
          setLltpStep(prev => prev - 1);
        }
        break;

      case 'fill_field':
        if (data) {
          if (data.muc_dich) {
            setFormData(prev => ({ ...prev, mucDich: data.muc_dich }));
          }
          if (data.so_ban) {
            setFormData(prev => ({ ...prev, soBanGiay: data.so_ban }));
          }
          if (data.loai_phieu) {
            setFormData(prev => ({ ...prev, loaiPhieu: data.loai_phieu }));
          }
        }
        break;

      case 'submit':
        // Handle form submission
        setAiMessage('Yêu cầu đã được gửi thành công!');
        setTimeout(() => {
          setCurrentScreen('home');
          setLltpStep(0);
        }, 2000);
        break;

      default:
        console.log('Unknown action:', action);
    }
  }, [currentScreen, lltpStep]);

  // Initialize LiveKit connection
  useEffect(() => {
    const initLiveKit = async () => {
      setIsConnecting(true);

      // Set up callbacks
      liveKitService.setCallbacks({
        onConnected: () => {
          console.log('LiveKit connected!');
          setIsConnected(true);
          setIsConnecting(false);
          setShowVoiceModal(true);

          // Start microphone automatically
          setTimeout(async () => {
            const success = await liveKitService.startMicrophone();
            if (success) {
              setIsMicEnabled(true);
              Vibration.vibrate(30);
            }
          }, 500);
        },

        onDisconnected: () => {
          console.log('LiveKit disconnected');
          setIsConnected(false);
          setIsMicEnabled(false);
        },

        onAgentMessage: (message) => {
          console.log('Agent message:', message);
          setAiMessage(message);
        },

        onAgentSpeaking: () => {
          setIsAgentSpeaking(true);
        },

        onAgentStoppedSpeaking: () => {
          setIsAgentSpeaking(false);
        },

        onTranscript: (text) => {
          setTranscript(text);
        },

        onAction: handleAction,

        onError: (error) => {
          console.error('LiveKit error:', error);
          setAiMessage('Lỗi kết nối: ' + error);
        },
      });

      // Fetch token from your server (you need to implement this)
      try {
        // For demo, use a hardcoded token or implement token fetching
        // const response = await fetch('YOUR_TOKEN_SERVER/get-token');
        // const { token } = await response.json();

        // Connect to LiveKit
        // await liveKitService.connect(LIVEKIT_URL, token);

        // For now, show a message about setup needed
        setIsConnecting(false);
        setAiMessage('Cần setup LiveKit Cloud trước. Xem hướng dẫn bên dưới.');

      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnecting(false);
        setAiMessage('Không thể kết nối. Vui lòng thử lại.');
      }
    };

    initLiveKit();

    return () => {
      liveKitService.disconnect();
    };
  }, [handleAction]);

  // Update context when screen changes
  useEffect(() => {
    if (isConnected) {
      liveKitService.sendContextUpdate(MOCK_USER, getScreenContext());
    }
  }, [currentScreen, lltpStep, formData, isConnected, getScreenContext]);

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (isMicEnabled) {
      await liveKitService.stopMicrophone();
      setIsMicEnabled(false);
    } else {
      const success = await liveKitService.startMicrophone();
      if (success) {
        setIsMicEnabled(true);
        Vibration.vibrate(30);
      }
    }
  };

  // Handle navigation
  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
    if (screen === 'lltp') {
      setLltpStep(0);
    }
  };

  const openVoiceModal = () => {
    setShowVoiceModal(true);
    if (!isMicEnabled && isConnected) {
      toggleMicrophone();
    }
  };

  const closeVoiceModal = async () => {
    setShowVoiceModal(false);
    if (isMicEnabled) {
      await liveKitService.stopMicrophone();
      setIsMicEnabled(false);
    }
  };

  // Loading screen
  if (isConnecting) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang kết nối...</Text>
      </SafeAreaView>
    );
  }

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
          speakText={() => {}}
        />
      )}

      {/* Voice FAB */}
      <VoiceFab onPress={openVoiceModal} isActive={showVoiceModal || isMicEnabled} />

      {/* Voice Modal */}
      <VoiceModal
        visible={showVoiceModal}
        onClose={closeVoiceModal}
        isListening={isMicEnabled && !isAgentSpeaking}
        isProcessing={isAgentSpeaking}
        aiMessage={aiMessage}
        onStartListening={toggleMicrophone}
        onStopListening={toggleMicrophone}
        onCommand={() => {}}
        currentScreen={currentScreen}
      />

      {/* Connection Status */}
      {!isConnected && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>Chưa kết nối LiveKit</Text>
        </View>
      )}

      {/* Transcript Display */}
      {transcript && isMicEnabled && (
        <View style={styles.transcriptBar}>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      )}

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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: COLORS.warning,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: COLORS.text,
    fontSize: 14,
  },
  transcriptBar: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
  },
  transcriptText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
