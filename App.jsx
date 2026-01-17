/**
 * VNeID Voice AI Demo - LiveKit Version
 * Real-time voice with separate screen navigation
 */

// Polyfills for Hermes (must be first)
import 'text-encoding-polyfill';

// IMPORTANT: Register WebRTC globals FIRST
import { registerGlobals } from '@livekit/react-native-webrtc';
registerGlobals();

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator, Vibration, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Constants
import { COLORS } from './src/constants/colors';
import { MOCK_USER, INITIAL_FORM_DATA, MUC_DICH_OPTIONS } from './src/constants/mockData';

// Screens
import {
  HomeScreen,
  LLTPIntroScreen,
  LLTPPersonalScreen,
  LLTPAdditionalScreen,
  LLTPPurposeScreen,
  LLTPConfirmScreen,
  getNextScreen,
  getPrevScreen,
} from './src/screens';

// Components
import { BottomNav, VoiceModal, VoiceFab } from './src/components';

// LiveKit Service (imported AFTER registerGlobals)
import liveKitService from './src/services/liveKitService';

// LiveKit Configuration
const LIVEKIT_URL = 'wss://dang-7j9lholr.livekit.cloud';

// Token server URL based on platform
// - Android emulator: 10.0.2.2 (special alias for host localhost)
// - iOS simulator: localhost works
// - Physical device: use your computer's local IP address (e.g., 192.168.1.x)
const getTokenServerUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // For Android emulator, use 10.0.2.2
      // For physical Android device, change this to your computer's IP
      return 'http://10.0.2.2:3001';
    }
    // iOS simulator can use localhost
    return 'http://localhost:3001';
  }
  // Production: replace with your production token server URL
  return 'http://localhost:3001';
};

const TOKEN_SERVER_URL = getTokenServerUrl();

