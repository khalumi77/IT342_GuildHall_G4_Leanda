package edu.cit.leanda.guildhall.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {

    private boolean success;
    private String token;
    private UserDto user;
    private String error;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserDto {
        private Long id;
        private String email;
        private String username;
        private String role;
        private Integer level;
        private Integer xp;
        private String rank;
        private List<String> skills;
        // true only right after a brand-new registration — tells the
        // frontend to show the skills selection screen
        private boolean newUser;
    }
}
