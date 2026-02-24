package com.grabpic.api.dto;

import lombok.Data;
import java.util.List;

@Data
public class PhotoSaveRequest {
    private List<PhotoItem> photos;

    @Data
    public static class PhotoItem {
        private String storageUrl;
        private boolean isPublic;
    }
}