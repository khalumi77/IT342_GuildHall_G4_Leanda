package com.guildhall.backend.exception;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex) {
        return buildError(HttpStatus.NOT_FOUND, "DB-001", ex.getMessage());
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<?> handleUnauthorized(UnauthorizedException ex) {
        return buildError(HttpStatus.UNAUTHORIZED, "AUTH-003", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleIllegalState(IllegalStateException ex) {
        return buildError(HttpStatus.UNPROCESSABLE_ENTITY, "QUEST-002", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "SYSTEM-001", "Internal server error");
    }

    private ResponseEntity<?> buildError(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "success", false,
                "data", (Object) null,
                "error", Map.of("code", code, "message", message),
                "timestamp", Instant.now().toString()
        ));
    }
}