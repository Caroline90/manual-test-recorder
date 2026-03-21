const stepsList = document.getElementById('steps-list');
const xrayTableBody = document.getElementById('xray-table-body');
const xrayMetadata = document.getElementById('xray-metadata');
const stepCount = document.getElementById('step-count');
const clearButton = document.getElementById('clear-recording');
const recordingStatus = document.getElementById('recording-status');
const recordingStatusTitle = document.getElementById('recording-status-title');
const recordingStatusDetail = document.getElementById('recording-status-detail');
const xrayTicketInput = document.getElementById('xray-ticket');
const exportCsvLink = document.getElementById('export-csv');
const exportEvidenceLink = document.getElementById('export-evidence');
const recordedGroupSnapshots = new WeakMap();

function selectorFor(element) {
    if (element.id) {
        return `#${element.id}`;
    }
    if (element.name) {
        return `[name='${element.name}']`;
    }
    return element.tagName.toLowerCase();
}

function normalizeTicket(rawValue) {
    return (rawValue || '').trim().toUpperCase();
}

function currentTicket() {
    return normalizeTicket(xrayTicketInput?.value);
}

async function sendEvent(payload) {
    await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    await refreshView();
}

function labelFor(element) {
    const fieldLabel = element.closest('label')?.childNodes?.[0]?.textContent?.trim();
    return fieldLabel || element.innerText?.trim() || element.value?.trim() || element.placeholder || element.name || element.tagName.toLowerCase();
}

function eventTypeFor(element) {
    if (element.dataset.record) {
        return element.dataset.record;
    }
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'textarea' || tagName === 'select') {
        return 'input';
    }
    if (tagName === 'input') {
        const type = (element.getAttribute('type') || 'text').toLowerCase();
        return ['checkbox', 'radio', 'range'].includes(type) ? 'change' : 'input';
    }
    return 'click';
}

function buildPayload(element, type) {
    return {
        type,
        text: labelFor(element),
        value: Object.prototype.hasOwnProperty.call(element, 'value') ? element.value || null : null,
        id: null,
        name: element.name || null,
        url: window.location.href,
        selector: selectorFor(element),
        pageTitle: document.title,
        xrayTicket: currentTicket() || null,
        screenshot: null
    };
}

function recordableFields(container) {
    return Array.from(container.querySelectorAll('input, textarea, select'))
        .filter((field) => !field.disabled && !field.dataset.skipRecording);
}

function groupLabelFor(group) {
    return group.dataset.recordGroupLabel
        || group.querySelector('h3, h2, legend')?.textContent?.trim()
        || 'Grouped input';
}

function groupSnapshotValue(group) {
    return recordableFields(group)
        .map((field) => {
            const label = labelFor(field);
            const value = Object.prototype.hasOwnProperty.call(field, 'value') ? field.value || '' : '';
            return `${label}: ${value}`;
        })
        .filter((entry) => !entry.endsWith(': '))
        .join('\n');
}

function groupedPayloadFor(group) {
    return {
        type: 'input',
        text: groupLabelFor(group),
        value: groupSnapshotValue(group) || null,
        id: group.id || null,
        name: group.dataset.recordGroup || null,
        url: window.location.href,
        selector: selectorFor(group),
        pageTitle: document.title,
        xrayTicket: currentTicket() || null,
        screenshot: null
    };
}

async function maybeRecordGroupedInputs(element) {
    const group = element.closest('[data-record-group]');
    if (!group) {
        return;
    }

    const snapshot = groupSnapshotValue(group);
    if (!snapshot || recordedGroupSnapshots.get(group) === snapshot) {
        return;
    }

    recordedGroupSnapshots.set(group, snapshot);
    await sendEvent(groupedPayloadFor(group));
}

function screenshotMarkup(step) {
    if (!step.screenshot) {
        return '<em class="screenshot-empty">Screenshot available when the Chrome extension records the step.</em>';
    }

    return `
        <a class="screenshot-link" href="${step.screenshot}" target="_blank" rel="noreferrer">
            <img src="${step.screenshot}" alt="Screenshot for step ${step.index}">
        </a>
    `;
}

