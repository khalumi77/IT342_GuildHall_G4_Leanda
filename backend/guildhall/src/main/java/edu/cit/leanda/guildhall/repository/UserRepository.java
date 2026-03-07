// UserRepository.java
package edu.cit.leanda.guildhall.repository;
import edu.cit.leanda.guildhall.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    Optional<User> findByGoogleSub(String googleSub);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}