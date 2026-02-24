package com.grabpic.api.controller;

import com.grabpic.api.dto.PhotoSaveRequest;
import com.grabpic.api.model.AccessMode;
import com.grabpic.api.model.Photo;
import com.grabpic.api.model.SharedAlbum;
import com.grabpic.api.repository.PhotoRepository;
import com.grabpic.api.repository.SharedAlbumRepository;
import com.grabpic.api.service.S3StorageService;
import com.grabpic.api.service.SqsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/albums")
@CrossOrigin(origins = "http://localhost:3000")
public class AlbumController {

    private final S3StorageService s3StorageService;
    private final SharedAlbumRepository albumRepository;
    private final PhotoRepository photoRepository;
    private final SqsService sqsService;

    public AlbumController(S3StorageService s3StorageService,
                           SharedAlbumRepository albumRepository,
                           PhotoRepository photoRepository,
                           SqsService sqsService) {
        this.s3StorageService = s3StorageService;
        this.albumRepository = albumRepository;
        this.photoRepository = photoRepository;
        this.sqsService = sqsService;
    }

    @PostMapping
    public ResponseEntity<SharedAlbum> createAlbum(
            @RequestBody com.grabpic.api.dto.AlbumCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        SharedAlbum album = new SharedAlbum();
        album.setTitle(request.getTitle());

        album.setHostId(jwt.getSubject());

        SharedAlbum savedAlbum = albumRepository.save(album);
        return ResponseEntity.ok(savedAlbum);
    }

    @GetMapping
    public ResponseEntity<List<SharedAlbum>> getAllAlbums(@AuthenticationPrincipal Jwt jwt) {
        String hostId = jwt.getSubject();
        return ResponseEntity.ok(albumRepository.findByHostId(hostId));
    }
    
    @GetMapping("/{albumId}/upload-urls")
    public ResponseEntity<List<String>> getUploadUrls(
            @PathVariable UUID albumId,
            @RequestParam(defaultValue = "1") int count) {

        if (count > 10000) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(s3StorageService.generateBatchUploadUrls(albumId, count));
    }

    @PostMapping("/{albumId}/photos")
    public ResponseEntity<?> saveUploadedPhotos(@PathVariable UUID albumId,
                                                @RequestBody PhotoSaveRequest request) {

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SharedAlbum album = albumOpt.get();
        List<Photo> photosToSave = new ArrayList<>();

        for (PhotoSaveRequest.PhotoItem item : request.getPhotos()) {
            Photo photo = new Photo();
            photo.setAlbum(album);
            photo.setStorageUrl(item.getStorageUrl());
            photo.setAccessMode(item.isPublic() ? AccessMode.PUBLIC : AccessMode.PROTECTED);
            photo.setProcessed(false);

            photosToSave.add(photo);
        }

        photoRepository.saveAll(photosToSave);

        // add to queue
        for (Photo photo : photosToSave) {
            if (photo.getAccessMode() == AccessMode.PROTECTED) {
                sqsService.sendPhotoForProcessing(photo.getId().toString(), photo.getStorageUrl());
            }
        }

        return ResponseEntity.ok().body("Successfully saved " + photosToSave.size() + " photos.");
    }

    @GetMapping("/{albumId}/photos")
    public ResponseEntity<List<com.grabpic.api.dto.PhotoResponse>> getAlbumPhotos(@PathVariable UUID albumId) {

        List<Photo> photos = photoRepository.findByAlbumId(albumId);
        List<com.grabpic.api.dto.PhotoResponse> response = new ArrayList<>();

        for (Photo photo : photos) {
            String secureViewUrl = s3StorageService.generateViewUrl(photo.getStorageUrl());
            boolean isPublic = photo.getAccessMode() == AccessMode.PUBLIC;

            // Safely count faces and extract the JSON bounding boxes
            int faceCount = 0;
            List<String> boxes = new ArrayList<>();

            if (photo.getFaces() != null) {
                faceCount = photo.getFaces().size();
                for (com.grabpic.api.model.PhotoEmbedding face : photo.getFaces()) {
                    boxes.add(face.getBoxArea());
                }
            }

            response.add(new com.grabpic.api.dto.PhotoResponse(
                    photo.getId().toString(),
                    secureViewUrl,
                    isPublic,
                    photo.isProcessed(),
                    faceCount,
                    boxes
            ));
        }

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{albumId}/photos/{photoId}")
    public ResponseEntity<?> deletePhoto(@PathVariable UUID albumId, @PathVariable UUID photoId) {
        try {
            photoRepository.deleteById(photoId);
            return ResponseEntity.ok().body("Photo removed successfully.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete photo");
        }
    }

    @DeleteMapping("/{albumId}")
    public ResponseEntity<?> deleteAlbum(@PathVariable UUID albumId) {
        try {
            albumRepository.deleteById(albumId);
            return ResponseEntity.ok().body("Album deleted successfully.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete album");
        }
    }

    @GetMapping("/{albumId}/guest/details")
    public ResponseEntity<?> getGuestAlbumDetails(@PathVariable UUID albumId) {
        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);

        if (albumOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SharedAlbum album = albumOpt.get();
        return ResponseEntity.ok().body(
                java.util.Map.of("title", album.getTitle())
        );
    }

    @PutMapping("/{albumId}/photos/{photoId}/privacy")
    public ResponseEntity<?> togglePhotoPrivacy(@PathVariable UUID albumId, @PathVariable UUID photoId, @RequestParam boolean makePublic) {
        try {
            Optional<Photo> photoOpt = photoRepository.findById(photoId);
            if (photoOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Photo photo = photoOpt.get();
            if (!photo.getAlbum().getId().equals(albumId)) {
                return ResponseEntity.badRequest().body("Photo does not belong to this album");
            }

            photo.setAccessMode(makePublic ? AccessMode.PUBLIC : AccessMode.PROTECTED);
            photoRepository.save(photo);

            return ResponseEntity.ok().body("Privacy updated.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to update privacy");
        }
    }
}