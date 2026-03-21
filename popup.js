const backendInput = document.getElementById('backend-url');
const xrayTicketInput = document.getElementById('xray-ticket');
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
  xrayTicketInput.value = state.xrayTicket || '';
  const pickerEnabled = !!state.pickerEnabledTabs?.[tabId];
  toggleButton.textContent = pickerEnabled ? 'Stop recording' : 'Start recording';
  statusElement.textContent = state.lastError || (pickerEnabled
    ? 'Recording is active. Click controls or finish typing in inputs and text areas to capture actions.'
    : state.lastRecordedAt
      ? `Last recorded at ${new Date(state.lastRecordedAt).toLocaleTimeString()}`
      : 'Ready to capture clicks and text entry.');

  stepCount.textContent = `${state.steps.length}`;
  stepsList.innerHTML = state.steps.map((step) => `
    <li>
      <strong>${step.type || 'action'} · ${step.text || step.selector}</strong>
      <span>${step.selector}</span>
      <small>${step.xrayTicket ? `XRAY: ${step.xrayTicket}` : 'XRAY ticket not set'}</small>
      ${step.screenshot ? `<img src="${step.screenshot}" alt="Screenshot for ${step.text || step.selector}">` : '<em>No screenshot captured.</em>'}
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

xrayTicketInput.addEventListener('change', async () => {
  await chrome.runtime.sendMessage({
    type: 'update-xray-ticket',
    xrayTicket: xrayTicketInput.value.trim()
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
