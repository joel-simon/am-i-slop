<script lang="ts">
    import { onMount } from 'svelte';

    // --- Props ---
    export let userScore: number | null = null;
    export let questionId: number = 0;
    export let n: number = 2; // Number of submissions to show before and after

    // --- State ---
    let neighboringSubmissions: {
        text: string;
        perplexity: number;
        isAbove: boolean;
        isCurrent: boolean;
    }[] = [];
    let loading = false;
    let error: string | null = null;

    async function loadNeighboringSubmissions() {
        if (userScore === null || !isFinite(userScore)) return;

        loading = true;
        error = null;
        try {
            // First get all submissions for the question to find the range
            const allResponse = await fetch(`/api/submissions/${questionId}`);
            if (!allResponse.ok) {
                throw new Error('Failed to load submissions');
            }
            const allSubmissions = await allResponse.json();
            console.log('allSubmissions', allSubmissions);

            // Sort all submissions by perplexity to find the range
            const sortedSubmissions = allSubmissions
                .map((s: any) => s.perplexity)
                .sort((a: number, b: number) => a - b);

            console.log('sortedSubmissions', sortedSubmissions);
            console.log('userScore', userScore);

            // Find the index of the current score
            const currentIndex = sortedSubmissions.findIndex(
                (score: number) => score === userScore
            );
            console.log('currentIndex', currentIndex);

            if (currentIndex === -1) {
                // If exact match not found, find the closest score
                const closestIndex = sortedSubmissions.findIndex(
                    (score: number) => score > userScore
                );
                if (closestIndex === -1) {
                    // If no higher score found, use the last index
                    neighboringSubmissions = allSubmissions
                        .slice(-n - 1)
                        .map((s: any) => ({
                            text: s.text,
                            perplexity: s.perplexity,
                            isCurrent: Math.abs(s.perplexity - userScore) < 0.0001, // Use small epsilon for float comparison
                            isAbove: s.perplexity > userScore,
                        }))
                        .sort(
                            (a: { perplexity: number }, b: { perplexity: number }) =>
                                a.perplexity - b.perplexity
                        );
                } else {
                    // Use the closest higher score as reference
                    const startIndex = Math.max(0, closestIndex - n - 1);
                    const endIndex = Math.min(sortedSubmissions.length - 1, closestIndex + n);
                    const minPerplexity = sortedSubmissions[startIndex];
                    const maxPerplexity = sortedSubmissions[endIndex];

                    // Fetch submissions in the calculated range
                    const rangeResponse = await fetch(
                        `/api/submissions/${questionId}/range?min=${minPerplexity}&max=${maxPerplexity}`
                    );
                    if (!rangeResponse.ok) {
                        throw new Error('Failed to load range submissions');
                    }
                    const rangeSubmissions = await rangeResponse.json();

                    // Process and sort the submissions
                    neighboringSubmissions = rangeSubmissions
                        .map((s: any) => ({
                            text: s.text,
                            perplexity: s.perplexity,
                            isCurrent: Math.abs(s.perplexity - userScore) < 0.0001, // Use small epsilon for float comparison
                            isAbove: s.perplexity > userScore,
                        }))
                        .sort(
                            (a: { perplexity: number }, b: { perplexity: number }) =>
                                a.perplexity - b.perplexity
                        );
                }
                return;
            }

            // Calculate the range to fetch
            const startIndex = Math.max(0, currentIndex - n);
            const endIndex = Math.min(sortedSubmissions.length - 1, currentIndex + n);
            const minPerplexity = sortedSubmissions[startIndex];
            const maxPerplexity = sortedSubmissions[endIndex];

            console.log('range', { startIndex, endIndex, minPerplexity, maxPerplexity });

            // Fetch submissions in the calculated range
            const rangeResponse = await fetch(
                `/api/submissions/${questionId}/range?min=${minPerplexity}&max=${maxPerplexity}`
            );
            if (!rangeResponse.ok) {
                throw new Error('Failed to load range submissions');
            }
            const rangeSubmissions = await rangeResponse.json();
            console.log('rangeSubmissions', rangeSubmissions);

            // Process and sort the submissions
            neighboringSubmissions = rangeSubmissions
                .map((s: any) => ({
                    text: s.text,
                    perplexity: s.perplexity,
                    isCurrent: Math.abs(s.perplexity - userScore) < 0.0001, // Use small epsilon for float comparison
                    isAbove: s.perplexity > userScore,
                }))
                .sort(
                    (a: { perplexity: number }, b: { perplexity: number }) =>
                        a.perplexity - b.perplexity
                );

            console.log('neighboringSubmissions', neighboringSubmissions);
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error loading neighboring submissions:', err);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        if (userScore !== null && isFinite(userScore)) {
            loadNeighboringSubmissions();
        }
    });

    // Reload when userScore changes
    $: if (userScore !== null && isFinite(userScore)) {
        loadNeighboringSubmissions();
    }
</script>

<div class="neighboring-submissions p-4 border rounded-lg shadow my-6 bg-gray-50">
    <h3 class="text-lg font-semibold text-gray-700 mb-3 text-center">Nearby Submissions</h3>
    {#if loading}
        <p class="text-center text-gray-500">Loading submissions...</p>
    {:else if error}
        <p class="text-center text-red-500">{error}</p>
    {:else if userScore === null || !isFinite(userScore)}
        <p class="text-center text-gray-500">No score available or score is invalid.</p>
    {:else if neighboringSubmissions.length === 0}
        <p class="text-center text-gray-500">No submissions found.</p>
    {:else}
        <div class="space-y-4">
            {#each neighboringSubmissions as submission}
                <div
                    class="submission p-3 rounded-lg {submission.isCurrent
                        ? 'bg-purple-50 border-2 border-purple-300'
                        : submission.isAbove
                          ? 'bg-blue-50'
                          : 'bg-green-50'}"
                >
                    <div class="flex justify-between items-start mb-2">
                        <span
                            class="text-sm font-medium {submission.isCurrent
                                ? 'text-purple-700'
                                : submission.isAbove
                                  ? 'text-blue-700'
                                  : 'text-green-700'}"
                        >
                            {submission.isCurrent
                                ? 'Your Submission'
                                : submission.isAbove
                                  ? 'Higher Score'
                                  : 'Lower Score'}
                        </span>
                        <span
                            class="text-sm font-semibold {submission.isCurrent
                                ? 'text-purple-600'
                                : submission.isAbove
                                  ? 'text-blue-600'
                                  : 'text-green-600'}"
                        >
                            Perplexity: {submission.perplexity.toFixed(2)}
                        </span>
                    </div>
                    <p class="text-gray-700 whitespace-pre-wrap">{submission.text}</p>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .submission {
        transition: all 0.2s ease-in-out;
    }
    .submission:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
</style>
