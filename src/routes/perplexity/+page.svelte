<script lang="ts">
    import { onMount } from 'svelte';

    // State
    let text = 'I went to the store';
    let loading = false;
    let error: string | null = null;
    let result: {
        total_perplexity: number;
        by_token: Array<{
            token: string;
            perplexity: number;
            probability: number;
        }>;
    } | null = null;

    // Sample texts
    const sampleTexts = [
        'I went to the store',
        'The quick brown fox jumps over the lazy dog',
        'Hello world! How are you doing today?',
        'Artificial intelligence is transforming our world',
        'The weather is nice today',
    ];

    // Calculate perplexity
    async function calculatePerplexity() {
        if (!text.trim()) {
            error = 'Please enter some text';
            return;
        }

        loading = true;
        error = null;
        result = null;

        try {
            const response = await fetch('/api/perplexity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to calculate perplexity');
            }

            result = await response.json();
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error calculating perplexity:', err);
        } finally {
            loading = false;
        }
    }

    // Load random sample
    function loadRandomSample() {
        text = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
    }

    // Format probability as percentage
    function formatProbability(prob: number): string {
        return (prob * 100).toFixed(2) + '%';
    }

    // Color code based on perplexity (lower = more predictable = green)
    function getPerplexityColor(perplexity: number): string {
        if (perplexity < 10) return '#4ade80'; // green
        if (perplexity < 50) return '#fbbf24'; // yellow
        if (perplexity < 200) return '#fb923c'; // orange
        return '#ef4444'; // red
    }

    // Get bar width based on probability
    function getProbabilityWidth(prob: number): string {
        return Math.max(prob * 100, 2) + '%';
    }
</script>

