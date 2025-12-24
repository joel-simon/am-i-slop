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

    $: maxCount = distribution?.histogram.counts.length
        ? Math.max(...distribution.histogram.counts)
        : 1;
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
                    <div class="bar-wrapper">
                        <div
                            class="bar"
                            style="height: {minHeight}%"
                            class:has-data={count > 0}
                            title="Range: {binStart.toFixed(1)}-{binEnd.toFixed(1)}\nCount: {count}"
                        ></div>
                    </div>
                {/each}
            </div>
            <div class="histogram-labels">
                <span>{distribution.stats.min.toFixed(1)}</span>
                <span class="center-label">Perplexity Score</span>
                <span>{distribution.stats.max.toFixed(1)}</span>
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

    .bar.has-data:hover {
        background: #c7f774;
        transform: scaleY(1.05);
        box-shadow: 0 0 8px #c7f774;
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
</style>
