// LLTP Purpose Screen - Step 3
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../../constants/colors';
import { MUC_DICH_OPTIONS } from '../../constants/mockData';
import {
  LLTPHeader,
  RadioOption,
  SelectInput,
  QuantityControl,
  AIMessageBox,
  VoiceHint,
  PrimaryButton,
  SecondaryButton,
} from '../../components';
import { LLTPStepIndicator } from './LLTPStepIndicator';

// Purpose Selection Modal
const MucDichModal = ({ visible, onClose, selected, onSelect }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.modalContent}>
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Mục đích yêu cầu</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Feather name="x" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {MUC_DICH_OPTIONS.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.modalOption, selected === opt && styles.modalOptionActive]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionContent}>
                <Text style={[styles.modalOptionText, selected === opt && styles.modalOptionTextActive]}>
                  {opt}
                </Text>
              </View>
              {selected === opt && (
                <View style={styles.modalCheckWrap}>
                  <Feather name="check" size={14} color={COLORS.textOnPrimary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export const LLTPPurposeScreen = ({ formData, setFormData, onNavigate, aiMessage }) => {
  const [showMucDichModal, setShowMucDichModal] = useState(false);

  return (
    <View style={styles.container}>
      <LLTPHeader
        title="Lý lịch tư pháp"
        onBack={() => onNavigate('lltp_additional')}
        showHistory={false}
      />

      <LLTPStepIndicator currentScreen="lltp_purpose" />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AIMessageBox message={aiMessage} />

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin thủ tục</Text>
          </View>

          {/* Loại phiếu */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Loại phiếu LLTP</Text>
            <View style={styles.radioRow}>
              <RadioOption
                label="Phiếu số 1"
                selected={formData.loaiPhieu === 'so1'}
                onPress={() => setFormData({ ...formData, loaiPhieu: 'so1' })}
              />
              <RadioOption
                label="Phiếu số 2"
                selected={formData.loaiPhieu === 'so2'}
                onPress={() => setFormData({ ...formData, loaiPhieu: 'so2' })}
              />
            </View>
          </View>

          {/* Mục đích */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Mục đích yêu cầu <Text style={styles.required}>*</Text>
            </Text>
            <SelectInput
              value={formData.mucDich}
              placeholder="Chọn mục đích"
              onPress={() => setShowMucDichModal(true)}
            />
          </View>

          {/* Số bản */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Số lượng bản giấy <Text style={styles.required}>*</Text>
            </Text>
            <QuantityControl
              value={formData.soBanGiay}
              onChange={(val) => setFormData({ ...formData, soBanGiay: val })}
            />
          </View>

          <VoiceHint text='Nói "Mục đích xin việc, cần 2 bản" để điền tự động' />
        </View>

        <View style={styles.navButtons}>
          <View style={styles.backBtnWrap}>
            <SecondaryButton
              title="Quay lại"
              onPress={() => onNavigate('lltp_additional')}
              icon="arrow-left"
            />
          </View>
          <View style={styles.nextBtnWrap}>
            <PrimaryButton
              title="Tiếp tục"
              onPress={() => onNavigate('lltp_confirm')}
              icon="arrow-right"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <MucDichModal
        visible={showMucDichModal}
        onClose={() => setShowMucDichModal(false)}
        selected={formData.mucDich}
        onSelect={(val) => setFormData({ ...formData, mucDich: val })}
      />
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
  fieldGroup: {
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.primary,
  },
  radioRow: {
    flexDirection: 'row',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '70%',
    paddingBottom: SPACING.xxxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONTS.semibold,
    color: COLORS.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalOptionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  modalOptionTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.semibold,
  },
  modalCheckWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LLTPPurposeScreen;
