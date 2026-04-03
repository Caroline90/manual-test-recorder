package com.example.recorder.model;

import jakarta.validation.constraints.NotBlank;

public class AiTestPlanRequest {

    @NotBlank
    private String projectName;

    @NotBlank
    private String featureDescription;

    private String languages;
    private String testTypes;
    private String systemType;

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public String getFeatureDescription() {
        return featureDescription;
    }

    public void setFeatureDescription(String featureDescription) {
        this.featureDescription = featureDescription;
    }

    public String getLanguages() {
        return languages;
    }

    public void setLanguages(String languages) {
        this.languages = languages;
    }

    public String getTestTypes() {
        return testTypes;
    }

    public void setTestTypes(String testTypes) {
        this.testTypes = testTypes;
    }

    public String getSystemType() {
        return systemType;
    }

    public void setSystemType(String systemType) {
        this.systemType = systemType;
    }
}
