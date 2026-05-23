package edu.cit.leanda.guildhall.features.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.cit.leanda.guildhall.features.auth.dto.AuthResponse;
import edu.cit.leanda.guildhall.features.auth.dto.RegisterRequest;
import edu.cit.leanda.guildhall.shared.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.shared.exception.GlobalExceptionHandler;
import edu.cit.leanda.guildhall.shared.security.JwtAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import({ApiResponseWrapper.class, GlobalExceptionHandler.class})
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private GoogleAuthService googleAuthService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @Test
    void registerReturnsCreated() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("adventurer@example.com");
        request.setUsername("adventurer");
        request.setPassword("supersecret");

        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(AuthResponse.builder().success(true).token("jwt-token").build());

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .with(user("tester").roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("jwt-token"));
    }

    @Test
    void registerDuplicateEmailReturnsConflict() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("adventurer@example.com");
        request.setUsername("adventurer");
        request.setPassword("supersecret");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("An adventurer with this email already exists"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .with(csrf())
                        .with(user("tester").roles("USER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("DB-002"));
    }
}
