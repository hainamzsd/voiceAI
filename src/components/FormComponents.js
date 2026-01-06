// Form Components - Professional Design
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';

// Form Field (readonly display)
export const FormField = ({ label, value, placeholder, readonly, required, multiline }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[styles.inputWrap, readonly && styles.inputReadonly]}>
      <Text
        style={[
          styles.inputValue,
          !value && styles.inputPlaceholder,
          multiline && styles.inputMultiline,
        ]}
        numberOfLines={multiline ? 3 : 1}
      >
        {value || placeholder || '—'}
      </Text>
      {readonly && (
        <View style={styles.lockBadge}>
          <Feather name="lock" size={12} color={COLORS.textMuted} />
        </View>
      )}
    </View>
  </View>
);

// Summary Row
export const SummaryRow = ({ label, value }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={2}>{value}</Text>
  </View>
);

// Radio Option
export const RadioOption = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.radioItem, selected && styles.radioItemSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.radio, selected && styles.radioActive]}>
      {selected && <View style={styles.radioDot} />}
    </View>
    <Text style={[styles.radioText, selected && styles.radioTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

// Select Input
export const SelectInput = ({ value, placeholder, onPress }) => (
  <TouchableOpacity style={styles.selectInput} onPress={onPress} activeOpacity={0.7}>
    <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
      {value || placeholder}
    </Text>
    <View style={styles.selectArrowWrap}>
      <Feather name="chevron-down" size={16} color={COLORS.textSecondary} />
    </View>
  </TouchableOpacity>
);

// Quantity Control
export const QuantityControl = ({ value, onChange, min = 1, max = 12 }) => (
  <View style={styles.quantityContainer}>
    <TouchableOpacity
      style={[styles.quantityBtn, parseInt(value) <= min && styles.quantityBtnDisabled]}
      onPress={() => {
        const n = parseInt(value) || min;
        if (n > min) onChange(String(n - 1));
      }}
      activeOpacity={0.7}
    >
      <Feather name="minus" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
    <View style={styles.quantityValueWrap}>
      <Text style={styles.quantityValue}>{value}</Text>
      <Text style={styles.quantityUnit}>bản</Text>
    </View>
    <TouchableOpacity
      style={[styles.quantityBtn, styles.quantityBtnPlus, parseInt(value) >= max && styles.quantityBtnDisabled]}
      onPress={() => {
        const n = parseInt(value) || min;
        if (n < max) onChange(String(n + 1));
      }}
      activeOpacity={0.7}
    >
      <Feather name="plus" size={20} color={COLORS.textOnPrimary} />
    </TouchableOpacity>
  </View>
);

// AI Message Box
export const AIMessageBox = ({ message }) => {
  if (!message) return null;
  return (
    <View style={styles.aiMessageBox}>
      <LinearGradient
        colors={[COLORS.primaryLight, '#FADEDE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiMessageGradient}
      >
        <View style={styles.aiIconWrap}>
          <Feather name="cpu" size={16} color={COLORS.textOnPrimary} />
        </View>
        <Text style={styles.aiMessageText}>{message}</Text>
      </LinearGradient>
    </View>
  );
};

// Voice Hint
export const VoiceHint = ({ text }) => (
  <View style={styles.voiceHint}>
    <View style={styles.voiceHintIcon}>
      <Feather name="mic" size={14} color={COLORS.textOnPrimary} />
    </View>
    <Text style={styles.voiceHintText}>{text}</Text>
  </View>
);

// Section Title
export const SectionTitle = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// Primary Button
export const PrimaryButton = ({ title, onPress, variant = 'primary', disabled, icon }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    <LinearGradient
      colors={
        variant === 'success'
          ? [COLORS.success, COLORS.successDark]
          : disabled
          ? [COLORS.disabled, COLORS.disabled]
          : [COLORS.primaryGradientStart, COLORS.primaryGradientEnd]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.primaryBtnGradient}
    >
      {icon && (
        <Feather name={icon} size={18} color={COLORS.textOnPrimary} style={styles.btnIcon} />
      )}
      <Text style={styles.primaryBtnText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// Secondary Button
export const SecondaryButton = ({ title, onPress, icon }) => (
  <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.7}>
    {icon && (
      <Feather name={icon} size={18} color={COLORS.textSecondary} style={styles.btnIcon} />
    )}
    <Text style={styles.secondaryBtnText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Input Group
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.primary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputReadonly: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.borderLight,
  },
  inputValue: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  inputPlaceholder: {
    color: COLORS.placeholder,
  },
  inputMultiline: {
    lineHeight: 22,
  },
  lockBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },

  // Select Input
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectValue: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.placeholder,
  },
  selectArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Radio
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  radioItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  radioActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  radioTextSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },

  // Quantity
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityBtnPlus: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quantityBtnDisabled: {
    opacity: 0.5,
  },
  quantityValueWrap: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: FONTS.bold,
    color: COLORS.text,
  },
  quantityUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Summary Row
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  summaryValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: FONTS.medium,
    flex: 1.5,
    textAlign: 'right',
  },

  // AI Message
  aiMessageBox: {
    marginBottom: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiMessageGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  aiMessageText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },

  // Voice Hint
  voiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  voiceHintIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  voiceHintText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },

  // Section Title
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // Primary Button
  primaryBtn: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.textOnPrimary,
  },

  // Secondary Button
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
  },
});

export default {
  FormField,
  SummaryRow,
  RadioOption,
  SelectInput,
  QuantityControl,
  AIMessageBox,
  VoiceHint,
  SectionTitle,
  PrimaryButton,
  SecondaryButton,
};
