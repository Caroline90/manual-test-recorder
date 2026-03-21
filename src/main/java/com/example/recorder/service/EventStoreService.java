package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import java.util.ArrayList;
import java.util.List;

public class EventStoreService {

    private final List<RecordedEvent> recordedEvents = new ArrayList<>();

    public synchronized RecordedEvent append(RecordedEvent event) {
        validate(event);
        recordedEvents.add(event);
        return event;
    }

    public synchronized List<RecordedEvent> getAll() {
        return List.copyOf(recordedEvents);
    }

    public synchronized void clear() {
        recordedEvents.clear();
    }

    private void validate(RecordedEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("event is required");
        }
        if (event.getType() == null || event.getType().isBlank()) {
            throw new IllegalArgumentException("event type is required");
        }
    }
}
