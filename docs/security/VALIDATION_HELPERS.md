# Validation Helpers Guide

This guide explains how to use the validation helpers for input validation with Zod schemas in StreamCrowd.

## Overview

The validation helpers provide three main utilities:

1. **`validateInput`** - Validates input and throws on error (for server-side or critical validation)
2. **`safeValidateInput`** - Validates input and returns result object (for client-side validation)
3. **`useValidatedInput`** - React hook for managing validated input state
4. **`useValidatedForm`** - React hook for managing validated form state

## Basic Validation Functions

### validateInput

Use `validateInput` when you want to validate input and throw an error if validation fails. This is useful for server-side validation or when you want to fail fast.

```typescript
import { validateInput, ChatMessageSchema } from '@/domain/schemas/securitySchemas';

try {
  const validatedMessage = validateInput(ChatMessageSchema, userInput);
  // Use validatedMessage - it's guaranteed to be valid
  console.log(validatedMessage);
} catch (error) {
  // Handle validation error
  console.error('Validation failed:', error);
}
```

### safeValidateInput

Use `safeValidateInput` when you want to handle validation errors gracefully without throwing exceptions.

```typescript
import { safeValidateInput, TokenSchema } from '@/domain/schemas/securitySchemas';

const result = safeValidateInput(TokenSchema, tokenData);

if (result.success) {
  // Validation succeeded
  console.log('Valid token:', result.data);
} else {
  // Validation failed
  console.error('Validation errors:', result.errors);
}
```

## React Hooks

### useValidatedInput

Use `useValidatedInput` for single input fields with real-time validation.

```typescript
import { useValidatedInput } from '@/application/hooks/useValidatedInput';
import { z } from 'zod';

function EmailInput() {
  const emailSchema = z.string().email();
  const { value, errors, isValid, validateValue } = useValidatedInput(emailSchema);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = validateValue(e.target.value);
    if (result.isValid) {
      console.log('Valid email:', result.value);
    }
  };

  return (
    <div>
      <input
        type="email"
        onChange={handleChange}
        className={errors.length > 0 ? 'error' : ''}
      />
      {errors.map((error, index) => (
        <p key={index} className="error-message">{error}</p>
      ))}
    </div>
  );
}
```

#### Hook Options

```typescript
const { value, errors, isValid, validateValue, clearErrors, reset } = useValidatedInput(
  schema,
  {
    validateOnChange: false, // Set to true for real-time validation
    formatError: (error) => {
      // Custom error formatter
      return error.issues.map(issue => `Custom: ${issue.message}`);
    }
  }
);
```

### useValidatedForm

Use `useValidatedForm` for complete forms with multiple fields.

```typescript
import { useValidatedForm } from '@/application/hooks/useValidatedInput';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginForm() {
  const {
    values,
    errors,
    isValid,
    validateField,
    validateAll,
    clearFieldErrors,
  } = useValidatedForm(loginSchema);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateField('email', e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateField('password', e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      email: values.email,
      password: values.password,
    };

    if (validateAll(formData)) {
      // Form is valid, submit it
      console.log('Submitting:', values);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          onChange={handleEmailChange}
          onFocus={() => clearFieldErrors('email')}
        />
        {errors.email?.map((error, index) => (
          <p key={index} className="error">{error}</p>
        ))}
      </div>

      <div>
        <input
          type="password"
          onChange={handlePasswordChange}
          onFocus={() => clearFieldErrors('password')}
        />
        {errors.password?.map((error, index) => (
          <p key={index} className="error">{error}</p>
        ))}
      </div>

      <button type="submit" disabled={!isValid}>
        Login
      </button>
    </form>
  );
}
```

## Security Schemas

StreamCrowd provides pre-built security schemas for common use cases:

### Session ID Validation

```typescript
import { SessionIdSchema } from '@/domain/schemas/securitySchemas';
import { useValidatedInput } from '@/application/hooks/useValidatedInput';

function SessionInput() {
  const { validateValue } = useValidatedInput(SessionIdSchema);
  
  const handleSessionId = (sessionId: string) => {
    const result = validateValue(sessionId);
    if (result.isValid) {
      // Valid UUID session ID
      loadSession(result.value);
    }
  };
}
```

### Chat Message Validation

