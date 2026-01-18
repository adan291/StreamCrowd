# Form Validation Integration Guide

This guide documents the integration of Zod validation schemas into all application forms, ensuring that user input is validated before submission to APIs or database operations.

## Overview

All forms in StreamCrowd now use Zod schemas for validation, providing:

- **Type-safe validation** - Schemas define both runtime validation and TypeScript types
- **Clear error messages** - User-friendly error messages in Spanish
- **Consistent validation** - Same validation logic across all forms
- **Security** - Prevents invalid data from reaching APIs or database

## Requirements

**Validates: Requirements 5.1, 5.2** - Input validation with Zod schemas

## Integrated Forms

### 1. Reward Form (`components/RewardForm.tsx`)

**Schema:** `RewardFormSchema`

**Validated Fields:**
- `title` - Required, 1-45 characters
- `cost` - Required, 1-999,999,999 points
- `prompt` - Optional, max 200 characters
- `backgroundColor` - Required, valid hex color (#RRGGBB)
- `isUserInputRequired` - Boolean
- `isEnabled` - Boolean
- `globalCooldownEnabled` - Boolean
- `globalCooldownSeconds` - Required if cooldown enabled, 1-2,592,000 seconds
- `maxPerStreamEnabled` - Boolean
- `maxPerStream` - Required if enabled, min 1
- `maxPerUserPerStreamEnabled` - Boolean
- `maxPerUserPerStream` - Required if enabled, min 1

**Example Usage:**
```typescript
import { RewardFormSchema } from '../src/domain/schemas/formSchemas';
import { safeValidateInput } from '../src/domain/schemas/securitySchemas';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const formData = {
    title: title.trim(),
    cost,
    // ... other fields
  };
  
  const result = safeValidateInput(RewardFormSchema, formData);
  
  if (!result.success) {
    const errors = result.errors.issues.map((issue) => {
      const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${field}${issue.message}`;
    });
    setValidationErrors(errors);
    return;
  }
  
  await onSubmit(result.data);
};
```

### 2. Prediction Form (`components/PredictionForm.tsx`)

**Schema:** `PredictionFormSchema`

**Validated Fields:**
- `title` - Required, 1-45 characters
- `outcomes` - Array of 2-10 unique strings, each 1-25 characters
- `duration` - Required, 30-1800 seconds

**Validation Rules:**
- Outcomes must be unique (case-insensitive)
- All outcomes must have text
- Duration must be within Twitch API limits

### 3. Poll Form (`components/TwitchPollPanel.tsx`)

**Schema:** `PollFormSchema`

**Validated Fields:**
- `title` - Required, 1-60 characters
- `choices` - Array of 2-5 unique strings, each 1-25 characters
- `duration` - Required, 15-1800 seconds

**Validation Rules:**
- Choices must be unique (case-insensitive)
- All choices must have text

### 4. Connection Form (`components/ConnectionPanel.tsx`)

**Schema:** `ConnectionFormSchema`

**Validated Fields:**
- `channel` - Required, 3-25 characters, alphanumeric + underscore only
- `token` - Optional, valid OAuth token format
- `userId` - Optional

**Validation Rules:**
- Channel name is converted to lowercase
- Token must match OAuth format: `(oauth:)?[a-zA-Z0-9_]{30,}`
- Empty token is allowed (anonymous connection)

### 5. Timer Form (`components/timers/TimerForm.tsx`)

**Schema:** `TimerFormSchema`

**Validated Fields:**
- `name` - Required, 1-50 characters
- `message` - Required, 1-500 characters
- `interval` - Required, 60-86400 seconds
- `enabled` - Boolean

### 6. Command Form

**Schema:** `CommandFormSchema`

**Validated Fields:**
- `name` - Required, 1-50 characters, alphanumeric + underscore only
- `response` - Required, 1-500 characters
- `cooldown` - Optional, 0-3600 seconds
- `enabled` - Boolean
- `modOnly` - Optional boolean
- `aliases` - Optional array of strings

### 7. Webhook Config Form

**Schema:** `WebhookConfigFormSchema`

**Validated Fields:**
- `name` - Required, 1-50 characters
- `url` - Required, valid HTTPS URL
- `events` - Required, array with at least 1 event
- `enabled` - Boolean
- `secret` - Optional, min 16 characters

**Security Rules:**
- URL must use HTTPS protocol
- At least one event must be selected

### 8. Macro Form

**Schema:** `MacroFormSchema`

**Validated Fields:**
- `name` - Required, 1-50 characters
- `description` - Optional, max 200 characters
- `actions` - Required, array with at least 1 action
- `enabled` - Boolean
- `hotkey` - Optional string

### 9. OBS Source Form

**Schema:** `OBSSourceFormSchema`

**Validated Fields:**
- `sourceType` - Required, one of: browser, image, video, audio
- `url` - Required, valid URL
- `name` - Optional, max 100 characters

## Common Validation Patterns

### 1. Basic Form Validation

```typescript
import { safeValidateInput } from '../src/domain/schemas/securitySchemas';
import { YourFormSchema } from '../src/domain/schemas/formSchemas';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const formData = {
    // Collect form data
  };
  
  const result = safeValidateInput(YourFormSchema, formData);
  
  if (!result.success) {
    // Handle validation errors
    const errors = result.errors.issues.map((issue) => issue.message);
    setValidationErrors(errors);
    return;
  }
  
  // Submit validated data
  await onSubmit(result.data);
};
```

### 2. Field-Level Error Display

```typescript
const result = safeValidateInput(schema, formData);

