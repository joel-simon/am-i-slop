<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Modal } from 'flowbite-svelte';
    import { questions, getQuestionText } from '$lib/questions';
    import { validateText, getValidationError } from '$lib/utils/textFilter';
    import {
        getStoredSubmissions,
        saveSubmission,
        type StoredSubmission,
    } from '$lib/utils/localStorage';
    import { getSlopEmoji } from '$lib/utils/slopMessages';
    import { SITE_CONFIG, META_TAGS } from '$lib/config';
    import DistributionPreview from '../lib/components/DistributionPreview.svelte';

    // --- Component State ---
    let inputText = '';
    let loading = false;
    let progress = 0;
    let statusText = 'Ready to analyze text.';
    let errorMessage: string | null = null;
    let infoModal = false;

    let currentQuestionIndex = 0;

    // Past submissions
    let pastSubmissions: StoredSubmission[] = [];
    let showPastSubmissions = false;

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

    // Distribution data cache (per question)
    let distributionCache: Record<number, any> = {};
    let currentDistribution: any = null;
    let loadingDistribution = false;

    // Load distribution data for a question
    async function loadDistribution(questionId: number) {
        // Check cache first
        if (distributionCache[questionId]) {
            currentDistribution = distributionCache[questionId];
            return;
        }

        loadingDistribution = true;
        try {
            const response = await fetch(`/api/distribution/${questionId}`);
            if (!response.ok) {
                throw new Error('Failed to load distribution');
            }
            const data = await response.json();

            // Cache it
            distributionCache[questionId] = data;
            currentDistribution = data;
        } catch (err) {
            console.error('Error loading distribution:', err);
            currentDistribution = null;
        } finally {
            loadingDistribution = false;
        }
    }

    // Function to change question
    function changeQuestion(direction: 'prev' | 'next') {
        if (direction === 'prev' && currentQuestionIndex > 0) {
            currentQuestionIndex--;
        } else if (direction === 'next' && currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
        }
        // Clear input when changing questions
        inputText = '';
        errorMessage = null;

        // Load distribution for new question
        loadDistribution(questions[currentQuestionIndex].id);
    }

    // Update loading bar & status
    function updateProgress(p: number, text: string) {
        progress = p;
        statusText = text;
    }

    onMount(() => {
        // Load distribution for initial question
        loadDistribution(questions[currentQuestionIndex].id);

        // Load past submissions
        pastSubmissions = getStoredSubmissions();
    });

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
        errorMessage = null;
        updateProgress(0, 'Submitting...');

        try {
            // Use sanitized text (already lowercase from validation)
            const sanitizedText = validation.sanitized.toLowerCase();

            // Call the analyze endpoint
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

            updateProgress(0.5, 'Calculating perplexity on GPU...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to analyze text');
            }

            const data = await response.json();

            updateProgress(0.9, 'Saving results...');

            // Calculate slop percentile (inverted)
            const slopPercentile = 100 - data.placement.percentile;

            // Save to localStorage
            saveSubmission({
                text_hash: data.text_hash,
                text: sanitizedText,
                perplexity: data.perplexity,
                question_id: questions[currentQuestionIndex].id,
                question_text: questions[currentQuestionIndex].text,
                slopPercentile,
                created_at: new Date().toISOString(),
            });

            updateProgress(1, 'Redirecting to results...');

            // Redirect to the results page
            await goto(`/submissions/${data.text_hash}`);
        } catch (err: any) {
            console.error('Error during analysis:', err);
            errorMessage = err.message || 'An unexpected error occurred.';
            statusText = 'Analysis failed.';
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>{META_TAGS.home.title}</title>
    <meta name="description" content={META_TAGS.home.description} />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={SITE_CONFIG.url + '/'} />
    <meta property="og:title" content={META_TAGS.home.title} />
    <meta property="og:description" content={META_TAGS.home.description} />
    <meta property="og:image" content={SITE_CONFIG.image} />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary" />
    <meta property="twitter:url" content={SITE_CONFIG.url + '/'} />
    <meta property="twitter:title" content={META_TAGS.home.title} />
    <meta property="twitter:description" content={META_TAGS.home.description} />
    <meta property="twitter:image" content={SITE_CONFIG.image} />
</svelte:head>

<div class="max-w-3xl mx-auto p-4 md:p-8 my-2 font-terminal">
    <h1 class="text-6xl md:text-8xl !font-terminal-open text-center text-gray-800 mb-3 md:mb-6">
        Are you Slop?
    </h1>

    <Modal title="???" bind:open={infoModal} autoclose>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400 mt-0">
            The year is 2030, language models guide all communications and decisions. The ultimate
            status symbol becomes living a <i>high-entropy</i> lifestyle.
        </p>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            <strong>"Slop"</strong> is internet slang for generic, AI-generated content that feels soulless
            and predictable.
        </p>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400">
            This tool analyzes how "average" or predictable your text is using a language model. It
            works by comparing your writing to what a language model would expect to see next.
        </p>
        <p class="text-base leading-relaxed text-gray-500 dark:text-gray-400 mt-4">
            Perplexity measures how "surprised" a language model is by your text. Think of it as:
            for each word, how many reasonable options did the model consider before seeing what you
            actually wrote? A perplexity of 10 means the model was roughly as uncertain as choosing
            between 10 equally likely words. Lower perplexity = more predictable text = more "on
            distribution" = more slop.
        </p>
        <div
            class="flex items-center gap-2 mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400"
        >
            <span>
                Weekend project by <a href="https://www.joelsimon.net" class="underline">Joel</a>
            </span>
        </div>
    </Modal>

    <!-- Input Section -->
    <div class="mb-6 space-y-4">
        <div>
            <label for="inputText" class="block text-xl md:text-2xl font-medium text-gray-700 mb-2"
                >{questions[currentQuestionIndex].text}</label
            >

            <!-- Question Navigation -->
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
    {#if loading}
        <div class="my-6 text-center">
            <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                    class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style="width: {progress * 100}%"
                ></div>
            </div>
            <p class="text-sm text-gray-600">{statusText}</p>
        </div>
    {/if}

    <!-- Error Message -->
    {#if errorMessage}
        <div class="my-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
            <p><strong class="font-bold">Error:</strong> {errorMessage}</p>
        </div>
    {/if}

    <!-- Distribution Preview -->
    {#if loadingDistribution && !loading}
        <div class="my-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p class="text-sm text-gray-600">Loading distribution...</p>
        </div>
    {:else if currentDistribution && !loading}
        <DistributionPreview
            distribution={currentDistribution}
            questionId={questions[currentQuestionIndex].id}
        />
    {/if}

    <!-- Past Submissions -->
    {#if pastSubmissions.length > 0}
        <div class="past-submissions mt-8">
            <button
                class="past-submissions-toggle"
                on:click={() => (showPastSubmissions = !showPastSubmissions)}
            >
                <span>Your Past Submissions ({pastSubmissions.length})</span>
                <span class="toggle-icon">{showPastSubmissions ? '▼' : '▶'}</span>
            </button>

            {#if showPastSubmissions}
                <div class="past-submissions-list">
                    {#each pastSubmissions as sub}
                        <a href="/submissions/{sub.text_hash}" class="past-submission-card">
                            <div class="past-submission-header">
                                <span class="past-submission-emoji"
                                    >{getSlopEmoji(sub.slopPercentile)}</span
                                >
                                <span class="past-submission-score text-sm"
                                    >{sub.perplexity.toFixed(1)}</span
                                >
                            </div>
                            <p class="past-submission-text text-sm">
                                {sub.text.slice(0, 60)}{sub.text.length > 60 ? '...' : ''}
                            </p>
                            <p class="past-submission-question text-xs">{sub.question_text}</p>
                        </a>
                    {/each}
                </div>
            {/if}
        </div>
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
    .text-gray-700,
    .text-gray-800,
    .text-gray-600 {
        color: #bada55 !important;
        font-family: inherit;
    }

    textarea {
        background: #23272e !important;
        color: #c7f774 !important;
        border: 1.5px solid #2d332b !important;
        border-radius: 0 !important;
        font-family: inherit;
        box-shadow: none !important;
    }

    textarea:focus {
        outline: 2px solid #bada55 !important;
        background: #23272e !important;
    }

    button:not(.info-button-fixed):not(.past-submissions-toggle) {
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
    button:not(.info-button-fixed):not(.past-submissions-toggle):hover {
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

    /* Past Submissions */
    .past-submissions {
        border-top: 1px solid #2d332b;
        padding-top: 1rem;
    }

    .past-submissions-toggle {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #23272e;
        border: 1px solid #2d332b;
        color: #bada55;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
    }

    .past-submissions-toggle:hover {
        background: #2a2f36;
        border-color: #bada55;
    }

    .toggle-icon {
        font-size: 0.75rem;
    }

    .past-submissions-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .past-submission-card {
        display: block;
        padding: 0.75rem 1rem;
        background: #23272e;
        border: 1px solid #2d332b;
        border-left: 3px solid #3d4451;
        text-decoration: none;
        transition: all 0.2s;
    }

    .past-submission-card:hover {
        border-left-color: #bada55;
        transform: translateX(4px);
    }

    .past-submission-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .past-submission-emoji {
        font-size: 1.25rem;
    }

    .past-submission-score {
        color: #bada55;
        font-weight: 700;
        font-family: 'Terminal Grotesque', 'Fira Mono', monospace;
    }

    .past-submission-text {
        color: #c7f774;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .past-submission-question {
        color: #666;
        margin-top: 0.25rem;
    }
</style>
