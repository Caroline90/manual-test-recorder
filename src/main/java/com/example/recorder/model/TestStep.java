package com.example.recorder.model;

public class TestStep {
    private final int index;
    private final String action;
    private final String target;
    private final String detail;

    public TestStep(int index, String action, String target, String detail) {
        this.index = index;
        this.action = action;
        this.target = target;
        this.detail = detail;
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

    @Override
    public String toString() {
        return "TestStep{" +
                "index=" + index +
                ", action='" + action + '\'' +
                ", target='" + target + '\'' +
                ", detail='" + detail + '\'' +
                '}';
    }
}
