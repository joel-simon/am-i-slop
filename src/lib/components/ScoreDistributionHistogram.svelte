<script lang="ts">
    import { onMount, afterUpdate } from 'svelte';
    import { getSlopMessage } from '$lib/utils/slopMessages';

    // --- Props ---
    export let userScore: number | null = null;
    export let questionId: number = 0; // Add questionId prop
    export let showVerdict: boolean = true; // Whether to show the slop verdict section

    // --- Reactive State ---
    let histogramData: {
        bucket: string;
        count: number;
        userInBucket: boolean;
        min: number;
        max: number;
    }[] = [];
    let percentile: number | null = null;
    let slopPercentile: number | null = null; // Inverted: how slop you are
    let chartRendered = false; // To help with re-rendering on data change
    let internalAllScores: number[] = []; // Explicit internal state for scores
    let loading = false;
    let error: string | null = null;

    // --- State for clicked bucket submissions ---
    let selectedBucketIndex: number | null = null;
    let bucketSubmissions: { text: string; perplexity: number; created_at: string }[] = [];
    let loadingBucket = false;
    let bucketError: string | null = null;

    // --- Constants for Histogram ---
    const NUM_BUCKETS = 10;
    const MIN_SCORE = 0; // Assuming perplexity scores are non-negative
    const MAX_SCORE = 200; // Adjust based on expected score range, make it dynamic later

    $: slopMessage = slopPercentile !== null ? getSlopMessage(slopPercentile) : null;

    // Load scores from the database
    async function loadScores() {
        loading = true;
        error = null;
        try {
            const response = await fetch(`/api/submissions/${questionId}`);
            if (!response.ok) {
                throw new Error('Failed to load submissions');
            }
            const submissions = await response.json();
            internalAllScores = submissions.map((s: any) => s.perplexity);

            console.log('internalAllScores', internalAllScores);

            // Calculate histogram and percentile if we have a user score
            if (userScore !== null && isFinite(userScore)) {
                calculateHistogramAndPercentile();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'An error occurred';
            console.error('Error loading scores:', err);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadScores();
    });

    // Recalculate when userScore changes
    afterUpdate(() => {
        if (userScore !== null && isFinite(userScore) && internalAllScores.length > 0) {
            calculateHistogramAndPercentile();
        }
    });

    function calculateHistogramAndPercentile() {
        if (userScore === null || !isFinite(userScore) || internalAllScores.length === 0) {
            histogramData = [];
            percentile = null;
            slopPercentile = null;
            chartRendered = false; // Ensure "Calculating..." or similar is shown if we bail early
            return;
        }

        const validScores = internalAllScores.filter((score) => isFinite(score));
        if (validScores.length === 0) {
            histogramData = [];
            percentile = null;
            slopPercentile = null;
            chartRendered = false; // Ensure "Calculating..." or similar is shown
            return;
        }

        console.log('validScores', validScores);

        const minVal = MIN_SCORE;
        const maxVal = Math.max(MAX_SCORE, ...validScores, userScore); // Ensure user score is within range for bucketing
        const bucketSize = (maxVal - minVal) / NUM_BUCKETS;

        const buckets: {
            min: number;
            max: number;
            count: number;
            userInBucket: boolean;
        }[] = [];

        for (let i = 0; i < NUM_BUCKETS; i++) {
            buckets.push({
                min: minVal + i * bucketSize,
                max: minVal + (i + 1) * bucketSize,
                count: 0,
                userInBucket: false,
            });
        }
        // Add a small epsilon to max of last bucket to include maxVal
        if (buckets.length > 0) {
            // Ensure buckets array is not empty
            buckets[NUM_BUCKETS - 1].max += 0.00001;
        }

        validScores.forEach((score) => {
            for (const bucket of buckets) {
                if (score >= bucket.min && score < bucket.max) {
                    bucket.count++;
                    // User in bucket based on userScore is handled later
                    break;
                }
            }
        });

        // Determine which bucket the user's score falls into
        let userBucketIndex = -1;
        if (buckets.length > 0) {
            // Ensure buckets array is not empty before indexing
            for (let i = 0; i < buckets.length; i++) {
                if (userScore >= buckets[i].min && userScore < buckets[i].max) {
                    buckets[i].userInBucket = true;
                    userBucketIndex = i;
                    break;
                }
            }
            // Handle case where userScore might be exactly maxVal
            if (userScore === maxVal && userBucketIndex === -1) {
                buckets[NUM_BUCKETS - 1].userInBucket = true;
                // userBucketIndex = NUM_BUCKETS - 1; // Not strictly needed here
            }
        }

        console.log('buckets', buckets);

        histogramData = buckets.map((b) => ({
            bucket: `${b.min.toFixed(0)}-${b.max.toFixed(0)}`,
            count: b.count,
            userInBucket: b.userInBucket,
            min: b.min,
            max: b.max,
        }));

        // Calculate percentile (how many scores are LOWER than yours)
        const scoresLessThanUser = validScores.filter((s) => s < userScore).length;
        if (validScores.length > 0) {
            percentile = (scoresLessThanUser / validScores.length) * 100;
            // Invert for slopiness: lower perplexity = more slop = higher slop percentile
            // If 73% have lower scores, you're LESS slop than 73%, so slopiness = 27%
            slopPercentile = 100 - percentile;
        } else {
            percentile = null;
            slopPercentile = null;
        }

        chartRendered = true;
    }

    const maxCount = () => {
        if (!histogramData || histogramData.length === 0) return 1; // Avoid division by zero if no data
        return Math.max(...histogramData.map((b) => b.count), 1); // Ensure at least 1 to prevent 0 height bars
    };

    // Handle bar click to load submissions for that bucket
    async function handleBarClick(bucketIndex: number) {
        const bucket = histogramData[bucketIndex];
        if (!bucket || bucket.count === 0) return;

        // Toggle off if already selected
        if (selectedBucketIndex === bucketIndex) {
            selectedBucketIndex = null;
            bucketSubmissions = [];
            return;
        }

        selectedBucketIndex = bucketIndex;
        loadingBucket = true;
        bucketError = null;
        bucketSubmissions = [];

        try {
            const response = await fetch(
                `/api/submissions/${questionId}/range?min=${bucket.min}&max=${bucket.max}`
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

    $: console.log('histogramData', histogramData);
</script>

<div class="score-distribution-histogram">
    <h3 class="section-title text-lg">Your Score in the Distribution</h3>
    {#if loading}
        <p class="status-text text-sm">Loading distribution data...</p>
    {:else if error}
        <p class="error-text text-sm">{error}</p>
    {:else if userScore === null || !isFinite(userScore)}
        <p class="status-text text-sm">No score available or score is invalid.</p>
    {:else if !chartRendered && histogramData.length === 0}
        <p class="status-text text-sm">Calculating distribution...</p>
    {:else if histogramData.length > 0}
        <div class="histogram">
            {#each histogramData as bucket, i}
                <button
                    class="bar-container"
                    class:selected={selectedBucketIndex === i}
                    class:clickable={bucket.count > 0}
                    on:click={() => handleBarClick(i)}
                    disabled={bucket.count === 0}
                    title={`Range: ${bucket.bucket}\nCount: ${bucket.count}${bucket.userInBucket ? '\n(Your score is in this range)' : ''}\n${bucket.count > 0 ? 'Click to view submissions' : ''}`}
                >
                    <div
                        class="bar"
                        class:user-bucket={bucket.userInBucket}
                        class:has-data={bucket.count > 0}
                        style="height: {(bucket.count / maxCount()) * 156}px"
                    ></div>
                </button>
            {/each}
        </div>
        <div class="histogram-labels">
            <span>{histogramData[0]?.min.toFixed(0) ?? '0'}</span>
            <span class="center-label">
                <span class="slop-direction">
                    <span class="arrow">←</span>
                    <span>More Slop</span>
                </span>
                <span class="divider">|</span>
                <span class="slop-direction">
                    <span>Less Slop</span>
                    <span class="arrow">→</span>
                </span>
            </span>
            <span>{histogramData[histogramData.length - 1]?.max.toFixed(0) ?? '200'}</span>
        </div>

        {#if slopPercentile !== null && slopMessage && isFinite(userScore) && showVerdict}
            <!-- Fun slop verdict -->
            <div class="slop-verdict">
                <div class="verdict-emoji">{slopMessage.emoji}</div>
                <div class="verdict-content">
                    <div class="verdict-title">{slopMessage.title}</div>
                    <div class="verdict-subtitle text-sm">{slopMessage.subtitle}</div>
                </div>
            </div>

            <div class="percentile-stats">
                <p class="percentile-text text-sm">
                    Perplexity: <strong>{userScore.toFixed(2)}</strong> — You are more slop than
                    <strong>{slopPercentile.toFixed(0)}%</strong> of submissions.
                </p>
            </div>
        {/if}

        <!-- Bucket submissions panel -->
        {#if selectedBucketIndex !== null}
            <div class="bucket-submissions">
                <div class="bucket-header">
                    <h4 class="bucket-title text-base">
                        Latest Submissions ({histogramData[selectedBucketIndex].bucket})
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
                        {#each bucketSubmissions as submission, idx}
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
        <p class="status-text text-sm">Could not generate histogram for the current scores.</p>
    {/if}
</div>

<style>
    .score-distribution-histogram {
        background: #181c1f;
        border: 2px solid #2d332b;
        border-radius: 0;
        padding: 1rem;
        margin: 1.5rem 0;
        overflow: hidden;
    }

    .section-title {
        color: #bada55;
        /* text-shadow:
            0 0 2px #bada55,
            0 0 4px #222; */
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .status-text {
        color: #8a8a8a;
    }

    .error-text {
        color: #ff6b6b;
    }

    .histogram {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: 160px;
        border-bottom: 1px solid #2d332b;
        padding-bottom: 2px;
        margin-bottom: 0.5rem;
    }

    .bar-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        background: transparent;
        border: none;
        padding: 0;
        cursor: default;
        transition: all 0.2s ease;
    }

    .bar-container.clickable {
        cursor: pointer;
    }

    .bar-container.clickable:hover .bar.has-data {
        filter: brightness(1.3);
        transform: scaleY(1.05);
    }

    .bar-container.selected .bar.has-data {
        box-shadow:
            0 0 12px #bada55,
            0 0 4px #fff;
    }

    .bar {
        width: 100%;
        background: transparent;
        transition: all 0.2s ease;
        min-height: 2px;
        border-radius: 0;
    }

    .bar.has-data {
        background: #3d4451;
    }

    .bar.user-bucket {
        background: #bada55 !important;
        box-shadow: 0 0 4px #bada55;
    }

    .histogram-labels {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.75rem;
        color: #8a8a8a;
        margin-bottom: 1rem;
    }

    .center-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        font-size: 0.875rem;
        color: #8a8a8a;
    }

    .slop-direction {
        display: flex;
        align-items: center;
        gap: 0.4em;
    }

    .slop-direction .arrow {
        font-size: 1.2em;
    }

    .center-label .divider {
        opacity: 0.6;
        letter-spacing: 0.05em;
        font-size: 0.97em;
    }

    @media (max-width: 480px) {
        .center-label {
            font-size: 0.7rem;
            gap: 0.5rem;
        }
    }

    /* Slop verdict section */
    .slop-verdict {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #1e2420;
        border: 1px solid #2d332b;
        margin-bottom: 1rem;
    }

    .verdict-emoji {
        font-size: 2.5rem;
        line-height: 1;
    }

    .verdict-content {
        flex: 1;
    }

    .verdict-title {
        color: #bada55;
        font-weight: 700;
        font-size: 1.125rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-shadow: 0 0 4px rgba(186, 218, 85, 0.4);
    }

    .verdict-subtitle {
        color: #8a8a8a;
        margin-top: 0.25rem;
        font-style: italic;
    }

    .percentile-stats {
        padding-bottom: 0.5rem;
    }

    .percentile-text {
        color: #8a8a8a;
    }

    .percentile-text strong {
        color: #bada55;
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
