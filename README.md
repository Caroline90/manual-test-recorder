# Manual Test Recorder

Manual Test Recorder is a Spring Boot service plus a Chrome extension for capturing browser interactions and turning them into XRAY-ready manual test documentation. The backend stores recorded events in memory, converts them into human-readable test steps, exposes a live preview UI, and exports both CSV files and screenshot evidence bundles for Jira/XRAY workflows.

## What this service does

- Records browser actions such as clicks, navigation, assertions, committed text entry, and grouped multi-field snapshots.
- Stores each captured event through a REST API at `/api/events`.
- Builds XRAY-style manual test steps from the recorded event stream.
- Generates a structured XRAY test case preview with summary, objective, precondition, and step table.
- Exports:
  - `xray-steps.csv` for standard XRAY CSV import.
  - `xray-steps-with-screenshots.csv` with screenshot file references.
  - `xray-evidence.zip` containing both CSV files, a bundle README, and screenshot attachments.
- Ships a static sample UI to exercise the recorder locally.
- Includes a bundled OpenAPI-style JSON document and Swagger UI entry point for quick API exploration.

## Repository contents

This repository contains two runtime pieces:

### 1. Spring Boot backend
The backend runs on Java 17 and Spring Boot 3.3.5. It serves:

- REST endpoints under `/api` for recording, listing, exporting, and clearing events.
- A static web UI at `/` for trying the recorder and previewing generated documentation.
- API documentation at `/v3/api-docs` and `/swagger-ui/index.html`.

### 2. Chrome extension
The extension can be loaded unpacked from this repository. It:

- Tracks recording state in Chrome local storage.
- Sends captured steps to the backend endpoint.
- Captures a visible-tab screenshot for each recorded step when possible.
- Lets the tester configure the backend URL or just a port number.
- Lets the tester attach an XRAY ticket that is propagated into exports and screenshot file names.

## High-level architecture

```text
Chrome extension / sample UI
        |
        v
POST /api/events
        |
        v
In-memory event store
        |
        +--> /api/steps
        +--> /api/xray
        +--> /api/steps.csv
        +--> /api/steps-with-screenshots.csv
        +--> /api/xray-evidence.zip
```

## Tech stack

- Java 17
- Gradle
- Spring Boot Web
- Spring Boot Validation
- Static HTML/CSS/JavaScript frontend
- Chrome Extension Manifest V3
- JUnit 5 / Spring Boot Test

## Prerequisites

Before running the service, make sure you have:

- Java 17 installed.
- A Chromium-based browser if you want to use the extension or the fallback bookmarklet recorder.
- No other process already bound to port `8090`, unless you plan to change the backend endpoint in the extension popup.

## Getting started

### Run the backend

From the repository root:

```bash
./gradlew bootRun
```

By default, the service listens on port `8090`.

Once started, open:

- Sample UI: <http://localhost:8090/>
- OpenAPI JSON: <http://localhost:8090/v3/api-docs>
- Swagger UI: <http://localhost:8090/swagger-ui/index.html>

### Run the test suite

```bash
./gradlew test
```

## Using the sample web UI

The sample UI is served by the backend and is useful for quick local validation without loading the extension.

### Features in the sample page

- A live recording status banner.
- An XRAY ticket field used for future recorded events and screenshot naming.
- Buttons for clearing recordings and exporting CSV/ZIP outputs.
- Sample sections for login, execution details, request-body capture, navigation, and assertions.
- A live list of generated manual steps.
- A live XRAY documentation preview table.

### How recording works in the sample page

- Clicking tracked buttons or links creates `click` or `assert` events.
- Changing inputs, text areas, and selects creates `input` or `change` events.
- Sections marked with `data-record-group` create grouped snapshots that combine multiple related field values into a single event value.
- The page posts the event to `/api/events` and immediately refreshes the step list and XRAY preview.
- Elements referenced by generated selectors are highlighted so the tester can verify what was captured.

### Typical local workflow

1. Start the backend.
2. Open `http://localhost:8090/`.
3. Optionally enter an XRAY ticket such as `XRAY-123`.
4. Interact with the sample form and action buttons.
5. Review the generated step list and XRAY preview.
6. Export CSV or the XRAY evidence ZIP.
7. Clear the recording and repeat.

## Loading the Chrome extension

The repository already contains the unpacked extension files:

- `manifest.json`
- `popup.html`
- `popup.js`
- `popup.css`
- `background.js`
- `content.js`

### Install it in Chrome or Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository directory.
5. Pin the extension if desired for easier access.

