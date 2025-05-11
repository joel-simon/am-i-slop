import type { Database, TextSubmission, NewTextSubmission } from './types';
import { db } from './db';
import { md5 } from '$lib/utils/hash';
// Store a new text submission
export async function storeTextSubmission(
    text: string,
    perplexity: number,
    questionId: number
): Promise<TextSubmission> {
    const textHash = md5(text);

    try {
        const submission: NewTextSubmission = {
            text_hash: textHash,
            text,
            perplexity,
            question_id: questionId,
        };

        const result = await db
            .insertInto('text_submissions')
            .values(submission)
            .returningAll()
            .executeTakeFirst();

        if (!result) {
            throw new Error('Failed to insert submission');
        }

        return result;
    } catch (error) {
        if ((error as any).code === '23505') {
            // Unique violation
            // If the text already exists, return the existing submission
            const existing = await getSubmissionByHash(textHash);
            if (existing) return existing;
        }
        throw error;
    }
}

// Get all submissions for a question
export async function getSubmissionsForQuestion(questionId: number): Promise<TextSubmission[]> {
    return await db
        .selectFrom('text_submissions')
        .where('question_id', '=', questionId)
        .orderBy('perplexity', 'asc')
        .selectAll()
        .execute();
}

// Get submissions within a perplexity range for a question
export async function getSubmissionsInRange(
    questionId: number,
    minPerplexity: number,
    maxPerplexity: number
): Promise<TextSubmission[]> {
    return await db
        .selectFrom('text_submissions')
        .where('question_id', '=', questionId)
        .where('perplexity', '>=', minPerplexity)
        .where('perplexity', '<=', maxPerplexity)
        .orderBy('perplexity', 'asc')
        .selectAll()
        .execute();
}

// Get a single submission by hash
export async function getSubmissionByHash(textHash: string): Promise<TextSubmission | null> {
    return (
        (await db
            .selectFrom('text_submissions')
            .where('text_hash', '=', textHash)
            .selectAll()
            .executeTakeFirst()) ?? null
    );
}

// Get similar perplexity submissions (within a percentage range)
export async function getSimilarPerplexitySubmissions(
    questionId: number,
    targetPerplexity: number,
    percentageRange: number = 10 // Default 10% range
): Promise<TextSubmission[]> {
    const minPerplexity = targetPerplexity * (1 - percentageRange / 100);
    const maxPerplexity = targetPerplexity * (1 + percentageRange / 100);

    return getSubmissionsInRange(questionId, minPerplexity, maxPerplexity);
}
