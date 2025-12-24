# Perplexity Calculator Page

This page provides a user-friendly interface for testing the RunPod perplexity API.

## Features

### Input Section

- Large textarea for entering custom text
- "Calculate Perplexity" button (disabled when loading or empty)
- "Load Random Sample" button to test with pre-defined texts
- Input validation and error handling

### Results Display

#### Total Perplexity

- Large, color-coded number display
- Green (<10): Very predictable
- Yellow (10-50): Moderately predictable
- Orange (50-200): Less predictable
- Red (>200): Highly unpredictable

#### Per-Token Analysis

Each token shows:

- The actual token text (in a monospace badge)
- Perplexity score (color-coded)
- Probability as percentage
- Visual probability bar (animated, glowing)

### Design

- Matches the terminal theme of the app
- Terminal Grotesque font
- Lime green (#bada55) accents
- Dark background (#181c1f)
- Hover effects on interactive elements
- Smooth animations and transitions

## Default Text

The page loads with "I went to the store" as the default text for quick testing.

## Sample Texts

Pre-loaded sample texts include:

1. "I went to the store"
2. "The quick brown fox jumps over the lazy dog"
3. "Hello world! How are you doing today?"
4. "Artificial intelligence is transforming our world"
5. "The weather is nice today"

## Usage

1. Enter or select text
2. Click "Calculate Perplexity"
3. View results:
    - Overall perplexity score
    - Token-by-token breakdown
    - Probability bars

## API Integration

This page calls `POST /api/perplexity` which:

- Sends text to RunPod endpoint
- Returns perplexity data from GPT-2
- Handles errors gracefully
- Shows loading states

## Styling Notes

The component uses scoped CSS that:

- Removes border-radius for terminal aesthetic
- Uses box-shadows for depth
- Color-codes perplexity values dynamically
- Provides visual feedback on hover
- Maintains responsive design
