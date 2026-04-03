package com.example.recorder.service;

import com.example.recorder.model.AiTestPlanRequest;
import com.example.recorder.model.AiTestPlanResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AiTestPlanningService {

    public AiTestPlanResponse buildPlan(AiTestPlanRequest request) {
        String project = normalize(request.getProjectName(), "Unnamed project");
        String feature = normalize(request.getFeatureDescription(), "core business flow");
        String languages = normalize(request.getLanguages(), "any language");
        String testTypes = normalize(request.getTestTypes(), "manual and automated");
        String systemType = normalize(request.getSystemType(), "frontend and backend");

        String mission = "Create risk-driven QA coverage for " + project + " focusing on " + feature
                + ", supporting " + languages + " and " + testTypes + " across " + systemType + ".";

        String aiPromptTemplate = "Act as a senior QA architect. Build a prioritized test strategy for " + project
                + ". Feature: " + feature + ". Languages/stack: " + languages + ". Testing mode: " + testTypes
                + ". System type: " + systemType + ". Return: 1) risks, 2) manual exploratory charters, "
                + "3) automation candidates (API/UI/component), 4) test data ideas, 5) CI/CD gates.";

        List<String> manualFocus = List.of(
                "Exploratory charter: validate happy path, edge cases, and failure recovery around " + feature + ".",
                "Use AI to generate negative test ideas from requirement ambiguities and unusual user behaviors.",
                "Run accessibility, usability, and localization checks for critical screens.",
                "Capture session notes and screenshots to convert findings into reproducible bug reports."
        );

        List<String> automatedFocus = List.of(
                "Create API contract tests for success, validation error, and authorization scenarios.",
                "Generate UI regression tests for stable end-to-end journeys while keeping flaky selectors out.",
                "Add component/service tests to cover logic branches and guard conditions.",
                "Use AI-generated fixtures to expand boundary and equivalence class coverage."
        );

        List<String> backendChecks = List.of(
                "Validate request/response schemas, idempotency, and backward compatibility.",
                "Stress critical endpoints with concurrency and rate-limiting scenarios.",
                "Verify observability: logs, traces, and actionable error messages.",
                "Check data integrity rules across create/update/delete flows."
        );

        List<String> frontendChecks = List.of(
                "Verify rendering, state transitions, and client-side validation behavior.",
                "Test cross-browser behavior and responsive layouts for high-traffic pages.",
                "Confirm robust error handling for network latency, timeouts, and partial failures.",
                "Ensure keyboard navigation and assistive technology compatibility."
        );

        List<String> crossPlatformChecks = List.of(
                "Map each requirement to at least one manual and one automatable scenario.",
                "Keep framework-agnostic test design so teams can implement in any language/toolchain.",
                "Gate releases with smoke + regression + non-functional checks in CI.",
                "Track escaped defects and use AI-assisted retrospectives to refine future coverage."
        );

        return new AiTestPlanResponse(
                mission,
                aiPromptTemplate,
                manualFocus,
                automatedFocus,
                backendChecks,
                frontendChecks,
                crossPlatformChecks
        );
    }

    private String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
