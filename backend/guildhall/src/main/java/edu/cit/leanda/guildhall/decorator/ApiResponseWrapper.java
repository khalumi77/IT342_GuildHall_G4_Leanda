package edu.cit.leanda.guildhall.decorator;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Decorator Pattern — ApiResponseWrapper
 *
 * Problem it solves:
 *   Every controller contained an identical private wrap(Object data) helper
 *   that stamped a consistent { success, data, timestamp } envelope onto
 *   responses. This was copy-pasted into AuthController, AdminController,
 *   GuildController, and QuestController — four copies of the same logic.
 *   Any change to the envelope structure required editing all four files.
 *
 * How it works (Decorator):
 *   This component wraps raw response data with a consistent API envelope,
 *   decorating it with metadata (success flag, timestamp) without touching
 *   the underlying payload. Controllers delegate to this class instead of
 *   building the envelope themselves.
 *
 * Usage:
 *   // Before (in every controller):
 *   return Map.of("success", true, "data", data, "timestamp", Instant.now().toString());
 *
 *   // After:
 *   return responseWrapper.ok(data);
 *   return responseWrapper.error("Something went wrong");
 */
@Component
public class ApiResponseWrapper {

    /**
     * Wraps a successful response payload.
     *
     * @param data any serializable object
     * @return { success: true, data: ..., timestamp: "..." }
     */
    public Map<String, Object> ok(Object data) {
        return Map.of(
                "success", true,
                "data", data,
                "timestamp", Instant.now().toString()
        );
    }

    /**
     * Wraps a failure response with a plain error message.
     *
     * @param message human-readable error description
     * @return { success: false, error: { message: "..." }, timestamp: "..." }
     */
    public Map<String, Object> error(String message) {
        return Map.of(
                "success", false,
                "error", Map.of("message", message),
                "timestamp", Instant.now().toString()
        );
    }
}