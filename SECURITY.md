# Security Features

This document outlines the security measures implemented in the app.

## Input Validation & Sanitization

### Defense in Depth

All user input is validated and sanitized on **both client and server** sides:

- **Client-side**: Immediate feedback to users, prevents unnecessary API calls
- **Server-side**: Protection against malicious actors bypassing client validation

### Text Filtering (`src/lib/utils/textFilter.ts`)

#### 1. Profanity Filtering

- Uses `bad-words` npm package
- Checks text before processing
- Returns user-friendly error: "Text contains inappropriate language. Please keep it clean!"

#### 2. XSS Prevention

- Removes all HTML tags: `<script>`, `<img>`, etc.
- Strips `javascript:` protocol
- Removes event handlers: `onclick=`, `onload=`, etc.
- Removes null bytes and control characters

#### 3. Character Sanitization

- Keeps only printable ASCII characters (0x20-0x7E)
- Allowed: a-z, A-Z, 0-9, space, and basic punctuation
- Blocks: Unicode, emojis, special characters that could cause issues
- Normalizes multiple spaces to single space

#### 4. Length Validation

- Minimum 16 characters (prevents spam/abuse)
- Maximum 256 characters (prevents database overflow)
- Prevents excessive processing time
- Live character counter with visual feedback

## Implementation

### Client Side (`src/routes/+page.svelte`)

```typescript
import { validateText, getValidationError } from '$lib/utils/textFilter';

const validation = validateText(inputText.trim(), 500);

if (!validation.isValid) {
    errorMessage = getValidationError(validation);
    return; // Stop here, don't send to server
}

// Use sanitized text
const sanitizedText = validation.sanitized.toLowerCase();
```

### Server Side (`src/routes/api/analyze/+server.ts`)

```typescript
import { validateText } from '$lib/utils/textFilter';

// Validate even if client already did (defense in depth)
const validation = validateText(text, 16, 256); // Min 16, Max 256 chars

if (!validation.isValid) {
    console.warn(`Validation failed: ${validation.error}`);
    return json({ error: validation.error }, { status: 400 });
}

// Use sanitized text for all operations
const sanitizedText = validation.sanitized.toLowerCase();
```

## Attack Vectors Prevented

### 1. XSS (Cross-Site Scripting)

❌ Blocked: `<script>alert('xss')</script>`  
❌ Blocked: `<img src=x onerror=alert('xss')>`  
❌ Blocked: `javascript:alert('xss')`  
✅ Result: Text is stripped of all dangerous content

### 2. SQL Injection

✅ Protected: Using Kysely query builder (parameterized queries)  
✅ Protected: Input sanitization removes dangerous characters  
✅ Protected: Database uses prepared statements

### 3. Profanity/Inappropriate Content

❌ Blocked: Profane words are filtered using `bad-words` package  
✅ Result: Clean dataset, family-friendly app

### 4. Unicode/Control Character Attacks

❌ Blocked: Unicode right-to-left override characters  
❌ Blocked: Null bytes, control characters  
❌ Blocked: Non-printable characters  
✅ Result: Only safe ASCII text stored and displayed

### 5. Length-Based DoS

❌ Blocked: Text over 500 characters rejected  
✅ Result: Prevents excessive processing time on RunPod  
✅ Result: Prevents database bloat

## Testing Security

### Test Cases

1. **XSS Attempt**

    ```
    Input: <script>alert('hack')</script>
    Result: Error - "Text is empty or contains only invalid characters"
    ```

2. **Profanity**

    ```
    Input: "damn this is cool"
    Result: Error - "Text contains inappropriate language"
    ```

3. **Unicode Attack**

    ```
    Input: "hello &#x202e;world"
    Result: Sanitized to "hello world"
    ```

4. **Too Long**

    ```
    Input: 501+ characters
    Result: Error - "Text is too long. Maximum 500 characters allowed."
    ```

5. **SQL Injection Attempt**
    ```
    Input: "'; DROP TABLE users; --"
    Result: Sanitized to "' DROP TABLE users --" (safe string)
    ```

## Environment Security

### API Keys

- ✅ Stored in `.env` file (gitignored)
- ✅ Never committed to repository
- ✅ Used via SvelteKit's `$env/static/private`
- ✅ Only accessible server-side
- ✅ GitHub secret scanning enabled

### Database

- ✅ Connection string in environment variables
- ✅ Parameterized queries via Kysely
- ✅ No raw SQL concatenation
- ✅ Text hash used for duplicate detection (MD5)

## Best Practices Followed

1. ✅ **Defense in Depth**: Validation on client AND server
2. ✅ **Least Privilege**: API keys only where needed
3. ✅ **Input Validation**: All user input validated and sanitized
4. ✅ **Output Encoding**: Text properly escaped in UI
5. ✅ **Secure Defaults**: Restrictive character allowlist
6. ✅ **Logging**: Failed validations logged on server
7. ✅ **Rate Limiting**: (TODO: Consider adding if abuse occurs)

## Future Enhancements

Consider adding:

- [ ] Rate limiting per IP address
- [ ] CAPTCHA for submission
- [ ] Content Security Policy headers
- [ ] Additional profanity filter customization
- [ ] IP-based blocking for repeat offenders
- [ ] Admin dashboard to review flagged content

## Responsible Disclosure

If you find a security vulnerability, please email: [your-email]

Do NOT:

- Post the vulnerability publicly
- Exploit the vulnerability
- Access other users' data
