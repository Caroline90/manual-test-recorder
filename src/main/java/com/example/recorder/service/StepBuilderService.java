package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class StepBuilderService {

    public List<TestStep> buildSteps(List<RecordedEvent> events) {
        List<TestStep> steps = new ArrayList<>();
        for (int i = 0; i < events.size(); i++) {
            steps.add(toStep(i + 1, events.get(i)));
        }
        return List.copyOf(steps);
    }

    private TestStep toStep(int index, RecordedEvent event) {
        String type = normalize(event.getType());
        return new TestStep(index, actionFor(type), targetFor(event), detailFor(type, event));
    }

    private String actionFor(String type) {
        return switch (type) {
            case "click" -> "Click";
            case "input", "type", "change" -> "Enter text";
            case "navigate" -> "Open page";
            case "assert" -> "Verify";
            default -> "Perform " + type;
        };
    }

    private String targetFor(RecordedEvent event) {
        if (hasText(event.getId())) {
            return "#" + event.getId();
        }
        if (hasText(event.getName())) {
            return "[name='" + event.getName() + "']";
        }
        if (hasText(event.getText())) {
            return event.getText();
        }
        if (hasText(event.getUrl())) {
            return event.getUrl();
        }
        return "unspecified target";
    }

    private String detailFor(String type, RecordedEvent event) {
        return switch (type) {
            case "input", "type", "change" -> hasText(event.getValue())
                    ? "Use value '" + event.getValue() + "'."
                    : "Provide the expected input value.";
            case "navigate" -> hasText(event.getUrl())
                    ? "Navigate to " + event.getUrl() + "."
                    : "Navigate to the desired page.";
            case "assert" -> hasText(event.getText())
                    ? "Confirm that '" + event.getText() + "' is visible."
                    : "Confirm the expected result.";
            default -> hasText(event.getText())
                    ? event.getText()
                    : "Record the observed interaction.";
        };
    }

    private String normalize(String value) {
        return value == null ? "unknown" : value.toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
