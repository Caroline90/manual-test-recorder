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
                "navigate", "Login page", null, null, null,
                "http://localhost:8080/login", "body", "WEB-1", null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Username", "peter", null, "username",
                "http://localhost:8080/login", "[name='username']", "WEB-1", null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Password", "pwrd123", null, "password",
                "http://localhost:8080/login", "[name='password']", "WEB-1", null
        ));
        eventStoreService.append(new RecordedEvent(
                "click", "Login", null, null, null,
                "http://localhost:8080/login", "button", "WEB-1", null
        ));

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        XrayTestCase xrayTestCase = xrayDocumentationService.buildDocument();
        String csv = csvExportService.exportTestCase(xrayTestCase);

        assertEquals(4, steps.size());
        assertEquals("Go to login page", steps.get(0).getAction());
        assertEquals("Enter username", steps.get(1).getAction());
        assertEquals("peter", steps.get(1).getData());
        assertEquals("Test 1 for user story WEB-1", xrayTestCase.getSummary());
        assertTrue(csv.contains("TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result"));
        assertTrue(csv.contains("\"1\";\"Test 1 for user story WEB-1\";\"High\";\"\";\"\";\"Go to login page\";\"\";\"\""));
        assertTrue(csv.contains("\"1\";\"\";\"\";\"\";\"\";\"Enter username\";\"peter\";\"\""));
        assertTrue(csv.contains("\"1\";\"\";\"\";\"\";\"\";\"Click login button\";\"\";\"The action for 'Login' is triggered successfully.\""));
    }
}
