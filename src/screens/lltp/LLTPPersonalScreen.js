// LLTP Personal Info Screen - Step 1
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../../constants/colors';
import {
  LLTPHeader,
  FormField,
  AIMessageBox,
  PrimaryButton,
  SecondaryButton,
} from '../../components';
import { LLTPStepIndicator } from './LLTPStepIndicator';

export const LLTPPersonalScreen = ({ user, onNavigate, onBack, aiMessage }) => {
  return (
    <View style={styles.container}>
      <LLTPHeader
        title="Lý lịch tư pháp"
        onBack={() => onNavigate('lltp_intro')}
        showHistory={false}
      />

      <LLTPStepIndicator currentScreen="lltp_personal" />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AIMessageBox message={aiMessage} />

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin người yêu cầu</Text>
            <View style={styles.autoBadge}>
              <Feather name="check" size={10} color={COLORS.success} />
              <Text style={styles.autoBadgeText}>Tự động từ VNeID</Text>
            </View>
          </View>

          <FormField label="Họ và tên" value={user.hoTen} readonly />
          <FormField label="Giới tính" value={user.gioiTinh} readonly />
          <FormField label="Ngày sinh" value={user.ngaySinh} readonly />
          <FormField label="Nơi sinh" value={user.noiSinh} readonly />
          <FormField label="Quốc tịch" value={user.quocTich} readonly />
          <FormField label="Dân tộc" value={user.danToc} readonly />
          <FormField label="Số CCCD" value={user.cccd} readonly />
          <FormField label="Nơi thường trú" value={user.thuongTru} readonly multiline />
        </View>

        <View style={styles.navButtons}>
          <View style={styles.backBtnWrap}>
            <SecondaryButton
              title="Quay lại"
              onPress={() => onNavigate('lltp_intro')}
              icon="arrow-left"
            />
          </View>
          <View style={styles.nextBtnWrap}>
            <PrimaryButton
              title="Tiếp tục"
              onPress={() => onNavigate('lltp_additional')}
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
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  autoBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: FONTS.medium,
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

export default LLTPPersonalScreen;
