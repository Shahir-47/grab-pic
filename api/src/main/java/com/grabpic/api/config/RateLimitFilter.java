package com.grabpic.api.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter implements Filter {

    // Separate buckets for guest (unauthenticated) vs authenticated endpoints
    private final ConcurrentHashMap<String, Bucket> guestBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> authBuckets = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpRes = (HttpServletResponse) response;

        String path = httpReq.getRequestURI();
        String ip = getClientIp(httpReq);

        // Guest search endpoints: strict limit (5 req/min per IP)
        if (path.contains("/guest/search-results")) {
            Bucket bucket = guestBuckets.computeIfAbsent(ip + ":guest-search", k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.simple(5, Duration.ofMinutes(1)))
                            .build()
            );
            if (!bucket.tryConsume(1)) {
                httpRes.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpRes.setContentType("application/json");
                httpRes.getWriter().write("{\"error\":\"Too many search requests. Please wait a moment.\"}");
                return;
            }
        }

        // Guest detail endpoints: moderate limit (20 req/min per IP)
        else if (path.contains("/guest/details")) {
            Bucket bucket = guestBuckets.computeIfAbsent(ip + ":guest-details", k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.simple(20, Duration.ofMinutes(1)))
                            .build()
            );
            if (!bucket.tryConsume(1)) {
                httpRes.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpRes.setContentType("application/json");
                httpRes.getWriter().write("{\"error\":\"Too many requests. Please slow down.\"}");
                return;
            }
        }

        // Authenticated endpoints: generous limit (60 req/min per IP)
        else if (path.startsWith("/api/")) {
            Bucket bucket = authBuckets.computeIfAbsent(ip + ":auth", k ->
                    Bucket.builder()
                            .addLimit(Bandwidth.simple(60, Duration.ofMinutes(1)))
                            .build()
            );
            if (!bucket.tryConsume(1)) {
                httpRes.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                httpRes.setContentType("application/json");
                httpRes.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\"}");
                return;
            }
        }

        // Add rate limit headers for transparency
        httpRes.setHeader("X-Content-Type-Options", "nosniff");
        httpRes.setHeader("X-Frame-Options", "DENY");
        httpRes.setHeader("X-XSS-Protection", "1; mode=block");
        httpRes.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpRes.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        // Check standard proxy headers
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty()) {
            return ip.split(",")[0].trim(); // First IP is the real client
        }
        ip = request.getHeader("X-Real-IP");
        if (ip != null && !ip.isEmpty()) {
            return ip;
        }
        return request.getRemoteAddr();
    }
}
