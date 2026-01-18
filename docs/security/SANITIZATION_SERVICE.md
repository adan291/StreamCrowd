# Sanitization Service

## Overview

The `SanitizationService` provides XSS (Cross-Site Scripting) prevention through content sanitization using DOMPurify. This service is part of the security hardening implementation (Phase 6: XSS Prevention).

**Requirements:** 6.1, 6.2, 6.3, 6.4

## Features

- **HTML Sanitization**: Removes dangerous HTML while preserving safe formatting
- **Chat Message Sanitization**: Strips all HTML from chat messages
- **Malicious Content Detection**: Identifies common XSS attack patterns
- **Singleton Pattern**: Application-wide instance for consistent sanitization

## Usage

### Import

```typescript
import { sanitizationService } from '@/infrastructure/security';
// or
import { SanitizationService } from '@/infrastructure/security';
```

### Sanitize HTML Content

Use `sanitizeHtml()` for user-generated HTML content that should preserve safe formatting:

```typescript
const userContent = '<p>Hello <strong>world</strong>!</p><script>alert("xss")</script>';
const safe = sanitizationService.sanitizeHtml(userContent);
// Result: '<p>Hello <strong>world</strong>!</p>'
```

**Allowed Tags:** `b`, `i`, `em`, `strong`, `a`, `br`, `p`, `span`  
**Allowed Attributes:** `href`, `target`, `rel`, `class`

### Sanitize Chat Messages

Use `sanitizeChatMessage()` for chat messages where all HTML should be removed:

```typescript
const chatMessage = 'Hello <script>alert("xss")</script> world!';
const safe = sanitizationService.sanitizeChatMessage(chatMessage);
// Result: 'Hello  world!'
```

This method:
- Removes ALL HTML tags
- Escapes special characters
- Returns plain text only

### Detect Malicious Content

Use `isMalicious()` to check if content contains XSS attack patterns:

```typescript
const content = '<script>alert("xss")</script>';
if (sanitizationService.isMalicious(content)) {
  console.warn('Malicious content detected!');
  // Log the attempt, sanitize, or reject
}
```

**Detected Patterns:**
- `<script>` tags
- `javascript:` URLs
- Event handlers (`onclick`, `onerror`, etc.)
- `data:` URLs
- `vbscript:` URLs

## Integration Examples

### React Component

```typescript
import { sanitizationService } from '@/infrastructure/security';

function UserContent({ html }: { html: string }) {
  const sanitized = sanitizationService.sanitizeHtml(html);
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitized }} />
  );
}
```

### Chat Message Display

```typescript
import { sanitizationService } from '@/infrastructure/security';

function ChatMessage({ message }: { message: string }) {
  const safe = sanitizationService.sanitizeChatMessage(message);
  
  return <div className="chat-message">{safe}</div>;
}
```

### API Response Handling

```typescript
import { sanitizationService } from '@/infrastructure/security';

async function fetchUserProfile(userId: string) {
  const response = await api.get(`/users/${userId}`);
  
  // Sanitize user-generated fields
  return {
    ...response.data,
    bio: sanitizationService.sanitizeHtml(response.data.bio),
    displayName: sanitizationService.sanitizeChatMessage(response.data.displayName),
  };
}
```

### Logging Malicious Attempts

```typescript
import { sanitizationService } from '@/infrastructure/security';
import { logService } from '@/infrastructure/logging';

function processUserInput(input: string) {
  if (sanitizationService.isMalicious(input)) {
    logService.warn('XSS attempt detected', {
      input: input.substring(0, 100), // Log first 100 chars
      timestamp: new Date().toISOString(),
    });
  }
  
  return sanitizationService.sanitizeHtml(input);
}
```

## Security Best Practices

### ✅ DO

- **Always sanitize** user-generated content before rendering
- **Use `sanitizeChatMessage()`** for chat messages and usernames
- **Use `sanitizeHtml()`** for rich content that needs formatting
- **Log malicious attempts** for security monitoring
- **Sanitize on the client** before rendering (defense in depth)

### ❌ DON'T

- **Don't trust** any external data source (APIs, Firebase, WebSockets)
- **Don't use** `dangerouslySetInnerHTML` without sanitization
- **Don't assume** backend sanitization is sufficient
- **Don't allow** arbitrary HTML attributes (data attributes are blocked)
- **Don't skip** sanitization for "trusted" users

## Testing

The service includes comprehensive unit tests covering:

- Safe HTML preservation
- Malicious content removal
- XSS attack vectors
- Edge cases (unicode, long strings, malformed HTML)
- Security properties

Run tests:
```bash
npm test -- tests/infrastructure/SanitizationService.test.ts
```

## Configuration

The service uses a predefined DOMPurify configuration optimized for security:

```typescript
{
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target', 'rel'],
}
```

To customize, create a new instance:

```typescript
const customSanitizer = new SanitizationService();
// Modify config as needed
```

## Performance

- **DOMPurify** is highly optimized and fast
- **Singleton pattern** reduces memory overhead
- **No async operations** - synchronous sanitization
- **Minimal overhead** for plain text (chat messages)

## Browser Compatibility

DOMPurify works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Related Documentation

- [Security Hardening Requirements](../.kiro/specs/security-hardening/requirements.md)
- [Security Hardening Design](../.kiro/specs/security-hardening/design.md)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

## Support

For issues or questions:
1. Check test cases for usage examples
2. Review DOMPurify documentation
3. Consult security team for custom requirements
