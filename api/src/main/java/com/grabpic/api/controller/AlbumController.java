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
    public ResponseEntity<com.grabpic.api.dto.AlbumResponse> createAlbum(
            @RequestBody com.grabpic.api.dto.AlbumCreateRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        SharedAlbum album = new SharedAlbum();
        album.setTitle(request.getTitle());

        album.setHostId(jwt.getSubject());

        SharedAlbum savedAlbum = albumRepository.save(album);
        return ResponseEntity.ok(new com.grabpic.api.dto.AlbumResponse(
                savedAlbum.getId().toString(),
                savedAlbum.getTitle(),
                savedAlbum.getCreatedAt().toString()
        ));
    }

    @GetMapping
    public ResponseEntity<List<com.grabpic.api.dto.AlbumResponse>> getAllAlbums(@AuthenticationPrincipal Jwt jwt) {
        String hostId = jwt.getSubject();
        List<SharedAlbum> albums = albumRepository.findByHostId(hostId);
        List<com.grabpic.api.dto.AlbumResponse> response = albums.stream()
                .map(a -> new com.grabpic.api.dto.AlbumResponse(
                        a.getId().toString(),
                        a.getTitle(),
                        a.getCreatedAt().toString()
                ))
                .toList();
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{albumId}/upload-urls")
    public ResponseEntity<List<String>> getUploadUrls(
            @PathVariable UUID albumId,
            @RequestParam(defaultValue = "1") int count,
            @AuthenticationPrincipal Jwt jwt) {

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
            return ResponseEntity.status(403).build();
        }

        if (count > 10000) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(s3StorageService.generateBatchUploadUrls(albumId, count));
    }

    @PostMapping("/{albumId}/photos")
    public ResponseEntity<?> saveUploadedPhotos(@PathVariable UUID albumId,
                                                @RequestBody PhotoSaveRequest request,
                                                @AuthenticationPrincipal Jwt jwt) {

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        SharedAlbum album = albumOpt.get();
        if (!album.getHostId().equals(jwt.getSubject())) {
            return ResponseEntity.status(403).body("You do not own this album.");
        }
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
    public ResponseEntity<?> getAlbumPhotos(@PathVariable UUID albumId,
                                            @AuthenticationPrincipal Jwt jwt) {

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
            return ResponseEntity.status(403).body("You do not own this album.");
        }

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
    public ResponseEntity<?> deletePhoto(@PathVariable UUID albumId,
                                         @PathVariable UUID photoId,
                                         @AuthenticationPrincipal Jwt jwt) {
        try {
            Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
            if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
            if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
                return ResponseEntity.status(403).body("You do not own this album.");
            }

            Optional<Photo> photoOpt = photoRepository.findById(photoId);
            if (photoOpt.isEmpty()) return ResponseEntity.notFound().build();
            if (!photoOpt.get().getAlbum().getId().equals(albumId)) {
                return ResponseEntity.badRequest().body("Photo does not belong to this album.");
            }

            photoRepository.deleteById(photoId);
            return ResponseEntity.ok().body("Photo removed successfully.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete photo");
        }
    }

    @DeleteMapping("/{albumId}")
    public ResponseEntity<?> deleteAlbum(@PathVariable UUID albumId,
                                         @AuthenticationPrincipal Jwt jwt) {
        try {
            Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
            if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
            if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
                return ResponseEntity.status(403).body("You do not own this album.");
            }

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

        List<Photo> allPhotos = photoRepository.findByAlbumId(albumId);
        List<com.grabpic.api.dto.PhotoResponse> publicPhotos = new ArrayList<>();

        for (Photo photo : allPhotos) {
            if (photo.getAccessMode() == AccessMode.PUBLIC) {
                String secureViewUrl = s3StorageService.generateViewUrl(photo.getStorageUrl());

                publicPhotos.add(new com.grabpic.api.dto.PhotoResponse(
                        photo.getId().toString(),
                        secureViewUrl,
                        true,
                        photo.isProcessed(),
                        0,
                        new ArrayList<>()
                ));
            }
        }

        return ResponseEntity.ok().body(
                java.util.Map.of(
                        "title", album.getTitle(),
                        "publicPhotos", publicPhotos
                )
        );
    }

    @PutMapping("/{albumId}/photos/{photoId}/privacy")
    public ResponseEntity<?> togglePhotoPrivacy(@PathVariable UUID albumId,
                                                @PathVariable UUID photoId,
                                                @RequestParam boolean makePublic,
                                                @AuthenticationPrincipal Jwt jwt) {
        try {
            Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
            if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
            if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
                return ResponseEntity.status(403).body("You do not own this album.");
            }

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

    @PostMapping("/{albumId}/guest/search-results")
    public ResponseEntity<?> getGuestSearchResults(@PathVariable UUID albumId, @RequestBody List<UUID> photoIds) {
        if (photoIds == null || photoIds.isEmpty()) {
            return ResponseEntity.badRequest().body("No photo IDs provided.");
        }
        if (photoIds.size() > 100) {
            return ResponseEntity.badRequest().body("Too many photo IDs. Maximum is 100.");
        }

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Photo> allPhotos = photoRepository.findAllById(photoIds);
        List<com.grabpic.api.dto.PhotoResponse> matchedPhotos = new ArrayList<>();

        for (Photo photo : allPhotos) {
            // Verify the photo actually belongs to this album to prevent cross-album snooping
            if (photo.getAlbum().getId().equals(albumId)) {
                String secureViewUrl = s3StorageService.generateViewUrl(photo.getStorageUrl());

                matchedPhotos.add(new com.grabpic.api.dto.PhotoResponse(
                        photo.getId().toString(),
                        secureViewUrl,
                        photo.getAccessMode() == AccessMode.PUBLIC,
                        photo.isProcessed(),
                        0, // Hide face coordinates from guests
                        new ArrayList<>()
                ));
            }
        }
        return ResponseEntity.ok(matchedPhotos);
    }
}