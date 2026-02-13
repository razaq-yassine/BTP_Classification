package com.genericsaas.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtils {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private int jwtExpirationMs;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }
    
    public String generateJwtToken(UserDetails userPrincipal) {
        logger.info("🔐 Generating JWT token for user: {}", userPrincipal.getUsername());
        return generateTokenFromUsername(userPrincipal.getUsername());
    }
    
    public String generateTokenFromUsername(String username) {
        Map<String, Object> claims = new HashMap<>();
        return createToken(claims, username);
    }
    
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
        
        logger.debug("📅 Creating token for subject: {} | Issued: {} | Expires: {}", 
                    subject, now, expiryDate);
        
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    public String getUserNameFromJwtToken(String token) {
        try {
            String username = getClaimFromToken(token, Claims::getSubject);
            logger.debug("👤 Extracted username from token: {}", username);
            return username;
        } catch (Exception e) {
            logger.error("❌ Failed to extract username from token: {}", e.getMessage());
            throw e;
        }
    }
    
    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }
    
    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }
    
    private Claims getAllClaimsFromToken(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            logger.error("❌ Failed to parse JWT token claims: {}", e.getMessage());
            throw e;
        }
    }
    
    private Boolean isTokenExpired(String token) {
        try {
            final Date expiration = getExpirationDateFromToken(token);
            boolean expired = expiration.before(new Date());
            logger.debug("⏰ Token expiration check - Expires: {} | Is Expired: {}", expiration, expired);
            return expired;
        } catch (Exception e) {
            logger.error("❌ Failed to check token expiration: {}", e.getMessage());
            return true; // Treat as expired if we can't check
        }
    }
    
    public Boolean validateJwtToken(String authToken) {
        if (authToken == null || authToken.trim().isEmpty()) {
            logger.warn("⚠️ JWT token is null or empty");
            return false;
        }
        
        try {
            Claims claims = Jwts.parser()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(authToken)
                    .getBody();
            
            Date expiration = claims.getExpiration();
            Date now = new Date();
            
            return !expiration.before(now);
            
        } catch (MalformedJwtException e) {
            logger.error("❌ Invalid JWT token format: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("❌ JWT token is expired: {} | Expired at: {}", e.getMessage(), e.getClaims().getExpiration());
        } catch (UnsupportedJwtException e) {
            logger.error("❌ JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("❌ JWT claims string is empty: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("❌ Unexpected error validating JWT token: {}", e.getMessage(), e);
        }
        
        return false;
    }
    
    public Boolean validateToken(String token, UserDetails userDetails) {
        try {
            final String username = getUserNameFromJwtToken(token);
            boolean usernameMatches = username.equals(userDetails.getUsername());
            boolean tokenNotExpired = !isTokenExpired(token);
            
            logger.debug("🔐 Token validation - Username matches: {} | Not expired: {} | Overall valid: {}", 
                        usernameMatches, tokenNotExpired, usernameMatches && tokenNotExpired);
            
            return usernameMatches && tokenNotExpired;
        } catch (Exception e) {
            logger.error("❌ Error validating token against user details: {}", e.getMessage());
            return false;
        }
    }
}
