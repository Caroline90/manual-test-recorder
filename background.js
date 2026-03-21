const STORAGE_KEY = 'manualTestRecorderState';
const DEFAULT_PORT = '8090';
const DEFAULT_EVENT_PATH = '/api/events';
const DEFAULT_STATE = {
  backendUrl: `http://localhost:${DEFAULT_PORT}${DEFAULT_EVENT_PATH}`,
  xrayTicket: '',
  steps: [],
  pickerEnabledTabs: {},
  lastError: null,
  lastRecordedAt: null
};

function normalizeBackendUrl(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) {
    return DEFAULT_STATE.backendUrl;
  }

  const isPortOnly = /^\d+$/.test(value);
  const candidate = isPortOnly
    ? `http://localhost:${value}`
    : /^[a-z]+:\/\//i.test(value)
      ? value
      : value.includes(':') || value.startsWith('localhost') || value.startsWith('127.0.0.1')
        ? `http://${value}`
        : `http://localhost:${value}`;

  let url;
  try {
    url = new URL(candidate);
  } catch (error) {
    return DEFAULT_STATE.backendUrl;
  }

  if (!url.pathname || url.pathname === '/') {
    url.pathname = DEFAULT_EVENT_PATH;
  }

  return url.toString();
}

function normalizeTicket(rawValue) {
  return (rawValue || '').trim().toUpperCase();
}

async function getState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = {
    ...DEFAULT_STATE,
    ...(stored[STORAGE_KEY] || {})
  };

  return {
    ...state,
    backendUrl: normalizeBackendUrl(state.backendUrl),
    xrayTicket: normalizeTicket(state.xrayTicket)
  };
}

async function saveState(nextState) {
  const normalizedState = {
    ...DEFAULT_STATE,
    ...nextState,
    backendUrl: normalizeBackendUrl(nextState.backendUrl),
    xrayTicket: normalizeTicket(nextState.xrayTicket)
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: normalizedState });
  return normalizedState;
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
    steps: [...state.steps, step].slice(-50),
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

async function sendBackendRequest(method, body) {
  const state = await getState();
  const response = await fetch(state.backendUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Manual-Test-Recorder-Origin': extensionOrigin()
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }
}

async function postStepToBackend(step) {
  const state = await getState();
  await sendBackendRequest('POST', {
    ...step,
    xrayTicket: state.xrayTicket || step.xrayTicket || null
  });
}

async function clearBackendSteps() {
  await sendBackendRequest('DELETE');
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
      try {
        await clearBackendSteps();
      } catch (error) {
        throw new Error(`Unable to clear backend events: ${error.message}`);
      }

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
        backendUrl: normalizeBackendUrl(message.backendUrl)
      }));
      await broadcastState();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === 'update-xray-ticket') {
      await updateState((state) => ({
        ...state,
        xrayTicket: normalizeTicket(message.xrayTicket)
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
      const state = await getState();
      const screenshot = typeof windowId === 'number'
        ? await captureStepScreenshot(windowId)
        : null;
      const step = {
        ...message.payload,
        type: message.payload?.type || 'pick',
        xrayTicket: state.xrayTicket || message.payload?.xrayTicket || null,
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
