// LLTP Step Indicator Component
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, FONTS, FONT_SIZES, SPACING } from '../../constants/colors';

const { width } = Dimensions.get('window');

// Map screen names to step numbers
export const SCREEN_TO_STEP = {
  'lltp_intro': 0,
  'lltp_personal': 1,
  'lltp_additional': 2,
  'lltp_purpose': 3,
  'lltp_confirm': 4,
};

export const LLTPStepIndicator = ({ currentScreen }) => {
  const currentStep = SCREEN_TO_STEP[currentScreen] || 1;

  const steps = [
    { num: 1, label: 'Thông tin\ncá nhân' },
    { num: 2, label: 'Thông tin\nbổ sung' },
    { num: 3, label: 'Mục đích\n& Số lượng' },
    { num: 4, label: 'Xác nhận\n& Gửi' },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step.num} style={styles.stepItemWrap}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step.num && styles.stepCircleActive,
                currentStep > step.num && styles.stepCircleCompleted,
              ]}
            >
              {currentStep > step.num ? (
                <Feather name="check" size={14} color={COLORS.textOnPrimary} />
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    currentStep >= step.num && styles.stepNumActive,
                  ]}
                >
                  {step.num}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step.num && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.stepLabels}>
        {steps.map(step => (
          <Text
            key={step.num}
            style={[
              styles.stepLabel,
              currentStep >= step.num && styles.stepLabelActive,
            ]}
          >
            {step.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    ...SHADOWS.small,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  stepItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNum: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
  },
  stepNumActive: {
    color: COLORS.textOnPrimary,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  stepLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    width: (width - SPACING.md * 2) / 4,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: FONTS.medium,
  },
});

export default LLTPStepIndicator;
