package com.example.recorder.service;

import com.example.recorder.model.TestStep;
import com.example.recorder.model.XrayTestCase;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Service;

@Service
public class XrayEvidenceExportService {

    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:(image/[^;]+);base64,(.+)$");

    private final CsvExportService csvExportService;

    public XrayEvidenceExportService(CsvExportService csvExportService) {
        this.csvExportService = csvExportService;
    }

    public byte[] exportBundle(XrayTestCase testCase) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
                addTextEntry(zip, "xray-steps.csv", csvExportService.exportTestCase(testCase));
                addTextEntry(zip, "xray-steps-with-screenshots.csv",
                        csvExportService.exportTestCaseWithScreenshots(testCase));
                addTextEntry(zip, "README.txt", buildReadme(testCase));
                addScreenshots(zip, testCase);
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to build XRAY evidence export.", exception);
        }
    }

    private void addScreenshots(ZipOutputStream zip, XrayTestCase testCase) throws IOException {
        List<TestStep> steps = testCase.getSteps();
        for (TestStep step : steps) {
            if (!hasText(step.getScreenshot())) {
                continue;
            }

            byte[] screenshotBytes = decodeScreenshot(step.getScreenshot());
            String extension = fileExtension(step.getScreenshot());
            ZipEntry entry = new ZipEntry("screenshots/"
                    + csvExportService.screenshotFileName(testCase.getXrayTicket(), step.getIndex(), extension));
            zip.putNextEntry(entry);
            zip.write(screenshotBytes);
            zip.closeEntry();
        }
    }

    private void addTextEntry(ZipOutputStream zip, String name, String content) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        zip.putNextEntry(entry);
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private byte[] decodeScreenshot(String screenshot) {
        Matcher matcher = DATA_URL_PATTERN.matcher(screenshot);
        if (matcher.matches()) {
            return Base64.getDecoder().decode(matcher.group(2));
        }
        return screenshot.getBytes(StandardCharsets.UTF_8);
    }

    private String fileExtension(String screenshot) {
        Matcher matcher = DATA_URL_PATTERN.matcher(screenshot);
        if (!matcher.matches()) {
            return ".txt";
        }
        return switch (matcher.group(1)) {
            case "image/jpeg" -> ".jpg";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".png";
        };
    }

    private String buildReadme(XrayTestCase testCase) {
        List<TestStep> steps = testCase.getSteps();
        long screenshotCount = steps.stream().filter(step -> hasText(step.getScreenshot())).count();
        return String.join(System.lineSeparator(),
                "XRAY screenshot export",
                hasText(testCase.getXrayTicket()) ? "Ticket: " + testCase.getXrayTicket() : "Ticket: not provided",
                "",
                "Files included:",
                "- xray-steps.csv: standard CSV import without screenshot references.",
                "- xray-steps-with-screenshots.csv: same rows plus a Screenshot column referencing files in /screenshots.",
                "- screenshots/: image evidence captured by the Chrome extension.",
                "",
                "Recommended XRAY workflow:",
                "1. Import xray-steps.csv or xray-steps-with-screenshots.csv into XRAY to create the manual test.",
                "2. Open the created test issue in Jira/XRAY.",
                "3. Upload the files from the screenshots folder as issue attachments or add them to the test execution evidence.",
                "4. Use the Screenshot column values to match each step to the correct image file.",
                "",
                "Captured screenshot files: " + screenshotCount);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
