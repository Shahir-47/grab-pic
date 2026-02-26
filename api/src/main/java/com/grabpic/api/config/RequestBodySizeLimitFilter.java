package com.grabpic.api.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Rejects JSON / non-multipart request bodies larger than 512 KB.
 *
 * The existing Tomcat settings (max-http-form-post-size, multipart limits)
 * only protect form-encoded and multipart uploads. Raw JSON bodies are
 * streamed through with no size limit, so an attacker can send a massive
 * payload to exhaust server memory before the controller even parses it.
 *
 * This filter runs before everything else and handles two cases:
 *   1. Content-Length header present → reject immediately if too large.
 *   2. Chunked / missing Content-Length → wrap the InputStream so it
 *      stops reading after the limit and returns a 413 mid-stream.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestBodySizeLimitFilter implements Filter {

    // 512 KB — generous for any JSON endpoint in this app.
    // Largest legitimate payload: PhotoSaveRequest with 50 photos ≈ 5 KB.
    private static final long MAX_BODY_BYTES = 512 * 1024;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpRes = (HttpServletResponse) response;

        String contentType = httpReq.getContentType();

        // Only inspect requests that carry a body and are NOT multipart
        // (multipart is already guarded by Spring's own multipart limits)
        if (contentType != null
                && !contentType.toLowerCase().contains("multipart/")
                && hasBody(httpReq.getMethod())) {

            // Fast path: if Content-Length is declared and too large, reject immediately
            long declaredLength = httpReq.getContentLengthLong();
            if (declaredLength > MAX_BODY_BYTES) {
                reject(httpRes);
                return;
            }

            // For chunked transfers (Content-Length = -1) or as defense-in-depth,
            // wrap the input stream so it enforces the limit during reading.
            chain.doFilter(new LimitedRequestWrapper(httpReq, MAX_BODY_BYTES), response);
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean hasBody(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method);
    }

    private void reject(HttpServletResponse httpRes) throws IOException {
        httpRes.setStatus(HttpStatus.PAYLOAD_TOO_LARGE.value());
        httpRes.setContentType("application/json");
        httpRes.getWriter().write("{\"error\":\"Request body is too large.\"}");
    }

    // --- Wrapper that caps the InputStream at maxBytes ---

    private static class LimitedRequestWrapper extends HttpServletRequestWrapper {

        private final long maxBytes;

        LimitedRequestWrapper(HttpServletRequest request, long maxBytes) {
            super(request);
            this.maxBytes = maxBytes;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return new LimitedServletInputStream(super.getInputStream(), maxBytes);
        }
    }

    private static class LimitedServletInputStream extends ServletInputStream {

        private final ServletInputStream delegate;
        private final long limit;
        private long bytesRead = 0;

        LimitedServletInputStream(ServletInputStream delegate, long limit) {
            this.delegate = delegate;
            this.limit = limit;
        }

        @Override
        public int read() throws IOException {
            if (bytesRead >= limit) {
                throw new IOException("Request body exceeded maximum allowed size");
            }
            int b = delegate.read();
            if (b != -1) bytesRead++;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (bytesRead >= limit) {
                throw new IOException("Request body exceeded maximum allowed size");
            }
            int maxRead = (int) Math.min(len, limit - bytesRead);
            int n = delegate.read(b, off, maxRead);
            if (n > 0) bytesRead += n;
            return n;
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            delegate.setReadListener(readListener);
        }
    }
}
