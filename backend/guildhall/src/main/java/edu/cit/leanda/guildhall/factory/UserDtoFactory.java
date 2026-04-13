package edu.cit.leanda.guildhall.factory;

import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.entity.User;
import org.springframework.stereotype.Component;

/**
 * Factory Method Pattern — UserDtoFactory
 *
 * Problem it solves:
 *   The same User→UserDto mapping logic was duplicated in three places:
 *   AuthService#toUserDto(), GoogleAuthService#toUserDto(), and
 *   AdminController#calculateRank(). Any change to the DTO shape or rank
 *   thresholds had to be applied in all three files manually.
 *
 * How it works:
 *   This factory centralises object creation. Callers request a UserDto
 *   without needing to know its construction details — they simply call
 *   create() or createForAdmin().
 */
@Component
public class UserDtoFactory {

    /**
     * Creates a full AuthResponse.UserDto (used for login/register/google responses).
     *
     * @param user      the persisted User entity
     * @param isNewUser true on first registration — tells the frontend to show the skills screen
     */
    public AuthResponse.UserDto create(User user, boolean isNewUser) {
        int xp    = user.getXp()    != null ? user.getXp()    : 0;
        int level = user.getLevel() != null ? user.getLevel() : 1;

        return AuthResponse.UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole().name())
                .level(level)
                .xp(xp)
                .rank(calculateRank(level))
                .skills(user.getSkills())
                .newUser(isNewUser)
                .bio(user.getBio())
                .profilePictureUrl(user.getProfilePictureUrl())
                .googleSub(user.getGoogleSub())
                .build();
    }

    /**
     * Calculates the rank title from the user's level.
     * Centralised here so AdminController and the auth services all use the
     * same thresholds.
     *
     * Bronze → Silver → Gold → Mithril → Adamantite
     */
    public String calculateRank(int level) {
        if (level >= 71) return "Adamantite";
        if (level >= 51) return "Mithril";
        if (level >= 31) return "Gold";
        if (level >= 21) return "Silver";
        return "Bronze";
    }
}