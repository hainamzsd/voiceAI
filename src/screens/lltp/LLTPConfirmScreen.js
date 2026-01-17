// LLTP Confirmation Screen - Step 4
import React from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../../constants/colors';
import {
  LLTPHeader,
  SummaryRow,
  AIMessageBox,
  PrimaryButton,
  SecondaryButton,
} from '../../components';
import { LLTPStepIndicator } from './LLTPStepIndicator';

export const LLTPConfirmScreen = ({ formData, user, onNavigate, aiMessage, onSubmit }) => {
  const handleSubmit = () => {
    Alert.alert(
      'Thành công!',
      'Yêu cầu của bạn đã được gửi thành công.\nKết quả sẽ được cập nhật trên VNeID trong 3-5 ngày làm việc.',
      [{ text: 'Đã hiểu', onPress: () => {
        if (onSubmit) onSubmit();
        onNavigate('home');
      }}]
    );
  };

  return (
    <View style={styles.container}>
      <LLTPHeader
        title="Lý lịch tư pháp"
        onBack={() => onNavigate('lltp_purpose')}
        showHistory={false}
      />

      <LLTPStepIndicator currentScreen="lltp_confirm" />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AIMessageBox message={aiMessage} />

        {/* Procedure Info */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin thủ tục</Text>
          </View>
          <SummaryRow label="Cơ quan thực hiện" value="Sở Tư pháp TP. Hà Nội" />
          <SummaryRow
            label="Loại phiếu"
            value={formData.loaiPhieu === 'so1' ? 'Phiếu số 1' : 'Phiếu số 2'}
          />
          <SummaryRow label="Mục đích" value={formData.mucDich || '—'} />
          <SummaryRow label="Số lượng" value={`${formData.soBanGiay} bản`} />
        </View>

        {/* Personal Info */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          </View>
          <SummaryRow label="Họ tên" value={user.hoTen} />
          <SummaryRow label="Ngày sinh" value={user.ngaySinh} />
          <SummaryRow label="Số CCCD" value={user.cccd} />
          <SummaryRow label="Địa chỉ" value={user.thuongTru} />
        </View>

        {/* Fee Card */}
        <View style={styles.feeCard}>
          <LinearGradient
            colors={[COLORS.background, '#F0F2F5']}
            style={styles.feeGradient}
          >
            <Text style={styles.feeTitle}>Chi phí dự kiến</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Phí cung cấp thông tin LLTP</Text>
              <Text style={styles.feeValue}>200.000đ</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Phí cấp thêm bản giấy</Text>
              <Text style={styles.feeValue}>0đ</Text>
            </View>
            <View style={styles.feeDivider} />
            <View style={styles.feeRow}>
              <Text style={styles.feeTotalLabel}>Tổng cộng</Text>
              <Text style={styles.feeTotalValue}>200.000đ</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Confirmation */}
        <View style={styles.confirmCard}>
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox}>
              <Feather name="check" size={14} color={COLORS.textOnPrimary} />
            </View>
            <Text style={styles.confirmText}>
              Tôi xin cam đoan những lời khai trên là đúng sự thật và chịu trách nhiệm về lời khai của mình
            </Text>
          </View>
        </View>

        <View style={styles.navButtons}>
          <View style={styles.backBtnWrap}>
            <SecondaryButton
              title="Quay lại"
              onPress={() => onNavigate('lltp_purpose')}
              icon="arrow-left"
            />
          </View>
          <View style={styles.nextBtnWrap}>
            <PrimaryButton
              title="Gửi yêu cầu"
              onPress={handleSubmit}
              variant="success"
              icon="send"
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
  feeCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  feeGradient: {
    padding: SPACING.lg,
  },
  feeTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  feeLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: FONTS.medium,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  feeTotalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
  },
  feeTotalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONTS.bold,
    color: COLORS.primary,
  },
  confirmCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  confirmText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
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

export default LLTPConfirmScreen;
