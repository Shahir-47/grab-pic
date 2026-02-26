package com.grabpic.api.repository;

import com.grabpic.api.model.Photo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PhotoRepository extends JpaRepository<Photo, UUID> {
    List<Photo> findByAlbumId(UUID albumId);
    long countByAlbumId(UUID albumId);

    @Query("SELECT COUNT(p) FROM Photo p WHERE p.album.hostId = :hostId")
    long countByAlbumHostId(@Param("hostId") String hostId);
}