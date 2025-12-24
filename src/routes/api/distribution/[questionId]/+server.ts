import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSubmissionsForQuestion } from '$lib/db/schema';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const questionId = parseInt(params.questionId);

        if (isNaN(questionId)) {
            return json({ error: 'Invalid question ID' }, { status: 400 });
        }

        // Get all submissions for this question
        const submissions = await getSubmissionsForQuestion(questionId);

        if (submissions.length === 0) {
            return json({
                totalSubmissions: 0,
                histogram: { bins: [], counts: [] },
                stats: null,
            });
        }

        const perplexities = submissions.map((s) => s.perplexity);

        // Calculate statistics
        const sorted = [...perplexities].sort((a, b) => a - b);
        const min = Math.min(...perplexities);
        const max = Math.max(...perplexities);
        const mean = perplexities.reduce((a, b) => a + b, 0) / perplexities.length;
        const median = sorted[Math.floor(sorted.length / 2)];

        // Calculate histogram (10 bins)
        const numBins = 10;
        const binSize = (max - min) / numBins;
        const bins: number[] = [];
        const counts: number[] = [];

        for (let i = 0; i < numBins; i++) {
            const binStart = min + i * binSize;
            const binEnd = min + (i + 1) * binSize;
            bins.push(binStart);

            // Include the last bin's upper bound (handle edge case)
            const count = perplexities.filter((p) => {
                if (i === numBins - 1) {
                    return p >= binStart && p <= binEnd; // Include upper bound for last bin
                }
                return p >= binStart && p < binEnd;
            }).length;
            counts.push(count);
        }

        console.log(`Distribution for question ${questionId}:`, {
            totalSubmissions: submissions.length,
            bins: bins.length,
            counts,
            stats: { min, max, mean, median },
        });

        // Return lightweight aggregated data
        return json({
            totalSubmissions: submissions.length,
            histogram: {
                bins,
                counts,
                binSize,
            },
            stats: {
                min,
                max,
                mean,
                median,
            },
        });
    } catch (error) {
        console.error('Error fetching distribution:', error);
        return json({ error: 'Failed to fetch distribution' }, { status: 500 });
    }
};
