package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RecorderWorkflowTest {

    private static final String SCREENSHOT_DATA_URL = "data:image/png;base64,ZmFrZQ==";

    private final EventStoreService eventStoreService = new EventStoreService();
    private final StepBuilderService stepBuilderService = new StepBuilderService();
    private final XrayDocumentationService xrayDocumentationService =
            new XrayDocumentationService(eventStoreService, stepBuilderService);
    private final CsvExportService csvExportService = new CsvExportService();
    private final XrayEvidenceExportService xrayEvidenceExportService =
            new XrayEvidenceExportService(csvExportService);

    @Test
    void buildsXrayStepsAndExportsCsv() {
        seedWorkflow();

        List<TestStep> steps = stepBuilderService.buildSteps(eventStoreService.getAll());
        XrayTestCase xrayTestCase = xrayDocumentationService.buildDocument();
        String csv = csvExportService.exportTestCase(xrayTestCase);
        String csvWithScreenshots = csvExportService.exportTestCaseWithScreenshots(xrayTestCase);

        assertEquals(4, steps.size());
        assertEquals("Click login button", steps.get(0).getAction());
        assertEquals("Enter password", steps.get(1).getAction());
        assertEquals("pwrd123", steps.get(1).getData());
        assertEquals(SCREENSHOT_DATA_URL, steps.get(0).getScreenshot());
        assertEquals("WEB-1", xrayTestCase.getXrayTicket());
        assertEquals("Test 1 for XRAY ticket WEB-1", xrayTestCase.getSummary());
        assertTrue(csv.contains("TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result"));
        assertTrue(csv.contains("\"1\";\"Test 1 for XRAY ticket WEB-1\";\"High\";\"\";\"\";\"Click login button\";\"\";\"The action for 'Login' is triggered successfully.\""));
        assertTrue(csv.contains("\"1\";\"\";\"\";\"\";\"\";\"Enter password\";\"pwrd123\";\"\""));
        assertTrue(csv.contains("\"1\";\"\";\"\";\"\";\"\";\"Go to login page\";\"\";\"\""));
        assertTrue(csvWithScreenshots.contains("TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result;Screenshot"));
        assertTrue(csvWithScreenshots.contains("screenshots/web-1-step-01.png"));
        assertTrue(csvWithScreenshots.contains("screenshots/web-1-step-04.png"));
    }

    @Test
    void exportsZipBundleWithCsvAndScreenshots() throws IOException {
        seedWorkflow();

        byte[] zipBytes = xrayEvidenceExportService.exportBundle(xrayDocumentationService.buildDocument());

        String stepsCsv = null;
        String screenshotsCsv = null;
        String readme = null;
        byte[] screenshotBytes = null;

        try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(zipBytes), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                byte[] bytes = zipInputStream.readAllBytes();
                switch (entry.getName()) {
                    case "xray-steps.csv" -> stepsCsv = new String(bytes, StandardCharsets.UTF_8);
                    case "xray-steps-with-screenshots.csv" -> screenshotsCsv = new String(bytes, StandardCharsets.UTF_8);
                    case "README.txt" -> readme = new String(bytes, StandardCharsets.UTF_8);
                    case "screenshots/web-1-step-01.png" -> screenshotBytes = bytes;
                    default -> {
                    }
                }
            }
        }

        assertNotNull(stepsCsv);
        assertNotNull(screenshotsCsv);
        assertNotNull(readme);
        assertNotNull(screenshotBytes);
        assertTrue(stepsCsv.contains("Click login button"));
        assertTrue(screenshotsCsv.contains("screenshots/web-1-step-01.png"));
        assertTrue(readme.contains("Ticket: WEB-1"));
        assertEquals("fake", new String(screenshotBytes, StandardCharsets.UTF_8));
    }

    private void seedWorkflow() {
        eventStoreService.append(new RecordedEvent(
                "navigate", "Login page", null, null, null,
                "http://localhost:8090/login", "body", "WEB-1", "WEB-1", SCREENSHOT_DATA_URL, null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Username", "peter", null, "username",
                "http://localhost:8090/login", "[name='username']", "WEB-1", "WEB-1", SCREENSHOT_DATA_URL, null
        ));
        eventStoreService.append(new RecordedEvent(
                "input", "Password", "pwrd123", null, "password",
                "http://localhost:8090/login", "[name='password']", "WEB-1", "WEB-1", SCREENSHOT_DATA_URL, null
        ));
        eventStoreService.append(new RecordedEvent(
                "click", "Login", null, null, null,
                "http://localhost:8090/login", "button", "WEB-1", "WEB-1", SCREENSHOT_DATA_URL, null
        ));
    }
}
