package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecorderWorkflowTest {

    private final EventStoreService eventStoreService = new EventStoreService();
    private final StepBuilderService stepBuilderService = new StepBuilderService();
    private final XrayDocumentationService xrayDocumentationService =
            new XrayDocumentationService(eventStoreService, stepBuilderService);
    private final CsvExportService csvExportService = new CsvExportService();

    @Test
    void buildsXrayStepsAndExportsCsv() {
        eventStoreService.append(new RecordedEvent(
                "navigate", "Recorder home", null, null, null,
                "http://localhost:8080", "body", "Manual Test Recorder", null
        ));
        eventStoreService.append(new RecordedEvent(
                "click", "Login", null, null, null,
                "http://localhost:8080", "button", "Manual Test Recorder", null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Email", "qa@example.com", null, "email",
                "http://localhost:8080", "[name=\'email\']", "Manual Test Recorder", null
        ));

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        XrayTestCase xrayTestCase = xrayDocumentationService.buildDocument();
        String csv = csvExportService.exportSteps(steps);

        assertEquals(3, steps.size());
        assertEquals("Click", steps.get(1).getAction());
        assertEquals("button", steps.get(1).getTarget());
        assertTrue(steps.get(2).getDetail().contains("qa@example.com"));
        assertEquals("XRAY test for Manual Test Recorder", xrayTestCase.getSummary());
        assertTrue(csv.contains("Expected Result"));
        assertTrue(steps.get(2).getTarget().contains("email"));
        assertTrue(csv.contains("[name='email']"));
    }
}
