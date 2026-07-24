package com.pqc.document.security;

import com.pqc.document.entity.User;
import com.pqc.document.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

/**
 * Handles successful OAuth 2.0 authentication.
 * 
 * OAuth 2.0 Authorization Code Flow:
 * 1. User redirected to provider (Google/GitHub)
 * 2. User authenticates with provider
 * 3. Provider redirects back with authorization code
 * 4. Server exchanges code for access token (server-side)
 * 5. Server fetches user info from provider
 * 6. This handler creates/updates local user account
 * 7. User redirected to dashboard
 * 
 * This follows industry best practices:
 * - Authorization Code Grant (most secure for web apps)
 * - PKCE extension for additional security
 * - State parameter for CSRF protection
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        
        if (authentication instanceof OAuth2AuthenticationToken oauth2Token) {
            OAuth2User oauth2User = oauth2Token.getPrincipal();
            String provider = oauth2Token.getAuthorizedClientRegistrationId();
            
            log.info("OAuth2 login successful from provider: {}", provider);
            
            // Extract user info based on provider
            String email = extractEmail(oauth2User, provider);
            String name = extractName(oauth2User, provider);
            String providerId = extractProviderId(oauth2User, provider);
            
            // Find or create user
            User user = findOrCreateOAuth2User(email, name, provider, providerId);
            
            // Generate JWT token and store in session
            String jwt = jwtTokenProvider.generateToken(user.getUsername());
            request.getSession().setAttribute("jwt", jwt);
            request.getSession().setAttribute("oauth2Provider", provider);
            
            log.info("OAuth2 user authenticated: {} via {}", email, provider);
        }
        
        setDefaultTargetUrl("/dashboard");
        super.onAuthenticationSuccess(request, response, authentication);
    }

    private String extractEmail(OAuth2User oauth2User, String provider) {
        Map<String, Object> attributes = oauth2User.getAttributes();
        
        return switch (provider.toLowerCase()) {
            case "google" -> (String) attributes.get("email");
            case "github" -> {
                // GitHub may have private email
                String email = (String) attributes.get("email");
                if (email == null) {
                    // Use login as fallback
                    email = attributes.get("login") + "@github.local";
                }
                yield email;
            }
            default -> oauth2User.getName() + "@" + provider + ".local";
        };
    }

    private String extractName(OAuth2User oauth2User, String provider) {
        Map<String, Object> attributes = oauth2User.getAttributes();
        
        return switch (provider.toLowerCase()) {
            case "google" -> (String) attributes.get("name");
            case "github" -> {
                String name = (String) attributes.get("name");
                if (name == null) {
                    name = (String) attributes.get("login");
                }
                yield name;
            }
            default -> oauth2User.getName();
        };
    }

    private String extractProviderId(OAuth2User oauth2User, String provider) {
        Map<String, Object> attributes = oauth2User.getAttributes();
        
        return switch (provider.toLowerCase()) {
            case "google" -> (String) attributes.get("sub");
            case "github" -> String.valueOf(attributes.get("id"));
            default -> oauth2User.getName();
        };
    }

    private User findOrCreateOAuth2User(String email, String name, String provider, String providerId) {
        // Check if user exists by email
        Optional<User> existingUser = userRepository.findByEmail(email);
        
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            // Update OAuth2 info if needed
            user.setOauth2Provider(provider);
            user.setOauth2ProviderId(providerId);
            return userRepository.save(user);
        }
        
        // Create new user from OAuth2
        String username = email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9]", "");
        
        // Ensure unique username
        int suffix = 1;
        String baseUsername = username;
        while (userRepository.findByUsername(username).isPresent()) {
            username = baseUsername + suffix++;
        }
        
        User newUser = User.builder()
                .username(username)
                .email(email)
                .fullName(name)
                .passwordHash("OAUTH2_USER") // OAuth2 users don't have local passwords
                .role(User.UserRole.CITIZEN)
                .oauth2Provider(provider)
                .oauth2ProviderId(providerId)
                .build();
        
        log.info("Created new OAuth2 user: {} from {}", username, provider);
        return userRepository.save(newUser);
    }
}
