<script lang="ts">
    import { onMount } from 'svelte';
    import type { TextSubmission } from '$lib/db/schema';

    let submissions: TextSubmission[] = [];
    let loading = false;
    let error: string | null = null;

    // Sample texts for random generation
    const sampleTexts = [
        'I went to the store and bought some groceries.',
        'The weather is beautiful today, perfect for a walk.',
        "I'm learning to play the guitar, it's quite challenging.",
        'Just finished reading an interesting book about space.',
        'Had a great workout at the gym this morning.',
        "Working on a new project that's really exciting.",
        'The movie last night was absolutely amazing.',
        'Learning to cook new recipes has been fun.',
        'The concert last weekend was incredible.',
        'Started a new hobby of painting landscapes.',
    ];

    // Generate random perplexity between 50 and 500
    function getRandomPerplexity() {
        return Math.floor(Math.random() * 450) + 50;
    }

    // Load all submissions for question 0
    async function loadSubmissions() {
        loading = true;
        error = null;
        try {
            const response = await fetch('/api/submissions/0');
            if (!response.ok) {
                throw new Error('Failed to load submissions');
            }
            submissions = await response.json();
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error loading submissions:', err);
        } finally {
            loading = false;
        }
    }

    // Insert random submission
    async function insertRandomSubmission() {
        loading = true;
        error = null;
        try {
            const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
            const randomPerplexity = getRandomPerplexity();

            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: randomText,
                    perplexity: randomPerplexity,
                    questionId: 0,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to insert submission');
            }

            // Reload submissions after inserting
            await loadSubmissions();
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error inserting submission:', err);
        } finally {
            loading = false;
        }
    }

    // Load submissions when page loads
    onMount(() => {
        loadSubmissions();
    });
</script>

<div class="max-w-4xl mx-auto p-6 font-terminal">
    <h1 class="text-4xl mb-6">Database Test Page</h1>

    <div class="space-y-4 mb-8">
        <button
            on:click={insertRandomSubmission}
            disabled={loading}
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
            {loading ? 'Loading...' : 'Insert Random Submission'}
        </button>

        <button
            on:click={loadSubmissions}
            disabled={loading}
            class="ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
            {loading ? 'Loading...' : 'Refresh Submissions'}
        </button>
    </div>

    {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
        </div>
    {/if}

    <div class="space-y-4">
        <h2 class="text-2xl mb-4">Submissions for Question 0</h2>

        {#if submissions.length === 0}
            <p class="text-gray-600">No submissions found.</p>
        {:else}
            <div class="grid gap-4">
                {#each submissions as submission}
                    <div class="border p-4 rounded">
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-mono text-sm text-gray-500">
                                Hash: {submission.text_hash}
                            </span>
                            <span class="font-bold">
                                Perplexity: {submission.perplexity.toFixed(2)}
                            </span>
                        </div>
                        <p class="text-lg mb-2">{submission.text}</p>
                        <div class="text-sm text-gray-500">
                            Submitted: {new Date(submission.created_at).toLocaleString()}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    /* Terminal UI overrides */
    .max-w-4xl {
        background: #181c1f;
        border: 2px solid #22272b;
        border-radius: 0 !important;
        box-shadow: 0 0 0 2px #101214;
    }

    h1,
    h2 {
        color: #c7f774;
        text-shadow:
            0 0 2px #bada55,
            0 0 8px #222;
    }

    button {
        background: #23272e !important;
        color: #bada55 !important;
        border: 2px solid #bada55 !important;
        border-radius: 0 !important;
        font-family: inherit;
        font-weight: bold;
        box-shadow: none !important;
        transition:
            background 0.2s,
            color 0.2s;
    }

    button:hover {
        background: #bada55 !important;
        color: #23272e !important;
    }

    .border {
        border-color: #2d332b !important;
    }

    .text-gray-500 {
        color: #8a8a8a !important;
    }

    .text-gray-600 {
        color: #666 !important;
    }

    .bg-red-100 {
        background: #2d1f1f !important;
    }

    .border-red-400 {
        border-color: #ff4444 !important;
    }

    .text-red-700 {
        color: #ff4444 !important;
    }
</style>
