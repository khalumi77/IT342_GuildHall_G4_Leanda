package edu.cit.leanda.guildhall.strategy;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;

/**
 * Strategy Pattern — AuthStrategy
 *
 * Problem it solves:
 *   Authentication methods (email/password, Google OAuth) were entangled in
 *   a single AuthService, making it hard to add new providers (OTP, GitHub,
 *   etc.) without modifying existing code (violates Open/Closed Principle).
 *
 * How it works:
 *   Each authentication method implements this interface. The system selects
 *   the correct strategy at runtime based on the request type, keeping each
 *   auth flow isolated and independently testable.
 *
 * Current concrete strategies:
 *   - EmailAuthStrategy  (email + password login / registration)
 *   - GoogleAuthStrategy (server-side OAuth2 code exchange)
 *
 * Future strategies to add without touching existing code:
 *   - OtpAuthStrategy
 *   - GithubAuthStrategy
 */
public interface AuthStrategy {

    /**
     * Returns true if this strategy can handle the given credential payload.
     * Used by AuthStrategyResolver to pick the right strategy.
     *
     * @param credentials arbitrary credential object (LoginRequest, OAuth code string, etc.)
     */
    boolean supports(Object credentials);

    /**
     * Performs authentication and returns a JWT-bearing AuthResponse.
     *
     * @param credentials the credential payload (same object passed to supports())
     * @throws org.springframework.security.authentication.BadCredentialsException on failure
     */
    AuthResponse authenticate(Object credentials);
}