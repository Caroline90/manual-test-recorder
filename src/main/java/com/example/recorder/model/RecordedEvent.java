package com.example.recorder.model;

import lombok.Data;

@Data
public class RecordedEvent {
    private String type;
    private String text;
    private String value;
    private String id;
    private String name;
    private String url;
}