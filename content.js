const PICKER_ROOT_ATTRIBUTE = 'data-manual-test-recorder-picker-root';
const PICKER_UI_ATTRIBUTE = 'data-manual-test-recorder-picker-ui';
const PICKER_MAX_TREE_NODES = 1500;

if (!window.__manualTestRecorderUiPickerActive) {
  window.__manualTestRecorderUiPickerActive = true;

  let pickerEnabled = false;
  const hostDocument = document;
  const highlightBoxes = new WeakMap();
  const trackedDocuments = new Set();
  let pickerPanel = null;
  let pickerToggleButton = null;
  let styleElement = null;

  function ensureStyles() {
    if (styleElement?.isConnected) {
      return;
    }

    styleElement = document.createElement('style');
    styleElement.setAttribute(PICKER_ROOT_ATTRIBUTE, 'styles');
    styleElement.textContent = `
:root{
  --mt-bg:#1e1e1e;
  --mt-panel:#252526;
  --mt-border:#3c3c3c;
  --mt-accent:#4f9cff;
  --mt-text:#e6e6e6;
  --mt-muted:#b9bfd0;
}

#manual-test-recorder-toggle{
  position:fixed;
  right:20px;
  bottom:20px;
  z-index:2147483647;
  border:none;
  border-radius:999px;
  padding:12px 18px;
  background:var(--mt-accent);
  color:#fff;
  font:600 14px/1.2 Arial,sans-serif;
  cursor:pointer;
  box-shadow:0 10px 24px rgba(0,0,0,0.35);
}

#manual-test-recorder-toggle[data-state="idle"]{
  background:#27408f;
}

#manual-test-recorder-panel{
  position:fixed;
  top:30px;
  right:30px;
  width:520px;
  height:520px;
  display:flex;
  flex-direction:column;
  resize:both;
  overflow:hidden;
  background:var(--mt-panel);
  border:1px solid var(--mt-border);
  border-radius:12px;
  color:var(--mt-text);
  font-family:Arial,sans-serif;
  z-index:2147483647;
  box-shadow:0 20px 40px rgba(0,0,0,0.55);
}

#manual-test-recorder-panel *{
  box-sizing:border-box;
}

.mtr-picker-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  background:#2d2d2d;
  border-bottom:1px solid var(--mt-border);
  cursor:grab;
  user-select:none;
  flex-shrink:0;
}

.mtr-picker-title{
  font-size:15px;
  font-weight:700;
}

.mtr-picker-subtitle{
  font-size:12px;
  color:var(--mt-muted);
  margin-top:2px;
}

.mtr-picker-close{
  border:none;
  background:transparent;
  color:var(--mt-text);
  cursor:pointer;
  font-size:20px;
  line-height:1;
}

.mtr-picker-tabs{
  display:flex;
  border-bottom:1px solid var(--mt-border);
  flex-shrink:0;
}

.mtr-picker-tab{
  flex:1;
  padding:10px;
  text-align:center;
  cursor:pointer;
  font-size:13px;
  font-weight:600;
}

.mtr-picker-tab:hover{
  background:#2d2d2d;
}

.mtr-picker-tab.active{
  background:var(--mt-accent);
  color:#fff;
}

.mtr-picker-content{
  display:none;
  flex:1;
  overflow:hidden;
  min-height:0;
  padding:14px;
}

.mtr-picker-content.active{
  display:block;
}

.mtr-section{
  margin-bottom:14px;
}

.mtr-label{
  display:block;
  margin-bottom:5px;
  font-size:12px;
  font-weight:700;
  color:var(--mt-muted);
}

.mtr-field,
.mtr-picker-select{
  width:100%;
  border:1px solid #444;
  border-radius:6px;
  background:#1b1b1b;
  color:#d4d4d4;
  padding:10px;
  font:14px/1.5 Consolas,monospace;
}

textarea.mtr-field{
  min-height:76px;
  resize:vertical;
}

.mtr-picker-select{
  cursor:pointer;
}

.mtr-tree{
  height:100%;
  overflow:auto;
  background:#1b1b1b;
  border-radius:6px;
  padding:10px;
  font:13px/1.6 Consolas,monospace;
  white-space:nowrap;
  scrollbar-gutter:stable both-edges;
}

.mtr-tree-node{
  white-space:nowrap;
}

.mtr-tree-node:hover{
  background:#2d2d2d;
}

.mtr-tree-selected{
  background:#264f78;
  border-left:4px solid var(--mt-accent);
  padding-left:6px;
  border-radius:4px;
  font-weight:700;
}

.mtr-tree-selected::before{
  content:"▶";
  color:var(--mt-accent);
  margin-right:6px;
}

.mtr-tree-selected .mtr-tree-tag{
  color:#fff;
}

.mtr-tree-toggle{
  cursor:pointer;
  user-select:none;
}

.mtr-tree-tag{
  color:#569CD6;
  font-weight:600;
}

.mtr-tree-attr{
  color:#CE9178;
}

.mtr-tree-children{
  display:none;
  margin-left:16px;
}

.mtr-tree-children.expanded{
  display:block;
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

  function ensureToggleButton() {
    if (pickerToggleButton?.isConnected) {
      return pickerToggleButton;
    }

    pickerToggleButton = document.createElement('button');
    pickerToggleButton.id = 'manual-test-recorder-toggle';
    pickerToggleButton.setAttribute(PICKER_ROOT_ATTRIBUTE, 'toggle');
    pickerToggleButton.setAttribute(PICKER_UI_ATTRIBUTE, 'toggle');
    pickerToggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pickerEnabled) {
        disablePickerUi();
        chrome.runtime.sendMessage({ type: 'picker-ui-disabled' }).catch(() => undefined);
      } else {
        enablePickerUi();
      }
    });

    document.body.appendChild(pickerToggleButton);
    updateToggleButton();
    return pickerToggleButton;
  }

  function updateToggleButton() {
    const button = ensureToggleButton();
    button.dataset.state = pickerEnabled ? 'active' : 'idle';
    button.textContent = pickerEnabled ? 'Disable picker' : 'Enable picker';
  }

  function isPickerUi(element) {
    return !!element?.closest?.(`[${PICKER_ROOT_ATTRIBUTE}], [${PICKER_UI_ATTRIBUTE}]`);
  }

  function escapeCssValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeTextareaValue(value) {
    return escapeHtml(value ?? '');
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
    if (element.id && !/\d/.test(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
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

  function isUniqueCss(selector, doc = hostDocument) {
    if (!selector) {
      return false;
    }
    try {
      return doc.querySelectorAll(selector).length === 1;
    } catch (error) {
      return false;
    }
  }

  function escapeXPathString(value) {
    const stringValue = String(value);
    if (!stringValue.includes('"')) {
      return `"${stringValue}"`;
    }
    if (!stringValue.includes("'")) {
      return `'${stringValue}'`;
    }
    const parts = stringValue.split('"');
    const tokens = [];
    parts.forEach((part, index) => {
      tokens.push(`"${part}"`);
      if (index < parts.length - 1) {
        tokens.push("'\"'");
      }
    });
    return `concat(${tokens.join(', ')})`;
  }

  function countXPathMatches(xpath, doc = hostDocument) {
    try {
      return doc.evaluate(`count(${xpath})`, doc, null, XPathResult.NUMBER_TYPE, null).numberValue;
    } catch (error) {
      return 0;
    }
  }

  function isUniqueXPath(xpath, doc = hostDocument) {
    return countXPathMatches(xpath, doc) === 1;
  }

  function absoluteXPath(element) {
    const path = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index += 1;
        }
        sibling = sibling.previousSibling;
      }

      path.unshift(`${current.nodeName.toLowerCase()}[${index}]`);
      current = current.parentNode;
    }

    return `/${path.join('/')}`;
  }

  function uniqueXPath(element, doc = element.ownerDocument) {
    const attrPriority = [
      'id',
      'name',
      'data-testid',
      'data-test',
      'data-qa',
      'aria-label',
      'title',
      'placeholder',
      'type',
      'value'
    ];

    for (const attr of attrPriority) {
      const value = element.getAttribute?.(attr);
      if (!value) {
        continue;
      }

      const genericCandidate = `//*[@${attr}=${escapeXPathString(value)}]`;
      if (isUniqueXPath(genericCandidate, doc)) {
        return genericCandidate;
      }

      const tagCandidate = `//${element.tagName.toLowerCase()}[@${attr}=${escapeXPathString(value)}]`;
      if (isUniqueXPath(tagCandidate, doc)) {
        return tagCandidate;
      }
    }

    const text = element.textContent?.trim().replace(/\s+/g, ' ');
    if (text && text.length <= 50) {
      const textCandidate = `//${element.tagName.toLowerCase()}[normalize-space()=${escapeXPathString(text)}]`;
      if (isUniqueXPath(textCandidate, doc)) {
        return textCandidate;
      }
    }

    const classes = Array.from(element.classList).filter(Boolean);
    if (classes.length > 0) {
      const classCandidate = `//${element.tagName.toLowerCase()}[contains(concat(' ', normalize-space(@class), ' '), ' ${classes[0]} ')]`;
      if (isUniqueXPath(classCandidate, doc)) {
        return classCandidate;
      }
    }

    const fullPath = absoluteXPath(element);
    if (isUniqueXPath(fullPath, doc)) {
      const segments = fullPath.slice(1).split('/');
      for (let index = 0; index < segments.length; index += 1) {
        const shorterCandidate = `//${segments.slice(index).join('/')}`;
        if (isUniqueXPath(shorterCandidate, doc)) {
          return shorterCandidate;
        }
      }
    }

    return fullPath;
  }

  function selectorFor(element) {
    return uniqueCss(element, element.ownerDocument);
  }

  function labelFor(element) {
    const ariaLabel = element.getAttribute('aria-label');
    const text = element.innerText?.trim();
    const value = element.value?.trim();
    const placeholder = element.getAttribute('placeholder');
    return ariaLabel || text || value || placeholder || element.getAttribute('name') || element.id || element.tagName.toLowerCase();
  }

  function attrs(element) {
    return Array.from(element.attributes)
      .filter((attribute) => !attribute.name.startsWith('data-manual-test-recorder-picker'))
      .map((attribute) => `${attribute.name}="${attribute.value}"`)
      .join('\n');
  }

  function semanticContext(element) {
    const lines = [];
    const role = element.getAttribute('role') || '';
    const ariaLabel = element.getAttribute('aria-label') || '';
    const type = element.getAttribute('type') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const text = (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);

    if (role) lines.push(`role: ${role}`);
    if (ariaLabel) lines.push(`aria-label: ${ariaLabel}`);
    if (type) lines.push(`type: ${type}`);
    if (placeholder) lines.push(`placeholder: ${placeholder}`);
    if (text) lines.push(`visible text: ${text}`);

    const rect = element.getBoundingClientRect();
    lines.push(`position: x=${Math.round(rect.x)}, y=${Math.round(rect.y)}`);
    lines.push(`size: ${Math.round(rect.width)}x${Math.round(rect.height)}`);

    return lines.join('\n') || 'No semantic context available';
  }

  function field(label, value) {
    return `
      <div class="mtr-section">
        <label class="mtr-label">${escapeHtml(label)}</label>
        <textarea class="mtr-field" readonly>${safeTextareaValue(value)}</textarea>
      </div>
    `;
  }

  function getFrameChain(element) {
    const chain = [];
    let currentWindow = element.ownerDocument.defaultView;

    while (currentWindow && currentWindow !== window.top) {
      const frameElement = currentWindow.frameElement;
      if (!frameElement) {
        break;
      }
      chain.unshift(uniqueCss(frameElement, frameElement.ownerDocument));
      currentWindow = frameElement.ownerDocument.defaultView;
    }

    return chain;
  }

  function toPlaywrightFrameLocator(frameChain, selector) {
    const escapedSelector = escapeCssValue(selector);
    if (!frameChain.length) {
      return `page.locator("${escapedSelector}")`;
    }
    return `page${frameChain.map((frame) => `.frameLocator("${escapeCssValue(frame)}")`).join('')}.locator("${escapedSelector}")`;
  }

  function buildTree(element, selectedElement, options = {}, depth = 0, state = { count: 0, truncated: false }) {
    if (state.count >= (options.maxNodes || PICKER_MAX_TREE_NODES)) {
      state.truncated = true;
      return '';
    }

    state.count += 1;
    let attributesMarkup = '';
    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.startsWith('data-manual-test-recorder-picker')) {
        return;
      }
      attributesMarkup += ` <span class="mtr-tree-attr">${escapeHtml(attribute.name)}</span>=<span class="mtr-tree-attr">&quot;${escapeHtml(attribute.value)}&quot;</span>`;
    });

    const children = Array.from(element.children);
    const hasChildren = children.length > 0;
    const expanded = depth < 2 || element.contains(selectedElement);
    const marker = hasChildren ? (expanded ? '▼' : '▶') : '•';
    const selectedClass = element === selectedElement ? ' mtr-tree-selected' : '';

    let html = `
      <div class="mtr-tree-node${selectedClass}">
        <span class="mtr-tree-toggle" data-toggle="${hasChildren ? '1' : '0'}">${marker}</span>
        <span class="mtr-tree-tag">&lt;${escapeHtml(element.tagName.toLowerCase())}</span>${attributesMarkup}<span class="mtr-tree-tag">&gt;</span>
      </div>
    `;

    if (hasChildren) {
      html += `<div class="mtr-tree-children ${expanded ? 'expanded' : ''}">`;
      children.forEach((child) => {
        html += buildTree(child, selectedElement, options, depth + 1, state);
      });
      html += '</div>';
    }

    return html;
  }

  function getLocatorCandidates(element, doc = element.ownerDocument) {
    const cssAttributeSelector = (attribute, value) => value ? `[${attribute}="${escapeCssValue(value)}"]` : '';

    const dataTestId = element.getAttribute('data-testid') || '';
    const id = element.id || '';
    const name = element.getAttribute('name') || '';
    const placeholder = element.getAttribute('placeholder') || '';
    const hasNumericId = /\d/.test(id);
    const isDisabled = element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true';
    const isHidden = element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true';
    const isBlocked = element.hasAttribute('inert') || element.getAttribute('aria-busy') === 'true';
    const css = uniqueCss(element, doc);
    const xpath = uniqueXPath(element, doc);

    return [
      {
        key: 'data-testid',
        label: 'Data Test ID',
        value: cssAttributeSelector('data-testid', dataTestId),
        unique: dataTestId ? isUniqueCss(cssAttributeSelector('data-testid', dataTestId), doc) : false
      },
      {
        key: 'id',
        label: 'ID',
        value: id ? `#${CSS.escape(id)}` : '',
        unique: id ? isUniqueCss(`#${CSS.escape(id)}`, doc) : false,
        unstable: hasNumericId
      },
      {
        key: 'name',
        label: 'Name',
        value: cssAttributeSelector('name', name),
        unique: name ? isUniqueCss(cssAttributeSelector('name', name), doc) : false
      },
      {
        key: 'placeholder',
        label: 'Placeholder',
        value: cssAttributeSelector('placeholder', placeholder),
        unique: placeholder ? isUniqueCss(cssAttributeSelector('placeholder', placeholder), doc) : false
      },
      {
        key: 'css',
        label: 'CSS Selector',
        value: css,
        unique: isUniqueCss(css, doc)
      },
      {
        key: 'xpath',
        label: 'XPath',
        value: xpath,
        unique: isUniqueXPath(xpath, doc)
      },
      {
        key: 'disabled',
        label: 'Disabled State',
        value: isDisabled ? `${element.tagName.toLowerCase()}:disabled` : '',
        unique: isDisabled ? isUniqueCss(`${element.tagName.toLowerCase()}:disabled`, doc) : false
      },
      {
        key: 'hidden',
        label: 'Hidden State',
        value: isHidden ? `${element.tagName.toLowerCase()}[hidden], ${element.tagName.toLowerCase()}[aria-hidden="true"]` : '',
        unique: isHidden
          ? isUniqueCss(`${element.tagName.toLowerCase()}[hidden]`, doc) || isUniqueCss(`${element.tagName.toLowerCase()}[aria-hidden="true"]`, doc)
          : false
      },
      {
        key: 'blocked',
        label: 'Blocked State',
        value: isBlocked ? `${element.tagName.toLowerCase()}[inert], ${element.tagName.toLowerCase()}[aria-busy="true"]` : '',
        unique: isBlocked
          ? isUniqueCss(`${element.tagName.toLowerCase()}[inert]`, doc) || isUniqueCss(`${element.tagName.toLowerCase()}[aria-busy="true"]`, doc)
          : false
      }
    ];
  }

  function recommendedLocator(element, doc = element.ownerDocument) {
    const ranked = getLocatorCandidates(element, doc);
    return ranked.find((candidate) => candidate.value && candidate.unique && !candidate.unstable)
      || ranked.find((candidate) => candidate.value && candidate.unique)
      || ranked.find((candidate) => candidate.value && !candidate.unstable)
      || ranked.find((candidate) => candidate.value)
      || ranked[ranked.length - 1];
  }

  function buildPayload(element) {
    const sourceDoc = element.ownerDocument;
    const css = uniqueCss(element, sourceDoc);
    const xpath = uniqueXPath(element, sourceDoc);
    const locator = recommendedLocator(element, sourceDoc);
    const frameChain = getFrameChain(element);

    return {
      type: 'pick',
      text: labelFor(element),
      value: element.value || null,
      id: element.id || null,
      name: element.getAttribute('name') || null,
      url: window.location.href,
      selector: locator.value || css,
      cssSelector: css,
      xpath,
      recommendedLocator: locator.value || css,
      locatorStrategy: locator.key,
      frameChain,
      pageTitle: document.title,
      tagName: element.tagName.toLowerCase()
    };
  }

  function makePanelDraggable(panel) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const header = panel.querySelector('.mtr-picker-header');
    if (!header) {
      return;
    }

    const movePanel = (event) => {
      if (!dragging) {
        return;
      }
      panel.style.left = `${event.clientX - offsetX}px`;
      panel.style.top = `${event.clientY - offsetY}px`;
      panel.style.right = 'auto';
    };

    const stopDrag = () => {
      dragging = false;
      document.removeEventListener('mousemove', movePanel);
      document.removeEventListener('mouseup', stopDrag);
    };

    header.addEventListener('mousedown', (event) => {
      if (event.target.closest('textarea,select,button')) {
        return;
      }

      const rect = panel.getBoundingClientRect();
      const resizeMargin = 12;
      const onRightEdge = event.clientX > rect.right - resizeMargin;
      const onBottomEdge = event.clientY > rect.bottom - resizeMargin;
      if (onRightEdge || onBottomEdge) {
        return;
      }

      dragging = true;
      offsetX = event.clientX - panel.offsetLeft;
      offsetY = event.clientY - panel.offsetTop;
      document.addEventListener('mousemove', movePanel);
      document.addEventListener('mouseup', stopDrag);
    });
  }

  function openPanel(element) {
    const sourceDoc = element.ownerDocument;
    const frameChain = getFrameChain(element);
    const framePathText = frameChain.length ? frameChain.join('\n') : 'Top document';
    const css = uniqueCss(element, sourceDoc);
    const xpath = uniqueXPath(element, sourceDoc);
    const absolute = absoluteXPath(element);
    const recommended = recommendedLocator(element, sourceDoc);
    const rankedLocators = getLocatorCandidates(element, sourceDoc);
    const id = element.id || '';
    const name = element.getAttribute('name') || '';
    const className = element.classList?.[0] || '';

    pickerPanel?.remove();

    pickerPanel = document.createElement('div');
    pickerPanel.id = 'manual-test-recorder-panel';
    pickerPanel.setAttribute(PICKER_ROOT_ATTRIBUTE, 'panel');
    pickerPanel.setAttribute(PICKER_UI_ATTRIBUTE, 'panel');
    pickerPanel.innerHTML = `
      <div class="mtr-picker-header">
        <div>
          <div class="mtr-picker-title">Element: ${escapeHtml(element.tagName.toLowerCase())}</div>
          <div class="mtr-picker-subtitle">Recommended locator: ${escapeHtml(recommended.key)}</div>
        </div>
        <button type="button" class="mtr-picker-close" aria-label="Close picker panel">×</button>
      </div>
      <div class="mtr-picker-tabs">
        <div class="mtr-picker-tab active" data-tab="locators">Locators</div>
        <div class="mtr-picker-tab" data-tab="dom">DOM</div>
        <div class="mtr-picker-tab" data-tab="attributes">Attributes</div>
        <div class="mtr-picker-tab" data-tab="code">Code</div>
      </div>
      <div class="mtr-picker-content active" data-content="locators">
        ${field(`Recommended Locator (${recommended.key})`, recommended.value)}
        ${field('Locator Uniqueness Check', rankedLocators.map((locator) => `${locator.label}: ${locator.value || 'N/A'} ${locator.unique ? '✅ unique' : '❌ not unique'}${locator.unstable ? ' ⚠️ dynamic id' : ''}`).join('\n'))}
        ${field('CSS Selector', css)}
        ${field('XPath (recommended)', xpath)}
        ${field('XPath (absolute)', absolute)}
        ${field('Frame Path', framePathText)}
      </div>
      <div class="mtr-picker-content" data-content="dom">
        <div class="mtr-tree" data-loaded="0">Loading DOM tree…</div>
      </div>
      <div class="mtr-picker-content" data-content="attributes">
        ${field('Attributes', attrs(element) || 'No attributes available')}
        ${field('Semantic Context', semanticContext(element))}
      </div>
      <div class="mtr-picker-content" data-content="code">
        <div class="mtr-section">
          <label class="mtr-label" for="mtr-code-type">Snippet Type</label>
          <select id="mtr-code-type" class="mtr-picker-select">
            <option value="id">By.id</option>
            <option value="name">By.name</option>
            <option value="css">By.cssSelector</option>
            <option value="class">By.className</option>
            <option value="xpath">By.xpath</option>
            <option value="findby-id">@FindBy(id)</option>
            <option value="findby-name">@FindBy(name)</option>
            <option value="findby-css">@FindBy(css)</option>
            <option value="findby-class">@FindBy(className)</option>
            <option value="findby-xpath">@FindBy(xpath)</option>
            <option value="click">Click</option>
            <option value="sendkeys">SendKeys</option>
            <option value="wait">WebDriverWait</option>
            <option value="playwright">Playwright</option>
            <option value="cypress">Cypress</option>
          </select>
        </div>
        <div class="mtr-section">
          <label class="mtr-label" for="mtr-code-snippet">Code</label>
          <textarea id="mtr-code-snippet" class="mtr-field" readonly></textarea>
        </div>
      </div>
    `;

    document.body.appendChild(pickerPanel);

    const snippets = {
      id: `driver.findElement(By.id("${escapeCssValue(id)}"));`,
      name: `driver.findElement(By.name("${escapeCssValue(name)}"));`,
      class: `driver.findElement(By.className("${escapeCssValue(className)}"));`,
      css: `driver.findElement(By.cssSelector("${escapeCssValue(css)}"));`,
      xpath: `driver.findElement(By.xpath("${xpath.replace(/"/g, '\\"')}"));`,
      'findby-id': `@FindBy(id = "${escapeCssValue(id)}")\nprivate WebElement element;`,
      'findby-name': `@FindBy(name = "${escapeCssValue(name)}")\nprivate WebElement element;`,
      'findby-css': `@FindBy(css = "${escapeCssValue(css)}")\nprivate WebElement element;`,
      'findby-class': `@FindBy(className = "${escapeCssValue(className)}")\nprivate WebElement element;`,
      'findby-xpath': `@FindBy(xpath = "${xpath.replace(/"/g, '\\"')}")\nprivate WebElement element;`,
      click: `driver.findElement(By.cssSelector("${escapeCssValue(css)}")).click();`,
      sendkeys: `driver.findElement(By.cssSelector("${escapeCssValue(css)}")).sendKeys("text");`,
      wait: `new WebDriverWait(driver, Duration.ofSeconds(10))\n  .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("${escapeCssValue(css)}")));`,
      playwright: `const el = ${toPlaywrightFrameLocator(frameChain, css)};`,
      cypress: `cy.get("${escapeCssValue(recommended.value || css)}").should("be.visible");`
    };

    const treeElement = pickerPanel.querySelector('.mtr-tree');
    const selectElement = pickerPanel.querySelector('#mtr-code-type');
    const codeElement = pickerPanel.querySelector('#mtr-code-snippet');

    const updateSnippet = () => {
      codeElement.value = snippets[selectElement.value] || '';
    };

    selectElement.addEventListener('change', updateSnippet);
    updateSnippet();

    const renderDomTreeIfNeeded = () => {
      if (!treeElement || treeElement.dataset.loaded === '1') {
        return;
      }

      const state = { count: 0, truncated: false };
      const treeHtml = buildTree(sourceDoc.documentElement, element, { maxNodes: PICKER_MAX_TREE_NODES }, 0, state);
      const note = state.truncated
        ? `<div class="mtr-tree-node">⚠ DOM tree truncated to ${PICKER_MAX_TREE_NODES} nodes to keep picker responsive.</div>`
        : '';
      treeElement.innerHTML = note + treeHtml;
      treeElement.dataset.loaded = '1';

      treeElement.querySelectorAll('.mtr-tree-toggle[data-toggle="1"]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const children = toggle.parentElement?.nextElementSibling;
          if (!children?.classList.contains('mtr-tree-children')) {
            return;
          }
          const expanded = children.classList.toggle('expanded');
          toggle.textContent = expanded ? '▼' : '▶';
        });
      });
    };

    pickerPanel.querySelectorAll('.mtr-picker-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        pickerPanel.querySelectorAll('.mtr-picker-tab').forEach((candidate) => candidate.classList.remove('active'));
        pickerPanel.querySelectorAll('.mtr-picker-content').forEach((content) => content.classList.remove('active'));
        tab.classList.add('active');
        const activeContent = pickerPanel.querySelector(`[data-content="${tab.dataset.tab}"]`);
        activeContent?.classList.add('active');
        if (tab.dataset.tab === 'dom') {
          renderDomTreeIfNeeded();
        }
      });
    });

    pickerPanel.querySelector('.mtr-picker-close')?.addEventListener('click', () => pickerPanel?.remove());

    makePanelDraggable(pickerPanel);
    renderDomTreeIfNeeded();
    pickerPanel.querySelector('.mtr-tree-selected')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function toElement(target) {
    if (target instanceof Element) {
      return target;
    }
    return target?.parentElement || null;
  }

  const INTERACTIVE_SELECTOR = [
    'input',
    'input[type="time"]',
    'input[type="date"]',
    'input[type="datetime-local"]',
    'input[type="week"]',
    'input[type="month"]',
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
    '[role="slider"]',
    '[role="tab"]',
    '[role="tabpanel"]',
    '[role="tooltip"]',
    '[role="dialog"]',
    '[role="alert"]',
    '[role="status"]',
    '[role="grid"]',
    '[role="treegrid"]',
    '[role="menu"]',
    '[role="menuitem"]',
    '[role="navigation"]',
    '[role="complementary"]',
    '[aria-haspopup="listbox"]'
  ].join(',');

  const COMPONENT_KEYWORDS = [
    'datetime', 'date-time', 'datepicker', 'timepicker', 'calendar',
    'time', 'day', 'week', 'month', 'quarter', 'year', 'last-hour',
    'radio', 'checkbox', 'check', 'button', 'pagination', 'pager',
    'grid', 'table', 'picklist', 'slider', 'sidebar', 'tab', 'tooltip',
    'switch', 'overlay', 'toast', 'dialog', 'comment', 'detailbar', 'detail-bar'
  ];

  function hasComponentKeyword(element) {
    if (!(element instanceof Element)) {
      return false;
    }
    const candidates = [
      element.id,
      typeof element.className === 'string' ? element.className : '',
      element.getAttribute('role'),
      element.getAttribute('aria-label'),
      element.getAttribute('aria-labelledby'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test'),
      element.getAttribute('data-qa'),
      element.getAttribute('name')
    ].filter(Boolean).join(' ').toLowerCase();

    return COMPONENT_KEYWORDS.some((keyword) => candidates.includes(keyword));
  }

  function findComponentContainer(element) {
    let current = element;
    while (current && current !== current.ownerDocument.documentElement) {
      if (hasComponentKeyword(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function resolveTargetElement(target) {
    if (!target) {
      return null;
    }

    const interactiveAncestor = target.closest(INTERACTIVE_SELECTOR);
    if (interactiveAncestor && !isPickerUi(interactiveAncestor)) {
      return interactiveAncestor;
    }

    const componentContainer = findComponentContainer(target);
    if (componentContainer && !isPickerUi(componentContainer)) {
      return componentContainer;
    }

    if (target.tagName === 'LABEL') {
      const htmlFor = target.getAttribute('for');
      if (htmlFor) {
        const control = target.ownerDocument.getElementById(htmlFor);
        if (control) {
          return control;
        }
      }
      if (target.control) {
        return target.control;
      }
    }

    if (target.matches('div,span,li,td,th')) {
      const nestedInteractive = target.querySelector(INTERACTIVE_SELECTOR);
      if (nestedInteractive && !isPickerUi(nestedInteractive)) {
        return nestedInteractive;
      }
    }

    return target;
  }

  function handleSelection(resolvedTarget) {
    openPanel(resolvedTarget);
    showHighlight(resolvedTarget);

    const payload = buildPayload(resolvedTarget);
    chrome.runtime.sendMessage({ type: 'record-step', payload }).catch(() => undefined);
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
      if (!target) {
        return;
      }
      const resolvedTarget = resolveTargetElement(target);
      if (!resolvedTarget || isPickerUi(resolvedTarget)) {
        return;
      }
      showHighlight(resolvedTarget);
    };

    const onLeave = () => {
      if (pickerEnabled) {
        hideHighlight(targetDocument);
      }
    };

    const onPointerDown = (event) => {
      if (!pickerEnabled) {
        return;
      }
      const target = toElement(event.target);
      if (!target) {
        return;
      }
      const resolvedTarget = resolveTargetElement(target);
      if (!resolvedTarget || isPickerUi(resolvedTarget)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      handleSelection(resolvedTarget);
    };

    targetDocument.addEventListener('mouseover', onPointerMove, true);
    targetDocument.addEventListener('mousemove', onPointerMove, true);
    targetDocument.addEventListener('mouseleave', onLeave, true);
    targetDocument.addEventListener('pointerdown', onPointerDown, true);

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
    ensureToggleButton();
    pickerEnabled = true;
    updateToggleButton();
    document.documentElement.style.cursor = 'crosshair';
  }

  function disablePickerUi() {
    pickerEnabled = false;
    document.documentElement.style.cursor = '';
    clearAllHighlights();
    pickerPanel?.remove();
    pickerPanel = null;
    updateToggleButton();
  }

  ensureStyles();
  registerDocument(hostDocument);
  ensureToggleButton();

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
