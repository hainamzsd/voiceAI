// LLTP Additional Info Screen - Step 2
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../../constants/colors';
import {
  LLTPHeader,
  FormField,
  AIMessageBox,
  PrimaryButton,
  SecondaryButton,
} from '../../components';
import { LLTPStepIndicator } from './LLTPStepIndicator';

export const LLTPAdditionalScreen = ({ user, onNavigate, aiMessage }) => {
  return (
    <View style={styles.container}>
      <LLTPHeader
        title="Lý lịch tư pháp"
        onBack={() => onNavigate('lltp_personal')}
        showHistory={false}
      />

      <LLTPStepIndicator currentScreen="lltp_additional" />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AIMessageBox message={aiMessage} />

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin bổ sung</Text>
          </View>

          <FormField label="Tên gọi khác" placeholder="Nhập nếu có" />
          <FormField label="Họ và tên cha" placeholder="Nhập thông tin" />
          <FormField label="Năm sinh cha" placeholder="Chọn năm" />
          <FormField label="Họ và tên mẹ" placeholder="Nhập thông tin" />
          <FormField label="Năm sinh mẹ" placeholder="Chọn năm" />
          <FormField label="Email" value={user.email} required />
          <FormField label="Số điện thoại" value={user.sdt} required />
        </View>

        <View style={styles.navButtons}>
          <View style={styles.backBtnWrap}>
            <SecondaryButton
              title="Quay lại"
              onPress={() => onNavigate('lltp_personal')}
              icon="arrow-left"
            />
          </View>
          <View style={styles.nextBtnWrap}>
            <PrimaryButton
              title="Tiếp tục"
              onPress={() => onNavigate('lltp_purpose')}
              icon="arrow-right"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
  },
  navButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  backBtnWrap: {
    flex: 1,
  },
  nextBtnWrap: {
    flex: 2,
  },
  bottomPadding: {
    height: 40,
  },
});

export default LLTPAdditionalScreen;
