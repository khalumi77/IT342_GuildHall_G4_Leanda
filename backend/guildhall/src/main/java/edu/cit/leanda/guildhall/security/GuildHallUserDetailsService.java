package edu.cit.leanda.guildhall.security;

import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GuildHallUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Adventurer not found: " + email));

        // Google-only accounts have no password — use empty string so Spring Security
        // doesn't reject the UserDetails object during JWT-based authentication.
        // The actual password check is bypassed entirely because we use JWT auth,
        // not UsernamePasswordAuthenticationToken with a real password comparison.
        String password = user.getPassword() != null ? user.getPassword() : "";

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                password,
                List.of(new SimpleGrantedAuthority(user.getRole().name()))
        );
    }
}