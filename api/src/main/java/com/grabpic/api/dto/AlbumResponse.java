package com.grabpic.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AlbumResponse {
    private String id;
    private String title;
    private String createdAt;
}