if (!result.success) {
  const errorsByField: Record<string, string[]> = {};
  
  result.errors.issues.forEach((issue) => {
    const field = issue.path[0]?.toString();
    if (field) {
      if (!errorsByField[field]) {
        errorsByField[field] = [];
      }
      errorsByField[field].push(issue.message);
    }
  });
  
  setErrors(errorsByField);
}
```

### 3. Displaying Validation Errors

```tsx
{validationErrors.length > 0 && (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
    <div className="flex items-start gap-2 text-red-500 dark:text-red-400">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div className="text-sm space-y-1">
        {validationErrors.map((error, i) => (
          <p key={i}>{error}</p>
        ))}
      </div>
    </div>
  </div>
)}
```

## Validation Benefits

### 1. Security

- **Prevents XSS attacks** - Validates and sanitizes user input
- **Prevents SQL injection** - Validates data before database queries
- **Prevents API errors** - Ensures data meets API requirements

### 2. User Experience

- **Clear error messages** - Users know exactly what's wrong
- **Real-time feedback** - Validation happens before submission
- **Consistent behavior** - All forms work the same way

### 3. Developer Experience

- **Type safety** - TypeScript types derived from schemas
- **Reusable schemas** - Same schema for client and server
- **Easy to maintain** - Validation logic in one place

## Testing

All form schemas have comprehensive tests in `tests/integration/formValidation.test.ts`:

```bash
npm test -- tests/integration/formValidation.test.ts
```

**Test Coverage:**
- ✅ Valid data acceptance
- ✅ Invalid data rejection
- ✅ Field-specific validation rules
- ✅ Cross-field validation (e.g., cooldown enabled requires cooldown value)
- ✅ Error message clarity
- ✅ Data transformation (e.g., trimming, lowercase)

## Adding Validation to New Forms

### Step 1: Create Schema

Add your schema to `src/domain/schemas/formSchemas.ts`:

```typescript
export const YourFormSchema = z.object({
  field1: z.string().min(1, 'Field 1 is required'),
  field2: z.number().positive('Field 2 must be positive'),
  // ... more fields
});

export type YourFormData = z.infer<typeof YourFormSchema>;
```

### Step 2: Import in Component

```typescript
import { YourFormSchema } from '../src/domain/schemas/formSchemas';
import { safeValidateInput } from '../src/domain/schemas/securitySchemas';
```

### Step 3: Validate on Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const formData = {
    // Collect form data
  };
  
  const result = safeValidateInput(YourFormSchema, formData);
  
  if (!result.success) {
    // Handle errors
    return;
  }
  
  // Submit validated data
  await onSubmit(result.data);
};
```

### Step 4: Add Tests

Add tests to `tests/integration/formValidation.test.ts`:

```typescript
describe('YourFormSchema', () => {
  it('should validate valid form data', () => {
    const validData = { /* ... */ };
    const result = YourFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid data', () => {
    const invalidData = { /* ... */ };
    const result = YourFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

## Best Practices

### 1. Always Validate Before Submission

```typescript
// ❌ BAD - No validation
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await onSubmit(formData);
};

// ✅ GOOD - Validate first
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const result = safeValidateInput(schema, formData);
  if (!result.success) return;
  await onSubmit(result.data);
};
```

### 2. Display Clear Error Messages

```typescript
// ❌ BAD - Generic error
setError('Validation failed');

// ✅ GOOD - Specific errors
const errors = result.errors.issues.map((issue) => {
  const field = issue.path.join('.');
  return `${field}: ${issue.message}`;
});
setErrors(errors);
```

### 3. Use Type-Safe Form Data

```typescript
// ❌ BAD - Untyped data
const formData: any = { /* ... */ };

// ✅ GOOD - Type-safe data
import type { YourFormData } from '../src/domain/schemas/formSchemas';
const formData: YourFormData = { /* ... */ };
```

### 4. Trim User Input

All string fields in schemas use `.trim()` to remove leading/trailing whitespace:

```typescript
const schema = z.object({
  name: z.string().min(1).trim(),
});
```

### 5. Provide Helpful Error Messages

```typescript
// ❌ BAD - Generic message
z.string().min(1)

// ✅ GOOD - Specific message
z.string().min(1, 'El nombre es requerido')
```

## Troubleshooting

### Issue: Validation errors not displaying

**Solution:** Check that you're using `safeValidateInput` and handling the result:

```typescript
const result = safeValidateInput(schema, formData);
if (!result.success) {
  setErrors(result.errors.issues.map(i => i.message));
}
```

### Issue: Form submits with invalid data

**Solution:** Ensure you return early if validation fails:

```typescript
if (!result.success) {
  setErrors(/* ... */);
  return; // Don't forget this!
}
```

### Issue: TypeScript errors with form data

**Solution:** Use the inferred type from the schema:

```typescript
import type { YourFormData } from '../src/domain/schemas/formSchemas';
const formData: YourFormData = { /* ... */ };
```

## Related Documentation

- [Validation Helpers Guide](./VALIDATION_HELPERS.md) - Using validation hooks
- [Security Schemas](../src/domain/schemas/securitySchemas.ts) - Security-related schemas
- [Form Schemas](../src/domain/schemas/formSchemas.ts) - All form schemas
- [Zod Documentation](https://zod.dev/) - Official Zod documentation

## Summary

✅ **All forms now validate input with Zod schemas**  
✅ **Clear error messages displayed to users**  
✅ **Validation happens before API submission**  
✅ **Type-safe form data throughout the application**  
✅ **Comprehensive test coverage for all schemas**

**Requirements Validated:** 5.1, 5.2 - Input validation with Zod schemas

