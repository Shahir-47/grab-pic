package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class S3StorageService {

    private final String bucketName;
    private final S3Presigner presigner;

    public S3StorageService(@Value("${aws.s3.access-key}") String accessKey,
                            @Value("${aws.s3.secret-key}") String secretKey,
                            @Value("${aws.s3.region}") String region,
                            @Value("${aws.s3.bucket-name}") String bucketName) {

        this.bucketName = bucketName;
        this.presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    public List<String> generateBatchUploadUrls(UUID albumId, int count) {
        List<String> urls = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            // This groups the photos in S3 under a folder named after the Album ID
            String fileName = "albums/" + albumId.toString() + "/" + UUID.randomUUID() + ".jpg";

            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType("image/jpeg") // Ensures the browser uploads it as an image
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15)) // URL is valid for 15 minutes
                    .putObjectRequest(objectRequest)
                    .build();

            urls.add(presigner.presignPutObject(presignRequest).url().toString());
        }

        return urls;
    }
}