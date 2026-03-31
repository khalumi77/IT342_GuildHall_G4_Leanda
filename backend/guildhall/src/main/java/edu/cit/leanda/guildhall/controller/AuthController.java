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

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(wrap(response));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(wrap(response));
    }

    @PostMapping("/skills")
    public ResponseEntity<?> saveSkills(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SkillsRequest request) {
        AuthResponse response = authService.saveSkills(userDetails.getUsername(), request);
        return ResponseEntity.ok(wrap(response));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        AuthResponse response = authService.getCurrentUser(userDetails.getUsername());
        return ResponseEntity.ok(wrap(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("message", "Logged out successfully"),
                "timestamp", Instant.now().toString()
        ));
    }

    private Map<String, Object> wrap(AuthResponse response) {
        return Map.of(
                "success", response.isSuccess(),
                "data", response,
                "timestamp", Instant.now().toString()
        );
    }
}