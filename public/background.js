const SETTINGS_KEY = 'zentab_settings';
const UPDATE_STATUS_KEY = 'zentab_update_status';
const UPDATE_ALARM_NAME = 'zentab_update_check';
const UPDATE_ALARM_PERIOD_MINUTES = 360;

const getSettings = async () => {
  const result = await chrome.storage.local.get([SETTINGS_KEY]);
  return {
    autoApplyUpdates: true,
    ...(result[SETTINGS_KEY] || {})
  };
};

const setUpdateStatus = async (status) => {
  await chrome.storage.local.set({
    [UPDATE_STATUS_KEY]: {
      checkedAt: Date.now(),
      ...status
    }
  });
};

const configureUpdateAlarm = async () => {
  const settings = await getSettings();

  if (settings.autoApplyUpdates) {
    await chrome.alarms.create(UPDATE_ALARM_NAME, {
      delayInMinutes: 1,
      periodInMinutes: UPDATE_ALARM_PERIOD_MINUTES
    });
    return;
  }

  await chrome.alarms.clear(UPDATE_ALARM_NAME);
};

const applyUpdateIfAllowed = async (details = {}) => {
  const settings = await getSettings();

  await setUpdateStatus({
    state: 'update_available',
    version: details.version,
    message: settings.autoApplyUpdates
      ? 'Update available; reloading extension.'
      : 'Update available; auto-apply is disabled.'
  });

  if (settings.autoApplyUpdates) {
    chrome.runtime.reload();
  }
};

const checkForUpdates = async () => {
  const settings = await getSettings();
  if (!settings.autoApplyUpdates) {
    await setUpdateStatus({
      state: 'idle',
      message: 'Auto-apply updates is disabled.'
    });
    return;
  }

  await setUpdateStatus({ state: 'checking' });

  chrome.runtime.requestUpdateCheck(async (status, details) => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      await setUpdateStatus({
        state: 'error',
        message: lastError.message
      });
      return;
    }

    if (status === 'update_available') {
      await applyUpdateIfAllowed(details);
      return;
    }

    await setUpdateStatus({
      state: status,
      message: status === 'throttled'
        ? 'Chrome throttled update checks; it will retry later.'
        : 'No update available.'
    });
  });
};

chrome.runtime.onInstalled.addListener(() => {
  configureUpdateAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  configureUpdateAlarm();
});

chrome.runtime.onUpdateAvailable.addListener((details) => {
  applyUpdateIfAllowed(details);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    checkForUpdates();
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[SETTINGS_KEY]) {
    configureUpdateAlarm();
  }
});

configureUpdateAlarm();
