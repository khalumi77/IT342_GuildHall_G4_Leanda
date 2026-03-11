package edu.cit.leanda.guildhall.controller;

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
import edu.cit.leanda.guildhall.service.GoogleAuthService;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;

    /**
     * POST /api/v1/auth/register
     * Native user registration — email + username + password
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(wrap(response));
    }

    /**
     * POST /api/v1/auth/login
     * Standard login — returns JWT on success
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(wrap(response));
    }

    /**
     * POST /api/v1/auth/skills
     * Saves skills selected on the first-time skills screen.
     * Requires a valid JWT (the one returned right after registration).
     */
    @PostMapping("/skills")
    public ResponseEntity<?> saveSkills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SkillsRequest request) {

        AuthResponse response = authService.saveSkills(userDetails.getUsername(), request);
        return ResponseEntity.ok(wrap(response));
    }

    /**
     * GET /api/v1/auth/me
     * Returns the currently logged-in user's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {

        AuthResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(wrap(response));
    }

    /**
     * POST /api/v1/auth/logout
     * Stateless JWT — just acknowledge; client discards the token.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "Logged out successfully"),
                "timestamp", Instant.now().toString()
        ));
    }

    /**
     * POST /api/v1/auth/google
     * Verifies a Google ID token and returns a GuildHall JWT.
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("message", "idToken is required")
            ));
        }
        AuthResponse response = googleAuthService.googleLogin(idToken);
        return ResponseEntity.ok(wrap(response));
    }

    // ── Wrapper — matches the standard response structure from the SDD ───────
    private Map<String, Object> wrap(AuthResponse response) {
        return Map.of(
                "success", response.isSuccess(),
                "data", response,
                "timestamp", Instant.now().toString()
        );
    }
}