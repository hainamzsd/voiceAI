// Voice AI Floating Indicator - Minimal Design (doesn't block screen)
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';

const { width } = Dimensions.get('window');

// Floating Voice Indicator - Shows at bottom, doesn't block screen
export const VoiceModal = ({
  visible,
  onClose,
  isListening,
  isProcessing,
  aiMessage,
  onStartListening,
  onStopListening,
  onCommand,
  currentScreen,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* AI Message Toast */}
      {aiMessage ? (
        <View style={styles.messageToast}>
          <View style={styles.messageIcon}>
            <Feather name="cpu" size={14} color={COLORS.textOnPrimary} />
          </View>
          <Text style={styles.messageText} numberOfLines={3}>
            {aiMessage}
          </Text>
        </View>
      ) : null}

      {/* Voice Control Bar */}
      <View style={styles.voiceBar}>
        {/* Status indicator */}
        <View style={styles.statusSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: isListening
                  ? COLORS.error
                  : isProcessing
                  ? COLORS.warning
                  : COLORS.success,
              },
            ]}
          />
          <Text style={styles.statusText}>
            {isProcessing
              ? 'Đang xử lý...'
              : isListening
              ? 'Đang nghe...'
              : 'Sẵn sàng'}
          </Text>
        </View>

        {/* Mic Button */}
        <TouchableOpacity
          style={[
            styles.micButton,
            isListening && styles.micButtonActive,
          ]}
          onPress={isListening ? onStopListening : onStartListening}
          disabled={isProcessing}
        >
          <Feather
            name={isListening ? 'mic-off' : 'mic'}
            size={22}
            color={COLORS.textOnPrimary}
          />
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Feather name="x" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Voice FAB - Tap to activate voice mode
export const VoiceFab = ({ onPress, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {isActive && (
        <Animated.View
          style={[
            styles.fabPulse,
            { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
              inputRange: [1, 1.3],
              outputRange: [0.4, 0],
            }) },
          ]}
        />
      )}
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={
            isActive
              ? ['#EF4444', '#DC2626']
              : [COLORS.primaryGradientStart, COLORS.primaryGradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Feather
            name={isActive ? 'mic' : 'mic'}
            size={26}
            color={COLORS.textOnPrimary}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Container - positioned at bottom, doesn't block screen
  container: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 1000,
  },

  // Message Toast - small floating message
  messageToast: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.medium,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  messageIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  messageText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Voice Control Bar
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: SPACING.sm,
    paddingLeft: SPACING.md,
    ...SHADOWS.medium,
  },

  // Status Section
  statusSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },

  // Mic Button
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  micButtonActive: {
    backgroundColor: COLORS.error,
  },

  // Close Button
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 85,
    alignSelf: 'center',
    zIndex: 100,
  },
  fabPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error,
    left: -8,
    top: -8,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
});

export default VoiceModal;
