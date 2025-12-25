<script lang="ts">
    import type { PageData } from './$types';
    import ScoreDistributionHistogram from '$lib/components/ScoreDistributionHistogram.svelte';
    import NeighboringSubmissions from '$lib/components/NeighboringSubmissions.svelte';
    import { getSlopMessage } from '$lib/utils/slopMessages';
    import { SITE_CONFIG } from '$lib/config';

    export let data: PageData;

    $: ({ submission, questionText, placement } = data);
    $: slopMessage = getSlopMessage(placement.slopPercentile);
    let showCopied = false;
</script>

<svelte:head>
    <title>{slopMessage.title} - {SITE_CONFIG.name}</title>
    <meta
        name="description"
        content="Perplexity: {submission.perplexity.toFixed(
            2
        )} | Slop Percentile: {placement.slopPercentile.toFixed(0)}% | {slopMessage.subtitle}"
    />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{SITE_CONFIG.url}/submissions/{submission.text_hash}" />
    <meta property="og:title" content="{slopMessage.emoji} {slopMessage.title}" />
    <meta
        property="og:description"
        content="I got a perplexity score of {submission.perplexity.toFixed(
            2
        )} (Slop Percentile: {placement.slopPercentile.toFixed(0)}%). {slopMessage.subtitle}"
    />
    <meta property="og:image" content={SITE_CONFIG.image} />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary" />
    <meta property="twitter:url" content="{SITE_CONFIG.url}/submissions/{submission.text_hash}" />
    <meta property="twitter:title" content="{slopMessage.emoji} {slopMessage.title}" />
    <meta
        property="twitter:description"
        content="I got a perplexity score of {submission.perplexity.toFixed(
            2
        )} (Slop Percentile: {placement.slopPercentile.toFixed(0)}%). {slopMessage.subtitle}"
    />
    <meta property="twitter:image" content={SITE_CONFIG.image} />
</svelte:head>

<div class="max-w-3xl mx-auto p-4 md:p-8 my-2 font-terminal">
    <a href="/" class="back-link text-sm mb-4 inline-block">← Submit Another</a>

    <h1 class="text-4xl md:text-5xl !font-terminal-open text-center text-gray-800 mb-6">
        Your Results
    </h1>

    <!-- Question -->
    <div class="question-section mb-6">
        <p class="question-label text-xs uppercase tracking-wider mb-1">Question</p>
        <p class="question-text text-md">{questionText}</p>
    </div>

    <!-- User's Answer -->
    <div class="answer-section mb-6">
        <p class="answer-label text-md uppercase tracking-wider mb-1">Your Answer</p>
        <p class="answer-text text-base text-lg">{submission.text}</p>
    </div>

    <!-- Slop Verdict -->
    <div class="slop-verdict mb-6">
        <div class="verdict-emoji">{slopMessage.emoji}</div>
        <div class="verdict-content">
            <div class="verdict-title">{slopMessage.title}</div>
            <div class="verdict-subtitle text-sm">{slopMessage.subtitle}</div>
        </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid mb-6">
        <div class="stat-card">
            <span class="stat-value">{submission.perplexity.toFixed(2)}</span>
            <span class="stat-label text-xs">Perplexity</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">{placement.slopPercentile.toFixed(0)}%</span>
            <span class="stat-label text-xs">Slop Percentile</span>
        </div>
        <div class="stat-card">
            <span class="stat-value">{placement.rank}/{placement.total}</span>
            <span class="stat-label text-xs">Rank</span>
        </div>
    </div>

    <!-- Distribution Histogram -->
    <ScoreDistributionHistogram
        userScore={submission.perplexity}
        questionId={submission.question_id}
        showVerdict={false}
    />

    <!-- Neighboring Submissions -->
    <NeighboringSubmissions
        userScore={submission.perplexity}
        questionId={submission.question_id}
        n={2}
    />

    <!-- Action Buttons -->
    <div class="mt-8 flex justify-center items-center gap-4">
        <a href="/" class="submit-again-btn">Submit Another</a>
        <button
            class="share-btn"
            on:click={async () => {
                try {
                    await navigator.clipboard.writeText(
                        `${SITE_CONFIG.url}${window.location.pathname}`
                    );
                    showCopied = true;
                    setTimeout(() => (showCopied = false), 1600);
                } catch (err) {
                    alert('Failed to copy link to clipboard.');
                }
            }}
            style="display: flex; align-items: center; gap: 0.5em; padding: 0.75rem 1.5rem; background: #22272b; border: 2px solid #454b51; color: #c7f774; cursor: pointer; font-size: 1em;"
        >
            <span>Share</span>
        </button>
        {#if showCopied}
            <span style="color: #bada55; font-size: 0.94em;">Copied!</span>
        {/if}
    </div>

    <style>
        .share-btn:hover {
            background: #23291c;
            border-color: #bada55;
            color: #bada55;
        }
    </style>
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

    .back-link {
        color: #8a8a8a;
        text-decoration: none;
        margin-top: 2.5em;
        display: inline-block;
        transition: color 0.2s;
    }

    .back-link:hover {
        color: #bada55;
    }

    h1 {
        color: #c7f774;
        text-shadow:
            0 0 2px #bada55,
            0 0 8px #222;
        margin-top: 0.5em;
        font-family: 'Terminal Grotesque Open', 'Fira Mono', 'Consolas', monospace;
    }

    .question-section,
    .answer-section {
        background: #23272e;
        border: 1px solid #2d332b;
        padding: 1rem;
    }

    .question-label,
    .answer-label {
        color: #666;
    }

    .question-text {
        color: #bada55;
    }

    .answer-text {
        color: #c7f774;
        white-space: pre-wrap;
        word-break: break-word;
    }

    /* Slop verdict section */
    .slop-verdict {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: #1e2420;
        border: 2px solid #2d332b;
    }

    .verdict-emoji {
        font-size: 3rem;
        line-height: 1;
    }

    .verdict-content {
        flex: 1;
    }

    .verdict-title {
        color: #bada55;
        font-weight: 700;
        font-size: 1.25rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        text-shadow: 0 0 4px rgba(186, 218, 85, 0.4);
    }

    .verdict-subtitle {
        color: #8a8a8a;
        margin-top: 0.25rem;
        font-style: italic;
    }

    /* Stats grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }

    .stat-card {
        background: #23272e;
        border: 1px solid #2d332b;
        padding: 1rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .stat-value {
        color: #bada55;
        font-size: 1.5rem;
        font-weight: 700;
        font-family: 'Terminal Grotesque', 'Fira Mono', monospace;
    }

    .stat-label {
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .submit-again-btn {
        display: inline-block;
        background: #23272e;
        color: #bada55;
        border: 2px solid #bada55;
        padding: 0.75rem 2rem;
        font-weight: bold;
        text-decoration: none;
        transition:
            background 0.2s,
            color 0.2s;
    }

    .submit-again-btn:hover {
        background: #bada55;
        color: #23272e;
    }

    .font-terminal {
        font-family:
            'Terminal Grotesque', 'Terminal Grotesque Open', 'Fira Mono', 'Consolas', monospace !important;
    }
</style>
