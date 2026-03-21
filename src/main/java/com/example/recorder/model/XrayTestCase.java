package com.example.recorder.model;

import java.util.List;

public class XrayTestCase {
    private final String summary;
    private final String priority;
    private final String primaryComponent;
    private final String secondaryComponent;
    private final String objective;
    private final String precondition;
    private final String xrayTicket;
    private final List<TestStep> steps;

    public XrayTestCase(String summary,
                        String priority,
                        String primaryComponent,
                        String secondaryComponent,
                        String objective,
                        String precondition,
                        String xrayTicket,
                        List<TestStep> steps) {
        this.summary = summary;
        this.priority = priority;
        this.primaryComponent = primaryComponent;
        this.secondaryComponent = secondaryComponent;
        this.objective = objective;
        this.precondition = precondition;
        this.xrayTicket = xrayTicket;
        this.steps = steps;
    }

    public String getSummary() {
        return summary;
    }

    public String getPriority() {
        return priority;
    }

    public String getPrimaryComponent() {
        return primaryComponent;
    }

    public String getSecondaryComponent() {
        return secondaryComponent;
    }

    public String getObjective() {
        return objective;
    }

    public String getPrecondition() {
        return precondition;
    }

    public String getXrayTicket() {
        return xrayTicket;
    }

    public List<TestStep> getSteps() {
        return steps;
    }
}
