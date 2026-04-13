package edu.cit.leanda.guildhall.strategy;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Strategy Pattern — AuthStrategyResolver
 *
 * Resolves and delegates to the correct AuthStrategy at runtime.
 * Spring auto-injects all AuthStrategy beans into the list, so adding a new
 * auth method (OTP, GitHub, etc.) only requires:
 *   1. Creating a new AuthStrategy implementation
 *   2. Annotating it with @Component
 * No changes to this class or any controller are needed.
 */
@Component
@RequiredArgsConstructor
public class AuthStrategyResolver {

    private final List<AuthStrategy> strategies;

    /**
     * Finds the first strategy that supports the given credential payload
     * and delegates authentication to it.
     *
     * @param credentials LoginRequest, String (OAuth code), etc.
     * @throws IllegalStateException if no strategy supports the credentials
     */
    public AuthResponse resolve(Object credentials) {
        return strategies.stream()
                .filter(s -> s.supports(credentials))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "No auth strategy found for credentials type: "
                        + credentials.getClass().getSimpleName()))
                .authenticate(credentials);
    }
}