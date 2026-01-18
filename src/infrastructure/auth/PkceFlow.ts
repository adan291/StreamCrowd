/**
 * PKCE (Proof Key for Code Exchange) Flow Implementation
 * 
 * Implements the PKCE extension to OAuth 2.0 for secure authorization code flow.
 * PKCE prevents authorization code interception attacks by using a cryptographically
 * random code verifier and its SHA256 hash (code challenge).
 * 
 * Security Properties:
 * - Code verifier is 128 characters, cryptographically random
 * - Code challenge is SHA256 hash of verifier, base64url encoded
 * - Each flow generates a unique verifier/challenge pair
 * 
 * @module infrastructure/auth/PkceFlow
 * 
 * **Validates: Requirements 2.1, 2.2**
 */

// ============================================
// Types
// ============================================

export interface PkceChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

// ============================================
// Constants
// ============================================

/**
 * Length of the code verifier in bytes before base64url encoding.
 * 96 bytes produces 128 characters after base64url encoding.
 */
const CODE_VERIFIER_BYTES = 96;

// ============================================
// PKCE Flow Class
// ============================================

/**
 * PKCE Flow handler for OAuth 2.0 authorization code flow with PKCE extension.
 * 
 * Usage:
 * ```typescript
 * const pkce = new PkceFlow();
 * const challenge = await pkce.generateChallenge();
 * 
 * // Use challenge.codeChallenge in authorization request
 * // Use challenge.codeVerifier in token exchange
 * ```
 */
export class PkceFlow {
  private codeVerifier: string | null = null;

  /**
   * Generate a cryptographically random code verifier.
   * 
   * The verifier is 128 characters long, using only URL-safe characters
   * (A-Z, a-z, 0-9, -, _) as per RFC 7636.
   * 
   * @returns The generated code verifier (128 characters)
   * @throws Error if crypto API is not available
   * 
   * **Validates: Requirements 2.1**
   */
  generateCodeVerifier(): string {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('Web Crypto API is not available');
    }

    const randomBytes = new Uint8Array(CODE_VERIFIER_BYTES);
    crypto.getRandomValues(randomBytes);
    
    this.codeVerifier = this.base64UrlEncode(randomBytes);
    return this.codeVerifier;
  }

  /**
   * Generate the code challenge from the code verifier.
   * 
   * The challenge is the SHA256 hash of the verifier, base64url encoded.
   * This method must be called after generateCodeVerifier().
   * 
   * @returns Promise resolving to the code challenge
   * @throws Error if code verifier has not been generated
   * 
   * **Validates: Requirements 2.2**
   */
  async generateCodeChallenge(): Promise<string> {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not generated. Call generateCodeVerifier() first.');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(this.codeVerifier);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    return this.base64UrlEncode(hashArray);
  }

  /**
   * Generate both code verifier and code challenge in one call.
   * 
   * This is the recommended method for starting a new PKCE flow.
   * 
   * @returns Promise resolving to the complete PKCE challenge
   * 
   * **Validates: Requirements 2.1, 2.2**
   */
  async generateChallenge(): Promise<PkceChallenge> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge();
    
    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Get the current code verifier.
   * 
   * Use this when exchanging the authorization code for tokens.
   * 
   * @returns The code verifier
   * @throws Error if code verifier has not been generated
   */
  getCodeVerifier(): string {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not generated. Call generateCodeVerifier() first.');
    }
    return this.codeVerifier;
  }

  /**
   * Check if a code verifier has been generated.
   * 
   * @returns true if a code verifier exists
   */
  hasCodeVerifier(): boolean {
    return this.codeVerifier !== null;
  }

  /**
   * Clear the stored code verifier.
   * 
   * Call this after completing the token exchange or when canceling the flow.
   */
  clear(): void {
    this.codeVerifier = null;
  }

  /**
   * Encode a Uint8Array to base64url format.
   * 
   * Base64url encoding uses URL-safe characters (- instead of +, _ instead of /)
   * and removes padding (=) as per RFC 4648 Section 5.
   * 
   * @param input - The bytes to encode
   * @returns The base64url encoded string
   */
  private base64UrlEncode(input: Uint8Array): string {
    // Convert Uint8Array to binary string
    let binaryString = '';
    for (let i = 0; i < input.length; i++) {
      binaryString += String.fromCharCode(input[i]);
    }
    
    // Encode to base64
    const base64 = btoa(binaryString);
    
    // Convert to base64url (URL-safe variant)
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Verify that a code challenge matches a code verifier.
 * 
 * This is useful for testing and debugging PKCE flows.
 * 
 * @param codeVerifier - The original code verifier
 * @param codeChallenge - The code challenge to verify
 * @returns Promise resolving to true if the challenge matches
 */
export async function verifyPkceChallenge(
  codeVerifier: string,
  codeChallenge: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Base64url encode the hash
  let binaryString = '';
  for (let i = 0; i < hashArray.length; i++) {
    binaryString += String.fromCharCode(hashArray[i]);
  }
  
  const expectedChallenge = btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return expectedChallenge === codeChallenge;
}

/**
 * Check if a string is a valid PKCE code verifier.
 * 
 * Valid verifiers are 43-128 characters long and contain only
 * unreserved URI characters (A-Z, a-z, 0-9, -, ., _, ~).
 * 
 * @param verifier - The string to validate
 * @returns true if the string is a valid code verifier
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  
  // RFC 7636 allows: A-Z, a-z, 0-9, -, ., _, ~
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(verifier);
}

/**
 * Check if a string is a valid PKCE code challenge.
 * 
 * Valid challenges are base64url encoded SHA256 hashes (43 characters).
 * 
 * @param challenge - The string to validate
 * @returns true if the string is a valid code challenge
 */
export function isValidCodeChallenge(challenge: string): boolean {
  // SHA256 produces 32 bytes, which is 43 characters in base64url (without padding)
  if (challenge.length !== 43) {
    return false;
  }
  
  // Base64url characters only
  const validPattern = /^[A-Za-z0-9\-_]+$/;
  return validPattern.test(challenge);
}

// ============================================
// Default Export
// ============================================

export default PkceFlow;
