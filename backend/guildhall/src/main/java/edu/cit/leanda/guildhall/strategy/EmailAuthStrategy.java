package edu.cit.leanda.guildhall.strategy;

import edu.cit.leanda.guildhall.dto.request.LoginRequest;
import edu.cit.leanda.guildhall.dto.response.AuthResponse;
import edu.cit.leanda.guildhall.entity.User;
import edu.cit.leanda.guildhall.factory.UserDtoFactory;
import edu.cit.leanda.guildhall.repository.UserRepository;
import edu.cit.leanda.guildhall.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Strategy Pattern — EmailAuthStrategy
 *
 * Handles username/email + password authentication.
 * Extracted from AuthService#login() — logic is identical, now isolated.
 */
@Component
@RequiredArgsConstructor
public class EmailAuthStrategy implements AuthStrategy {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserDtoFactory userDtoFactory;

    @Override
    public boolean supports(Object credentials) {
        return credentials instanceof LoginRequest;
    }

    @Override
    public AuthResponse authenticate(Object credentials) {
        LoginRequest request = (LoginRequest) credentials;

        // Accept either username or email (case-insensitive email lookup)
        User user = userRepository.findByUsername(request.getUsername())
                .orElseGet(() -> userRepository.findByEmail(request.getUsername().toLowerCase())
                        .orElseThrow(() -> new BadCredentialsException("Invalid credentials")));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(userDtoFactory.create(user, false))
                .build();
    }
}