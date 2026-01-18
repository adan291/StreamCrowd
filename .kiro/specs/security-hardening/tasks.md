# Implementation Plan: Security Hardening

## Overview

This implementation plan breaks down the Security Hardening feature into discrete, executable tasks. Each task builds on previous tasks and includes property-based tests to verify correctness. The plan is designed for 2 developers working in parallel over 7.5 days.

---

## Tasks

### Phase 1: Firebase Rules Audit (Day 1)

- [x] 1. Audit current Firebase rules
  - Read and document current `firebase-rules.json`
  - Identify all read/write permissions
  - Document security risks and gaps
  - Create `docs/FIREBASE_SECURITY_AUDIT.md`
  - _Requirements: 1.1_

- [x] 2. Implement hardened Firebase rules
  - Apply principle of least privilege
  - Add user ownership validation for reads
  - Add data structure validation for writes
  - Add session rules for overlay access
  - _Requirements: 1.2, 1.3_

- [x]* 2.1 Write property test for Firebase read access control
  - **Property 9: Firebase Read Access Control**
  - **Validates: Requirements 1.2**
  - Test that unauthorized reads are denied

- [-]* 2.2 Write property test for Firebase write validation
  - **Property 10: Firebase Write Validation**
  - **Validates: Requirements 1.3**
  - Test that invalid writes are rejected

- [x] 3. Test Firebase rules with emulator
  - Set up Firebase emulator
  - Run security rules tests
  - Verify all rules pass
  - Document test results
  - _Requirements: 1.4, 1.5_

### Phase 2: PKCE OAuth Implementation (Day 2-3)

- [x] 4. Create PKCE flow infrastructure
  - Create `src/infrastructure/auth/PkceFlow.ts`
  - Implement code verifier generation (128 chars, cryptographically random)
  - Implement code challenge generation (SHA256)
  - Implement base64url encoding
  - _Requirements: 2.1, 2.2_

- [ ]* 4.1 Write property test for PKCE code verifier randomness
  - **Property 1: PKCE Code Verifier Randomness**
  - **Validates: Requirements 2.1**
  - Test that verifiers are 128 chars and random

- [ ]* 4.2 Write property test for PKCE round-trip integrity
  - **Property 2: PKCE Round-Trip Integrity**
  - **Validates: Requirements 2.2, 2.3, 2.5**
  - Test that challenge matches verifier hash

- [x] 5. Integrate PKCE with Twitch OAuth
  - Update TwitchAdapter to use PKCE flow
  - Add code_challenge to authorization request
  - Add code_verifier to token exchange
  - Test complete flow
  - _Requirements: 2.3, 2.4, 2.6_

- [x] 6. Integrate PKCE with other OAuth providers
  - Update YouTubeAdapter (if exists) ✅ PKCE support added
  - Update GoogleAdapter (if exists) ⚠️ Does not exist in codebase
  - Verify PKCE works with all providers ✅ Verified
  - Note: KickAdapter uses WebSocket/Pusher protocol, not OAuth 2.0 authorization code flow
  - _Requirements: 2.6_

### Phase 3: Secure Token Storage (Day 3-4)

- [x] 7. Create secure token storage service
  - Create `src/infrastructure/auth/TokenStorage.ts`
  - Implement encryption for sensitive data
  - Store access tokens in sessionStorage (encrypted)
  - Never store tokens in plaintext localStorage
  - _Requirements: 3.2, 3.6_

- [ ]* 7.1 Write property test for token storage security
  - **Property 3: Token Storage Security**
  - **Validates: Requirements 3.1, 3.2**
  - Test that tokens are not in plaintext localStorage

- [x] 8. Implement token validation on startup
  - Create token validation logic in App.tsx
  - Check token expiration on app load
  - Trigger refresh if token is expired
  - _Requirements: 3.3_

- [x] 9. Implement automatic token refresh
  - Create token refresh interceptor
  - Automatically refresh before API calls if expired
  - Handle refresh failures gracefully
  - Redirect to login if refresh fails
  - _Requirements: 3.4, 3.5_

- [ ]* 9.1 Write property test for automatic token refresh
  - **Property 4: Automatic Token Refresh**
  - **Validates: Requirements 3.4**
  - Test that expired tokens trigger refresh

### Phase 4: Session Management for Overlays (Day 4-5)

- [x] 10. Create session service
  - Create `src/application/services/SessionService.ts`
  - Implement session creation with UUID
  - Implement session validation
  - Implement session expiration (24 hours default)
  - Implement session revocation
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ]* 10.1 Write property test for session ID URL safety
  - **Property 5: Session ID URL Safety**
  - **Validates: Requirements 4.1, 4.6**
  - Test that URLs contain only session IDs, no tokens

- [ ]* 10.2 Write property test for session expiration enforcement
  - **Property 6: Session Expiration Enforcement**
  - **Validates: Requirements 4.2, 4.4**
  - Test that expired sessions are denied

- [x] 11. Update overlay URL generation
  - Update overlay URL generation to use session IDs
  - Remove any tokens from overlay URLs
  - Add session validation to overlay components
  - Display error for invalid/expired sessions
  - _Requirements: 4.1, 4.4, 4.6_

