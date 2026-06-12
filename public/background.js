const UPDATE_STATUS_KEY = 'zentab_update_status';

const compareVersions = (versionA = '', versionB = '') => {
  const partsA = versionA.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsB = versionB.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

const getCurrentVersion = () => chrome.runtime.getManifest().version;

const setUpdateStatus = async (status) => {
  await chrome.storage.local.set({
    [UPDATE_STATUS_KEY]: {
      checkedAt: Date.now(),
      ...status
    }
  });
};

const getUpdateStatus = async () => {
  const result = await chrome.storage.local.get([UPDATE_STATUS_KEY]);
  const status = result[UPDATE_STATUS_KEY] || { state: 'idle' };
  const currentVersion = getCurrentVersion();

  if (
    status.state === 'update_available' &&
    status.version &&
    compareVersions(status.version, currentVersion) <= 0
  ) {
    const idleStatus = { state: 'idle' };
    await chrome.storage.local.set({ [UPDATE_STATUS_KEY]: idleStatus });
    return idleStatus;
  }

  if (['idle', 'update_available', 'error'].includes(status.state)) {
    return status;
  }

  const idleStatus = { state: 'idle' };
  await chrome.storage.local.set({ [UPDATE_STATUS_KEY]: idleStatus });
  return idleStatus;
};

chrome.runtime.onUpdateAvailable.addListener((details) => {
  if (compareVersions(details.version, getCurrentVersion()) <= 0) {
    setUpdateStatus({ state: 'idle' });
    return;
  }

  setUpdateStatus({
    state: 'update_available',
    version: details.version,
    message: 'Update downloaded and ready to apply.'
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
