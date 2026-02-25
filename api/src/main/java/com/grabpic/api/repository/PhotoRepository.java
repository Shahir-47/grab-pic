package com.grabpic.api.repository;

import com.grabpic.api.model.Photo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByAlbumId(UUID albumId);
    long countByAlbumId(UUID albumId);
}