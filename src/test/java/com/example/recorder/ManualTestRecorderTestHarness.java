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
                "click", "Login", null, "login-button", null,
                "http://localhost:8080", "#login-button", "Manual Test Recorder", null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Email", "qa@example.com", "email", "email",
                "http://localhost:8080", "#email", "Manual Test Recorder", null
        ));

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        require(steps.size() == 2, "expected 2 steps");
        require(csvExportService.exportSteps(steps).contains("qa@example.com"), "expected CSV export to include entered value");
        require(xrayDocumentationService.buildDocument().getSummary().contains("Manual Test Recorder"), "expected XRAY summary to include page title");

        System.out.println("All manual-test-recorder checks passed.");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
