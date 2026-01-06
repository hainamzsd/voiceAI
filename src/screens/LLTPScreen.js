// LLTP Screen - Professional Design
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS, FONT_SIZES } from '../constants/colors';
import { MUC_DICH_OPTIONS } from '../constants/mockData';
import {
  LLTPHeader,
  FormField,
  SummaryRow,
  RadioOption,
  SelectInput,
  QuantityControl,
  AIMessageBox,
  VoiceHint,
  PrimaryButton,
  SecondaryButton,
} from '../components';

const { width } = Dimensions.get('window');

// Step Indicator Component
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Thông tin\ncá nhân' },
    { num: 2, label: 'Thông tin\nbổ sung' },
    { num: 3, label: 'Mục đích\n& Số lượng' },
    { num: 4, label: 'Xác nhận\n& Gửi' },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={step.num} style={styles.stepItemWrap}>
            <View
              style={[
                styles.stepCircle,
                currentStep >= step.num && styles.stepCircleActive,
                currentStep > step.num && styles.stepCircleCompleted,
              ]}
            >
              {currentStep > step.num ? (
                <Feather name="check" size={14} color={COLORS.textOnPrimary} />
              ) : (
                <Text
                  style={[
                    styles.stepNum,
                    currentStep >= step.num && styles.stepNumActive,
                  ]}
                >
                  {step.num}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  currentStep > step.num && styles.stepLineActive,
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.stepLabels}>
        {steps.map(step => (
          <Text
            key={step.num}
            style={[
              styles.stepLabel,
              currentStep >= step.num && styles.stepLabelActive,
            ]}
          >
            {step.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

// Intro Screen (step 0)
const IntroStep = ({ onStart, aiMessage }) => (
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

      <PrimaryButton title="Tạo mới yêu cầu" onPress={onStart} />
    </View>

    <AIMessageBox message={aiMessage} />

    <View style={styles.emptyState}>
      <Feather name="inbox" size={48} color={COLORS.border} />
      <Text style={styles.emptyTitle}>Chưa có yêu cầu</Text>
      <Text style={styles.emptyDesc}>Bắt đầu tạo yêu cầu cấp phiếu LLTP ngay</Text>
    </View>
  </ScrollView>
);

// Step 1: Personal Info
const Step1PersonalInfo = ({ user }) => (
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
);

// Step 2: Additional Info
const Step2AdditionalInfo = ({ user }) => (
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
);

// Step 3: Purpose & Quantity
const Step3Purpose = ({ formData, setFormData, onOpenMucDich }) => (
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
        onPress={onOpenMucDich}
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
);

// Step 4: Confirmation
const Step4Confirm = ({ formData, user }) => (
  <>
    <View style={styles.formCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Thông tin thủ tục</Text>
      </View>
      <SummaryRow label="Cơ quan thực hiện" value="Sở Tư pháp TP. Hà Nội" />
      <SummaryRow label="Loại phiếu" value={formData.loaiPhieu === 'so1' ? 'Phiếu số 1' : 'Phiếu số 2'} />
      <SummaryRow label="Mục đích" value={formData.mucDich || '—'} />
      <SummaryRow label="Số lượng" value={`${formData.soBanGiay} bản`} />
    </View>

    <View style={styles.formCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
      </View>
      <SummaryRow label="Họ tên" value={user.hoTen} />
      <SummaryRow label="Ngày sinh" value={user.ngaySinh} />
      <SummaryRow label="Số CCCD" value={user.cccd} />
      <SummaryRow label="Địa chỉ" value={user.thuongTru} />
    </View>

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
  </>
);

// Mục đích Selection Modal
const MucDichModal = ({ visible, onClose, selected, onSelect, speakText }) => (
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
                speakText('Đã chọn ' + opt);
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

// Main LLTP Screen
export const LLTPScreen = ({
  step,
  setStep,
  formData,
  setFormData,
  user,
  onBack,
  aiMessage,
  speakText,
}) => {
  const [showMucDichModal, setShowMucDichModal] = useState(false);

  useEffect(() => {
    if (step === 1) {
      speakText('Thông tin cá nhân đã được tự động điền từ VNeID. Vui lòng kiểm tra và tiếp tục.');
    }
  }, [step]);

  const handleSubmit = () => {
    Alert.alert(
      'Thành công!',
      'Yêu cầu của bạn đã được gửi thành công.\nKết quả sẽ được cập nhật trên VNeID trong 3-5 ngày làm việc.',
      [{ text: 'Đã hiểu', onPress: () => setStep(0) }]
    );
    speakText('Yêu cầu của bạn đã được gửi thành công!');
  };

  // Intro screen
  if (step === 0) {
    return (
      <View style={styles.screenContainer}>
        <LLTPHeader title="Lý lịch tư pháp" onBack={onBack} />
        <IntroStep onStart={() => setStep(1)} aiMessage={aiMessage} />
      </View>
    );
  }

  // Steps 1-4
  return (
    <View style={styles.screenContainer}>
      <LLTPHeader
        title="Lý lịch tư pháp"
        onBack={() => (step > 1 ? setStep(step - 1) : setStep(0))}
        showHistory={false}
      />

      <StepIndicator currentStep={step} />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AIMessageBox message={aiMessage} />

        {step === 1 && <Step1PersonalInfo user={user} />}
        {step === 2 && <Step2AdditionalInfo user={user} />}
        {step === 3 && (
          <Step3Purpose
            formData={formData}
            setFormData={setFormData}
            onOpenMucDich={() => setShowMucDichModal(true)}
          />
        )}
        {step === 4 && <Step4Confirm formData={formData} user={user} />}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          {step > 1 && (
            <View style={styles.backBtnWrap}>
              <SecondaryButton title="Quay lại" onPress={() => setStep(step - 1)} icon="arrow-left" />
            </View>
          )}
          <View style={styles.nextBtnWrap}>
            {step < 4 ? (
              <PrimaryButton title="Tiếp tục" onPress={() => setStep(step + 1)} icon="arrow-right" />
            ) : (
              <PrimaryButton title="Gửi yêu cầu" onPress={handleSubmit} variant="success" icon="send" />
            )}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <MucDichModal
        visible={showMucDichModal}
        onClose={() => setShowMucDichModal(false)}
        selected={formData.mucDich}
        onSelect={(val) => setFormData({ ...formData, mucDich: val })}
        speakText={speakText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
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

  // Step Indicator
  stepContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    ...SHADOWS.small,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  stepItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  stepNum: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
  },
  stepNumActive: {
    color: COLORS.textOnPrimary,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  stepLineActive: {
    backgroundColor: COLORS.success,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  stepLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    width: (width - SPACING.md * 2) / 4,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: FONTS.medium,
  },

  // Intro Card
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

  // Empty State
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

  // Form Card
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

  // Field Group
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

  // Fee Card
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

  // Confirm Card
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

  // Navigation Buttons
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

  // Modal
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

export default LLTPScreen;
