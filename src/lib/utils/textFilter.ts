import Filter from 'bad-words';

const filter = new Filter();

export interface ValidationResult {
    isValid: boolean;
    sanitized: string;
    error?: string;
}

/**
 * Sanitize text to prevent XSS and remove dangerous characters
 */
export function sanitizeText(text: string): string {
    // Remove HTML tags and script content
    let sanitized = text.replace(/<[^>]*>/g, '');
    
    // Remove script-like patterns
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Remove null bytes and other dangerous characters
    sanitized = sanitized.replace(/\0/g, '');
    
    // Keep only printable ASCII and common punctuation (allow spaces, letters, numbers, basic punctuation)
    // This allows: a-z, A-Z, 0-9, space, and common punctuation like . , ! ? ' " - ( )
    sanitized = sanitized.replace(/[^\x20-\x7E]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Normalize multiple spaces to single space
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    return sanitized;
}

/**
 * Validate and filter text input
 * Returns validation result with sanitized text or error message
 */
export function validateText(text: string, maxLength: number = 500): ValidationResult {
    // First sanitize
    const sanitized = sanitizeText(text);
    
    // Check if empty after sanitization
    if (!sanitized || sanitized.trim().length === 0) {
        return {
            isValid: false,
            sanitized: '',
            error: 'Text is empty or contains only invalid characters',
        };
    }
    
    // Check length
    if (sanitized.length > maxLength) {
        return {
            isValid: false,
            sanitized: sanitized.substring(0, maxLength),
            error: `Text is too long. Maximum ${maxLength} characters allowed.`,
        };
    }
    
    // Check for profanity
    if (filter.isProfane(sanitized)) {
        return {
            isValid: false,
            sanitized: filter.clean(sanitized),
            error: 'Text contains inappropriate language. Please keep it clean!',
        };
    }
    
    return {
        isValid: true,
        sanitized,
    };
}

/**
 * Client-side only: Show user-friendly error
 */
export function getValidationError(result: ValidationResult): string | null {
    if (result.isValid) return null;
    return result.error || 'Invalid input';
}

