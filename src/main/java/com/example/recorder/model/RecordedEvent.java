package com.example.recorder.model;

public class RecordedEvent {
    private final String type;
    private final String text;
    private final String value;
    private final String id;
    private final String name;
    private final String url;

    public RecordedEvent(String type, String text, String value, String id, String name, String url) {
        this.type = type;
        this.text = text;
        this.value = value;
        this.id = id;
        this.name = name;
        this.url = url;
    }

    public String getType() {
        return type;
    }

    public String getText() {
        return text;
    }

    public String getValue() {
        return value;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getUrl() {
        return url;
    }

    @Override
    public String toString() {
        return "RecordedEvent{" +
                "type='" + type + '\'' +
                ", text='" + text + '\'' +
                ", value='" + value + '\'' +
                ", id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", url='" + url + '\'' +
                '}';
    }
}
