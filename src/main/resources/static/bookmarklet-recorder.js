(function () {
    if (window.__manualTestRecorderFallback?.toggleVisibility) {
        window.__manualTestRecorderFallback.toggleVisibility();
        return;
    }

    const SCRIPT_ORIGIN = new URL(document.currentScript?.src || window.location.href).origin;
    const DEFAULT_BACKEND_URL = `${SCRIPT_ORIGIN}/api/events`;
    const ROOT_ATTRIBUTE = 'data-manual-test-recorder-fallback-root';
    const STYLE_ID = 'manual-test-recorder-fallback-styles';
    const pendingTextEntries = new WeakMap();
    const recordedGroupSnapshots = new WeakMap();
    const highlightBoxes = new WeakMap();
    const trackedDocuments = new Set();

    const state = {
        active: false,
        backendUrl: DEFAULT_BACKEND_URL,
        xrayTicket: '',
        steps: [],
        panelVisible: true,
        screenshotStatus: 'idle',
        screenshotError: '',
        stream: null,
        video: null,
        statusMessage: 'Ready. Configure the backend if needed, then start recording.',
        listenersBound: false
    };

    const TEXTBOX_ROLES = ['textbox', 'searchbox'];
    const CHANGE_ROLES = ['combobox', 'listbox', 'option', 'textbox', 'searchbox', 'spinbutton', 'slider'];
    const CLICK_ROLES = ['button', 'link', 'checkbox', 'radio', 'switch', 'tab', 'menuitem'];

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#manual-test-recorder-fallback-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 360px;
  max-height: calc(100vh - 32px);
  overflow: auto;
  z-index: 2147483647;
  font-family: Inter, Arial, sans-serif;
  color: #111827;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
}
#manual-test-recorder-fallback-panel * { box-sizing: border-box; }
#manual-test-recorder-fallback-panel.hidden { display: none; }
#manual-test-recorder-fallback-panel .mtr-header {
  padding: 16px 18px 8px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
#manual-test-recorder-fallback-panel h1 {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
}
#manual-test-recorder-fallback-panel p,
#manual-test-recorder-fallback-panel li,
#manual-test-recorder-fallback-panel label,
#manual-test-recorder-fallback-panel small,
#manual-test-recorder-fallback-panel button,
#manual-test-recorder-fallback-panel input,
#manual-test-recorder-fallback-panel strong,
#manual-test-recorder-fallback-panel span {
  font-family: inherit;
}
#manual-test-recorder-fallback-panel .mtr-close {
  border: 0;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  color: #475569;
}
#manual-test-recorder-fallback-panel .mtr-body {
  padding: 0 18px 18px;
}
#manual-test-recorder-fallback-panel .mtr-copy {
  margin: 0 0 14px;
  font-size: 13px;
  color: #475569;
}
#manual-test-recorder-fallback-panel .mtr-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
}
#manual-test-recorder-fallback-panel .mtr-field input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
}
#manual-test-recorder-fallback-panel .mtr-field small {
  font-weight: 400;
  color: #64748b;
}
#manual-test-recorder-fallback-panel .mtr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 12px;
}
#manual-test-recorder-fallback-panel .mtr-actions button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
}
#manual-test-recorder-fallback-panel .mtr-primary {
  background: #2563eb;
  color: white;
}
#manual-test-recorder-fallback-panel .mtr-secondary {
  background: #e2e8f0;
  color: #0f172a;
}
#manual-test-recorder-fallback-panel .mtr-status {
  border-radius: 12px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 12px;
}
#manual-test-recorder-fallback-panel .mtr-status.error {
  background: #fff1f2;
  color: #be123c;
}
#manual-test-recorder-fallback-panel .mtr-meta {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  font-size: 12px;
  color: #334155;
}
#manual-test-recorder-fallback-panel .mtr-steps {
  margin: 14px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  font-size: 12px;
}
#manual-test-recorder-fallback-panel .mtr-steps li {
  color: #334155;
}
#manual-test-recorder-fallback-panel .mtr-steps strong,
#manual-test-recorder-fallback-panel .mtr-steps span,
#manual-test-recorder-fallback-panel .mtr-steps small {
  display: block;
}
#manual-test-recorder-fallback-panel .mtr-steps span,
#manual-test-recorder-fallback-panel .mtr-steps small {
  margin-top: 2px;
  color: #64748b;
  word-break: break-word;
}
.mtr-fallback-highlight {
  position: fixed;
  pointer-events: none;
  border: 3px solid #2563eb;
  background: rgba(37, 99, 235, 0.12);
  z-index: 2147483646;
}
`;
        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeBackendUrl(rawValue) {
        const value = (rawValue || '').trim();
        if (!value) {
            return DEFAULT_BACKEND_URL;
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
            return DEFAULT_BACKEND_URL;
        }

        if (!url.pathname || url.pathname === '/') {
            url.pathname = '/api/events';
        }

        return url.toString();
    }

    function normalizeTicket(rawValue) {
        return (rawValue || '').trim().toUpperCase();
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
        box.className = 'mtr-fallback-highlight';
        box.setAttribute(ROOT_ATTRIBUTE, 'highlight');
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
        if (box) {
            box.style.width = '0px';
            box.style.height = '0px';
        }
    }

    function clearAllHighlights() {
        trackedDocuments.forEach((trackedDocument) => hideHighlight(trackedDocument));
    }

    function escapeCssValue(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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

            if (current.classList?.length) {
                selector += `.${CSS.escape(current.classList[0])}`;
            }

            const siblings = current.parentElement
                ? Array.from(current.parentElement.children).filter((child) => child.tagName === current.tagName)
                : [];
            if (siblings.length > 1) {
                selector += `:nth-of-type(${siblings.indexOf(current) + 1})`;
            }

            path.unshift(selector);
            const joined = path.join(' > ');
            try {
                if (doc.querySelectorAll(joined).length === 1) {
                    return joined;
                }
            } catch (error) {
                return joined;
            }

            current = current.parentElement;
        }

        return path.join(' > ');
    }

    function frameContextPrefix() {
        if (window.top === window) {
            return null;
        }

        const parts = [];
        try {
            const frameElement = window.frameElement;
            if (frameElement instanceof Element) {
                parts.push(uniqueCss(frameElement, frameElement.ownerDocument));
            }
        } catch (error) {
            // Ignore cross-origin parent access.
        }

        if (window.location.href) {
            parts.push(`url("${escapeCssValue(window.location.href)}")`);
        }

        return parts.length ? parts.join(' | ') : 'iframe';
    }

    function selectorFor(element) {
        const elementSelector = uniqueCss(element, element.ownerDocument);
        const framePrefix = frameContextPrefix();
        return framePrefix ? `${framePrefix} >>> ${elementSelector}` : elementSelector;
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
        return {
            type: overrides.type || resolveActionType(element),
            text: overrides.text || labelFor(element),
            value: Object.prototype.hasOwnProperty.call(overrides, 'value') ? overrides.value : textValueFor(element),
            id: null,
            name: element.getAttribute?.('name') || null,
            url: window.location.href,
            selector: selectorFor(element),
            pageTitle: document.title,
            tagName: element.tagName.toLowerCase(),
            xrayTicket: state.xrayTicket || null
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

    async function maybeRecordGroupedInputs(element) {
        const container = groupedContainerFor(element);
        if (!state.active || !container) {
            return;
        }

        const snapshot = groupSnapshotValue(container);
        if (!snapshot || recordedGroupSnapshots.get(container) === snapshot) {
            return;
        }

        recordedGroupSnapshots.set(container, snapshot);
        await recordInteraction(container, {
            type: 'input',
            text: groupLabelFor(container),
            value: snapshot
        });
    }

    async function postStepToBackend(step) {
        const response = await fetch(state.backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Manual-Test-Recorder-Origin': 'bookmarklet-fallback'
            },
            body: JSON.stringify(step)
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
    }

    async function clearBackendSteps() {
        const response = await fetch(state.backendUrl, {
            method: 'DELETE',
            headers: {
                'X-Manual-Test-Recorder-Origin': 'bookmarklet-fallback'
            }
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }
    }

    async function ensureCaptureStream() {
        if (state.stream || !navigator.mediaDevices?.getDisplayMedia) {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                state.screenshotStatus = 'unavailable';
                state.screenshotError = 'This browser/page does not allow tab capture from the fallback recorder.';
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser',
                    preferCurrentTab: true
                },
                audio: false
            });

            const video = document.createElement('video');
            video.setAttribute(ROOT_ATTRIBUTE, 'video');
            video.style.position = 'fixed';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.opacity = '0';
            video.style.pointerEvents = 'none';
            video.style.left = '-9999px';
            video.style.top = '-9999px';
            video.muted = true;
            video.autoplay = true;
            video.playsInline = true;
            video.srcObject = stream;
            document.body.appendChild(video);
            await video.play();

            state.stream = stream;
            state.video = video;
            state.screenshotStatus = 'ready';
            state.screenshotError = '';

            stream.getVideoTracks().forEach((track) => {
                track.addEventListener('ended', () => {
                    state.stream = null;
                    state.video?.remove();
                    state.video = null;
                    state.screenshotStatus = 'unavailable';
                    state.screenshotError = 'Tab sharing ended. Restart recording to capture screenshots again.';
                    renderPanel();
                });
            });
        } catch (error) {
            state.screenshotStatus = 'unavailable';
            state.screenshotError = 'Screenshots were not granted. Steps will still be recorded.';
        }
    }

    async function captureStepScreenshot() {
        if (state.screenshotStatus === 'idle') {
            await ensureCaptureStream();
        }

        if (!state.video || !state.stream) {
            return null;
        }

        const width = state.video.videoWidth || window.innerWidth;
        const height = state.video.videoHeight || window.innerHeight;
        if (!width || !height) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(state.video, 0, 0, width, height);
        return canvas.toDataURL('image/png');
    }

    function updateStatus(message, isError = false) {
        state.statusMessage = message;
        state.statusIsError = isError;
        renderPanel();
    }

    async function recordInteraction(element, overrides = {}) {
        if (!state.active || !element || element.hasAttribute(ROOT_ATTRIBUTE)) {
            return;
        }

        showHighlight(element);
        const payload = buildPayload(element, overrides);
        payload.screenshot = await captureStepScreenshot();
        payload.recordedAt = new Date().toISOString();

        try {
            await postStepToBackend(payload);
            state.steps = [...state.steps, payload].slice(-10);
            updateStatus(`Recorded ${payload.type} on ${payload.text || payload.selector}.`);
        } catch (error) {
            updateStatus(`Could not send the step to ${state.backendUrl}: ${error.message}`, true);
        }
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

    async function handleTextCommit(element) {
        if (!state.active || !element) {
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
        await recordInteraction(element, { type: actionType, value: nextValue });
        await maybeRecordGroupedInputs(element);
    }

    function registerDocument(targetDocument) {
        if (!targetDocument || trackedDocuments.has(targetDocument)) {
            return;
        }

        trackedDocuments.add(targetDocument);

        targetDocument.addEventListener('mouseover', (event) => {
            if (!state.active) {
                return;
            }
            const target = resolveTargetElement(toElement(event.target), event);
            if (target) {
                showHighlight(target);
            }
        }, true);

        targetDocument.addEventListener('mousemove', (event) => {
            if (!state.active) {
                return;
            }
            const target = resolveTargetElement(toElement(event.target), event);
            if (target) {
                showHighlight(target);
            }
        }, true);

        targetDocument.addEventListener('mouseleave', () => {
            if (state.active) {
                hideHighlight(targetDocument);
            }
        }, true);

        targetDocument.addEventListener('click', async (event) => {
            if (!state.active) {
                return;
            }
            const target = resolveTargetElement(toElement(event.target), event);
            if (!target || !shouldRecordClick(target)) {
                return;
            }
            await recordInteraction(target, { type: resolveActionType(target) });
        }, true);

        targetDocument.addEventListener('focusin', (event) => {
            const target = resolveTargetElement(toElement(event.target), event);
            if (!state.active || !target || pendingTextEntries.has(target)) {
                return;
            }
            pendingTextEntries.set(target, textValueFor(target) || '');
        }, true);

        targetDocument.addEventListener('input', (event) => {
            const target = resolveTargetElement(toElement(event.target), event);
            if (!state.active || !target || !['input', 'change'].includes(resolveActionType(target))) {
                return;
            }
            showHighlight(target);
        }, true);

        targetDocument.addEventListener('change', async (event) => {
            await handleTextCommit(resolveTargetElement(toElement(event.target), event));
        }, true);

        targetDocument.addEventListener('blur', async (event) => {
            await handleTextCommit(resolveTargetElement(toElement(event.target), event));
        }, true);
    }

    function stopCaptureStream() {
        state.stream?.getTracks?.().forEach((track) => track.stop());
        state.stream = null;
        state.video?.remove();
        state.video = null;
        if (state.screenshotStatus !== 'unavailable') {
            state.screenshotStatus = 'idle';
        }
    }

    async function startRecording() {
        state.backendUrl = normalizeBackendUrl(elements.backendUrl.value);
        state.xrayTicket = normalizeTicket(elements.xrayTicket.value);
        state.active = true;
        updateStatus('Recording started. Choose your current tab if the browser asks for screen sharing.');
        await ensureCaptureStream();
        renderPanel();
    }

    function stopRecording() {
        state.active = false;
        clearAllHighlights();
        stopCaptureStream();
        updateStatus('Recording stopped. Your panel stays available so you can restart quickly.');
    }

    async function clearRecording() {
        state.backendUrl = normalizeBackendUrl(elements.backendUrl.value);
        try {
            await clearBackendSteps();
            state.steps = [];
            updateStatus('Cleared recorded steps from the backend.');
        } catch (error) {
            updateStatus(`Could not clear backend steps: ${error.message}`, true);
        }
    }

    function renderSteps() {
        if (!state.steps.length) {
            return '<li>No recorded steps yet.</li>';
        }

        return state.steps.slice().reverse().map((step) => `
            <li>
                <strong>${escapeHtml(step.type)} · ${escapeHtml(step.text || step.selector)}</strong>
                <span>${escapeHtml(step.selector)}</span>
                <small>${step.xrayTicket ? `XRAY ${escapeHtml(step.xrayTicket)}` : 'XRAY ticket not set'}</small>
            </li>
        `).join('');
    }

    let root;
    let elements;

    function renderPanel() {
        if (!root) {
            return;
        }

        root.classList.toggle('hidden', !state.panelVisible);
        if (!elements) {
            return;
        }

        elements.backendUrl.value = state.backendUrl;
        elements.xrayTicket.value = state.xrayTicket;
        elements.toggle.textContent = state.active ? 'Stop recording' : 'Start recording';
        elements.status.className = `mtr-status${state.statusIsError ? ' error' : ''}`;
        const screenshotCopy = state.screenshotStatus === 'ready'
            ? 'Screenshots: active via tab share.'
            : state.screenshotError
                ? `Screenshots: ${state.screenshotError}`
                : 'Screenshots: will be requested when recording starts.';
        elements.status.textContent = state.statusMessage;
        elements.meta.innerHTML = `
            <strong>Fallback mode</strong>
            <span>Backend: ${escapeHtml(state.backendUrl)}</span>
            <span>${escapeHtml(screenshotCopy)}</span>
            <span>Recent actions stored here: ${state.steps.length}</span>
        `;
        elements.steps.innerHTML = renderSteps();
    }

    function buildPanel() {
        ensureStyles();
        root = document.createElement('aside');
        root.id = 'manual-test-recorder-fallback-panel';
        root.setAttribute(ROOT_ATTRIBUTE, 'panel');
        root.innerHTML = `
            <div class="mtr-header">
                <div>
                    <h1>Manual Test Recorder fallback</h1>
                    <p class="mtr-copy">Use this when Chrome or Edge blocks extension installs. The page keeps the same capture flow and can also request tab screenshots.</p>
                </div>
                <button class="mtr-close" type="button" aria-label="Hide recorder">×</button>
            </div>
            <div class="mtr-body">
                <label class="mtr-field">
                    Backend endpoint or port
                    <input id="mtr-backend-url" type="text" placeholder="8090 or http://localhost:8090/api/events">
                    <small>Defaults to the backend serving this fallback script.</small>
                </label>
                <label class="mtr-field">
                    XRAY ticket
                    <input id="mtr-xray-ticket" type="text" placeholder="XRAY-123">
                    <small>Applied to every recorded step and screenshot export file name.</small>
                </label>
                <div class="mtr-actions">
                    <button id="mtr-toggle" class="mtr-primary" type="button">Start recording</button>
                    <button id="mtr-clear" class="mtr-secondary" type="button">Clear backend</button>
                    <button id="mtr-show-hide" class="mtr-secondary" type="button">Hide panel</button>
                </div>
                <div id="mtr-status" class="mtr-status"></div>
                <div id="mtr-meta" class="mtr-meta"></div>
                <ol id="mtr-steps" class="mtr-steps"></ol>
            </div>
        `;
        document.body.appendChild(root);

        elements = {
            backendUrl: root.querySelector('#mtr-backend-url'),
            xrayTicket: root.querySelector('#mtr-xray-ticket'),
            toggle: root.querySelector('#mtr-toggle'),
            clear: root.querySelector('#mtr-clear'),
            hide: root.querySelector('#mtr-show-hide'),
            close: root.querySelector('.mtr-close'),
            status: root.querySelector('#mtr-status'),
            meta: root.querySelector('#mtr-meta'),
            steps: root.querySelector('#mtr-steps')
        };

        elements.toggle.addEventListener('click', async () => {
            if (state.active) {
                stopRecording();
                return;
            }
            await startRecording();
        });

        elements.clear.addEventListener('click', clearRecording);
        elements.hide.addEventListener('click', () => {
            state.panelVisible = false;
            renderPanel();
        });
        elements.close.addEventListener('click', () => {
            state.panelVisible = false;
            renderPanel();
        });
        elements.backendUrl.addEventListener('change', () => {
            state.backendUrl = normalizeBackendUrl(elements.backendUrl.value);
            renderPanel();
        });
        elements.xrayTicket.addEventListener('change', () => {
            state.xrayTicket = normalizeTicket(elements.xrayTicket.value);
            renderPanel();
        });

        renderPanel();
    }

    registerDocument(document);
    buildPanel();

    window.__manualTestRecorderFallback = {
        toggleVisibility() {
            state.panelVisible = !state.panelVisible;
            renderPanel();
        },
        show() {
            state.panelVisible = true;
            renderPanel();
        },
        stop() {
            stopRecording();
        }
    };
})();
