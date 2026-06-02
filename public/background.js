const UPDATE_STATUS_KEY = 'zentab_update_status';

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

  if (['idle', 'update_available', 'error'].includes(status.state)) {
    return status;
  }

  const idleStatus = { state: 'idle' };
  await chrome.storage.local.set({ [UPDATE_STATUS_KEY]: idleStatus });
  return idleStatus;
};

chrome.runtime.onUpdateAvailable.addListener((details) => {
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
