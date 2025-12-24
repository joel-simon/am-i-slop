import type { PageServerLoad } from './$types';
import { getSubmissionWithDataByHash } from '$lib/db/schema';
import { error } from '@sveltejs/kit';
import { getQuestionText } from '$lib/questions';

export const load: PageServerLoad = async ({ params }) => {
    const { text_hash } = params;

    const data = await getSubmissionWithDataByHash(text_hash);

    if (!data) {
        throw error(404, 'Submission not found');
    }

    const { submission, allSubmissions, rank, percentile, slopPercentile } = data;

    // Get question text
    const questionText = getQuestionText(submission.question_id);

    // Get neighboring submissions for context
    const sortedByPerplexity = [...allSubmissions].sort((a, b) => a.perplexity - b.perplexity);
    const userIndex = sortedByPerplexity.findIndex((s) => s.id === submission.id);
    const lowerNeighbors = sortedByPerplexity.slice(Math.max(0, userIndex - 2), userIndex);
    const higherNeighbors = sortedByPerplexity.slice(
        userIndex + 1,
        Math.min(sortedByPerplexity.length, userIndex + 3)
    );

    return {
        submission: {
            id: submission.id,
            text: submission.text,
            text_hash: submission.text_hash,
            perplexity: submission.perplexity,
            question_id: submission.question_id,
            created_at: submission.created_at.toISOString(),
        },
        questionText,
        placement: {
            rank,
            total: allSubmissions.length,
            percentile,
            slopPercentile,
        },
        neighbors: {
            lower: lowerNeighbors.map((s) => ({
                text: s.text,
                perplexity: s.perplexity,
            })),
            higher: higherNeighbors.map((s) => ({
                text: s.text,
                perplexity: s.perplexity,
            })),
        },
    };
};

