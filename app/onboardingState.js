import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

// Android firstInstallTime stays the same across updates, but changes after a
// reinstall, even if Google restores AsyncStorage from an earlier installation.
export async function getOnboardingState() {
  const installed = await Application.getInstallationTimeAsync();
  const key = `wt_onboarding_completed:${installed.getTime()}`;
  return { key, completed: (await AsyncStorage.getItem(key)) === '1' };
}

export async function completeOnboarding(key) {
  await AsyncStorage.setItem(key, '1');
}
