package edu.cit.leanda.guildhall.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocketConfig — configures STOMP over WebSocket for quest chat.
 *
 * Endpoint: /ws  (clients connect here)
 * App prefix: /app  (client → server messages go to @MessageMapping methods)
 * Broker prefix: /topic  (server → client broadcasts)
 *
 * Example flow:
 *   SUBSCRIBE  /topic/quest/42   ← listen for messages on quest 42
 *   SEND       /app/chat/42      ← send a message to quest 42
 *   BROADCAST  /topic/quest/42   ← all subscribers receive the message
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.setApplicationDestinationPrefixes("/app");
        config.enableSimpleBroker("/topic", "/queue");
    }
}