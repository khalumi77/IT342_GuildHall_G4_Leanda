package edu.cit.leanda.guildhall.shared.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseSchemaFixer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbcTemplate.execute("ALTER TABLE quests ALTER COLUMN attachment_path TYPE TEXT");
        } catch (Exception ignored) {
            // The column may already be TEXT, or the table may not exist yet in a fresh test database.
        }
    }
}
