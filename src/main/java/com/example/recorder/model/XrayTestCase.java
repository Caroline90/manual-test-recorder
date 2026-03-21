package com.example.recorder.model;

import java.util.List;

public class XrayTestCase {
    private final String summary;
    private final String objective;
    private final String precondition;
    private final List<TestStep> steps;

    public XrayTestCase(String summary, String objective, String precondition, List<TestStep> steps) {
        this.summary = summary;
        this.objective = objective;
        this.precondition = precondition;
        this.steps = steps;
    }

    public String getSummary() {
        return summary;
    }

    public String getObjective() {
        return objective;
    }

    public String getPrecondition() {
        return precondition;
    }

    public List<TestStep> getSteps() {
        return steps;
    }
}
