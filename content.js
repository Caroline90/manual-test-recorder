const PICKER_ROOT_ATTRIBUTE = 'data-manual-test-recorder-picker-root';
const STORAGE_KEY = 'manualTestRecorderState';

if (!window.__manualTestRecorderUiPickerActive) {
  window.__manualTestRecorderUiPickerActive = true;

  let pickerEnabled = false;
  let activeTabId = null;
  const hostDocument = document;
  const highlightBoxes = new WeakMap();
  const trackedDocuments = new Set();
  const observedDocuments = new WeakSet();
  const trackedFrames = new WeakSet();
  let styleElement = null;
  const pendingTextEntries = new WeakMap();
  const recordedGroupSnapshots = new WeakMap();

  const TEXTBOX_ROLES = ['textbox', 'searchbox'];
  const CHANGE_ROLES = ['combobox', 'listbox', 'option', 'textbox', 'searchbox', 'spinbutton', 'slider'];
  const CLICK_ROLES = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem'];

  function ensureStyles() {
    if (styleElement?.isConnected) {
      return;
    }

    styleElement = document.createElement('style');
    styleElement.setAttribute(PICKER_ROOT_ATTRIBUTE, 'styles');
    styleElement.textContent = `
:root{
  --mt-accent:#4f9cff;
}

.mtr-highlight-box{
  position:fixed;
  pointer-events:none;
  border:3px solid var(--mt-accent);
  background:rgba(79,156,255,.12);
  z-index:2147483646;
}
`;
    document.head.appendChild(styleElement);
  }

  function escapeCssValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function roleFor(element) {
    return (element?.getAttribute?.('role') || '').trim().toLowerCase();
  }

  function hasRole(element, roles) {
    return roles.includes(roleFor(element));
  }

  function getHighlightBox(doc) {
    let box = highlightBoxes.get(doc);
    if (box?.isConnected) {
      return box;
    }

    box = doc.createElement('div');
    box.className = 'mtr-highlight-box';
    box.setAttribute(PICKER_ROOT_ATTRIBUTE, 'highlight');
    box.style.position = 'fixed';
    box.style.pointerEvents = 'none';
    box.style.border = '3px solid var(--mt-accent, #4f9cff)';
    box.style.background = 'rgba(79, 156, 255, 0.12)';
    box.style.zIndex = '2147483646';
    (doc.body || doc.documentElement)?.appendChild(box);
    highlightBoxes.set(doc, box);
    return box;
  }

  function showHighlight(element) {
    const doc = element.ownerDocument;
    const box = getHighlightBox(doc);
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      return;
    }

    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  function hideHighlight(doc) {
    const box = highlightBoxes.get(doc);
    if (!box) {
      return;
    }
    box.style.width = '0px';
    box.style.height = '0px';
  }

  function clearAllHighlights() {
    trackedDocuments.forEach((trackedDocument) => hideHighlight(trackedDocument));
  }

  function uniqueCss(element, doc = element.ownerDocument) {
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();

      const id = current.getAttribute?.('id');
      if (id) {
        const candidate = `#${CSS.escape(id)}`;
        if (doc.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }

      const name = current.getAttribute?.('name');
      if (name) {
        const candidate = `${selector}[name="${escapeCssValue(name)}"]`;
        if (doc.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }

      const placeholder = current.getAttribute?.('placeholder');
      if (placeholder) {
        const candidate = `${selector}[placeholder="${escapeCssValue(placeholder)}"]`;
        if (doc.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }

      const dataTestId = current.getAttribute?.('data-testid');
      if (dataTestId) {
        const candidate = `[data-testid="${escapeCssValue(dataTestId)}"]`;
        if (doc.querySelectorAll(candidate).length === 1) {
          return candidate;
        }
      }

      const role = roleFor(current);
      if (role) {
        selector += `[role="${escapeCssValue(role)}"]`;
      }

      if (current.classList.length) {
        selector += `.${CSS.escape(current.classList[0])}`;
      }

      const siblings = current.parentElement
        ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
        : [];
      if (siblings.length > 1) {
        selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }

      path.unshift(selector);
      const fullSelector = path.join(' > ');
      try {
        if (doc.querySelectorAll(fullSelector).length === 1) {
          return fullSelector;
        }
      } catch (error) {
        return path.join(' > ');
      }

      current = current.parentElement;
    }

    return path.join(' > ');
  }

  function accessibleFrameElement(doc) {
    const view = doc?.defaultView;
    if (!view || view.top === view) {
      return null;
    }

    try {
      const frameElement = view.frameElement;
      if (frameElement instanceof Element) {
        return frameElement;
      }
    } catch (error) {
      // Ignore cross-origin parent access.
    }

    return null;
  }

  function frameContextPrefix(doc = document) {
    const parts = [];
    let currentDocument = doc;

    while (currentDocument) {
      const frameElement = accessibleFrameElement(currentDocument);
      if (!frameElement) {
        break;
      }

      parts.unshift(uniqueCss(frameElement, frameElement.ownerDocument));

      const frameUrl = currentDocument.defaultView?.location?.href;
      if (frameUrl) {
        parts.push(`url("${escapeCssValue(frameUrl)}")`);
      }

      currentDocument = frameElement.ownerDocument;
    }

    return parts.length ? parts.join(' | ') : null;
  }

  function selectorFor(element) {
    const elementSelector = uniqueCss(element, element.ownerDocument);
    const framePrefix = frameContextPrefix(element.ownerDocument);
    return framePrefix ? `${framePrefix} >>> ${elementSelector}` : elementSelector;
  }

  function registerChildFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement || frame instanceof HTMLFrameElement)) {
      return;
    }

    const bindFrameDocument = () => {
      let childDocument = null;
      try {
        childDocument = frame.contentDocument;
      } catch (error) {
        return;
      }

      if (childDocument) {
        registerDocument(childDocument);
      }
    };

    if (!trackedFrames.has(frame)) {
      frame.addEventListener('load', bindFrameDocument, true);
      trackedFrames.add(frame);
    }

    bindFrameDocument();
  }

  function registerNestedFrames(targetDocument) {
    if (!targetDocument || observedDocuments.has(targetDocument)) {
      return;
    }

    observedDocuments.add(targetDocument);
    targetDocument.querySelectorAll('iframe, frame').forEach((frame) => registerChildFrame(frame));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }

          if (node.matches?.('iframe, frame')) {
            registerChildFrame(node);
          }

          node.querySelectorAll?.('iframe, frame').forEach((frame) => registerChildFrame(frame));
        });
      });
    });

    observer.observe(targetDocument.documentElement || targetDocument, {
      childList: true,
      subtree: true
    });
  }

  function selectedOptionLabel(element) {
    if (element instanceof HTMLSelectElement) {
      return element.selectedOptions[0]?.text?.trim() || element.value || '';
    }

    const ariaValueText = element.getAttribute?.('aria-valuetext');
    if (ariaValueText) {
      return ariaValueText.trim();
    }

    const ariaValueNow = element.getAttribute?.('aria-valuenow');
    if (ariaValueNow) {
      return ariaValueNow.trim();
    }

    const ariaActiveDescendant = element.getAttribute?.('aria-activedescendant');
    if (ariaActiveDescendant) {
      const activeOption = element.ownerDocument.getElementById(ariaActiveDescendant);
      if (activeOption) {
        return labelFor(activeOption);
      }
    }

    return '';
  }

  function labelFor(element) {
    const ariaLabel = element.getAttribute?.('aria-label');
    const ariaLabelledBy = element.getAttribute?.('aria-labelledby');
    if (ariaLabelledBy) {
      const labelText = ariaLabelledBy
        .split(/\s+/)
        .map((id) => element.ownerDocument.getElementById(id)?.innerText?.trim())
        .filter(Boolean)
        .join(' ');
      if (labelText) {
        return labelText;
      }
    }

    const text = element.innerText?.trim();
    const selectedLabel = selectedOptionLabel(element);
    const value = typeof element.value === 'string' ? element.value.trim() : '';
    const placeholder = element.getAttribute?.('placeholder');
    return ariaLabel || text || selectedLabel || value || placeholder || element.getAttribute?.('name') || roleFor(element) || element.tagName.toLowerCase();
  }

  function textValueFor(element) {
    if (element instanceof HTMLSelectElement) {
      return element.value || selectedOptionLabel(element) || null;
    }
    if (typeof element.value === 'string') {
      return element.value;
    }
    if (element.isContentEditable) {
      return element.innerText?.trim() || element.textContent?.trim() || '';
    }
    if (hasRole(element, CHANGE_ROLES)) {
      return selectedOptionLabel(element) || element.getAttribute?.('aria-label') || element.innerText?.trim() || null;
    }
    return null;
  }

  function resolveActionType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const role = roleFor(element);

    if (tagName === 'select' || hasRole(element, ['combobox', 'listbox', 'option', 'spinbutton', 'slider'])) {
      return 'change';
    }
    if (tagName === 'textarea' || element.isContentEditable || TEXTBOX_ROLES.includes(role)) {
      return 'input';
    }
    if (tagName === 'input') {
      if (['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type)) {
        return type === 'checkbox' || type === 'radio' || type === 'range' ? 'change' : 'click';
      }
      return 'input';
    }
    if (CLICK_ROLES.includes(role)) {
      return role === 'checkbox' || role === 'radio' || role === 'switch' ? 'change' : 'click';
    }
    return 'click';
  }

  function buildPayload(element, overrides = {}) {
    const elementDocument = element.ownerDocument || document;
    return {
      type: overrides.type || resolveActionType(element),
      text: overrides.text || labelFor(element),
      value: Object.prototype.hasOwnProperty.call(overrides, 'value') ? overrides.value : textValueFor(element),
      id: null,
      name: element.getAttribute?.('name') || null,
      url: elementDocument.defaultView?.location?.href || window.location.href,
      selector: selectorFor(element),
      pageTitle: elementDocument.title || document.title,
      tagName: element.tagName.toLowerCase()
    };
  }

  function recordableFields(container) {
    return Array.from(container.querySelectorAll('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="searchbox"], [role="combobox"], [role="listbox"], [role="spinbutton"], [role="slider"]'))
      .filter((field) => !field.disabled && !field.hasAttribute('data-skip-recording'));
  }

  function groupedContainerFor(element) {
    return element?.closest?.('[data-record-group]');
  }

  function groupLabelFor(container) {
    return container?.getAttribute?.('data-record-group-label')
      || container?.querySelector?.('h1, h2, h3, legend')?.textContent?.trim()
      || 'Grouped input';
  }

  function groupSnapshotValue(container) {
    return recordableFields(container)
      .map((field) => {
        const label = labelFor(field);
        const value = textValueFor(field) || '';
        return `${label}: ${value}`;
      })
      .filter((entry) => !entry.endsWith(': '))
      .join('\n');
  }

  function maybeRecordGroupedInputs(element) {
    const container = groupedContainerFor(element);
    if (!pickerEnabled || !container) {
      return;
    }

    const snapshot = groupSnapshotValue(container);
    if (!snapshot || recordedGroupSnapshots.get(container) === snapshot) {
      return;
    }

    recordedGroupSnapshots.set(container, snapshot);
    recordInteraction(container, {
      type: 'input',
      text: groupLabelFor(container),
      value: snapshot
    });
  }

  function recordInteraction(element, overrides = {}) {
    if (!pickerEnabled || !element || element.hasAttribute(PICKER_ROOT_ATTRIBUTE)) {
      return;
    }

    showHighlight(element);
    const payload = buildPayload(element, overrides);
    chrome.runtime.sendMessage({ type: 'record-step', payload }).catch(() => undefined);
  }

  function toElement(target) {
    if (target instanceof Element) {
      return target;
    }
    return target?.parentElement || null;
  }

  function eventPathElements(event) {
    if (!event?.composedPath) {
      return [];
    }

    return event.composedPath().filter((entry) => entry instanceof Element);
  }

  const INTERACTIVE_SELECTOR = [
    'input',
    'select',
    'textarea',
    'button',
    'label',
    'option',
    'a[href]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="searchbox"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[role="option"]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="spinbutton"]',
    '[role="slider"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="grid"]',
    '[role="treegrid"]',
    '[role="gridcell"]',
    '[role="cell"]',
    '[role="columnheader"]',
    '[role="rowheader"]',
    '[role="row"]',
    '[data-record]',
    '[onclick]',
    '[tabindex]'
  ].join(',');

  const TABLE_LIKE_SELECTOR = [
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    '[role="grid"]',
    '[role="treegrid"]',
    '[role="row"]',
    '[role="gridcell"]',
    '[role="cell"]',
    '[role="columnheader"]',
    '[role="rowheader"]'
  ].join(',');

  function labelControlFor(target) {
    if (target?.tagName !== 'LABEL') {
      return null;
    }

    const htmlFor = target.getAttribute('for');
    if (htmlFor) {
      const control = target.ownerDocument.querySelector(`[id="${CSS.escape(htmlFor)}"]`);
      if (control) {
        return control;
      }
    }

    return target.control || null;
  }

  function isFocusableClickTarget(element) {
    if (!element?.hasAttribute?.('tabindex')) {
      return false;
    }

    const tabIndex = Number(element.getAttribute('tabindex'));
    return Number.isFinite(tabIndex) && tabIndex >= 0;
  }

  function fallbackClickableTarget(target) {
    if (!target) {
      return null;
    }

    return target.closest(TABLE_LIKE_SELECTOR)
      || target.closest('[data-record], [onclick], [tabindex]')
      || target;
  }

  function resolveTargetElement(target, event = null) {
    const candidates = [];
    if (target) {
      candidates.push(target);
    }
    eventPathElements(event).forEach((element) => {
      if (!candidates.includes(element)) {
        candidates.push(element);
      }
    });

    if (!candidates.length) {
      return null;
    }

    for (const candidate of candidates) {
      const control = labelControlFor(candidate);
      if (control) {
        return control;
      }

      const optionTarget = candidate.closest?.('[role="option"], option');
      if (optionTarget) {
        return optionTarget;
      }

      const interactiveTarget = candidate.closest?.(INTERACTIVE_SELECTOR);
      if (interactiveTarget) {
        return interactiveTarget;
      }
    }

    for (const candidate of candidates) {
      if (isFocusableClickTarget(candidate)) {
        return candidate;
      }
    }

    return fallbackClickableTarget(candidates[0]);
  }

  function isTextEntryElement(element) {
    if (!element) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea' || tagName === 'select' || element.isContentEditable || hasRole(element, TEXTBOX_ROLES)) {
      return true;
    }
    if (hasRole(element, ['combobox', 'listbox', 'spinbutton', 'slider'])) {
      return true;
    }
    if (tagName !== 'input') {
      return false;
    }

    const type = (element.getAttribute('type') || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type);
  }

  function shouldRecordClick(element) {
    return !isTextEntryElement(element);
  }

  function handleTextCommit(element) {
    if (!pickerEnabled || !element) {
      return;
    }

    const actionType = resolveActionType(element);
    if (!['input', 'change'].includes(actionType)) {
      return;
    }

    const nextValue = textValueFor(element) || '';
    const previousValue = pendingTextEntries.has(element) ? pendingTextEntries.get(element) || '' : null;
    if (previousValue === null || nextValue === previousValue) {
      pendingTextEntries.set(element, nextValue);
      return;
    }

    pendingTextEntries.set(element, nextValue);
    recordInteraction(element, { type: actionType, value: nextValue });
    maybeRecordGroupedInputs(element);
  }

  function registerDocument(targetDocument) {
    if (!targetDocument || trackedDocuments.has(targetDocument)) {
      return;
    }

    trackedDocuments.add(targetDocument);

    const onPointerMove = (event) => {
      if (!pickerEnabled) {
        return;
      }
      const target = toElement(event.target);
      const resolvedTarget = resolveTargetElement(target, event);
      if (!resolvedTarget) {
        return;
      }
      showHighlight(resolvedTarget);
    };

    const onLeave = () => {
      if (pickerEnabled) {
        hideHighlight(targetDocument);
      }
    };

    const onClick = (event) => {
      if (!pickerEnabled) {
        return;
      }
      const target = toElement(event.target);
      const resolvedTarget = resolveTargetElement(target, event);
      if (!resolvedTarget || !shouldRecordClick(resolvedTarget)) {
        return;
      }

      recordInteraction(resolvedTarget, { type: resolveActionType(resolvedTarget) });
    };

    const onFocusIn = (event) => {
      const target = resolveTargetElement(toElement(event.target), event);
      if (!pickerEnabled || !target || pendingTextEntries.has(target)) {
        return;
      }
      pendingTextEntries.set(target, textValueFor(target) || '');
    };

    const onInput = (event) => {
      const target = resolveTargetElement(toElement(event.target), event);
      if (!pickerEnabled || !target || !['input', 'change'].includes(resolveActionType(target))) {
        return;
      }
      showHighlight(target);
    };

    const onChange = (event) => {
      handleTextCommit(resolveTargetElement(toElement(event.target), event));
    };

    const onBlur = (event) => {
      handleTextCommit(resolveTargetElement(toElement(event.target), event));
    };

    targetDocument.addEventListener('mouseover', onPointerMove, true);
    targetDocument.addEventListener('mousemove', onPointerMove, true);
    targetDocument.addEventListener('mouseleave', onLeave, true);
    targetDocument.addEventListener('click', onClick, true);
    targetDocument.addEventListener('focusin', onFocusIn, true);
    targetDocument.addEventListener('input', onInput, true);
    targetDocument.addEventListener('change', onChange, true);
    targetDocument.addEventListener('blur', onBlur, true);

    registerNestedFrames(targetDocument);
  }

  function enablePickerUi() {
    ensureStyles();
    pickerEnabled = true;
  }

  function disablePickerUi() {
    pickerEnabled = false;
    clearAllHighlights();
  }

  async function syncPickerState() {
    try {
      const state = await chrome.runtime.sendMessage({ type: 'get-state' });
      activeTabId = state?.activeTabId ?? activeTabId;
      if (activeTabId == null) {
        return;
      }

      if (state?.pickerEnabledTabs?.[activeTabId]) {
        enablePickerUi();
      } else {
        disablePickerUi();
      }
    } catch (error) {
      disablePickerUi();
    }
  }

  ensureStyles();
  registerDocument(hostDocument);
  syncPickerState();

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STORAGE_KEY] || activeTabId == null) {
      return;
    }

    const nextState = changes[STORAGE_KEY].newValue || {};
    if (nextState.pickerEnabledTabs?.[activeTabId]) {
      enablePickerUi();
      return;
    }
    disablePickerUi();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'picker-start') {
      enablePickerUi();
      sendResponse({ ok: true });
    }

    if (message.type === 'picker-stop') {
      disablePickerUi();
      sendResponse({ ok: true });
    }
  });
}
