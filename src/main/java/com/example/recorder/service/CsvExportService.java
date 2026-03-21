package com.example.recorder.service;

import com.example.recorder.model.TestStep;
import java.util.List;
import java.util.StringJoiner;
import org.springframework.stereotype.Service;

@Service
public class CsvExportService {

    public String exportSteps(List<TestStep> steps) {
        StringJoiner joiner = new StringJoiner(System.lineSeparator());
        joiner.add("Step,Action,Target,Detail,Expected Result");
        for (TestStep step : steps) {
            joiner.add(String.join(",",
                    csv(step.getIndex()),
                    csv(step.getAction()),
                    csv(step.getTarget()),
                    csv(step.getDetail()),
                    csv(step.getExpectedResult())
            ));
        }
        return joiner.toString();
    }

    private String csv(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return '"' + text.replace("\"", "\"\"") + '"';
    }
}
