package edu.cit.leanda.guildhall.shared.security;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String SECRET = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

    @Test
    void generateAndValidateToken() throws Exception {
        JwtUtil jwtUtil = new JwtUtil();
        setPrivateField(jwtUtil, "secret", SECRET);
        setPrivateField(jwtUtil, "expiration", 1_000L);

        String token = jwtUtil.generateToken("player@example.com");

        assertNotNull(token);
        assertEquals("player@example.com", jwtUtil.extractEmail(token));
        assertTrue(jwtUtil.isTokenValid(token));

        String tampered = token + "x";
        assertFalse(jwtUtil.isTokenValid(tampered));
    }

    @Test
    void expiredTokenIsInvalid() throws Exception {
        JwtUtil jwtUtil = new JwtUtil();
        setPrivateField(jwtUtil, "secret", SECRET);
        setPrivateField(jwtUtil, "expiration", -1L);

        String token = jwtUtil.generateToken("player@example.com");

        assertNotNull(token);
        assertFalse(jwtUtil.isTokenValid(token));
    }

    private static void setPrivateField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