// All valid screens
const ALL_SCREENS = ['home', 'lltp_intro', 'lltp_personal', 'lltp_additional', 'lltp_purpose', 'lltp_confirm'];
const isLLTPScreen = (screen) => screen?.startsWith('lltp_');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // LiveKit states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [transcript, setTranscript] = useState('');

  // Navigate to screen
  const navigateTo = useCallback((screen) => {
    if (ALL_SCREENS.includes(screen)) {
      setCurrentScreen(screen);
    }
  }, []);

  // Build context for AI
  const getScreenContext = useCallback(() => {
    switch (currentScreen) {
      case 'home':
        return { screen_name: 'home', available_actions: ['navigate_lltp'] };
      case 'lltp_intro':
        return { screen_name: 'lltp_intro', current_step: 0, available_actions: ['next_step', 'navigate_home'] };
      case 'lltp_personal':
        return { screen_name: 'lltp_personal', current_step: 1, available_actions: ['next_step', 'prev_step'] };
      case 'lltp_additional':
        return { screen_name: 'lltp_additional', current_step: 2, available_actions: ['next_step', 'prev_step'] };
      case 'lltp_purpose':
        return {
          screen_name: 'lltp_purpose',
          current_step: 3,
          filled_data: { loai_phieu: formData.loaiPhieu, muc_dich: formData.mucDich, so_ban: formData.soBanGiay },
          available_actions: ['next_step', 'prev_step', 'fill_field'],
        };
      case 'lltp_confirm':
        return { screen_name: 'lltp_confirm', current_step: 4, available_actions: ['prev_step', 'submit'] };
      default:
        return { screen_name: currentScreen };
    }
  }, [currentScreen, formData]);

  // Handle AI actions
  const handleAction = useCallback((actionData) => {
    const { action, data } = actionData;

    switch (action) {
      case 'navigate_lltp':
      case 'start_lltp':
        navigateTo('lltp_intro');
        break;
      case 'navigate_home':
        navigateTo('home');
        break;
      case 'next_step':
        const next = getNextScreen(currentScreen);
        if (next) navigateTo(next);
        break;
      case 'prev_step':
        const prev = getPrevScreen(currentScreen);
        if (prev) navigateTo(prev);
        break;
      case 'fill_field':
        if (data) {
          setFormData(prev => ({
            ...prev,
            ...(data.muc_dich && { mucDich: data.muc_dich }),
            ...(data.so_ban && { soBanGiay: data.so_ban }),
            ...(data.loai_phieu && { loaiPhieu: data.loai_phieu }),
          }));
        }
        break;
      case 'submit':
        setAiMessage('Yêu cầu đã được gửi!');
        setTimeout(() => {
          setFormData(INITIAL_FORM_DATA);
          navigateTo('home');
        }, 2000);
        break;
    }
  }, [currentScreen, navigateTo]);

  // Connection retry state
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef(null);

  // Connect to LiveKit with retry logic
  const connectToLiveKit = useCallback(async () => {
    try {
      console.log(`LiveKit: Attempting connection (attempt ${retryCountRef.current + 1}/${maxRetries + 1})`);
      const res = await fetch(`${TOKEN_SERVER_URL}/token?room=vneid-voice&identity=user-${Date.now()}`);
      if (!res.ok) throw new Error('Token server error');
      const { token, url } = await res.json();
      await liveKitService.connect(url || LIVEKIT_URL, token);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('LiveKit connection error:', error.message);

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000); // Exponential backoff, max 10s
        setAiMessage(`Kết nối thất bại. Thử lại sau ${delay / 1000}s...`);

        retryTimeoutRef.current = setTimeout(() => {
          connectToLiveKit();
        }, delay);
      } else {
        setIsConnecting(false);
        setAiMessage(`Không thể kết nối. Vui lòng kiểm tra kết nối mạng và token server.`);
      }
    }
  }, []);

  // Initialize LiveKit
  useEffect(() => {
    const init = async () => {
      setIsConnecting(true);

      liveKitService.setCallbacks({
        onConnected: () => {
          setIsConnected(true);
          setIsConnecting(false);
          setAiMessage('');
          setShowVoiceModal(true);
          setTimeout(async () => {
            if (await liveKitService.startMicrophone()) {
              setIsMicEnabled(true);
              Vibration.vibrate(30);
            }
          }, 500);
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsMicEnabled(false);
          // Try to reconnect after disconnect
          if (retryCountRef.current < maxRetries) {
            setAiMessage('Mất kết nối. Đang thử kết nối lại...');
            retryCountRef.current++;
            setTimeout(() => connectToLiveKit(), 2000);
          }
        },
        onAgentMessage: (msg) => setAiMessage(msg),
        onAgentSpeaking: () => setIsAgentSpeaking(true),
        onAgentStoppedSpeaking: () => setIsAgentSpeaking(false),
        onTranscript: (text) => setTranscript(text),
        onAction: handleAction,
        onError: (err) => setAiMessage('Lỗi: ' + err),
      });

      await connectToLiveKit();
    };

    init();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      liveKitService.disconnect();
    };
  }, [handleAction, connectToLiveKit]);

  // Update context on screen change
  useEffect(() => {
    if (isConnected) {
      liveKitService.sendContextUpdate(MOCK_USER, getScreenContext());
    }
  }, [currentScreen, formData, isConnected, getScreenContext]);

  const toggleMic = async () => {
    if (isMicEnabled) {
      await liveKitService.stopMicrophone();
      setIsMicEnabled(false);
    } else {
      if (await liveKitService.startMicrophone()) {
        setIsMicEnabled(true);
        Vibration.vibrate(30);
      }
    }
  };

  const handleBottomNav = (screen) => {
    navigateTo(screen === 'lltp' ? 'lltp_intro' : screen);
  };

  const openVoiceModal = () => {
    setShowVoiceModal(true);
    if (!isMicEnabled && isConnected) toggleMic();
  };

  const closeVoiceModal = async () => {
    setShowVoiceModal(false);
    if (isMicEnabled) {
      await liveKitService.stopMicrophone();
      setIsMicEnabled(false);
    }
  };

  if (isConnecting) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang kết nối...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen user={MOCK_USER} onNavigate={handleBottomNav} />;
      case 'lltp_intro':
        return <LLTPIntroScreen onNavigate={navigateTo} onBack={() => navigateTo('home')} aiMessage={aiMessage} />;
      case 'lltp_personal':
        return <LLTPPersonalScreen user={MOCK_USER} onNavigate={navigateTo} aiMessage={aiMessage} />;
      case 'lltp_additional':
        return <LLTPAdditionalScreen user={MOCK_USER} onNavigate={navigateTo} aiMessage={aiMessage} />;
      case 'lltp_purpose':
        return <LLTPPurposeScreen formData={formData} setFormData={setFormData} onNavigate={navigateTo} aiMessage={aiMessage} />;
      case 'lltp_confirm':
        return <LLTPConfirmScreen formData={formData} user={MOCK_USER} onNavigate={navigateTo} aiMessage={aiMessage} />;
      default:
        return <HomeScreen user={MOCK_USER} onNavigate={handleBottomNav} />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        {renderScreen()}
        <VoiceFab onPress={openVoiceModal} isActive={showVoiceModal || isMicEnabled} />
        <VoiceModal
          visible={showVoiceModal}
          onClose={closeVoiceModal}
          isListening={isMicEnabled && !isAgentSpeaking}
          isProcessing={isAgentSpeaking}
          aiMessage={aiMessage}
          onStartListening={toggleMic}
          onStopListening={toggleMic}
          onCommand={() => {}}
          currentScreen={currentScreen}
        />
        {!isConnected && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Chưa kết nối LiveKit</Text>
          </View>
        )}
        {transcript && isMicEnabled && (
          <View style={styles.transcriptBar}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}
        <BottomNav current={isLLTPScreen(currentScreen) ? 'lltp' : currentScreen} onNavigate={handleBottomNav} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary },
  statusBar: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: COLORS.warning, padding: 8, borderRadius: 8, alignItems: 'center' },
  statusText: { color: COLORS.text, fontSize: 14 },
  transcriptBar: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 8 },
  transcriptText: { color: '#fff', fontSize: 14, textAlign: 'center' },
});
