// VNeID Bottom Navigation - Professional Design
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';

const TABS = [
  { id: 'home', icon: 'home', label: 'Trang chủ' },
  { id: 'wallet', icon: 'folder', label: 'Ví giấy tờ' },
  { id: 'notify', icon: 'bell', label: 'Thông báo' },
  { id: 'settings', icon: 'settings', label: 'Cài đặt' },
];

const NavItem = ({ tab, isActive, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.05 : 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: isActive ? -2 : 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.navItemContent,
          {
            transform: [{ scale: scaleAnim }, { translateY }],
          },
        ]}
      >
        <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
          <Feather
            name={tab.icon}
            size={22}
            color={isActive ? COLORS.primary : COLORS.textMuted}
          />
        </View>
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {tab.label}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BottomNav = ({ current, onNavigate }) => {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {TABS.slice(0, 2).map(tab => (
          <NavItem
            key={tab.id}
            tab={tab}
            isActive={current === tab.id}
            onPress={() => onNavigate(tab.id)}
          />
        ))}

        {/* Center Space for FAB */}
        <View style={styles.centerSpace} />

        {TABS.slice(2).map(tab => (
          <NavItem
            key={tab.id}
            tab={tab}
            isActive={current === tab.id}
            onPress={() => onNavigate(tab.id)}
          />
        ))}
      </View>

      {/* Notch cutout decoration */}
      <View style={styles.notchDecoration}>
        <View style={styles.notchLeft} />
        <View style={styles.notchRight} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.md,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.medium,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navItemContent: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: COLORS.primaryLight,
  },
  navLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: FONTS.medium,
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  centerSpace: {
    width: 72,
  },
  notchDecoration: {
    position: 'absolute',
    top: -12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  notchLeft: {
    width: 36,
    height: 12,
    backgroundColor: COLORS.surface,
    borderBottomRightRadius: 20,
    marginRight: 72,
  },
  notchRight: {
    width: 36,
    height: 12,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 20,
  },
});

export default BottomNav;
