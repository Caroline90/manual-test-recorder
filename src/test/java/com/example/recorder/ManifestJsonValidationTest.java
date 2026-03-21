package com.example.recorder;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class ManifestJsonValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void manifestJsonParsesAsSingleJsonObject() throws Exception {
        String manifestContents = Files.readString(Path.of("manifest.json"));

        JsonNode manifest = objectMapper.readTree(manifestContents);

        assertThat(manifest.isObject()).isTrue();
        assertThat(manifest.path("manifest_version").asInt()).isEqualTo(3);
        assertThat(manifest.path("name").asText()).isEqualTo("Manual Test Recorder Picker");
    }
}
