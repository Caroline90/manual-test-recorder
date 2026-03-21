package com.example.recorder.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class ApiDocumentationController {

    @GetMapping("/swagger-ui.html")
    public String swaggerUiRedirect() {
        return "redirect:/swagger-ui/index.html";
    }

    @GetMapping("/v3/api-docs")
    @ResponseBody
    public Map<String, Object> openApiDocument() {
        Map<String, Object> info = mapOf(
                "title", "Manual Test Recorder API",
                "version", "1.0.0",
                "description", "REST API for recording browser actions and generating XRAY-ready test documentation."
        );

        Map<String, Object> recordedEventSchema = mapOf(
                "type", "object",
                "required", List.of("type"),
                "properties", mapOf(
                        "type", stringSchema("Event type such as click, input, navigate, or assert."),
                        "text", nullableStringSchema("Human-readable label captured from the page."),
                        "value", nullableStringSchema("Entered value or event payload."),
                        "id", nullableStringSchema("Element id, when available."),
                        "name", nullableStringSchema("Element name attribute, when available."),
                        "url", nullableStringSchema("Page URL where the event was recorded."),
                        "selector", nullableStringSchema("CSS selector representing the target element."),
                        "pageTitle", nullableStringSchema("Browser tab title."),
                        "xrayTicket", nullableStringSchema("XRAY ticket number associated with the recording."),
                        "screenshot", nullableStringSchema("Base64 data URL screenshot captured for the event."),
                        "recordedAt", mapOf(
                                "type", "string",
                                "format", "date-time",
                                "nullable", true,
                                "description", "Timestamp when the event was stored."
                        )
                )
        );

        Map<String, Object> testStepSchema = mapOf(
                "type", "object",
                "properties", mapOf(
                        "index", mapOf("type", "integer", "format", "int32"),
                        "action", stringSchema("Action written for the manual test step."),
                        "target", stringSchema("Target element or page area."),
                        "detail", stringSchema("Additional implementation detail for the step."),
                        "data", stringSchema("Input data used in the step."),
                        "expectedResult", stringSchema("Expected result documented for the step."),
                        "screenshot", nullableStringSchema("Associated screenshot data URL.")
                )
        );

        Map<String, Object> xrayTestCaseSchema = mapOf(
                "type", "object",
                "properties", mapOf(
                        "summary", stringSchema("XRAY test summary."),
                        "priority", stringSchema("Priority label."),
                        "primaryComponent", stringSchema("Primary component."),
                        "secondaryComponent", stringSchema("Secondary component."),
                        "objective", stringSchema("Objective for the test case."),
                        "precondition", stringSchema("Precondition for the test case."),
                        "xrayTicket", nullableStringSchema("XRAY ticket number associated with the export."),
                        "steps", mapOf(
                                "type", "array",
                                "items", mapOf("$ref", "#/components/schemas/TestStep")
                        )
                )
        );

        Map<String, Object> paths = new LinkedHashMap<>();
        paths.put("/api/events", mapOf(
                "get", operation(
                        "listEvents",
                        "List recorded events",
                        List.of(),
                        jsonResponse("Recorded events", arrayRef("RecordedEvent"))
                ),
                "post", operation(
                        "recordEvent",
                        "Record a browser event",
                        List.of(),
                        jsonRequestBody("Event payload to store.", ref("RecordedEvent")),
                        jsonResponse("Stored event", ref("RecordedEvent"))
                ),
                "delete", operation(
                        "clearEvents",
                        "Clear all recorded events",
                        List.of(),
                        noContentResponse("Recorded events cleared.")
                )
        ));
        paths.put("/api/steps", mapOf(
                "get", operation(
                        "listSteps",
                        "Build XRAY-style test steps",
                        List.of(),
                        jsonResponse("Generated test steps", arrayRef("TestStep"))
                )
        ));
        paths.put("/api/xray", mapOf(
                "get", operation(
                        "getXrayDocumentation",
                        "Build the XRAY test case document",
                        List.of(),
                        jsonResponse("XRAY test case", ref("XrayTestCase"))
                )
        ));
        paths.put("/api/steps.csv", mapOf(
                "get", operation(
                        "exportStepsCsv",
                        "Export XRAY test steps as CSV",
                        List.of(),
                        fileResponse("CSV export", "text/csv")
                )
        ));
        paths.put("/api/steps-with-screenshots.csv", mapOf(
                "get", operation(
                        "exportStepsWithScreenshotsCsv",
                        "Export XRAY test steps as CSV with screenshot file references",
                        List.of(),
                        fileResponse("CSV export with screenshot references", "text/csv")
                )
        ));
        paths.put("/api/xray-evidence.zip", mapOf(
                "get", operation(
                        "exportXrayEvidenceBundle",
                        "Export XRAY CSV plus screenshot evidence bundle",
                        List.of(),
                        fileResponse("ZIP bundle containing CSV exports and screenshots", "application/zip")
                )
        ));

        return mapOf(
                "openapi", "3.0.1",
                "info", info,
                "servers", List.of(mapOf("url", "/")),
                "paths", paths,
                "components", mapOf(
                        "schemas", mapOf(
                                "RecordedEvent", recordedEventSchema,
                                "TestStep", testStepSchema,
                                "XrayTestCase", xrayTestCaseSchema
                        )
                )
        );
    }

    private Map<String, Object> operation(String operationId,
                                          String summary,
                                          List<Map<String, Object>> tags,
                                          Map<String, Object>... entries) {
        Map<String, Object> operation = new LinkedHashMap<>();
        operation.put("operationId", operationId);
        operation.put("summary", summary);
        if (!tags.isEmpty()) {
            operation.put("tags", tags);
        }
        for (Map<String, Object> entry : entries) {
            operation.putAll(entry);
        }
        return operation;
    }

    private Map<String, Object> jsonRequestBody(String description, Map<String, Object> schema) {
        return mapOf(
                "requestBody", mapOf(
                        "required", true,
                        "description", description,
                        "content", mapOf(
                                "application/json", mapOf(
                                        "schema", schema
                                )
                        )
                )
        );
    }


    private Map<String, Object> fileResponse(String description, String contentType) {
        return mapOf(
                "responses", mapOf(
                        "200", mapOf(
                                "description", description,
                                "content", mapOf(
                                        contentType, mapOf(
                                                "schema", mapOf("type", "string", "format", "binary")
                                        )
                                )
                        )
                )
        );
    }

    private Map<String, Object> jsonResponse(String description, Map<String, Object> schema) {
        return mapOf(
                "responses", mapOf(
                        "200", mapOf(
                                "description", description,
                                "content", mapOf(
                                        "application/json", mapOf(
                                                "schema", schema
                                        )
                                )
                        )
                )
        );
    }

    private Map<String, Object> noContentResponse(String description) {
        return mapOf(
                "responses", mapOf(
                        "200", mapOf("description", description)
                )
        );
    }

    private Map<String, Object> ref(String schemaName) {
        return mapOf("$ref", "#/components/schemas/" + schemaName);
    }

    private Map<String, Object> arrayRef(String schemaName) {
        return mapOf(
                "type", "array",
                "items", ref(schemaName)
        );
    }

    private Map<String, Object> stringSchema(String description) {
        return mapOf(
                "type", "string",
                "description", description
        );
    }

    private Map<String, Object> nullableStringSchema(String description) {
        return mapOf(
                "type", "string",
                "nullable", true,
                "description", description
        );
    }

    private Map<String, Object> mapOf(Object... entries) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int index = 0; index < entries.length; index += 2) {
            map.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return map;
    }
}
