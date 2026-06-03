export const STORAGE_KEYS = {
  settings: 'zentab_settings',
  tasks: 'zentab_tasks',
  quickLinks: 'zentab_links',
  manualGroups: 'zentab_manual_groups',
  readLater: 'zentab_read_later',
  searchHistory: 'zentab_search_history'
} as const;

const hasChromeStorage = () =>
  typeof chrome !== 'undefined' &&
  chrome.storage !== undefined &&
  chrome.storage.local !== undefined;

const readLegacyLocalStorage = <T,>(key: string): T | undefined => {
  const saved = localStorage.getItem(key);
  if (!saved) return undefined;

  try {
    return JSON.parse(saved) as T;
  } catch (error) {
    console.error(`Failed to parse localStorage key "${key}"`, error);
    return undefined;
  }
};

const writeLegacyLocalStorage = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getChromeStorageValue = <T,>(key: string): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(error);
        return;
      }

      resolve(result[key] as T | undefined);
    });
  });

const setChromeStorageValue = <T,>(key: string, value: T): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime?.lastError;
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

export const getStoredValue = async <T,>(key: string, fallback: T): Promise<T> => {
  if (hasChromeStorage()) {
    try {
      const chromeValue = await getChromeStorageValue<T>(key);
      if (chromeValue !== undefined) return chromeValue;

      const legacyValue = readLegacyLocalStorage<T>(key);
      if (legacyValue !== undefined) {
        await setChromeStorageValue(key, legacyValue);
        return legacyValue;
      }
    } catch (error) {
      console.error(`Failed to read chrome.storage.local key "${key}"`, error);
    }
  }

  return readLegacyLocalStorage<T>(key) ?? fallback;
};

export const setStoredValue = async <T,>(key: string, value: T): Promise<void> => {
  writeLegacyLocalStorage(key, value);

  if (!hasChromeStorage()) return;

  try {
    await setChromeStorageValue(key, value);
  } catch (error) {
    console.error(`Failed to write chrome.storage.local key "${key}"`, error);
  }
};
