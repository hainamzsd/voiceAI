// Home Screen - Professional Design
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';
import { Header } from '../components';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;

// Services data with Feather icons
const SERVICES = [
  { id: 'tthc', icon: 'file-text', label: 'Thủ tục hành chính', color: COLORS.primaryLight },
  { id: 'asxh', icon: 'users', label: 'An sinh xã hội', color: '#E8F5E9' },
  { id: 'hssk', icon: 'activity', label: 'Hồ sơ sức khỏe', color: '#FFF3E0' },
  { id: 'dvk', icon: 'grid', label: 'Dịch vụ khác', color: '#F3E5F5' },
];

const QUICK_ACTIONS = [
  { id: 'lltp', icon: 'file-text', label: 'Lý lịch tư pháp', desc: 'Cấp phiếu LLTP online', featured: true },
  { id: 'visa', icon: 'globe', label: 'Visa & Hộ chiếu', desc: 'Thủ tục xuất nhập cảnh' },
  { id: 'bhxh', icon: 'shield', label: 'Bảo hiểm', desc: 'BHXH, BHYT, BHTN' },
];

const FAVORITES = [
  { icon: 'credit-card', label: 'Thẻ CCCD' },
  { icon: 'truck', label: 'GPLX' },
  { icon: 'heart', label: 'BHYT' },
  { icon: 'home', label: 'Cư trú' },
  { icon: 'navigation', label: 'Xe' },
  { icon: 'users', label: 'Gia đình' },
];

// Section Header Component
const SectionHeader = ({ title, actionText, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionText && (
      <TouchableOpacity onPress={onAction} style={styles.sectionActionBtn}>
        <Text style={styles.sectionAction}>{actionText}</Text>
        <Feather name="chevron-right" size={14} color={COLORS.primary} />
      </TouchableOpacity>
    )}
  </View>
);

// Service Card Component
const ServiceCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.serviceCard, { backgroundColor: item.color }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.serviceIconWrap}>
      <Feather name={item.icon} size={22} color={COLORS.primary} />
    </View>
    <Text style={styles.serviceLabel}>{item.label}</Text>
  </TouchableOpacity>
);

// Quick Action Card Component
const QuickActionCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.quickActionCard, item.featured && styles.quickActionFeatured]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {item.featured && (
      <LinearGradient
        colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.quickActionGradient}
      />
    )}
    <View style={[styles.quickActionIcon, item.featured && styles.quickActionIconFeatured]}>
      <Feather
        name={item.icon}
        size={24}
        color={item.featured ? COLORS.textOnPrimary : COLORS.primary}
      />
    </View>
    <View style={styles.quickActionContent}>
      <Text style={[styles.quickActionTitle, item.featured && styles.quickActionTitleFeatured]}>
        {item.label}
      </Text>
      <Text style={[styles.quickActionDesc, item.featured && styles.quickActionDescFeatured]}>
        {item.desc}
      </Text>
    </View>
    <View style={[styles.quickActionArrow, item.featured && styles.quickActionArrowFeatured]}>
      <Feather
        name="chevron-right"
        size={18}
        color={item.featured ? COLORS.textOnPrimary : COLORS.textMuted}
      />
    </View>
  </TouchableOpacity>
);

// Favorite Item Component
const FavoriteItem = ({ item }) => (
  <TouchableOpacity style={styles.favoriteItem} activeOpacity={0.7}>
    <View style={styles.favoriteIcon}>
      <Feather name={item.icon} size={22} color={COLORS.primary} />
    </View>
    <Text style={styles.favoriteLabel}>{item.label}</Text>
  </TouchableOpacity>
);

export const HomeScreen = ({ user, onNavigate }) => {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header with Gradient */}
      <Header user={user} />

      {/* Content */}
      <View style={styles.content}>
        {/* Services Grid */}
        <SectionHeader title="Nhóm dịch vụ" actionText="Xem tất cả" />
        <View style={styles.servicesGrid}>
          {SERVICES.map(item => (
            <ServiceCard key={item.id} item={item} onPress={() => {}} />
          ))}
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Truy cập nhanh" />
        <View style={styles.quickActionsContainer}>
          {QUICK_ACTIONS.map(item => (
            <QuickActionCard
              key={item.id}
              item={item}
              onPress={() => item.id === 'lltp' && onNavigate('lltp')}
            />
          ))}
        </View>

        {/* Voice AI Banner */}
        <TouchableOpacity style={styles.voiceBanner} activeOpacity={0.9}>
          <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.voiceBannerGradient}
          >
            <View style={styles.voiceBannerContent}>
              <View style={styles.voiceIconWrapper}>
                <Feather name="mic" size={24} color={COLORS.textOnPrimary} />
              </View>
              <View style={styles.voiceBannerText}>
                <Text style={styles.voiceBannerTitle}>Trợ lý AI Voice</Text>
                <Text style={styles.voiceBannerDesc}>
                  Điền form bằng giọng nói
                </Text>
              </View>
              <View style={styles.voiceBannerBadge}>
                <Text style={styles.badgeText}>MỚI</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Favorites */}
        <SectionHeader title="Giấy tờ của tôi" actionText="Chỉnh sửa" />
        <View style={styles.favoritesGrid}>
          {FAVORITES.map((item, idx) => (
            <FavoriteItem key={idx} item={item} />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpace} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: FONTS.medium,
  },

  // Services Grid
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  serviceCard: {
    width: CARD_WIDTH,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  serviceLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.medium,
    color: COLORS.text,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsContainer: {
    gap: SPACING.md,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  quickActionFeatured: {
    borderWidth: 0,
  },
  quickActionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconFeatured: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickActionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  quickActionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
    marginBottom: 2,
  },
  quickActionTitleFeatured: {
    color: COLORS.textOnPrimary,
  },
  quickActionDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  quickActionDescFeatured: {
    color: 'rgba(255,255,255,0.8)',
  },
  quickActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionArrowFeatured: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Voice Banner
  voiceBanner: {
    marginTop: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  voiceBannerGradient: {
    padding: SPACING.lg,
  },
  voiceBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBannerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  voiceBannerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textOnPrimary,
    marginBottom: 2,
  },
  voiceBannerDesc: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  voiceBannerBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONTS.bold,
    color: COLORS.textOnAccent,
  },

  // Favorites
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  favoriteItem: {
    width: (width - SPACING.lg * 2 - SPACING.md * 2) / 3,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  favoriteIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  favoriteLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: FONTS.medium,
    textAlign: 'center',
  },

  bottomSpace: {
    height: 40,
  },
});

export default HomeScreen;
