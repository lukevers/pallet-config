import type { SavedConfig } from '../types';

const STORAGE_KEY = 'pallet-config:v1';

export type ConfigStore = {
  configs: Array<SavedConfig>;
  activeId: string | null;
};

export function loadStore(): ConfigStore | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as ConfigStore).configs)
    ) {
      return null;
    }
    return parsed as ConfigStore;
  } catch {
    return null;
  }
}

export function saveStore(store: ConfigStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / private-mode failures
  }
}
