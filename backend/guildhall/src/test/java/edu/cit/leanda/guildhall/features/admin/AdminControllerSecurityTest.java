package edu.cit.leanda.guildhall.features.admin;

import edu.cit.leanda.guildhall.features.guild.GuildRepository;
import edu.cit.leanda.guildhall.features.guild.MembershipRepository;
import edu.cit.leanda.guildhall.features.user.UserRepository;
import edu.cit.leanda.guildhall.shared.decorator.ApiResponseWrapper;
import edu.cit.leanda.guildhall.shared.exception.GlobalExceptionHandler;
import edu.cit.leanda.guildhall.shared.factory.UserDtoFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({ApiResponseWrapper.class, UserDtoFactory.class, GlobalExceptionHandler.class, AdminControllerSecurityTest.TestSecurityConfig.class})
class AdminControllerSecurityTest {

    @Configuration
    @EnableWebSecurity
    static class TestSecurityConfig {

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            http.csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth
                            .requestMatchers("/api/v1/admin/**").hasAuthority("ROLE_GUILDMASTER")
                            .anyRequest().permitAll()
                    );
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GuildRepository guildRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private MembershipRepository membershipRepository;

    @Test
    void adventurerBlockedFromAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/guilds")
                        .with(user("adventurer@example.com").roles("ADVENTURER")))
                .andExpect(status().isForbidden());
    }
}
