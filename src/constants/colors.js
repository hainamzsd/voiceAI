// VNeID Design System - Modern & Elegant Color Palette

export const COLORS = {
  // Primary - Deep Red (VNeID Brand)
  primary: '#C41E3A',
  primaryDark: '#9B1B30',
  primaryLight: '#E8D4D8',
  primaryGradientStart: '#C41E3A',
  primaryGradientEnd: '#8B1538',

  // Accent - Gold/Amber
  accent: '#D4A853',
  accentDark: '#B8912E',
  accentLight: '#F5ECD7',
  accentGradientStart: '#D4A853',
  accentGradientEnd: '#C49A3D',

  // Backgrounds
  background: '#F8F9FC',
  backgroundDark: '#EEF0F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Text
  text: '#1A1D26',
  textSecondary: '#5A6275',
  textMuted: '#9BA3B5',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#1A1D26',

  // Borders & Dividers
  border: '#E8EBF0',
  borderLight: '#F0F2F5',
  divider: '#E8EBF0',

  // Status Colors
  success: '#22A06B',
  successLight: '#E3F5ED',
  successDark: '#1A7F53',

  warning: '#F5A623',
  warningLight: '#FEF4E5',

  error: '#DE350B',
  errorLight: '#FFEBE6',

  info: '#0065FF',
  infoLight: '#E6F0FF',

  // Shadows (for elevation)
  shadowLight: 'rgba(26, 29, 38, 0.06)',
  shadowMedium: 'rgba(26, 29, 38, 0.12)',
  shadowDark: 'rgba(26, 29, 38, 0.20)',

  // Overlay
  overlay: 'rgba(26, 29, 38, 0.5)',
  overlayLight: 'rgba(26, 29, 38, 0.3)',

  // Special
  skeleton: '#E8EBF0',
  disabled: '#C5CAD4',
  placeholder: '#9BA3B5',
};

// Shadow Styles
export const SHADOWS = {
  small: {
    shadowColor: '#1A1D26',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1A1D26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#1A1D26',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  colored: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// Border Radius
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Typography
export const FONTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 34,
};

export default COLORS;
