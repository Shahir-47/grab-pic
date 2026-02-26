package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageBatchRequestEntry;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class SqsService {

    private static final int SQS_BATCH_LIMIT = 10;

    private final SqsClient sqsClient;
    private final String queueUrl;

    public SqsService(@Value("${aws.s3.region}") String region, @Value("${aws.sqs.queue-url}") String queueUrl) {
        this.queueUrl = queueUrl;

        this.sqsClient = SqsClient.builder()
                .region(Region.of(region))
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

    /**
     * Send multiple photos for processing in batches of 10 (SQS max).
     * 50 photos = 5 API calls instead of 50.
     */
    public void sendPhotosForProcessingBatch(List<PhotoMessage> messages) {
        if (messages == null || messages.isEmpty()) return;

        // Split into chunks of 10 (SQS SendMessageBatch limit)
        for (int i = 0; i < messages.size(); i += SQS_BATCH_LIMIT) {
            List<PhotoMessage> chunk = messages.subList(i, Math.min(i + SQS_BATCH_LIMIT, messages.size()));

            List<SendMessageBatchRequestEntry> entries = new ArrayList<>();
            for (PhotoMessage msg : chunk) {
                entries.add(SendMessageBatchRequestEntry.builder()
                        .id(UUID.randomUUID().toString())
                        .messageBody(String.format(
                                "{\"photoId\": \"%s\", \"storageUrl\": \"%s\"}",
                                msg.photoId(), msg.storageUrl()))
                        .build());
            }

            sqsClient.sendMessageBatch(SendMessageBatchRequest.builder()
                    .queueUrl(queueUrl)
                    .entries(entries)
                    .build());
        }
    }

    public record PhotoMessage(String photoId, String storageUrl) {}
}