### No-install fallback for locked-down browsers

If Chrome or Edge policy blocks unpacked extensions, use the fallback bookmarklet instead:

1. Start the backend and open <http://localhost:8090/>.
2. In the **Browser recorder options** panel, drag **Install fallback bookmarklet** to your bookmarks bar.
3. Open the target page you want to document.
4. Click the bookmarklet to inject the fallback recorder panel into that page.
5. Click **Start recording** in the fallback panel and, when prompted, share the current tab so screenshots can still be captured.
6. Record, stop, clear, and export with the same backend endpoints used by the extension.

If your browser blocks drag-and-drop bookmarks, use the **Copy launcher snippet** button and paste the copied value into a manually created bookmark URL field.

## Using the extension

### Popup configuration

The popup supports two inputs:

- **Backend endpoint or port**
  - Accepts values like `8090`, `localhost:8090`, or `http://localhost:8090/api/events`.
  - If you provide only a port or host, the extension normalizes it to `/api/events`.
- **XRAY ticket**
  - Normalized to uppercase.
  - Included in recorded events and export filenames when present.

### Recording flow

1. Start the backend.
2. Open the target page you want to document.
3. Open the extension popup, or launch the fallback bookmarklet if extensions are blocked.
4. Confirm the backend endpoint.
5. Optionally enter an XRAY ticket.
6. Click **Start recording**.
7. Interact with the current tab.
8. Stop recording from the popup or fallback panel when finished.
9. Use the backend UI or API exports to retrieve generated documentation.

### What the extension records

The content script attempts to build useful selectors and labels using data such as:

- `id`
- `name`
- `placeholder`
- `data-testid`
- ARIA role and label metadata
- DOM structure with `nth-of-type(...)` fallbacks
- iframe context prefixes when the interaction happens inside frames

Depending on the element type, the extension records:

- `click` for buttons, links, and similar controls.
- `input` for text fields, text areas, editable content, and textbox-like roles.
- `change` for selects, sliders, ranges, and choice controls.
- grouped snapshot events for containers annotated with `data-record-group`.

### Screenshots

For each step received from the content script, the background script tries to capture the visible tab as a PNG data URL. The fallback bookmarklet uses tab-sharing plus an off-screen video frame when browser policy blocks extension installation. Those screenshots are:

- Stored with the recorded step in extension state.
- Forwarded to the backend as part of the event payload.
- Embedded in the generated step model.
- Exported into the XRAY evidence ZIP as files under `screenshots/`.

If screenshot capture is unavailable for a given action, exports still work; the screenshot field is just omitted for that step.

## REST API

All primary backend operations are exposed under `/api`.

### `POST /api/events`
Record one event.

Example payload:

```json
{
  "type": "click",
  "text": "Login",
  "value": null,
  "name": null,
  "url": "http://localhost:8090/login",
  "selector": "button",
  "pageTitle": "Login page",
  "xrayTicket": "XRAY-123",
  "screenshot": "data:image/png;base64,..."
}
```

Behavior:

- `type` is required.
- `recordedAt` is auto-populated when missing.
- Events are appended to the in-memory store.

### `GET /api/events`
Return the full recorded event list exactly as stored.

### `DELETE /api/events`
Clear all recorded events.

### `GET /api/steps`
Transform recorded events into generated manual test steps.

Each step includes:

- step index
- action text
- target selector/description
- detail text
- input data
- expected result
- screenshot reference/data URL when available

### `GET /api/xray`
Build a full XRAY test case document containing:

- summary
- priority
- primary component
- secondary component
- objective
- precondition
- XRAY ticket
- generated steps

### `GET /api/steps.csv`
Download the standard XRAY CSV export.

### `GET /api/steps-with-screenshots.csv`
Download the XRAY CSV export with an extra `Screenshot` column that references bundled screenshot files.

### `GET /api/xray-evidence.zip`
Download a ZIP archive containing:

- `xray-steps.csv`
- `xray-steps-with-screenshots.csv`
- `README.txt`
- `screenshots/...` image files derived from event screenshots

## OpenAPI and Swagger UI

This service includes a controller that returns an OpenAPI-compatible JSON document at `/v3/api-docs` and redirects `/swagger-ui.html` to the bundled Swagger UI page at `/swagger-ui/index.html`.

This is useful for:

- verifying endpoint availability,
- inspecting request/response shapes,
- and sharing a lightweight API contract with other tools.

## Data model

### Recorded event

A recorded event can include:

- `type`
- `text`
- `value`
- `id`
- `name`
- `url`
- `selector`
- `pageTitle`
- `xrayTicket`
- `screenshot`
- `recordedAt`

