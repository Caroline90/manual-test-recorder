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
        for (int i = events.size() - 1, index = 1; i >= 0; i--, index++) {
            steps.add(toStep(index, events.get(i)));
        }
        return List.copyOf(steps);
    }

    private TestStep toStep(int index, RecordedEvent event) {
        String type = normalize(event.getType());
        return new TestStep(
                index,
                actionFor(type, event),
                targetFor(event),
                detailFor(type, event),
                dataFor(type, event),
                expectedResultFor(type, event),
                event.getScreenshot()
        );
    }

    private String actionFor(String type, RecordedEvent event) {
        return switch (type) {
            case "click" -> hasText(event.getText())
                    ? "Click " + describeElement(event)
                    : "Click target element";
            case "input", "type", "change" -> hasText(event.getText())
                    ? "Enter " + lowerCaseFirst(event.getText())
                    : hasText(event.getName())
                    ? "Enter " + event.getName()
                    : "Enter data";
            case "navigate" -> hasText(event.getText())
                    ? "Go to " + lowerCaseFirst(event.getText())
                    : hasText(event.getPageTitle())
                    ? "Go to " + lowerCaseFirst(event.getPageTitle())
                    : "Open page";
            case "assert" -> hasText(event.getText())
                    ? "Verify " + event.getText()
                    : "Verify expected result";
            default -> "Perform " + type;
        };
    }

    private String targetFor(RecordedEvent event) {
        if (hasText(event.getSelector())) {
            return event.getSelector();
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
        String detail = switch (type) {
            case "click" -> hasText(event.getText())
                    ? "Activate " + describeElement(event) + "."
                    : "Click the target element.";
            case "input", "type", "change" -> hasText(event.getValue())
                    ? "Enter '" + event.getValue() + "' into " + describeField(event) + "."
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
        return appendIframeContext(detail, event);
    }

    private String dataFor(String type, RecordedEvent event) {
        return switch (type) {
            case "input", "type", "change" -> defaultText(event.getValue());
            default -> "";
        };
    }

    private String expectedResultFor(String type, RecordedEvent event) {
        return switch (type) {
            case "click" -> hasText(event.getText())
                    ? "The action for '" + event.getText() + "' is triggered successfully."
                    : "The click action completes successfully.";
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

    private String describeElement(RecordedEvent event) {
        if (hasText(event.getText()) && hasText(event.getSelector())) {
            return lowerCaseFirst(event.getText()) + " " + selectorLabel(event.getSelector());
        }
        if (hasText(event.getText())) {
            return event.getText();
        }
        if (hasText(event.getSelector())) {
            return selectorLabel(event.getSelector());
        }
        return "the target element";
    }

    private String selectorLabel(String selector) {
        if (!hasText(selector)) {
            return "element";
        }
        if (selector.startsWith("[name='") && selector.endsWith("']")) {
            return "field";
        }
        if (selector.contains("button")) {
            return "button";
        }
        return "element";
    }

    private String describeField(RecordedEvent event) {
        if (hasText(event.getText())) {
            return lowerCaseFirst(event.getText()) + " field";
        }
        if (hasText(event.getName())) {
            return event.getName() + " field";
        }
        return "the field";
    }

    private String appendIframeContext(String detail, RecordedEvent event) {
        if (!hasText(event.getSelector()) || !event.getSelector().contains(">>>")) {
            return detail;
        }

        String frameContext = event.getSelector().split(">>>", 2)[0].trim();
        if (!hasText(frameContext)) {
            return detail;
        }
        return detail + " In iframe context " + frameContext + ".";
    }

    private String lowerCaseFirst(String value) {
        if (!hasText(value)) {
            return "";
        }
        return value.substring(0, 1).toLowerCase(Locale.ROOT) + value.substring(1);
    }

    private String defaultText(String value) {
        return hasText(value) ? value : "";
    }

    private String normalize(String value) {
        return value == null ? "unknown" : value.toLowerCase(Locale.ROOT);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
