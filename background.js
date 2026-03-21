const STORAGE_KEY = 'manualTestRecorderState';
const DEFAULT_STATE = {
  backendUrl: 'http://localhost:8080/api/events',
  steps: [],
  pickerEnabledTabs: {},
  lastError: null,
  lastRecordedAt: null
};

async function getState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return {
    ...DEFAULT_STATE,
    ...(stored[STORAGE_KEY] || {})
  };
}

async function saveState(nextState) {
  await chrome.storage.local.set({ [STORAGE_KEY]: nextState });
  return nextState;
}

async function updateState(mutator) {
  const currentState = await getState();
  const nextState = await mutator(currentState);
  return saveState(nextState);
}

function extensionOrigin() {
  return chrome.runtime.getURL('').replace(/\/$/, '');
}

async function broadcastState() {
  const state = await getState();
  await chrome.runtime.sendMessage({ type: 'state-updated', payload: state }).catch(() => undefined);
}

async function setPickerEnabled(tabId, enabled) {
  const nextState = await updateState((state) => ({
    ...state,
    pickerEnabledTabs: {
      ...state.pickerEnabledTabs,
      [tabId]: enabled
    }
  }));

  await chrome.tabs.sendMessage(tabId, {
    type: enabled ? 'picker-start' : 'picker-stop'
  }).catch(() => undefined);

  await broadcastState();
  return nextState;
}

async function appendRecordedStep(step) {
  const nextState = await updateState((state) => ({
    ...state,
    steps: [step, ...state.steps].slice(0, 50),
    lastRecordedAt: step.recordedAt,
    lastError: null
  }));
  await broadcastState();
  return nextState;
}

async function setError(message) {
  const nextState = await updateState((state) => ({
    ...state,
    lastError: message
  }));
  await broadcastState();
  return nextState;
}

async function postStepToBackend(step) {
  const state = await getState();
  const response = await fetch(state.backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Manual-Test-Recorder-Origin': extensionOrigin()
    },
    body: JSON.stringify(step)
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }
}

async function captureStepScreenshot(windowId) {
  try {
    return await chrome.tabs.captureVisibleTab(windowId, {
      format: 'png'
    });
  } catch (error) {
    return null;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await saveState(DEFAULT_STATE);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await updateState((state) => {
    const pickerEnabledTabs = { ...state.pickerEnabledTabs };
    delete pickerEnabledTabs[tabId];
    return {
      ...state,
      pickerEnabledTabs
    };
  });
  await broadcastState();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === 'get-state') {
      const state = await getState();
      sendResponse({
        ...state,
        activeTabId: sender.tab?.id || null
      });
      return;
    }

    if (message.type === 'toggle-picker') {
      const tabId = message.tabId;
      if (typeof tabId !== 'number') {
        throw new Error('A tabId is required to toggle the picker.');
      }

      const state = await getState();
      const enabled = !state.pickerEnabledTabs[tabId];
      await setPickerEnabled(tabId, enabled);
      sendResponse({ enabled });
      return;
    }

    if (message.type === 'clear-steps') {
      await updateState((state) => ({
        ...state,
        steps: [],
        lastError: null,
        lastRecordedAt: null
      }));
      await broadcastState();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'update-backend-url') {
      await updateState((state) => ({
        ...state,
        backendUrl: message.backendUrl || DEFAULT_STATE.backendUrl
      }));
      await broadcastState();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'picker-ui-disabled') {
      if (typeof sender.tab?.id === 'number') {
        await setPickerEnabled(sender.tab.id, false);
      }
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'record-step') {
      const windowId = sender.tab?.windowId;
      const screenshot = typeof windowId === 'number'
        ? await captureStepScreenshot(windowId)
        : null;
      const step = {
        ...message.payload,
        type: message.payload?.type || 'pick',
        screenshot,
        recordedAt: new Date().toISOString()
      };
      await appendRecordedStep(step);
      try {
        await postStepToBackend(step);
      } catch (error) {
        await setError(`Saved in extension only: ${error.message}`);
      }
      sendResponse({ ok: true });
      return;
    }

    throw new Error(`Unsupported message type: ${message.type}`);
  })().catch(async (error) => {
    await setError(error.message);
    sendResponse({ ok: false, error: error.message });
  });

  return true;
});
