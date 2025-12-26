import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import runpodSdk from 'runpod-sdk';
import { RUNPOD_API_KEY, ENDPOINT_ID } from '$env/static/private';
import { storeTextSubmission, getSubmissionsForQuestion } from '$lib/db/schema';
import { getQuestionText } from '$lib/questions';
import { validateTextServer } from '$lib/utils/textFilter.server';

// Initialize RunPod SDK
let runpodClient: ReturnType<typeof runpodSdk> | null = null;
let endpoint: ReturnType<ReturnType<typeof runpodSdk>['endpoint']> | null = null;

if (RUNPOD_API_KEY && ENDPOINT_ID) {
    runpodClient = runpodSdk(RUNPOD_API_KEY);
    endpoint = runpodClient.endpoint(ENDPOINT_ID);
} else {
    console.warn('RUNPOD_API_KEY or ENDPOINT_ID not set. Analysis API will not work.');
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { text, questionId } = await request.json();

        // Basic type validation
        if (!text || typeof text !== 'string') {
            return json({ error: 'Invalid input. Required: text (string)' }, { status: 400 });
        }

        if (typeof questionId !== 'number') {
            return json({ error: 'Invalid input. Required: questionId (number)' }, { status: 400 });
        }

        // Server-side validation and sanitization (defense in depth)
        // Min 16 chars, Max 256 chars
        // Uses full English word dictionary validation (server-only)
        const validation = await validateTextServer(text, 16, 256);

        if (!validation.isValid) {
            console.warn(`Validation failed for text: ${validation.error}`);
            return json({ error: validation.error || 'Invalid input' }, { status: 400 });
        }

        // Use sanitized text for all subsequent operations
        const sanitizedText = validation.sanitized.toLowerCase();

        if (!endpoint) {
            return json(
                {
                    error: 'RunPod API not configured. Please set RUNPOD_API_KEY and ENDPOINT_ID environment variables.',
                },
                { status: 500 }
            );
        }

        console.log(
            `Analyzing text for question ${questionId}: "${sanitizedText.substring(0, 50)}..."`
        );

        // Format as Q&A for better perplexity (model gets context from question)
        // Use sanitized text
        const formattedInput = `q:${getQuestionText(questionId)} a:${sanitizedText}`;

        console.log(`Formatted input: "${formattedInput}"`);

        const result: any = await endpoint.runSync({
            input: {
                text: formattedInput,
            },
        });

        console.log('RunPod response:', JSON.stringify(result, null, 2));

        // Check for errors
        if (result.error) {
            return json({ error: result.error }, { status: 500 });
        }

        if (result.status === 'FAILED') {
            return json({ error: result.error || 'Job failed on RunPod' }, { status: 500 });
        }

        const perplexity = result.output.total_perplexity;
        const allTokens = result.output.by_token;

        // Filter tokens to only include the answer part (after " a:")
        // Strategy: Build full text, find where " a:" ends, then map back to token index
        const answerMarker = ' a:';
        const fullText = allTokens.map((t: { token: string }) => t.token).join('');
        const markerIndex = fullText.indexOf(answerMarker);

        let answerStartIndex = 0;

        if (markerIndex !== -1) {
            const answerStartChar = markerIndex + answerMarker.length;

            // Walk through tokens to find which one contains the answer start
            let charCount = 0;
            for (let i = 0; i < allTokens.length; i++) {
                const tokenEnd = charCount + allTokens[i].token.length;

                if (tokenEnd > answerStartChar) {
                    // This token contains or starts after the answer marker
                    answerStartIndex = i;
                    break;
                }
                charCount = tokenEnd;
            }
        }

        // Get only the tokens from the answer portion
        const byToken = allTokens.slice(answerStartIndex);

        console.log(
            `Answer marker at char ${markerIndex}, answer starts at token ${answerStartIndex}, total answer tokens: ${byToken.length}`
        );
        console.log(
            `Answer tokens:`,
            byToken.map((t: { token: string }) => t.token)
        );

        // Store submission in database (use sanitized text)
        console.log(`Storing submission with perplexity: ${perplexity}`);
        const submission = await storeTextSubmission(sanitizedText, perplexity, questionId);

        // Get all submissions for this question to calculate placement
        const allSubmissions = await getSubmissionsForQuestion(questionId);

        // Calculate percentile and rank
        const sortedByPerplexity = [...allSubmissions].sort((a, b) => a.perplexity - b.perplexity);
        const userRank = sortedByPerplexity.findIndex((s) => s.id === submission.id) + 1;
        const percentile = (userRank / allSubmissions.length) * 100;

        // Get neighboring submissions (2 below, 2 above)
        const userIndex = sortedByPerplexity.findIndex((s) => s.id === submission.id);
        const lowerNeighbors = sortedByPerplexity.slice(Math.max(0, userIndex - 2), userIndex);
        const higherNeighbors = sortedByPerplexity.slice(
            userIndex + 1,
            Math.min(sortedByPerplexity.length, userIndex + 3)
        );

        // Calculate histogram data (bins of perplexity ranges)
        const histogram = calculateHistogram(allSubmissions);

        console.log(
            `Analysis complete. Rank: ${userRank}/${allSubmissions.length}, Percentile: ${percentile.toFixed(1)}%`
        );

        // Return complete analysis results
        return json({
            perplexity,
            by_token: byToken,
            placement: {
                percentile: percentile,
                rank: userRank,
                total: allSubmissions.length,
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
            histogram,
            submission_id: submission.id,
            text_hash: submission.text_hash,
        });
    } catch (error) {
        console.error('Error during analysis:', error);
        return json(
            {
                error: error instanceof Error ? error.message : 'Failed to analyze text',
            },
            { status: 500 }
        );
    }
};

// Helper function to calculate histogram
function calculateHistogram(submissions: any[]) {
    if (submissions.length === 0) {
        return { bins: [], counts: [] };
    }

    const perplexities = submissions.map((s) => s.perplexity);
    const min = Math.min(...perplexities);
    const max = Math.max(...perplexities);

    // Create 20 bins
    const numBins = 20;
    const binSize = (max - min) / numBins;

    const bins: number[] = [];
    const counts: number[] = [];

    for (let i = 0; i < numBins; i++) {
        const binStart = min + i * binSize;
        const binEnd = min + (i + 1) * binSize;
        bins.push(binStart);

        const count = perplexities.filter((p) => p >= binStart && p < binEnd).length;
        counts.push(count);
    }

    return { bins, counts };
}
