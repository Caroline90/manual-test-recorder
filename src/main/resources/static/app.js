const stepsList = document.getElementById('steps-list');
const xrayTableBody = document.getElementById('xray-table-body');
const xrayMetadata = document.getElementById('xray-metadata');
const stepCount = document.getElementById('step-count');
const clearButton = document.getElementById('clear-recording');

function selectorFor(element) {
    if (element.id) {
        return `#${element.id}`;
    }
    if (element.name) {
        return `[name='${element.name}']`;
    }
    return element.tagName.toLowerCase();
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
    return element.innerText?.trim() || element.value?.trim() || element.placeholder || element.name || element.id || element.tagName.toLowerCase();
}

function buildPayload(element, type) {
    return {
        type,
        text: labelFor(element),
        value: element.value || null,
        id: element.id || null,
        name: element.name || null,
        url: window.location.href,
        selector: selectorFor(element),
        pageTitle: document.title
    };
}

async function refreshView() {
    const [stepsResponse, xrayResponse] = await Promise.all([
        fetch('/api/steps'),
        fetch('/api/xray')
    ]);

    const steps = await stepsResponse.json();
    const xray = await xrayResponse.json();

    stepCount.textContent = `${steps.length} step${steps.length === 1 ? '' : 's'}`;
    stepsList.innerHTML = steps.map((step) => `
        <li>
            <strong>${step.action}</strong>
            <span>${step.target}</span>
            <p>${step.detail}</p>
            <small>${step.expectedResult}</small>
        </li>
    `).join('');

    xrayMetadata.innerHTML = `
        <div><span>Summary</span><strong>${xray.summary}</strong></div>
        <div><span>Objective</span><strong>${xray.objective}</strong></div>
        <div><span>Precondition</span><strong>${xray.precondition}</strong></div>
    `;

    xrayTableBody.innerHTML = xray.steps.map((step) => `
        <tr>
            <td>${step.index}</td>
            <td>${step.action}</td>
            <td>${step.target}</td>
            <td>${step.detail}</td>
            <td>${step.expectedResult}</td>
        </tr>
    `).join('');
}

function attachRecorder() {
    document.querySelectorAll('[data-record]').forEach((element) => {
        const eventType = element.dataset.record;
        const handlerType = eventType === 'input' ? 'change' : 'click';
        element.addEventListener(handlerType, async (event) => {
            if (eventType === 'click' && element.tagName.toLowerCase() === 'a') {
                event.preventDefault();
            }
            await sendEvent(buildPayload(element, eventType));
        });
    });
}

clearButton.addEventListener('click', async () => {
    await fetch('/api/events', { method: 'DELETE' });
    await refreshView();
});

attachRecorder();
refreshView();
