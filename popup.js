const backendInput = document.getElementById('backend-url');
const toggleButton = document.getElementById('toggle-picker');
const clearButton = document.getElementById('clear-steps');
const statusElement = document.getElementById('status');
const stepCount = document.getElementById('step-count');
const stepsList = document.getElementById('steps-list');

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(state, tabId) {
  backendInput.value = state.backendUrl;
  const pickerEnabled = !!state.pickerEnabledTabs?.[tabId];
  toggleButton.textContent = pickerEnabled ? 'Stop picker' : 'Start picker';
  statusElement.textContent = state.lastError || (pickerEnabled
    ? 'Picker is active. Hover to inspect, then click any element to open the in-page recorder panel.'
    : state.lastRecordedAt
      ? `Last recorded at ${new Date(state.lastRecordedAt).toLocaleTimeString()}`
      : 'Ready to capture a UI step.');

  stepCount.textContent = `${state.steps.length}`;
  stepsList.innerHTML = state.steps.map((step) => `
    <li>
      <strong>${step.text || step.selector}</strong>
      <span>${step.locatorStrategy ? `${step.locatorStrategy}: ` : ''}${step.recommendedLocator || step.selector}</span>
    </li>
  `).join('');
}

async function refresh() {
  const tab = await getActiveTab();
  const state = await chrome.runtime.sendMessage({ type: 'get-state' });
  render(state, tab?.id);
}

backendInput.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({
    type: 'update-backend-url',
    backendUrl: backendInput.value.trim()
  });
  await refresh();
});

toggleButton.addEventListener('click', async () => {
  const tab = await getActiveTab();
  await chrome.runtime.sendMessage({ type: 'toggle-picker', tabId: tab.id });
  await refresh();
});

clearButton.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clear-steps' });
  await refresh();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'state-updated') {
    refresh();
  }
});

refresh();
