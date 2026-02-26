package com.grabpic.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TurnstileService {

    @Value("${turnstile.secret:}")
    private String secretKey;

    @Value("${turnstile.allowed-hostnames:}")
    private String allowedHostnamesRaw;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isHuman(String token) {
        return isHuman(token, null);
    }

    public boolean isHuman(String token, String remoteIp) {
        if (secretKey == null || secretKey.isEmpty()) return true;

        if (token == null || token.isEmpty()) return false;

        String url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("secret", secretKey);
        body.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            body.add("remoteip", remoteIp);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            if (response == null || !Boolean.TRUE.equals(response.get("success"))) {
                return false;
            }

            Set<String> allowedHostnames = getAllowedHostnames();
            if (allowedHostnames.isEmpty()) {
                return true;
            }

            Object hostname = response.get("hostname");
            if (!(hostname instanceof String hostnameString) || hostnameString.isBlank()) {
                return false;
            }

            return allowedHostnames.contains(hostnameString.trim().toLowerCase());
        } catch (Exception e) {
            return false;
        }
    }

    private Set<String> getAllowedHostnames() {
        if (allowedHostnamesRaw == null || allowedHostnamesRaw.isBlank()) {
            return Collections.emptySet();
        }

        return Arrays.stream(allowedHostnamesRaw.split(","))
                .map(String::trim)
                .filter(host -> !host.isBlank())
                .map(String::toLowerCase)
                .collect(Collectors.toSet());
    }
}
