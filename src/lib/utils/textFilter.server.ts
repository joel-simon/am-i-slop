// SERVER-ONLY validation with English word dictionary
// This file should NEVER be imported on the client side
// The .server.ts extension ensures SvelteKit only bundles this for the server

import { sanitizeText, type ValidationResult } from './textFilter';
import { Filter } from 'bad-words';
import words from 'an-array-of-english-words';

// Common acronyms and internet slang to allow
const commonAcronyms = [
    // Common internet abbreviations
    'omg',
    'lol',
    'wtf',
    'tbh',
    'imo',
    'imho',
    'fyi',
    'btw',
    'brb',
    'afk',
    'aka',
    'asap',
    'etc',
    'idk',
    'irl',
    'ttyl',
    'fomo',
    'yolo',
    'dm',
    'dms',
    'rn',
    'nvm',
    'smh',
    'rofl',
    'lmao',
    'lmfao',
    'tfw',
    'mfw',
    'nsfw',
    'tldr',
    'tl',
    'dr',
    'iirc',
    'til',
    'eli5',
    'ama',
    'dae',
    'ftfy',
    'oc',
    'op',
    'tbd',
    'tba',
    'eta',
    'rip',
    'faq',
    'pov',
    'diy',
    'icymi',
    'goat',
    'bff',
    'bf',
    'gf',
    // Additional common slang
    'omw', // on my way
    'thx',
    'ty',
    'tysm',
    'np', // no problem
    'ikr', // i know right
    'tbf', // to be fair
    'ftw', // for the win
    'ig', // i guess
    'ngl', // not gonna lie
    'fr', // for real
    'atm', // at the moment
    'jk', // just kidding
    'idc', // i don't care
    'gg', // good game
    'afaik', // as far as i know
    'pls',
    'plz',
    'tho',
    'cuz',
    'ur',
    'wanna',
    'gonna',
    'gotta',
    'yep',
    'yup',
    'nope',
    'nah',
    'yeah',
    'ok',
    'okay',
    'soo', // from repeated 'so'
    'haha',
    'omfg',
    // Modern slang
    'sus',
    'salty',
    'stan',
    'vibe',
    'vibes',
    'lit',
    'dope',
    'lowkey',
    'highkey',
    'flex',
    'hype',
    'slay',
    'simp',
    'based',
    'cringe',
    'savage',
    'mood',
    'sus',
    'rekt',
    'noob',
    'pwn',
    'meme',
    'memes',
    // Contraction parts that might not be in dictionary
    'wouldn',
    'shouldn',
    'couldn',
    // Tech/AI terms
    'ai',
    'ml',
    'llm',
    'gpt',
    'api',
    'url',
    'html',
    'css',
    'js',
    'ui',
    'ux',
    'seo',
    'saas',
    'app',
];

// Initialize word set with English dictionary + acronyms
const wordSet = new Set<string>(words.map((w: string) => w.toLowerCase()));
commonAcronyms.forEach((acronym) => wordSet.add(acronym.toLowerCase()));

// Initialize profanity filter
const filter = new Filter();

/**
 * Check if text contains valid English words
 * Returns validation status with invalid words
 * SERVER-ONLY - uses large word dictionary
 */
export function checkTextWords(text: string): {
    isValid: boolean;
    invalidWords: string[];
    validWordPercentage: number;
} {
    // Extract words (including contractions and possessives with apostrophes)
    const tokens = text.toLowerCase().match(/\b[a-z]+(?:'[a-z]+)?\b/g) || [];

    if (tokens.length === 0) {
        return {
            isValid: false,
            invalidWords: [],
            validWordPercentage: 0,
        };
    }

    // Check each word
    const invalidWords: string[] = [];
    let validCount = 0;

    for (const token of tokens) {
        let isValidWord = wordSet.has(token);

        // If not found, try removing possessive 's and check base word
        if (!isValidWord && token.endsWith("'s")) {
            const baseWord = token.slice(0, -2);
            isValidWord = wordSet.has(baseWord);
        }

        // Handle common contractions by checking if base words are valid
        if (!isValidWord && token.includes("'")) {
            const parts = token.split("'");
            // For contractions like don't, can't, won't, i'm, etc.
            // Check if first part is a valid word
            if (parts[0] && wordSet.has(parts[0])) {
                isValidWord = true;
            }
        }

        if (isValidWord) {
            validCount++;
        } else {
            // Don't add duplicates
            if (!invalidWords.includes(token)) {
                invalidWords.push(token);
            }
        }
    }

    const validWordPercentage = (validCount / tokens.length) * 100;

    // Allow 80% valid words to account for proper nouns, names, places, brands, etc.
    const isValid = validWordPercentage >= 80;

    return {
        isValid,
        invalidWords: invalidWords.slice(0, 5), // Return max 5 invalid words as examples
        validWordPercentage,
    };
}

/**
 * SERVER-ONLY: Validate and filter text input with full English word validation
 * Returns validation result with sanitized text or error message
 */
export async function validateTextServer(
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

    // Check for valid English words
    const wordCheck = checkTextWords(sanitized);
    if (!wordCheck.isValid) {
        const exampleWords =
            wordCheck.invalidWords.length > 0
                ? ` (e.g., "${wordCheck.invalidWords.join('", "')}")`
                : '';
        return {
            isValid: false,
            sanitized,
            error: `Please avoid excessive gibberish or keyboard mashing. Most words should be recognizable English${exampleWords}. (Names and proper nouns are okay!)`,
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
