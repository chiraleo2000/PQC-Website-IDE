package com.pqc.document.config;

import com.pqc.document.security.JwtAuthenticationFilter;
import com.pqc.document.security.OAuth2AuthenticationSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security configuration with JWT authentication and OAuth 2.0 support.
 * 
 * This configuration follows industry best practices:
 * - Form-based login for traditional web users
 * - OAuth 2.0 for social login (Google, GitHub, etc.)
 * - JWT tokens for API authentication
 * - Session management with cookies for web UI
 * 
 * OAuth 2.0 Flow (Authorization Code Grant):
 * 1. User clicks "Login with Google/GitHub"
 * 2. Redirect to provider's authorization endpoint
 * 3. User authenticates with provider
 * 4. Provider redirects back with authorization code
 * 5. Server exchanges code for access token
 * 6. Server creates local session/JWT
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private static final String LOGIN_PATH = "/login";
    private static final String DASHBOARD_PATH = "/dashboard";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_OFFICER = "OFFICER";

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final OAuth2AuthenticationSuccessHandler oAuth2SuccessHandler;
    
    @Value("${oauth2.enabled:false}")
    private boolean oauth2Enabled;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints - Web UI
                        .requestMatchers("/", LOGIN_PATH, "/logout", "/error").permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                        
                        // Public endpoints - API
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/api/transactions").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()

                        // Admin only endpoints
                        .requestMatchers("/api/admin/**").hasRole(ROLE_ADMIN)
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole(ROLE_ADMIN)

                        // Officer and Admin can approve
                        .requestMatchers("/api/documents/*/approve").hasAnyRole(ROLE_ADMIN, ROLE_OFFICER)
                        .requestMatchers("/api/documents/*/reject").hasAnyRole(ROLE_ADMIN, ROLE_OFFICER)
                        .requestMatchers("/officer/**").hasAnyRole(ROLE_ADMIN, ROLE_OFFICER)

                        // Service pages need authentication
                        .requestMatchers(DASHBOARD_PATH, "/services/**").authenticated()

                        // Authenticated users for everything else
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        .loginPage(LOGIN_PATH)
                        .loginProcessingUrl(LOGIN_PATH)
                        .defaultSuccessUrl(DASHBOARD_PATH, true)
                        .failureUrl(LOGIN_PATH + "?error=true")
                        .permitAll())
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl(LOGIN_PATH + "?logout=true")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll())
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        // Configure OAuth 2.0 if enabled
        if (oauth2Enabled) {
            http.oauth2Login(oauth2 -> oauth2
                    .loginPage(LOGIN_PATH)
                    .defaultSuccessUrl(DASHBOARD_PATH, true)
                    .successHandler(oAuth2SuccessHandler)
                    .failureUrl(LOGIN_PATH + "?error=oauth2_error")
            );
        }

        // Allow H2 console frames
        http.headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    @SuppressWarnings("deprecation")
    AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(passwordEncoder());
        authProvider.setUserDetailsService(userDetailsService);
        return authProvider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
