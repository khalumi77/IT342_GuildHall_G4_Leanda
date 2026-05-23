package edu.cit.leanda.guildhall.features.quest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * GET /api/v1/wisdom
 *
 * Proxies public quote APIs and serves a single daily quote. The same quote is
 * returned to all callers on the same server-local calendar day.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WisdomController {

    private record CachedQuote(LocalDate date, String text, String author) {}
    private record Quote(String text, String author) {}

    private final AtomicReference<CachedQuote> cache = new AtomicReference<>(null);

    private static final String QUOTABLE_URL =
            "https://api.quotable.io/random?tags=inspirational|wisdom|motivational&maxLength=200";
    private static final String DUMMY_JSON_URL = "https://dummyjson.com/quotes/random";
    private static final String ZEN_QUOTES_URL = "https://zenquotes.io/api/today";

    @GetMapping("/wisdom")
    public ResponseEntity<?> getWisdom() {
        LocalDate today = LocalDate.now();
        CachedQuote cached = cache.get();

        if (cached != null && cached.date().equals(today)) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "text", cached.text(),
                            "author", cached.author()
                    )
            ));
        }

        try {
            Quote quote = fetchFreshQuote();
            CachedQuote fresh = new CachedQuote(today, quote.text(), quote.author());
            cache.set(fresh);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of("text", quote.text(), "author", quote.author())
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", Map.of(
                            "text", "The secret of getting ahead is getting started.",
                            "author", "Mark Twain"
                    )
            ));
        }
    }

    private Quote fetchFreshQuote() {
        RestTemplate rt = new RestTemplate();

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = rt.getForObject(QUOTABLE_URL, Map.class);
            if (payload != null) {
                String text = (String) payload.get("content");
                String author = (String) payload.get("author");
                if (isUsable(text, author)) return new Quote(text, author);
            }
        } catch (Exception ignored) { }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = rt.getForObject(DUMMY_JSON_URL, Map.class);
            if (payload != null) {
                String text = (String) payload.get("quote");
                String author = (String) payload.get("author");
                if (isUsable(text, author)) return new Quote(text, author);
            }
        } catch (Exception ignored) { }

        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> payload = rt.getForObject(ZEN_QUOTES_URL, List.class);
            if (payload != null && !payload.isEmpty()) {
                Map<String, Object> first = payload.get(0);
                String text = (String) first.get("q");
                String author = (String) first.get("a");
                if (isUsable(text, author)) return new Quote(text, author);
            }
        } catch (Exception ignored) { }

        throw new IllegalStateException("No quote provider returned a usable quote");
    }

    private boolean isUsable(String text, String author) {
        return text != null && !text.isBlank() && author != null && !author.isBlank();
    }
}
