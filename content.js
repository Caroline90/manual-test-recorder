const PICKER_ATTRIBUTE = 'data-manual-test-recorder-picker';

let pickerEnabled = false;
let highlightedElement = null;
let tooltipElement = null;

function isRecorderUi(element) {
  return !!element?.closest?.(`[${PICKER_ATTRIBUTE}]`);
}

function ensureTooltip() {
  if (tooltipElement) {
    return tooltipElement;
  }

  tooltipElement = document.createElement('div');
  tooltipElement.setAttribute(PICKER_ATTRIBUTE, 'tooltip');
  Object.assign(tooltipElement.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#1f3bb3',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    boxShadow: '0 8px 24px rgba(31, 59, 179, 0.35)',
    display: 'none'
  });
  document.documentElement.appendChild(tooltipElement);
  return tooltipElement;
}

function selectorFor(element) {
  if (!element) {
    return 'unknown';
  }

  if (element.id) {
    return `#${element.id}`;
  }

  const name = element.getAttribute('name');
  if (name) {
    return `[name="${name}"]`;
  }

  const parts = [];
  let current = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 4) {
    let part = current.tagName.toLowerCase();
    const classNames = Array.from(current.classList).filter(Boolean).slice(0, 2);
    if (classNames.length > 0) {
      part += `.${classNames.join('.')}`;
    }
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
      : [];
    if (siblings.length > 1) {
      part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

function labelFor(element) {
  const ariaLabel = element.getAttribute('aria-label');
  const text = element.innerText?.trim();
  const value = element.value?.trim();
  const placeholder = element.getAttribute('placeholder');
  return ariaLabel || text || value || placeholder || element.name || element.id || element.tagName.toLowerCase();
}

function outline(element) {
  if (highlightedElement && highlightedElement !== element) {
    highlightedElement.style.outline = highlightedElement.dataset.manualTestRecorderOutline || '';
    delete highlightedElement.dataset.manualTestRecorderOutline;
  }

  highlightedElement = element;

  if (!element) {
    const tooltip = ensureTooltip();
    tooltip.style.display = 'none';
    return;
  }

  element.dataset.manualTestRecorderOutline = element.style.outline || '';
  element.style.outline = '3px solid #315efb';
  element.style.outlineOffset = '2px';

  const tooltip = ensureTooltip();
  const rect = element.getBoundingClientRect();
  tooltip.textContent = `Recording: ${selectorFor(element)}`;
  tooltip.style.left = `${Math.max(8, rect.left + 8)}px`;
  tooltip.style.top = `${Math.max(8, rect.top + 8)}px`;
  tooltip.style.display = 'block';
}

function buildPayload(element) {
  return {
    type: 'pick',
    text: labelFor(element),
    value: element.value || null,
    id: element.id || null,
    name: element.getAttribute('name') || null,
    url: window.location.href,
    selector: selectorFor(element),
    pageTitle: document.title
  };
}

function onMouseMove(event) {
  if (!pickerEnabled || isRecorderUi(event.target)) {
    return;
  }
  outline(event.target);
}

function onClick(event) {
  if (!pickerEnabled || isRecorderUi(event.target)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const payload = buildPayload(event.target);
  chrome.runtime.sendMessage({ type: 'record-step', payload });
}

function startPicker() {
  pickerEnabled = true;
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.documentElement.style.cursor = 'crosshair';
}

function stopPicker() {
  pickerEnabled = false;
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onClick, true);
  document.documentElement.style.cursor = '';
  outline(null);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'picker-start') {
    startPicker();
    sendResponse({ ok: true });
  }

  if (message.type === 'picker-stop') {
    stopPicker();
    sendResponse({ ok: true });
  }
});
