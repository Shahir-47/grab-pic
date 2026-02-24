package com.grabpic.api.controller;

import com.grabpic.api.service.S3StorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/albums")
@CrossOrigin(origins = "http://localhost:3000")
public class AlbumController {

    private final S3StorageService s3StorageService;

    public AlbumController(S3StorageService s3StorageService) {
        this.s3StorageService = s3StorageService;
    }

    @GetMapping("/{albumId}/upload-urls")
    public ResponseEntity<List<String>> getUploadUrls(
            @PathVariable UUID albumId,
            @RequestParam(defaultValue = "1") int count) {

        // Safety check to prevent someone requesting a million URLs at once
        if (count > 10000) {
            return ResponseEntity.badRequest().build();
        }

        List<String> presignedUrls = s3StorageService.generateBatchUploadUrls(albumId, count);
        return ResponseEntity.ok(presignedUrls);
    }
}