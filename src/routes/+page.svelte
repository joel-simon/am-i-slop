<script lang="ts">
    import { onMount } from 'svelte';
    import { SlopAnalyzer, type AnalysisResults, type AnalysisResultItem } from './SlopClassifier';
    import TokenTableAnalysis from './TokenTableAnalysis.svelte';
    import ScaledTextView from './ScaledTextView.svelte';
    import ScoreDistributionHistogram from './ScoreDistributionHistogram.svelte';
    import NeighboringSubmissions from './NeighboringSubmissions.svelte';
    import { Button, Modal } from 'flowbite-svelte';
    import { IconSolid } from 'flowbite-svelte-icons';
    import * as Icons from 'flowbite-svelte-icons';
    import { questions } from '$lib/questions';
    import { validateText, getValidationError } from '$lib/utils/textFilter';

    // --- Component State ---
    let inputText = '';
    let selectedModel = 'gpt2'; // Not used anymore - always using RunPod with gpt2
    let loading = false;
    let progress = 0;
    let statusText = 'Ready to analyze text.';
    let analysisResults: AnalysisResults | null = null;
    let errorMessage: string | null = null;
    let infoModal = false;

    let currentQuestionIndex = 0;

    // Character count limits
    const MIN_CHARS = 16;
    const MAX_CHARS = 256;

    // Reactive character count
    $: charCount = inputText.length;
    $: charsRemaining = MAX_CHARS - charCount;
    $: isUnderMin = charCount < MIN_CHARS;
    $: isOverMax = charCount > MAX_CHARS;
    $: charCountColor = isOverMax
        ? 'text-red-500'
        : isUnderMin
          ? 'text-yellow-500'
          : 'text-green-500';

    // Function to change question
    function changeQuestion(direction: 'prev' | 'next') {
        if (direction === 'prev' && currentQuestionIndex > 0) {
            currentQuestionIndex--;
        } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
        }
        // Clear input when changing questions
        inputText = '';
        // Clear any previous analysis
        analysisResults = null;
        progressiveTokensArray = [];
        progressiveResultsArray = [];
    }

    // For progressive updates to ScaledTextView
    let progressiveTokensArray: string[] = [];
    let progressiveResultsArray: AnalysisResultItem[] = [];

    // Reference to the analyzer
    let slopAnalyzer: SlopAnalyzer;

    // Update loading bar & status
    function updateProgressExternal(p: number, text: string) {
        progress = p;
        statusText = text;
    }

    function setErrorMessageExternal(message: string | null) {
        errorMessage = message;
    }

    // Callback for progressively processed tokens/results
    function onTokenProcessedExternal(item: AnalysisResultItem | string) {
        if (typeof item === 'string') {
            // This is the first token
            progressiveTokensArray = [item];
            progressiveResultsArray = []; // Reset results when a new first token comes in
        } else {
            // This is an AnalysisResultItem for subsequent tokens
            // Ensure the first token is in progressiveTokensArray if not already set
            if (
                progressiveTokensArray.length === 0 &&
                analysisResults &&
                analysisResults.tokens.length > 0
            ) {
                progressiveTokensArray = [analysisResults.tokens[0]];
            }
            progressiveResultsArray = [...progressiveResultsArray, item];
        }
    }

    onMount(() => {
        // Note: SlopAnalyzer is no longer used - we use RunPod API instead
        // Keeping the code around for reference
        // slopAnalyzer = new SlopAnalyzer(
        //     updateProgressExternal,
        //     setErrorMessageExternal,
        //     onTokenProcessedExternal
        // );
    });

    // Pick a color based on how "expected" a log-probability is
    function getProbabilityColor(logProb: number): string {
        if (!isFinite(logProb)) return 'rgb(150,150,150)';
        const norm = Math.max(0, Math.min(1, (logProb + 15) / 15));
        if (norm < 0.5) {
            const t = norm * 2;
            return `rgb(255,${Math.floor(107 + t * (230 - 107))},${Math.floor(
                107 + t * (109 - 107)
            )})`;
        } else {
            const t = (norm - 0.5) * 2;
            return `rgb(${Math.floor(255 - t * (255 - 78))},${Math.floor(
                230 - t * (230 - 205)
            )},${Math.floor(109 + t * (196 - 109))})`;
        }
    }

    // When the user clicks "Analyze"
    async function analyzeText() {
        if (!inputText.trim()) {
            errorMessage = 'Please enter some text.';
            return;
        }

        // Validate and sanitize text on client side
        const validation = await validateText(inputText.trim(), MIN_CHARS, MAX_CHARS);

        if (!validation.isValid) {
            errorMessage = getValidationError(validation) || 'Invalid input';
            return;
        }

        loading = true;
        analysisResults = null;
        progressiveTokensArray = []; // Clear previous progressive results
        progressiveResultsArray = []; // Clear previous progressive results
        errorMessage = null;
        updateProgressExternal(0, 'Loading...');

        try {
            // Use sanitized text (already lowercase from validation)
            const sanitizedText = validation.sanitized.toLowerCase();

            // Call the new analyze endpoint
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: sanitizedText,
                    questionId: questions[currentQuestionIndex].id,
                }),
            });

            updateProgressExternal(0.3, 'Calculating perplexity on GPU...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze text');
            }

            const data = await response.json();

            updateProgressExternal(0.6, 'Processing results...');

            // Convert RunPod response to the format expected by the UI
            // First token is shown without styling, rest are in results with styling
            const allTokens = data.by_token.map((t: any) => t.token);
            const tokens = [allTokens[0]]; // First token goes in tokens array
            const results = allTokens.slice(1).map((token: string, index: number) => {
                const tokenData = data.by_token[index + 1]; // +1 because we skipped first
                return {
                    token: token,
                    tokenId: index + 1,
                    logProbability: Math.log(tokenData.probability),
                    probability: tokenData.probability,
                };
            });

            analysisResults = {
                tokens: allTokens, // Store all tokens for reference
                results,
                averageLogProb: Math.log(1 / data.perplexity), // Approximate from perplexity
                perplexity: data.perplexity,
            };

            // Animate the progressive display (fake animation since we have all data)
            animateProgressiveDisplay(tokens, results);

            updateProgressExternal(1, 'Analysis complete!');
            statusText = `Analysis complete! Rank: ${data.placement.rank}/${data.placement.total} (${data.placement.percentile.toFixed(1)}th percentile)`;
        } catch (err: any) {
            console.error('Error during analysis:', err);
            errorMessage = err.message || 'An unexpected error occurred.';
            statusText = 'Analysis failed.';
        } finally {
            loading = false;
        }
    }

    // Animate the progressive display of tokens
    function animateProgressiveDisplay(tokens: string[], results: any[]) {
        progressiveTokensArray = [tokens[0]]; // Start with first token
        progressiveResultsArray = [];

        // Animate subsequent tokens
        let currentIndex = 0;
        const intervalMs = Math.min(100, 3000 / results.length); // Faster for long texts

        const interval = setInterval(() => {
            if (currentIndex < results.length) {
                progressiveResultsArray = [...progressiveResultsArray, results[currentIndex]];
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, intervalMs);
    }

    // Make spaces visible
    const formatToken = (tok: string) => tok.replace(/ /g, '␣');

    function getProbabilitySize(logProb: number): string {
        const minSizeEm = 0.7; // For very predictable tokens
        const maxSizeEm = 2.2; // For very unpredictable tokens

        if (!isFinite(logProb)) {
            // Typically -Infinity for highly unexpected tokens
            return `${maxSizeEm.toFixed(2)}em`;
        }

        // Normalize logProb: (logProb + 15) / 15.
        // norm = 0 (e.g., logProb <= -15) is "unexpected"
        // norm = 1 (e.g., logProb >= 0) is "very expected"
        const norm = Math.max(0, Math.min(1, (logProb + 15) / 15));

        // Inverse relationship: lower norm (more unexpected) -> larger size
        // If norm = 0 (unexpected), size = maxSizeEm.
        // If norm = 1 (expected), size = minSizeEm.
        const size = maxSizeEm - norm * (maxSizeEm - minSizeEm);
        return `${size.toFixed(2)}em`;
    }
</script>

<svelte:head>
    <title>Are you Slop?</title>
    <!-- TensorFlow.js and Transformers.js are loaded via imports -->
</svelte:head>

<div class="max-w-3xl mx-auto p-4 md:p-8 my-2 font-terminal">
    <h1 class="text-6xl md:text-8xl !font-terminal-open text-center text-gray-800 mb-3 md:mb-6">
        Are you Slop?
    </h1>

    <Modal title="???" bind:open={infoModal} autoclose>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            The year is 2030, language models guide all communications and decisions. The ultimate
            status symbol becomes living a <i>high-entropy</i> lifestyle.
        </p>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            This tool analyzes how "average" or predictable your text is using a language model. It
            works by comparing your writing to what a language model would expect to see next.
        </p>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400 mt-4">
            The analysis shows:
        </p>
        <ul class="list-disc pl-5 mt-2 text-base leading-relaxed text-gray-500 dark:text-gray-400">
            <li>Perplexity score: Lower means more predictable/average text</li>
            <li>
                Token-by-token analysis: Shows which parts of your text are more or less expected
            </li>
            <li>Comparison with other submissions: See how your writing compares to others</li>
        </ul>
        <div
            class="flex items-center gap-2 mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400"
        >
            <span>
                Weekend project by <a href="https://www.joelsimon.net" class="underline">Joel</a>
            </span>
            <a
                href="https://github.com/joel-simon/am-i-slop"
                target="_blank"
                rel="noopener"
                class="ml-1"
            >
                <IconSolid name="GithubSolid" size="md" icon={Icons.GithubSolid} />
            </a>
        </div>
        <!-- <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400 mt-4">
            Try different writing styles and see how they affect your score!
        </p> -->
    </Modal>

    <!-- Input Section -->
    <div class="mb-6 space-y-4">
        <div>
            <label for="inputText" class="block text-xl md:text-2xl font-medium text-gray-700 mb-2"
                >{questions[currentQuestionIndex].text}</label
            >

            <!-- Question Navigation (Below on mobile, inline on desktop) -->
            <div class="flex gap-2 mb-3">
                <button
                    on:click={() => changeQuestion('prev')}
                    disabled={currentQuestionIndex === 0}
                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ← Previous
                </button>
                <button
                    on:click={() => changeQuestion('next')}
                    disabled={currentQuestionIndex === questions.length - 1}
                    class="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next →
                </button>
            </div>
            <textarea
                id="inputText"
                bind:value={inputText}
                placeholder="Enter your answer..."
                class="w-full h-40 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y text-base"
                disabled={loading}
                maxlength={MAX_CHARS + 50}
                autofocus
            ></textarea>

            <!-- Character Counter -->
            <div class="flex justify-between items-center mt-2 text-sm">
                <div class={charCountColor}>
                    {#if isOverMax}
                        ⚠️ Too long! {charCount}/{MAX_CHARS} characters
                    {:else if isUnderMin && charCount > 0}
                        ⚠️ Too short. Need {MIN_CHARS - charCount} more characters (min {MIN_CHARS})
                    {:else if charCount === 0}
                        <span class="text-gray-500">Minimum {MIN_CHARS} characters required</span>
                    {:else}
                        ✓ {charCount}/{MAX_CHARS} characters
                    {/if}
                </div>
                <div class="text-gray-500">
                    {charsRemaining} remaining
                </div>
            </div>
        </div>

        <div class="flex justify-end">
            <button
                on:click={analyzeText}
                disabled={loading || !inputText.trim()}
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if loading}
                    <svg
                        class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    Analyzing...
                {:else}
                    Analyze Text
                {/if}
            </button>
        </div>
    </div>

    <!-- Loading/Status Indicator -->
    {#if loading || statusText !== 'Ready to analyze text.'}
        <div class="my-6 text-center">
            {#if loading}
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div
                        class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style="width: {progress * 100}%"
                    ></div>
                </div>
            {/if}
            <p class="text-sm text-gray-600">{statusText}</p>
        </div>
    {/if}

    <!-- Error Message -->
    {#if errorMessage}
        <div class="my-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
            <p><strong class="font-bold">Error:</strong> {errorMessage}</p>
        </div>
    {/if}

    <!-- Results Section -->
    {#if analysisResults && !loading}
        <!-- Summary -->
        <div class="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200 mt-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h3>
            <p class="text-gray-700">
                Overall Perplexity Score:
                <strong class="text-blue-700">
                    {isFinite(analysisResults.perplexity)
                        ? analysisResults.perplexity.toFixed(2)
                        : 'Infinity'}
                </strong>
            </p>
            <p class="text-sm text-gray-600 mt-1">
                (Lower perplexity indicates more predictable/average text based on the model.)
            </p>
        </div>

        <!-- <TokenTableAnalysis
      results={analysisResults.results} 
      tokens={analysisResults.tokens}
      {formatToken} 
      {getProbabilityColor} 
    /> -->
        <ScaledTextView
            tokens={progressiveTokensArray}
            results={progressiveResultsArray}
            {getProbabilityColor}
            {getProbabilitySize}
        />
        {#if analysisResults && isFinite(analysisResults.perplexity)}
            <ScoreDistributionHistogram
                userScore={analysisResults.perplexity}
                questionId={questions[currentQuestionIndex].id}
            />
            <NeighboringSubmissions
                userScore={analysisResults.perplexity}
                questionId={questions[currentQuestionIndex].id}
                n={2}
            />
        {/if}
    {/if}
</div>

<!-- Fixed Info Button (Bottom Left) -->
<button
    on:click={() => (infoModal = true)}
    class="info-button-fixed !rounded-full"
    title="Information"
>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
        />
    </svg>
</button>

<style>
    /* Terminal UI overrides */
    .max-w-3xl {
        background: #181c1f;
        border: 2px solid #22272b;
        border-radius: 0 !important;
        box-shadow: 0 0 0 2px #101214;
        padding-top: 0 !important;
        position: relative;
    }

    /* Terminal header bar */
    .max-w-3xl::before {
        content: '';
        display: block;
        width: 100%;
        height: 2.2em;
        background: linear-gradient(90deg, #23272e 80%, #2d332b 100%);
        border-bottom: 2px solid #22272b;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
    }

    h1 {
        color: #c7f774;
        text-shadow:
            0 0 2px #bada55,
            0 0 8px #222;
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-family: 'Terminal Grotesque Open', 'Fira Mono', 'Consolas', monospace;
    }

    label,
    select,
    option,
    .text-gray-700,
    .text-gray-800,
    .text-gray-600 {
        color: #bada55 !important;
        font-family: inherit;
    }

    textarea,
    select,
    input {
        background: #23272e !important;
        color: #c7f774 !important;
        border: 1.5px solid #2d332b !important;
        border-radius: 0 !important;
        font-family: inherit;
        box-shadow: none !important;
    }

    textarea:focus,
    select:focus,
    input:focus {
        outline: 2px solid #bada55 !important;
        background: #23272e !important;
    }

    button:not(.info-button-fixed) {
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
    button:not(.info-button-fixed):hover {
        background: #bada55 !important;
        color: #23272e !important;
    }

    .bg-blue-50,
    .border-blue-200,
    .bg-gray-50,
    .border-gray-200,
    .bg-gray-100,
    .border-gray-300,
    .bg-red-100,
    .border-red-400 {
        background: #181c1f !important;
        border-color: #2d332b !important;
        color: #c7f774 !important;
    }

    .rounded-md,
    .rounded-lg,
    .rounded-full {
        border-radius: 0 !important;
    }

    .text-blue-700,
    .text-blue-600 {
        color: #bada55 !important;
    }

    /* Character counter colors */
    .text-red-500 {
        color: #ff6b6b !important;
    }

    .text-yellow-500 {
        color: #ffd93d !important;
    }

    .text-green-500 {
        color: #6bcf7f !important;
    }

    .text-center {
        text-align: left !important;
    }

    .font-terminal,
    .font-terminal-open {
        font-family:
            'Terminal Grotesque', 'Terminal Grotesque Open', 'Fira Mono', 'Consolas', monospace !important;
    }

    /* Remove Tailwind's default focus ring */
    :focus {
        box-shadow: none !important;
    }

    /* Fixed Info Button */
    .info-button-fixed {
        position: fixed;
        bottom: 1rem;
        left: 1rem;
        width: 48px;
        height: 48px;
        border-radius: 50% !important;
        background: #23272e !important;
        color: #bada55 !important;
        border: 2px solid #bada55 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 1000;
        transition:
            background 0.2s,
            color 0.2s,
            transform 0.2s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-weight: normal;
    }

    @media (min-width: 768px) {
        .info-button-fixed {
            bottom: 2rem;
            left: 2rem;
        }
    }

    .info-button-fixed:hover {
        background: #bada55 !important;
        color: #23272e !important;
        transform: scale(1.1);
    }
</style>