function setRecordingState(steps) {
    const lastStep = steps.at(-1);
    const isRecording = steps.length > 0;

    recordingStatus.dataset.state = isRecording ? 'active' : 'idle';
    recordingStatusTitle.textContent = isRecording ? 'Recording started' : 'Recorder idle';
    recordingStatusDetail.textContent = isRecording
        ? `Last captured target: ${lastStep.target}`
        : 'Recording starts automatically when you interact with a tracked element.';
}

function clearSelectionHighlights() {
    document.querySelectorAll('.recorded-selection, .latest-selection').forEach((element) => {
        element.classList.remove('recorded-selection', 'latest-selection');
    });
}

function highlightElement(element, isLatest) {
    element.classList.add('recorded-selection');
    if (isLatest) {
        element.classList.add('latest-selection');
    }
}

function applySelectionHighlights(steps) {
    clearSelectionHighlights();

    steps.forEach((step, index) => {
        if (!step.target) {
            return;
        }

        try {
            const matchedElements = document.querySelectorAll(step.target);
            matchedElements.forEach((element) => highlightElement(element, index === steps.length - 1));
        } catch (error) {
            // Ignore selectors that are not valid for querySelectorAll.
        }
    });
}

function updateExportLinks() {
    const ticket = currentTicket();
    exportCsvLink.dataset.ticket = ticket;
    exportEvidenceLink.dataset.ticket = ticket;
}

async function refreshView() {
    const [stepsResponse, xrayResponse] = await Promise.all([
        fetch('/api/steps'),
        fetch('/api/xray')
    ]);

    const steps = await stepsResponse.json();
    const xray = await xrayResponse.json();
    if (xrayTicketInput && !currentTicket() && xray.xrayTicket) {
        xrayTicketInput.value = xray.xrayTicket;
    }

    stepCount.textContent = `${steps.length} step${steps.length === 1 ? '' : 's'}`;
    stepsList.innerHTML = steps.map((step) => `
        <li>
            <strong>${step.action}</strong>
            <span>${step.target}</span>
            <p>${step.detail}</p>
            <small>${step.expectedResult}</small>
            <div class="step-screenshot">${screenshotMarkup(step)}</div>
        </li>
    `).join('');

    xrayMetadata.innerHTML = `
        <div><span>Summary</span><strong>${xray.summary}</strong></div>
        <div><span>Objective</span><strong>${xray.objective}</strong></div>
        <div><span>Precondition</span><strong>${xray.precondition}</strong></div>
        <div><span>XRAY ticket</span><strong>${xray.xrayTicket || 'Not set'}</strong></div>
    `;

    xrayTableBody.innerHTML = xray.steps.map((step) => `
        <tr>
            <td>${step.index}</td>
            <td>${step.action}</td>
            <td>${step.target}</td>
            <td>${step.detail}</td>
            <td>${step.expectedResult}</td>
            <td>${screenshotMarkup(step)}</td>
        </tr>
    `).join('');

    setRecordingState(steps);
    applySelectionHighlights(steps);
    updateExportLinks();
}

function bindRecorder(element) {
    if (element.dataset.recorderBound === 'true') {
        return;
    }

    const eventType = eventTypeFor(element);
    const handlerType = eventType === 'click' || eventType === 'assert' ? 'click' : 'change';
    element.addEventListener(handlerType, async (event) => {
        if (eventType === 'click' && element.tagName.toLowerCase() === 'a') {
            event.preventDefault();
        }
        await sendEvent(buildPayload(element, eventType));
        if (eventType === 'input' || eventType === 'change') {
            await maybeRecordGroupedInputs(element);
        }
    });
    element.dataset.recorderBound = 'true';
}

function attachRecorder() {
    const selectors = [
        '.sample-panel input:not([data-skip-recording])',
        '.sample-panel textarea:not([data-skip-recording])',
        '.sample-panel select:not([data-skip-recording])',
        '.sample-panel [data-record]'
    ];
    const uniqueElements = new Set(document.querySelectorAll(selectors.join(',')));
    uniqueElements.forEach((element) => bindRecorder(element));
}

clearButton.addEventListener('click', async () => {
    await fetch('/api/events', { method: 'DELETE' });
    await refreshView();
});

xrayTicketInput?.addEventListener('change', updateExportLinks);

attachRecorder();
refreshView();
