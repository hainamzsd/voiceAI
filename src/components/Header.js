// VNeID Header Component - Professional Design
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';

export const Header = ({ user }) => {
  return (
    <LinearGradient
      colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContainer}>
        {/* Top Row */}
        <View style={styles.headerTop}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Feather name="user" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.avatarBadge}>
              <Feather name="check" size={10} color={COLORS.surface} />
            </View>
          </TouchableOpacity>

          {/* User Info */}
          <View style={styles.userInfo}>
            <View style={styles.levelBadge}>
              <View style={styles.levelDot} />
              <Text style={styles.levelText}>Mức {user.dinhDanhMuc}</Text>
            </View>
            <Text style={styles.userName}>{user.hoTen}</Text>
          </View>

          {/* Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn}>
              <Feather name="bell" size={20} color={COLORS.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn}>
              <Feather name="search" size={20} color={COLORS.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Cards */}
        <View style={styles.qrCardsContainer}>
          <TouchableOpacity style={styles.qrCard}>
            <View style={styles.qrIconWrapper}>
              <Feather name="credit-card" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.qrCardContent}>
              <Text style={styles.qrCardLabel}>Mã QR</Text>
              <Text style={styles.qrCardTitle}>Thẻ CCCD</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.qrCard, styles.qrCardSecondary]}>
            <View style={[styles.qrIconWrapper, styles.qrIconSecondary]}>
              <Feather name="shield" size={20} color={COLORS.accent} />
            </View>
            <View style={styles.qrCardContent}>
              <Text style={styles.qrCardLabel}>Mã QR</Text>
              <Text style={styles.qrCardTitle}>Định danh</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

export const LLTPHeader = ({ title, onBack, showHistory = true }) => (
  <View style={styles.lltpHeader}>
    <TouchableOpacity onPress={onBack} style={styles.backButton}>
      <Feather name="arrow-left" size={20} color={COLORS.text} />
    </TouchableOpacity>

    <Text style={styles.lltpHeaderTitle} numberOfLines={1}>{title}</Text>

    {showHistory ? (
      <TouchableOpacity style={styles.historyButton}>
        <Feather name="clock" size={16} color={COLORS.textSecondary} />
        <Text style={styles.historyText}>Lịch sử</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.headerPlaceholder} />
    )}
  </View>
);

const styles = StyleSheet.create({
  // Main Header with Gradient
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 8,
    paddingBottom: SPACING.xl,
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
  },

  // Top Row
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  // User Info
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: SPACING.xs,
  },
  levelText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textOnPrimary,
    fontWeight: FONTS.medium,
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textOnPrimary,
    letterSpacing: 0.3,
  },

  // Header Actions
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // QR Cards
  qrCardsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  qrCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  qrCardSecondary: {
    backgroundColor: COLORS.accentLight,
  },
  qrIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIconSecondary: {
    backgroundColor: COLORS.accent + '30',
  },
  qrCardContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  qrCardLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  qrCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
  },

  // LLTP Header
  lltpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lltpHeaderTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  historyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.medium,
  },
  headerPlaceholder: {
    width: 36,
  },
});

export default Header;
