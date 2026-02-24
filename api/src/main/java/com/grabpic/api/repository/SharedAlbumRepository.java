package com.grabpic.api.repository;

import com.grabpic.api.model.SharedAlbum;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SharedAlbumRepository extends JpaRepository<SharedAlbum, UUID> {
}