package com.example.recorder.controller;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import com.example.recorder.service.CsvExportService;
import com.example.recorder.service.EventStoreService;
import com.example.recorder.service.StepBuilderService;
import com.example.recorder.service.XrayDocumentationService;
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

    public TestController(EventStoreService eventStoreService,
                          StepBuilderService stepBuilderService,
                          XrayDocumentationService xrayDocumentationService,
                          CsvExportService csvExportService) {
        this.eventStoreService = eventStoreService;
        this.stepBuilderService = stepBuilderService;
        this.xrayDocumentationService = xrayDocumentationService;
        this.csvExportService = csvExportService;
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
        String csv = csvExportService.exportSteps(getSteps());
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("xray-steps.csv").build());
        return ResponseEntity.ok()
                .headers(headers)
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    @DeleteMapping("/events")
    public void clearEvents() {
        eventStoreService.clear();
    }
}
