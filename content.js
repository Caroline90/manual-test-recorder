const PICKER_ROOT_ATTRIBUTE = 'data-manual-test-recorder-picker-root';

if (!window.__manualTestRecorderUiPickerActive) {
  window.__manualTestRecorderUiPickerActive = true;

  let pickerEnabled = false;
  const hostDocument = document;
  const highlightBoxes = new WeakMap();
  const trackedDocuments = new Set();
  let styleElement = null;
  const pendingTextEntries = new WeakMap();

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

  function getHighlightBox(doc) {
    let box = highlightBoxes.get(doc);
    if (box?.isConnected) {
      return box;
    }

    box = doc.createElement('div');
    box.className = 'mtr-highlight-box';
    box.setAttribute(PICKER_ROOT_ATTRIBUTE, 'highlight');
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

  function selectorFor(element) {
    return uniqueCss(element, element.ownerDocument);
  }

  function labelFor(element) {
    const ariaLabel = element.getAttribute?.('aria-label');
    const text = element.innerText?.trim();
    const value = typeof element.value === 'string' ? element.value.trim() : '';
    const placeholder = element.getAttribute?.('placeholder');
    return ariaLabel || text || value || placeholder || element.getAttribute?.('name') || element.tagName.toLowerCase();
  }

  function textValueFor(element) {
    if (typeof element.value === 'string') {
      return element.value;
    }
    if (element.isContentEditable) {
      return element.innerText?.trim() || element.textContent?.trim() || '';
    }
    return null;
  }

  function resolveActionType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();

    if (tagName === 'select') {
      return 'change';
    }
    if (tagName === 'textarea' || element.isContentEditable) {
      return 'input';
    }
    if (tagName === 'input') {
      if (['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file'].includes(type)) {
        return 'click';
      }
      return 'input';
    }
    return 'click';
  }

  function buildPayload(element, overrides = {}) {
    return {
      type: overrides.type || resolveActionType(element),
      text: overrides.text || labelFor(element),
      value: Object.prototype.hasOwnProperty.call(overrides, 'value') ? overrides.value : textValueFor(element),
      id: null,
      name: element.getAttribute?.('name') || null,
      url: window.location.href,
      selector: selectorFor(element),
      pageTitle: document.title,
      tagName: element.tagName.toLowerCase()
    };
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

  const INTERACTIVE_SELECTOR = [
    'input',
    'select',
    'textarea',
    'button',
    'label',
    'a[href]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[role="option"]',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="spinbutton"]',
    '[role="slider"]'
  ].join(',');

  function resolveTargetElement(target) {
    if (!target) {
      return null;
    }

    if (target.tagName === 'LABEL') {
      const htmlFor = target.getAttribute('for');
      if (htmlFor) {
        const control = target.ownerDocument.querySelector(`[id="${CSS.escape(htmlFor)}"]`);
        if (control) {
          return control;
        }
      }
      if (target.control) {
        return target.control;
      }
    }

    return target.closest(INTERACTIVE_SELECTOR) || target;
  }

  function isTextEntryElement(element) {
    if (!element) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea' || tagName === 'select' || element.isContentEditable) {
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
    if (!pickerEnabled || !isTextEntryElement(element)) {
      return;
    }

    const nextValue = textValueFor(element) || '';
    const previousValue = pendingTextEntries.has(element) ? pendingTextEntries.get(element) || '' : null;
    if (previousValue === null || nextValue === previousValue) {
      pendingTextEntries.set(element, nextValue);
      return;
    }

    pendingTextEntries.set(element, nextValue);
    recordInteraction(element, { type: element.tagName.toLowerCase() === 'select' ? 'change' : 'input', value: nextValue });
  }

  function registerFrame(frameElement) {
    frameElement.addEventListener('load', () => {
      try {
        registerDocument(frameElement.contentDocument);
      } catch (error) {
        // Ignore cross-origin frames.
      }
    });

    try {
      registerDocument(frameElement.contentDocument);
    } catch (error) {
      // Ignore cross-origin frames.
    }
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
      const resolvedTarget = resolveTargetElement(target);
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
      const resolvedTarget = resolveTargetElement(target);
      if (!resolvedTarget || !shouldRecordClick(resolvedTarget)) {
        return;
      }

      recordInteraction(resolvedTarget, { type: 'click' });
    };

    const onFocusIn = (event) => {
      const target = resolveTargetElement(toElement(event.target));
      if (!pickerEnabled || !isTextEntryElement(target) || pendingTextEntries.has(target)) {
        return;
      }
      pendingTextEntries.set(target, textValueFor(target) || '');
    };

    const onInput = (event) => {
      const target = resolveTargetElement(toElement(event.target));
      if (!pickerEnabled || !isTextEntryElement(target)) {
        return;
      }
      showHighlight(target);
    };

    const onChange = (event) => {
      handleTextCommit(resolveTargetElement(toElement(event.target)));
    };

    const onBlur = (event) => {
      handleTextCommit(resolveTargetElement(toElement(event.target)));
    };

    targetDocument.addEventListener('mouseover', onPointerMove, true);
    targetDocument.addEventListener('mousemove', onPointerMove, true);
    targetDocument.addEventListener('mouseleave', onLeave, true);
    targetDocument.addEventListener('click', onClick, true);
    targetDocument.addEventListener('focusin', onFocusIn, true);
    targetDocument.addEventListener('input', onInput, true);
    targetDocument.addEventListener('change', onChange, true);
    targetDocument.addEventListener('blur', onBlur, true);

    targetDocument.querySelectorAll('iframe, frame').forEach(registerFrame);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }
          if (node.matches('iframe, frame')) {
            registerFrame(node);
          }
          node.querySelectorAll?.('iframe, frame').forEach(registerFrame);
        });
      });
    });

    observer.observe(targetDocument.documentElement, { childList: true, subtree: true });
  }

  function enablePickerUi() {
    ensureStyles();
    pickerEnabled = true;
  }

  function disablePickerUi() {
    pickerEnabled = false;
    clearAllHighlights();
  }

  ensureStyles();
  registerDocument(hostDocument);

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
