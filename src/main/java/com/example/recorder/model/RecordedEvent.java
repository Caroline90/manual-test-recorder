package com.example.recorder.model;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class RecordedEvent {
    @NotBlank
    private String type;
    private String text;
    private String value;
    private String id;
    private String name;
    private String url;
    private String selector;
    private String pageTitle;
    private String xrayTicket;
    private String screenshot;
    private Instant recordedAt;

    public RecordedEvent() {
    }

    public RecordedEvent(String type, String text, String value, String id, String name, String url) {
        this(type, text, value, id, name, url, null, null, null, null, null);
    }

    public RecordedEvent(String type, String text, String value, String id, String name, String url,
                         String selector, String pageTitle, String xrayTicket, String screenshot, Instant recordedAt) {
        this.type = type;
        this.text = text;
        this.value = value;
        this.id = id;
        this.name = name;
        this.url = url;
        this.selector = selector;
        this.pageTitle = pageTitle;
        this.xrayTicket = xrayTicket;
        this.screenshot = screenshot;
        this.recordedAt = recordedAt;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getSelector() {
        return selector;
    }

    public void setSelector(String selector) {
        this.selector = selector;
    }

    public String getPageTitle() {
        return pageTitle;
    }

    public void setPageTitle(String pageTitle) {
        this.pageTitle = pageTitle;
    }


    public String getXrayTicket() {
        return xrayTicket;
    }

    public void setXrayTicket(String xrayTicket) {
        this.xrayTicket = xrayTicket;
    }

    public String getScreenshot() {
        return screenshot;
    }

    public void setScreenshot(String screenshot) {
        this.screenshot = screenshot;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
}
