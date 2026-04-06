package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.dto.request.LoginRequest;
import edu.cit.leanda.guildhall.dto.request.RegisterRequest;
import edu.cit.leanda.guildhall.dto.request.SkillsRequest;
import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AuthController — refactored with Decorator Pattern.
 *
 * Change: the private wrap(AuthResponse response) helper has been removed.
 * All response enveloping is now delegated to ApiResponseWrapper (Decorator Pattern),
 * which is injected and shared across all controllers.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ApiResponseWrapper responseWrapper; // Decorator Pattern

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(responseWrapper.ok(response)); // Decorator Pattern
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(responseWrapper.ok(response)); // Decorator Pattern
    }

    @PostMapping("/skills")
    public ResponseEntity<?> saveSkills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SkillsRequest request) {
        AuthResponse response = authService.saveSkills(userDetails.getUsername(), request);
        return ResponseEntity.ok(responseWrapper.ok(response)); // Decorator Pattern
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        AuthResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(responseWrapper.ok(response)); // Decorator Pattern
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(
                responseWrapper.ok(Map.of("message", "Logged out successfully"))); // Decorator Pattern
    }
}