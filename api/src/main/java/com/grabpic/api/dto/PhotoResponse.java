package com.grabpic.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PhotoResponse {
    private String id;
    private String viewUrl;
    private boolean isPublic;
    private boolean processed;
}