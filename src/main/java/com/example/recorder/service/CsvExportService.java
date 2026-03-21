package com.example.recorder.service;

import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.util.List;
import java.util.StringJoiner;
import org.springframework.stereotype.Service;

@Service
public class CsvExportService {

    public String exportTestCase(XrayTestCase testCase) {
        return exportTestCase(testCase, false);
    }

    public String exportTestCaseWithScreenshots(XrayTestCase testCase) {
        return exportTestCase(testCase, true);
    }

    public String exportSteps(List<TestStep> steps) {
        return exportTestCase(new XrayTestCase(
                "XRAY test",
                "High",
                "",
                "",
                "",
                "",
                "",
                steps
        ));
    }

    private String exportTestCase(XrayTestCase testCase, boolean includeScreenshots) {
        StringJoiner joiner = new StringJoiner(System.lineSeparator());
        joiner.add(includeScreenshots
                ? "TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result;Screenshot"
                : "TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result");

        List<TestStep> steps = testCase.getSteps();
        for (int i = 0; i < steps.size(); i++) {
            TestStep step = steps.get(i);
            if (includeScreenshots) {
                joiner.add(String.join(";",
                        csv(1),
                        csv(i == 0 ? testCase.getSummary() : ""),
                        csv(i == 0 ? testCase.getPriority() : ""),
                        csv(i == 0 ? testCase.getPrimaryComponent() : ""),
                        csv(i == 0 ? testCase.getSecondaryComponent() : ""),
                        csv(step.getAction()),
                        csv(step.getData()),
                        csv(stepResult(step, i == steps.size() - 1)),
                        csv(screenshotReference(testCase, step))
                ));
            } else {
                joiner.add(String.join(";",
                        csv(1),
                        csv(i == 0 ? testCase.getSummary() : ""),
                        csv(i == 0 ? testCase.getPriority() : ""),
                        csv(i == 0 ? testCase.getPrimaryComponent() : ""),
                        csv(i == 0 ? testCase.getSecondaryComponent() : ""),
                        csv(step.getAction()),
                        csv(step.getData()),
                        csv(stepResult(step, i == steps.size() - 1))
                ));
            }
        }

        return joiner.toString();
    }

    private String screenshotReference(XrayTestCase testCase, TestStep step) {
        if (!hasText(step.getScreenshot())) {
            return "";
        }
        return "screenshots/" + screenshotFileName(testCase.getXrayTicket(), step.getIndex(), ".png");
    }

    public String screenshotFileName(String xrayTicket, int stepIndex, String extension) {
        String normalizedExtension = hasText(extension) ? extension : ".png";
        String prefix = sanitizeFileSegment(xrayTicket);
        String stepName = "step-" + String.format("%02d", stepIndex) + normalizedExtension;
        return prefix.isBlank() ? stepName : prefix + "-" + stepName;
    }

    private String sanitizeFileSegment(String value) {
        if (!hasText(value)) {
            return "";
        }
        return value.trim()
                .replaceAll("[^A-Za-z0-9._-]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-|-$)", "")
                .toLowerCase();
    }

    private String stepResult(TestStep step, boolean isLastStep) {
        if (hasText(step.getExpectedResult()) && (isLastStep || step.getAction().startsWith("Verify"))) {
            return step.getExpectedResult();
        }
        return "";
    }

    private String csv(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return '"' + text.replace("\"", "\"\"") + '"';
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
