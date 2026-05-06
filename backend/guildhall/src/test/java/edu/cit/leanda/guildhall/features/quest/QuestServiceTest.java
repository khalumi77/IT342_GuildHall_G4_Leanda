package edu.cit.leanda.guildhall.features.quest;

import edu.cit.leanda.guildhall.features.chat.ChatController;
import edu.cit.leanda.guildhall.features.guild.Guild;
import edu.cit.leanda.guildhall.features.guild.GuildRepository;
import edu.cit.leanda.guildhall.features.guild.MembershipRepository;
import edu.cit.leanda.guildhall.features.quest.QuestType;
import edu.cit.leanda.guildhall.features.user.User;
import edu.cit.leanda.guildhall.features.user.UserRepository;
import edu.cit.leanda.guildhall.shared.decorator.ApiResponseWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class QuestServiceTest {

    @Test
    void completeQuestAwardsXpAndUpdatesLevel() {
        QuestRepository questRepository = mock(QuestRepository.class);
        GuildRepository guildRepository = mock(GuildRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        MembershipRepository membershipRepository = mock(MembershipRepository.class);
        ChatController chatController = mock(ChatController.class);
        ApiResponseWrapper wrapper = new ApiResponseWrapper();

        QuestController controller = new QuestController(
                questRepository,
                guildRepository,
                userRepository,
                membershipRepository,
                wrapper,
                chatController
        );

        User poster = User.builder()
                .id(1L)
                .email("poster@example.com")
                .username("poster")
                .build();

        User helper = User.builder()
                .id(2L)
                .email("helper@example.com")
                .username("helper")
                .level(1)
                .xp(90)
                .build();

        Guild guild = Guild.builder().id(10L).name("Guild").build();

        Quest quest = Quest.builder()
                .id(100L)
                .guild(guild)
                .poster(poster)
                .helper(helper)
                .status(QuestStatus.PENDING)
                .questType(QuestType.VOLUNTEER)
                .xpReward(20)
                .title("Collect herbs")
                .build();

        when(userRepository.findByEmail("poster@example.com")).thenReturn(Optional.of(poster));
        when(questRepository.findById(100L)).thenReturn(Optional.of(quest));
        when(userRepository.findById(2L)).thenReturn(Optional.of(helper));
        when(questRepository.save(any(Quest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDetails userDetails = org.springframework.security.core.userdetails.User.withUsername("poster@example.com")
                .password("pass")
                .authorities(List.of())
                .build();

        ResponseEntity<?> response = controller.completeQuest(10L, 100L, userDetails);

        assertEquals(200, response.getStatusCodeValue());
        assertEquals(110, helper.getXp());
        assertEquals(2, helper.getLevel());
    }
}
