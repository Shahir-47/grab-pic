package com.grabpic.api.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;

/**
 * Redis-backed rate limit filter using Upstash (serverless Redis, free tier).
 *
 * Every App Runner instance shares the same token buckets stored in Upstash,
 * so rate limits hold even when AWS scales to multiple containers.
 * The token-bucket logic runs inside an atomic Lua script — no race conditions.
 *
 * If Redis is unavailable, requests are allowed through (fail-open)
 * so the API keeps working even during a Redis outage.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<Long> tokenBucketScript;

    public RateLimitFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;

        this.tokenBucketScript = new DefaultRedisScript<>();
        this.tokenBucketScript.setResultType(Long.class);
        // Atomic token-bucket implemented as a Lua script:
        //   KEYS[1] = bucket key
        //   ARGV[1] = capacity  (max burst)
        //   ARGV[2] = refill rate  (tokens per millisecond)
        //   ARGV[3] = current timestamp in milliseconds
        //   ARGV[4] = key TTL in seconds  (auto-cleanup for stale buckets)
        this.tokenBucketScript.setScriptText(
                """
                local key       = KEYS[1]
                local capacity  = tonumber(ARGV[1])
                local refillPMs = tonumber(ARGV[2])
                local now       = tonumber(ARGV[3])
                local ttl       = tonumber(ARGV[4])

                local data    = redis.call('hmget', key, 't', 'ts')
                local tokens  = tonumber(data[1])
                local lastTs  = tonumber(data[2])

                if tokens == nil then
                    tokens = capacity
                    lastTs = now
                end

                local elapsed = math.max(0, now - lastTs)
                tokens = math.min(capacity, tokens + elapsed * refillPMs)

                if tokens >= 1 then
                    tokens = tokens - 1
                    redis.call('hmset', key, 't', tostring(tokens), 'ts', tostring(now))
                    redis.call('expire', key, ttl)
                    return 1
                end

                redis.call('hmset', key, 't', tostring(tokens), 'ts', tostring(now))
                redis.call('expire', key, ttl)
                return 0
                """
        );
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpRes = (HttpServletResponse) response;

        String path = httpReq.getRequestURI();
        String ip = getClientIp(httpReq);

        // Guest search endpoints: strict limit (5 req/min per IP)
        if (path.contains("/guest/search-results")) {
            if (!tryConsume("rl:" + ip + ":guest-search", 5, 5)) {
                reject(httpRes, "Too many search requests. Please wait a moment.");
                return;
            }
        }

        // Guest detail endpoints: moderate limit (20 req/min per IP)
        else if (path.contains("/guest/details")) {
            if (!tryConsume("rl:" + ip + ":guest-details", 20, 20)) {
                reject(httpRes, "Too many requests. Please slow down.");
                return;
            }
        }

        // Authenticated endpoints: generous limit (60 req/min per IP)
        else if (path.startsWith("/api/")) {
            if (!tryConsume("rl:" + ip + ":auth", 60, 60)) {
                reject(httpRes, "Rate limit exceeded. Please try again later.");
                return;
            }
        }

        // Security headers
        httpRes.setHeader("X-Content-Type-Options", "nosniff");
        httpRes.setHeader("X-Frame-Options", "DENY");
        httpRes.setHeader("X-XSS-Protection", "1; mode=block");
        httpRes.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpRes.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        chain.doFilter(request, response);
    }

    /**
     * Attempt to consume one token from a Redis-backed token bucket.
     *
     * @param key             unique rate-limit key stored in Redis
     * @param capacity        maximum tokens (burst size)
     * @param refillPerMinute tokens added per minute
     * @return true if the request is allowed, false if rate-limited
     */
    private boolean tryConsume(String key, long capacity, long refillPerMinute) {
        try {
            long now = System.currentTimeMillis();
            double refillPerMs = refillPerMinute / 60_000.0;
            // TTL: enough time for a full refill cycle, plus 2-minute buffer
            int ttlSeconds = (int) (capacity * 60 / refillPerMinute) + 120;

            Long result = redisTemplate.execute(
                    tokenBucketScript,
                    Collections.singletonList(key),
                    String.valueOf(capacity),
                    String.valueOf(refillPerMs),
                    String.valueOf(now),
                    String.valueOf(ttlSeconds)
            );
            return result != null && result == 1L;
        } catch (Exception e) {
            // If Redis is unavailable, allow the request through rather than
            // taking the entire API offline. Log the failure for monitoring.
            log.warn("Redis rate-limit check failed (allowing request): {}", e.getMessage());
            return true;
        }
    }

    private void reject(HttpServletResponse httpRes, String message) throws IOException {
        httpRes.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        httpRes.setContentType("application/json");
        httpRes.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    /**
     * Returns the real client IP.  Tomcat's RemoteIpValve (enabled via
     * server.forward-headers-strategy=NATIVE) has already processed the
     * X-Forwarded-For header, stripping trusted-proxy hops.  We never
     * read the header ourselves, so spoofed values are ignored.
     */
    private String getClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
