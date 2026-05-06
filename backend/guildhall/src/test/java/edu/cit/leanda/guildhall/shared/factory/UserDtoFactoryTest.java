package edu.cit.leanda.guildhall.shared.factory;

import edu.cit.leanda.guildhall.features.auth.dto.AuthResponse;
import edu.cit.leanda.guildhall.features.user.Role;
import edu.cit.leanda.guildhall.features.user.User;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UserDtoFactoryTest {

    private final UserDtoFactory factory = new UserDtoFactory();

    @Test
    void calculateRankThresholds() {
        assertEquals("Bronze", factory.calculateRank(1));
        assertEquals("Silver", factory.calculateRank(21));
        assertEquals("Gold", factory.calculateRank(31));
        assertEquals("Mithril", factory.calculateRank(51));
        assertEquals("Adamantite", factory.calculateRank(71));
    }

    @Test
    void createBuildsUserDtoWithDefaultsAndRank() {
        User user = User.builder()
                .id(42L)
                .email("hero@example.com")
                .username("hero")
                .role(Role.ROLE_ADVENTURER)
                .level(55)
                .xp(510)
                .skills(List.of("Design", "IT/Tech"))
                .bio("Guild leader")
                .profilePictureUrl("https://example.com/avatar.png")
                .googleSub("google-sub-id")
                .build();

        AuthResponse.UserDto userDto = factory.create(user, true);

        assertEquals(42L, userDto.getId());
        assertEquals("hero@example.com", userDto.getEmail());
        assertEquals("hero", userDto.getUsername());
        assertEquals("ROLE_ADVENTURER", userDto.getRole());
        assertEquals(55, userDto.getLevel());
        assertEquals(510, userDto.getXp());
        assertEquals("Mithril", userDto.getRank());
        assertEquals(List.of("Design", "IT/Tech"), userDto.getSkills());
        assertTrue(userDto.isNewUser());
        assertEquals("Guild leader", userDto.getBio());
        assertEquals("https://example.com/avatar.png", userDto.getProfilePictureUrl());
        assertEquals("google-sub-id", userDto.getGoogleSub());
    }
}
