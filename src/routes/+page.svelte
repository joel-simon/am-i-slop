<script lang="ts">
    import { onMount } from 'svelte';
    import { SlopAnalyzer, type AnalysisResults, type AnalysisResultItem } from './SlopClassifier';
    import TokenTableAnalysis from './TokenTableAnalysis.svelte';
    import ScaledTextView from './ScaledTextView.svelte';
    import ScoreDistributionHistogram from './ScoreDistributionHistogram.svelte';

    // --- Component State ---
    let inputText = 'I went to the gym and lifted weights.';
    let selectedModel = 'gpt2'; // 'distilgpt2' or 'gpt2'
    let loading = false;
    let progress = 0;
    let statusText = 'Ready to analyze text.';
    let analysisResults: AnalysisResults | null = null;
    let errorMessage: string | null = null;

    // Questions array
    const questions = [
        'What did you do today?',
        // Add more questions here as needed
    ];
    let currentQuestionIndex = 0;

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
        // Initialize the SlopAnalyzer with callback functions
        slopAnalyzer = new SlopAnalyzer(
            updateProgressExternal,
            setErrorMessageExternal,
            onTokenProcessedExternal // Add the new callback
        );
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
        if (!slopAnalyzer) {
            errorMessage = 'Analyzer not initialized. Please refresh.';
            return;
        }

        loading = true;
        analysisResults = null;
        progressiveTokensArray = []; // Clear previous progressive results
        progressiveResultsArray = []; // Clear previous progressive results
        updateProgressExternal(0, 'Starting analysis with ' + selectedModel + '...');

        try {
            // Format the input as Q&A
            const formattedInput = `q:${questions[currentQuestionIndex]} a:${inputText}`;

            // First analyze the text to ensure model is loaded
            analysisResults = await slopAnalyzer.analyzeText(formattedInput, selectedModel);

            // Store the submission in the database
            if (analysisResults && isFinite(analysisResults.perplexity)) {
                try {
                    const response = await fetch('/api/submit', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            text: inputText,
                            perplexity: analysisResults.perplexity,
                            questionId: currentQuestionIndex,
                        }),
                    });

                    if (!response.ok) {
                        console.error('Failed to store submission:', await response.text());
                    }
                } catch (err) {
                    console.error('Error storing submission:', err);
                    // Don't show error to user as this is not critical
                }
            }

            // Progress and final status ("Analysis complete." or error status) are set by slopAnalyzer via callbacks.
        } catch (err: any) {
            console.error('Error during analysis:', err);
            if (!errorMessage) {
                errorMessage = err.message || 'An unexpected error occurred.';
            }
            statusText = 'Analysis failed.';
        } finally {
            loading = false;
            if (!analysisResults) {
                analysisResults = {
                    tokens: [],
                    results: [],
                    averageLogProb: -Infinity,
                    perplexity: Infinity,
                };
            }
        }
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

<div class="max-w-3xl mx-auto p-6 md:p-8 my-2 font-terminal">
    <h1 class="text-8xl !font-terminal-open text-center text-gray-800 mb-6">Are you Slop?</h1>
    <!-- <p class="text-gray-600 mb-6 text-center">
    Analyze how "average" or predictable your text is using a language model.
    Lower perplexity means more predictable text.
  </p> -->

    <!-- Input Section -->
    <div class="mb-6 space-y-4">
        <div>
            <label for="inputText" class="block text-lg font-medium text-gray-700 mb-1"
                >{questions[currentQuestionIndex]}</label
            >
            <textarea
                id="inputText"
                bind:value={inputText}
                placeholder="Enter your answer..."
                class="w-full h-40 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-y text-base"
                disabled={loading}
            ></textarea>
        </div>

        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
            <!-- <div>
        <label
          for="modelSelect"
          class="block text-sm font-medium text-gray-700 mb-1 sm:mb-0 sm:inline-block sm:mr-2"
          >Choose model:</label
        >
        <select
          id="modelSelect"
          bind:value={selectedModel}
          class="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="distilgpt2">DistilGPT-2 (Fast)</option>
          <option value="gpt2">GPT-2 (Better accuracy)</option>
        </select>
      </div> -->
            <button
                on:click={analyzeText}
                disabled={loading || !inputText.trim()}
                class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-md transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
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
            <ScoreDistributionHistogram userScore={analysisResults.perplexity} />
        {/if}
    {/if}
</div>

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
</style>
