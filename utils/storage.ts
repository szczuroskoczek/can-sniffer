import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'can_sniffer_settings';

export interface Server {
  id: string;
  url: string;
}

export interface SettingsState {
  servers: Server[];
  selectedServerId: string | null;
  ready: boolean;
}

export const defaultState: SettingsState = {
  servers: [],
  selectedServerId: null,
  ready: false,
};

export const loadSettings = async (): Promise<SettingsState> => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, ready: true };
    }
    return { ...defaultState, ready: true };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { ...defaultState, ready: true };
  }
};

export const saveSettings = async (state: SettingsState): Promise<void> => {
  try {
    const { ready, ...stateToSave } = state;
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};
