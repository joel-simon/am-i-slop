import { browser } from '$app/environment';

export interface StoredSubmission {
    text_hash: string;
    text: string;
    perplexity: number;
    question_id: number;
    question_text: string;
    slopPercentile: number;
    created_at: string;
}

const STORAGE_KEY = 'slop_submissions';
const MAX_SUBMISSIONS = 20; // Keep last 20 submissions

export function getStoredSubmissions(): StoredSubmission[] {
    if (!browser) return [];
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error reading submissions from localStorage:', e);
        return [];
    }
}

export function saveSubmission(submission: StoredSubmission): void {
    if (!browser) return;
    
    try {
        const existing = getStoredSubmissions();
        
        // Check if already exists (by text_hash)
        const existingIndex = existing.findIndex(s => s.text_hash === submission.text_hash);
        if (existingIndex !== -1) {
            // Update existing
            existing[existingIndex] = submission;
        } else {
            // Add new at the beginning
            existing.unshift(submission);
        }
        
        // Keep only the last MAX_SUBMISSIONS
        const trimmed = existing.slice(0, MAX_SUBMISSIONS);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('Error saving submission to localStorage:', e);
    }
}

export function clearStoredSubmissions(): void {
    if (!browser) return;
    
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('Error clearing submissions from localStorage:', e);
    }
}

