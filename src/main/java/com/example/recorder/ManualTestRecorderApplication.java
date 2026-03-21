package com.example.recorder;

import com.example.recorder.controller.TestController;
import com.example.recorder.model.RecordedEvent;

public class ManualTestRecorderApplication {

    public static void main(String[] args) {
        TestController controller = new TestController();
        controller.recordEvent(new RecordedEvent("navigate", "Login page", null, null, null, "https://example.com/login"));
        controller.recordEvent(new RecordedEvent("input", null, "qa@example.com", null, "email", null));

        System.out.println("Recorded events: " + controller.getEvents().size());
        controller.getSteps().forEach(System.out::println);
    }
}
