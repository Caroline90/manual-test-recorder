package com.example.recorder.service;

import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
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
        return new TestStep(
                index,
                actionFor(type),
                targetFor(event),
                detailFor(type, event),
                expectedResultFor(type, event)
        );
    }

    private String actionFor(String type) {
        return switch (type) {
            case "click" -> "Click";
            case "pick" -> "Select element";
            case "input", "type", "change" -> "Enter data";
            case "navigate" -> "Open page";
            case "assert" -> "Verify";
            default -> "Perform " + type;
        };
    }

    private String targetFor(RecordedEvent event) {
        if (hasText(event.getSelector())) {
            return event.getSelector();
        }
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
            case "click" -> hasText(event.getText())
                    ? "Click the element labelled '" + event.getText() + "'."
                    : "Click the target element.";
            case "pick" -> hasText(event.getText())
                    ? "Use the Chrome extension picker to capture the element '" + event.getText() + "'."
                    : "Use the Chrome extension picker to capture the target element.";
            case "input", "type", "change" -> hasText(event.getValue())
                    ? "Enter '" + event.getValue() + "' into the field."
                    : "Provide the required input value.";
            case "navigate" -> hasText(event.getUrl())
                    ? "Navigate to " + event.getUrl() + "."
                    : "Open the desired page.";
            case "assert" -> hasText(event.getText())
                    ? "Check that '" + event.getText() + "' is displayed."
                    : "Review the expected outcome.";
            default -> hasText(event.getText())
                    ? event.getText()
                    : "Record the observed interaction.";
        };
    }

    private String expectedResultFor(String type, RecordedEvent event) {
        return switch (type) {
            case "click" -> hasText(event.getText())
                    ? "The action for '" + event.getText() + "' is triggered successfully."
                    : "The click action completes successfully.";
            case "pick" -> hasText(event.getSelector())
                    ? "The element " + event.getSelector() + " is highlighted and captured as a manual test step."
                    : "The selected element is highlighted and captured as a manual test step.";
            case "input", "type", "change" -> "The entered value is accepted and visible in the field.";
            case "navigate" -> hasText(event.getPageTitle())
                    ? "The page '" + event.getPageTitle() + "' is displayed."
                    : "The requested page is displayed.";
            case "assert" -> hasText(event.getText())
                    ? "'" + event.getText() + "' is visible to the tester."
                    : "The expected result is confirmed.";
            default -> "The interaction completes without errors.";
        };
    }

    private String normalize(String value) {
        return value == null ? "unknown" : value.toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
