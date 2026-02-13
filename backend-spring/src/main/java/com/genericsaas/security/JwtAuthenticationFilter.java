package com.genericsaas.security;

import com.genericsaas.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtUtils jwtUtils;
    
    @Autowired
    private UserDetailsServiceImpl userDetailsService;
    
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        String requestURI = request.getRequestURI();
        String method = request.getMethod();
        
        // Only log for non-auth endpoints to reduce noise
        if (!requestURI.startsWith("/api/auth")) {
            logger.debug("🔍 JWT Filter processing: {} {}", method, requestURI);
        }
        
        try {
            String jwt = parseJwt(request);
            
            if (jwt != null) {
                if (jwtUtils.validateJwtToken(jwt)) {
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    
                    try {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        
                        UsernamePasswordAuthenticationToken authentication = 
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        // Only log successful auth for non-routine endpoints
                        if (!requestURI.equals("/api/auth/me")) {
                            logger.debug("🎉 Authentication set for user: {} accessing {} {}", username, method, requestURI);
                        }
                        
                    } catch (Exception userLoadException) {
                        logger.error("❌ Failed to load user details for username: {} | Error: {}", 
                                   username, userLoadException.getMessage());
                    }
                } else {
                    logger.warn("⚠️ Invalid JWT token for {} {} (length: {})", method, requestURI, jwt.length());
                }
            } else {
                logger.debug("🚫 No JWT token found for {} {}", method, requestURI);
            }
            
        } catch (Exception e) {
            logger.error("❌ JWT Authentication Filter error for {} {}: {}", method, requestURI, e.getMessage(), e);
            // Clear any partial authentication
            SecurityContextHolder.clearContext();
        }
        
        // Only log final auth status for failed authentications or important endpoints
        boolean isAuthenticated = SecurityContextHolder.getContext().getAuthentication() != null 
                                && SecurityContextHolder.getContext().getAuthentication().isAuthenticated()
                                && !"anonymousUser".equals(SecurityContextHolder.getContext().getAuthentication().getName());
        
        if (!isAuthenticated && !requestURI.startsWith("/api/auth")) {
            logger.warn("📊 Authentication failed for {} {}", method, requestURI);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7).trim();
        }
        
        return null;
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        
        // Skip JWT filter only for login endpoints, h2-console, and actuator
        // Note: /api/auth/me should be processed by JWT filter (requires authentication)
        return path.equals("/api/auth/login") || 
               path.equals("/auth/login") || 
               path.startsWith("/h2-console/") || 
               path.startsWith("/actuator/");
    }
}
