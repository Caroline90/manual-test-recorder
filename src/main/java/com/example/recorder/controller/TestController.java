package com.example.recorder.controller;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import com.example.recorder.service.CsvExportService;
import com.example.recorder.service.EventStoreService;
import com.example.recorder.service.StepBuilderService;
import com.example.recorder.service.XrayDocumentationService;
import com.example.recorder.service.XrayEvidenceExportService;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TestController {

    private final EventStoreService eventStoreService;
    private final StepBuilderService stepBuilderService;
    private final XrayDocumentationService xrayDocumentationService;
    private final CsvExportService csvExportService;
    private final XrayEvidenceExportService xrayEvidenceExportService;

    public TestController(EventStoreService eventStoreService,
                          StepBuilderService stepBuilderService,
                          XrayDocumentationService xrayDocumentationService,
                          CsvExportService csvExportService,
                          XrayEvidenceExportService xrayEvidenceExportService) {
        this.eventStoreService = eventStoreService;
        this.stepBuilderService = stepBuilderService;
        this.xrayDocumentationService = xrayDocumentationService;
        this.csvExportService = csvExportService;
        this.xrayEvidenceExportService = xrayEvidenceExportService;
    }

    @PostMapping("/events")
    public RecordedEvent recordEvent(@Valid @RequestBody RecordedEvent event) {
        return eventStoreService.append(event);
    }

    @GetMapping("/events")
    public List<RecordedEvent> getEvents() {
        return eventStoreService.getAll();
    }

    @GetMapping("/steps")
    public List<TestStep> getSteps() {
        return stepBuilderService.buildSteps(eventStoreService.getAll());
    }

    @GetMapping("/xray")
    public XrayTestCase getXrayDocumentation() {
        return xrayDocumentationService.buildDocument();
    }

    @GetMapping(value = "/steps.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsv() {
        String csv = csvExportService.exportTestCase(xrayDocumentationService.buildDocument());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("xray-steps.csv").build());
        return ResponseEntity.ok()
                .headers(headers)
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }


    @GetMapping(value = "/steps-with-screenshots.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportCsvWithScreenshots() {
        String csv = csvExportService.exportTestCaseWithScreenshots(xrayDocumentationService.buildDocument());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("xray-steps-with-screenshots.csv").build());
        return ResponseEntity.ok()
                .headers(headers)
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping(value = "/xray-evidence.zip", produces = "application/zip")
    public ResponseEntity<byte[]> exportXrayEvidenceBundle() {
        byte[] zip = xrayEvidenceExportService.exportBundle(xrayDocumentationService.buildDocument());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/zip"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("xray-evidence.zip").build());
        return ResponseEntity.ok()
                .headers(headers)
                .body(zip);
    }

    @DeleteMapping("/events")
    public void clearEvents() {
        eventStoreService.clear();
    }
}
