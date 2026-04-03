package com.example.recorder.controller;

import com.example.recorder.model.AiTestPlanRequest;
import com.example.recorder.model.AiTestPlanResponse;
import com.example.recorder.service.AiTestPlanningService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiTestPlanningController {

    private final AiTestPlanningService aiTestPlanningService;

    public AiTestPlanningController(AiTestPlanningService aiTestPlanningService) {
        this.aiTestPlanningService = aiTestPlanningService;
    }

    @PostMapping("/test-plan")
    public AiTestPlanResponse buildTestPlan(@Valid @RequestBody AiTestPlanRequest request) {
        return aiTestPlanningService.buildPlan(request);
    }
}
