package edu.cit.leanda.guildhall.features.auth;

import edu.cit.leanda.guildhall.features.auth.dto.AuthResponse;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AuthStrategyResolverTest {

    @Test
    void resolvesCorrectStrategy() {
        AuthStrategy emailStrategy = new AuthStrategy() {
            @Override
            public boolean supports(Object credentials) {
                return credentials instanceof String && credentials.equals("email");
            }

            @Override
            public AuthResponse authenticate(Object credentials) {
                return AuthResponse.builder().token("email-token").success(true).build();
            }
        };

        AuthStrategy googleStrategy = new AuthStrategy() {
            @Override
            public boolean supports(Object credentials) {
                return credentials instanceof String && credentials.equals("google");
            }

            @Override
            public AuthResponse authenticate(Object credentials) {
                return AuthResponse.builder().token("google-token").success(true).build();
            }
        };

        AuthStrategyResolver resolver = new AuthStrategyResolver(List.of(emailStrategy, googleStrategy));

        AuthResponse response = resolver.resolve("google");

        assertTrue(response.isSuccess());
        assertEquals("google-token", response.getToken());
    }

    @Test
    void throwsWhenNoStrategyMatches() {
        AuthStrategyResolver resolver = new AuthStrategyResolver(List.of());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> resolver.resolve(123));
        assertTrue(ex.getMessage().contains("No auth strategy found"));
    }
}
