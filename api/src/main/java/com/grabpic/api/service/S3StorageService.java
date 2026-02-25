package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final String bucketName;
    private final S3Presigner presigner;
    private final S3Client s3Client;

    public S3StorageService(@Value("${aws.s3.region}") String region,
                            @Value("${aws.s3.bucket-name}") String bucketName) {

        this.bucketName = bucketName;

        this.presigner = S3Presigner.builder()
                .region(Region.of(region))
                .build();

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .build();
    }

    /**
     * On startup, ensure the S3 bucket has a lifecycle rule that automatically
     * aborts incomplete multipart uploads after 1 day. This prevents attackers
     * from starting uploads and abandoning them to eat storage space.
     */
    @PostConstruct
    public void ensureLifecycleRules() {
        try {
            AbortIncompleteMultipartUpload abortRule = AbortIncompleteMultipartUpload.builder()
                    .daysAfterInitiation(1)
                    .build();

            LifecycleRule rule = LifecycleRule.builder()
                    .id("abort-incomplete-multipart-uploads")
                    .status(ExpirationStatus.ENABLED)
                    .filter(LifecycleRuleFilter.builder().prefix("").build())
                    .abortIncompleteMultipartUpload(abortRule)
                    .build();

            s3Client.putBucketLifecycleConfiguration(
                    PutBucketLifecycleConfigurationRequest.builder()
                            .bucket(bucketName)
                            .lifecycleConfiguration(
                                    BucketLifecycleConfiguration.builder()
                                            .rules(rule)
                                            .build()
                            )
                            .build()
            );

            log.info("S3 lifecycle rule applied: abort incomplete multipart uploads after 1 day.");
        } catch (Exception e) {
            log.warn("Could not apply S3 lifecycle rule (non-fatal): {}", e.getMessage());
        }
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

    public String generateViewUrl(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(7)) // URL expires in 1 hour
                .getObjectRequest(getObjectRequest)
                .build();

        return presigner.presignGetObject(presignRequest).url().toString();
    }
}