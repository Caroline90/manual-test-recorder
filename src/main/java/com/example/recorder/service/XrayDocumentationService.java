package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class XrayDocumentationService {

    private final EventStoreService eventStoreService;
    private final StepBuilderService stepBuilderService;

    public XrayDocumentationService(EventStoreService eventStoreService, StepBuilderService stepBuilderService) {
        this.eventStoreService = eventStoreService;
        this.stepBuilderService = stepBuilderService;
    }

    public XrayTestCase buildDocument() {
        List<RecordedEvent> events = eventStoreService.getAll();
        List<TestStep> steps = stepBuilderService.buildSteps(events);
        String xrayTicket = events.stream()
                .map(RecordedEvent::getXrayTicket)
                .filter(ticket -> ticket != null && !ticket.isBlank())
                .findFirst()
                .orElse("");

        String pageName = events.stream()
                .map(RecordedEvent::getPageTitle)
                .filter(title -> title != null && !title.isBlank())
                .findFirst()
                .orElse("recorded workflow");

        return new XrayTestCase(
                xrayTicket.isBlank() ? "Test 1 for user story " + pageName : "Test 1 for XRAY ticket " + xrayTicket,
                "High",
                "",
                "",
                "Capture a manual workflow and convert it into reusable XRAY-style test steps.",
                "Open the sample recorder page and start capturing interactions.",
                xrayTicket,
                steps
        );
    }
}
