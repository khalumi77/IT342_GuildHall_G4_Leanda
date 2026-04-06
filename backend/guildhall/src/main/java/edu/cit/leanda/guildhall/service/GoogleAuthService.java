package edu.cit.leanda.guildhall.service;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.strategy.AuthStrategyResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * GoogleAuthService — refactored with Strategy Pattern.
 *
 * The original contained 100+ lines of HTTP, token exchange, and user-management
 * logic directly in this service. That logic now lives in GoogleAuthStrategy,
 * which implements AuthStrategy and is resolved at runtime.
 *
 * This service becomes a thin façade kept for backward compatibility with
 * GoogleAuthController — it simply delegates to the strategy resolver.
 */
@Service
@RequiredArgsConstructor
public class GoogleAuthService {

    private final AuthStrategyResolver authStrategyResolver; // Strategy Pattern

    /**
     * Exchanges a Google authorization code for a GuildHall JWT.
     * Delegates to GoogleAuthStrategy via AuthStrategyResolver (Strategy Pattern).
     *
     * @param authorizationCode the code Google sent to our /callback endpoint
     */
    public AuthResponse googleLoginWithCode(String authorizationCode) {
        return authStrategyResolver.resolve(authorizationCode); // Strategy Pattern
    }
}