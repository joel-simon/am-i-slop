<script lang="ts">
    export let distribution: {
        totalSubmissions: number;
        histogram: {
            bins: number[];
            counts: number[];
            binSize: number;
        };
        stats: {
            min: number;
            max: number;
            mean: number;
            median: number;
        };
    } | null = null;

    export let questionId: number = 0;

    // State for clicked bucket submissions
    let selectedBucketIndex: number | null = null;
    let bucketSubmissions: { text: string; perplexity: number; created_at: string }[] = [];
    let loadingBucket = false;
    let bucketError: string | null = null;

    $: maxCount = distribution?.histogram.counts.length
        ? Math.max(...distribution.histogram.counts)
        : 1;

    // Handle bar click to load submissions for that bucket
    async function handleBarClick(bucketIndex: number) {
        if (!distribution) return;

        const count = distribution.histogram.counts[bucketIndex];
        if (count === 0) return;

        // Toggle off if already selected
        if (selectedBucketIndex === bucketIndex) {
            selectedBucketIndex = null;
            bucketSubmissions = [];
            return;
        }

        const binStart = distribution.histogram.bins[bucketIndex];
        const binEnd = binStart + distribution.histogram.binSize;

        selectedBucketIndex = bucketIndex;
        loadingBucket = true;
        bucketError = null;
        bucketSubmissions = [];

        try {
            const response = await fetch(
                `/api/submissions/${questionId}/range?min=${binStart}&max=${binEnd}`
            );
            if (!response.ok) {
                throw new Error('Failed to load bucket submissions');
            }
            const submissions = await response.json();

            // Sort by created_at descending (latest first) and take 8
            bucketSubmissions = submissions
                .sort(
                    (a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                .slice(0, 8)
                .map((s: any) => ({
                    text: s.text,
                    perplexity: s.perplexity,
                    created_at: s.created_at,
                }));
        } catch (err) {
            bucketError = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error loading bucket submissions:', err);
        } finally {
            loadingBucket = false;
        }
    }

    // Get bucket range label
    function getBucketRange(index: number): string {
        if (!distribution) return '';
        const binStart = distribution.histogram.bins[index];
        const binEnd = binStart + distribution.histogram.binSize;
        return `${binStart.toFixed(0)}-${binEnd.toFixed(0)}`;
    }
</script>

<div class="distribution-preview">
    <h3 class="preview-title">Current Distribution</h3>
    {#if distribution && distribution.totalSubmissions > 0}
        <p class="submission-count">
            {distribution.totalSubmissions} submission{distribution.totalSubmissions === 1
                ? ''
                : 's'} for this question
        </p>

        <!-- Histogram -->
        <div class="histogram-container">
            <div class="histogram-bars">
                {#each distribution.histogram.counts as count, i}
                    {@const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0}
                    {@const minHeight = count > 0 ? Math.max(heightPercent, 8) : 0}
                    {@const binStart = distribution.histogram.bins[i]}
                    {@const binEnd = binStart + distribution.histogram.binSize}
                    <button
                        class="bar-wrapper"
                        class:selected={selectedBucketIndex === i}
                        class:clickable={count > 0}
                        on:click={() => handleBarClick(i)}
                        disabled={count === 0}
                        title="Range: {binStart.toFixed(1)}-{binEnd.toFixed(
                            1
                        )}\nCount: {count}{count > 0 ? '\nClick to view submissions' : ''}"
                    >
                        <div
                            class="bar"
                            style="height: {minHeight}%"
                            class:has-data={count > 0}
                        ></div>
                    </button>
                {/each}
            </div>
            <div class="histogram-labels">
                <span>{distribution.stats.min.toFixed(1)} </span>
                <!-- <span class="center-label">Perplexity Score</span> -->
                <span
                    class="center-label"
                    style="display: flex; align-items: center; justify-content: center; gap: 1.5rem;"
                >
                    <span style="display: flex; align-items: center; gap: 0.4em;">
                        <span style="font-size: 1.2em;">←</span>
                        <span>More Slop</span>
                    </span>
                    <span
                        style="opacity: 0.6; letter-spacing: 0.05em; font-size: 0.97em; margin: 0 0.6em;"
                        >|</span
                    >
                    <span style="display: flex; align-items: center; gap: 0.4em;">
                        <span>Less Slop</span>
                        <span style="font-size: 1.2em;">→</span>
                    </span>
                </span>
                <span> {distribution.stats.max.toFixed(1)} </span>
            </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
            <div>
                <span class="stat-label">Mean:</span>
                <span class="stat-value">{distribution.stats.mean.toFixed(2)}</span>
            </div>
            <div>
                <span class="stat-label">Median:</span>
                <span class="stat-value">{distribution.stats.median.toFixed(2)}</span>
            </div>
        </div>

        <!-- Bucket submissions panel -->
        {#if selectedBucketIndex !== null}
            <div class="bucket-submissions">
                <div class="bucket-header">
                    <h4 class="bucket-title text-base">
                        Latest Submissions ({getBucketRange(selectedBucketIndex)})
                    </h4>
                    <button
                        class="close-btn text-sm"
                        on:click={() => {
                            selectedBucketIndex = null;
                            bucketSubmissions = [];
                        }}
                    >
                        ✕
                    </button>
                </div>
                {#if loadingBucket}
                    <p class="status-text text-sm">Loading submissions...</p>
                {:else if bucketError}
                    <p class="error-text text-sm">{bucketError}</p>
                {:else if bucketSubmissions.length === 0}
                    <p class="status-text text-sm">No submissions in this range.</p>
                {:else}
                    <div class="submissions-list">
                        {#each bucketSubmissions as submission}
                            <div class="submission-card">
                                <div class="submission-header">
                                    <span class="submission-score text-sm"
                                        >{submission.perplexity.toFixed(2)}</span
                                    >
                                </div>
                                <p class="submission-text text-md">{submission.text}</p>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    {:else}
        <p class="no-data">Be the first to submit for this question!</p>
    {/if}
</div>

<style>
    .distribution-preview {
        background: #181c1f;
        border: 2px solid #2d332b;
        border-radius: 0;
        padding: 1rem;
        margin: 1.5rem 0;
    }

    .preview-title {
        color: #bada55;
        text-shadow:
            0 0 2px #bada55,
            0 0 4px #222;
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }

    .submission-count {
        color: #8a8a8a;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    .histogram-container {
        margin-bottom: 1rem;
    }

    .histogram-bars {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 128px;
        margin-bottom: 0.5rem;
        border-bottom: 1px solid #2d332b;
        padding-bottom: 2px;
    }

    .bar-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: stretch;
        height: 100%;
        background: transparent;
        border: none;
        padding: 0;
        cursor: default;
    }

    .bar-wrapper.clickable {
        cursor: pointer;
    }

    .bar-wrapper.clickable:hover .bar.has-data {
        background: #c7f774;
        transform: scaleY(1.05);
        box-shadow: 0 0 8px #c7f774;
    }

    .bar-wrapper.selected .bar.has-data {
        box-shadow:
            0 0 12px #bada55,
            0 0 4px #fff;
    }

    .bar {
        width: 100%;
        background: transparent;
        transition: all 0.2s ease;
        min-height: 2px;
    }

    .bar.has-data {
        background: #bada55;
        box-shadow: 0 0 4px #bada55;
    }

    .histogram-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #8a8a8a;
        margin-top: 0.25rem;
    }

    .center-label {
        text-align: center;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        font-size: 0.875rem;
        border-top: 1px solid #2d332b;
        padding-top: 0.75rem;
    }

    .stat-label {
        color: #8a8a8a;
    }

    .stat-value {
        color: #bada55;
        font-weight: 600;
        margin-left: 0.25rem;
    }

    .no-data {
        color: #8a8a8a;
        font-size: 0.875rem;
    }

    /* Bucket submissions panel */
    .bucket-submissions {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #2d332b;
    }

    .bucket-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .bucket-title {
        color: #bada55;
        font-weight: 600;
    }

    .close-btn {
        background: transparent !important;
        border: 1px solid #3d4451 !important;
        color: #8a8a8a !important;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .close-btn:hover {
        border-color: #bada55 !important;
        color: #bada55 !important;
        background: transparent !important;
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
        border-left: 3px solid #3d4451;
        padding: 0.75rem 1rem;
        transition: all 0.2s ease;
    }

    /* .submission-card:hover {
        border-color: #3d4451;
        border-left-color: #bada55;
        transform: translateX(4px);
    } */

    .submission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .submission-score {
        font-weight: 700;
        color: #bada55;
        font-family: 'Terminal Grotesque', 'Fira Mono', monospace;
    }

    .submission-text {
        color: #c7f774;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
    }
</style>
