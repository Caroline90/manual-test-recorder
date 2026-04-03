package com.example.recorder.model;

import java.util.List;

public class AiTestPlanResponse {
    private String mission;
    private String aiPromptTemplate;
    private List<String> manualTestingFocus;
    private List<String> automatedTestingFocus;
    private List<String> backendChecks;
    private List<String> frontendChecks;
    private List<String> crossPlatformChecks;

    public AiTestPlanResponse(String mission,
                              String aiPromptTemplate,
                              List<String> manualTestingFocus,
                              List<String> automatedTestingFocus,
                              List<String> backendChecks,
                              List<String> frontendChecks,
                              List<String> crossPlatformChecks) {
        this.mission = mission;
        this.aiPromptTemplate = aiPromptTemplate;
        this.manualTestingFocus = manualTestingFocus;
        this.automatedTestingFocus = automatedTestingFocus;
        this.backendChecks = backendChecks;
        this.frontendChecks = frontendChecks;
        this.crossPlatformChecks = crossPlatformChecks;
    }

    public String getMission() {
        return mission;
    }

    public String getAiPromptTemplate() {
        return aiPromptTemplate;
    }

    public List<String> getManualTestingFocus() {
        return manualTestingFocus;
    }

    public List<String> getAutomatedTestingFocus() {
        return automatedTestingFocus;
    }

    public List<String> getBackendChecks() {
        return backendChecks;
    }

    public List<String> getFrontendChecks() {
        return frontendChecks;
    }

    public List<String> getCrossPlatformChecks() {
        return crossPlatformChecks;
    }
}
