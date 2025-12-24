<script lang="ts">
    import type { AnalysisResultItem } from '$lib/SlopClassifier';

    export let tokens: string[] = []; // Default to empty array, will be updated reactively
    export let results: AnalysisResultItem[] = []; // Default to empty array
    export let getProbabilityColor: (logProb: number) => string;
    export let getProbabilitySize: (logProb: number) => string;

    const formatDisplayText = (tok: string) => tok.replace(/Ġ/g, ' ');
</script>

<!-- Scaled & Colored Text Visualization -->
<div class="mt-8 pt-6 border-t border-gray-200">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">By Token Predictability</h3>

    {#if results.length === 0 && tokens.length === 0}
        <p class="text-sm text-gray-500 px-1">No tokens to display.</p>
    {:else}
        <div
            class="p-4 border rounded-md bg-gray-50 min-h-[5em]"
            style="white-space: pre-wrap; line-height: 2.5;"
        >
            <!-- Display the first token with a neutral style if tokens array is used -->
            {#if tokens.length > 0}
                <span
                    style="font-size: 1em; color: #333; vertical-align: baseline; display: inline;"
                    title={tokens[0]}
                >
                    {formatDisplayText(tokens[0])}
                </span>
            {/if}
            <!-- Display all tokens with dynamic styles from results array -->
            {#each results as resultItem, i (resultItem.tokenId + '-' + i + '-result')}
                {@const logProb = resultItem.logProbability}
                {@const tokenText = resultItem.token}
                {@const color = getProbabilityColor(logProb)}
                {@const fontSize = getProbabilitySize(logProb)}
                <span
                    style="color: {color}; font-size: {fontSize}; transition: font-size 0.2s ease, color 0.2s ease; display: inline; vertical-align: baseline;"
                    title={`Token: "${formatDisplayText(tokenText)}"\nLogProb: ${
                        isFinite(logProb) ? logProb.toFixed(3) : 'N/A'
                    }`}
                >
                    {formatDisplayText(tokenText)}
                </span>
            {/each}
        </div>

        {#if tokens && tokens.length === 1 && results.length === 0}
            <p class="text-sm text-gray-500 mt-2 italic px-1">
                (Only one token. Predictability scaling starts from the second token.)
            </p>
        {/if}
    {/if}
</div>
