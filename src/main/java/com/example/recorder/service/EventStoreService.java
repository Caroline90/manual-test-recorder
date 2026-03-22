package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class EventStoreService {

    private final List<RecordedEvent> recordedEvents = new ArrayList<>();

    public synchronized RecordedEvent append(RecordedEvent event) {
        validate(event);
        if (event.getRecordedAt() == null) {
            event.setRecordedAt(Instant.now());
        }
        recordedEvents.add(event);
        return event;
    }

    public synchronized List<RecordedEvent> getAll() {
        return List.copyOf(recordedEvents);
    }

    public synchronized RecordedEvent removeAt(int index) {
        if (index < 0 || index >= recordedEvents.size()) {
            throw new IllegalArgumentException("event index is out of range");
        }
        return recordedEvents.remove(index);
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
