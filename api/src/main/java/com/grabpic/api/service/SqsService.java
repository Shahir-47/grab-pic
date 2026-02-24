package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

@Service
public class SqsService {

    private final SqsClient sqsClient;
    private final String queueUrl;

    public SqsService(@Value("${aws.s3.access-key}") String accessKey,
                      @Value("${aws.s3.secret-key}") String secretKey,
                      @Value("${aws.s3.region}") String region,
                      @Value("${aws.sqs.queue-url}") String queueUrl) {
        this.queueUrl = queueUrl;

        this.sqsClient = SqsClient.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    public void sendPhotoForProcessing(String photoId, String storageUrl) {
        String messageBody = String.format("{\"photoId\": \"%s\", \"storageUrl\": \"%s\"}", photoId, storageUrl);

        SendMessageRequest request = SendMessageRequest.builder()
                .queueUrl(queueUrl)
                .messageBody(messageBody)
                .build();

        sqsClient.sendMessage(request);
    }
}