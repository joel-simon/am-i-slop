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

<div class="neighboring-submissions">
    <h3 class="section-title text-lg">Nearby Submissions</h3>
    {#if loading}
        <p class="status-text text-sm">Loading submissions...</p>
    {:else if error}
        <p class="error-text text-sm">{error}</p>
    {:else if userScore === null || !isFinite(userScore)}
        <p class="status-text text-sm">No score available or score is invalid.</p>
    {:else if neighboringSubmissions.length === 0}
        <p class="status-text text-sm">No submissions found.</p>
    {:else}
        <div class="submissions-list">
            {#each neighboringSubmissions as submission}
                <div
                    class="submission-card"
                    class:is-current={submission.isCurrent}
                    class:is-above={!submission.isCurrent && submission.isAbove}
                    class:is-below={!submission.isCurrent && !submission.isAbove}
                >
                    <div class="submission-header">
                        <span class="submission-score text-sm">
                            {submission.perplexity.toFixed(2)}
                        </span>
                    </div>
                    <p class="submission-text text-md">{submission.text}</p>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .neighboring-submissions {
        background: #181c1f;
        border: 2px solid #2d332b;
        border-radius: 0;
        padding: 1rem;
        margin: 1.5rem 0;
    }

    .section-title {
        color: #bada55;
        text-shadow:
            0 0 2px #bada55,
            0 0 4px #222;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .status-text {
        color: #8a8a8a;
    }

    .error-text {
        color: #ff6b6b;
    }

    .submissions-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .submission-card {
        background: #23272e;
        border: 1px solid #2d332b;
        padding: 0.75rem 1rem;
        transition: all 0.2s ease;
    }

    .submission-card:hover {
        border-color: #3d4451;
    }

    .submission-card.is-current {
        border-left: 3px solid #bada55;
        background: #1e2420;
        box-shadow: 0 0 8px rgba(186, 218, 85, 0.15);
    }

    .submission-card.is-above {
        border-left: 3px solid #6b9fff;
    }

    .submission-card.is-below {
        border-left: 3px solid #ff9f6b;
    }

    .submission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .submission-score {
        font-weight: 700;
        font-family: 'Terminal Grotesque', 'Fira Mono', monospace;
    }

    .is-current .submission-score {
        color: #bada55;
        text-shadow: 0 0 4px #bada55;
    }

    .is-above .submission-score {
        color: #6b9fff;
    }

    .is-below .submission-score {
        color: #ff9f6b;
    }

    .submission-text {
        color: #c7f774;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
    }
</style>
