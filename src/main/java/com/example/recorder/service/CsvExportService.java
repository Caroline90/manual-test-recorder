package com.example.recorder.service;

import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.util.List;
import java.util.StringJoiner;
import org.springframework.stereotype.Service;

@Service
public class CsvExportService {

    public String exportTestCase(XrayTestCase testCase) {
        StringJoiner joiner = new StringJoiner(System.lineSeparator());
        joiner.add("TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result");

        List<TestStep> steps = testCase.getSteps();
        for (int i = 0; i < steps.size(); i++) {
            TestStep step = steps.get(i);
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

        return joiner.toString();
    }

    public String exportSteps(List<TestStep> steps) {
        return exportTestCase(new XrayTestCase(
                "XRAY test",
                "High",
                "",
                "",
                "",
                "",
                steps
        ));
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
