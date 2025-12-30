/**
 * Encryption Utilities for Backup Service
 * 
 * Provides AES-GCM encryption/decryption for sensitive data like API keys
 * using the Web Crypto API.
 * 
 * @requirements 3.9 - Encrypt sensitive data (API keys) before uploading
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Algorithm configuration for AES-GCM
 */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 128; // Authentication tag length in bits

/**
 * Prefix to identify encrypted strings
 */
const ENCRYPTED_PREFIX = 'enc:v1:';

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Derives an encryption key from a password using PBKDF2
 * @param password - The password to derive key from
 * @param salt - Salt for key derivation
 * @returns CryptoKey for encryption/decryption
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a device-specific encryption key
 * Uses a combination of factors to create a consistent key per device
 * @returns A password string for key derivation
 */
function getDevicePassword(): string {
  // Use a combination of available browser/device info
  // This creates a device-specific but consistent password
  const factors = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
    'twitchvote-backup-key-v1', // Application-specific salt
  ];
  
  return factors.join('|');
}

// ============================================
// ENCRYPTION FUNCTIONS
// ============================================

/**
 * Encrypts sensitive data using AES-GCM
 * @param data - The data to encrypt (will be JSON stringified if object)
 * @returns Encrypted string with prefix, salt, IV, and ciphertext
 * @requirements 3.9 - Encrypt sensitive data before uploading
 */
export async function encryptSensitiveData(data: unknown): Promise<string> {
  try {
    // Convert data to string
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(plaintext);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Derive key from device password
    const password = getDevicePassword();
    const key = await deriveKey(password, salt);
    
    // Encrypt the data
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      plaintextBuffer
    );
    
    // Combine salt + IV + ciphertext and encode as base64
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    // Convert to base64 and add prefix
    const base64 = btoa(String.fromCharCode(...combined));
    return ENCRYPTED_PREFIX + base64;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts data that was encrypted with encryptSensitiveData
 * @param encryptedString - The encrypted string (with prefix)
 * @returns Decrypted data (parsed as JSON if valid, otherwise string)
 * @requirements 3.9 - Decrypt sensitive data after downloading
 */
export async function decryptSensitiveData<T = unknown>(encryptedString: string): Promise<T> {
  try {
    // Verify and remove prefix
    if (!encryptedString.startsWith(ENCRYPTED_PREFIX)) {
      throw new Error('Invalid encrypted data format');
    }
    
    const base64 = encryptedString.slice(ENCRYPTED_PREFIX.length);
    
    // Decode base64
    const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    
    // Extract salt, IV, and ciphertext
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const ciphertext = combined.slice(16 + IV_LENGTH);
    
    // Derive key from device password
    const password = getDevicePassword();
    const key = await deriveKey(password, salt);
    
    // Decrypt the data
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv,
        tagLength: TAG_LENGTH,
      },
      key,
      ciphertext
    );
    
    // Decode plaintext
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBuffer);
    
    // Try to parse as JSON, return string if not valid JSON
    try {
      return JSON.parse(plaintext) as T;
    } catch {
      return plaintext as T;
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Checks if a string is encrypted (has the encryption prefix)
 * @param value - The string to check
 * @returns true if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypts specific fields in an object
 * @param obj - The object containing fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns New object with specified fields encrypted
 */
export async function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    const value = result[field];
    if (value !== undefined && value !== null && value !== '') {
      result[field] = await encryptSensitiveData(value) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Decrypts specific fields in an object
 * @param obj - The object containing encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns New object with specified fields decrypted
 */
export async function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && isEncrypted(value)) {
      result[field] = await decryptSensitiveData(value) as T[keyof T];
    }
  }
  
  return result;
}

/**
 * Generates a checksum for data integrity verification
 * Uses SHA-256 hash
 * @param data - The data to generate checksum for
 * @returns Hex string checksum
 */
export async function generateChecksum(data: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies a checksum matches the data
 * @param data - The data to verify
 * @param checksum - The expected checksum
 * @returns true if checksum matches
 */
export async function verifyChecksum(data: unknown, checksum: string): Promise<boolean> {
  const computed = await generateChecksum(data);
  return computed === checksum;
}