### Generated test step

Each generated step contains:

- `index`
- `action`
- `target`
- `detail`
- `data`
- `expectedResult`
- `screenshot`

### XRAY test case

The XRAY document includes:

- `summary`
- `priority`
- `primaryComponent`
- `secondaryComponent`
- `objective`
- `precondition`
- `xrayTicket`
- `steps`

## How step generation works

The backend converts raw events into readable manual test steps by applying type-specific rules:

- `click` becomes actions like `Click login button`.
- `input` / `type` / `change` become actions like `Enter username`.
- `navigate` becomes actions like `Go to login page`.
- `assert` becomes actions like `Verify dashboard visible`.

For each event, the backend derives:

- a human-readable action,
- a target selector or fallback label,
- detail text suitable for manual execution,
- input data where relevant,
- and an expected result sentence.

## XRAY export behavior

### CSV export

The standard CSV export uses a semicolon-delimited format with columns:

- `TCID`
- `Test Summary`
- `Test Priority`
- `Component`
- `Component`
- `Action`
- `Data`
- `Result`

Only the first row contains the test-case level summary and priority values; each row represents one generated step.

### Screenshot-aware CSV export

The screenshot-aware CSV adds:

- `Screenshot`

When a step has a screenshot, the column points to a relative path like:

- `screenshots/step-01.png`
- `screenshots/xray-123-step-01.png`

### ZIP evidence bundle

The ZIP export is intended to simplify Jira/XRAY evidence handling by packaging:

- both CSV variants,
- a text README with the recommended upload workflow,
- and individual image files extracted from data URLs.

Screenshot file extensions are inferred from the source MIME type:

- `image/png` → `.png`
- `image/jpeg` → `.jpg`
- `image/gif` → `.gif`
- `image/webp` → `.webp`
- non-data URLs fall back to `.txt`

## Limitations

Current behavior and implementation details to be aware of:

- Recorded events are stored **in memory only**; restarting the Spring Boot app clears them.
- The backend does not currently persist recordings to a database or filesystem.
- The default sample UI posts screenshots as `null`; screenshot capture is primarily provided by the Chrome extension.
- There is no authentication or authorization layer.
- The extension depends on the active tab and visible-tab screenshot permissions available in the browser environment.
- The backend export naming depends on sanitized XRAY ticket values.

## Development notes

### Build

```bash
./gradlew build
```

### Main application entry point

The Spring Boot application starts from:

- `src/main/java/com/example/recorder/ManualTestRecorderApplication.java`

### Static assets

The backend serves static files from:

- `src/main/resources/static/`

### Port configuration

The default port is configured in:

- `src/main/resources/application.properties`

## Test coverage

The existing automated tests cover several key paths:

- workflow-to-step and export generation,
- ZIP evidence creation and screenshot extraction,
- event lifecycle API behavior,
- OpenAPI/Swagger endpoint availability,
- and extension manifest validity.

## Recommended end-to-end usage pattern

If your goal is to generate XRAY-ready evidence from a real browser workflow, a practical flow is:

1. Start the Spring Boot backend.
2. Load the Chrome extension unpacked.
3. Open the target application in Chrome.
4. Set the backend endpoint and optional XRAY ticket in the popup.
5. Start recording.
6. Walk through the manual scenario.
7. Stop recording.
8. Open the backend UI or call `/api/xray` to review the generated test case.
9. Download `/api/xray-evidence.zip`.
10. Import the CSV into XRAY and upload the screenshot files as attachments or execution evidence.

## Troubleshooting

### The extension cannot send events

Check:

- the backend is running,
- the popup backend endpoint is correct,
- the port matches the running server,
- and the backend is reachable from the browser.

If the popup was given only a port or host, it automatically appends `/api/events`.

### No screenshots appear in exports

Possible causes:

- the interaction was recorded through the sample page instead of the extension,
- visible-tab capture was unavailable for that step,
- or the recorded event did not include a `screenshot` field.

### Exports do not contain the expected ticket prefix

Make sure the XRAY ticket was entered before recording new events. The export document derives its ticket from the recorded event stream.

## Future improvements

Natural next enhancements for this service could include:

- persistent event storage,
- multi-session or named recording support,
- richer XRAY field mapping,
- configurable CSV schemas,
- authentication and multi-user support,
- direct Jira/XRAY API integration,
- and more advanced selector or assertion generation.

## License

No license file is included in this repository at the moment. Add one if you plan to distribute or reuse the project beyond local/internal usage.
