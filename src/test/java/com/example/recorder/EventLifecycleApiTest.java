package com.example.recorder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class EventLifecycleApiTest {

    @Autowired
    private MockMvc mockMvc;

    @BeforeEach
    void clearExistingEvents() throws Exception {
        mockMvc.perform(delete("/api/events"))
                .andExpect(status().isOk());
    }

    @Test
    void deletesRecordedEvents() throws Exception {
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "click",
                                  "text": "Login",
                                  "url": "http://localhost:8090/login",
                                  "selector": "button"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        [
                          {
                            "type": "click",
                            "text": "Login",
                            "url": "http://localhost:8090/login",
                            "selector": "button"
                          }
                        ]
                        """, false));

        mockMvc.perform(delete("/api/events"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));

        mockMvc.perform(get("/api/events"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }
}
