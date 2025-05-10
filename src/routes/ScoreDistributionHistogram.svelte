<script lang="ts">
  import { onMount, afterUpdate } from "svelte";

  // --- Props ---
  export let userScore: number | null = null;
  // Removed allScores prop, will be managed internally

  // --- Reactive State ---
  let histogramData: {
    bucket: string;
    count: number;
    userInBucket: boolean;
  }[] = [];
  let percentile: number | null = null;
  let chartRendered = false; // To help with re-rendering on data change
  let internalAllScores: number[] = []; // Explicit internal state for scores

  // --- Constants for Histogram ---
  const NUM_BUCKETS = 10;
  const MIN_SCORE = 0; // Assuming perplexity scores are non-negative
  const MAX_SCORE = 200; // Adjust based on expected score range, make it dynamic later

  // --- Fake Data Generation (for now) ---
  function generateFakeScores(count = 200): number[] {
    const scores = [];
    // Skew towards lower perplexity scores, but with a tail
    for (let i = 0; i < count; i++) {
      let score = Math.abs(Math.random() * Math.random()) * MAX_SCORE;
      // Add some higher scores occasionally
      if (Math.random() < 0.2) {
        score = MIN_SCORE + Math.random() * (MAX_SCORE - MIN_SCORE);
      }
      scores.push(
        Math.max(MIN_SCORE, Math.min(MAX_SCORE, parseFloat(score.toFixed(2))))
      );
    }
    return scores;
  }

  onMount(() => {
    internalAllScores = generateFakeScores(); // Always generate on mount
    // Initial calculation if userScore is already available
    if (userScore !== null && isFinite(userScore)) {
      calculateHistogramAndPercentile();
    }
  });

  // Recalculate when userScore or allScores change
  afterUpdate(() => {
    // This simple check might need to be more robust depending on how props are updated
    // Ensure internalAllScores is populated, though onMount should handle typical cases
    if (internalAllScores.length === 0) {
      internalAllScores = generateFakeScores();
    }
    if (userScore !== null && isFinite(userScore)) {
      calculateHistogramAndPercentile();
    }
  });

  function calculateHistogramAndPercentile() {
    if (
      userScore === null ||
      !isFinite(userScore) ||
      internalAllScores.length === 0
    ) {
      histogramData = [];
      percentile = null;
      chartRendered = false; // Ensure "Calculating..." or similar is shown if we bail early
      return;
    }

    const validScores = internalAllScores.filter((score) => isFinite(score));
    if (validScores.length === 0) {
      histogramData = [];
      percentile = null;
      chartRendered = false; // Ensure "Calculating..." or similar is shown
      return;
    }

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

    histogramData = buckets.map((b) => ({
      bucket: `${b.min.toFixed(0)}-${b.max.toFixed(0)}`,
      count: b.count,
      userInBucket: b.userInBucket,
    }));

    // Calculate percentile
    const scoresLessThanUser = validScores.filter((s) => s < userScore).length;
    if (validScores.length > 0) {
      percentile = (scoresLessThanUser / validScores.length) * 100;
    } else {
      percentile = null; // Avoid division by zero if validScores somehow became empty
    }

    chartRendered = true;
  }

  const maxCount = () => {
    if (!histogramData || histogramData.length === 0) return 1; // Avoid division by zero if no data
    return Math.max(...histogramData.map((b) => b.count), 1); // Ensure at least 1 to prevent 0 height bars
  };
</script>

<div
  class="score-distribution-histogram p-4 border rounded-lg shadow my-6 bg-gray-50"
>
  <h3 class="text-lg font-semibold text-gray-700 mb-3 text-center">
    Your Score in the Distribution
  </h3>
  {#if userScore === null || !isFinite(userScore)}
    <p class="text-center text-gray-500">
      No score available or score is invalid.
    </p>
  {:else if !chartRendered && histogramData.length === 0}
    <p class="text-center text-gray-500">Calculating distribution...</p>
  {:else if histogramData.length > 0}
    <div
      class="histogram flex items-end justify-around h-48 gap-1 p-2 border-b border-gray-300"
    >
      {#each histogramData as bucket}
        <div
          class="bar-container flex flex-col items-center justify-end flex-1"
        >
          <div
            class="bar w-full rounded-t transition-all duration-300 ease-in-out"
            style="height: {(bucket.count / maxCount()) *
              100}%; background-color: {bucket.userInBucket
              ? '#3B82F6'
              : '#D1D5DB'};"
            title={`Range: ${bucket.bucket}
Count: ${bucket.count}${
              bucket.userInBucket ? "\n(Your score is in this range)" : ""
            }`}
          ></div>
          <div class="text-xs text-gray-600 mt-1 text-center">
            {bucket.bucket}
          </div>
        </div>
      {/each}
    </div>
    {#if percentile !== null && isFinite(userScore)}
      <p class="text-center mt-4 text-gray-700">
        Your score of <strong class="text-blue-600"
          >{userScore.toFixed(2)}</strong
        >
        is in the
        <strong class="text-blue-600"
          >{percentile.toFixed(0)}th percentile</strong
        >.
      </p>
      <p class="text-xs text-gray-500 text-center mt-1">
        (This means your score is higher than approximately {percentile.toFixed(
          0
        )}% of other scores in this sample distribution.)
      </p>
    {/if}
  {:else}
    <p class="text-center text-gray-500">
      Could not generate histogram for the current scores.
    </p>
  {/if}
</div>

<style>
  .bar:hover {
    opacity: 0.8;
  }
  /* Additional styles can be added here if needed */
</style>