```typescript
import { ChatMessageSchema } from '@/domain/schemas/securitySchemas';
import { safeValidateInput } from '@/domain/schemas/securitySchemas';

function processChatMessage(rawMessage: unknown) {
  const result = safeValidateInput(ChatMessageSchema, rawMessage);
  
  if (result.success) {
    // Message is valid and sanitized
    displayMessage(result.data);
  } else {
    // Log validation errors
    console.error('Invalid message:', result.errors);
  }
}
```

### Token Validation

```typescript
import { TokenSchema } from '@/domain/schemas/securitySchemas';
import { validateInput } from '@/domain/schemas/securitySchemas';

function storeToken(tokenData: unknown) {
  try {
    const validToken = validateInput(TokenSchema, tokenData);
    // Token is valid, store it securely
    tokenStorage.storeAccessToken(validToken.accessToken);
  } catch (error) {
    // Invalid token, reject authentication
    throw new AuthenticationError('Invalid token format');
  }
}
```

### Overlay URL Validation

```typescript
import { OverlayUrlSchema } from '@/domain/schemas/securitySchemas';
import { safeValidateInput } from '@/domain/schemas/securitySchemas';

function validateOverlayUrl(params: unknown) {
  const result = safeValidateInput(OverlayUrlSchema, params);
  
  if (result.success) {
    // URL parameters are valid
    const { sessionId, type } = result.data;
    loadOverlay(sessionId, type);
  } else {
    // Invalid URL parameters
    showError('Invalid overlay URL');
  }
}
```

## Best Practices

### 1. Always Validate User Input

```typescript
// ❌ BAD - No validation
function createPoll(data: any) {
  database.save(data);
}

// ✅ GOOD - Validate before use
function createPoll(data: unknown) {
  const validData = validateInput(PollSchema, data);
  database.save(validData);
}
```

### 2. Use Safe Validation for User-Facing Forms

```typescript
// ❌ BAD - Throws error, poor UX
function handleSubmit(data: unknown) {
  try {
    const valid = validateInput(schema, data);
    submit(valid);
  } catch (error) {
    alert('Error!');
  }
}

// ✅ GOOD - Graceful error handling
function handleSubmit(data: unknown) {
  const result = safeValidateInput(schema, data);
  if (result.success) {
    submit(result.data);
  } else {
    displayErrors(result.errors);
  }
}
```

### 3. Validate at Boundaries

Always validate data at system boundaries:

- **API endpoints** - Validate incoming requests
- **Form submissions** - Validate user input
- **External data** - Validate data from third-party APIs
- **Database queries** - Validate data before queries
- **URL parameters** - Validate route and query parameters

### 4. Use Type-Safe Schemas

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().positive().optional(),
});

// Extract TypeScript type
type User = z.infer<typeof UserSchema>;

// Use in functions
function processUser(data: unknown): User {
  return validateInput(UserSchema, data);
}
```

### 5. Provide Clear Error Messages

```typescript
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
});
```

## Common Patterns

### Conditional Validation

```typescript
const schema = z.object({
  type: z.enum(['email', 'phone']),
  contact: z.string(),
}).refine((data) => {
  if (data.type === 'email') {
    return z.string().email().safeParse(data.contact).success;
  }
  return z.string().regex(/^\d{10}$/).safeParse(data.contact).success;
}, {
  message: 'Invalid contact information',
  path: ['contact'],
});
```

### Async Validation

```typescript
const schema = z.object({
  username: z.string().min(3),
}).refine(async (data) => {
  const exists = await checkUsernameExists(data.username);
  return !exists;
}, {
  message: 'Username already taken',
  path: ['username'],
});
```

### Transform and Validate

```typescript
const schema = z.object({
  email: z.string().email().transform(val => val.toLowerCase()),
  age: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive()),
});
```

## Security Considerations

1. **Always validate before database operations** - Prevent SQL injection and invalid data
2. **Validate before rendering** - Prevent XSS attacks
3. **Validate API responses** - Don't trust external data
4. **Use strict schemas** - Be explicit about what's allowed
5. **Log validation failures** - Monitor for potential attacks

## Related Documentation

- [Security Schemas](../src/domain/schemas/securitySchemas.ts) - Pre-built security schemas
- [Zod Documentation](https://zod.dev/) - Official Zod documentation
- [Security Hardening Design](../.kiro/specs/security-hardening/design.md) - Overall security design

## Requirements

**Validates: Requirements 5.1** - Input validation with Zod schemas
