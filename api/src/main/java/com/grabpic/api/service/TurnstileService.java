package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class TurnstileService {

    @Value("${turnstile.secret:}")
    private String secretKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Verifies a Cloudflare Turnstile token.
     * Returns true if the token is valid (user is human).
     * Fails secure: returns false on any error or missing token.
     * If no secret key is configured, skips verification (local dev).
     */
    public boolean isHuman(String token) {
        // If no secret is configured, allow all requests (local dev)
        if (secretKey == null || secretKey.isEmpty()) return true;

        if (token == null || token.isEmpty()) return false;

        String url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        Map<String, String> body = Map.of(
                "secret", secretKey,
                "response", token
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, body, Map.class);
            return response != null && Boolean.TRUE.equals(response.get("success"));
        } catch (Exception e) {
            return false; // Fail secure
        }
    }
}
