package com.example.recorder.model;

public class TestStep {
    private final int index;
    private final String action;
    private final String target;
    private final String detail;
    private final String data;
    private final String expectedResult;
    private final String screenshot;

    public TestStep(int index, String action, String target, String detail, String data, String expectedResult,
                    String screenshot) {
        this.index = index;
        this.action = action;
        this.target = target;
        this.detail = detail;
        this.data = data;
        this.expectedResult = expectedResult;
        this.screenshot = screenshot;
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

    public String getData() {
        return data;
    }

    public String getExpectedResult() {
        return expectedResult;
    }

    public String getScreenshot() {
        return screenshot;
    }
}
