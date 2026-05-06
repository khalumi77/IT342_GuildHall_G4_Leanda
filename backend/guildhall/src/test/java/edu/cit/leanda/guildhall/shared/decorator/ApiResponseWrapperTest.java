package edu.cit.leanda.guildhall.shared.decorator;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseWrapperTest {

    private final ApiResponseWrapper wrapper = new ApiResponseWrapper();

    @Test
    void okWrapsPayloadCorrectly() {
        Map<String, Object> payload = Map.of("foo", "bar");
        Map<String, Object> result = wrapper.ok(payload);

        assertTrue((Boolean) result.get("success"));
        assertSame(payload, result.get("data"));
        assertNotNull(result.get("timestamp"));
    }

    @Test
    void errorWrapsMessageCorrectly() {
        Map<String, Object> result = wrapper.error("Failure occurred");

        assertFalse((Boolean) result.get("success"));
        assertNotNull(result.get("timestamp"));
        assertEquals(Map.of("message", "Failure occurred"), result.get("error"));
        assertNull(result.get("data"));
    }
}
