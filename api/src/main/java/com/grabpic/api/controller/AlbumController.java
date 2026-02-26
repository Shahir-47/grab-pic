package com.grabpic.api.controller;

import com.grabpic.api.dto.PhotoSaveRequest;
import com.grabpic.api.model.AccessMode;
import com.grabpic.api.model.Photo;
import com.grabpic.api.model.SharedAlbum;
import com.grabpic.api.repository.PhotoRepository;
import com.grabpic.api.repository.SharedAlbumRepository;
import com.grabpic.api.service.S3StorageService;
import com.grabpic.api.service.SqsService;
import com.grabpic.api.service.TurnstileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;

@RestController
@RequestMapping("/api/albums")
public class AlbumController {

    private final S3StorageService s3StorageService;
    private final SharedAlbumRepository albumRepository;
    private final PhotoRepository photoRepository;
    private final SqsService sqsService;
    private final TurnstileService turnstileService;

    public AlbumController(S3StorageService s3StorageService,
                           SharedAlbumRepository albumRepository,
                           PhotoRepository photoRepository,
                           SqsService sqsService,
                           TurnstileService turnstileService) {
        this.s3StorageService = s3StorageService;
        this.albumRepository = albumRepository;
        this.photoRepository = photoRepository;
        this.sqsService = sqsService;
        this.turnstileService = turnstileService;
    }

