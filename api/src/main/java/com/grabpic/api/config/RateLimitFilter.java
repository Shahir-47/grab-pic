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

        if (path.contains("/guest/search-results")) {
            if (!tryConsume("rl:" + ip + ":guest-search", 5, 5)) {
                reject(httpRes, "Too many search requests. Please wait a moment.");
                return;
            }
        }

        else if (path.contains("/guest/details")) {
            if (!tryConsume("rl:" + ip + ":guest-details", 20, 20)) {
                reject(httpRes, "Too many requests. Please slow down.");
                return;
            }
        }

        else if (path.startsWith("/api/")) {
            if (!tryConsume("rl:" + ip + ":auth", 60, 60)) {
                reject(httpRes, "Rate limit exceeded. Please try again later.");
                return;
            }
        }

        httpRes.setHeader("X-Content-Type-Options", "nosniff");
        httpRes.setHeader("X-Frame-Options", "DENY");
        httpRes.setHeader("X-XSS-Protection", "1; mode=block");
        httpRes.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpRes.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        chain.doFilter(request, response);
    }

        private boolean tryConsume(String key, long capacity, long refillPerMinute) {
        try {
            long now = System.currentTimeMillis();
            double refillPerMs = refillPerMinute / 60_000.0;
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
            log.warn("Redis rate-limit check failed (allowing request): {}", e.getMessage());
            return true;
        }
    }

    private void reject(HttpServletResponse httpRes, String message) throws IOException {
        httpRes.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        httpRes.setContentType("application/json");
        httpRes.getWriter().write("{\"error\":\"" + message + "\"}");
    }

        private String getClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
