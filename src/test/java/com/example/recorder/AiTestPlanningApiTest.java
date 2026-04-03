package com.example.recorder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AiTestPlanningApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void generatesAiQaPlanForManualAndAutomationCoverage() throws Exception {
        mockMvc.perform(post("/api/ai/test-plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "Unified QA Assistant",
                                  "featureDescription": "checkout and payment",
                                  "languages": "Java, JavaScript, Python",
                                  "testTypes": "manual and automated",
                                  "systemType": "frontend, backend, API"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("risk-driven QA coverage")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("manualTestingFocus")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("automatedTestingFocus")));
    }

    @Test
    void rejectsIncompleteRequest() throws Exception {
        mockMvc.perform(post("/api/ai/test-plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "projectName": "",
                                  "featureDescription": ""
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}
