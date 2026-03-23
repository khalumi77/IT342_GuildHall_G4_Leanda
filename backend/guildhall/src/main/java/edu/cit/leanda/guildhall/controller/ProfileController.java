package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

/**
 * Handles profile updates (bio, profile picture).
 * Skills updates continue to go through POST /auth/skills.
 */
@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;

    /**
     * PUT /api/v1/profile/me
     * Updates bio and/or profilePictureUrl.
     * Accepts a JSON body with optional fields: { bio?, profilePictureUrl? }
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean changed = false;

        if (body.containsKey("bio")) {
            String bio = body.get("bio");
            // Allow null/empty to clear the bio
            user.setBio(bio != null ? bio.strip() : null);
            changed = true;
        }

        if (body.containsKey("profilePictureUrl")) {
            String url = body.get("profilePictureUrl");
            user.setProfilePictureUrl(url);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of(
                        "bio", user.getBio() != null ? user.getBio() : "",
                        "profilePictureUrl", user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : ""
                ),
                "timestamp", Instant.now().toString()
        ));
    }
}