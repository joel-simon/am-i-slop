import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import runpodSdk from 'runpod-sdk';
import { RUNPOD_API_KEY, ENDPOINT_ID } from '$env/static/private';

// Initialize RunPod SDK
let runpodClient: ReturnType<typeof runpodSdk> | null = null;
let endpoint: ReturnType<ReturnType<typeof runpodSdk>['endpoint']> | null = null;

if (RUNPOD_API_KEY && ENDPOINT_ID) {
    console.log({ RUNPOD_API_KEY, ENDPOINT_ID });
    runpodClient = runpodSdk(RUNPOD_API_KEY);
    endpoint = runpodClient.endpoint(ENDPOINT_ID);
} else {
    console.warn('RUNPOD_API_KEY or ENDPOINT_ID not set. Perplexity API will not work.');
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { text } = await request.json();

        if (!text || typeof text !== 'string') {
            return json({ error: 'Invalid input. Required: text (string)' }, { status: 400 });
        }

        if (!endpoint) {
            return json(
                {
                    error: 'RunPod API not configured. Please set RUNPOD_API_KEY and ENDPOINT_ID environment variables.',
                },
                { status: 500 }
            );
        }

        console.log(`Calculating perplexity for text: "${text.substring(0, 50)}..."`);

        // Call RunPod endpoint
        const result: any = await endpoint.runSync({
            input: {
                text: text,
            },
        });

        console.log('RunPod response:', result);

        // Check for errors
        if (result.error) {
            return json({ error: result.error }, { status: 500 });
        }

        if (result.status === 'FAILED') {
            return json({ error: result.error || 'Job failed on RunPod' }, { status: 500 });
        }

        // Return the perplexity data
        return json({
            total_perplexity: result.output.total_perplexity,
            by_token: result.output.by_token,
        });
    } catch (error) {
        console.error('Error calculating perplexity:', error);
        return json(
            {
                error: error instanceof Error ? error.message : 'Failed to calculate perplexity',
            },
            { status: 500 }
        );
    }
};
