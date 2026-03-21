package com.example.recorder;

import com.example.recorder.controller.TestController;
import com.example.recorder.model.RecordedEvent;
import com.example.recorder.model.TestStep;
import java.util.List;

public class ManualTestRecorderTestHarness {

    public static void main(String[] args) {
        testControllerStoresEventsAndCreatesSteps();
        testStoreRejectsMissingType();
        System.out.println("All manual-test-recorder checks passed.");
    }

    private static void testControllerStoresEventsAndCreatesSteps() {
        TestController controller = new TestController();
        controller.recordEvent(new RecordedEvent("navigate", "Login page", null, null, null, "https://example.com/login"));
        controller.recordEvent(new RecordedEvent("input", null, "tester@example.com", null, "email", null));
        controller.recordEvent(new RecordedEvent("assert", "Dashboard", null, null, null, null));

        List<TestStep> steps = controller.getSteps();

        require(controller.getEvents().size() == 3, "expected 3 recorded events");
        require(steps.size() == 3, "expected 3 generated steps");
        require("Open page".equals(steps.get(0).getAction()), "expected navigate to map to Open page");
        require("[name='email']".equals(steps.get(1).getTarget()), "expected input target to prefer name selector");
        require(steps.get(1).getDetail().contains("tester@example.com"), "expected input detail to include value");
        require("Verify".equals(steps.get(2).getAction()), "expected assert to map to Verify");
    }

    private static void testStoreRejectsMissingType() {
        TestController controller = new TestController();
        boolean failed = false;
        try {
            controller.recordEvent(new RecordedEvent(" ", null, null, null, null, null));
        } catch (IllegalArgumentException expected) {
            failed = true;
        }
        require(failed, "expected invalid event type to be rejected");
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
