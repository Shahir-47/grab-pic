package com.grabpic.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@Data
@AllArgsConstructor
public class PhotoResponse {
    private String id;
    private String viewUrl;

    @JsonProperty("isPublic")
    private boolean isPublic;

    private boolean processed;
    private int faceCount;
    private List<String> faceBoxes;
}