package com.grabpic.api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "photos")
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "album_id", nullable = false)
    private SharedAlbum album;

    @Column(nullable = false)
    private String storageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccessMode accessMode = AccessMode.PROTECTED;

    private boolean processed = false;

    @JsonIgnore
    @OneToMany(mappedBy = "photo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PhotoEmbedding> faces;
}