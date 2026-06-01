const UPDATE_STATUS_KEY = 'zentab_update_status';
const UPDATE_ALARM_NAME = 'zentab_update_check';
const UPDATE_ALARM_PERIOD_MINUTES = 360;

const setUpdateStatus = async (status) => {
  await chrome.storage.local.set({
    [UPDATE_STATUS_KEY]: {
      checkedAt: Date.now(),
      ...status
    }
  });
};

const configureUpdateAlarm = async () => {
  await chrome.alarms.create(UPDATE_ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: UPDATE_ALARM_PERIOD_MINUTES
  });
};

const checkForUpdates = async () => {
  await setUpdateStatus({ state: 'checking' });

  return new Promise((resolve) => {
    chrome.runtime.requestUpdateCheck(async (status, details) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        await setUpdateStatus({
          state: 'error',
          message: lastError.message
        });
        resolve();
        return;
      }

      if (status === 'update_available') {
        await setUpdateStatus({
          state: 'update_available',
          version: details.version,
          message: 'Update available.'
        });
        resolve();
        return;
      }

      await setUpdateStatus({
        state: status,
        message: status === 'throttled'
          ? 'Chrome throttled update checks; it will retry later.'
          : 'No update available.'
      });
      resolve();
    });
  });
};

const getUpdateStatus = async () => {
  const result = await chrome.storage.local.get([UPDATE_STATUS_KEY]);
  return result[UPDATE_STATUS_KEY] || { state: 'idle' };
};

chrome.runtime.onInstalled.addListener(() => {
  configureUpdateAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  configureUpdateAlarm();
});

chrome.runtime.onUpdateAvailable.addListener((details) => {
  setUpdateStatus({
    state: 'update_available',
    version: details.version,
    message: 'Update downloaded and ready to apply.'
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    checkForUpdates();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'zentab_check_update') {
    checkForUpdates()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  if (message?.type === 'zentab_apply_update') {
    getUpdateStatus()
      .then((status) => {
        if (status.state !== 'update_available') {
          sendResponse({ ok: false, message: 'No update is ready to apply.' });
          return;
        }

        sendResponse({ ok: true });
        chrome.runtime.reload();
      })
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }

  if (message?.type === 'zentab_get_update_status') {
    getUpdateStatus()
      .then((status) => sendResponse({ ok: true, status }))
      .catch((error) => sendResponse({ ok: false, message: error.message }));
    return true;
  }
});

configureUpdateAlarm();