<div class="max-w-5xl mx-auto p-6 font-terminal">
    <h1 class="text-4xl mb-2">Perplexity Calculator</h1>
    <p class="text-gray-400 mb-6">
        Test text perplexity using GPT-2 on RunPod. Lower perplexity = more predictable text.
    </p>

    <!-- Input Section -->
    <div class="input-section mb-6">
        <label for="text-input" class="block text-lg mb-2 text-lime">
            Enter Text to Analyze:
        </label>
        <textarea
            id="text-input"
            bind:value={text}
            rows="4"
            class="w-full p-3 bg-dark border-2 border-lime text-white font-mono"
            placeholder="Enter your text here..."
        />

        <div class="flex gap-4 mt-4">
            <button
                on:click={calculatePerplexity}
                disabled={loading || !text.trim()}
                class="btn-primary"
            >
                {loading ? 'Calculating...' : 'Calculate Perplexity'}
            </button>

            <button on:click={loadRandomSample} disabled={loading} class="btn-secondary">
                Load Random Sample
            </button>
        </div>
    </div>

    <!-- Error Display -->
    {#if error}
        <div class="error-box mb-6">
            <strong>Error:</strong>
            {error}
        </div>
    {/if}

    <!-- Results Section -->
    {#if result}
        <div class="results-section">
            <!-- Total Perplexity -->
            <div class="total-perplexity mb-6">
                <h2 class="text-2xl mb-2">Total Perplexity</h2>
                <div
                    class="text-6xl font-bold"
                    style="color: {getPerplexityColor(result.total_perplexity)}"
                >
                    {result.total_perplexity.toFixed(2)}
                </div>
                <p class="text-gray-400 mt-2">
                    {#if result.total_perplexity < 50}
                        Very predictable text
                    {:else if result.total_perplexity < 150}
                        Moderately predictable
                    {:else if result.total_perplexity < 300}
                        Less predictable
                    {:else}
                        Highly unpredictable
                    {/if}
                </p>
            </div>

            <!-- Per-Token Analysis -->
            <div class="per-token-section">
                <h2 class="text-2xl mb-4">Token Analysis</h2>
                <p class="text-gray-400 mb-4">
                    {result.by_token.length} tokens analyzed. Higher probability = more predictable.
                </p>

                <div class="token-list">
                    {#each result.by_token as token, index}
                        <div class="token-item">
                            <div class="token-header">
                                <span class="token-text">{token.token}</span>
                                <div class="token-stats">
                                    <span class="stat-label">PPL:</span>
                                    <span
                                        class="stat-value"
                                        style="color: {getPerplexityColor(token.perplexity)}"
                                    >
                                        {token.perplexity.toFixed(2)}
                                    </span>
                                    <span class="stat-label ml-4">Prob:</span>
                                    <span class="stat-value text-lime">
                                        {formatProbability(token.probability)}
                                    </span>
                                </div>
                            </div>

                            <!-- Probability Bar -->
                            <div class="probability-bar-bg">
                                <div
                                    class="probability-bar"
                                    style="width: {getProbabilityWidth(token.probability)}"
                                />
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    {#if !result && !error && !loading}
        <div class="text-center text-gray-400 py-12">
            <p class="text-xl">Enter text above and click "Calculate Perplexity" to begin</p>
        </div>
    {/if}
</div>

<style>
    /* Terminal Theme */
    .max-w-5xl {
        background: #181c1f;
        border: 2px solid #22272b;
        box-shadow: 0 0 0 2px #101214;
        min-height: 100vh;
    }

    h1,
    h2 {
        color: #c7f774;
        /* text-shadow:
            0 0 2px #bada55,
            0 0 8px #222; */
    }

    .text-lime {
        color: #bada55;
    }

    .text-gray-400 {
        color: #8a8a8a;
    }

    .bg-dark {
        background: #0f1214;
    }

    /* Input Styling */
    textarea {
        border-radius: 0 !important;
        box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
    }

    textarea:focus {
        outline: none;
        border-color: #c7f774;
        box-shadow:
            inset 0 0 10px rgba(0, 0, 0, 0.5),
            0 0 10px #bada55;
    }

    /* Buttons */
    .btn-primary,
    .btn-secondary {
        background: #23272e !important;
        color: #bada55 !important;
        border: 2px solid #bada55 !important;
        border-radius: 0 !important;
        font-family: inherit;
        font-weight: bold;
        padding: 0.75rem 1.5rem;
        transition:
            background 0.2s,
            color 0.2s;
        cursor: pointer;
    }

    .btn-primary:hover:not(:disabled),
    .btn-secondary:hover:not(:disabled) {
        background: #bada55 !important;
        color: #23272e !important;
    }

    .btn-primary:disabled,
    .btn-secondary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Error Box */
    .error-box {
        background: #2d1f1f;
        border: 2px solid #ff4444;
        color: #ff4444;
        padding: 1rem;
        border-radius: 0;
    }

    /* Results Section */
    .results-section {
        border-top: 2px solid #2d332b;
        padding-top: 2rem;
    }

    .total-perplexity {
        text-align: center;
        padding: 2rem;
        background: #0f1214;
        border: 2px solid #2d332b;
    }

    /* Token List */
    .token-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .token-item {
        background: #0f1214;
        border: 2px solid #2d332b;
        padding: 1rem;
        transition: border-color 0.2s;
    }

    .token-item:hover {
        border-color: #bada55;
    }

    .token-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .token-text {
        font-family: 'Courier New', monospace;
        font-size: 1.125rem;
        color: #fff;
        background: #23272e;
        padding: 0.25rem 0.75rem;
        border: 1px solid #3d4451;
    }

    .token-stats {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: monospace;
    }

    .stat-label {
        color: #8a8a8a;
        font-size: 0.875rem;
    }

    .stat-value {
        font-weight: bold;
        font-size: 1rem;
    }

    .ml-4 {
        margin-left: 1rem;
    }

    /* Probability Bar */
    .probability-bar-bg {
        width: 100%;
        height: 8px;
        background: #23272e;
        position: relative;
        overflow: hidden;
    }

    .probability-bar {
        height: 100%;
        background: linear-gradient(90deg, #bada55, #c7f774);
        transition: width 0.3s ease;
        box-shadow: 0 0 10px #bada55;
    }
</style>
