package edu.cit.leanda.guildhall.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * GET /api/v1/wisdom
 *
 * Proxies the Quotable API (https://api.quotable.io/random) and serves a
 * single daily quote — the same quote is returned to all callers on the same
 * calendar day, refreshing automatically at midnight UTC.
 *
 * Why proxy instead of calling from the frontend?
 * 1. Avoids CORS issues on some deployment environments.
 * 2. Lets us cache server-side so every user gets the same "quote of the day".
 * 3. Keeps the external API call out of client bundles.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WisdomController {

    // Simple in-memory daily cache — resets on server restart (acceptable for this use case)
    private record CachedQuote(LocalDate date, String text, String author) {}
    private final AtomicReference<CachedQuote> cache = new AtomicReference<>(null);

    private static final String QUOTABLE_URL =
            "https://api.quotable.io/random?tags=inspirational|wisdom|motivational&maxLength=200";

    @GetMapping("/wisdom")
    public ResponseEntity<?> getWisdom() {
        LocalDate today = LocalDate.now();
        CachedQuote cached = cache.get();

        // Return cached quote if it's still today's
        if (cached != null && cached.date().equals(today)) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "text",   cached.text(),
                            "author", cached.author()
                    )
            ));
        }

        // Fetch a fresh quote from Quotable
        try {
            RestTemplate rt = new RestTemplate();
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = rt.getForObject(QUOTABLE_URL, Map.class);

            if (payload == null) throw new RuntimeException("Empty response from Quotable");

            String text   = (String) payload.getOrDefault("content", "The only limit to our realization of tomorrow is our doubts of today.");
            String author = (String) payload.getOrDefault("author",  "Franklin D. Roosevelt");

            CachedQuote fresh = new CachedQuote(today, text, author);
            cache.set(fresh);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of("text", text, "author", author)
            ));

        } catch (Exception e) {
            // Quotable is down or rate-limited — serve a fallback without caching it
            // so we retry on the next request
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "text",   "The secret of getting ahead is getting started.",
                            "author", "Mark Twain"
                    )
            ));
        }
    }
}