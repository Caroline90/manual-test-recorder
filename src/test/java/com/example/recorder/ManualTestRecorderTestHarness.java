package com.example.recorder;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.service.CsvExportService;
import com.example.recorder.service.EventStoreService;
import com.example.recorder.service.StepBuilderService;
import com.example.recorder.service.XrayDocumentationService;
import java.util.List;

public class ManualTestRecorderTestHarness {

    public static void main(String[] args) {
        EventStoreService eventStoreService = new EventStoreService();
        StepBuilderService stepBuilderService = new StepBuilderService();
        XrayDocumentationService xrayDocumentationService =
                new XrayDocumentationService(eventStoreService, stepBuilderService);
        CsvExportService csvExportService = new CsvExportService();

        eventStoreService.append(new RecordedEvent(
                "click", "Login", null, null, null,
                "http://localhost:8080", "button", "Manual Test Recorder", null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Notes", "Typed from textarea", null, "notes",
                "http://localhost:8080", "[name=\'notes\']", "Manual Test Recorder", null
        ));

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        require(steps.size() == 2, "expected 2 steps");
        require(csvExportService.exportSteps(steps).contains("Typed from textarea"), "expected CSV export to include entered value");
        require(steps.get(1).getTarget().contains("notes"), "expected selector-based target for textarea input");
        require(xrayDocumentationService.buildDocument().getSummary().contains("Manual Test Recorder"), "expected XRAY summary to include page title");

        System.out.println("All manual-test-recorder checks passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
