// LLTP Intro Screen
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../../constants/colors';
import { LLTPHeader, AIMessageBox, PrimaryButton } from '../../components';

export const LLTPIntroScreen = ({ onNavigate, onBack, aiMessage }) => {
  return (
    <View style={styles.container}>
      <LLTPHeader title="Lý lịch tư pháp" onBack={onBack} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <View style={styles.introIconWrap}>
            <Feather name="file-text" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Cấp phiếu lý lịch tư pháp</Text>
          <Text style={styles.introDesc}>
            Phiếu lý lịch tư pháp là phiếu do cơ quan quản lý cơ sở dữ liệu lý lịch tư pháp
            cấp có giá trị chứng minh cá nhân có hay không có án tích.
          </Text>

          <View style={styles.introFeatures}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Feather name="zap" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Xử lý nhanh trong 3-5 ngày</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Feather name="mic" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Hỗ trợ điền form bằng giọng nói</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconWrap}>
                <Feather name="smartphone" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>Theo dõi tiến độ trên app</Text>
            </View>
          </View>

          <PrimaryButton
            title="Tạo mới yêu cầu"
            onPress={() => onNavigate('lltp_personal')}
          />
        </View>

        <AIMessageBox message={aiMessage} />

        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Chưa có yêu cầu</Text>
          <Text style={styles.emptyDesc}>Bắt đầu tạo yêu cầu cấp phiếu LLTP ngay</Text>
        </View>
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
    padding: SPACING.lg,
  },
  introCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  introIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  introTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  introDesc: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  introFeatures: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
});

export default LLTPIntroScreen;
