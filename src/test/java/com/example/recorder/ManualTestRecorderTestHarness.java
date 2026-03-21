package com.example.recorder;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.service.CsvExportService;
import com.example.recorder.service.EventStoreService;
import com.example.recorder.service.StepBuilderService;
import com.example.recorder.service.XrayDocumentationService;
import java.util.List;

public class ManualTestRecorderTestHarness {

    private static final String SCREENSHOT_DATA_URL = "data:image/png;base64,ZmFrZQ==";

    public static void main(String[] args) {
        EventStoreService eventStoreService = new EventStoreService();
        StepBuilderService stepBuilderService = new StepBuilderService();
        XrayDocumentationService xrayDocumentationService =
                new XrayDocumentationService(eventStoreService, stepBuilderService);
        CsvExportService csvExportService = new CsvExportService();

        eventStoreService.append(new RecordedEvent(
                "click", "Login", null, null, null,
                "http://localhost:8090", "button", "Manual Test Recorder", "XRAY-42", SCREENSHOT_DATA_URL, null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Notes", "Typed from textarea", null, "notes",
                "http://localhost:8090", "[name='notes']", "Manual Test Recorder", "XRAY-42", SCREENSHOT_DATA_URL, null
        ));

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        require(steps.size() == 2, "expected 2 steps");
        require(csvExportService.exportTestCase(xrayDocumentationService.buildDocument()).contains("Typed from textarea"),
                "expected CSV export to include entered value");
        require(steps.get(1).getTarget().contains("notes"), "expected selector-based target for textarea input");
        require(SCREENSHOT_DATA_URL.equals(steps.get(0).getScreenshot()),
                "expected screenshots to be preserved on each generated step");
        require(xrayDocumentationService.buildDocument().getSummary().contains("XRAY-42"),
                "expected XRAY summary to include ticket");
        require(csvExportService.exportTestCaseWithScreenshots(xrayDocumentationService.buildDocument())
                        .contains("screenshots/xray-42-step-01.png"),
                "expected screenshot export to include the XRAY ticket in file names");

        System.out.println("All manual-test-recorder checks passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
