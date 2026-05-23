package edu.cit.leanda.guildhall.features.auth;

import edu.cit.leanda.guildhall.shared.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.features.auth.dto.LoginRequest;
import edu.cit.leanda.guildhall.features.auth.dto.RegisterRequest;
import edu.cit.leanda.guildhall.features.auth.dto.SkillsRequest;
import edu.cit.leanda.guildhall.features.auth.dto.AuthResponse;
import edu.cit.leanda.guildhall.features.auth.dto.GoogleLoginRequest;
import edu.cit.leanda.guildhall.features.auth.AuthService;
import edu.cit.leanda.guildhall.features.auth.GoogleAuthService;
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
    private final GoogleAuthService googleAuthService;
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

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        if (request.getIdToken() == null || request.getIdToken().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(responseWrapper.error("idToken is required"));
        }

        AuthResponse response = googleAuthService.googleLogin(request.getIdToken());
        return ResponseEntity.ok(responseWrapper.ok(response));
    }
}


