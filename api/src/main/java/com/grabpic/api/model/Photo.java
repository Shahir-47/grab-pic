package com.grabpic.api.model;

import jakarta.persistence.*;
import java.util.UUID;

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
}