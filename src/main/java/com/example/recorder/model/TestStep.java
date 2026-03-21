package com.example.recorder.model;

public class TestStep {
    private final int index;
    private final String action;
    private final String target;
    private final String detail;
    private final String expectedResult;

    public TestStep(int index, String action, String target, String detail, String expectedResult) {
        this.index = index;
        this.action = action;
        this.target = target;
        this.detail = detail;
        this.expectedResult = expectedResult;
    }

    public int getIndex() {
        return index;
    }

    public String getAction() {
        return action;
    }

    public String getTarget() {
        return target;
    }

    public String getDetail() {
        return detail;
    }

    public String getExpectedResult() {
        return expectedResult;
    }
}
