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
import software.amazon.awssdk.services.cloudfront.CloudFrontUtilities;
import software.amazon.awssdk.services.cloudfront.model.CannedSignerRequest;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final String bucketName;
    private final String[] allowedOrigins;
    private final S3Presigner presigner;
    private final S3Client s3Client;

    private final String cloudfrontDomain;
    private final String cloudfrontKeyPairId;
    private final PrivateKey cloudfrontPrivateKey;
    private final CloudFrontUtilities cloudFrontUtilities;

    public S3StorageService(@Value("${aws.s3.region}") String region,
                            @Value("${aws.s3.bucket-name}") String bucketName,
                            @Value("${cors.allowed-origins}") String allowedOrigins,
                            @Value("${aws.cloudfront.domain:}") String cloudfrontDomain,
                            @Value("${aws.cloudfront.key-pair-id:}") String cloudfrontKeyPairId,
                            @Value("${aws.cloudfront.private-key-string:}") String cloudfrontPrivateKeyString) {

        this.bucketName = bucketName;
        this.allowedOrigins = allowedOrigins.split(",");

        if (!cloudfrontDomain.isBlank() && !cloudfrontKeyPairId.isBlank() && !cloudfrontPrivateKeyString.isBlank()) {
            this.cloudfrontDomain = cloudfrontDomain;
            this.cloudfrontKeyPairId = cloudfrontKeyPairId;
            this.cloudfrontPrivateKey = parsePemPrivateKey(cloudfrontPrivateKeyString);
            this.cloudFrontUtilities = CloudFrontUtilities.create();
            log.info("CloudFront signing enabled: {}", cloudfrontDomain);
        } else {
            this.cloudfrontDomain = null;
            this.cloudfrontKeyPairId = null;
            this.cloudfrontPrivateKey = null;
            this.cloudFrontUtilities = null;
            log.info("CloudFront not configured — falling back to direct S3 pre-signed URLs");
        }

        this.presigner = S3Presigner.builder()
                .region(Region.of(region))
                .build();

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .build();
    }

    private static PrivateKey parsePemPrivateKey(String pem) {
        try {
            String base64 = pem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                    .replace("-----END RSA PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] decoded = Base64.getDecoder().decode(base64);
            PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(decoded);
            return KeyFactory.getInstance("RSA").generatePrivate(keySpec);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse CloudFront private key from PEM string", e);
        }
    }

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

        try {
            CORSRule corsRule = CORSRule.builder()
                    .allowedOrigins(allowedOrigins)
                    .allowedMethods("GET", "PUT")
                    .allowedHeaders("*")
                    .maxAgeSeconds(3600)
                    .build();

            s3Client.putBucketCors(PutBucketCorsRequest.builder()
                    .bucket(bucketName)
                    .corsConfiguration(CORSConfiguration.builder()
                            .corsRules(corsRule)
                            .build())
                    .build());

            log.info("S3 CORS applied: allowing GET from {}", String.join(", ", allowedOrigins));
        } catch (Exception e) {
            log.warn("Could not apply S3 CORS config (non-fatal): {}", e.getMessage());
        }
    }

    public List<String> generateBatchUploadUrls(UUID albumId, List<Long> fileSizes) {
        List<String> urls = new ArrayList<>();

        for (Long fileSize : fileSizes) {
            String fileName = "albums/" + albumId.toString() + "/" + UUID.randomUUID() + ".jpg";

            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType("image/jpeg")
                    .contentLength(fileSize)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(objectRequest)
                    .build();

            urls.add(presigner.presignPutObject(presignRequest).url().toString());
        }

        return urls;
    }

    public String generateViewUrl(String s3Key) {
        if (cloudFrontUtilities != null) {
            try {
                String resourceUrl = "https://" + cloudfrontDomain + "/" + s3Key;
                Instant expiration = Instant.now().plus(Duration.ofHours(7));

                CannedSignerRequest signerRequest = CannedSignerRequest.builder()
                        .resourceUrl(resourceUrl)
                        .keyPairId(cloudfrontKeyPairId)
                        .privateKey(cloudfrontPrivateKey)
                        .expirationDate(expiration)
                        .build();

                return cloudFrontUtilities.getSignedUrlWithCannedPolicy(signerRequest).url();
            } catch (Exception e) {
                log.error("CloudFront URL signing failed for {} — falling back to S3: {}", s3Key, e.getMessage());
            }
        }

        return presigner.presignGetObject(
                software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofHours(7))
                        .getObjectRequest(b -> b.bucket(bucketName).key(s3Key))
                        .build()
        ).url().toString();
    }

    public long getObjectSize(String s3Key) {
        try {
            HeadObjectResponse response = s3Client.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build());
            return response.contentLength();
        } catch (NoSuchKeyException e) {
            return -1;
        } catch (Exception e) {
            log.error("HeadObject failed for {}: {}", s3Key, e.getMessage());
            return -1;
        }
    }

    public void deleteObject(String s3Key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build());
            log.info("Deleted S3 object: {}", s3Key);
        } catch (Exception e) {
            log.error("Failed to delete S3 object {}: {}", s3Key, e.getMessage());
        }
    }

    public void deleteObjects(List<String> s3Keys) {
        if (s3Keys == null || s3Keys.isEmpty()) return;

        try {
            List<ObjectIdentifier> identifiers = s3Keys.stream()
                    .map(key -> ObjectIdentifier.builder().key(key).build())
                    .toList();

            s3Client.deleteObjects(DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(Delete.builder().objects(identifiers).quiet(true).build())
                    .build());
            log.info("Batch-deleted {} S3 objects.", s3Keys.size());
        } catch (Exception e) {
            log.error("Failed to batch-delete S3 objects: {}", e.getMessage());
        }
    }
}
