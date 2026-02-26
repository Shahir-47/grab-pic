package com.grabpic.api.dto;

import java.util.List;

public class UploadUrlRequest {
    private List<Long> fileSizes;

    public UploadUrlRequest() {}

    public List<Long> getFileSizes() {
        return fileSizes;
    }

    public void setFileSizes(List<Long> fileSizes) {
        this.fileSizes = fileSizes;
    }
}
