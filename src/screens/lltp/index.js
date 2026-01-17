// LLTP Screens Index
export { LLTPIntroScreen } from './LLTPIntroScreen';
export { LLTPPersonalScreen } from './LLTPPersonalScreen';
export { LLTPAdditionalScreen } from './LLTPAdditionalScreen';
export { LLTPPurposeScreen } from './LLTPPurposeScreen';
export { LLTPConfirmScreen } from './LLTPConfirmScreen';
export { LLTPStepIndicator, SCREEN_TO_STEP } from './LLTPStepIndicator';

// Screen name constants for navigation
export const LLTP_SCREENS = {
  INTRO: 'lltp_intro',
  PERSONAL: 'lltp_personal',
  ADDITIONAL: 'lltp_additional',
  PURPOSE: 'lltp_purpose',
  CONFIRM: 'lltp_confirm',
};

// Navigation flow for next/prev
export const LLTP_FLOW = [
  'lltp_intro',
  'lltp_personal',
  'lltp_additional',
  'lltp_purpose',
  'lltp_confirm',
];

// Get next screen in flow
export const getNextScreen = (currentScreen) => {
  const index = LLTP_FLOW.indexOf(currentScreen);
  if (index >= 0 && index < LLTP_FLOW.length - 1) {
    return LLTP_FLOW[index + 1];
  }
  return null;
};

// Get previous screen in flow
export const getPrevScreen = (currentScreen) => {
  const index = LLTP_FLOW.indexOf(currentScreen);
  if (index > 0) {
    return LLTP_FLOW[index - 1];
  }
  return 'home';
};