- [x] 12. Checkpoint - Verify authentication security
  - Verify PKCE flow works end-to-end
  - Verify tokens are not in localStorage plaintext
  - Verify overlay URLs don't contain tokens
  - Verify session expiration works
  - _Requirements: All auth requirements_

### Phase 5: Input Validation with Zod (Day 5-6)

- [x] 13. Create security-related Zod schemas
  - Create `src/domain/schemas/securitySchemas.ts`
  - Create SessionIdSchema
  - Create OverlayUrlSchema
  - Create TokenSchema
  - Create FirebaseUserSchema
  - Create ChatMessageSchema
  - _Requirements: 5.3_

- [x] 14. Implement validation helpers
  - Create validateInput function
  - Create safeValidateInput function
  - Create useValidatedInput hook
  - _Requirements: 5.1_

- [ ]* 14.1 Write property test for input validation completeness
  - **Property 7: Input Validation Completeness**
  - **Validates: Requirements 5.1, 5.5**
  - Test that all inputs are validated before use

- [x] 15. Integrate validation in forms
  - Add Zod validation to all forms
  - Display clear error messages for invalid fields
  - Validate before submitting to API
  - _Requirements: 5.1, 5.2_

### Phase 6: XSS Prevention (Day 6-7)

- [x] 16. Create sanitization service
  - Create `src/infrastructure/security/SanitizationService.ts`
  - Implement sanitizeHtml with DOMPurify
  - Implement sanitizeChatMessage
  - Implement isMalicious detection
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 16.1 Write property test for XSS sanitization effectiveness
  - **Property 8: XSS Sanitization Effectiveness**
  - **Validates: Requirements 6.1, 6.2, 6.3**
  - Test that malicious content is removed

- [x] 17. Integrate sanitization in chat components
  - Sanitize all incoming chat messages
  - Sanitize user-generated content before rendering
  - Log malicious content attempts
  - _Requirements: 6.1, 6.4, 6.6_

- [x] 18. Audit React components for XSS vulnerabilities
  - Search for dangerouslySetInnerHTML usage
  - Ensure all uses are sanitized
  - Remove or fix any unsafe patterns
  - _Requirements: 6.5_

### Phase 7: Security Headers and Final Validation (Day 7-7.5)

- [x] 19. Configure security headers
  - Add Content-Security-Policy header
  - Add X-Content-Type-Options: nosniff
  - Add X-Frame-Options: DENY (except overlays)
  - Configure CORS whitelist
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 20. Create security error types
  - Create `src/domain/errors/SecurityErrors.ts`
  - Create AuthenticationError
  - Create SessionExpiredError
  - Create InvalidTokenError
  - Create ValidationError
  - Create XSSDetectedError
  - _Requirements: All error handling_

- [x] 21. Final security validation
  - Run all security tests
  - Verify Firebase rules in production
  - Verify PKCE flow in production
  - Verify no tokens in URLs
  - Verify XSS protection
  - Update SECURITY_AUDIT.md
  - _Requirements: All_

- [ ]* 21.1 Run full security test suite
  - Run all property tests
  - Run integration tests
  - Run security penetration tests
  - Generate security report

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Firebase rules changes should be tested thoroughly before deployment
- PKCE implementation requires coordination with OAuth providers
- Token storage changes may require users to re-authenticate
- All security changes should be documented

## Estimated Timeline

| Task | Estimated Time | Assigned To |
|------|-----------------|------------|
| 1-3 | 1.5 days | Developer 1 |
| 4-6 | 1.5 days | Developer 2 |
| 7-9 | 1.5 days | Developer 1 |
| 10-12 | 1.5 days | Developer 2 |
| 13-15 | 1 day | Developer 1 |
| 16-18 | 1 day | Developer 2 |
| 19-21 | 0.5 days | Both |
| Optional Tests | 2 days | Both |

**Total:** 7.5 days (with 2 developers in parallel)

---

## Success Criteria

- ✅ Firebase rules audited and hardened
- ✅ PKCE implemented for all OAuth providers
- ✅ Tokens not stored in plaintext localStorage
- ✅ Overlay URLs use session IDs, not tokens
- ✅ All user input validated with Zod
- ✅ All user content sanitized with DOMPurify
- ✅ Security headers configured
- ✅ All security tests passing (>90% coverage)
- ✅ SECURITY_AUDIT.md updated

---

## Rollback Plan

If any security change causes issues:

1. Revert to previous commit
2. Identify root cause
3. Fix issue in new branch
4. Re-run security tests
5. Deploy with feature flag if needed

---

## Security Checklist

Before marking complete, verify:

- [ ] No tokens in localStorage (plaintext)
- [ ] No tokens in overlay URLs
- [ ] PKCE flow working for all providers
- [ ] Firebase rules deny unauthorized access
- [ ] All forms validate input
- [ ] All user content sanitized
- [ ] Security headers present
- [ ] No dangerouslySetInnerHTML without sanitization

---

**Implementation Plan Status:** ✅ Ready for Execution
