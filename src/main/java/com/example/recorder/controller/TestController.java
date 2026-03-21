package com.example.recorder.controller;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import com.example.recorder.service.EventStoreService;
import com.example.recorder.service.StepBuilderService;
import java.util.List;

public class TestController {

    private final EventStoreService eventStoreService;
    private final StepBuilderService stepBuilderService;

    public TestController() {
        this(new EventStoreService(), new StepBuilderService());
    }

    public TestController(EventStoreService eventStoreService, StepBuilderService stepBuilderService) {
        this.eventStoreService = eventStoreService;
        this.stepBuilderService = stepBuilderService;
    }

    public RecordedEvent recordEvent(RecordedEvent event) {
        return eventStoreService.append(event);
    }

    public List<RecordedEvent> getEvents() {
        return eventStoreService.getAll();
    }

    public List<TestStep> getSteps() {
        return stepBuilderService.buildSteps(eventStoreService.getAll());
    }

    public void clearEvents() {
        eventStoreService.clear();
    }
}