    @PostMapping
    public ResponseEntity<?> createAlbum(
            @RequestBody com.grabpic.api.dto.AlbumCreateRequest request,
            @RequestHeader(value = "X-Turnstile-Token", required = false) String turnstileToken,
            @AuthenticationPrincipal Jwt jwt) {

        if (!turnstileService.isHuman(turnstileToken)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Bot activity detected.");
        }

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
    
    private static final int MAX_UPLOAD_BATCH = 50;
    private static final long MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
    private static final long MAX_PHOTOS_PER_USER = 500;
    private static final String QUOTA_MSG =
            "You have reached the maximum of " + MAX_PHOTOS_PER_USER
            + " photos. Please delete old photos to free up space, "
            + "or contact shahir.a@outlook.com for assistance.";

    private static final Pattern VALID_STORAGE_KEY_PATTERN =
            Pattern.compile("^albums/[0-9a-fA-F\\-]{36}/[0-9a-fA-F\\-]{36}\\.jpg$");

    private boolean isValidStorageKey(String storageUrl, UUID expectedAlbumId) {
        if (storageUrl == null || storageUrl.isBlank()) return false;
        if (!VALID_STORAGE_KEY_PATTERN.matcher(storageUrl).matches()) return false;
        String expectedPrefix = "albums/" + expectedAlbumId.toString() + "/";
        return storageUrl.startsWith(expectedPrefix);
    }

    @PostMapping("/{albumId}/upload-urls")
    public ResponseEntity<?> getUploadUrls(
            @PathVariable UUID albumId,
            @RequestBody com.grabpic.api.dto.UploadUrlRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Optional<SharedAlbum> albumOpt = albumRepository.findById(albumId);
        if (albumOpt.isEmpty()) return ResponseEntity.notFound().build();
        if (!albumOpt.get().getHostId().equals(jwt.getSubject())) {
            return ResponseEntity.status(403).body("You do not have permission to upload to this album.");
        }

        List<Long> fileSizes = request.getFileSizes();
        if (fileSizes == null || fileSizes.isEmpty() || fileSizes.size() > MAX_UPLOAD_BATCH) {
            return ResponseEntity.badRequest()
                    .body("Upload count must be between 1 and " + MAX_UPLOAD_BATCH + ".");
        }

        for (Long size : fileSizes) {
            if (size == null || size <= 0 || size > MAX_PHOTO_SIZE_BYTES) {
                return ResponseEntity.badRequest()
                        .body("Each photo must be between 1 byte and 10 MB.");
            }
        }

        long totalUserPhotos = photoRepository.countByAlbumHostId(jwt.getSubject());
        if (totalUserPhotos >= MAX_PHOTOS_PER_USER) {
            return ResponseEntity.badRequest().body(QUOTA_MSG);
        }
        int allowed = (int) Math.min(fileSizes.size(), MAX_PHOTOS_PER_USER - totalUserPhotos);
        List<Long> allowedSizes = fileSizes.subList(0, allowed);

        return ResponseEntity.ok(s3StorageService.generateBatchUploadUrls(albumId, allowedSizes));
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

        long totalUserPhotos = photoRepository.countByAlbumHostId(jwt.getSubject());
        int incoming = request.getPhotos().size();
        if (totalUserPhotos + incoming > MAX_PHOTOS_PER_USER) {
            return ResponseEntity.badRequest()
                    .body("Cannot save " + incoming + " photos. You already have " + totalUserPhotos
                            + " of " + MAX_PHOTOS_PER_USER + " allowed. "
                            + "Please delete old photos or contact shahir.a@outlook.com for assistance.");
        }

        List<String> keysToCleanUp = new ArrayList<>();
        for (PhotoSaveRequest.PhotoItem item : request.getPhotos()) {
            if (!isValidStorageKey(item.getStorageUrl(), albumId)) {
                if (!keysToCleanUp.isEmpty()) s3StorageService.deleteObjects(keysToCleanUp);
                return ResponseEntity.badRequest()
                        .body("Invalid photo reference detected. Please re-upload your photos.");
            }

            long objectSize = s3StorageService.getObjectSize(item.getStorageUrl());
            if (objectSize <= 0 || objectSize > MAX_PHOTO_SIZE_BYTES) {
                keysToCleanUp.add(item.getStorageUrl());
                if (!keysToCleanUp.isEmpty()) s3StorageService.deleteObjects(keysToCleanUp);
                return ResponseEntity.badRequest()
                        .body("One or more photos failed validation (missing or too large). Maximum size is 10 MB.");
            }
            keysToCleanUp.add(item.getStorageUrl());
        }
        keysToCleanUp.clear();

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

        List<SqsService.PhotoMessage> sqsMessages = photosToSave.stream()
                .filter(p -> p.getAccessMode() == AccessMode.PROTECTED)
                .map(p -> new SqsService.PhotoMessage(p.getId().toString(), p.getStorageUrl()))
                .toList();
        sqsService.sendPhotosForProcessingBatch(sqsMessages);

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

            s3StorageService.deleteObject(photoOpt.get().getStorageUrl());
            photoRepository.delete(photoOpt.get());
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

            List<Photo> albumPhotos = photoRepository.findByAlbumId(albumId);
            List<String> s3Keys = albumPhotos.stream()
                    .map(Photo::getStorageUrl)
                    .toList();
            s3StorageService.deleteObjects(s3Keys);

            albumRepository.delete(albumOpt.get());
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

            AccessMode previousMode = photo.getAccessMode();
            AccessMode nextMode = makePublic ? AccessMode.PUBLIC : AccessMode.PROTECTED;

            photo.setAccessMode(nextMode);
            photoRepository.save(photo);

            if (previousMode == AccessMode.PUBLIC
                    && nextMode == AccessMode.PROTECTED
                    && !photo.isProcessed()) {
                sqsService.sendPhotoForProcessing(photo.getId().toString(), photo.getStorageUrl());
            }

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
            if (photo.getAlbum().getId().equals(albumId)) {
                String secureViewUrl = s3StorageService.generateViewUrl(photo.getStorageUrl());

                matchedPhotos.add(new com.grabpic.api.dto.PhotoResponse(
                        photo.getId().toString(),
                        secureViewUrl,
                        photo.getAccessMode() == AccessMode.PUBLIC,
                        photo.isProcessed(),
                        0,
                        new ArrayList<>()
                ));
            }
        }
        return ResponseEntity.ok(matchedPhotos);
    }
}
