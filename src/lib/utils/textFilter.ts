// Use dynamic import for bad-words to avoid SSR issues
let filter: any = null;

// Simple fallback profanity list
const profanityList = ['fuck', 'shit', 'damn', 'ass', 'bitch', 'cunt', 'dick', 'piss'];

async function getFilter() {
    if (!filter) {
        try {
            const Filter = (await import('bad-words')).default;
            filter = new Filter();
        } catch (e) {
            console.warn('bad-words package not available, using fallback');
            // Fallback: manual check
            filter = {
                isProfane: (text: string) => {
                    const lower = text.toLowerCase();
                    return profanityList.some(word => lower.includes(word));
                },
                clean: (text: string) => {
                    let cleaned = text;
                    profanityList.forEach(word => {
                        const regex = new RegExp(word, 'gi');
                        cleaned = cleaned.replace(regex, '*'.repeat(word.length));
                    });
                    return cleaned;
                }
            };
        }
    }
    return filter;
}

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
export async function validateText(
    text: string,
    minLength: number = 16,
    maxLength: number = 256
): Promise<ValidationResult> {
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
    
    // Check minimum length
    if (sanitized.length < minLength) {
        return {
            isValid: false,
            sanitized,
            error: `Text is too short. Minimum ${minLength} characters required (currently ${sanitized.length}).`,
        };
    }
    
    // Check maximum length
    if (sanitized.length > maxLength) {
        return {
            isValid: false,
            sanitized: sanitized.substring(0, maxLength),
            error: `Text is too long. Maximum ${maxLength} characters allowed.`,
        };
    }
    
    // Check for profanity
    const filterInstance = await getFilter();
    if (filterInstance.isProfane(sanitized)) {
        return {
            isValid: false,
            sanitized: filterInstance.clean(sanitized),
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

