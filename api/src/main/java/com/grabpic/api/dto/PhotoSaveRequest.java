package com.grabpic.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class PhotoSaveRequest {
    private List<PhotoItem> photos;

    @Data
    public static class PhotoItem {
        private String storageUrl;

        @JsonProperty("isPublic")
        private boolean isPublic;
    }
}
