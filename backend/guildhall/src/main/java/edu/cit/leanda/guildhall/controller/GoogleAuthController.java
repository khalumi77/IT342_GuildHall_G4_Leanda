package edu.cit.leanda.guildhall.controller;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.service.GoogleAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Backend-driven Google OAuth2 flow.
 *
 * Step 1 — browser hits GET /api/v1/auth/google/init
 *           → backend builds the Google consent URL and redirects the browser to it
 *
 * Step 2 — Google redirects back to GET /api/v1/auth/google/callback?code=...
 *           → backend exchanges the code for tokens (server-to-server, no client involvement)
 *           → backend issues a GuildHall JWT
 *           → backend redirects browser to the React frontend with the JWT as a query param
 *
 * The frontend never touches Google directly.
 */
@RestController
@RequestMapping("/api/v1/auth/google")
@RequiredArgsConstructor
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    @Value("${frontend.url}")
    private String frontendUrl;

    // ── Step 1: initiate the flow ─────────────────────────────────────────────

    /**
     * GET /api/v1/auth/google/init
     *
     * Builds the Google OAuth2 authorization URL and redirects the browser to it.
     * The frontend just navigates to this endpoint — it never calls Google itself.
     */
    @GetMapping("/init")
    public void initiateGoogleLogin(HttpServletResponse response) throws IOException {
        String googleAuthUrl = UriComponentsBuilder
                .fromHttpUrl("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("access_type", "offline")
                .queryParam("prompt", "select_account")
                .build()
                .toUriString();

        response.sendRedirect(googleAuthUrl);
    }

    // ── Step 2: handle Google's callback ─────────────────────────────────────

    /**
     * GET /api/v1/auth/google/callback?code=...
     *
     * Google redirects here after the user approves.
     * The backend exchanges the authorization code for tokens entirely server-side,
     * creates/finds the user, issues a JWT, then redirects the browser back to the
     * React frontend with the JWT attached as a query parameter.
     *
     * On error, redirects to the frontend login page with an error flag.
     */
    @GetMapping("/callback")
    public void handleGoogleCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        // User denied consent or something went wrong on Google's side
        if (error != null || code == null) {
            response.sendRedirect(frontendUrl + "/login?error=google_denied");
            return;
        }

        try {
            AuthResponse authResponse = googleAuthService.googleLoginWithCode(code);

            // Build redirect URL back to the React app
            // The frontend reads the token from the URL on mount and stores it
            String redirectUrl = UriComponentsBuilder
                    .fromHttpUrl(frontendUrl + "/auth/google/success")
                    .queryParam("token", authResponse.getToken())
                    .queryParam("newUser", authResponse.getUser().isNewUser())
                    .build()
                    .toUriString();

            response.sendRedirect(redirectUrl);

        } catch (Exception ex) {
            ex.printStackTrace();
            String encodedMsg = URLEncoder.encode(
                    ex.getMessage() != null ? ex.getMessage() : "Google login failed",
                    StandardCharsets.UTF_8);
            response.sendRedirect(frontendUrl + "/login?error=" + encodedMsg);
        }
    }
}